define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/dom-geometry",
	"Rotunda/util",
	"dojo/Deferred"],
       function(declare,
                lang,
                domGeom,
		util,
		Deferred) {
/**
 * @class
 */
return declare (null,
{
    constructor: function(config) {
	config = config || {}
        lang.mixin (this, config)
	if ('trackConfig' in config && 'style' in config.trackConfig && 'className' in config.trackConfig.style)
	    this.className = config.trackConfig.style.className
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
    className: null,
    transformStoreFeature: function (storeFeature, seq) {
	return { seq: seq,
		 start: storeFeature.get('start'),
		 end: storeFeature.get('end'),
		 id: storeFeature.id() }
    },

    getFeaturesInView: function (rot, callback, endCallback, errorCallback) {
	var track = this
	var storeName = this.storeName
	var gotAllFeatures = new Deferred()
	if (this.features) {
	    // if a list of features is hardcoded into the Track, don't even bother filtering for the view
	    // this is mostly a debug option so avoids having to write another interval-intersection test
	    if (callback)
		callback (this.features)
	    gotAllFeatures.resolve ({ features: this.features })

	} else if (storeName) {
	    // query the JBrowse Store class(es) for the features in currently visible region
	    
	    var cssColor = this.cssColor()  // get background color for elements in this store, as a sensible color default
	    var features = []
	    var intervals = rot.intervalsInView()
	    var allStores = {}, allFeatures = []
	    var nStoresRemaining = intervals.length
	    intervals.forEach (function (interval) {
		rot.browser.getRefSeqStore (storeName, interval.seq, function (store) {
		    allStores[interval.seq] = store
		    if (!store.empty)
			store.getFeatures ({ ref: interval.seq,
					     start: interval.start,
					     end: interval.end },
					   function (storeFeature) {
					       var feature = track.transformStoreFeature (storeFeature, interval.seq)
					       if (cssColor && !feature.color)
						   feature.color = cssColor
					       features.push (feature)
					   },
					   function() {
					       if (callback)
						   callback (features, interval.seq)
					       allFeatures = allFeatures.concat (features)
					       if (--nStoresRemaining == 0)
						   gotAllFeatures.resolve ({ features: allFeatures,
									     stores: allStores,
									     intervals: intervals })
					   },
					   function() {
					       console.log ("Failed to get data for " + interval.seq + " " + track.id)
					       if (errorCallback)
						   errorCallback (interval.seq)
					       if (--nStoresRemaining == 0)
						   gotAllFeatures.resolve ({ features: allFeatures,
									     stores: allStores,
									     intervals: intervals })
					   })
		})
	    })
	} else {
	    if (errorCallback)
		errorCallback()
	    gotAllFeatures.reject()
	}
	if (endCallback)
	    gotAllFeatures.then(endCallback)
    },

    getStoresInView: function (rot, callback, endCallback, errorCallback) {
	var track = this
	var storeName = this.storeName
	var gotAllStores = new Deferred()
	if (storeName) {
	    var intervals = rot.intervalsInView()
	    var allStores = {}
	    var nStoresRemaining = intervals.length
	    intervals.forEach (function (interval) {
		rot.browser.getRefSeqStore (storeName, interval.seq, function (store) {
		    allStores[interval.seq] = store
		    if (callback)
			callback (store, interval.seq)
		    if (--nStoresRemaining == 0)
			gotAllStores.resolve ({ stores: allStores,
						intervals: intervals })
		})
	    })
	} else {
	    if (errorCallback)
		errorCallback()
	    gotAllStores.reject()
	}
	if (endCallback)
	    gotAllStores.then(endCallback)
    },

    cssColor: function() {
	var color
	if (this.className) {
	    var tempDiv = document.createElement("div")
	    tempDiv.className = this.className
	    document.body.appendChild(tempDiv)

	    color = getComputedStyle(tempDiv).getPropertyValue("background-color")
	    if (/^\s*rgba\s*\(.*,\s*0\s*\)\s*$/.test(color))
		color = undefined

	    tempDiv.parentNode.removeChild(tempDiv)
	}
	return color
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
	track.getFeaturesInView (rot, function (data) {
	    callback (track.d3featData (rot, data))
	}, errorCallback)
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
