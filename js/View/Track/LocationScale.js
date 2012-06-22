dojo.declare('JBrowse.View.Track.LocationScale', JBrowse.View.Track.BlockBased,
 /**
  * @lends JBrowse.View.Track.LocationScale.prototype
  */
{

    /**
     * This track is for (e.g.) position and sequence information that should
     * always stay visible at the top of the view.
     * @constructs
     */

    constructor: function(name, labelClass, posHeight) {
        JBrowse.View.Track.BlockBased.call(this, name, name, true, function() {});
        this.labelClass = labelClass;
        this.posHeight = posHeight;
        this.height = posHeight;
    },

    fillBlock: function(blockIndex, block,
                        leftBlock, rightBlock,
			leftBase, rightBase, scale,
			padding, stripeWidth) {
        var posLabel = document.createElement("div");
        var numtext = Util.addCommas( leftBase+1 );
        posLabel.className = this.labelClass;

        // give the position label a negative left offset in ex's to
        // more-or-less center it over the left boundary of the block
        posLabel.style.left = "-" + Number(numtext.length)/1.7 + "ex";

        posLabel.appendChild( document.createTextNode( numtext ) );
        block.appendChild(posLabel);
        this.heightUpdate(this.posHeight, blockIndex);
    }
});
