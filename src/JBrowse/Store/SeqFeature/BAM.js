define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/Deferred',
            'dojo/_base/lang',
            'JBrowse/Util',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredStatsMixin',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Model/XHRBlob',
            './BAM/Util',
            './BAM/File'
        ],
        function( declare, array, Deferred, lang, Util, SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, XHRBlob, BAMUtil, BAMFile ) {

var BAMStore = declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin ],

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

        this.createSubfeatures = args.subfeatures;

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

        this.source = ( bamBlob.url  ? bamBlob.url.match( /\/([^/\#\?]+)($|[\#\?])/ )[1] :
                        bamBlob.blob ? bamBlob.blob.name : undefined ) || undefined;

        this.bam.init({
            success: dojo.hitch( this, '_estimateGlobalStats',
                                 dojo.hitch( this, function(error) {
                                     if( error )
                                         this._failAllDeferred( error );
                                     else {
                                         this._deferred.stats.resolve({success:true});
                                         this._deferred.features.resolve({success:true});
                                     }

                                 })),
            failure: dojo.hitch( this, '_failAllDeferred' )
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
            var start = Math.max( 0, Math.round( sampleCenter - length/2 ) );
            var end = Math.min( Math.round( sampleCenter + length/2 ), refSeq.end );
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
                var refLen = this.refSeq.end - this.refSeq.start;
                 if( stats._statsSampleFeatures >= 300 || interval * 2 > refLen || error ) {
                     this.globalStats = stats;
                     console.log( 'BAM statistics: '+this.source, stats );
                     finishCallback();
                 } else {
                     statsFromInterval.call( this, this.refSeq, interval * 2, maybeRecordStats );
                 }
            }
        };

        statsFromInterval.call( this, this.refSeq, 100, maybeRecordStats );
    },


    // called by getFeatures from the DeferredFeaturesMixin
    _getFeatures: function( query, featCallback, endCallback, errorCallback ) {
        var start = query.start;
        var end   = query.end;

        var maxFeaturesWithoutYielding = 300;
        this.bam.fetch( this.refSeq.name, start, end, function( features, error) {
                if ( error ) {
                    console.error( 'error fetching BAM data: ' + error );
                    if( errorCallback ) errorCallback( error );
                    return;
                }
                if( features ) {
                    var i = 0;
                    var readFeatures = function() {
                        for( ; i < features.length; i++ ) {
                            var feature = features[i];
                            // skip if this alignment is unmapped, or if it does not actually overlap this range
                            if (! (feature.get('unmapped') || feature.get('end') <= start || feature.get('start') >= end) )
                                try {
                                    featCallback( feature );
                                } catch(e) {
                                    if( errorCallback )
                                        errorCallback( e );
                                    else
                                        console.error( e, e.stack );
                                    return;
                                }

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