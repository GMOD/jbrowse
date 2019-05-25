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
    _estimateGlobalStats(refseq) {
        refseq = refseq || this.refSeq
        let featCountP
        if (this.indexedData) {
            featCountP = this.indexedData.lineCount(this.browser.regularizeReferenceName(refseq.name))
        } else if (this.bam) {
            const chr = this.browser.regularizeReferenceName(refseq.name)
            const chrId = this.bam.chrToIndex && this.bam.chrToIndex[chr]
            featCountP = this.bam.index.lineCount(chrId, true)
        } else {
            return this.inherited(arguments)
        }
        const correctionFactor = (this.getConf('topLevelFeaturesPercent') || 100) / 100
        return featCountP.then(featCount =>
          ( {featureDensity: featCount / (refseq.end - refseq.start) * correctionFactor})
        )
    }

});
});
