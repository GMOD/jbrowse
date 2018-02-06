[![Build status](https://travis-ci.org/GMOD/jbrowse.svg?branch=master)](https://travis-ci.org/GMOD/jbrowse)

# Installing JBrowse

Users of JBrowse should get it from the main JBrowse site at http://jbrowse.org/install where official release are available.

It is generally recommended that installing from the master branch is for development purposes.
One reason is because the development version has a much slower initial load than the Release package.  Also, since the master branch code is ''in development'' for the next JBrowse release, it may contain bugs.

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

Now you can simply edit files and your changes will be available in the browser (the build step is not required).

# Installing as an npm module

This allows JBrowse to be easily integrated into other applications.  `jb_setup.js` and `jb_run.js` are copied into the application root and can be used to install the demo files and serve JBrowse, respectively.

    npm install GMOD/jbrowse

# Generating Packaged Builds

You can also optionally run build steps to create the minimized codebase. Extra perl dependencies Text::Markdown and DateTime are required to run the build step.

    make -f build/Makefile release-notest
    make -f build/Makefile release # alternate build with full test suite

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

Supported browsers are 'firefox', 'chrome', 'phantom', and 'travis_saucelabs'.  The Sauce Labs + Travis one will only work properly in a properly configured Travis CI build environment.

# Cutting a JBrowse release

1. Edit the JBrowse `package.json` file and change 'version' to the version you are releasing.  *Don't commit this change to the repository, it should stay as `dev` in git so that it shows up in analytics as a development version.*

2. Build the release packages: `make -f build/Makefile release`.  The files produced during the build should not be committed to the repository either. There is also `make -f build/Makefile release-notest` for releases that don't need perl tests to be run. NOTE: you may need to use the command `ulimit -n 1000` to avoid "spawn EMFILE" build errors.

3. Make a tag in the repository for the release, named, e.g. `1.6.3-release`.

4. `scp` the release .zip files (min and full) to jbrowse.org.

5. Add them to the Wordpress Downloads list so that we can track how
many times they are downloaded.

6. Write a blog post announcing the release.  The `release-notes.html`
file made during the build might be useful for this.

7. Update the "Install" page on the site to point to the newest release.

8. Update the latest-release code checkout on the site, which the "Latest Release" demo on the jbrowse.org points to, to be an unzipped-and-set-up copy of the latest release.

9. Write an email announcing the release, sending to gmod-ajax,
jbrowse-dev.  If it is a major release, add gmod-announce and make a GMOD news item.

As you can tell, this process could really use some more streamlining and automation.
