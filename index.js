const core = require('@actions/core')
const cp = require("child_process")
const fs = require("fs")
const env_parser = require("./env_parser")
const { GENERATE_ULID } = require("./generate_ulid_func")

const getBool = (key) => core.getBooleanInput(key, { required: false })

const getString = (key) => core.getInput(key, { required: false })

async function run() {
  try {
    const sshKey = getString("ssh_key")
    const gemServer = getString("gem_server_credentials")
    const gemGithub = getString("gem_github_credentials")
    const prodAptDeps = getBool("prod_apt_deps")
    const chrome = getBool("chrome")
    const rubocop = getBool("rubocop")
    const postgres = getBool("postgres")
    const envVar = getBool("set_env_var")

    if (chrome) {
      cp.execSync('wget -q -O /tmp/chrome-versions.json "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"')
      const stableChannel = JSON.parse(fs.readFileSync('/tmp/chrome-versions.json', 'utf8')).channels.Stable;
      const downloads = stableChannel.downloads;

      const chromeUrl = downloads.chrome.find(d => d.platform === 'linux64').url;
      const chromedriverUrl = downloads.chromedriver.find(d => d.platform === 'linux64').url;

      console.log(`Downloading Chrome version: ${stableChannel.version}`);
      cp.execSync(`wget -q -O /tmp/chrome.zip "${chromeUrl}"`);
      cp.execSync('rm -rf /tmp/chrome');
      cp.execSync('sudo rm -rf /opt/chrome');
      cp.execSync('unzip -q /tmp/chrome.zip -d /tmp/chrome');

      // Move full directory
      cp.execSync('sudo mkdir -p /opt/chrome');
      cp.execSync('sudo mv /tmp/chrome/chrome-linux64 /opt/chrome/');

      // Symlink
      cp.execSync('sudo ln -sf /opt/chrome/chrome-linux64/chrome /usr/local/bin/google-chrome');
      cp.execSync('sudo chmod +x /opt/chrome/chrome-linux64/chrome');

      console.log(`Downloading Chromedriver version: ${stableChannel.version}`);
      cp.execSync(`wget -q -O /tmp/chromedriver.zip "${chromedriverUrl}"`);
      cp.execSync('rm -rf /tmp/chromedriver');
      cp.execSync('sudo rm -rf /opt/chromedriver');
      cp.execSync('unzip -q /tmp/chromedriver.zip -d /tmp/chromedriver');

      cp.execSync('sudo mkdir -p /opt/chromedriver');
      cp.execSync('sudo mv /tmp/chromedriver/chromedriver-linux64 /opt/chromedriver/');

      // Symlink
      cp.execSync('sudo ln -sf /opt/chromedriver/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver');
      cp.execSync('sudo chmod +x /opt/chromedriver/chromedriver-linux64/chromedriver');
    }
    if (chrome || prodAptDeps || postgres) {
      cp.execSync("DEBIAN_FRONTEND=noninteractive sudo apt-get update")
      const aptDeps = []
        .concat(prodAptDeps ? [
          "libpq-dev",
          "libcurl4-openssl-dev",
          "libxml2-dev",
          "libxslt1-dev",
          "zlib1g-dev",
          "netcat-openbsd",
          "libsasl2-dev"] : [])
        .concat(postgres ? ["postgresql-client"] : [])
        .join(" ")
      if (aptDeps.length > 0) {
        cp.execSync("DEBIAN_FRONTEND=noninteractive sudo apt-get install -y " + aptDeps)
      }
    }
    if (sshKey) {
      cp.execSync("mkdir ~/.ssh")
      cp.execSync(`echo "${sshKey}" > ~/.ssh/id_ed25519`)
      cp.execSync("ssh-keygen -F github.com || ssh-keyscan github.com >> ~/.ssh/known_hosts")
      cp.execSync("chmod 600 ~/.ssh/id_ed25519")
    }
    if (gemServer || gemGithub) {
      cp.execSync("mkdir ~/.bundle")
      cp.execSync("touch ~/.bundle/config")
    }
    if (gemServer) {
      cp.execSync(`echo "BUNDLE_GEMS__QUICKPAY__NET: \"${gemServer}\"\n" >> ~/.bundle/config`)
    }
    if (gemGithub) {
      cp.execSync(`echo "BUNDLE_RUBYGEMS__PKG__GITHUB__COM: \"${gemGithub}\"\n" >> ~/.bundle/config`)
    }
    if (rubocop) {
      cp.execSync("curl -o ./.rubocop.yml https://quickpay.github.io/development/.rubocop.yml")
    }
    if (envVar && fs.existsSync("env") && fs.lstatSync("env").isDirectory()) {
      Object.entries(fs.readdirSync("env").reduce((obj, file) => {
        return Object.assign(obj, env_parser.parse(fs.readFileSync("env/" + file).toString()))
      }, {})).forEach(([k, v]) => {
        core.exportVariable(k, v)
      })
    }
    if (postgres) {
      const db = getString("postgresql db")
      const user = getString("postgresql user")
      const password = getString("postgresql password")
      const port = getString("postgresql port")
      const connectionString = `postgresql://${user}:${password}@localhost:${port}/${db}`
      let i;
      for (i = 0; i <= 60; i++) {
        const result = cp.execSync(`echo "select pg_is_in_recovery()" | psql -t -d ${connectionString}`).toString().trim()
        await wait(1000)
        if (result === "f") {
          break
        }
      }
      if (i == 60) {
        core.setFailed("postgresql database timed out")
        return
      }
      const extensions = ["pgcrypto", "uuid-ossp"]
      extensions.forEach(x => {
           cp.execSync(`psql -d ${connectionString} -c 'CREATE EXTENSION IF NOT EXISTS "${x}";'`)
      })
      fs.writeFileSync("/tmp/ulid_func.sql", GENERATE_ULID)
      cp.execSync(`psql -d ${connectionString} < /tmp/ulid_func.sql`)
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

const wait = (miliseconds) => new Promise((resolve, _) => setTimeout(resolve, miliseconds))

run();
