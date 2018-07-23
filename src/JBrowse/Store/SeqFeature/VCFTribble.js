define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/TribbleIndexedFile',
           'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
           'JBrowse/Model/XHRBlob',
           './VCF/Parser'
       ],
       function(
           declare,
           lang,
           Deferred,
           SeqFeatureStore,
           DeferredStatsMixin,
           DeferredFeaturesMixin,
           TribbleIndexedFile,
           GlobalStatsEstimationMixin,
           XHRBlob,
           VCFParser
       ) {


// subclass the TabixIndexedFile to modify the parsed items a little
// bit so that the range filtering in TabixIndexedFile will work.  VCF
// files don't actually have an end coordinate, so we have to make it
// here.  also convert coordinates to interbase.
var TribbleIndexedVCFFile = declare( TribbleIndexedFile, {
    parseLine: function() {
        var i = this.inherited( arguments );
        if( i ) {
            var ret = i.fields[7].match(/^END=(\d+)|;END=(\d+)/);
            i.start--;
            i.end = ret ? (+ret[1] || +ret[2]) : i.start + i.fields[3].length;
        }
        return i;
    },

    getColumnNumbers: function() {
        return {
            ref: 1,
            start: 2,
            end: -1
        }
    }
});

return declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, GlobalStatsEstimationMixin, VCFParser ],
{

    constructor: function( args ) {
        var thisB = this;

        var idxBlob = args.idx ||
            new XHRBlob(
                this.resolveUrl(
                    this.getConf('idxUrlTemplate',[]) || this.getConf('urlTemplate',[])+'.idx'
                )
            );

        var fileBlob = args.file ||
            new XHRBlob(
                this.resolveUrl( this.getConf('urlTemplate',[]) ), { expectRanges: true }
            );

        this.indexedData = new TribbleIndexedVCFFile(
            {
                idx: idxBlob,
                file: fileBlob,
                browser: this.browser,
                chunkSizeLimit: args.chunkSizeLimit || 1000000
            });

        this.getVCFHeader()
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

        this.storeTimeout = args.storeTimeout || 3000;
    },

    /** fetch and parse the VCF header lines */
    getVCFHeader: function() {
        if (!this._parsedHeader) {
            this._parsedHeader = new Deferred()
            var reject = this._parsedHeader.reject.bind(this._parsedHeader)

            this.indexedData.indexLoaded.then(
                () => {
                    const maxFetch = this.indexedData.index.data.firstDataOffset
                        ? this.indexedData.index.data.firstDataOffset-1
                        : null;

                    this.indexedData.data.read(
                        0,
                        maxFetch,
                        bytes => {
                            this.parseHeader( new Uint8Array( bytes ) );
                            this._parsedHeader.resolve( this.header );
                        },
                        reject
                    );
                },
                reject
            );
        }
        return this._parsedHeader
    },

    _getFeatures: function( query, featureCallback, finishedCallback, errorCallback ) {
        this.getVCFHeader().then( () => {
            this.indexedData.getLines(
                query.ref || this.refSeq.name,
                query.start,
                query.end,
                line => {
                    var f = this.lineToFeature( line )
                    //console.log(f);
                    featureCallback( f )
                    //return f;
                },
                finishedCallback,
                errorCallback
            );
        }, errorCallback )
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
