define([
           'dojo/_base/declare',
           'dojo/dom-construct',
           'JBrowse/View/Track/BlockBased'
       ],
       function( declare, dom, BlockBased ) {
return dojo.declare( BlockBased,
 /**
  * @lends JBrowse.View.Track.GridLines.prototype
  */
{

    /**
     * This track draws vertical gridlines, which are divs with height
     * 100%, absolutely positioned at the very top of all the tracks.
     * @constructs
     * @extends JBrowse.View.Track.BlockBased
     */
    constructor: function( args ) {
        this.loaded = true;
        this.name = 'gridlines';
    },

    // this track has no track label or track menu, stub them out
    makeTrackLabel: function() {},
    makeTrackMenu: function() {},

    fillBlock: function( args ) {
        this.renderGridlines( args.block, args.leftBase, args.rightBase );

        var highlight = this.browser.getHighlight();
        if( highlight && highlight.ref == this.refSeq.name )
            this.renderHighlight( args, highlight );

        args.finishCallback();
        this.heightUpdate(100, args.blockIndex);
    },

    renderGridlines: function(block,leftBase,rightBase) {

        var base_span = rightBase-leftBase;
        var minor_count =
            !( base_span % 20 ) ? 20 :
            !( base_span % 10 ) ? 10 :
            !( base_span % 5  ) ? 5  :
            !( base_span % 2  ) ? 2  :
                                  0;
        var major_count = base_span == 20 ? 2 : base_span > 0 ? 1 : 0;

        var new_gridline = function( glclass, position ) {
            var gridline = document.createElement("div");
            gridline.style.cssText = "left: " + position + "%; width: 0px";
            gridline.className = "gridline "+glclass;
            return gridline;
        };

        for( var i=0; i<minor_count; i++ ) {
            var pos = 100/minor_count*i;
            var cls = pos == 0 || (minor_count == 20 && i == 10)
                ? "gridline_major"
                : "gridline_minor";

            block.appendChild( new_gridline( cls, pos) );
        }

    },

    renderHighlight: function( args, highlight ) {
        // do nothing if the highlight does not overlap this region
        if( highlight.start > args.rightBase || highlight.end < args.leftBase )
            return;

        var block_span = args.rightBase - args.leftBase;

        var left = highlight.start;
        var right = highlight.end;

        // trim left and right to avoid making a huge element that can cause problems
        var trimLeft = args.leftBase - left;
        if( trimLeft > 0 ) {
            left += trimLeft;
        }
        var trimRight = right - args.rightBase;
        if( trimRight > 0 ) {
            right -= trimRight;
        }

        function toPct ( coord ) {
            return (coord - args.leftBase) / block_span * 100;
        }

        left = toPct( left );
        var width = toPct(right)-left;
        var el = dom.create('div', {
                                className: 'global_highlight'
                                    + (trimLeft <= 0 ? ' left' : '')
                                    + (trimRight <= 0 ? ' right' : '' ),
                                style: {
                                    left: left+'%',
                                    width: width+'%',
                                    height: '100%'
                                }
                            }, args.block );
    }
});
});
