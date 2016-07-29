define(['dojo/_base/declare',
	'dojo/Deferred',
        'Rotunda/View/Track/Histogram',
	'Rotunda/util'],
       function(declare,
		Deferred,
                Histogram,
		util) {

/**
 * @class
 */
return declare (Histogram,
{
    constructor: function(config) {
	// attempt to deduce CSS styles and colors
	if ('trackConfig' in config) {
	    if ('style' in config.trackConfig && 'histCss' in config.trackConfig.style)
		this.className = config.trackConfig.style.histCss
	    else if ('histograms' in config.trackConfig && 'color' in config.trackConfig.histograms)
		this.histColor = config.trackConfig.histograms.color
	}

	this.highColor = this.lowColor = this.histColor || this.cssColor() || 'goldenrod'
    },

    binsPerView: 64,
//    pixelsPerBin: 1,
    buildHistogramForView: function (rot, minRadius, maxRadius, callback, errorCallback) {
	var track = this
	var basesPerBin
        if ('pixelsPerBin' in this)
            basesPerBin = rot.basesPerPixel(rot.scale,minRadius) * track.pixelsPerBin
        else
            basesPerBin = rot.width * rot.basesPerPixel(rot.scale,minRadius) / track.binsPerView
	basesPerBin = Math.pow (2, Math.ceil (Math.log(basesPerBin) / Math.log(2)))  // round to nearest power of 2

	// because we want all visible refseqs to share the same y-axis scale,
	// we first call getStoresInView to load stores for all visible refseqs
	track.getStoresInView (rot, null, function (data) {
	    var stores = data.stores
	    var intervals = data.intervals
	    var nQueriesLeft = intervals.length
	    var def = new Deferred()
	    var features = []
	    var scoreSum = 0, featureCount = 0, scoreMax, scoreMin
	    intervals.forEach (function (interval) {
		var store = stores[interval.seq]
		var intervalDef = new Deferred()
		intervalDef.then (function() {
		    if (--nQueriesLeft == 0)
			def.resolve()
		})

		// call getGlobalStats first
		// this call seems necessary to allow some stores (e.g. NCList) to set things up properly
		// at some point we may want to get a global scaling from this
		store.getGlobalStats
		(function (stats) {
		    var roundedIntervalStart = interval.start - (interval.start % basesPerBin)
		    var roundedIntervalEnd = interval.end - (interval.end % basesPerBin) + basesPerBin
		    // loop over bins, calling getRegionStats to find scores
		    var nBins = (roundedIntervalEnd - roundedIntervalStart) / basesPerBin
		    var nBinsLeft = nBins
		    for (var nBin = 0; nBin < nBins; ++nBin)
			(function (nBin) {
			    var binStart = roundedIntervalStart + nBin * basesPerBin
			    var binEnd = binStart + basesPerBin
			    store.getRegionStats
			    ( { ref: interval.seq,
				start: binStart,
				end: binEnd },
			      function (stats) {
                                  if (stats.featureCount) {
				      if (typeof(scoreMax) === 'undefined'
				          || stats.scoreMax > scoreMax)
				          scoreMax = stats.scoreMax
				      if (typeof(scoreMin) === 'undefined'
				          || stats.scoreMin < scoreMin)
				          scoreMin = stats.scoreMin
				      features.push ( { seq: interval.seq,
						        start: binStart,
						        end: binEnd,
						        score: stats.scoreMax } )
				      scoreSum += stats.scoreSum
				      featureCount += stats.featureCount
                                  }
				  if (--nBinsLeft == 0)
				      intervalDef.resolve()
			      },
			      function (error) {
				  if (--nBinsLeft == 0)
				      intervalDef.resolve()
			      } )
			}) (nBin)
		},
		 function(e) {
		     intervalDef.resolve()
		 })
	    })
	    // once this promise is resolved, we have all features & can pass control back to caller
	    def.then (function() {
		// hacky kludge: pass scaling via track member variables.
		// better would be to use JBrowse/View/Track/Wiggle/_Scale.js
		// (this would also allow full access to the JSON config options for scaling)
		track.baselineScore = 0
		track.minScore = Math.min (track.baselineScore, scoreMin)
		track.maxScore = Math.max (track.baselineScore, scoreMax)
		// return to caller
		callback (features)
	    })
	})
    },
})

});
