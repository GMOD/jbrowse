/**
 * Data backend for reading feature data directly from a BAM file.
 */
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
            'JBrowse/Model/Resource/Bytes',
            'JBrowse/Model/Resource/BGZBytes',
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
            Bytes,
            BGZBytes,
            GlobalStatsEstimationMixin,
            BAMFile
        ) {

var BAMStore = declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, GlobalStatsEstimationMixin ],
{

    configSchema: {
        slots: [
            { name: 'createSubfeatures', type: 'boolean', defaultValue: false },
            { name: 'bam', type: 'object|string', defaultValue: function( store ) {
                  var urlT = store.getConf('urlTemplate' );
                  if( ! urlT )
                      throw "Must provide either `bam` or config `urlTemplate`";
                  return store.resolveUrl( urlT );
              }
            },
            { name: 'bai', type: 'object|string', defaultValue: function( store ) {
                  return store.resolveUrl( store.getConf('baiUrlTemplate') );
              }
            },
            { name: 'urlTemplate', type: 'string' },
            { name: 'baiUrlTemplate', type: 'string', defaultValue: function( store ) { return store.getConf('urlTemplate')+'.bai'; } },
            { name: 'chunkSizeLimit', type: 'integer', defaultValue: 5000000 }
        ]
    },

    constructor: function( args ) {
        var bamResource = this.openResource( BGZBytes, this.getConf('bam') );
        var baiResource = this.openResource( Bytes,    this.getConf('bai') );

        this.bam = new BAMFile({
                store: this,
                data: bamResource,
                bai: baiResource,
                chunkSizeLimit: this.getConf('chunkSizeLimit')
        });

        this.source = ( bamResource.url  ? bamResource.url.match( /\/([^/\#\?]+)($|[\#\?])/ )[1] :
                        bamResource.blob ? bamResource.blob.name : undefined )
                        || undefined;

        if( ! has( 'typed-arrays' ) ) {
            this._failAllDeferred( 'This web browser lacks support for JavaScript typed arrays.' );
            return;
        }

        this.bam.init({
            success: lang.hitch( this,
                                 function() {
                                     this._deferred.features.resolve({success:true});
                                     this._deferred.stats.resolve();
                                 }),
            failure: lang.hitch( this, '_failAllDeferred' )
        });
    },

    getRegionStats: function( query, statsCallback, errorCallback ) {
        var thisB = this;
        this._deferred.stats.then( function() {
            var i = thisB.bam.chrToIndex[ thisB.browser.regularizeReferenceName(query.ref) ];
            if( i === undefined ) {
                statsCallback( { featureDensity: 0, featureCount: 0 } );
                return;
            }
            thisB._estimateGlobalStats( { name: query.ref, start: 0, end: thisB.bam.indexToChr[ i ].length } )
                .then( statsCallback, errorCallback );
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
    hasRefSeq: function( seqName, callback, errorCallback ) {
        var thisB = this;
        seqName = thisB.browser.regularizeReferenceName( seqName );
        this._deferred.stats.then( function() {
            callback( seqName in thisB.bam.chrToIndex );
        }, errorCallback );
    },

    // called by getFeatures from the DeferredFeaturesMixin
    _getFeatures: function( query, featCallback, endCallback, errorCallback ) {
        this.bam.fetch( query.ref, query.start, query.end, featCallback, endCallback, errorCallback );
    }

});

return BAMStore;
});