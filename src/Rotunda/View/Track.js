define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/dom-geometry",
	"Rotunda/util"],
       function(declare,
                lang,
                domGeom,
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

    getFeaturesInView: function (rot, callback, errorCallback) {
	var track = this
	var storeName = this.storeName
	if (storeName) {
	    var features = []
	    var intervals = rot.intervalsInView()
	    intervals.forEach (function (interval) {
		rot.browser.getStore (storeName, function (store) {
//		    store.getGlobalStats (function (stats) {
/*
			if (!('attrs' in store)) {
			    console.log ("No attrs for " + interval.seq + " " + store.config.label)
			    console.log(store)
			}
*/
			store.getFeatures ({ ref: interval.seq,
					     start: interval.start,
					     end: interval.end },
					   function (feature) {
					       features.push (track.transformStoreFeature (feature, interval.seq))
					   },
					   function() {
					       callback (features, interval.seq)
					   },
					   function() {
					       console.log ("Failed to get data for " + interval.seq)
					       errorCallback (interval.seq)
					   })
//		    })
		})
	    })
	} else if (errorCallback)
	    errorCallback()
    },

    d3featData: function (rot, features) {
	var track = this
        track.g = rot.g
	    .append('g')
	    .attr('id','#g_'+track.id)
        return track.g
	    .selectAll('#track_'+track.id)
	    .data(features)
	    .enter()
    },

    d3data: function (rot, callback, errorCallback) {
	var track = this
	var gotFeatures = function (data) {
            callback (track.d3featData (rot, data))
	}
	if (this.features)
	    gotFeatures(this.features)
	else
	    track.getFeaturesInView(rot,gotFeatures,errorCallback)
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
