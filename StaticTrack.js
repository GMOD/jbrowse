//This track is for (e.g.) position and sequence information that should
//always stay visible at the top of the view

function StaticTrack(name) {
    Track.call(this, name);
}

StaticTrack.prototype = new Track("");

StaticTrack.prototype.fillBlock = function(block, leftBlock, rightBlock,
						  leftBase, rightBase, scale,
						  padding, stripeWidth) {
    var posLabel = document.createElement("div");
    posLabel.className = "pos-label";
    posLabel.appendChild(document.createTextNode(Util.addCommas(leftBase)));
    posLabel.style.top = "0px";// y + "px";
    block.appendChild(posLabel);
}