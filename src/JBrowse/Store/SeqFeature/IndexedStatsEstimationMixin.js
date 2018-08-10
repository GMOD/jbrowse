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
        console.log(this);
        var featCount;
        if(this.indexedData) {
            featCount = this.indexedData.featureCount(refseq.name);
        } else if(this.bam) {
            var chr = refseq.name;
            chr = this.browser.regularizeReferenceName( chr );
            console.log(chr);
            var chrId = this.bam.chrToIndex && this.bam.chrToIndex[chr];
            console.log(chrId);
            featCount = this.bam.index.featureCount(chrId);
        }
        var density = featCount / (refseq.end - refseq.start);
        console.log(density);

        deferred.resolve({ featureDensity: density });
        return deferred;
    }

});
});
