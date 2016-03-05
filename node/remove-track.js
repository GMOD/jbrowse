#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    http = require('http'),
    faye = require('faye'),
    getopt = require('node-getopt'),
    deferred = require('deferred')

var opt = getopt.create([
    ['d' , 'data=PATH'       , 'path to JBrowse data directory'],
    ['l' , 'label=LABEL+'    , 'label(s) of track config to delete'],
    ['r' , 'remove-data'     , 'delete track data, as well as config'],
    ['o' , 'stdout'          , 'write modified track list to stdout'],
    ['n' , 'notify=URL'      , 'publish notification of deleted track'],
    ['s' , 'secret=STRING'   , 'password for notification server'],
    ['m' , 'messages'        , 'log notification messages'],
    ['h' , 'help'            , 'display this help'],
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

var dataDir = opt.options['data'] || '.'
var trackListPath = path.join (dataDir, 'trackList.json')
var trackLabels = opt.argv.concat (opt.options['label'] || [])
var logging = opt.options['messages'];
var deleteData = opt.options['remove-data']

if (trackLabels.length == 0)
    throw new Error ("No track labels specified")

fs.readFile (trackListPath, function (err, trackListData) {
    if (err) {
	console.log ("Warning: could not open '" + trackListPath + "': " + err)
    }
    var trackListJson = err ? {} : JSON.parse(trackListData)
    trackListJson.tracks = trackListJson.tracks || []

    // delete the track
    function deleteFilter (oldTrack) {
	return trackLabels.some (function (trackLabel) { return oldTrack.label == trackLabel })
    }
    function negate (pred) { return function() { return !pred.apply(this,arguments) } }
    var deletedTracks = trackListJson.tracks.filter (deleteFilter)
    trackListJson.tracks = trackListJson.tracks.filter (negate (deleteFilter))

    function notFoundFilter (trackLabel) {
	return !deletedTracks.some (function (track) { return track.label == trackLabel })
    }
    if (trackLabels.some (notFoundFilter)) {
	console.log ("Warning: the following track labels were not found: " + trackLabels.filter(notFoundFilter).join())
    }

    // write the new track list
    var trackListOutputData = JSON.stringify (trackListJson, null, 2)
    if (opt.options.stdout) {
	process.stdout.write (trackListOutputData + "\n")
    } else {
	fs.writeFileSync (trackListPath, trackListOutputData)
    }

    // delete the track data
    if (deleteData)
	deletedTracks.forEach (function (track) {
	    var trackDataDir = path.join (dataDir, 'tracks', track.label)
	    if (fs.existsSync (trackDataDir)) {
		console.log ("Removing " + trackDataDir)
		exec ('rm -r ' + trackDataDir)
	    }
	})
    
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
