define(['dojo/_base/declare',
        'Rotunda/View/Track'],
       function(declare,
                Track) {

/**
 * @class
 */
return declare (Track,
{
    constructor: function(config) {
    },

    draw: function (rot, minRadius, maxRadius, minAngle, maxAngle, drawCallback) {

	var track = this
	this.getFeaturesInView (rot, function (features) {

            var featureColor = track.featureColorFunc()
            
            var featureArc = d3.svg.arc()
		.innerRadius(minRadius)
		.outerRadius(maxRadius)
		.startAngle (function (feature) {
                    return rot.coordToAngle (feature.seq, feature.start - 1)
		}).endAngle (function (feature) {
                    return rot.coordToAngle (feature.seq, feature.end)
		})

            var path = track.d3featData (rot.g, features)
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
