define([
        '../../../dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/_base/array',
        'dojo/Deferred',
        'JBrowse/Model/SimpleFeature',
        'JBrowse/Store/SeqFeature',
        'JBrowse/Store/DeferredStatsMixin',
        'JBrowse/Store/DeferredFeaturesMixin',
        'JBrowse/Store/TabixIndexedFile',
        'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
        'JBrowse/Model/XHRBlob',
        './BEDTabix/Parser',
        'JBrowse/Store/SeqFeature/BEDTabix/LazyFeature'
    ],
    function(
        declare,
        lang,
        array,
        Deferred,
        SimpleFeature,
        SeqFeatureStore,
        DeferredStatsMixin,
        DeferredFeaturesMixin,
        TabixIndexedFile,
        GlobalStatsEstimationMixin,
        XHRBlob,
        Parser,
        LazyFeature
    ) {


        return declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, GlobalStatsEstimationMixin, Parser ],
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


                /**fetch and parse the Header line */

                getHeader: function() {
                    var thisB = this;
                    return this._parsedHeader || ( this._parsedHeader = function() {
                            var d = new Deferred();
                            var reject = lang.hitch( d, 'reject' );

                            thisB.indexedData.indexLoaded.then( function() {
                                    var maxFetch = thisB.indexedData.index.firstDataLine
                                        ? (thisB.indexedData.index.firstDataLine.block + thisB.indexedData.data.blockSize - 1) *2
                                        : null;

                                    thisB.indexedData.data.read(
                                        0,
                                        maxFetch,
                                        function( bytes ) {
                                            thisB.parseHeader( new Uint8Array( bytes ) );
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
                _getFeatures: function(query, featureCallback,finishCallback,errorCallback){
                    var thisB=this;
                    thisB.getHeader().then(function(){
                        thisB.indexedData.getLines(
                            query.ref || thisB.refSeq.name,
                            query.start,
                            query.end,
                            function( line ) {
                                var f=thisB.lineToFeature(line);
//                                console.log(f);
                                featureCallback(f);
                            },
                            finishCallback,
                            errorCallback

                        );
                    },errorCallback);
                },

                // flatten array like [ [1,2], [3,4] ] to [ 1,2,3,4 ]
                _flattenOneLevel: function( ar ) {
                    var r = [];
                    for( var i = 0; i<ar.length; i++ ) {
                        r.push.apply( r, ar[i] );
                    }
                    return r;
                },


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
                        tbiUrlTemplate: this.config.tbi.url
                    };
                }


            });
    });
