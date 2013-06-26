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
     * Fetch a region of the current reference sequence and use it to
     * estimate the feature density of the store.
     * @private
     */
    _estimateGlobalStats: function( refseq ) {
        var deferred = new Deferred();

        refseq = refseq || this.refSeq;

        var statsFromInterval = function( length, callback ) {
            var thisB = this;
            var sampleCenter = refseq.start*0.75 + refseq.end*0.25;
            var start = Math.max( 0, Math.round( sampleCenter - length/2 ) );
            var end = Math.min( Math.round( sampleCenter + length/2 ), refseq.end );
            var features = [];
            this._getFeatures({ ref: refseq.name, start: start, end: end},
                              function( f ) { features.push(f); },
                              function( error ) {
                                  features = array.filter( features, function(f) { return f.get('start') >= start && f.get('end') <= end; } );
                                  callback.call( thisB, length,
                                                 {
                                                     featureDensity: features.length / length,
                                                     _statsSampleFeatures: features.length,
                                                     _statsSampleInterval: { ref: refseq.name, start: start, end: end, length: length }
                                                 });
                              },
                              function( error ) {
                                      console.error( error );
                                      callback.call( thisB, length,  null, error );
                              });
        };

        var maybeRecordStats = function( interval, stats, error ) {
            if( error ) {
                deferred.reject( error );
            } else {
                var refLen = refseq.end - refseq.start;
                 if( stats._statsSampleFeatures >= 300 || interval * 2 > refLen || error ) {
                     console.log( 'Store statistics: '+(this.source||this.name), stats );
                     deferred.resolve( stats );
                 } else {
                     statsFromInterval.call( this, interval * 2, maybeRecordStats );
                 }
            }
        };

        statsFromInterval.call( this, 100, maybeRecordStats );
        return deferred;
    }

});
});