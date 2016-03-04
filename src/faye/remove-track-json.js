#!/usr/bin/env node

var fs = require('fs'),
    http = require('http'),
    faye = require('faye'),
    getopt = require('node-getopt'),
    deferred = require('deferred')

var opt = getopt.create([
    ['l' , 'track-list=PATH' , 'path to track list file'],
    ['t' , 'track=NAME+'     , 'label(s) of track to delete'],
    ['o' , 'stdout'          , 'write modified track list to stdout'],
    ['n' , 'notify=URL'      , 'publish notification for new track'],
    ['h' , 'help'            , 'display this help'],
    ['v' , 'version'         , 'show version']
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

var trackListPath = opt.options['track-list'] || 'trackList.json'
var trackLabels = opt.argv.concat (opt.options['track'] || [])

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
	client.publish ("/tracks/delete", trackLabels.map (function (trackLabel) {
	    return { label : trackLabel }
	})).then (function() {
	    console.log ("Announced deleted tracks: " + trackLabels.join())
	    process.exit()
	})

    } else {
	process.exit()
    }
    
})
