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
        this.cigarAttributeName = ( this.getConf('cigarAttribute') || 'cigar' ).toLowerCase();
        this.mdAttributeName    = ( this.getConf('mdAttribute')    || 'md'    ).toLowerCase();
    },

    _configSchemaDefinition: function() {
        var def = this.inherited( arguments );
        def.slots.push.apply( def.slots, [
            { name: 'cigarAttribute', type: 'string', defaultValue: 'cigar' },
            { name: 'mdAttribute', type: 'string', defaultValue: 'md' }
        ]);
        return def;
    },

    _getMismatches: function( feature ) {
        var mismatches = [];

        // parse the CIGAR tag if it has one
        var cigarString = feature.get( this.cigarAttributeName ),
            cigarOps;
        if( cigarString ) {
            cigarOps = this._parseCigar( cigarString );
            mismatches.push.apply( mismatches, this._cigarToMismatches( feature, cigarOps ) );
        }

        // parse the MD tag if it has one
        var mdString = feature.get( this.mdAttributeName );
        if( mdString )  {
            mismatches.push.apply( mismatches, this._mdToMismatches( feature, mdString, cigarOps, mismatches ) );
        }

        return mismatches;
    },

    _parseCigar: function( cigar ) {
        return array.map( cigar.match(/\d+\D/g), function( op ) {
           return [ op.match(/\D/)[0].toUpperCase(), parseInt( op ) ];
        });
    },

    _cigarToMismatches: function( feature, ops ) {
        var currOffset = 0;
        var mismatches = [];
        array.forEach( ops, function( oprec ) {
           var op  = oprec[0].toUpperCase();
           if( !op )
               return;
           var len = oprec[1];
           // if( op == 'M' || op == '=' || op == 'E' ) {
           //     // nothing
           // }
           if( op == 'I' )
               mismatches.push( { start: currOffset, type: 'insertion', base: ''+len, length: 1 });
           else if( op == 'D' )
               mismatches.push( { start: currOffset, type: 'deletion',  base: '*', length: len  });
           else if( op == 'N' )
               mismatches.push( { start: currOffset, type: 'skip',      base: 'N', length: len  });
           else if( op == 'X' )
               mismatches.push( { start: currOffset, type: 'mismatch',  base: 'X', length: len  });

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

        // number of bases soft-clipped off the beginning of the template seq

        function getTemplateCoord( refCoord, cigarOps ) {
            var templateOffset = 0;
            var refOffset = 0;
            for( var i = 0; i < cigarOps.length && refOffset <= refCoord ; i++ ) {
                var op  = cigarOps[i][0];
                var len = cigarOps[i][1];
                if( op == 'H' || op == 'S' || op == 'I' ) {
                    templateOffset += len;
                }
                else if( op == 'D' || op == 'N' || op == 'P' ) {
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
                    curr.start += mismatch.len;
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
              nextRecord();
          }
          else if( token.match(/^[a-z]/i) ) { // mismatch
              for( var i = 0; i<token.length; i++ ) {
                  curr.length = 1;
                  curr.base = seq ? seq.substr( getTemplateCoord( curr.start, cigarOps), 1 ) : 'X';
                  nextRecord();
              }
          }
        });
        return mismatchRecords;
    }
});
});