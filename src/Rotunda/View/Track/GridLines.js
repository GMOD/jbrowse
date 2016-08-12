define(['dojo/_base/declare',
        'JBrowse/Util',
        'Rotunda/View/Track',
        'Rotunda/View/Track/_Ticks'],
       function(declare,
                Util,
                Track,
                Ticks) {

/**
 * @class
 */
return declare ([Track,Ticks],
{
    constructor: function(config) {
	config = config || {}
    },

    draw: function (rot, minRadius, maxRadius, minAngle, maxAngle, drawCallback) {

	var track = this

        track._initTicks (rot, rot.innerRadius(), rot.outerRadius(), minAngle, maxAngle)
        
	var refSeqsInView = rot.intervalsInView (Math.max (rot.innerRadius(), rot.outerRadius() - rot.height))

        var innerArc = d3.svg.arc()
            .innerRadius (rot.innerRadius())
            .outerRadius (rot.innerRadius())
            .startAngle (function (refSeq) {
                return rot.coordToAngle (refSeq.seq, refSeq.start)
            })
            .endAngle (function (refSeq) {
                return rot.coordToAngle (refSeq.seq, refSeq.end)
            })

        var outerArc = d3.svg.arc()
            .innerRadius (rot.outerRadius())
            .outerRadius (rot.outerRadius())
            .startAngle (function (refSeq) {
                return rot.coordToAngle (refSeq.seq, refSeq.start)
            })
            .endAngle (function (refSeq) {
                return rot.coordToAngle (refSeq.seq, refSeq.end)
            })

        var innerPath = this.d3featData(rot.g,refSeqsInView)
	    .append("path")
	    .attr("d", innerArc)
	    .attr("class", "rotunda-gridline-major")

        var outerPath = this.d3featData(rot.g,refSeqsInView)
	    .append("path")
	    .attr("d", outerArc)
	    .attr("class", "rotunda-gridline-major")

	var ticks = refSeqsInView.reduce (function (list, feature) {
	    var seqTicks = []
	    for (var pos = feature.start - (feature.start % track.tickSep);
		 pos < feature.end;
		 pos += track.tickSep)
		seqTicks.push ({ seq: feature.seq,
				 pos: pos,
				 angle: rot.coordToAngle (feature.seq, pos),
                                 className: ((pos % track.bigTickSep) ? 'rotunda-gridline-minor' : 'rotunda-gridline-major')
			       })
	    return list.concat (seqTicks)
	}, [])

        var spokeArc = d3.svg.arc()
            .innerRadius (rot.innerRadius())
            .outerRadius (rot.outerRadius())
            .startAngle (function (feature) {
                return feature.angle
            }).endAngle (function (feature) {
                return feature.angle
            })

        var spokePath = this.d3featData(rot.g,ticks,{prepend:true})
	    .append("path")
	    .attr("d", spokeArc)
	    .attr("class", function (feature) {
                return feature.className
            })

        var mouseover = { featureLabel: function (feature) {
	    return feature.seq + '<br/>' + Util.addCommas(feature.pos)
	}}
        
	track.addMouseover (spokePath, mouseover)

	if (drawCallback)
            drawCallback (track)
    }
})

});
