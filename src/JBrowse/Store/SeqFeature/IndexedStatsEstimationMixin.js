/**
 * Mixin that adds _estimateGlobalStats method to a store, which
 * samples a section of the features in the store and uses those to
 * esimate the statistics of the whole data set.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/Deferred',
           'JBrowse/Errors',
           'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin'
       ],
       function( declare, array, Deferred, Errors, GlobalStats ) {

return declare( GlobalStats, {

    /**
     * Fetch a region of the current reference sequence and use it to
     * estimate the feature density of the store.
     * @private
     */
    async _estimateGlobalStats(refseq) {
        refseq = refseq || this.refSeq
        let featCount
        if (this.indexedData) {
            featCount = await this.indexedData.featureCount(refseq.name)
        } else if (this.bam) {
            const chr = this.browser.regularizeReferenceName(refseq.name)
            const chrId = this.bam.chrToIndex && this.bam.chrToIndex[chr]
            featCount = await this.bam.index.featureCount(chrId, true)
        }
        if (featCount == -1) {
            return this.inherited('_estimateGlobalStats', arguments)
        }
        const correctionFactor = (this.getConf('topLevelFeaturesPercent') || 100) / 100
        const featureDensity = featCount / (refseq.end - refseq.start) * correctionFactor
        return { featureDensity }
    }

});
});
