function ImageTrack(name, refSeq, tileWidth, zoomLevels) {
    Track.call(this, name);
    this.refSeq = refSeq
    //tileWidth: width, in pixels, of the tiles
    this.tileWidth = tileWidth;
    //zoomLevels: array of {basesPerTile, scale, height, urlPrefix} hashes
    this.zoomLevels = zoomLevels;
    this.tileToImage = {};
    this.zoomCache = {};
}

ImageTrack.prototype = new Track("");

ImageTrack.prototype.setViewInfo = function(numBlocks, trackDiv, labelDiv,
                                            widthPct, widthPx) {
    Track.prototype.setViewInfo.apply(this, [numBlocks, trackDiv, labelDiv, widthPct, widthPx]);
    this.setLabel(this.name);
}

ImageTrack.prototype.getZoom = function(scale) {
    var result = this.zoomCache[scale];
    if (result) return result;

    result = this.zoomLevels[0];
    var desiredBases = this.tileWidth / scale;
    for (i = 1; i < this.zoomLevels.length; i++) {
        if (Math.abs(this.zoomLevels[i].basesPerTile - desiredBases)
            < Math.abs(result.basesPerTile - desiredBases))
            result = this.zoomLevels[i];
    }

    this.zoomCache[scale] = result;
    return result;
}

ImageTrack.prototype.getImages = function(zoom, startBase, endBase) {
    var startTile = ((startBase - this.refSeq.start) / zoom.basesPerTile) | 0;
    var endTile = ((endBase - this.refSeq.start) / zoom.basesPerTile) | 0;
    var result = [];
    var im;
    for (var i = startTile; i <= endTile; i++) {
	im = this.tileToImage[i];
	if (!im) {
	    im = document.createElement("img");
            im.src = zoom.urlPrefix + "tile" + i + ".png";
	    im.startBase = (i * zoom.basesPerTile) + this.refSeq.start;
	    im.baseWidth = zoom.basesPerTile;
	    im.tileNum = i;
	    this.tileToImage[i] = im;
	}
	result.push(im);
    }
    return result;
}

ImageTrack.prototype.fillBlock = function(block, leftBlock, rightBlock, leftBase, rightBase, scale, stripeWidth) {
    var zoom = this.getZoom(scale);
    var blockWidth = rightBase - leftBase;
    var images = this.getImages(zoom, leftBase, rightBase);
    var im;

    for (var i = 0; i < images.length; i++) {
	im = images[i];
	if (!im.parentNode) {
	    im.style.cssText = "position: absolute; left: " + (100 * ((im.startBase - leftBase) / blockWidth)) + "%; width: " + (100 * (im.baseWidth / blockWidth)) + "%; top: 0px; height: " + zoom.height + "px;";
            block.appendChild(im);
	}
    }

    return zoom.height;
}

ImageTrack.prototype.startZoom = function(destScale, destStart, destEnd) {
    this.tileToImage = {};
    this.getImages(this.getZoom(destScale), destStart, destEnd);
}

ImageTrack.prototype.endZoom = function(destScale, destBlockBases) {
    Track.prototype.clear.apply(this);
}

ImageTrack.prototype.clear = function() {
    Track.prototype.clear.apply(this);
    this.tileToImage = {};
}

ImageTrack.prototype.transfer = function(sourceBlock, destBlock) {
    var children = sourceBlock.childNodes;
    var destLeft = destBlock.startBase;
    var destRight = destBlock.endBase;
    var im;
    for (var i = 0; i < children.length; i++) {
	im = children[i];
	if ("startBase" in im) {
	    //if sourceBlock contains an image that overlaps destBlock,
	    if ((im.startBase < destRight)
		&& ((im.startBase + im.baseWidth) > destLeft)) {
		//move image from sourceBlock to destBlock
		im.style.left = (100 * ((im.startBase - destLeft) / (destRight - destLeft))) + "%";
		destBlock.appendChild(im);
	    } else {
		delete this.tileToImage[im.tileNum];
	    }
	}
    }
}
