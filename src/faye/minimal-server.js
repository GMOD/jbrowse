#!/usr/bin/env node

var fs = require('fs'),
    http = require('http'),
    faye = require('faye'),
    getopt = require('node-getopt'),
    deferred = require('deferred')

var opt = getopt.create([
    ['p' , 'port=PORT'       , 'server port'],
    ['r' , 'root=PATH'       , 'server path'],
    ['t' , 'timeout=SECS'    , 'server timeout'],
    ['s' , 'secret=STRING'   , 'password for protected messages'],
    ['m' , 'messages'        , 'log incoming & outgoing messages'],
    ['h' , 'help'            , 'display this help']
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

var serverPath = opt.options['root'] || '/faye';
var serverPort = opt.options['port'] || 8000;
var serverTimeout = opt.options['timeout'] || 45;
var logging = opt.options['messages'];

if (serverPath[0] != '/') {
    serverPath = '/' + serverPath
}

// Start faye server
var server = http.createServer(),
    bayeux = new faye.NodeAdapter({mount: serverPath, timeout: serverTimeout});

var secret = opt.options['secret']
if (secret)
    bayeux.addExtension({
	incoming: function(message, callback) {
	    if (message.channel.match(/^\/(tracks|alert|log)/)) {
		var password = message.ext && message.ext.password;
		if (password !== secret)
		    message.error = '403::Password required';
	    }
	    callback(message);
	},

	outgoing: function(message, callback) {
	    if (message.ext)
		delete message.ext.password;
	    callback(message);
	}
    });

if (logging)
    bayeux.addExtension({
	incoming: function(message, callback) {
	    console.log('server incoming', message);
	    callback(message);
	},
	outgoing: function(message, callback) {
	    console.log ('server outgoing', message);
	    callback(message);
	}
    });

bayeux.attach(server);
server.listen(serverPort);

var serverUrl = "http://localhost:" + serverPort + serverPath
console.log("Server up at " + serverUrl)
