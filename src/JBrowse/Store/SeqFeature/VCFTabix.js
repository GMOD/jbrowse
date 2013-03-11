define([
           'dojo/_base/declare',
           'dojo/_base/Deferred',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/TabixIndexedFile',
           'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
           'JBrowse/Model/XHRBlob',
           './VCFTabix/Parser'
       ],
       function(
           declare,
           Deferred,
           SeqFeatureStore,
           DeferredStatsMixin,
           DeferredFeaturesMixin,
           TabixIndexedFile,
           GlobalStatsEstimationMixin,
           XHRBlob,
           VCFParser
       ) {


// subclass the TabixIndexedFile to modify the parsed items a little
// bit so that the range filtering in TabixIndexedFile will work.  VCF
// files don't actually have an end coordinate, so we have to make it
// here.  also convert coordinates to interbase.
var VCFIndexedFile = declare( TabixIndexedFile, {
    parseItem: function() {
        var i = this.inherited( arguments );
        if( i ) {
            i.start--;
            i.end = i.start + i.fields[3].length;
        }
        return i;
    }
});

return declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, GlobalStatsEstimationMixin, VCFParser ],
{

    constructor: function( args ) {
        var thisB = this;

        var tbiBlob = args.tbiBlob ||
            new XHRBlob( this.resolveUrl(
                             this.getConf('tbiUrlTemplate',[]) || this.getConf('urlTemplate',[])+'.tbi',
                             {'refseq': (this.refSeq||{}).name }
                         )
                       );

        var fileBlob = args.fileBlob ||
            new XHRBlob( this.resolveUrl( this.getConf('urlTemplate',[]),
                             {'refseq': (this.refSeq||{}).name }
                           )
                       );

        this.indexedData = new VCFIndexedFile({ tbi: tbiBlob, file: fileBlob });

        this._loadHeader().then( function() {
            thisB._estimateGlobalStats( function( stats, error ) {
                if( error )
                    thisB._failAllDeferred( error );
                else {
                    thisB.globalStats = stats;
                    thisB._deferred.stats.resolve({success:true});
                    thisB._deferred.features.resolve({success:true});
                }
            });
        });
    },

    /** fetch and parse the VCF header lines */
    _loadHeader: function() {
        var thisB = this;
        return this._parsedHeader = this._parsedHeader || function() {
            var d = new Deferred();

            thisB.indexedData.indexLoaded.then( function() {
                var maxFetch = thisB.indexedData.index.firstDataLine
                    ? thisB.indexedData.index.firstDataLine.block + thisB.indexedData.data.blockSize - 1
                    : null;

                thisB.indexedData.data.read(
                    0,
                    maxFetch,
                    function( bytes ) {

                        thisB.parseHeader( new Uint8Array( bytes ) );

                        d.resolve({ success:true});
                    },
                    dojo.hitch( d, 'reject' )
                );
            });

            return d;
        }.call();
    },

    _getFeatures: function( query, featureCallback, finishedCallback, errorCallback ) {
        var thisB = this;
        thisB._loadHeader().then( function() {
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
        });
    },

    getRefSeqs: function( refSeqCallback, finishedCallback, errorCallback ) {
        return this.indexedData.index.getRefSeqs.apply( this.indexedData.index, arguments );
    }

});
});