//This track is for (e.g.) position and sequence information that should
//always stay visible at the top of the view

function StaticTrack(name, numBlocks, trackDiv,
			    widthPct, widthPx) {
    Track.call(this, name, numBlocks, trackDiv, undefined, widthPct, widthPx);
}

StaticTrack.prototype = new Track("", 0, undefined, 0, 0);

StaticTrack.prototype.fillBlock = function(block, leftBlock, rightBlock,
						  leftBase, rightBase, scale,
						  padding, stripeWidth) {
    var posLabel = document.createElement("div");
    posLabel.className = "pos-label";
    posLabel.appendChild(document.createTextNode(Util.addCommas(leftBase)));
    posLabel.style.top = "0px";// y + "px";
    block.appendChild(posLabel);
}