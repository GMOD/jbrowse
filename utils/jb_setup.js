#!/usr/bin/env node

/* Determines appropriate directory where jbrowse is installed (app root or as a module in node_modules).
 * Then runs setup.sh
 * (this script gets copied to the app root directory upon npm install)
 */

var fs = require('fs-extra')
var shelljs = require('shelljs')

var setupScript = 'setup.sh'
var thisPath = process.cwd()

// check if jbrowse is a module
if (
  fs.pathExistsSync(thisPath + '/node_modules/@gmod/jbrowse/' + setupScript)
) {
  shelljs.cd('node_modules/@gmod/jbrowse')
}

shelljs.exec('./' + setupScript)
