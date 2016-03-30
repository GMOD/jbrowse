#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    http = require('http'),
    faye = require('faye'),
    getopt = require('node-getopt'),
    deferred = require('deferred')

var opt = getopt.create([
    ['d' , 'data=PATH'       , 'path to JBrowse data directory'],
    ['t' , 'track=PATH'      , 'path to new track file'],
    ['o' , 'stdout'          , 'write modified track list to stdout'],
    ['n' , 'notify=URL'      , 'publish notifications of new tracks'],
    ['s' , 'secret=STRING'   , 'password for notification server'],
    ['m' , 'messages'        , 'log notification messages'],
    ['h' , 'help'            , 'display this help']
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

var dataDir = opt.options['data'] || '.'
var trackListPath = path.join (dataDir, 'trackList.json')
var newTrackPath = opt.options['track'] || opt.argv[0] || '/dev/stdin'
var logging = opt.options['messages'];

fs.readFile (trackListPath, function (err, trackListData) {
    if (err) {
	console.log ("Warning: could not open '" + trackListPath + "': " + err)
    }
    var trackListJson = err ? {} : JSON.parse(trackListData)
    trackListJson.tracks = trackListJson.tracks || []

    var timeout = setTimeout (function() {
	if (newTrackPath == '/dev/stdin')
	    console.log ("[waiting for new track on stdin]")
    }, 500)
    fs.readFile (newTrackPath, function (err, newTrackData) {
	clearTimeout (timeout)
	if (err) throw err
    
	var newTrackJson = JSON.parse(newTrackData)

	// if it's a single definition, coerce to an array
	if (Object.prototype.toString.call(newTrackJson) != '[object Array]') {
	    newTrackJson = [ newTrackJson ]
	}

	// validate the new track JSON structures
	newTrackJson.forEach (function (track) {
	    if (!track.label) {
		console.log ("Invalid track JSON: missing a label element")
		process.exit (1)
	    }
	})
	
	// insert/replace the tracks
	var addedTracks = [], replacedTracks = []
	newTrackJson.forEach (function (newTrack) {
	    var newTracks = []
	    trackListJson.tracks.forEach (function (oldTrack) {
		if (oldTrack.label == newTrack.label) {
		    newTracks.push (newTrack)
		    replacedTracks.push (newTrack)
		    newTrack = {}
		} else {
		    newTracks.push (oldTrack)
		}
	    })
	    if (newTrack.label) {
		newTracks.push (newTrack)
		addedTracks.push (newTrack)
	    }
	    trackListJson.tracks = newTracks
	})

	// write the new track list
	var trackListOutputData = JSON.stringify (trackListJson, null, 2)
	if (opt.options.stdout) {
	    process.stdout.write (trackListOutputData + "\n")
	} else {
	    fs.writeFileSync (trackListPath, trackListOutputData)
	}

	// publish notifications
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

	    deferred.map (addedTracks, function (track) {
		return client.publish ("/tracks/new", track)
		    .then (function() {
			console.log ("Announced new track " + track.label)
		    }, function() {
			console.log ("Failed to announce new track " + track.label)
			process.exit()
		    })
	    }) (function() {
		deferred.map (replacedTracks, function (track) {
		    return client.publish ("/tracks/replace", track)
			.then (function() {
			    console.log ("Announced replacement track " + track.label)
			}, function() {
			    console.log ("Failed to announce replacement track " + track.label)
			    process.exit()
			})
		}) (function() {
		    process.exit()
		})
	    })
	} else {
	    process.exit()
	}
    })
})
