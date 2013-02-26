define([
           'dojo/_base/declare',
           'dojo/dom-construct',
           'JBrowse/View/Track/BlockBased',
           'JBrowse/Util'],
       function(
           declare,
           dom,
           BlockBased,
           Util
       ) {
return declare(BlockBased,
 /**
  * @lends JBrowse.View.Track.LocationScale.prototype
  */
{

    /**
     * This track is for (e.g.) position and sequence information that should
     * always stay visible at the top of the view.
     * @constructs
     */

    constructor: function( args ) {//name, labelClass, posHeight) {
        this.loaded = true;
        this.labelClass = args.labelClass;
        this.posHeight = args.posHeight;
        this.height = Math.round( args.posHeight * 1.2 );
    },

    // this track has no track label or track menu, stub them out
    makeTrackLabel: function() {},
    makeTrackMenu: function() {},

    fillBlock: function( args ) {
        var blockIndex = args.blockIndex;
        var block = args.block;
        var leftBase = args.leftBase;

        var posLabel = document.createElement("div");
        var numtext = Util.addCommas( leftBase+1 );
        posLabel.className = this.labelClass;

        // give the position label a negative left offset in ex's to
        // more-or-less center it over the left boundary of the block
        posLabel.style.left = "-" + Number(numtext.length)/1.7 + "ex";

        posLabel.appendChild( document.createTextNode( numtext ) );
        block.appendChild(posLabel);

        var highlight = this.browser.getHighlight();
        if( highlight && highlight.ref == this.refSeq.name )
            this.renderRegionHighlight( args, highlight );

        this.heightUpdate( Math.round( this.posHeight*1.2 ), blockIndex);
        args.finishCallback();
    }

});
});