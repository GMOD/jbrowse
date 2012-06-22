dojo.declare('JBrowse.View.Track.GridLines', JBrowse.View.Track.BlockBased,
 /**
  * @lends JBrowse.View.Track.GridLines.prototype
  */
{

    /**
     * This track draws vertical gridlines, which are divs with height
     * 100%, absolutely positioned at the very top of all the tracks.
     * @constructs
     */
    constructor: function(name) {
        JBrowse.View.Track.BlockBased.call(this, name, name, true, function() {});
    },

    fillBlock: function(blockIndex, block,
                        leftBlock, rightBlock,
                        leftBase, rightBase, scale,
                        padding, stripeWidth) {

        this.renderGridlines( block, leftBase, rightBase );
        this.heightUpdate(100, blockIndex);
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

    }
});

