define( [
            'dojo/_base/declare',
            'JBrowse/Store',
            'JBrowse/Store/LRUCache'
        ],
        function( declare, Store, LRUCache ) {

/**
 * Base class for JBrowse data backends that hold sequences and
 * features.
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
     * Fetch global statistics the features in this store.
     *
     * @param {Function} successCallback(stats) callback to receive the
     *   statistics.  called with one argument, an object containing
     *   attributes with various statistics.
     * @param {Function} errorCallback(error) in the event of an error, this
     *   callback will be called with one argument, which is anything
     *   that can stringify to an error message.
     */
    getGlobalStats: function( callback, errorCallback ) {
        callback( this.globalStats || {} );
    },

    /**
     * Fetch statistics about the features in a specific region.
     *
     * @param {String} query.ref    the name of the reference sequence
     * @param {Number} query.start  start of the region in interbase coordinates
     * @param {Number} query.end    end of the region in interbase coordinates
     * @param {Function} successCallback(stats) callback to receive the
     *   statistics.  called with one argument, an object containing
     *   attributes with various statistics.
     * @param {Function} errorCallback(error) in the event of an error, this
     *   callback will be called with one argument, which is anything
     *   that can stringify to an error message.
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
                                      s.scoreMean = s.scoreSum / s.featureCount;
                                      s.scoreStdDev = thisB._calcStdFromSums( s.scoreSum, s.scoreSumSquares, s.featureCount );
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
     * Fetch feature data from this store.
     *
     * @param {String} query.ref    the name of the reference sequence
     * @param {Number} query.start  start of the region in interbase coordinates
     * @param {Number} query.end    end of the region in interbase coordinates
     * @param {Function} featureCallback(feature) callback that is called once
     *   for each feature in the region of interest, with a single
     *   argument; the feature.
     * @param {Function} endCallback() callback that is called once
     *   for each feature in the region of interest, with a single
     *   argument; the feature.
     * @param {Function} errorCallback(error) in the event of an error, this
     *   callback will be called with one argument, which is anything
     *   that can stringify to an error message.
     */
    getFeatures: function( query, featureCallback, endCallback, errorCallback ) {
        endCallback();
    }

});
});