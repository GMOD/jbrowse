/**
 * @namespace
 */
var TiledImageStore; if( !TiledImageStore ) TiledImageStore = {};

/**
 * Subclass of TiledImageStore.Fixed to provide backward-compatibility
 * with image stores formatted with JBrowse 1.2.1.
 * @class
 * @extends TiledImageStore.Fixed
 */
TiledImageStore.Fixed_v0 = TiledImageStore.Fixed;
TiledImageStore.Fixed_v0.prototype = new TiledImageStore.Fixed('');

TiledImageStore.Fixed_v0.prototype._imageSource = function( zoom, tileIndex ) {
    return Util.resolveUrl( this.url, '../../' + zoom.urlPrefix + tileIndex + ".png" );
};
