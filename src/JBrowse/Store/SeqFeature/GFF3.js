define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/Deferred',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Store/DeferredStatsMixin',
            './GFF3/Parser'
        ],
        function(
            declare,
            lang,
            array,
            Deferred,
            SeqFeatureStore,
            DeferredFeatures,
            DeferredStats,
            Parser
        ) {

return declare([ SeqFeatureStore, DeferredFeatures, DeferredStats ],

 /**
  * @lends JBrowse.Store.SeqFeature.GFF3
  */
{
    constructor: function( args ) {
        this.data = args.blob;
        this._loadFeatures();
    },

    _loadFeatures: function() {
        return this.featuresLoaded || function() {
            var d = this.featuresLoaded = new Deferred();
            var thisB = this;
            this.features = [];

            var featuresSorted = true;
            var seenRefs = {};
            var parser = new Parser(
                {
                    featureCallback: function(fs) {
                        array.forEach( fs, function( feature ) {
                            var prevFeature = thisB.features[ thisB.features.length-1 ];
                            if( seenRefs[ feature.seq_id ] && prevFeature.seq_id != feature.seq_id )
                                featuresSorted = false;
                            if( prevFeature.seq_id == feature.seq_id && feature.start < prevFeature.start )
                                featuresSorted = false;

                            seenRefs[ feature.seq_id ] = true;
                            thisB.features.push( feature );
                        });
                    },
                    endCallback:     function()  {
                        d.resolve( thisB.features );
                        if( ! featuresSorted ) {
                            thisB.features.sort( thisB._compareFeatures );
                        }
                    }
                });

            // parse the whole file and store it
            this.data.fetchLines(
                function( line ) {
                    parser.addLine(line);
                },
                lang.hitch( parser, 'finish' ),
                lang.hitch( this, '_failAllDeferred' )
            );

            return d;
        }.call(this);
    },

    _compareFeatures: function( a, b ) {
        return a.localeCompare( b ) || ( b.start - a.start );
    },

    _getFeatures: function( query, featureCallback, finishedCallback, errorCallback ) {
        var thisB = this;
        thisB._load().then( function() {
            this._search( query, featureCallback, finishedCallback, errorCallback );
        });
    },

    _search: function( query, featureCallback, finishedCallback, errorCallback ) {
        // TODO: do a binary search in this.features, which are sorted
        // by ref and start coordinate, to find the beginning of the
        // relevant range
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