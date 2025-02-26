#!/usr/bin/env node

/* express server for jbrowse
 * (this script gets copied to the app root directory upon npm install)
 */

var express = require('express')
var getopt = require('node-getopt')
var fs = require('fs-extra')

var thisPath = process.cwd()
var jbrowsePath = './'

// check if jbrowse is a module
if (fs.pathExistsSync(thisPath + '/node_modules/@gmod/jbrowse/utils')) {
  jbrowsePath = './node_modules/@gmod/jbrowse'
}

// command line options
var getopt = new getopt([
  ['p', 'port=NUMBER', 'listening port'],
  ['s', 'suburi=STRING', 'sub-URI path'],
  ['h', 'help', 'display this help'],
]) // create Getopt instance
getopt.bindHelp() // bind option 'help' to default action
opt = getopt.parseSystem() // parse command line

var port = 3000
var setPort = opt.options['port']
if (typeof setPort !== 'undefined') {
  port = setPort
}

// start the server
var app = express()

var dispPort = ''
if (port !== 80) dispPort = ':' + port

app.use(
  '/' + (opt.options['suburi'] || ''),
  express.static(jbrowsePath, {
    // set Content-Encoding: gzip on .jsonz and .gz files
    setHeaders(res, path, stat) {
      if (/\.(txt|json|g)z$/.test(path) && !res.req.headers.range) {
        res.setHeader('Content-Encoding', 'gzip')
      }
      res.setHeader('Cache-Control', 'public')
    },
  }),
)

app.listen(port, function () {
  console.log('JBrowse is running on port %s', port)
  console.log('Point your browser to http://localhost%s', dispPort)
})
