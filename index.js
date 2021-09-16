const core = require('@actions/core')
const exec = require("@actions/exec")

const getBool = (key) => core.getBooleanInput(key, { required: false })

const getString = (key) => core.getInput(key, { required: false })

async function run() {
  try {
    const sshKey = getString("ssh_key")
    const gemServer = getString("gem_server_credentials")
    const prodAptDeps = getBool("prod_apt_deps")
    const chrome = getBool("chrome")
    const rubocop = getBool("rubocop")
    const postgres = getBool("postgres")

    if (chrome) {
      exec.exec(`sudo sh -c 'echo "deb http://deb.debian.org/debian buster main
deb http://deb.debian.org/debian buster-updates main
deb http://deb.debian.org/debian-security buster/updates main" > /etc/apt/sources.list.d/debian.list'`
      )
      exec.exec(`sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys DCC9EFBF77E11517 && sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 648ACFD622F3D138 && sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys AA8E81B4331F7F50 && sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 112695A0E562B32A`)
      exec.exec(`sudo sh -c 'echo "# Note: 2 blank lines are required between entries
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
      exec.exec("sudo apt-get update")
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
      exec.exec("sudo apt-get install -y " + aptDeps)
    }
    if (sshKey) {
      exec.exec("mkdir ~/.ssh")
      exec.exec(`echo "${sshKey}" > ~/.ssh/id_ed25519`)
      exec.exec("ssh-keygen -F github.com || ssh-keyscan github.com >> ~/.ssh/known_hosts")
      exec.exec("chmod 600 ~/.ssh/id_ed25519")
    }
    if (gemServer) {
      exec.exec("mkdir ~/.bundle")
      exec.exec(`echo "BUNDLE_GEMS__QUICKPAY__NET: \"${gemServer}\"" > ~/.bundle/config`)
    }
    if (rubocop) {
      exec.exec("curl -o ./.rubocop.yml https://quickpay.github.io/development/.rubocop.yml")

    }
    if (postgres) {
      const db = getString("postgresql db")
      const user = getString("postgresql user")
      const password = getString("postgresql password")
      const connectionString = `postgresql://${user}:${password}@localhost/${db}`
      let i;
      for (i = 0; i <= 60; i++) {
        const result = exec.exec(`echo "select pg_is_in_recovery()" | psql -t -d ${connectionString}`).toString().trim()
        await wait(1000)
        if (result === "f") {
          break
        }
      }
      if (i == 60) {
        core.setFailed("postgresql database timed out")
        return
      }
      exec.exec(`psql -d ${connectionString} -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'`)
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

const wait = (miliseconds) => new Promise((resolve, _) => setTimeout(resolve, miliseconds))

run();
