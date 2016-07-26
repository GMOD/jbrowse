define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/dom-geometry",
	"dojo/Deferred",
	"Rotunda/util"],
       function(declare,
                lang,
                domGeom,
		Deferred,
		util) {
/**
 * @class
 */
return declare (null,
{
    constructor: function(config) {
        lang.mixin (this, config)
    },

    getRadius: function (scale, trackRadiusScale, defaultTrackRadius) {
    	var r = ('radius' in this) ? this.radius : defaultTrackRadius
        return r * trackRadiusScale
    },

    isLinkTrack: false,
    isInternal: function() {
        return 'radius' in this && this.radius == 0 && this.isLinkTrack
    },

    trackListID: function (rot) {
        return rot.id + '-track-label-' + this.id
    },

    storeName: null,
    transformStoreFeature: function (storeFeature, seq) {
	return { seq: seq,
		 start: storeFeature.get('start'),
		 end: storeFeature.get('end'),
		 id: storeFeature.id() }
    },
    getFeaturesInView: function (rot) {
	var track = this
	var d = new Deferred()
	var storeName = this.storeName
	if (storeName) {
	    var features = []
	    var intervals = rot.intervalsInView()
	    var nIntervalsRemaining = intervals.length
	    intervals.forEach (function (interval) {
		rot.browser.getStore (storeName, function (store) {
		    store.getFeatures ({ ref: interval.seq,
					 start: interval.start,
					 end: interval.end },
				       function (feature) {
					   features.push (track.transformStoreFeature (feature, interval.seq))
				       },
				       function() {
					   if (--nIntervalsRemaining == 0)
					       d.resolve (features)
				       },
				       function() {
					   console.log ("Failed to get data for " + interval.seq)
					   if (--nIntervalsRemaining == 0)
					       d.resolve (features)
				       })
		})
	    })
	} else
	    d.reject()
	return d
    },

    d3data: function (rot, features) {
	var track = this
	var d = new Deferred()
	var gotFeatures = function (data) {
            track.g = rot.g
		.append('g')
		.attr('id','#g_'+track.id)
            d.resolve (track.g
		       .selectAll('#track_'+track.id)
		       .data(data)
		       .enter())
	}
	if (features)
	    gotFeatures(features)
	else if (this.features)
	    gotFeatures(this.features)
	else
	    track.getFeaturesInView(rot).then(gotFeatures)
	return d
    },

    color: function (feature) {
	return feature.color || feature.type || 'black'
    },

    featureColorFunc: function() {
	var track = this
	return function (feature) {
	    return util.colorToRgb (track.color (feature))
	}
    },

    highlightColorFunc: function() {
	if ('highlightColor' in this) {
	    var track = this
	    return function (feature) {
		return util.colorToRgb (track.highlightColor (feature))
	    }
	}
	return undefined
    },

    featureLabelFunc: function() {
	var track = this
	return function (feature) {
	    return track.label + "<br/>" + (feature.label || feature.id)
	}
    },

    addTooltip: function() {
	return d3.select("body")
	    .append("div")
	    .attr("class", "rotunda-tooltip")
    },

    addMouseover: function (path, config) {
	config = config || {}

	var highlightColor = config.highlightColor || this.highlightColorFunc()
	var featureColor
	if (highlightColor)
	    featureColor = config.featureColor || this.featureColorFunc()

	var featureLabel = config.featureLabel || this.featureLabelFunc()

	var tooltip = this.addTooltip()

	path.on('mouseover',function(feature) {
	    if (highlightColor) {
		var rgb = util.colorToRgb (highlightColor (feature))
		this.setAttribute ('fill', rgb)
		this.setAttribute ('stroke', rgb)
		this.parentNode.appendChild (this)  // put on top
	    } else
		this.setAttribute ('style', 'opacity:.5;z-index:1;')
	    tooltip.style("visibility", "visible")
		.html (featureLabel (feature))
	}).on("mousemove", function(feature) {
            var x = d3.event.clientX
            var y = d3.event.clientY
	    tooltip.style("top", (y-10)+"px").style("left",(x+10)+"px")
	}).on("mouseout", function(feature) {
	    tooltip.style("visibility", "hidden")
	    if (highlightColor) {
		var rgb = featureColor(feature)
		this.setAttribute ('fill', rgb)
		this.setAttribute ('stroke', rgb)
	    } else
		this.setAttribute ('style', '')
	})
    }
})

});
