/* 
 * SVG Layer - base class
 */

define( [
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/_base/event'
],
function(
    declare,
    array,
    lang,
    domEvent
) {

return declare( null, {

    svgParent: null,    // pointer to the parent object
    maxHeight: 600,
    defaultHeight: 150,

    constructor: function( args ) {
        //console.log("SVGLayerBase::constructor");
        this.svgParent = args;
    },

    _defaultConfig: function() {
        return Util.deepUpdate( lang.clone(this.inherited(arguments)), {
            maxHeight: 600,
            defaultHeight: 150
        });
    },

    setViewInfo: function( genomeView, heightUpdate, numBlocks, trackDiv, widthPct, widthPx, scale ) {
        //console.log("SVGLayerBase::setViewInfo");

    },
    showRange: function(first, last, startBase, bpPerBlock, scale, containerStart, containerEnd) {
        //console.log("SVGLayerBase::showRange");
    },
    addSVGObject: function(id,bpCoord,width,height,callback) {
        //console.log("SVGLayerBase::addSVGObject");
    },
    //convert bp to native unit
    bp2Native: function(bp) {
        return bp;
    },
    // get current height of SVG Canvas in native units
    getHeight: function() {
        return this.defaultHeight;
    },
    // compute height, presumably based on heights of objects in svg canvas
    computeHeight: function() {
        return this.defaultHeight;
    },
    // get max height of SVG Canvas in native units
    getMaxHeight: function() {
        return this.maxHeight;
    }
    
});
});
