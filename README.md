[![Build status](https://travis-ci.org/GMOD/jbrowse.svg?branch=dev)](https://travis-ci.org/GMOD/jbrowse)

# Installing JBrowse

To install jbrowse, visit http://jbrowse.org/blog and download the latest JBrowse zip file. See instructions at http://jbrowse.org/docs/installation.html for a tutorial on setting up a sample instance.


# Install JBrowse from GitHub (for developers)

To install from GitHub, you can simply clone the repo and run the setup.sh script

    git clone https://github.com/GMOD/jbrowse
    cd jbrowse
    ./setup.sh


Then run `npm run start` http://localhost:8082/index.html?data=sample_data/json/volvox
 to see the code running from a small express.js server.

You can alternatively just move this entire folder into a nginx or apache root directory e.g. /var/www/html and then navigate to http://localhost/jbrowse

*Note: you should avoid using sudo tasks like ./setup.sh and instead use chown/chmod on folders to your own user as necessary.*

*Also note: After editing a file, you must re-run the webpack build with `npm run build` or you can keep webpack running in "watch" mode by running  `npm run watch`.*

*Also also note: by default `git clone` will clone the master branch which contains the latest stable release. The latest development branch is called dev. Run `git checkout dev` after clone to retrieve this*

# Installing as an npm module

To install jbrowse from NPM directly, you can run.

    npm install GMOD/jbrowse

To setup a simple instance, you can use

    node_modules/.bin/jb_setup.js
    node_modules/.bin/jb_run.js

Then visit http://localhost:3000/?data=sample_data/json/volvox

# Contributing

Looking for places to contribute to the codebase?
[Check out the "help wanted" label](https://github.com/GMOD/jbrowse/labels/help%20wanted).

# Running the developer test suites

The Travis-CI suite runs Perl, JavaScript, and Selenium automated tests. To run locally, you can use

    prove -Isrc/perl5 -lr tests
    node tests/js_tests/run-puppeteer.js http://localhost/jbrowse/tests/js_tests/index.html
    pip install selenium nose
    MOZ_HEADLESS=1 SELENIUM_BROWSER=firefox JBROWSE_URL='http://localhost/jbrowse/index.html' nosetests

Supported browsers for SELENIUM_BROWSER are 'firefox', 'chrome', 'phantom', and 'travis_saucelabs'.  The Sauce Labs + Travis
one will only work in a properly configured Travis CI build environment.

# Manual testing

<img style="display: block; margin: 1em auto" src="img/browserstack-logo-600x315.png" width="200" alt="Browserstack"/>

JBrowse has a free open source account on [Browserstack](http://browserstack.com/) for manual testing.  Contact @rbuels for access.

# Generating Packaged Builds

You can also optionally run build steps to create the minimized codebase. Extra perl dependencies Text::Markdown and DateTime are required to run the build step.

    make -f build/Makefile

To build the Electron app (JBrowse desktop app), run the following

    npm install -g electron-packager
    make -f build/Makefile release-electron-all

To run the Electron app in debug mode run the following

    npm install -g electron
    electron browser/main.js


# Making a JBrowse release

NOTE: Beginning in 1.12.4,

1. Run `build/release.sh $newReleaseVersion $nextReleaseVersion-alpha.0 notes.txt`, where notes.txt is any additional information to add to a blogpost. Then check its work, and then run the `git push` command it suggests to you. This makes a tag in the repository for the release, named, e.g. `1.6.3-release`.  This should cause Travis CI
to create a release on GitHub under https://github.com/GMOD/jbrowse/releases

1. Add release notes to the new GitHub release that Travis created. Can just paste these from release-notes.md, which is in Markdown format.

1. Write a twitter post for usejbrowse and JBrowseGossip with the announcement link to the blogpost

1. Write an email announcing the release, sending to gmod-ajax. If it is a major release, add gmod-announce and make a GMOD news item.

As you can tell, this process could really use some more streamlining and automation.
