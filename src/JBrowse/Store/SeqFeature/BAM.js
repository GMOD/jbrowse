define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/Deferred',
            'dojo/_base/lang',
            'JBrowse/has',
            'JBrowse/Util',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredStatsMixin',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
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
                bai: baiBlob,
                chunkSizeLimit: args.chunkSizeLimit
        });

        this.source = ( bamBlob.url  ? bamBlob.url.match( /\/([^/\#\?]+)($|[\#\?])/ )[1] :
                        bamBlob.blob ? bamBlob.blob.name : undefined ) || undefined;

        if( ! has( 'typed-arrays' ) ) {
            this._failAllDeferred( 'Web browser does not support typed arrays');
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

                                 }),
                                 dojo.hitch( this, '_failAllDeferred' )
                               ),
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
        this.bam.fetch( this.refSeq.name, query.start, query.end, featCallback, endCallback, errorCallback );
    }

});

return BAMStore;
});