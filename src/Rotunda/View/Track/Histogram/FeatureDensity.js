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
    },

    baselineValue: 0,

    pixelsPerBin: 10,
    buildHistogramForView: function (rot, minRadius, maxRadius, callback, errorCallback) {
	var track = this
	var basesPerBin = rot.basesPerPixel(rot.scale,minRadius) * track.pixelsPerBin
	basesPerBin = Math.pow (2, Math.ceil (Math.log(basesPerBin) / Math.log(2)))  // round to nearest power of 2

	track.getStoresInView (rot, null, function (data) {
	    var stores = data.stores
	    var intervals = data.intervals
	    var nQueriesLeft = intervals.length
	    var def = new Deferred()
	    var features = []
	    intervals.forEach (function (interval) {
		var store = stores[interval.seq]
		var intervalDef = new Deferred()
		intervalDef.then (function (intervalFeatures) {
		    if (intervalFeatures)
			features = features.concat (intervalFeatures)
		    if (--nQueriesLeft == 0)
			def.resolve()
		})

		store.getGlobalStats
		(function (stats) {
		    if (stats.featureCount > 0) {
			var query = {
			    ref:   interval.seq,
			    start: interval.start - (interval.start % basesPerBin),
			    end:   interval.end - (interval.end % basesPerBin) + basesPerBin,
			    basesPerSpan: basesPerBin,
			    basesPerBin: basesPerBin
			}
			store.getRegionFeatureDensities
			(query,
			 function (histData) {
			     var features = histData.bins.map (function (score, nBin) {
				 return { seq: query.ref,
					  start: query.start + nBin * basesPerBin,
					  end: query.start + (nBin + 1) * basesPerBin,
					  score: score }
			     })
			     intervalDef.resolve (features)
			 })
		    } else
			intervalDef.resolve ( [{ seq: interval.seq,
						 start: interval.start,
						 end: interval.end,
						 score: 0 }] )
		},
		 function(e) {
		     intervalDef.resolve()
		 })

	    })
	    def.then (function() {
		callback (features)
	    })
	})
    },
})

});
