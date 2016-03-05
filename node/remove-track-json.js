#!/usr/bin/env node

var fs = require('fs'),
    http = require('http'),
    faye = require('faye'),
    getopt = require('node-getopt'),
    deferred = require('deferred')

var opt = getopt.create([
    ['l' , 'track-list=PATH' , 'path to track list file'],
    ['t' , 'track=LABEL+'    , 'label(s) of track to delete'],
    ['o' , 'stdout'          , 'write modified track list to stdout'],
    ['n' , 'notify=URL'      , 'publish notification of deleted track'],
    ['s' , 'secret=STRING'   , 'password for notification server'],
    ['m' , 'messages'        , 'log notification messages'],
    ['h' , 'help'            , 'display this help'],
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

var trackListPath = opt.options['track-list'] || 'trackList.json'
var trackLabels = opt.argv.concat (opt.options['track'] || [])
var logging = opt.options['messages'];

fs.readFile (trackListPath, function (err, trackListData) {
    if (err) {
	console.log ("Warning: could not open '" + trackListPath + "': " + err)
    }
    var trackListJson = err ? {} : JSON.parse(trackListData)
    trackListJson.tracks = trackListJson.tracks || []

    // delete the track
    trackListJson.tracks = trackListJson.tracks.filter (function (oldTrack) {
	return !trackLabels.some (function (trackLabel) { return oldTrack.label == trackLabel })
    })

    // write the new track list
    var trackListOutputData = JSON.stringify (trackListJson, null, 2)
    if (opt.options.stdout) {
	process.stdout.write (trackListOutputData + "\n")
    } else {
	fs.writeFileSync (trackListPath, trackListOutputData)
    }

    // publish notification
    var publishUrl = opt.options['notify']
    if (publishUrl) {
	var client = new faye.Client (publishUrl)
	var secret = opt.options['secret']
	if (secret)
	    client.addExtension({
		outgoing: function(message, callback) {
		    message.ext = message.ext || {};
		    message.ext.password = secret;
		    callback(message);
		}
	    });
	if (logging)
	    client.addExtension({
		outgoing: function(message, callback) {
		    console.log ('client outgoing', message);
		    callback(message);
		}
	    });
	client.publish ("/tracks/delete", trackLabels.map (function (trackLabel) {
	    return { label : trackLabel }
	})).then (function() {
	    console.log ("Announced deleted tracks: " + trackLabels.join())
	    process.exit()
	}, function() {
	    console.log ("Failed to announce deleted track " + trackLabels.join())
	    process.exit()
	})

    } else {
	process.exit()
    }
    
})
