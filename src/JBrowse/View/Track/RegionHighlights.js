define([
           'dojo/_base/declare',
           'dojo/dom-construct',
           'JBrowse/View/Track/BlockBased'
       ],
       function( declare, dom, BlockBased ) {
return dojo.declare( BlockBased,
{
    constructor: function( args ) {
        this.name = 'highlights';
    },

    // this track has no track label or track menu, stub them out
    makeTrackLabel: function() {},
    makeTrackMenu: function() {},

    fillBlock: function( args ) {
        //console.log('fill highlights', args );
        var highlight = this.browser.getHighlight();
        if( highlight && highlight.ref == this.refSeq.name )
            this.renderRegionHighlight( args, highlight );

        args.finishCallback();
        this.heightUpdate(100, args.blockIndex);
    }
});
});
