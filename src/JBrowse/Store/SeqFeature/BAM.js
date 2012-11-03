define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/Deferred',
            'dojo/_base/lang',
            'JBrowse/Util',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Model/XHRBlob',
            './BAM/Util',
            './BAM/File'
        ],
        function( declare, array, Deferred, lang, Util, SeqFeatureStore, XHRBlob, BAMUtil, BAMFile ) {

var BAMStore = declare( SeqFeatureStore,

/**
 * @lends JBrowse.Store.SeqFeature.BAM
 */
{
    /**
     * Data backend for reading feature data directly from a
     * web-accessible BAM file.
     *
     * @constructs
     */
    constructor: function( args ) {
        var bamBlob = args.bam || (function() {
                                       var url = Util.resolveUrl(
                                           args.baseUrl || '/',
                                           Util.fillTemplate( args.urlTemplate || 'data.bam',
                                           {'refseq': (this.refSeq||{}).name }
                                                            )
                                       );
                                       return new XHRBlob( url );
                                   }).call(this);
        var baiBlob = args.bai || (function() {
                                      var url = Util.resolveUrl(
                                          args.baseUrl || '/',
                                          Util.fillTemplate( args.baiUrlTemplate || args.urlTemplate+'.bai' || 'data.bam.bai',
                                                             {'refseq': (this.refSeq||{}).name }
                                                           )
                                      );
                                      return new XHRBlob( url );
                                  }).call(this);

        this.bam = new BAMFile({
                store: this,
                data: bamBlob,
                bai: baiBlob
        });

        this.source = bamBlob.url ? bamBlob.url.match( /\/([^/\#\?]+)($|[\#\?])/ )[1] : undefined;

        this._loading = new Deferred();
        if( args.callback )
            this._loading.then(
                function() { args.callback(bwg); },
                function() { args.callback(null, 'Loading failed!'); }
            );
        this._loading.then( dojo.hitch( this, function() {
                                            this._loading = null;
                                        }));
    },

    load: function() {
        this.bam.init({
            success: dojo.hitch( this, '_estimateGlobalStats',
                                 dojo.hitch( this, function(error) {
                                     if( error )
                                         this.loadFail( error );
                                     else
                                         this.loadSuccess();

                                 })),
            failure: dojo.hitch( this, 'loadFail' )
        });
    },

    /**
     * Fetch a region of the current reference sequence and use it to
     * estimate the feature density in the BAM file.
     * @private
     */
    _estimateGlobalStats: function( finishCallback ) {

        var statsFromInterval = function( refSeq, length, callback ) {
            var sampleCenter = refSeq.start*0.75 + refSeq.end*0.25;
            var start = Math.round( sampleCenter - length/2 );
            var end = Math.round( sampleCenter + length/2 );
            this.bam.fetch( refSeq.name, start, end, dojo.hitch( this, function( features, error) {
                if ( error ) {
                    console.error( error );
                    callback.call( this, length,  null, error );
                }
                else if( features ) {
                    features = array.filter( features, function(f) { return f.get('start') >= start && f.get('end') <= end; } );
                    callback.call( this, length,
                                   {
                                       featureDensity: features.length / length,
                                       _statsSampleFeatures: features.length,
                                       _statsSampleInterval: { ref: refSeq.name, start: start, end: end, length: length }
                                   });
                }
            }));
        };

        var maybeRecordStats = function( interval, stats, error ) {
            if( error ) {
                finishCallback( error );
            } else {
                 if( stats._statsSampleFeatures >= 300 || interval * 2 > this.refSeq.length || error ) {
                     this.globalStats = stats;
                     console.log( 'BAM statistics', stats );
                     finishCallback();
                 } else {
                     statsFromInterval.call( this, this.refSeq, interval * 2, maybeRecordStats );
                 }
            }
        };

        statsFromInterval.call( this, this.refSeq, 100, maybeRecordStats );
    },

    loadSuccess: function() {
        this.inherited(arguments);
        this._loading.resolve({success: true });
    },

    loadFail: function() {
        this.inherited(arguments);
        this._loading.resolve({success: false });
    },

    whenReady: function() {
        var f = lang.hitch.apply(lang, arguments);
        if( this._loading ) {
            this._loading.then( f );
        } else {
            f();
        }
    },

    iterate: function( start, end, featCallback, endCallback ) {
        if( this._loading ) {
            this._loading.then( lang.hitch( this, 'iterate', start, end, featCallback, endCallback ) );
            return;
        }

        var maxFeaturesWithoutYielding = 300;
        this.bam.fetch( this.refSeq.name, start, end, function( features, error) {
                if ( error ) {
                    console.error( 'error fetching BAM data: ' + error );
                    return;
                }
                if( features ) {
                    var i = 0;
                    var readFeatures = function() {
                        for( ; i < features.length; i++ ) {
                            var feature = features[i];
                            // skip if this alignment is unmapped, or if it does not actually overlap this range
                            if (! (feature.get('unmapped') || feature.get('end') <= start || feature.get('start') >= end) )
                                featCallback( feature );

                            if( i && !( i % maxFeaturesWithoutYielding ) ) {
                                window.setTimeout( readFeatures, 1 );
                                i++;
                                break;
                            }
                        }
                        if( i >= features.length )
                            endCallback();
                    };

                    readFeatures();

                }
            });
    }

});

return BAMStore;
});