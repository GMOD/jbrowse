define([
           'JBrowse/Store/TiledImage/Fixed',
           'JBrowse/Util'
       ],
      function( Fixed, Util ) {

/**
 * Subclass of TiledImageStore.Fixed to provide backward-compatibility
 * with image stores formatted with JBrowse 1.2.1.
 * @lends JBrowse.Store.TiledImage.Fixed_v0
 * @class
 * @extends JBrowse.Store.TiledImage.Fixed
 */
var Fixed_v0 = function( args ) {
    Fixed.call( this, args );
};
Fixed_v0.prototype = new Fixed('');

Fixed_v0.prototype._imageSource = function( zoom, tileIndex ) {
    return Util.resolveUrl( this.url, '../../' + zoom.urlPrefix + tileIndex + ".png" );
};

return Fixed_v0;

});
