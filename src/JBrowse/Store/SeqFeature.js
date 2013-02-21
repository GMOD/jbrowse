define( [
            'dojo/_base/declare',
            'JBrowse/Store',
            'JBrowse/Store/LRUCache'
        ],
        function( declare, Store, LRUCache ) {

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
        var thisB = this;
        var cache = thisB._regionStatsCache = thisB._regionStatsCache || new LRUCache({
            name: 'regionStatsCache',
            maxSize: 1000, // cache stats for up to 1000 different regions
            sizeFunction: function( stats ) { return 1; },
            fillCallback: function( query, callback ) {
                //console.log( '_getRegionStats', query );
                var s = {
                    scoreMax: -Infinity,
                    scoreMin: Infinity,
                    scoreSum: 0,
                    scoreSumSquares: 0,
                    basesCovered: query.end - query.start,
                    featureCount: 0
                };
                thisB.getFeatures( query,
                                  function( feature ) {
                                      var score = feature.get('score') || 0;
                                      s.scoreMax = Math.max( score, s.scoreMax );
                                      s.scoreMin = Math.min( score, s.scoreMin );
                                      s.scoreSum += score;
                                      s.scoreSumSquares += score*score;
                                      s.featureCount++;
                                  },
                                  function() {
                                      s.scoreMean = s.scoreSum / s.basesCovered;
                                      s.scoreStdDev = thisB._calcStdFromSums( s.scoreSum, s.scoreSumSquares, s.basesCovered );
                                      s.featureDensity = s.featureCount / s.basesCovered;
                                      //console.log( '_getRegionStats done', s );
                                      callback( s );
                                  },
                                  function(error) {
                                      callback( null, error );
                                  }
                                );
            }
         });

         cache.get( query,
                    function( stats, error ) {
                        if( error )
                            errorCallback( error );
                        else
                            successCallback( stats );
                    });

    },

    // utility method that calculates standard deviation from sum and sum of squares
    _calcStdFromSums: function( sum, sumSquares, n ) {
        var variance = sumSquares - sum*sum/n;
        if (n > 1) {
	    variance /= n-1;
        }
        return variance < 0 ? 0 : Math.sqrt(variance);
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