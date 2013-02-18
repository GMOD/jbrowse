/**
 * The scaling used for drawing a Wiggle track, which is the data's
 * origin.
 *
 * Has numeric attributes range, min, max, origin, and offset.
 */

define([
           'JBrowse/Util',
           'JBrowse/Digest/Crc32'
       ],
       function( Util, Digest ) {
return Util.fastDeclare({

    constructor: function( track, stats ) {

        if( stats.scoreMin == stats.scoreMax ) {
            stats = dojo.clone( stats );
            if( stats.scoreMin < 0 )
                stats.scoreMax = 0;
            else
                stats.scoreMin = 0;
        }

        // if either autoscale or scale is set to z_score, the other one should default to z_score
        if( track.config.autoscale == 'z_score' && ! track.config.scale
            || track.config.scale == 'z_score'  && !track.config.autoscale
          ) {
              track.config.scale = 'z_score';
              track.config.autoscale = 'z_score';
          }

        var z_score_bound = parseFloat( track.config.z_score_bound ) || 4;
        var min = 'min_score' in track.config ? parseFloat( track.config.min_score ) :
            (function() {
                 switch( track.config.autoscale ) {
                     case 'z_score':
                         return Math.max( -z_score_bound, (stats.scoreMin-stats.scoreMean) / stats.scoreStdDev );
                     case 'global':
                     case 'local':
                         return stats.scoreMin;
                     case 'clipped_global':
                     default:
                         return Math.max( stats.scoreMin, stats.scoreMean - z_score_bound * stats.scoreStdDev );
                 }
             })();
        var max = 'max_score' in track.config ? parseFloat( track.config.max_score ) :
            (function() {
                 switch( track.config.autoscale ) {
                     case 'z_score':
                         return Math.min( z_score_bound, (stats.scoreMax-stats.scoreMean) / stats.scoreStdDev );
                     case 'global':
                     case 'local':
                         return stats.scoreMax;
                     case 'clipped_global':
                     default:
                         return Math.min( stats.scoreMax, stats.scoreMean + z_score_bound * stats.scoreStdDev );
                 }
             })();

        if( typeof max != 'number' || isNaN(max) ) {
            throw 'cannot display track '+track.name+', could not determine max_score.  Do you need to set max_score in its configuration?';
        }
        if( typeof min != 'number' || isNaN(min) ) {
            throw 'cannot display track '+track.name+', could not determine min_score.  Do you need to set min_score in its configuration?';
        }

        // if we have a log scale, need to take the log of the min and max
        if( track.config.scale == 'log' ) {
            max = Math.log(max);
            min = min ? Math.log(min) : 0;
        }

        var offset = parseFloat( track.config.data_offset ) || 0;
        var origin = (function() {
          if ( 'bicolor_pivot' in track.config ) {
            if ( track.config.bicolor_pivot == 'mean' ) {
              return stats.scoreMean || 0;
            } else if ( track.config.bicolor_pivot == 'zero' ) {
              return 0;
            } else {
              return parseFloat( track.config.bicolor_pivot );
            }
          } else if ( track.config.scale == 'z_score' ) {
            return stats.scoreMean || 0;
          } else if ( track.config.scale == 'log' ) {
            return 1;
          } else {
            return 0;
          }
        })();

        dojo.mixin( this, {
            offset: offset,
            min: min + offset,
            max: max + offset,
            range: max - min,
            origin: origin,
            _statsFingerprint: Digest.objectFingerprint( stats )
        });

        // make this.normalize a func that converts wiggle values to a
        // range between 0 and 1, depending on what kind of scale we
        // are using
        var thisB = this;
        this.normalize = (function() {
            switch( track.config.scale ) {
            case 'z_score':
                return function( value ) {
                    with(thisB)
                        return (value+offset-stats.scoreMean) / stats.scoreStdDev-min / range;
                };
            case 'log':
                return function( value ) {
                    with(thisB)
                        return ( Math.log(value+offset) - min )/range;
                };
            case 'linear':
            default:
                return function( value ) {
                    with(thisB)
                        return ( value + offset - min ) / range;
                };
            }
        })();
    },

    /**
     * Standard comparison function, compare this scale to another one.
     */
    compare: function( b ) {
        if( ! b ) return 1;

        var a = this;
        return ( a.offset - b.offset )
          || ( a.min - b.min )
          || ( a.max - b.max )
          || ( a.range - b.range )
          || ( a.origin - b.origin );
    },

    /**
     * Return true if this scaling was generated from the same set of stats.
     */
    sameStats: function( stats ) {
        return this._statsFingerprint == Digest.objectFingerprint( stats );
    }
});
});