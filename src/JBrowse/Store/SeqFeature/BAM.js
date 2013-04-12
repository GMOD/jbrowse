define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/Deferred',
            'dojo/_base/lang',
            'dojo/has',
            'JBrowse/Util',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredStatsMixin',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
            './BAM/Util',
            './BAM/File'
        ],
        function(
            declare,
            array,
            Deferred,
            lang,
            has,
            Util,
            SeqFeatureStore,
            DeferredStatsMixin,
            DeferredFeaturesMixin,
            XHRBlob,
            GlobalStatsEstimationMixin,
            BAMUtil,
            BAMFile
        ) {

var BAMStore = declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, GlobalStatsEstimationMixin ],

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

        var bamBlob = args.bam ||
            new XHRBlob( this.resolveUrl(
                             args.urlTemplate || 'data.bam'
                         )
                       );

        var baiBlob = args.bai ||
            new XHRBlob( this.resolveUrl(
                             args.baiUrlTemplate || ( args.urlTemplate ? args.urlTemplate+'.bai' : 'data.bam.bai' )
                         )
                       );

        this.bam = new BAMFile({
                store: this,
                data: bamBlob,
                bai: baiBlob
        });

        this.source = ( bamBlob.url  ? bamBlob.url.match( /\/([^/\#\?]+)($|[\#\?])/ )[1] :
                        bamBlob.blob ? bamBlob.blob.name : undefined ) || undefined;

        if( ! has( 'typed-arrays' ) ) {
            this._failAllDeferred( 'Browser does not support typed arrays');
            return;
        }

        this.bam.init({
            success: dojo.hitch( this, '_estimateGlobalStats',
                                 dojo.hitch( this, function( stats, error ) {
                                     if( error )
                                         this._failAllDeferred( error );
                                     else {
                                         this.globalStats = stats;
                                         this._deferred.stats.resolve({success:true});
                                         this._deferred.features.resolve({success:true});
                                     }

                                 })),
            failure: dojo.hitch( this, '_failAllDeferred' )
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
        var thisB = this;
        seqName = thisB.browser.regularizeReferenceName( seqName );
        this._deferred.stats.then( function() {
            callback( seqName in thisB.bam.chrToIndex );
        }, errorCallback );
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
                                return;
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