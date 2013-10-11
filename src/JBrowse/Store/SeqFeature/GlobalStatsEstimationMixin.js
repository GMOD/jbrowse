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
    _estimateGlobalStats: function( refname ) {
        return this._globalStatsEstimate || ( this._globalStatsEstimate = function() {
            var thisB = this;
            if( ! refname )
                throw new Error('refname parameter required');

           // use this store's own getReferenceFeatures if we can.  otherwise, use the reference store from the browser.
            return ( thisB.getReferenceFeatures ? thisB.getReferenceFeatures( { name: refname, limit: 1 } ).first()
                                                : thisB.browser.getReferenceFeature( refname )
                   )
                   .then( function( refseq ) {

                        function estimateStatsFromInterval( length ) {
                            var sampleCenter = refseq.get('start')*0.75 + refseq.get('end')*0.25;
                            var start = Math.max( 0, Math.round( sampleCenter - length/2 ) );
                            var end = Math.min( Math.round( sampleCenter + length/2 ), refseq.get('end') );
                            var features = [];
                            return thisB.getFeatures( { ref: refseq.get('name'), start: start, end: end} )
                                .forEach( function( f ) {
                                              if( f.get('start') >= start && f.get('end') <= end )
                                                  features.push(f);
                                          },
                                          function() {
                                              return {
                                                  featureDensity: features.length / length,
                                                  sample: {
                                                      featureCount: features.length,
                                                      ref: refseq.get('name'),
                                                      start: start,
                                                      end: end,
                                                      length: length
                                                  }
                                              };
                                          });
                        };

                        function maybeRecordStats( stats ) {
                            var refLen = refseq.get('end') - refseq.get('start');
                            var interval = stats.sample.length;
                            if( stats.sample.featureCount >= 300 || interval * 2 > refLen ) {
                                console.log( 'Store statistics: '+(thisB.source||thisB.name), stats );
                                return stats;
                            } else {
                                return estimateStatsFromInterval( interval * 2 ).then( maybeRecordStats );
                            }
                        };

                        return estimateStatsFromInterval( 100 ).then( maybeRecordStats );
                   });
        }.call(this));
    }
});
});