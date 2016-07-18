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

    draw: function (rot, minRadius, maxRadius, minAngle, maxAngle) {
        
	var track = this
        var featureColor = this.featureColorFunc()
        
        var featureArc = d3.svg.arc()
            .innerRadius(minRadius)
            .outerRadius(maxRadius)
            .startAngle (function (feature) {
                return rot.coordToAngle (feature.seq, feature.start)
            }).endAngle (function (feature) {
                return rot.coordToAngle (feature.seq, feature.end)
            })

        var path = this.d3data(rot).append("path")
            .attr("d", featureArc)
            .attr("fill", featureColor)
            .attr("stroke", featureColor)

	this.addMouseover (path)
    }
})

});
