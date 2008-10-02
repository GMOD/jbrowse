function ImageTrack(trackMeta, url, refSeq, browserParams) {
    Track.call(this, trackMeta.label, trackMeta.key,
               false, browserParams.changeCallback);
    this.refSeq = refSeq
    this.tileToImage = {};
    this.zoomCache = {};
    this.baseUrl = (browserParams.baseUrl ? browserParams.baseUrl : "");
    var curTrack = this;
    dojo.xhrGet({url: this.baseUrl + url, 
		 handleAs: "json",
		 load: function(o) { curTrack.loadSuccess(o); }
	});
}

ImageTrack.prototype = new Track("");

ImageTrack.prototype.loadSuccess = function(o) {
    //tileWidth: width, in pixels, of the tiles
    this.tileWidth = o.tileWidth;
    //zoomLevels: array of {basesPerTile, scale, height, urlPrefix} hashes
    this.zoomLevels = o.zoomLevels;
    this.setLoaded();
}

ImageTrack.prototype.setViewInfo = function(numBlocks, trackDiv, labelDiv,
                                            widthPct, widthPx) {
    Track.prototype.setViewInfo.apply(this, [numBlocks, trackDiv, labelDiv, widthPct, widthPx]);
    this.setLabel(this.key);
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
    startTile = Math.max(startTile, 0);
    var result = [];
    var im;
    for (var i = startTile; i <= endTile; i++) {
	im = this.tileToImage[i];
	if (!im) {
	    im = document.createElement("img");
            //prepend this.baseUrl if zoom.urlPrefix is relative
            im.src = (zoom.urlPrefix.match(/^(([^/]+:)|\/)/) ? "" : this.baseUrl)
                     + zoom.urlPrefix + i + ".png";
            //TODO: need image coord systems that don't start at 0?
	    im.startBase = (i * zoom.basesPerTile); // + this.refSeq.start;
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
	if (!(im.parentNode && im.parentNode.parentNode)) {
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
    if (!(sourceBlock && destBlock)) return;

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
