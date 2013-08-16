define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/TabixIndexedFile',
           'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
           'JBrowse/Model/XHRBlob',
           './VCFTabix/Parser'
       ],
       function(
           declare,
           lang,
           Deferred,
           SeqFeatureStore,
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

return declare( [ SeqFeatureStore, GlobalStatsEstimationMixin, VCFParser ],
{

    constructor: function( args ) {
        var thisB = this;

        var tbiBlob = args.tbi ||
            new XHRBlob( this.resolveUrl( this.getConf('tbiUrlTemplate')));

        var fileBlob = args.file ||
            new XHRBlob( this.resolveUrl( this.getConf('urlTemplate')));

        this.indexedData = new VCFIndexedFile(
            {
                tbi: tbiBlob,
                file: fileBlob,
                browser: this.browser,
                chunkSizeLimit: args.chunkSizeLimit
            });

        this._loadHeader();
    },

    configSchema: {
        slots: [
            { name: 'urlTemplate', type: 'string' },
            { name: 'tbiUrlTemplate', type: 'string', defaultValue: function(store) { return store.getConf('urlTemplate')+'.tbi'; } }
        ]
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
                    lang.hitch( d, 'reject' )
                );
             },
             lang.hitch( d, 'reject' )
            );

            return d;
        }.call();
    },

    getFeatures: function( query, featureCallback, finishedCallback, errorCallback ) {
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
        }, errorCallback );
    },

    getRegionStats: function( query, statsCallback, errorCallback ) {
        var thisB = this;
        this.browser.findRefSeq( query.ref )
            .then( function( refseq ) {
                 return thisB._estimateGlobalStats(refseq)
                            .then( statsCallback, errorCallback );
             });
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
    }

});
});