[![Build status](https://travis-ci.org/GMOD/jbrowse.svg?branch=dev)](https://travis-ci.org/GMOD/jbrowse)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v1.4%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)

Note: most of our current development is on JBrowse 2, see our github repo here
https://github.com/gmod/jbrowse-components

We will still continue to make bug fix and maintenance releases of JBrowse 1 but
most development is on JBrowse 2

Note: if you are using plugins with a dev version of JBrowse or installing from
GitHub, you may need to use node <=14 (e.g. node >=15 may fail) due to node-sass
not compiling on newer node versions easily. See
https://github.com/GMOD/jbrowse/pull/1607 for details

# Installing JBrowse

To install jbrowse, visit http://jbrowse.org/blog and download the latest
JBrowse zip file. See instructions at http://jbrowse.org/docs/installation.html
for a tutorial on setting up a sample instance.

# Install JBrowse from GitHub (for developers)

To install from GitHub, you can simply clone the repo and run the setup.sh
script

    git clone https://github.com/GMOD/jbrowse
    cd jbrowse
    ./setup.sh

## Develop JBrowse or JBrowse plugins

To obtain a jbrowse development environment, e.g. for jbrowse source code
editing or plugin development (or just running jbrowse from the github repo)

    git clone https://github.com/GMOD/jbrowse
    cd jbrowse
    ./setup.sh # not strictly necessary if you don't need to sample data

If you are going to edit the jbrowse source code, then also run

    yarn watch

And keep `yarn watch` running in the background as you create changes to your
code.

To start a temporary dev server, can also run

    yarn start

And keep this running in the background, this will launch a webserver running
jbrowse on port 8082.

Alternatively, you can put this jbrowse folder in your webserver (e.g.
/var/www/html/) directory. The key is, if you are modifying jbrowse or plugin
source code, to run `yarn watch` in the background, so that webpack incorporates
your changes in either the main codebase (src/JBrowse folder) or any plugins
(plugins/YourPlugin).

## Note for users in China

In order to make downloads faster you can set a mirror for the npm registry

    npm config set registry http://r.cnpmjs.org
    npm config set puppeteer_download_host=http://cnpmjs.org/mirrors
    export ELECTRON_MIRROR="http://cnpmjs.org/mirrors/electron/"

## Notes on setting up a JBrowse server

- If you don't have a webserver such as apache or nginx, you can run
  `npm run start` and open
  http://localhost:8082/index.html?data=sample_data/json/volvox to see the code
  running from a small express.js server.

- You can alternatively just move the jbrowse folder into a nginx or apache root
  directory e.g. /var/www/html and then navigate to http://localhost/jbrowse

_Note: you should avoid using sudo tasks like ./setup.sh and instead use
chown/chmod on folders to your own user as necessary._

_Also note: After editing a file, you must re-run the webpack build with
`npm run build` or you can keep webpack running in "watch" mode by running
`npm run watch`._

_Also also note: by default `git clone` will clone the master branch which
contains the latest stable release. The latest development branch is called dev.
Run `git checkout dev` after clone to retrieve this_

# Installing as an npm module

To install jbrowse from NPM directly, you can run.

    npm install @gmod/jbrowse

To setup a simple instance, you can use

    node_modules/.bin/jb_setup.js
    node_modules/.bin/jb_run.js

Then visit http://localhost:3000/?data=sample_data/json/volvox

# Contributing

Looking for places to contribute to the codebase?
[Check out the "help wanted" label](https://github.com/GMOD/jbrowse/labels/help%20wanted).

# Running the developer test suites

The Travis-CI suite runs Perl, JavaScript, and Selenium automated tests. To run
locally, you can use

    prove -Isrc/perl5 -lr tests
    node tests/js_tests/run-puppeteer.js http://localhost/jbrowse/tests/js_tests/index.html
    pip install selenium nose
    MOZ_HEADLESS=1 SELENIUM_BROWSER=firefox JBROWSE_URL='http://localhost/jbrowse/index.html' nosetests

Supported browsers for SELENIUM_BROWSER are 'firefox', 'chrome', 'phantom', and
'travis_saucelabs'. The Sauce Labs + Travis one will only work in a properly
configured Travis CI build environment.

# Manual testing

<img style="display: block; margin: 1em auto" src="img/browserstack-logo-600x315.png" width="200" alt="Browserstack"/>

JBrowse has a free open source account on
[Browserstack](http://browserstack.com/) for manual testing. Contact @rbuels for
access.

# Generating Packaged Builds

You can also optionally run build steps to create the minimized codebase. Extra
perl dependencies Text::Markdown and DateTime are required to run the build
step.

    make -f build/Makefile

To build the Electron app (JBrowse desktop app), run the following

    npm install -g electron-packager
    make -f build/Makefile release-electron-all

To run the Electron app in debug mode run the following

    npm install -g electron
    electron browser/main.js

# Making a JBrowse release

NOTE: Beginning in 1.12.4,

1. Run
   `build/release.sh $newReleaseVersion $nextReleaseVersion-alpha.0 notes.txt`,
   where notes.txt is any additional information to add to a blogpost. Then
   check its work, and then run the `git push` command it suggests to you. This
   makes a tag in the repository for the release, named, e.g. `1.6.3-release`.
   This should cause Travis CI to create a release on GitHub under
   https://github.com/GMOD/jbrowse/releases

1. Test that the page loads in IE11 on BrowserStack

1. Add release notes to the new GitHub release that Travis created. Can just
   paste these from release-notes.md, which is in Markdown format.

1. Write a twitter post for usejbrowse and JBrowseGossip with the announcement
   link to the blogpost

1. Write an email announcing the release, sending to gmod-ajax. If it is a major
   release, add gmod-announce and make a GMOD news item.

As you can tell, this process could really use some more streamlining and
automation.
