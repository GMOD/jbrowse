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

    /**
     * Get global statistics about the feature store.  Calls its
     * callback with an object containing whatever statistics are
     * available about the features in the store.
     */
    getGlobalStats: function( callback, errorCallback ) {
        callback( this.globalStats || {} );
    },

    /**
     * Get statistics about the features in a certain sequence region,
     * specified by `query`, which is an object having at least `ref
     * (string)`, `start (number)`, and `end (number)` attributes.
     * Calls its callback with an object containing whatever
     * statistics are available about the features in that region.
     */
    getRegionStats: function( query, successCallback, errorCallback ) {
        return this._getRegionStats.apply( this, arguments );
    },

    _getRegionStats: function( query, successCallback, errorCallback ) {
        return this.getGlobalStats( successCallback, errorCallback );
    },

    /**
     * Get the features in a certain sequence region, specified by
     * `query`, which is an object having at least `ref (string)`,
     * `start (number)`, and `end (number)` attributes.  Calls the
     * featureCallback once for each feature, and calls endCallback
     * when all features have been processed.
     */
    getFeatures: function( query, featureCallback, endCallback, errorCallback ) {
        endCallback();
    }

});
});