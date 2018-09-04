const promisify = cjsRequire('util.promisify')
const zlib = cjsRequire('zlib')
const gunzip = promisify(zlib.gunzip)

define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/TabixIndexedFile',
           'JBrowse/Store/SeqFeature/IndexedStatsEstimationMixin',
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
           TabixIndexedFile,
           IndexedStatsEstimationMixin,
           XHRBlob,
           VCFParser
       ) {


// subclass the TabixIndexedFile to modify the parsed items a little
// bit so that the range filtering in TabixIndexedFile will work.  VCF
// files don't actually have an end coordinate, so we have to make it
// here.  also convert coordinates to interbase.
var VCFIndexedFile = declare( TabixIndexedFile, {
    parseLine() {
        var i = this.inherited( arguments );
        if( i ) {
            var ret = i.fields[7].match(/^END=(\d+)|;END=(\d+)/);
            i.start--;
            i.end = ret ? (+ret[1] || +ret[2]) : i.start + i.fields[3].length;
        }
        return i;
    }
});

return declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, IndexedStatsEstimationMixin, VCFParser ],
{

    constructor( args ) {
        var thisB = this;
        var csiBlob, tbiBlob;

        if(args.csi || this.config.csiUrlTemplate) {
            csiBlob = args.csi ||
                new XHRBlob(
                    this.resolveUrl(
                        this.getConf('csiUrlTemplate',[])
                    )
                );
        } else {
            tbiBlob = args.tbi ||
                new XHRBlob(
                    this.resolveUrl(
                        this.getConf('tbiUrlTemplate',[]) || this.getConf('urlTemplate',[])+'.tbi'
                    )
                );
        }

        var fileBlob = args.file ||
            new XHRBlob(
                this.resolveUrl( this.getConf('urlTemplate',[]) ),
                { expectRanges: true }
            );

        this.fileBlob = fileBlob

        this.indexedData = new VCFIndexedFile(
            {
                tbi: tbiBlob,
                csi: csiBlob,
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
    getVCFHeader() {
        if (!this._parsedHeader) {
            this._parsedHeader = this.indexedData.getHeader()
                .then(headerBytes => this.parseHeader(headerBytes))
        }
        return this._parsedHeader
    },

    _getFeatures( query, featureCallback, finishedCallback, errorCallback ) {
        var thisB = this;
        thisB.getVCFHeader().then( function() {
            thisB.indexedData.getLines(
                query.ref || thisB.refSeq.name,
                query.start,
                query.end,
                function( line ) {
                    var f = thisB.lineToFeature( line );
                    //console.log(f);
                    featureCallback( f );
                    //return f;
                },
                finishedCallback,
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
    hasRefSeq( seqName, callback, errorCallback ) {
        return this.indexedData.index.hasRefSeq( seqName, callback, errorCallback );
    },


    saveStore() {
        return {
            urlTemplate: this.config.file.url,
            tbiUrlTemplate: ((this.config.tbi)||{}).url,
            csiUrlTemplate: ((this.config.csi)||{}).url
        };
    }

});
});
