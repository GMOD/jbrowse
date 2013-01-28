define( [
            'dojo/_base/declare',
            'JBrowse/Store'
        ],
        function( declare, Store ) {

/**
 * Base class for JBrowse data backends that hold sequences and
 * features.  Some aspects reminiscent of Lincoln Stein's
 * Bio::DB::SeqFeature::Store.
  *
 * @class JBrowse.SeqFeatureStore
 * @extends JBrowse.Store
 * @constructor
 */

return declare( Store,
{

    constructor: function( args ) {
        this.globalStats = {};
        this.config = args || {};
    },

    getGlobalStats: function( callback, errorCallback ) {
        callback( this.globalStats || {} );
    },

    getRegionStats: function( query, successCallback, errorCallback ) {
        return this._getRegionStats.apply( this, arguments );
    },

    _getRegionStats: function( query, successCallback, errorCallback ) {
        return this.getGlobalStats( successCallback, errorCallback );
    },

    getFeatures: function( query, featureCallback, endCallback, errorCallback ) {
        endCallback();
    }

});
});