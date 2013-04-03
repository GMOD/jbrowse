/**
 * Store that encapsulates another store, which is expected to have
 * features in it that have CIGAR and MD attributes.  Produces
 * features that include SNP allele frequencies.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Model/NestedFrequencyTable',
           'JBrowse/Model/CoverageFeature'
       ],
       function(
           declare,
           array,
           SeqFeatureStore,
           NestedFrequencyTable,
           CoverageFeature
       ) {

return declare( SeqFeatureStore, {

    constructor: function( args ) {
        this.store = args.store;
    },

    getGlobalStats: function( callback, errorCallback ) {
        callback( {} );
    },

    getFeatures: function( query, featureCallback, finishCallback, errorCallback ) {
        var thisB = this;
        var leftBase  = query.start;
        var rightBase = query.end;
        var scale = query.scale || ('basesPerSpan' in query ) ? 1/query.basesPerSpan : 10; // px/bp
        var widthBp = rightBase-leftBase;
        var widthPx = widthBp * scale;

        var binWidth = function() {
            var bpPerPixel = 1/scale;
            if( bpPerPixel <= 30 ) {
                return 1;
            } else {
                return Math.ceil( bpPerPixel );
            }
        }();

        var binNumber = function( bp ) {
            return Math.floor( (bp-leftBase) / binWidth );
        };

        // init coverage bins
        var maxBin = binNumber( rightBase );
        var coverageBins = new Array( maxBin+1 );
        for( var i = 0; i <= maxBin; i++ ) {
            coverageBins[i] = new NestedFrequencyTable();
        }
        var binOverlap = function( bp, isRightEnd ) {
            var binCoord  = (bp-leftBase) / binWidth;
            var binNumber = Math.floor( binCoord );

            // only calculate the overlap if this lies in this block
            if( binNumber >= 0 && binNumber <= maxBin ) {
                var overlap =
                    isRightEnd ? 1 - ( binCoord - binNumber )
                               : binCoord - binNumber;
                return {
                    bin: binNumber,
                    overlap: overlap // between 0 and 1: proportion of this bin that the feature overlaps
                };
            }
            // otherwise null, this feature goes outside the block
            else {
                return isRightEnd ? { bin: maxBin, overlap: 1 }
                                  : { bin: 0,      overlap: 1 };
            }
        };


        thisB.store.getFeatures(
            query,
            function( feature ) {

                // calculate total coverage
                var startBO = binOverlap( feature.get('start'), false );
                var endBO   = binOverlap( feature.get('end')-1  , true  );

                // increment start and end partial-overlap bins by proportion of overlap
                if( startBO.bin == endBO.bin ) {
                    coverageBins[startBO.bin].increment( 'reference', endBO.overlap + startBO.overlap - 1 );
                }
                else {
                    coverageBins[startBO.bin].increment( 'reference', startBO.overlap );
                    coverageBins[endBO.bin].increment(   'reference', endBO.overlap   );
                }

                // increment completely overlapped interior bins by 1
                for( var i = startBO.bin+1; i <= endBO.bin-1; i++ ) {
                    coverageBins[i].increment( 'reference', 1 );
                }


                // Calculate SNP coverage
                if( binWidth == 1 ) {

                    // mark each bin as having its snps counted
                    for( var i = startBO.bin; i <= endBO.bin; i++ ) {
                        coverageBins[i].snpsCounted = 1;
                    }

                    // parse the MD
                    var mdTag = feature.get('md');
                    if( mdTag ) {
                        var SNPs = thisB._mdToMismatches(feature, mdTag);
                        // loops through mismatches and updates coverage variables accordingly.
                        for (var i = 0; i<SNPs.length; i++) {
                            var pos = binNumber( feature.get('start') + SNPs[i].start );
                            var bin = coverageBins[pos];
                            if( bin ) {
                                var strand = { '-1': '-', '1': '+' }[ ''+feature.get('strand') ] || 'unstranded';
                                // Note: we decrement 'reference' so that total of the score is the total coverage
                                bin.decrement('reference', 1/binWidth );
                                var base = SNPs[i].bases;
                                bin.getNested(base).increment(strand, 1/binWidth);
                            }
                        }
                    }

                }
            },
            function ( args ) {
                var makeFeatures = function() {
                    // make fake features from the coverage
                    for( var i = 0; i <= maxBin; i++ ) {
                        var bpOffset = leftBase+binWidth*i;
                        featureCallback( new CoverageFeature({
                            start: bpOffset,
                            end:   bpOffset+binWidth,
                            score: coverageBins[i]
                         }));
                    }
                    finishCallback( args ); // optional arguments may change callback behaviour (e.g. add masking)
                };

                // if we are zoomed to base level, try to fetch the
                // reference sequence for this region and record each
                // of the bases in the coverage bins
                if( binWidth == 1 ) {
                    var sequence;
                    thisB.browser.getStore( 'refseqs', function( refSeqStore ) {
                        if( refSeqStore ) {
                            refSeqStore.getFeatures( query,
                                                     function(f) {
                                                         sequence = f.get('seq');
                                                     },
                                                     function() {
                                                         if( sequence ) {
                                                             for( var base = leftBase; base <= rightBase; base++ ) {
                                                                 var bin = binNumber( base );
                                                                 coverageBins[bin].refBase = sequence[bin];
                                                             }
                                                         }
                                                         makeFeatures();
                                                     },
                                                     makeFeatures
                                                   );
                        } else {
                            makeFeatures();
                        }
                    });
                } else {
                    makeFeatures();
                }
            }
        );
    },


    /**
     * parse a SAM MD tag to find mismatching bases of the template versus the reference
     * @returns {Array[Object]} array of mismatches and their positions
     */
    _mdToMismatches: function( feature, mdstring ) {
        var mismatchRecords = [];
        var curr = { start: 0, bases: '' };
        var seq = feature.get('seq');
        var nextRecord = function() {
              mismatchRecords.push( curr );
              curr = { start: curr.start + curr.bases.length, bases: ''};
        };
        array.forEach( mdstring.match(/(\d+|\^[a-z]+|[a-z])/ig), function( token ) {
          if( token.match(/^\d/) ) { // matching bases
              curr.start += parseInt( token );
          }
          else if( token.match(/^\^/) ) { // insertion in the template
              var i = token.length-1;
              while( i-- ) {
                  curr.bases = '*';
                  nextRecord();
              }
          }
          else if( token.match(/^[a-z]/i) ) { // mismatch
              curr.bases = seq.substr( curr.start, token.length );
              nextRecord();
          }
        });
        return mismatchRecords;
    }

});
});
