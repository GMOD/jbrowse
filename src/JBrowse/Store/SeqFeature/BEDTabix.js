define([
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/Deferred',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredStatsMixin',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Store/TabixIndexedFile',
            'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Model/SimpleFeature',
            './BED/Parser'
        ],
        function(
            declare,
            lang,
            array,
            Deferred,
            SeqFeatureStore,
            DeferredStatsMixin,
            DeferredFeaturesMixin,
            TabixIndexedFile,
            GlobalStatsEstimationMixin,
            XHRBlob,
            SimpleFeature,
            Parser
        ) {

return declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, GlobalStatsEstimationMixin ], {

    constructor: function( args ) {
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

        this.indexedData = new TabixIndexedFile(
            {
                tbi: tbiBlob,
                csi: csiBlob,
                file: fileBlob,
                browser: this.browser,
                chunkSizeLimit: args.chunkSizeLimit || 1000000
            });

        this.parser = new Parser({
            commentCallback: (this.config.commentCallback || function(i) {  }),
            store: this
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

    /**fetch and parse the Header line */
    getHeader: function() {
        var thisB = this;
        return this._parsedHeader || ( this._parsedHeader = function() {
                var d = new Deferred();
                var reject = lang.hitch( d, 'reject' );

                thisB.indexedData.indexLoaded.then( function() {
                        var maxFetch = thisB.indexedData.index.firstDataLine
                            ? (thisB.indexedData.index.firstDataLine.block + thisB.indexedData.data.blockSize - 1) * 2
                            : null;

                        thisB.indexedData.data.read(
                            0,
                            maxFetch,
                            function( bytes ) {
                                thisB.parser.parseHeader( new Uint8Array( bytes ) );
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
    _getFeatures: function(query, featureCallback, finishCallback, errorCallback){
        this.getHeader().then(() => {
            this.indexedData.getLines(
                query.ref || this.refSeq.name,
                query.start,
                query.end,
                line => {
                    this.applyFeatureTransforms([this.lineToFeature(line)])
                    .forEach( f => {
                        if(this.config.featureCallback)
                          f = this.config.featureCallback(f)
                        featureCallback(f)
                    })
                },
                finishCallback,
                errorCallback

            );
        }, errorCallback);
    },

    supportsFeatureTransforms: true,

    _featureData: function( data ) {
        var f = lang.mixin( {}, data );
        for( var a in data.matrix ) {
            f[ a.toLowerCase() ] = data.attributes[a].join(',');
        }

        return f;
    },
    _formatFeature: function( data ) {
        var f = new SimpleFeature({
            data: this._featureData( data ),
            id: data.seq_id + "_"+ data.start + "_" +data.end+ "_" + data.name
        });
        f._reg_seq_id = this.browser.regularizeReferenceName( data.seq_id );
        return f;
    },
    //read the line
    lineToFeature: function( line ){
        var fields = line.fields;
        for (var i = 0; i < fields.length; i++) {
            if(fields[i] == '.') {
                fields[i] = null;
            }
        }

        var featureData = {
            start:  line.start,
            end:    line.end,
            seq_id: line.ref,
            name:   fields[3],
            score:  fields[4] ? +fields[4] : null,
            strand: {'+':1,'-':-1}[fields[5]] || 0
        };

        var f = new SimpleFeature({
            id: fields.slice(0,5).join('/'),
            data: featureData,
            fields: fields
        });

        return f;
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
            tbiUrlTemplate: ((this.config.tbi)||{}).url,
            csiUrlTemplate: ((this.config.csi)||{}).url
        };
    }


});
});
