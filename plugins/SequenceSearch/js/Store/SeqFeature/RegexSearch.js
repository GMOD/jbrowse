define([
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'JBrowse/Store/SeqFeature',
        'JBrowse/Model/SimpleFeature',
        'JBrowse/Util',
        'JBrowse/CodonTable'
    ],
    function(
        declare,
        array,
        lang,
        SeqFeatureStore,
        SimpleFeature,
        Util,
        CodonTable
    ) {


    return declare( SeqFeatureStore , {

        constructor: function( args ) {
            this.searchParams = args.searchParams;
        },

        setSearchParams: function( params ) {
            this.searchParams = params;
        },

        getFeatures: function( query, featCallback, doneCallback, errorCallback ) {
            var searchParams = lang.mixin(
                // store the original query bounds - this helps prevent features from randomly disappearing
                { orig: { start: query.start, end: query.end }},
                this.searchParams,
                query.searchParams
            );

            var thisB = this;
            this.browser.getStore('refseqs', function( refSeqStore ) {
                if( refSeqStore )
                    refSeqStore.getReferenceSequence(
                        query,
                        function( sequence ) {
                            thisB.doSearch( query, sequence, searchParams, featCallback );
                            doneCallback();
                        },
                        errorCallback
                    );
                 else
                     doneCallback();
             });
        },

        doSearch: function( query, sequence, params, featCallback ) {
            var expr = new RegExp(
                params.regex ? params.expr : this.escapeString( params.expr ),
                params.caseIgnore ? "gi" : "g"
            );

            if( params.fwdStrand ) {
                if( params.translate ) {
                    for( var frameOffset = 0; frameOffset < 3; frameOffset++ ) {
                        this._searchSequence( query, sequence, expr, 1, featCallback, true, frameOffset );
                    }
                } else {
                    this._searchSequence( query, sequence, expr, 1, featCallback );
                }
            }

            if( params.revStrand ) {
                var revseq = Util.revcom( sequence );

                if( params.translate ) {
                    for( var frameOffset = 0; frameOffset < 3; frameOffset++ ) {
                        this._searchSequence( query, revseq, expr, -1, featCallback, true, frameOffset );
                    }
                } else {
                    this._searchSequence( query, revseq, expr, -1, featCallback );
                }
            }

        },

        _searchSequence: function( query, sequence, expr, strand, featCallback, translated, frameOffset ) {
            if( translated )
                sequence = this.translateSequence( sequence, frameOffset );

            frameOffset = frameOffset || 0;
            var multiplier = translated ? 3 : 1;

            var start = query.start, end = query.end;

            var features = [];
            var match;
            while( (match = expr.exec( sequence )) !== null && match.length ) {
                expr.lastIndex = match.index + 1;

                var result = match[0];

                var newStart = strand > 0 ? start + frameOffset + multiplier*match.index
                    : end - frameOffset - multiplier*(match.index + result.length);
                var newEnd = strand > 0 ? start + frameOffset + multiplier*(match.index + result.length)
                    : end - frameOffset - multiplier*match.index;

                var newFeat = new SimpleFeature(
                    {
                        data: {
                            start: newStart,
                            end: newEnd,
                            searchMatch: result,
                            strand: strand
                        },
                        id: [newStart,newEnd,result].join(',')
                    });
                featCallback( newFeat );
            }
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