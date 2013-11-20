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
            'JBrowse/Model/SimpleFeature',
            'JBrowse/Util/DeferredGenerator',
            'JBrowse/Util/DeferredGenerator/Combine',
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
            SimpleFeature,
            DeferredGenerator,
            CombineGenerators,
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
            { name: 'bam', type: 'string', required: true },
            { name: 'bai', type: 'string',
              defaultValue: function( store ) {
                  return store.getConf('bam')+'.bai'; }
            },
            { name: 'chunkSizeLimit', type: 'integer', defaultValue: 5000000 }
        ]
    },

    constructor: function( args ) {
        this.bam = new BAMFile({
                store: this,
                data:  this.openResource( BGZBytes, this.getConf('bam')),
                bai:   this.openResource( Bytes,    this.getConf('bai')),
                chunkSizeLimit: this.getConf('chunkSizeLimit')
        });

        var bamDef = this.getConf('bam');
        this.source = this.name;
        if( ! this.source ) {
            try {
                this.source = typeof bamDef == 'string'
                    ? bamDef.match( /\/([^/\#\?]+)($|[\#\?])/ )[1]
                    : bamDef.name;
            } catch( e ){}
        }
    },

    getReferenceFeatures: function( query ) {
        var thisB = this;
        return new DeferredGenerator( function( generator ) {
            return thisB.bam.init()
                .then( function() {
                           var chrs = thisB.bam.indexToChr;
                           var lim = query.limit || Infinity;
                           if( ! lim )
                               return;

                           var name = query.name || query.seq_id;
                           if( name ) {
                               var ref = thisB.bam.indexToChr[
                                   thisB.bam.chrToIndex[ thisB.browser.regularizeReferenceName( name ) ]
                               ];
                               if( ref ) {
                                   generator.emit( new SimpleFeature({
                                           data: { start: 0, end: ref.length,
                                                   name: ref.name, seq_id: ref.name
                                                 }})
                                       );
                               }
                           }
                           else {
                               for( var i = 0; i<chrs.length && i<lim; i++ ) {
                                   generator.emit( new SimpleFeature({
                                           data: { start: 0, end: chrs[i].length,
                                                   name: chrs[i].name, seq_id: chrs[i].name
                                                 }})
                                       );
                               }
                           }
                       });
        });
    },

    getRegionStats: function( query, oldcallback ) {
        if( oldcallback ) throw 'getRegionStats no longer takes callback arguments';

        var thisB = this;
        return thisB.bam.init()
            .then( function() {
                       var i = thisB.bam.chrToIndex[
                           thisB.browser.regularizeReferenceName(query.seq_id)
                       ];
                       if( i === undefined )
                           return { featureDensity: 0, featureCount: 0 };

                       return thisB._estimateGlobalStats( query.seq_id );
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

    getFeatures: function( query, callback ) {
        if( callback ) throw 'getFeatures no longer takes callback arguments';

        return this.bam.fetchFeatures( query.seq_id, query.start, query.end );
    }
});

return BAMStore;
});