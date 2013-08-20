define([
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'JBrowse/Store/SeqFeature',
        'JBrowse/Store/DeferredFeaturesMixin',
        'JBrowse/Model/SimpleFeature',
        'JBrowse/Util',
        'JBrowse/CodonTable'
    ],
    function(
        declare,
        array,
        lang,
        SeqFeatureStore,
        DeferredFeaturesMixin,
        SimpleFeature,
        Util,
        CodonTable
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
            var searchParams = lang.mixin( {}, this.searchParams, query.searchParams );

            // store the original query bounds - this helps prevent features from randomly disappearing
            searchParams.orig = { start: query.start, end: query.end };

            query.start = Math.max( query.start - searchParams.maxLen, this.refSeq.start );
            query.end = Math.min( query.end + searchParams.maxLen, this.refSeq.end );

            this.refSeqStore.getFeatures(query,
                dojo.hitch(this, function( feature ) {
                    this.getSearchResults( feature, searchParams, featCallback );
                }), doneCallback, errorCallback );
        },

        getSearchResults: function( feature, params, featCallback ) {

            var expr = new RegExp( params.regex ? params.expr : this.escapeString( params.expr ), params.caseIgnore ? "gi" : "g" );

            var start = Math.max( feature.get('start'), this.refSeq.start );

            var end = Math.min( feature.get('end'), this.refSeq.end );

            var features = [];

            var thisB = this;
            
            var _searchFeatureResults = function( sequence, expr, strand, translated, frameOffset ) {

                if( translated )
                    sequence = thisB.translateSequence( sequence, frameOffset );

                frameOffset = frameOffset || 0;
                var multiplier = translated ? 3 : 1;

                var features = [];
                var match;
                while( (match = expr.exec( sequence )) !== null && match.length ) {
                    expr.lastIndex = match.index + 1;

                    var result = match[0];

                    var newStart = strand > 0 ? start + frameOffset + multiplier*match.index
                        : end - frameOffset - multiplier*(match.index + result.length);
                    var newEnd = strand > 0 ? start + frameOffset + multiplier*(match.index + result.length)
                        : end - frameOffset - multiplier*match.index;

                    var newFeat = new SimpleFeature( { data: {
                        start: newStart,
                        end: newEnd,
                        searchResult: result,
                        strand: strand,
                    } });

                    if( !thisB._queryOverlaps( params.orig, newFeat.data ) )
                        continue;
                    newFeat.id( newFeat.data.start + "_" + newFeat.data.end + "_" + newFeat.data.strand )
                    features.push( newFeat );
                }
                return features;
            }

            if( params.fwdStrand ) {

                var sequence = feature.get( 'seq' );

                if( params.translate ) {
                    for( var frameOffset = 0; frameOffset < 3; frameOffset++ ) {
                        features = features.concat(_searchFeatureResults( sequence, expr, 1, true, frameOffset ));
                    }
                } else {
                    features = features.concat( _searchFeatureResults( sequence, expr, 1 ) );
                }
            }

            if( params.revStrand ) {
                var sequence = Util.revcom( feature.get('seq') );

                if( params.translate ) {
                    for( var frameOffset = 0; frameOffset < 3; frameOffset++ ) {
                        features = features.concat(_searchFeatureResults( sequence, expr, -1, true, frameOffset ));
                    }
                } else {
                    features = features.concat( _searchFeatureResults( sequence, expr, -1 ) )
                }
            }

            array.forEach( features, function( feature ) {
                featCallback( feature );
            });
        },

        _queryOverlaps: function( query, feature ) {
            return !( feature.end < query.start || feature.start > query.end );
        },

        translateSequence: function( sequence, frameOffset ) {
            var slicedSeq = sequence.slice( frameOffset );
            slicedSeq = slicedSeq.slice( 0, Math.floor( slicedSeq.length / 3 ) * 3);
            
            var translated = "";
            for(var i = 0; i < slicedSeq.length; i += 3) {
                var nextCodon = slicedSeq.slice(i, i + 3);
                translated = translated + CodonTable[nextCodon];
            }

            return translated;
        },

        escapeString: function( str ) {
            return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        }

    });
});