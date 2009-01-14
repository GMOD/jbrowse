//This track is for (e.g.) position and sequence information that should
//always stay visible at the top of the view

function StaticTrack(name, labelClass, posHeight) {
    Track.call(this, name, name, true, function() {});
    this.labelClass = labelClass;
    this.posHeight = posHeight;
}

StaticTrack.prototype = new Track("");

StaticTrack.prototype.fillBlock = function(block, leftBlock, rightBlock,
						  leftBase, rightBase, scale,
						  padding, stripeWidth) {
    var posLabel = document.createElement("div");
    posLabel.className = this.labelClass;
    posLabel.appendChild(document.createTextNode(Util.addCommas(leftBase)));
    posLabel.style.top = "0px";// y + "px";
    block.appendChild(posLabel);
    return this.posHeight;
}

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
