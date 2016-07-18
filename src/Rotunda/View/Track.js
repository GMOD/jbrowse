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

    isLinkTrack: false,
    isInternal: function() {
        return 'radius' in this && this.radius == 0 && this.isLinkTrack
    },

    trackListID: function (rot) {
        return rot.id + '-track-label-' + this.id
    },
    
    d3data: function (rot, data) {
        this.g = rot.g
	    .append('g')
	    .attr('id','#g_'+this.id)
        return this.g
	    .selectAll('#track_'+this.id)
            .data(data || this.features)
            .enter()
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
