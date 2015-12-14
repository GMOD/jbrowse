define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/TabixIndexedFile',
           'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
           'JBrowse/Model/XHRBlob',
           'JBrowse/Store/SeqFeature/GFF3/Parser'
       ],
       function(
           declare,
           lang,
           Deferred,
           SeqFeatureStore,
           DeferredStatsMixin,
           DeferredFeaturesMixin,
           TabixIndexedFile,
           GlobalStatsEstimationMixin,
           XHRBlob,
           GFF3Parser
       ) {


return declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, GlobalStatsEstimationMixin, GFF3Parser ],
{

    constructor: function( args ) {
        var thisB = this;

        var tbiBlob = args.tbi ||
            new XHRBlob(
                this.resolveUrl(
                    this.getConf('tbiUrlTemplate',[]) || this.getConf('urlTemplate',[])+'.tbi'
                )
            );

        var fileBlob = args.file ||
            new XHRBlob(
                this.resolveUrl( this.getConf('urlTemplate',[]) )
            );

        this.indexedData = new TabixIndexedFile(
            {
                tbi: tbiBlob,
                file: fileBlob,
                browser: this.browser,
                chunkSizeLimit: args.chunkSizeLimit || 1000000
            });

        this.getHeader()
            .then( function( header ) {
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
    },

    /** fetch and parse the VCF header lines */
    getHeader: function() {
        var thisB = this;
        return this._parsedHeader || ( this._parsedHeader = function() {
            var d = new Deferred();
            var reject = lang.hitch( d, 'reject' );

            thisB.indexedData.indexLoaded.then( function() {
                var maxFetch = thisB.indexedData.index.firstDataLine
                    ? thisB.indexedData.index.firstDataLine.block + thisB.indexedData.data.blockSize - 1
                    : null;

                thisB.indexedData.data.read(
                    0,
                    maxFetch,
                    function( bytes ) {
                        d.resolve( thisB.header );
                    },
                    reject
                );
             },
             reject
            );

            return d;
        }.call(this));
    },

    _getFeatures: function( query, featureCallback, finishedCallback, errorCallback ) {
        var thisB = this;

        var featMap = {};
        var topLevelFeats = {};
        thisB.getHeader().then( function() {
            thisB.indexedData.getLines(
                query.ref || thisB.refSeq.name,
                query.start,
                query.end,
                function( line ) {
                    thisB.addLine( line );
                },
                function() {
                    this.finish();
                    
                    finishedCallback();
                },
                errorCallback
            );
        }, errorCallback );
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
    _return_item: function(i) {
        if( i[0] )
            this.featureCallback( i );
        else if( i.directive )
            this.directiveCallback( i );
        else if( i.comment )
            this.commentCallback( i );
    },

    saveStore: function() {
        return {
            urlTemplate: this.config.file.url,
            tbiUrlTemplate: this.config.tbi.url
        };
    }


});
});
