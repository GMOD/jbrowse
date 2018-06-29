/**
 * Mixin that adds _estimateGlobalStats method to a store, which
 * samples a section of the features in the store and uses those to
 * esimate the statistics of the whole data set.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/Deferred',
           'JBrowse/Errors'
       ],
       function( declare, array, Deferred, Errors ) {

return declare( null, {

    /**
     * Fetch a region of the current reference sequence and use it to
     * estimate the feature density of the store.
     * @private
     */
    _estimateGlobalStats: function( refseq ) {
        var deferred = new Deferred();

        refseq = refseq || this.refSeq;
        var timeout = this.storeTimeout || 3000;

        var startTime = new Date();

        var statsFromInterval = function( length, callback ) {
            var thisB = this;
            console.log('here');
            var sampleCenter = refseq.start*0.75 + refseq.end*0.25;
            var start = Math.max( 0, Math.round( sampleCenter - length/2 ) );
            var end = Math.min( Math.round( sampleCenter + length/2 ), refseq.end );
            this.indexedData.fetchSize(refseq.name, start, end,
                              function( f ) { callback.call(thisB, length, { featureDensity: f / 300/length }) },
                              function( error ) {
                                  console.error(error);
                              })
        }

        var maybeRecordStats = function( interval, stats, error ) {
            if( error ) {
                if( error.isInstanceOf(Errors.DataOverflow) ) {
                     console.log( 'Store statistics found chunkSizeLimit error, using empty: '+(this.source||this.name) );
                     deferred.resolve( { featureDensity: 0, error: 'global stats estimation found chunkSizeError' } );
                }
                else {
                    deferred.reject( error );
                }
            } else {
                 var refLen = refseq.end - refseq.start;
                 if( stats._statsSampleFeatures >= 300 || interval * 2 > refLen || error ) {
                     console.log( 'Store statistics: '+(this.source||this.name), stats );
                     deferred.resolve( stats );
                 } else if( ((new Date()) - startTime) < timeout ) {
                     statsFromInterval.call( this, interval * 2, maybeRecordStats );
                 } else {
                     console.log( 'Store statistics timed out: '+(this.source||this.name) );
                     deferred.resolve( { featureDensity: 0, error: 'global stats estimation timed out' } );
                 }
            }
        };

        statsFromInterval.call( this, 100, maybeRecordStats );
        return deferred;
    }

});
});
