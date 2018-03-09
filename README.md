[![Build status](https://travis-ci.org/GMOD/jbrowse.svg?branch=dev)](https://travis-ci.org/GMOD/jbrowse)

# Installing JBrowse

Users of JBrowse should get it from the main JBrowse site at http://jbrowse.org/install where official release are available.

The `master` branch is always in line with the latest release however it is not minified JS. Features
are merged into the `dev` branch following acceptance of an item submitted via pull request.

# Install from github repo (development)

Note: `jb_run.js` is a built-in [express](https://expressjs.com/) server that serves JBrowse.  However, any webserver like Apache or NGINX can be used.

*If you are using a 3rd party webserver, you should clone JBrowse into your web root*

    git clone https://github.com/GMOD/jbrowse
    cd jbrowse
    npm install
    ./jb_setup.js   (optional -- sets up demo files such as Volvox)
    ./jb_run.js     (optional -- begin serving JBrowse with built-in mini web server)

If you have installed the demo (with ./jb_setup.js), you can point your browser to
http://localhost/jbrowse/index.html?data=sample_data/json/volvox
and you should see the volvox example data.

`jb_run.js` will default to a non-privileged port (8080), this can be overridden with the `-p` option.

Now you can simply edit files and your changes will be available in the browser (the build step is not required).

# Installing as an npm module

This allows JBrowse to be easily integrated into other applications.  `jb_setup.js` and `jb_run.js` are copied into the application root and can be used to install the demo files and serve JBrowse, respectively.

    npm install GMOD/jbrowse

# Generating Packaged Builds

You can also optionally run build steps to create the minimized codebase. Extra perl dependencies Text::Markdown and DateTime are required to run the build step.

    make -f build/Makefile

To build the Electron app (JBrowse desktop app), run the following

    npm install -g electron-packager
    make -f build/Makefile release-electron-all

To run the Electron app in debug mode run the following

    npm install -g electron
    electron browser/main.js

# Running the developer test suites

## Server-side Perl

Tests for the server-side Perl code.  You must have the JBrowse Perl
module prerequisites installed for them to work.  Run with:

    prove -Isrc/perl5 -lr tests

## Client-side Unit Tests

Point your browser at `http://my.dev.machine/jbrowse/tests/js_tests/index.html`

You can also run them from phantomJS using

    phantomjs tests/js_tests/run-jasmine.js http://my.dev.machine/jbrowse/tests/js_tests/index.html

## Client-side Integration Tests

Integration tests for the client-side app.  You need to have Python
eggs for `selenium` and `nose` installed.  Run the tests with:

    MOZ_HEADLESS=1 SELENIUM_BROWSER=firefox JBROWSE_URL='http://localhost/jbrowse/index.html' nosetests

Supported browsers are 'firefox', 'chrome', 'phantom', and 'travis_saucelabs'.  The Sauce Labs + Travis
one will only work in a properly configured Travis CI build environment.

# Manual testing

<img style="display: block; margin: 1em auto" src="img/browserstack-logo-600x315.png" width="200" alt="Browserstack"/>

JBrowse has a free open source account on [Browserstack](http://browserstack.com/) for manual testing.  Contact @rbuels for access.

# Making a JBrowse release

NOTE: Beginning in 1.12.4,

1. Make a tag in the repository for the release, named, e.g. `1.6.3-release`.  This should cause Travis CI
to create a release on GitHub under https://github.com/GMOD/jbrowse/releases

1. Add release notes to the new GitHub release that Travis created. Can just paste these from release-notes.txt, which is in Markdown format.

1. Write a blog post announcing the release, with links to the built releases on GitHub. The SHA1 sums of the built release files can be seen near the end of the Travis build log, and the HTML version of the release notes can be gotten by running `make -f build/Makefile release-notes.html`.

1. Update the latest-release code checkout on the site, which the "Latest Release" demo on the jbrowse.org points to, to be an unzipped-and-set-up copy of the latest release.

1. Write an email announcing the release, sending to gmod-ajax. If it is a major release, add gmod-announce and make a GMOD news item.

As you can tell, this process could really use some more streamlining and automation.
