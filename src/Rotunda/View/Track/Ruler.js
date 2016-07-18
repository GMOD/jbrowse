define(['dojo/_base/declare',
        'Rotunda/View/Track'],
       function(declare,
                Track) {

/**
 * @class
 */
var tickMagUnits = ['bp', 'kb', 'Mb', 'Gb']

return declare (Track,
{
    constructor: function(config) {
	this.axisLabelScaleThreshold = config.axisLabelScaleThreshold || 4
    },

    showAxisLabels: function(scale) {
	return scale >= this.axisLabelScaleThreshold
    },

    radius: function (scale,trackRadiusScale) {
	return this.showAxisLabels(scale) ? 48 : 28  // do not scale
    },

    displayedName: function (refSeqName) {
	return refSeqName
    },

    units: "bp",

    showBase: false,

    draw: function (rot, minRadius, maxRadius, minAngle, maxAngle) {

	var track = this

	var baseRange = (maxAngle - minAngle) / rot.radsPerBase
	var mag = Math.ceil(Math.log10(baseRange))
	var tickMag = Math.max (0, mag - 2)
	var tickSep = Math.pow (10, tickMag)
	var midTickSep = 5 * tickSep
	var bigTickSep = 10 * tickSep

	var bigTickMag = tickMag + 1
	var unitsMag = Math.min (3*(tickMagUnits.length - 1), bigTickMag - (bigTickMag % 3))
	var unitsSep = Math.pow (10, unitsMag)
	var units = tickMagUnits[unitsMag/3]

	var smallTickMaxRadius = minRadius + 2
	var midTickMaxRadius = minRadius + 4
	var bigTickMaxRadius = minRadius + 8
	var labelRadius = minRadius + 18
	var nameRadius = minRadius + (this.showAxisLabels(rot.scale) ? 38 : 18)
        
	var refSeqsInView = rot.intervalsInView()
	var ticks = refSeqsInView.reduce (function (list, feature) {
	    var seqTicks = []
	    for (var pos = feature.start - (feature.start % tickSep);
		 pos < feature.end;
		 pos += tickSep)
		seqTicks.push ({ seq: feature.seq,
				 pos: pos + 1,
				 angle: rot.coordToAngle (feature.seq, pos + 1),
				 minRadius: minRadius,
				 maxRadius: ((pos % bigTickSep)
					     ? ((pos % midTickSep) ? smallTickMaxRadius : midTickMaxRadius)
					     : bigTickMaxRadius),
				 text: ((pos == 0 || pos % bigTickSep) ? undefined : ((pos / unitsSep) + units)),
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

        var tickPath = this.d3data(rot,ticks).append("path")
            .attr("d", tickArc)
            .attr("stroke", "grey")

	this.addMouseover (tickPath,
			   { featureLabel: function (feature) {
			       return feature.seq + '<br/>' + feature.pos + track.units
			   }})

	if (this.showBase) {
            var seqArc = d3.svg.arc()
		.innerRadius (function (feature) {
		    return minRadius
		}).outerRadius (function (feature) {
		    return minRadius
		}).startAngle (function (feature) {
		    return rot.coordToAngle (feature.seq, feature.start)
		}).endAngle (function (feature) {
		    return rot.coordToAngle (feature.seq, feature.end)
		})

            this.d3data(rot,refSeqsInView).append("path")
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
		     angle: rot.coordToAngle (feature.seq, (feature.start + feature.end) / 2),
		     text: track.displayedName (feature.seq),
		     textRadius: nameRadius
		   }
	})
	var textData = this.showAxisLabels(rot.scale) ? labels.concat(seqNames) : seqNames

        this.d3data(rot,textData).append("g")
            .attr("transform", featureTransform)
            .append("text")
            .attr("class", "rotundaLabel")
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "central")
            .text(featureText)
    }
})

});
