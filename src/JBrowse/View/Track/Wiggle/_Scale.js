/**
 * The scaling used for drawing a Wiggle track, which is the data's
 * origin.
 *
 * Has numeric attributes range, min, max, origin, and offset.
 */

define([
           'dojo/_base/lang',
           'JBrowse/Util',
           'JBrowse/Digest/Crc32'
       ],
       function( lang,
                 Util,
                 Digest
               ) {
return Util.fastDeclare({

    // Returns a boolean value saying whether a stats object is needed
    // to calculate the scale for the given configuration.
    //
    // This is invokable either on the class (prototype) or on
    // the object itself, so does not use `this` in its implementation.
    needStats: function( trackView ) {
        return !(
                  trackView.getConf('minScore') !== undefined
              &&  trackView.getConf('maxScore') !== undefined
              &&  !{zScore:true,mean:true}[trackView.getConf('bicolorPivot')]
              &&  trackView.getConf('scale') != 'zScore'
            );
    },

    constructor: function( trackView, stats ) {
        var needStats = this.needStats( trackView );
        if( needStats && !stats )
            throw 'No stats object provided, cannot calculate scale';

        if( needStats && stats.scoreMin == stats.scoreMax ) {
            stats = lang.mixin( {}, stats );
            if( stats.scoreMin < 0 )
                stats.scoreMax = 0;
            else
                stats.scoreMin = 0;
        }

        // if either autoscale or scale is set to zScore, the other one should default to zScore
        if( trackView.getConf('autoscale') == 'zScore' && ! trackView.getConf('scale')
            || trackView.getConf('scale') == 'zScore'  && ! trackView.getConf('autoscale')
          ) {
              trackView.setConf('scale','zScore');
              trackView.setConf('autoscale','zScore');
          }

        var zScoreBound = parseFloat( trackView.getConf('zScoreBound') ) || 4;
        var min = trackView.getConf('minScore') !== undefined ? parseFloat( trackView.getConf('minScore') ) :
            (function() {
                 switch( trackView.getConf('autoscale') ) {
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
        var max = trackView.getConf('maxScore') !== undefined ? parseFloat( trackView.getConf('maxScore') ) :
            (function() {
                 switch( trackView.getConf('autoscale') ) {
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

        var offset = trackView.getConf('dataOffset') || 0;

        if( trackView.getConf('scale') == 'log' ) {
            max = this.log( max + offset );
            min = this.log( min + offset );
        }
        else {
            max += offset;
            min += offset;
        }

        var origin = (function() {
          if ( trackView.getConf('bicolorPivot') ) {
            if ( trackView.getConf('bicolorPivot') == 'mean' ) {
              return stats.scoreMean || 0;
            } else if ( trackView.getConf('bicolorPivot') == 'zero' ) {
              return 0;
            } else {
              return parseFloat( trackView.getConf('bicolorPivot') );
            }
          } else if ( trackView.getConf('scale') == 'zScore' ) {
            return stats.scoreMean || 0;
          } else if ( trackView.getConf('scale') == 'log' ) {
            return 1;
          } else {
            return 0;
          }
        })();

        lang.mixin( this, {
            offset: offset,
            min: min,
            max: max,
            range: max - min,
            origin: origin,
            _statsFingerprint: Digest.objectFingerprint( stats )
        });
        if( needStats ) {
            this.scoreMean = stats.scoreMean;
            this.scoreStdDev = stats.scoreStdDev;
        }

        // don't let range go all the way to zero
        if( this.range == 0 ) {
            var bump = 0.1 * ( this.max - this.origin );

            if( this.min > origin )
                this.min -= bump;
            else
                this.max -= bump;

            this.range += bump;
        }

        // make this.normalize a func that converts wiggle values to a
        // range between 0 and 1, depending on what kind of scale we
        // are using
        this.normalize = (function(trackView) {
            switch( trackView.getConf('scale') ) {
            case 'zScore':
                return function( value ) {
                    return (value+this.offset-this.scoreMean) / this.scoreStdDev-this.min / this.range;
                };
            case 'log':
                return function( value ) {
                    return ( this.log(value+this.offset) - this.min )/this.range;
                };
            case 'linear':
            default:
                return function( value ) {
                    return ( value + this.offset - this.min ) / this.range;
                };
            }
        })(trackView);
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
          || ( a.scoreMean - b.scoreMean )
          || ( a.scoreStdDev - b.scoreStdDev )
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