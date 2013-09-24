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
            Bytes,
            BGZBytes,
            GlobalStatsEstimationMixin,
            BAMFile
        ) {

var BAMStore = declare( [ SeqFeatureStore, GlobalStatsEstimationMixin ],
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
    },

    getRegionStats: function( query ) {
        var thisB = this;
        return thisB.bam.init()
            .then( function() {
                       var i = thisB.bam.chrToIndex[ thisB.browser.regularizeReferenceName(query.ref) ];
                       if( i === undefined )
                           return { featureDensity: 0, featureCount: 0 };

                       return thisB._estimateGlobalStats( { name: query.ref, start: 0, end: thisB.bam.indexToChr[ i ].length } );
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
    hasRefSeq: function( seqName ) {
        seqName = thisB.browser.regularizeReferenceName( seqName );

        return this.bam.init()
            .then( function(bam) {
                       return seqName in bam.chrToIndex;
                   });
    },

    getFeatures: function( query ) {
        return this.bam.fetchFeatures( query.ref, query.start, query.end );
    }

});

return BAMStore;
});