#!/usr/bin/env node

var http = require('http'),
    faye = require('faye'),
    serverPath = process.argv[2] || '/faye',
    serverPort = process.argv[3] || 8000

// Start pub/sub on /faye
var server = http.createServer(),
    bayeux = new faye.NodeAdapter({mount: serverPath, timeout: 45});

bayeux.attach(server);
server.listen(serverPort);

var serverUrl = "http://localhost:" + serverPort + serverPath
console.log("Server up at " + serverUrl)
