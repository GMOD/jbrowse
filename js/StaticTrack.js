// VIEW

/**

This track is for (e.g.) position and sequence information that should
always stay visible at the top of the view.

@class
*/

function StaticTrack(name, labelClass, posHeight) {
    Track.call(this, name, name, true, function() {});
    this.labelClass = labelClass;
    this.posHeight = posHeight;
    this.height = posHeight;
}

StaticTrack.prototype = new Track("");

StaticTrack.prototype.fillBlock = function(blockIndex, block,
                                           leftBlock, rightBlock,
					   leftBase, rightBase, scale,
					   padding, stripeWidth) {
    var posLabel = document.createElement("div");
    var numtext = Util.addCommas( leftBase+1 );
    posLabel.className = this.labelClass;
    posLabel.style.left = "-" + Number(numtext.length)/1.7 + "ex";
    posLabel.appendChild( document.createTextNode( numtext ) );
    block.appendChild(posLabel);
    this.heightUpdate(this.posHeight, blockIndex);
};
