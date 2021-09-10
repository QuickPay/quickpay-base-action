const core = require('@actions/core');
const fs = require("fs")
const cp = require("child_process")
const os = require("os")

const home = os.homedir()

async function run() {
  try {
    const sshKey = core.getInput("ssh_key", { required: false })
    console.log(sshKey === `test
test`)
    const prodAptDeps = core.getBooleanInput("prod_apt_deps", { required: false })
    const chrome = core.getBooleanInput("chrome", { required: false })
    if (chrome) {
      cp.execSync("wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add - ")
      cp.execSync(`sudo sh -c 'echo "deb https://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'`)
    }
    if (chrome || prodAptDeps) {
      cp.execSync("sudo apt-get update")
      const aptDeps = (chrome ? ["chromium-chromedriver", "google-chrome-stable"] : [])
        .concat(prodAptDeps ? [
          "libpq-dev",
          "libcurl4-openssl-dev",
          "libxml2-dev",
          "libxslt1-dev",
          "zlib1g-dev",
          "netcat-openbsd",
          "libsasl2-dev"] : []).join(" ")
      cp.execSync("sudo apt-get install -y " + aptDeps)
    }
    if (sshKey) {
      fs.mkdirSync(home + "/.ssh")
      fs.writeFileSync(home + "/.ssh/id_ed25519", sshKey)
      console.log(sshKey)
      cp.execSync("ssh-keygen -F github.com || ssh-keyscan github.com >> ~/.ssh/known_hosts")
      cp.execSync("chmod 600 ~/.ssh/id_ed25519")
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
