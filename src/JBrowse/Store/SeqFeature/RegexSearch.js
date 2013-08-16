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

/*        _searchResultFeatures: function( sequence, expr, start, end, orig, strand, translated, frameOffset ) {
            var features = [];
            var match;

            frameOffset = frameOffset || 0;

            var relevantEnd = strand > 0 ? start : end;
            var multiplier = translated ? 3 : 1;

            while( (match = expr.exec( sequence )) !== null && match.length ) {
                expr.lastIndex = match.index + 1;

                var result = match[0];

                var featStart = relevantEnd + strand*( frameOffset + multiplier * match.index );
                var featLength = multiplier * result.length;

                var newFeat = new SimpleFeature( { data: {
                    start: Math.min( featStart, featStart + strand * featLength ),
                    end: Math.max( featStart, featStart + strand * featLength ),
                    strand: strand
                } });

                if( !this._queryOverlaps( orig, newFeat.data ) )
                    continue;
                newFeat.id( newFeat.data.start + "_" + newFeat.data.end + "_" + newFeat.data.strand )
                features.push( newFeat );
            }
            return features;
        },*/

        getSearchResults: function( feature, params, featCallback ) {

            var expr = new RegExp( params.regex ? params.expr : this.escapeString( params.expr ), params.caseIgnore ? "gi" : "g" );

            var start = Math.max( feature.get('start'), this.refSeq.start );

            var end = Math.min( feature.get('end'), this.refSeq.end );

            var features = [];

            if( params.fwdStrand ) {

                var sequence = feature.get( 'seq' );
                var match;

                if( params.translate ) {
                    for( var frameOffset = 0; frameOffset < 3; frameOffset++ ) {
                        var translatedSequence = this.translateSequence( sequence, frameOffset );
                        while( (match = expr.exec( translatedSequence )) !== null && match.length ) {
                            expr.lastIndex = match.index + 1;

                            var result = match[0];

                            var newFeat = new SimpleFeature( { data: {
                                start: start + frameOffset + 3*match.index,
                                end: start + frameOffset + 3*(match.index + result.length),
                                searchResult: result,
                                strand: 1,
                            } });

                            if( !this._queryOverlaps( params.orig, newFeat.data ) )
                                continue;
                            newFeat.id( newFeat.data.start + "_" + newFeat.data.end + "_" + newFeat.data.strand )
                            features.push( newFeat );
                        }
                    }
                } else {
                    while( (match = expr.exec( sequence )) !== null && match.length ) {
                        expr.lastIndex = match.index + 1;

                        var result = match[0];

                        var newFeat = new SimpleFeature( { data: {
                            start: start + match.index,
                            end: start + match.index + result.length,
                            searchResult: result,
                            strand: 1,
                        } });

                        if( !this._queryOverlaps( params.orig, newFeat.data ) )
                            continue;
                        newFeat.id( newFeat.data.start + "_" + newFeat.data.end + "_" + newFeat.data.strand )
                        features.push( newFeat );
                    }
                }
            }

            if( params.revStrand ) {
                var sequence = Util.revcom( feature.get('seq') );
                var match;

                if( params.translate ) {
                    for( var frameOffset = 0; frameOffset < 3; frameOffset++ ) {
                        var translatedSequence = this.translateSequence( sequence, frameOffset );
                        while( (match = expr.exec( translatedSequence )) !== null && match.length ) {
                            expr.lastIndex = match.index + 1; // Prevent infinite loops for zero-length features

                            var result = match[0];

                            var newFeat = new SimpleFeature( { data: {
                                start: end - frameOffset - 3*( match.index + result.length ),
                                end: end - frameOffset - 3*match.index,
                                searchResult: result,
                                strand: -1
                            } });
                            if( !this._queryOverlaps( params.orig, newFeat.data ) )
                                continue;

                            newFeat.id( newFeat.data.start + "_" + newFeat.data.end + "_" + newFeat.data.strand );
                            features.push( newFeat );
                        }
                    }
                } else {
                    while( (match = expr.exec( sequence )) !== null && match.length ) {
                        expr.lastIndex = match.index + 1; // Prevent infinite loops for zero-length features

                        var result = match[0];

                        var newFeat = new SimpleFeature( { data: {
                            start: end - ( match.index + result.length ),
                            end: end - match.index,
                            searchResult: result,
                            strand: -1
                        } });
                        if( !this._queryOverlaps( params.orig, newFeat.data ) )
                            continue;

                        newFeat.id( newFeat.data.start + "_" + newFeat.data.end + "_" + newFeat.data.strand );
                        features.push( newFeat );
                    }
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