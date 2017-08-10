#!/usr/bin/env node

/* express server for jbrowse
 * (this script gets copied to the app root directory upon npm install)
 */

var express = require('express');
var getopt = require('node-getopt');

var getopt = new getopt([
    ['p' , 'port=NUMBER' , 'listening port'],
    ['h' , 'help'        , 'display this help']
]);              // create Getopt instance
getopt.bindHelp();     // bind option 'help' to default action
opt = getopt.parseSystem(); // parse command line

var port = 80;

var setPort = opt.options['port'];
if (typeof setPort !== 'undefined') {
    port = setPort;
}

var app = express();

var dispPort = "";
if (port !== 80) dispPort = ":"+port;

app.use('/', express.static('./'));

app.listen(port, function () {
    console.log('JBrowse is running on port %s',port);
    console.log('Point your browser to http://localhost%s',dispPort);
});
