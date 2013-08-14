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

    // Returns a boolean value saying whether a stats object is needed
    // to calculate the scale for the given configuration.
    //
    // This is invokable either on the class (prototype) or on
    // the object itself, so does not use `this` in its implementation.
    needStats: function( config ) {
        return !(
                 ( 'minScore' in config )
              && ( 'maxScore' in config )
              && ( config.bicolorPivot != 'zScore' && config.bicolorPivot != 'mean' )
              && ( config.scale != 'zScore' )
            );
    },

    constructor: function( config, stats ) {
        var needStats = this.needStats( config );
        if( needStats && !stats )
            throw 'No stats object provided, cannot calculate scale';

        if( needStats && stats.scoreMin == stats.scoreMax ) {
            stats = dojo.clone( stats );
            if( stats.scoreMin < 0 )
                stats.scoreMax = 0;
            else
                stats.scoreMin = 0;
        }

        // if either autoscale or scale is set to zScore, the other one should default to zScore
        if( config.autoscale == 'zScore' && ! config.scale
            || config.scale == 'zScore'  && !config.autoscale
          ) {
              config.scale = 'zScore';
              config.autoscale = 'zScore';
          }

        var zScoreBound = parseFloat( config.zScoreBound ) || 4;
        var min = 'minScore' in config ? parseFloat( config.minScore ) :
            (function() {
                 switch( config.autoscale ) {
                     case 'zScore':
                         return Math.max( -zScoreBound, (stats.scoreMin-stats.scoreMean) / stats.scoreStdDev );
                     case 'global':
                     case 'local':
                         return stats.scoreMin;
                     case 'clippedGlobal':
                     default:
                         return Math.max( stats.scoreMin, stats.scoreMean - zScoreBound * stats.scoreStdDev );
                 }
             })();
        var max = 'maxScore' in config ? parseFloat( config.maxScore ) :
            (function() {
                 switch( config.autoscale ) {
                     case 'zScore':
                         return Math.min( zScoreBound, (stats.scoreMax-stats.scoreMean) / stats.scoreStdDev );
                     case 'global':
                     case 'local':
                         return stats.scoreMax;
                     case 'clippedGlobal':
                     default:
                         return Math.min( stats.scoreMax, stats.scoreMean + zScoreBound * stats.scoreStdDev );
                 }
             })();

        if( typeof min != 'number' || isNaN(min) ) {
            min = 0;
        }
        if( typeof max != 'number' || isNaN(max) ) {
            max = min + 10;
        }

        var offset = config.dataOffset || 0;

        if( config.scale == 'log' ) {
            max = this.log( max + offset );
            min = this.log( min + offset );
        }
        else {
            max += offset;
            min += offset;
        }

        var origin = (function() {
          if ( 'bicolorPivot' in config ) {
            if ( config.bicolorPivot == 'mean' ) {
              return stats.scoreMean || 0;
            } else if ( config.bicolorPivot == 'zero' ) {
              return 0;
            } else {
              return parseFloat( config.bicolorPivot );
            }
          } else if ( config.scale == 'zScore' ) {
            return stats.scoreMean || 0;
          } else if ( config.scale == 'log' ) {
            return 1;
          } else {
            return 0;
          }
        })();

        dojo.mixin( this, {
            offset: offset,
            min: min,
            max: max,
            range: max - min,
            origin: origin,
            _statsFingerprint: Digest.objectFingerprint( stats )
        });

        // make this.normalize a func that converts wiggle values to a
        // range between 0 and 1, depending on what kind of scale we
        // are using
        var thisB = this;
        this.normalize = (function() {
            switch( config.scale ) {
            case 'zScore':
                return function( value ) {
                    with(thisB)
                        return (value+offset-stats.scoreMean) / stats.scoreStdDev-min / range;
                };
            case 'log':
                return function( value ) {
                    with(thisB)
                        return ( thisB.log(value+offset) - min )/range;
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

    log: function( value ) {
        return value ? Math.log( Math.abs( value ) ) * ( value < 0 ? -1 : 1 )
                     : 0;
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