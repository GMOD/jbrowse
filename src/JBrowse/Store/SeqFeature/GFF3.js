define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/Deferred',
            'JBrowse/Model/SimpleFeature',
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
            SimpleFeature,
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
        this.features = [];
        this._loadFeatures();
    },

    _loadFeatures: function() {
        var thisB = this;
        var features = this.bareFeatures = [];

        var featuresSorted = true;
        var seenRefs = this.refSeqs = {};
        var parser = new Parser(
            {
                featureCallback: function(fs) {
                    array.forEach( fs, function( feature ) {
                                       var prevFeature = features[ features.length-1 ];
                                       var regRefName = thisB.browser.regularizeReferenceName( feature.seq_id );
                                       if( regRefName in seenRefs && prevFeature && prevFeature.seq_id != feature.seq_id )
                                           featuresSorted = false;
                                       if( prevFeature && prevFeature.seq_id == feature.seq_id && feature.start < prevFeature.start )
                                           featuresSorted = false;

                                       if( !( regRefName in seenRefs ))
                                           seenRefs[ regRefName ] = features.length;
                                       features.push( feature );
                                   });
                },
                endCallback:     function()  {
                    if( ! featuresSorted ) {
                        features.sort( thisB._compareFeatures );
                    }
                    thisB._deferred.features.resolve( features );
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
    },

    _compareFeatures: function( a, b ) {
        return a.seq_id.localeCompare( b.seq_id ) || ( b.start - a.start );
    },

    _getFeatures: function( query, featureCallback, finishedCallback, errorCallback ) {
        var thisB = this;
        thisB._deferred.features.then( function() {
            thisB._search( query, featureCallback, finishedCallback, errorCallback );
        });
    },

    _search: function( query, featureCallback, finishCallback, errorCallback ) {
        // search in this.features, which are sorted
        // by ref and start coordinate, to find the beginning of the
        // relevant range
        var refName = this.browser.regularizeReferenceName( query.ref );
        var i = this.refSeqs[ refName ];
        if( !( i >= 0 )) {
            finishCallback();
            return;
        }

        var bare = this.bareFeatures;
        var converted = this.features;

        for( ; i<bare.length; i++ ) {
            // lazily convert the bare feature data to JBrowse features
            var f = converted[i] ||
                ( converted[i] = function(b,i) {
                      delete bare[i];
                      return this._formatFeature( b );
                  }.call( this, bare[i], i )
                );
            // features are sorted by ref seq and start coord, so we
            // can stop if we are past the ref seq or the end of the
            // query region
            if( f.get('_reg_seq_id') != refName || f.get('start') > query.end )
                break;

            if( f.get('end') >= query.start )
                featureCallback( f );
        }

        finishCallback();
    },


    _formatFeature: function( data ) {
        var thisB = this;
        return new SimpleFeature({
            data: this._featureData( data )
        });
    },
    _flattenOneLevel: function( ar ) {
        var r = [];
        for( var i = 0; i<ar.length; i++ ) {
            r.push.apply( r, ar[i] );
        }
        return r;
    },

    _featureData: function( data ) {
        var f = lang.mixin( {}, data );
        delete f.child_features;
        delete f.derived_features;
        delete f.attributes;
        f._reg_seq_id = this.browser.regularizeReferenceName( f.seq_id );
        f.start -= 1; // convert to interbase
        for( var a in data.attributes ) {
            f[a] = data.attributes[a].join(',');
        }
        var sub = array.map( this._flattenOneLevel( data.child_features ), this._featureData, this );
        if( sub.length )
            f.subfeatures = sub;

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
        callback( this.browser.regularizeReferenceName(seqName) in this.refSeqs );
    }

});
});