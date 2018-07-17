/**
 * Functions for parsing MD and CIGAR strings.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array'
        ],
        function(
            declare,
            array
        ) {

return declare( null, {

    constructor: function() {
        this.cigarAttributeName = ( this.config.cigarAttribute || 'cigar' ).toLowerCase();
        this.mdAttributeName    = ( this.config.mdAttribute    || 'md'    ).toLowerCase();
    },

    _getSkipsAndDeletions: function( feature ) {
        let mismatches = []
        // parse the CIGAR tag if it has one
        var cigarString = feature.get( this.cigarAttributeName );
        if( cigarString ) {
            mismatches = this._cigarToSkipsAndDeletions( feature, this._parseCigar( cigarString ) );
        }

        var cramReadFeatures = feature.get('cram_read_features')
        if( this.config.renderAlignment &&
            cramReadFeatures &&
            cramReadFeatures.length
        ) {
            mismatches = mismatches.filter( m =>
                !(m.type == "deletion" || m.type == "mismatch")
            )
        }

        // parse the CRAM read features if it has them
        if( cramReadFeatures ) {
            mismatches.push(
                ...this._cramReadFeaturesToMismatches(feature,cramReadFeatures)
                    .filter(m => m.type === 'skip' || m.type === 'deletion')
            )
        }

        return mismatches
    },

    _getMismatches: function( feature ) {
        var mismatches = [];
        if( this.config.cacheMismatches && feature.mismatches ) {
            return feature.mismatches;
        }

        // parse the CIGAR tag if it has one
        var cigarString = feature.get( this.cigarAttributeName ),
            cigarOps;
        if( cigarString ) {
            cigarOps = this._parseCigar( cigarString );
            mismatches.push.apply( mismatches, this._cigarToMismatches( feature, cigarOps ) );
        }

        // now let's look for CRAM or MD mismatches
        var cramReadFeatures = feature.get('cram_read_features')
        var mdString = feature.get( this.mdAttributeName );

        // if there is an MD tag or CRAM mismatches, mismatches and deletions from the
        // CIGAR string are replaced by those from MD
        if( this.config.renderAlignment &&
            (
                cramReadFeatures && cramReadFeatures.length ||
                mdString
            )
        ) {
            mismatches = mismatches.filter( m =>
                !(m.type == "deletion" || m.type == "mismatch")
            )
        }

        // parse the CRAM read features if it has them
        if( cramReadFeatures ) {
            mismatches.push(...this._cramReadFeaturesToMismatches(feature,cramReadFeatures) )
        }

        // parse the MD tag if it has one
        if( mdString )  {
            mismatches.push(...this._mdToMismatches( feature, mdString, cigarOps, mismatches ))
        }

        // uniqify the mismatches
        var seen = {};
        mismatches = array.filter( mismatches, function( m ) {
            var key = m.type+','+m.start+','+m.length;
            var s = seen[key];
            seen[key] = true;
            return !s;
        });
        if( this.config.cacheMismatches ) {
            feature.mismatches = mismatches;
        }

        return mismatches;
    },

    _parseCigar: function( cigar ) {
        return array.map( cigar.toUpperCase().match(/\d+\D/g), function( op ) {
           return [ op.match(/\D/)[0], parseInt( op ) ];
        });
    },

    _cramReadFeaturesToMismatches(feature, readFeatures) {
        const start = feature.get('start')
        const mismatches = []
        readFeatures.forEach(({code,refPos,data,sub,ref}) => {
            refPos = refPos - 1 - start
            if (code === 'X') {
                // substitution
                mismatches.push({
                    start: refPos,
                    length: 1,
                    base: sub,
                    altbase: ref,
                    type: 'mismatch',
                })
            } else if (code === 'I') {
                // insertion
               mismatches.push({
                   start: refPos,
                   type: 'insertion',
                   base: ''+data.length,
                   length: data.length,
                });
            } else if (code === 'N') {
                // reference skip
                mismatches.push({
                    type: 'skip',
                    length: data,
                    start: refPos,
                    base: 'N',
                })
            } else if (code === 'S') {
                // soft clip
                const len = data.length
                mismatches.push({
                    start: refPos,
                    type: 'softclip',
                    base: 'S'+len,
                    cliplen: len,
                    length: 1,
                })
            } else if (code === 'P') {
                // padding
            } else if (code === 'H') {
                // hard clip
                const len = data.length
                mismatches.push({
                    start: refPos,
                    type: 'hardclip',
                    base: 'H'+len,
                    cliplen: len,
                    length: 1,
                })
            } else if (code === 'D') {
                // deletion
                mismatches.push({
                    type: 'deletion',
                    length: data,
                    start: refPos,
                    base: '*',
                })
            } else if( code === 'b') {
                // stretch of bases
            } else if (code === 'q') {
                // stretch of qual scores
            } else if (code === 'B') {
                // a pair of [base, qual]
            } else if (code === 'i') {
                // single-base insertion
                // insertion
               mismatches.push({
                start: refPos,
                type: 'insertion',
                base: data,
                length: 1,
             });
            } else if (code === 'Q') {
                // single quality value
            }
        })
        return mismatches
    },

    _cigarToMismatches: function( feature, ops ) {
        var currOffset = 0;
        var mismatches = [];
        array.forEach( ops, function( oprec ) {
           var op  = oprec[0];
           var len = oprec[1];
           // if( op == 'M' || op == '=' || op == 'E' ) {
           //     // nothing
           // }
           if( op == 'I' )
               // GAH: shouldn't length of insertion really by 0, since JBrowse internally uses zero-interbase coordinates?
               mismatches.push( { start: currOffset, type: 'insertion', base: ''+len, length: 1 });
           else if( op == 'D' )
               mismatches.push( { start: currOffset, type: 'deletion',  base: '*', length: len  });
           else if( op == 'N' )
               mismatches.push( { start: currOffset, type: 'skip',      base: 'N', length: len  });
           else if( op == 'X' )
               mismatches.push( { start: currOffset, type: 'mismatch',  base: 'X', length: len  });
           else if( op == 'H' )
               mismatches.push( { start: currOffset, type: 'hardclip',  base: 'H'+len, length: 1 });
           else if( op == 'S' )
               mismatches.push( { start: currOffset, type: 'softclip',  base: 'S'+len, cliplen: len, length: 1 });

           if( op != 'I' && op != 'S' && op != 'H' )
               currOffset += len;
        });
        return mismatches;
    },

    // parse just the skips and deletions out of a CIGAR string
    _cigarToSkipsAndDeletions: function( feature, ops ) {
        var currOffset = 0;
        var mismatches = [];
        array.forEach( ops, function( oprec ) {
           var op  = oprec[0];
           var len = oprec[1];
           if( op == 'D' )
               mismatches.push( { start: currOffset, type: 'deletion',  base: '*', length: len  });
           else if( op == 'N' )
               mismatches.push( { start: currOffset, type: 'skip',      base: 'N', length: len  });

           if( op != 'I' && op != 'S' && op != 'H' )
               currOffset += len;
        });
        return mismatches;
    },

    /**
     * parse a SAM MD tag to find mismatching bases of the template versus the reference
     * @returns {Array[Object]} array of mismatches and their positions
     * @private
     */
    _mdToMismatches: function( feature, mdstring, cigarOps, cigarMismatches ) {
        var mismatchRecords = [];
        var curr = { start: 0, base: '', length: 0, type: 'mismatch' };

        // convert a position on the reference sequence to a position
        // on the template sequence, taking into account hard and soft
        // clipping of reads
        function getTemplateCoord( refCoord, cigarOps ) {
            var templateOffset = 0;
            var refOffset = 0;
            for( var i = 0; i < cigarOps.length && refOffset <= refCoord ; i++ ) {
                var op  = cigarOps[i][0];
                var len = cigarOps[i][1];
                if( op == 'S' || op == 'I' ) {
                    templateOffset += len;
                }
                else if( op == 'D' || op == 'P' ) {
                    refOffset += len;
                }
                else {
                    templateOffset += len;
                    refOffset += len;
                }
            }
            return templateOffset - ( refOffset - refCoord );
        }


        function nextRecord() {
            // correct the start of the current mismatch if it comes after a cigar skip
            var skipOffset = 0;
            array.forEach( cigarMismatches || [], function( mismatch ) {
                if( mismatch.type == 'skip' && curr.start >= mismatch.start ) {
                    curr.start += mismatch.length;
                }
            });

            // record it
            mismatchRecords.push( curr );

            // get a new mismatch record ready
            curr = { start: curr.start + curr.length, length: 0, base: '', type: 'mismatch'};
        };

        var seq = feature.get('seq');

        // now actually parse the MD string
        array.forEach( mdstring.match(/(\d+|\^[a-z]+|[a-z])/ig), function( token ) {
          if( token.match(/^\d/) ) { // matching bases
              curr.start += parseInt( token );
          }
          else if( token.match(/^\^/) ) { // insertion in the template
              curr.length = token.length-1;
              curr.base   = '*';
              curr.type   = 'deletion';
              curr.seq    = token.substring(1);
              nextRecord();
          }
          else if( token.match(/^[a-z]/i) ) { // mismatch
              for( var i = 0; i<token.length; i++ ) {
                  curr.length = 1;
                  curr.base = seq ? seq.substr( cigarOps ? getTemplateCoord( curr.start, cigarOps)
                                                         : curr.start,
                                                1
                                              )
                                  : 'X';
                  curr.altbase = token;
                  nextRecord();
              }
          }
        });
        return mismatchRecords;
    }
});
});
