# Installing JBrowse

To install JBrowse, see the main JBrowse wiki at http://gmod.org/wiki/JBrowse.

The rest of this file is aimed primarily at developers.

# Running the developer test suites

## Server-side Perl

Tests for the server-side Perl code.  You must have the JBrowse Perl
module prerequisites installed for them to work.  Run with:

    prove -lr t

## Client-side Unit Tests

Point your browser at [tests/js_tests/index.html](tests/js_tests/index.html)

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
