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
      cp.execSync(`sudo sh -c 'echo "deb http://deb.debian.org/debian buster main
  deb http://deb.debian.org/debian buster-updates main
  deb http://deb.debian.org/debian-security buster/updates main" > /etc/apt/sources.list.d/debian.list'`
      )
      cp.execSync(`sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys DCC9EFBF77E11517 && sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 648ACFD622F3D138 && sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys AA8E81B4331F7F50 && sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 112695A0E562B32A`)
      cp.execSync(`sudo sh -c 'echo "# Note: 2 blank lines are required between entries
Package: *
Pin: release a=eoan
Pin-Priority: 500

Package: *
Pin: origin "ftp.debian.org"
Pin-Priority: 300

# Pattern includes 'chromium', 'chromium-browser' and similarly
# named dependencies:
Package: chromium*
Pin: origin "ftp.debian.org"
Pin-Priority: 700" > /etc/apt/preferences.d/chromium.pref'`)
    }
    if (chrome || prodAptDeps || postgres) {
      cp.execSync("DEBIAN_FRONTEND=noninteractive sudo apt-get update")
      const aptDeps = (chrome ? ["chromium-chromedriver", "chromium"] : [])
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
      cp.execSync("DEBIAN_FRONTEND=noninteractive sudo apt-get install -y " + aptDeps)
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
      const connectionString = `postgresql://${user}:${password}@localhost/${db}`
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
      cp.execSync(`psql -d ${connectionString} -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'`)
      cp.execSync(`cat <<- __ULID_FUNC__ | psql -d ${connectionString}
${GENERATE_ULID}
__ULID_FUNC__`)
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

const wait = (miliseconds) => new Promise((resolve, _) => setTimeout(resolve, miliseconds))

run();
