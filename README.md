# Quickpay Base Action
This action is a collection of small things often needed in QuickPay CI, this action exists to reduce code duplication in github workflows.

## Usage
```yaml
- uses: quickPay/quickpay-base-action@release
  with:
    # a private ssh key which follows standard quickpay SSH key policy
    # this is needed for workflows that need to clone a private repo
    # or need gems that are located at private repos
    # default is null
    ssh_key: "${{secrets.SSH_KEY_GITHUB}}"

    # if this is true, all apt depedencies we use in production will be installed as well
    # if youre unsure if you need this, try without and then if you get an error
    # about some gem with a native extension not building cause of some c++ header file
    # enable this and try again
    # default is false
    prod_apt_deps: true

    # if this is true, we install chrome, this is needed most scenarious where
    # you have front-end tests, like with selenium or capybara
    # default is false
    chrome: true

    # if this is true, rubocop is downloaded
    # this is needed anytime you wanna lint the code
    # default is false
    rubocop: true

    # the credentials needed if the Gemfile source is private
    # this is the case for most of our modern projects
    # default is null
    gem_server_credentials: "${{secrets.BUNDLE_GEMS__QUICKPAY__NET}}"

    # if this is true, postgresql-client is installed, we wait for the postgres server
    # to be ready and we create the pgcrypto extension on the database
    # beware, this operation DOES NOT start a postgres server, it installs the client and
    # configures it, to actually run a postgres server, please refer to this action 
    # https://github.com/QuickPay/postgresql-action/
    # default is false
    postgres: true

    # the following fields starting with "postgresql*" are ignored if the above field is false
    # the defaults of these fields also match the defaults of 
    # https://github.com/QuickPay/postgresql-action/

    # name for the default database that is to be configured
    # default is "backends_test"
    postgresql db: "backends_test"

    # the user with superuser power
    # default is "backends_u"
    postgresql user: "backends_u"

    # superuser password
    # default is "abc"
    postgresql password: "abc
```

## Example Projects
The set of examples projects bellow here should together use all arguments this action can be given

- https://github.com/QuickPay/manager-server
- https://github.com/QuickPay/payment

## Contributing
This is a nodejs github action, meaning the actual code is javascript run in nodejs.
action.yml is the manifest for this action and is where you wanna go for adding more arguments.

As of writting, when the arguments gets passed into the js it'll either be a bool or string
this means if you need a number youre gonn have to `parseInt` it
if you need an array you might en up having to do comma seperated strings or something
when adding new arguments make sure they are not required and has defaults as to not make breaking changes

You can get the arguments with the `getBool` or `getString` helper functions,
and then you write the logic you need.

Beware, something if you try to manipulate the file structure using nodejs `fs` binding it sometimes doesnt work,
instead use `cp.execSync` to let bash handle it for you, this may also be the case with other system thing.

To create a release, invoke the manual action on this page called release, however make sure you do this after the automated build action has done its thing

Or if youre completely lost go, come poke me (AOE) on the shoulder 

## Testing
Since the only proper way to simulate a workflow envoriment is by running one, we have a job called test in the test_and_build.yml workflow, we test by running commands that would fail if the envoriment is incorrect. This is not the most formal test suite but it does the job, if new functionally is added please add a bash command or 2 to this job to test that it works