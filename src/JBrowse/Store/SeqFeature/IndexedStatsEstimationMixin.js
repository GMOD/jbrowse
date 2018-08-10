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
        var featCount;
        if(this.indexedData) {
            featCount = this.indexedData.featureCount(refseq.name);
        } else if(this.bam) {
            var chr = refseq.name;
            chr = this.browser.regularizeReferenceName( chr );
            var chrId = this.bam.chrToIndex && this.bam.chrToIndex[chr];
            featCount = this.bam.index.featureCount(chrId, true);
        }
        var density = featCount / (refseq.end - refseq.start);
        deferred.resolve({ featureDensity: density });
        return deferred;
    }

});
});
