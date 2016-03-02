#!/usr/bin/env node

var http = require('http'),
    faye = require('faye'),
    serverPath = process.argv[2] || '/faye',
    serverPort = process.argv[3] || 8000

var client = new faye.Client('http://localhost:' + serverPort + serverPath);

client.publish ("/tracks/new",
		{ "label" : "fromfaye",
		  "features" : [ { "seq_id" : "ctga",
				   "name" : "Notified",
				   "polarity" : "hijinxed",
				   "description" : "Test feature added via Faye",
				   "end" : 440,
				   "start" : 330} ],
		  "storeClass" : "JBrowse/Store/SeqFeature/FromConfig",
		  "metadata" : { "Description" : "Demonstration of adding a track via Faye" },
		  "category" : "Miscellaneous",
		  "type" : "JBrowse/View/Track/HTMLFeatures",
		  "key" : "Track added via Faye" })
    .then (function() {
	console.log ("Sent /track/new message")
	process.exit()
    })
