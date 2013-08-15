define([
        'dojo/_base/declare',
        'dojo/_base/array',
        'JBrowse/Store/SeqFeature',
        'JBrowse/Store/DeferredFeaturesMixin',
        'JBrowse/Model/SimpleFeature',
        'JBrowse/Util',
    ],
    function(
        declare,
        array,
        SeqFeatureStore,
        DeferredFeaturesMixin,
        SimpleFeature,
        Util
    ) {


    return declare( [ SeqFeatureStore, DeferredFeaturesMixin ], {

        constructor: function( args ) {
            this.searchParams = args.searchParams;

            this.browser.getStore( 'refseqs', dojo.hitch(this, function( refSeqStore ) {
                if( refSeqStore) {
                    this.refSeqStore = refSeqStore;
                    this._deferred.features.resolve( true );
                } else {
                    this._deferred.features.reject("Failed to load refSeq store");
                }
            }) );
        },

        setSearchParams: function( params ) {
            this.searchParams = params;
        },

        _getFeatures: function( query, featCallback, doneCallback, errorCallback ) {
            var searchParams = query.searchParams || this.searchParams;

            // store the original query bounds - this helps prevent features from randomly disappearing
            searchParams.orig = { start: query.start, end: query.end };

            query.start -= 100;
            query.end += 100;

            this.refSeqStore.getFeatures(query,
                dojo.hitch(this, function( feature ) {
                    this.getSearchResultFeatures( feature, searchParams, featCallback );
                }), doneCallback, errorCallback );
        },

        getSearchResultFeatures: function( feature, params, featCallback ) {

            var expr = new RegExp( params.expr, "g", "i");

            var start = Math.max( feature.get('start'), this.refSeq.start );

            var end = Math.min( feature.get('end'), this.refSeq.end );

            var features = [];

            if( params.fwdStrand ) {

                var sequence = feature.get( 'seq' );
                var match;

                while( (match = expr.exec( sequence )) !== null && match.length ) {
                    if( !match[0].length ) {
                        expr.lastIndex++; // Prevent infinite loops for zero-length features
                    }

                    var result = match[0];

                    var newFeat = new SimpleFeature( { data: {
                        start: start + match.index,
                        end: start + match.index + result.length,
                        seq: result,
                        strand: 1,
                    } });

                    if( !this._queryContains( params.orig, newFeat.data.start ) && !this._queryContains( params.orig, newFeat.data.end ) )
                        continue;

                    newFeat.id( newFeat.data.start + "_" + newFeat.data.end + "_" + newFeat.data.strand );

                    features.push( newFeat );
                }
            }

            if( params.revStrand ) {
                var sequence = Util.revcom( feature.get('seq') );
                var match;

                while( (match = expr.exec( sequence )) !== null && match.length ) {
                    if( !match[0].length ) {
                        expr.lastIndex++; // Prevent infinite loops for zero-length features
                    }

                    var result = match[0];

                    var newFeat = new SimpleFeature( { data: {
                        start: end - ( match.index + result.length ),
                        end: end - match.index,
                        seq: result,
                        strand: -1
                    } });

                    if( !this._queryContains( params.orig, newFeat.data.start ) && !this._queryContains( params.orig, newFeat.data.end ) )
                        continue;

                    newFeat.id( newFeat.data.start + "_" + newFeat.data.end + "_" + newFeat.data.strand );
                    features.push( newFeat );
                }
            }


            array.forEach( features, function( feature ) {
                featCallback( feature );
            });
        },

        _queryContains: function( query, bp ) {
            return query.start <= bp && query.end >= bp;
        }

    });
});