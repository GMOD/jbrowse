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
	this.axisLabelScaleThreshold = config.axisLabelScaleThreshold || 4
    },

    showAxisLabels: function(scale) {
	return scale >= this.axisLabelScaleThreshold
    },

    getRadius: function (scale) {
	return this.showAxisLabels(scale) ? 48 : 28  // do not scale
    },

    displayedName: function (refSeqName) {
	return refSeqName
    },

    showBase: false,

    draw: function (rot, minRadius, maxRadius, minAngle, maxAngle, drawCallback) {

	var track = this

        track._initTicks (rot, minRadius, maxRadius, minAngle, maxAngle)

	var smallTickMaxRadius = minRadius + 2
	var midTickMaxRadius = minRadius + 4
	var bigTickMaxRadius = minRadius + 8
	var labelRadius = minRadius + 18
	var nameRadius = minRadius + (this.showAxisLabels(rot.scale) ? 38 : 18)
        
	var refSeqsInView = rot.intervalsInView (minRadius)
        track._blankGridLines (rot, minRadius, maxRadius, refSeqsInView)

        var ticks = refSeqsInView.reduce (function (list, feature) {
	    var seqTicks = []
	    for (var pos = feature.start - (feature.start % track.tickSep);
		 pos < feature.end;
		 pos += track.tickSep)
		seqTicks.push ({ seq: feature.seq,
				 pos: pos + 1,
				 angle: rot.coordToAngle (feature.seq, pos),
				 minRadius: minRadius,
				 maxRadius: ((pos % track.bigTickSep)
					     ? ((pos % track.midTickSep) ? smallTickMaxRadius : midTickMaxRadius)
					     : bigTickMaxRadius),
				 text: ((pos == 0 || pos % track.bigTickSep) ? undefined : (Util.addCommas(pos / track.unitsSep) + track.units)),
                                 className: ((pos % track.bigTickSep) ? 'rotunda-gridline-minor' : 'rotunda-gridline-major'),
				 textRadius: labelRadius
			       })
	    return list.concat (seqTicks)
	}, [])

        var tickArc = d3.svg.arc()
            .innerRadius (function (feature) {
		return feature.minRadius
	    }).outerRadius (function (feature) {
		return feature.maxRadius
	    }).startAngle (function (feature) {
                return feature.angle
            }).endAngle (function (feature) {
                return feature.angle
            })

        var tickPath = this.d3featData(rot.g,ticks)
	    .append("path")
	    .attr("d", tickArc)
	    .attr("stroke", "grey")

        var mouseover = { featureLabel: function (feature) {
	    return feature.seq + '<br/>' + Util.addCommas(feature.pos)
	}}
        
	track.addMouseover (tickPath, mouseover)

	if (this.showBase) {
            var seqArc = d3.svg.arc()
		.innerRadius (function (feature) {
		    return minRadius
		}).outerRadius (function (feature) {
		    return minRadius
		}).startAngle (function (feature) {
		    return rot.coordToAngle (feature.seq, feature.start - 1)
		}).endAngle (function (feature) {
		    return rot.coordToAngle (feature.seq, feature.end)
		})

            this.d3featData(rot.g,refSeqsInView)
		.append("path")
		.attr("d", seqArc)
		.attr("stroke", "grey")
	}

        var featureTransform = function (feature) {
            return "translate("
                + rot.xPos (feature.textRadius, feature.angle)
                + ","
                + rot.yPos (feature.textRadius, feature.angle)
                + ")"
        }

        var featureText = function (feature) {
            return feature.text
        }

	var labels = ticks.filter (function (t) { return t.text })
	var seqNames = refSeqsInView.map (function (feature) {
	    return { seq: feature.seq,
		     angle: rot.coordToAngle (feature.seq, (feature.start - 1 + feature.end) / 2),
		     text: track.displayedName (feature.seq),
		     textRadius: nameRadius
		   }
	})
	var textData = this.showAxisLabels(rot.scale) ? labels.concat(seqNames) : seqNames

        this.d3featData(rot.g,textData)
	    .append("g")
	    .attr("transform", featureTransform)
	    .append("text")
	    .attr("class", "rotundaLabel")
	    .attr("text-anchor", "middle")
	    .attr("alignment-baseline", "central")
	    .text(featureText)

	if (drawCallback)
            drawCallback (track)
    }
})

});
