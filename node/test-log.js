#!/usr/bin/env node

var http = require('http'),
    faye = require('faye'),
    serverPath = process.argv[2] || '/faye',
    serverPort = process.argv[3] || 8000

var client = new faye.Client('http://localhost:' + serverPort + serverPath);

client.publish ("/log", "Silent but meaningful")
    .then (function() {
	process.exit()
    })
