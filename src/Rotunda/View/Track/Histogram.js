define(['dojo/_base/declare',
        'Rotunda/View/Track',
	'Rotunda/util'],
       function(declare,
                Track,
		util) {

/**
 * @class
 */
return declare (Track,
{
    constructor: function(config) {
    },

    units: "",

    featureLabelFunc: function() {
	var track = this
	return function (feature) {
	    return track.label + "<br/>" + feature.seq + " (" + feature.start + ".." + feature.end + ")<br/>" + feature.score + track.units
	}
    },

    highColor: 'green',
    lowColor: 'dgreen',
    featureColorFunc: function (baseline) {
	baseline = baseline || 0
	var track = this
	return function (feature) {
	    return util.colorToRgb (feature.score >= baseline ? track.highColor : track.lowColor)
	}
    },

    binsPerView: 16,
    basesPerBin: function (rot, minRadius) {
	var track = this
	var basesPerBin
        if ('pixelsPerBin' in this)
            basesPerBin = rot.basesPerPixel(1,minRadius) * track.pixelsPerBin
        else
            basesPerBin = rot.width * rot.basesPerPixel(1,minRadius) / track.binsPerView
	basesPerBin = Math.pow (2, Math.ceil (Math.log(basesPerBin) / Math.log(2)))  // round to nearest power of 2
        return basesPerBin
    },
    
    buildHistogramForView: function (rot, minRadius, maxRadius, callback, errorCallback) {
	return this.getFeaturesInView (rot, callback, errorCallback)
    },

    draw: function (rot, minRadius, maxRadius, minAngle, maxAngle, drawCallback) {
	var track = this
        var g = rot.g
	track.buildHistogramForView (rot, minRadius, maxRadius, function (features) {
            var scores = features.map (function (feature) { return feature.score })
            var minScore = ('minScore' in track) ? track.minScore : Math.min.apply (track, scores)
	    if ('minScoreLowBound' in track)
		minScore = Math.max (track.minScoreLowBound, minScore)
	    if ('minScoreHighBound' in track)
		minScore = Math.min (track.minScoreHighBound, minScore)
            var maxScore = ('maxScore' in track) ? track.maxScore : Math.max.apply (track, scores)
	    if ('maxScoreLowBound' in track)
		maxScore = Math.max (track.maxScoreLowBound, maxScore)
	    if ('maxScoreHighBound' in track)
		maxScore = Math.min (track.maxScoreHighBound, maxScore)
            var baselineScore = ('baselineScore' in track) ? track.baselineScore : util.mean (scores)
	    baselineScore = Math.max (minScore, Math.min (maxScore, baselineScore))
            var radiusPerScore = (maxRadius - minRadius) / (maxScore - minScore)

            var featureColor = track.featureColorFunc (baselineScore)

            var featureArc = d3.svg.arc()
		.innerRadius (function(feature) {
		    var score = Math.max (minScore, Math.min (maxScore, feature.score))
                    return ((score >= baselineScore ? baselineScore : score) - minScore) * radiusPerScore + minRadius
		}).outerRadius (function(feature) {
		    var score = Math.max (minScore, Math.min (maxScore, feature.score))
                    return ((score >= baselineScore ? score : baselineScore) - minScore) * radiusPerScore + minRadius
		}).startAngle (function (feature) {
                    return rot.coordToAngle (feature.seq, feature.start - 1)
		}).endAngle (function (feature) {
                    return rot.coordToAngle (feature.seq, feature.end)
		})

            var path = track.d3featData (g, features)
		.append("path")
		.attr("d", featureArc)
		.attr("fill", featureColor)
		.attr("stroke", featureColor)
	    
	    track.addMouseover (path)

	    if (drawCallback)
                drawCallback (track)
        })
    }
})

});
