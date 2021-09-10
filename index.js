const core = require('@actions/core');
const cp = require("child_process")

async function run() {
  try {
    const sshKey = core.getInput("ssh_key", { required: false })
    const gemServer = core.getInput("gem_server_credentials", { required: false })
    const prodAptDeps = core.getBooleanInput("prod_apt_deps", { required: false })
    const chrome = core.getBooleanInput("chrome", { required: false })
    const rubocop = core.getBooleanInput("rubocop", { required: false })
    const postgres = core.getBooleanInput("postgres", { required: false })

    if (chrome) {
      cp.execSync("wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add - ")
      cp.execSync(`sudo sh -c 'echo "deb https://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'`)
    }
    if (chrome || prodAptDeps || postgres) {
      cp.execSync("sudo apt-get update")
      const aptDeps = (chrome ? ["chromium-chromedriver", "google-chrome-stable"] : [])
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
      cp.execSync("sudo apt-get install -y " + aptDeps)
    }
    if (sshKey) {
      cp.execSync("mkdir ~/.ssh")
      cp.execSync(`echo "${sshKey}" > ~/.ssh/id_ed25519`)
      cp.execSync("ssh-keygen -F github.com || ssh-keyscan github.com >> ~/.ssh/known_hosts")
      cp.execSync("chmod 600 ~/.ssh/id_ed25519")
    }
    if (gemServer) {
      cp.execSync("mkdir ~/.bundle")
      cp.execSync(`echo "BUNDLE_GEMS__QUICKPAY__NET: \"${gemServer}\"" > ~/.bundle/config`)
    }
    if (rubocop) {
      cp.execSync("curl -o ./.rubocop.yml https://quickpay.github.io/development/.rubocop.yml")

    }
    if (postgres) {
      let i;
      for (i = 0; i <= 60; i++) {
        const result = cp.execSync(`echo "select pg_is_in_recovery()" | psql -t -d postgresql://backends_u:abc@localhost/backends_test`).toString().trim()
        await wait(1000)
        if (result === "f") {
          break
        }
      }
      if (i == 60) {
        core.setFailed("postgresql database timed out")
        return
      }
      cp.execSync(`psql -d postgresql://backends_u:abc@localhost/backends_test -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'`)
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

const wait = (miliseconds) => new Promise((resolve, _) => setTimeout(resolve, miliseconds))

run();
