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
