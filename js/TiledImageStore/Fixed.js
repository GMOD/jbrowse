/**
 * @namespace
 */
var TiledImageStore; if( !TiledImageStore ) TiledImageStore = {};

/**
 * Implements a store for image tiles that are only available at a
 * fixed set of sizes and zoom levels.  Most often used with
 * pre-generated image tiles served statically.
 * @class
 * @extends Store
 */

TiledImageStore.Fixed = function(args) {
    Store.call( this, args );
    if( !args )
        return;

    this.tileToImage = {};
    this.zoomCache = {};

    this.refSeq = args.refSeq;

    this.url = Util.resolveUrl(
                   args.baseUrl,
                   Util.fillTemplate( args.urlTemplate,
                                      {'refseq': this.refSeq.name } )
               );
};

TiledImageStore.Fixed.prototype = new Store('');

TiledImageStore.Fixed.prototype.loadSuccess = function(o) {
    this.metadata = o.metadata;

    //tileWidth: width, in pixels, of the tiles
    this.tileWidth = o.tileWidth;
    this.align = o.align;
    //zoomLevels: array of {basesPerTile, urlPrefix} hashes
    this.zoomLevels = o.zoomLevels;
    this.setLoaded();
};

/**
 * @private
 */
TiledImageStore.Fixed.prototype._getZoom = function(scale) {
    var result = this.zoomCache[scale];
    if (result) return result;

    result = this.zoomLevels[0];
    var desiredBases = this.tileWidth / scale;
    for (var i = 1; i < this.zoomLevels.length; i++) {
        if (Math.abs(this.zoomLevels[i].basesPerTile - desiredBases)
            < Math.abs(result.basesPerTile - desiredBases))
            result = this.zoomLevels[i];
    }

    this.zoomCache[scale] = result;
    return result;
};

/**
 * Fetch an array of <code>&lt;img&gt;</code> elements for the image
 * tiles that should be displayed for a certain magnification scale
 * and section of the reference.
 * @param {Number} scale     the current ratio of pixels per base in the view
 * @param {Number} startBase the start of the region (in interbase coordinates)
 * @param {Number} endBase   the end of the region   (in interbase coordinates)
 */
TiledImageStore.Fixed.prototype.getImages = function( scale, startBase, endBase ) {

    var zoom = this._getZoom( scale );

    var startTile = Math.max( startBase / zoom.basesPerTile, 0 ) | 0;
    var endTile   =           endBase   / zoom.basesPerTile      | 0;

    var result = [];
    var im;
    for (var i = startTile; i <= endTile; i++) {
	im = this.tileToImage[i];
	if (!im) {
	    im = document.createElement("img");
            dojo.connect(im, "onerror", this.handleImageError );
            im.src = this._imageSource( zoom, i );
            //TODO: need image coord systems that don't start at 0?
	    im.startBase = (i * zoom.basesPerTile); // + this.refSeq.start;
	    im.baseWidth = zoom.basesPerTile;
	    im.tileNum = i;
	    this.tileToImage[i] = im;
	}
	result.push(im);
    }
    return result;
};

/**
 * Gives the image source for a given zoom (as returned by _getZoom())
 * and tileIndex.
 * @private
 */
TiledImageStore.Fixed.prototype._imageSource = function( zoom, tileIndex ) {
    return Util.resolveUrl(this.url, zoom.urlPrefix + tileIndex + ".png");
};

/**
 * Clear the store's cache of image elements.
 */
TiledImageStore.Fixed.prototype.clearCache = function() {
    this.tileToImage = {};
};

/**
 * Remove the given image element from the cache.
 */
TiledImageStore.Fixed.prototype.unCacheImage = function( /**HTMLImageElement*/ im) {
    delete this.tileToImage[ im.tileNum ];
};
