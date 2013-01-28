# Installing JBrowse

To install JBrowse, see the main JBrowse wiki at http://gmod.org/wiki/JBrowse.

The rest of this file is aimed primarily at developers.

# Setting up a development environment

Make sure you have a web server installed on your development machine.  Any web server will do.

    cd /my/dev/webserver/root;
    git clone git@github.com:YOURACCOUNT/jbrowse.git
    cd jbrowse
    git submodule update --init
    ./setup.sh
    # and now point your browser to
    #   http://localhost/jbrowse/index.html?data=sample_data/json/volvox
    # and you should see the volvox example data

# Running the developer test suites

## Server-side Perl

Tests for the server-side Perl code.  You must have the JBrowse Perl
module prerequisites installed for them to work.  Run with:

    prove -Isrc/perl5 -lr tests

## Client-side Unit Tests

Point your browser at http://my.dev.machine/jbrowse/tests/js_tests/index.html

## Client-side Integration Tests

Integration tests for the client-side app.  You need to have Python
eggs for `selenium` and `nose` installed.  Run the tests with:

    JBROWSE_URL='http://localhost/jbrowse/index.html' nosetests

# Using the embedded JavaScript documentation

The embedded documentation is written in JSDoc.  See
http://code.google.com/p/jsdoc-toolkit.

Running `bin/jbdoc ArrayRepr` will open your browser with
documentation about ArrayRepr.js.

The [here](http://code.google.com/p/jsdoc-toolkit/w/list) for a
comprehensive list of JSDoc tags.

# Cutting a JBrowse release

1. Edit the JBrowse `package.json` file and change 'version' to the version you are releasing.  *Don't commit this change to the repository, it should stay as `dev` in git so that it shows up in analytics as a development version.*

2. Build the release packages: `make -f build/Makefile release`.  The files produced during the build should not be committed to the repository either.

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
