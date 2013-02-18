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
        var thisB = this;
        var s = {
            scoreMax: -Infinity,
            scoreMin: Infinity,
            scoreSum: 0,
            scoreSumSquares: 0,
            basesCovered: query.end - query.start
        };
        this.getFeatures( query,
                          function( feature ) {
                              var score = feature.get('score') || 0;
                              s.scoreMax = Math.max( score, s.scoreMax );
                              s.scoreMin = Math.min( score, s.scoreMin );
                              s.scoreSum += score;
                              s.scoreSumSquares += score*score;
                          },
                          function() {
                              s.scoreMean = s.scoreSum / s.basesCovered;
                              s.scoreStdDev = thisB._calcStdFromSums( s.scoreSum, s.scoreSumSquares, s.basesCovered );
                              //console.log( 'BigWig getRegionStats', query, s );
                              successCallback(s);
                          },
                          errorCallback
                        );
    },

    // utility method that calculates standard deviation from sum and sum of squares
    _calcStdFromSums: function( sum, sumSquares, n ) {
        var variance = sumSquares - sum*sum/n;
        if (n > 1) {
	    variance /= n-1;
        }
        return variance < 0 ? 0 : Math.sqrt(variance);
    },

    getFeatures: function( query, featureCallback, endCallback, errorCallback ) {
        endCallback();
    }

});
});