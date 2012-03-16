// VIEW

/**
 * A track that displays tiled images (PNGs, or other images) along
 * the reference sequence.
 * @class
 * @extends Track
 */
function ImageTrack(config, refSeq, browserParams) {
    Track.call(this, config.label, config.key,
               false, browserParams.changeCallback);

    this.refSeq = refSeq;
    this.trackPadding = browserParams.trackPadding;

    this.config = config;

    this.imagestore = new TiledImageStore.Fixed({
                              refSeq: refSeq,
                              urlTemplate: config.urlTemplate,
                              baseUrl: config.baseUrl,
                              track: this
                          });
    dojo.connect( this.imagestore, 'loadSuccess', this, 'loadSuccess' );
    dojo.connect( this.imagestore, 'loadFail',    this, 'loadFail'    );

    this.imagestore.load();
}

ImageTrack.prototype = new Track("");

ImageTrack.prototype.loadSuccess = function(o,url) {
    this.empty = this.imagestore.empty;
    this.setLoaded();
};

ImageTrack.prototype.setViewInfo = function(heightUpdate, numBlocks,
                                            trackDiv, labelDiv,
                                            widthPct, widthPx, scale) {
    Track.prototype.setViewInfo.apply( this, arguments );
    this.setLabel( this.key );
};

ImageTrack.prototype.handleImageError = function(ev) {
    var img = ev.currentTarget || ev.srcElement;
    img.style.display = "none";
    dojo.stopEvent(ev);
};


/**
 * @private
 */
ImageTrack.prototype._makeImageLoadHandler = function( img, blockIndex, blockWidth ) {
    var that = this;
    return function() {
        img.style.height = img.height + "px";
        img.style.width  = (100 * (img.baseWidth / blockWidth)) + "%";
        that.heightUpdate( img.height, blockIndex );
        return true;
    };
};

ImageTrack.prototype.fillBlock = function(blockIndex, block,
                                          leftBlock, rightBlock,
                                          leftBase, rightBase,
                                          scale, stripeWidth,
                                          containerStart, containerEnd) {
    var blockWidth = rightBase - leftBase;
    var images = this.imagestore.getImages( scale, leftBase, rightBase );
    var im;

    dojo.forEach( images, function(im) {
        im.className = 'image-track';
	if (!(im.parentNode && im.parentNode.parentNode)) {
            im.style.position = "absolute";
            im.style.left = (100 * ((im.startBase - leftBase) / blockWidth)) + "%";
            switch (this.config.align) {
            case "top":
                im.style.top = "0px";
                break;
            case "bottom":
            default:
                im.style.bottom = this.trackPadding + "px";
                break;
            }
            block.appendChild(im);
	}

        // make an onload handler for when the image is fetched that
        // will update the height and width of the track
        var loadhandler = this._makeImageLoadHandler( im, blockIndex, blockWidth );
        if( im.complete )
            // just call the handler ourselves if the image is already loaded
            loadhandler();
        else
            // otherwise schedule it
            dojo.connect( im, "onload", loadhandler );

    }, this);
};

ImageTrack.prototype.startZoom = function(destScale, destStart, destEnd) {
    if (this.empty) return;
    this.imagestore.clearCache();
    this.imagestore.getImages( destScale, destStart, destEnd );
};

ImageTrack.prototype.endZoom = function(destScale, destBlockBases) {
    Track.prototype.clear.apply(this);
};

ImageTrack.prototype.clear = function() {
    Track.prototype.clear.apply(this);
    this.imagestore.clearCache();
};

ImageTrack.prototype.transfer = function(sourceBlock, destBlock, scale,
                                         containerStart, containerEnd) {
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
                // don't move it, and even uncache it
		this.imagestore.unCacheImage( im );
	    }
	}
    }
};

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
