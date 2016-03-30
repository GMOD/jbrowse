#!/usr/bin/env node

var http = require('http'),
    faye = require('faye'),
    serverPath = process.argv[2] || '/faye',
    serverPort = process.argv[3] || 8000

var client = new faye.Client('http://localhost:' + serverPort + serverPath);

client.publish ("/tracks/replace",
		{ "label" : "fromfaye",
		  "features" : [ { "seq_id" : "ctga",
				   "name" : "Re-notified",
				   "polarity" : "transmogrified",
				   "description" : "Test feature moved via Faye",
				   "end" : 1440,
				   "start" : 1330} ],
		  "storeClass" : "JBrowse/Store/SeqFeature/FromConfig",
		  "metadata" : { "Description" : "Demonstration of replacing a track via Faye" },
		  "category" : "Miscellaneous",
		  "type" : "JBrowse/View/Track/HTMLFeatures",
		  "key" : "Track replaced via Faye" })
    .then (function() {
	console.log ("Sent /tracks/replace message")
	process.exit()
    })
