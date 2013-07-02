define(
    [
        'dojo/_base/declare',
        'dojo/_base/Deferred',
        'dojo/request/xhr',
        'JBrowse/Store',
        'JBrowse/Store/DeferredStatsMixin',
        'JBrowse/Util'
    ],
    function(
        declare,
        Deferred,
        xhr,
        Store,
        DeferredStatsMixin,
        Util ) {

return declare( [ Store, DeferredStatsMixin ],

/**
 * Implements a store for image tiles that are only available at a
 * fixed set of sizes and zoom levels.  Most often used with
 * pre-generated image tiles served statically.
 * @lends JBrowse.Store.TiledImage.Fixed
 * @class
 * @extends Store
 */
{
    constructor: function(args) {
        this.tileToImage = {};

        this.baseUrl = args.baseUrl;

        this.urlTemplate = args.urlTemplate;

        this._loaded = {};
    },

    _getRefData: function( refname ) {
        return this._loaded[refname] || function() {
            var thisB = this;
            return this._loaded[refname] =
                xhr.get( this.resolveUrl( this.urlTemplate, { refseq: refname } ),
                         {
                             handleAs: "json"
                         }
                       )
                .then(
                    function( o ) {
                        var stats = o.stats = o.stats || {};
                        o.zoomCache = o.zoomCache || {};
                        //backcompat
                        if( ! ('scoreMin' in stats ) )
                            stats.scoreMin = stats.global_min;
                        if( ! ('scoreMax' in stats ) )
                            stats.scoreMax = stats.global_max;
                        return o;
                    });
        }.call(this);
    },

    /**
     * @private
     */
    _getZoom: function( refdata, scale) {
        var result = refdata.zoomCache[scale];
        if (result) return result;


        result = refdata.zoomLevels[0];
        var desiredBases = refdata.tileWidth / scale;
        for (var i = 1; i < refdata.zoomLevels.length; i++) {
            if (Math.abs(refdata.zoomLevels[i].basesPerTile - desiredBases)
                < Math.abs(result.basesPerTile - desiredBases))
                result = refdata.zoomLevels[i];
        }

        refdata.zoomCache[scale] = result;
        return result;
    },

    /**
     * Fetch an array of <code>&lt;img&gt;</code> elements for the image
     * tiles that should be displayed for a certain magnification scale
     * and section of the reference.
     */
    getImages: function( query, callback, errorCallback ) {
        var thisB = this;
        this._getRefData( query.ref )
            .then( function( refdata ) {
                       var scale     = query.scale || 1;
                       var startBase = query.start;
                       var endBase   = query.end;

                       var zoom = thisB._getZoom( refdata, scale );

                       var startTile = Math.max( startBase / zoom.basesPerTile, 0 ) | 0;
                       var endTile   =           endBase   / zoom.basesPerTile      | 0;

                       var result = [];
                       var im;
                       for (var i = startTile; i <= endTile; i++) {
                           im = document.createElement("img");
                           dojo.connect(im, "onerror", thisB.handleImageError );
                           im.src = thisB._imageSource( query.ref, zoom, i );
                           //TODO: need image coord systems that don't start at 0?
                           im.startBase = (i * zoom.basesPerTile); // + this.refSeq.start;
                           im.baseWidth = zoom.basesPerTile;
                           im.tileNum = i;

                           result.push(im);
                       }
                       callback( result );
                   },
                   function( error ) {
                       if( error.response.status == 404 ) {
                           callback([]);
                       }
                       else {
                           errorCallback( error );
                       }
                   }
                 );
    },

    /**
     * Gives the image source for a given zoom (as returned by _getZoom())
     * and tileIndex.
     * @private
     */
    _imageSource: function( refname, zoom, tileIndex ) {
        return Util.resolveUrl( this.resolveUrl(this.urlTemplate, {refseq: refname}), zoom.urlPrefix + tileIndex + ".png");
    }

});
});
