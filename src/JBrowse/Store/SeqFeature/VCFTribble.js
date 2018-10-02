const { TribbleIndexedFile } = cjsRequire('@gmod/tribble-index')
const VCF = cjsRequire('@gmod/vcf')

define([
           'dojo/_base/declare',
           'JBrowse/Errors',
           'dojo/_base/lang',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
           'JBrowse/Model/XHRBlob',
           'JBrowse/Model/BlobFilehandleWrapper',
           'JBrowse/Model/SimpleFeature',
           'JBrowse/Store/SeqFeature/VCF/FeatureMaker'
       ],
       function(
           declare,
           Errors,
           lang,
           SeqFeatureStore,
           DeferredStatsMixin,
           DeferredFeaturesMixin,
           GlobalStatsEstimationMixin,
           XHRBlob,
           BlobFilehandleWrapper,
           SimpleFeature,
           FeatureMaker
       ) {

return declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, GlobalStatsEstimationMixin, FeatureMaker ],
{

    constructor( args ) {
        var thisB = this;

        var idxBlob = args.idx ||
            new BlobFilehandleWrapper(
                new XHRBlob(
                    this.resolveUrl(
                        this.getConf('idxUrlTemplate',[]) || this.getConf('urlTemplate',[])+'.idx'
                    )
                )
            );

        var fileBlob = args.file ||
            new BlobFilehandleWrapper(
                new XHRBlob(
                    this.resolveUrl(
                        this.getConf('urlTemplate',[]) ), { expectRanges: true }
                )
            );

        this.indexedData = new TribbleIndexedFile({
            filehandle: fileBlob,
            tribbleFilehandle: idxBlob,
            oneBasedClosed: true,
            chunkSizeLimit: args.chunkSizeLimit || 1000000,
            renameRefSeqs: n => this.browser.regularizeReferenceName(n)
        });
        
        this.getParser()
            .then( function( parser ) {
                       thisB._deferred.features.resolve({success:true});
                       thisB._estimateGlobalStats()
                       .then(
                                function( stats ) {
                                    thisB.globalStats = stats;
                                    thisB._deferred.stats.resolve( stats );
                                },
                                lang.hitch( thisB, '_failAllDeferred' )
                                );
                            },
                   lang.hitch( thisB, '_failAllDeferred' )
                 );
                 
                 this.storeTimeout = args.storeTimeout || 3000;
    },
    
    getParser() {
        if (!this._parser) {
            this._parser = this.indexedData.getHeader()
            .then(header => new VCF({header: header}))
        }
        return this._parser
    },

    _getFeatures( query, featureCallback, finishedCallback, errorCallback ) {
        var thisB = this;
        thisB.getParser().then(parser => {
            const regularizeReferenceName = this.browser.regularizeReferenceName(query.ref)
            thisB.indexedData.getLines(
                regularizeReferenceName,
                query.start,
                query.end,
                line => {
                    const variant = parser.parseLine(line)
                    const protoF = this.variantToFeature(parser, variant)
                    const f = new SimpleFeature({
                        data: protoF});
                    featureCallback(f)
                }
            )
            .then(finishedCallback, error => {
                if (errorCallback) {
                    if (error.message && error.message.indexOf('Too much data') >= 0) {
                        error = new Errors.DataOverflow(error.message)
                    }
                    errorCallback(error)
                } else
                    console.error(error)
            })
        })
        .catch(errorCallback)
    },

    /**
     * Interrogate whether a store has data for a given reference
     * sequence.  Calls the given callback with either true or false.
     *
     * Implemented as a binary interrogation because some stores are
     * smart enough to regularize reference sequence names, while
     * others are not.
     */
    hasRefSeq: function( seqName, callback, errorCallback ) {
        return this.indexedData.index.hasRefSeq( seqName, callback, errorCallback );
    },

    saveStore: function() {
        return {
            urlTemplate: this.config.file.url,
            idxUrlTemplate: this.config.idx.url
        };
    }

});
});
