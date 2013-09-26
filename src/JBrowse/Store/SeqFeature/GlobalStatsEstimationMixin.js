/**
 * Mixin that adds _estimateGlobalStats method to a store, which
 * samples a section of the features in the store and uses those to
 * esimate the statistics of the whole data set.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/Deferred'
       ],
       function( declare, array, Deferred ) {

return declare( null, {

    /**
     * Fetch a region of the given reference sequence name and use it
     * to estimate the feature density of the store.  Returns a
     * Deferred for the stats.
     * @private
     */
    _estimateGlobalStats: function( refseq ) {
        return this._globalStatsEstimate || ( this._globalStatsEstimate = function() {
            var thisB = this;
            if( ! refseq )
                throw new Error('sample refseq parameter required');

            function statsFromInterval( length ) {
                var sampleCenter = refseq.start*0.75 + refseq.end*0.25;
                var start = Math.max( 0, Math.round( sampleCenter - length/2 ) );
                var end = Math.min( Math.round( sampleCenter + length/2 ), refseq.end );
                var features = [];
                return thisB.getFeatures( { ref: refseq.name, start: start, end: end} )
                    .forEach( function( f ) {
                                  if( f.get('start') >= start && f.get('end') <= end )
                                      features.push(f);
                              },
                              function() {
                                  return {
                                      featureDensity: features.length / length,
                                      _statsSampleFeatures: features.length,
                                      _statsSampleInterval: { ref: refseq.name, start: start, end: end, length: length }
                                  };
                              });
            };

            function maybeRecordStats( stats ) {
                var refLen = refseq.end - refseq.start;
                var interval = stats._statsSampleInterval.length;
                if( stats._statsSampleFeatures >= 300 || interval * 2 > refLen ) {
                    console.log( 'Store statistics: '+(thisB.source||thisB.name), stats );
                    return stats;
                } else {
                    return statsFromInterval( interval * 2 ).then( maybeRecordStats );
                }
            };

            return this._globalStatsEstimate = statsFromInterval( 100  ).then( maybeRecordStats );
        }.call(this));
    }
});
});