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

    svgParent: null,     // pointer to the parent object

    constructor: function( args ) {
        console.log("SVGLayerBase::constructor");
        this.svgParent = args;
    },

    setViewInfo: function( genomeView, heightUpdate, numBlocks, trackDiv, widthPct, widthPx, scale ) {
        console.log("SVGLayerBase::setViewInfo");

    },
    showRange: function(first, last, startBase, bpPerBlock, scale, containerStart, containerEnd) {
        console.log("SVGLayerBase::showRange");
    },
    addSVGObject: function(id,bpCoord,width,height,callback) {
        console.log("SVGLayerBase::addSVGObject");
    },
    bp2Native: function(val) {
        return (val - this.svgParent.displayContext.startBase) * this.svgParent.displayContext.scale;
    },
    
});
});
