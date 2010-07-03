//This track is for (e.g.) position and sequence information that should
//always stay visible at the top of the view

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
    posLabel.className = this.labelClass;
    posLabel.appendChild(document.createTextNode(Util.addCommas(leftBase)));
    posLabel.style.top = "0px";// y + "px";
    block.appendChild(posLabel);
    this.heightUpdate(this.posHeight, blockIndex);
};

//This track is for drawing the vertical gridlines

function GridTrack(name) {
    Track.call(this, name, name, true, function() {});
}

GridTrack.prototype = new Track("");

GridTrack.prototype.fillBlock = function(blockIndex, block,
                                         leftBlock, rightBlock,
                                         leftBase, rightBase, scale,
                                         padding, stripeWidth) {
    var gridline = document.createElement("div");
    gridline.className = "gridline";
    gridline.style.cssText = "left: 0%; width: 0px;";
    block.appendChild(gridline);
    this.heightUpdate(100, blockIndex);
};

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
