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

    buildHistogramForView: function (rot, minRadius, maxRadius, callback, errorCallback) {
	return getFeaturesInView (rot, callback, errorCallback)
    },

    draw: function (rot, minRadius, maxRadius) {
	var track = this
	track.buildHistogramForView (rot, minRadius, maxRadius, function (features) {
            var scores = features.map (function (feature) { return feature.score })
            var minScore = ('minScore' in track) ? track.minScore : Math.min.apply (track, scores)
            var maxScore = ('maxScore' in track) ? track.maxScore : Math.max.apply (track, scores)
            var baselineScore = ('baselineScore' in track) ? track.baselineScore : util.mean (scores)
            var val2radius = (maxRadius - minRadius) / (maxScore - minScore)

            var featureColor = track.featureColorFunc (baselineScore)

            var featureArc = d3.svg.arc()
		.innerRadius (function(feature) {
                    return ((feature.score > baselineScore ? baselineScore : feature.score) - minScore) * val2radius + minRadius
		}).outerRadius (function(feature) {
                    return ((feature.score > baselineScore ? feature.score : baselineScore) - minScore) * val2radius + minRadius
		}).startAngle (function (feature) {
                    return rot.coordToAngle (feature.seq, feature.start - 1)
		}).endAngle (function (feature) {
                    return rot.coordToAngle (feature.seq, feature.end)
		})

            var path = track.d3featData (rot, features)
		.append("path")
		.attr("d", featureArc)
		.attr("fill", featureColor)
		.attr("stroke", featureColor)
	    
	    track.addMouseover (path)
	})
    }
})

});
