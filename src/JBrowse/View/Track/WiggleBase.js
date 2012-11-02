define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/on',
            'JBrowse/View/Track/Canvas',
            'JBrowse/View/Track/ExportMixin',
            'JBrowse/Util'
        ],
        function( declare, array, on, CanvasTrack, ExportMixin, Util ) {
var Wiggle = declare( CanvasTrack, {
    constructor: function( args ) {
        this.store = args.store;
        dojo.connect( this.store, 'loadSuccess', this, 'loadSuccess' );
        dojo.connect( this.store, 'loadFail',    this, 'loadFail' );
    }
});

/**
 * Mixin: JBrowse.View.Track.ExportMixin.
 */
dojo.safeMixin( Wiggle.prototype, ExportMixin );

/**
 * @lends JBrowse.View.Track.Wiggle.prototype
 */
Wiggle.extend({
    _defaultConfig: function() {
        return { maxExportSpan: 500000 };
    },

    load: function() {
        this.store.load();
    },

    loadSuccess: function(o,url) {
        this._calculateScaling();
        this.empty = this.store.empty || false;
        this.setLoaded();
    },


    _calculateScaling: function() {
        // if either autoscale or scale is set to z_score, the other one should default to z_score
        if( this.config.autoscale == 'z_score' && ! this.config.scale
            || this.config.scale == 'z_score'  && !this.config.autoscale
          ) {
              this.config.scale = 'z_score';
              this.config.autoscale = 'z_score';
          }

        var z_score_bound = parseFloat( this.config.z_score_bound ) || 4;
        var s = this.getGlobalStats() || {};
        var min = 'min_score' in this.config ? parseFloat( this.config.min_score ) :
            (function() {
                 switch( this.config.autoscale ) {
                     case 'z_score':
                         return Math.max( -z_score_bound, (s.scoreMin-s.scoreMean) / s.scoreStdDev );
                     case 'global':
                         return s.scoreMin;;
                     case 'clipped_global':
                     default:
                         return Math.max( s.scoreMin, s.scoreMean - z_score_bound * s.scoreStdDev );
                 }
             }).call(this);
        var max = 'max_score' in this.config ? parseFloat( this.config.max_score ) :
            (function() {
                 switch( this.config.autoscale ) {
                     case 'z_score':
                         return Math.min( z_score_bound, (s.scoreMax-s.scoreMean) / s.scoreStdDev );
                     case 'global':
                         return s.scoreMax;
                     case 'clipped_global':
                     default:
                         return Math.min( s.scoreMax, s.scoreMean + z_score_bound * s.scoreStdDev );
                 }
             }).call(this);

        if( typeof max != 'number' || isNaN(max) ) {
            throw 'cannot display track '+this.name+', could not determine max_score.  Do you need to set max_score in its configuration?';
        }
        if( typeof min != 'number' || isNaN(min) ) {
            throw 'cannot display track '+this.name+', could not determine min_score.  Do you need to set min_score in its configuration?';
        }

        // if we have a log scale, need to take the log of the min and max
        if( this.config.scale == 'log' ) {
            max = Math.log(max);
            min = min ? Math.log(min) : 0;
        }

        var offset = parseFloat( this.config.data_offset ) || 0;
        var origin = (function() {
          if ( 'bicolor_pivot' in this.config ) {
            if ( this.config.bicolor_pivot == 'mean' ) {
              return s.scoreMean || 0;
            } else if ( this.config.bicolor_pivot == 'zero' ) {
              return 0;
            } else {
              return parseFloat( this.config.bicolor_pivot );
            }
          } else if ( this.config.scale == 'z_score' ) {
            return s.scoreMean || 0;
          } else if ( this.config.scale == 'log' ) {
            return 1;
          } else {
            return 0;
          }
        }).call(this);

        this.scale = {
            offset: offset,
            min: min + offset,
            max: max + offset,
            range: max - min,
            origin: origin
        };

        // make a func that converts wiggle values to a range between
        // 0 and 1, depending on what kind of scale we are using
        this.scale.normalize = function() {
            var scale = this.scale;
            switch( this.config.scale ) {
            case 'z_score':
                return function( value ) {
                    with(scale)
                        return (value+offset-s.scoreMean) / s.scoreStdDev-min / range;
                };
            case 'log':
                return function( value ) {
                    with(scale)
                        return ( Math.log(value+offset) - min )/range;
                };
            case 'linear':
            default:
                return function( value ) {
                    with(scale)
                        return ( value + offset - min ) / range;
                };
            }
        }.call(this);

        return this.scale;
    },

    readWigData: function( scale, refSeq, leftBase, rightBase, callback ) {
        this.store.readWigData.apply( this.store, arguments );
    },

    getGlobalStats: function() {
        return this.store.getGlobalStats();
    },

    fillBlock: function( blockIndex,     block,
                         leftBlock,      rightBlock,
                         leftBase,       rightBase,
                         scale,          stripeWidth,
                         containerStart, containerEnd) {

        var blockWidth = rightBase - leftBase;
        this.heightUpdate( this.height, blockIndex );

        var canvasWidth  = Math.ceil(( rightBase - leftBase ) * scale);
        var canvasHeight = parseInt(( this.config.style || {}).height) || 100;
        this.height = canvasHeight;

        this.readWigData( scale, this.refSeq.name, leftBase, rightBase+1, dojo.hitch(this,function( features ) {

                var c = dojo.create(
                    'canvas',
                    { height: canvasHeight,
                      width:  canvasWidth,
                      style: { cursor: 'default' },
                      innerHTML: 'Your web browser cannot display this type of track.',
                      className: 'canvas-track'
                    },
                    block
                );
                c.startBase = leftBase;
                if( c && c.getContext && c.getContext('2d') && this.scale && this.scale.normalize && features ) {

                    var featureRects = array.map( features, function(f) {
                        return this._featureRect( scale, leftBase, c, f );
                    }, this );

                    this._preDraw(      scale, leftBase, rightBase, block, c, features, featureRects );
                    this._drawFeatures( scale, leftBase, rightBase, block, c, features, featureRects );
                    this._postDraw(     scale, leftBase, rightBase, block, c, features, featureRects );

                    this._makeScoreDisplay( scale, leftBase, rightBase, block, c, features, featureRects );

                    this.heightUpdate( c.height, blockIndex );
	            if (!(c.parentNode && c.parentNode.parentNode)) {
                        c.style.position = "absolute";
                        c.style.left = (100 * ((c.startBase - leftBase) / blockWidth)) + "%";
                        switch (this.config.align) {
                        case "top":
                            c.style.top = "0px";
                            break;
                        case "bottom":
                        default:
                            c.style.bottom = this.trackPadding + "px";
                            break;
                        }
	            }
                }
                else {
                    // can't draw the data
                    c.parentNode.removeChild(c);
                    var notsupported = dojo.create(
                        'div', {
                            className: 'error',
                            innerHTML: 'This track could not be displayed, possibly because your browser does not support it.  See browser error log for details.'
                        }, block );
                    this.heightUpdate( dojo.position(notsupported).h, blockIndex );
                }

            }));
    },

    /**
     * Calculate the left and width, in pixels, of where this feature
     * will be drawn on the canvas.
     * @private
     * @returns {Object} with l, r, and w
     */
    _featureRect: function( scale, leftBase, canvas, feature ) {
        var fRect = {
            w: Math.ceil( ( feature.get('end')   - feature.get('start') ) * scale ),
            l: Math.floor(( feature.get('start') - leftBase       ) * scale )
        };

        // if fRect.l is negative (off the left
        // side of the canvas), clip off the
        // (possibly large!) non-visible
        // portion
        if( fRect.l < 0 ) {
            fRect.w += fRect.l;
            fRect.l  = 0;
        }

        // also don't let fRect.w get overly big
        fRect.w = Math.min( canvas.width-fRect.l, fRect.w );
        fRect.r = fRect.w + fRect.l;

        return fRect;
    },

    _preDraw: function( canvas ) {
    },

    /**
     * Draw a set of features on the canvas.
     * @private
     */
    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, features, featureRects ) {
    },

    _postDraw: function() {
    },

    _makeScoreDisplay: function( scale, leftBase, rightBase, block, canvas, features, featureRects ) {

        // make an array of the max score at each pixel on the canvas
        var pixelValues = new Array( canvas.width );
        dojo.forEach( features, function( f, i ) {
            var fRect = featureRects[i];
            var jEnd = fRect.r;
            var score = f.get('score');
            for( var j = fRect.l; j < jEnd; j++ ) {
                pixelValues[j] = j in pixelValues ? Math.max( pixelValues[j], score ) : score;
            }
        },this);

        // make elements and events to display it
        var scoreDisplay = dojo.create(
            'div', {
                className: 'wiggleValueDisplay',
                style: {
                    position: 'absolute',
                    display: 'none',
                    top: 0,
                    left: 0,
                    zIndex: 15
                }
            }, block );
        var verticalLine = dojo.create( 'div', {
                className: 'trackVerticalPositionIndicator',
                style: {
                    position: 'absolute',
                    top: 0,
                    display: 'none',
                    cursor: 'default',
                    left: '-2px',
                    height: canvas.height+'px',
                    width: '1px',
                    borderWidth: '0',
                    zIndex: 15
                }
        }, block);
        var outTimeout;
        on( canvas, 'mousemove', dojo.hitch(this,function(evt) {
                if( outTimeout ) {
                    window.clearTimeout( outTimeout );
                    outTimeout = null;
                }
                var x = ( evt.offsetX || evt.layerX )-3;
                verticalLine.style.display = 'block';
                verticalLine.style.left = x+'px';

                if( this._showPixelValue( scoreDisplay, pixelValues[x] ) ) {
                    scoreDisplay.style.left = x+'px';
                    scoreDisplay.style.display = 'block';
                } else {
                    scoreDisplay.style.display = 'none';
                }
        }));
        on( canvas, 'mouseout', function(evt) {
                outTimeout = window.setTimeout( function() {
                    scoreDisplay.style.display = 'none';
                    verticalLine.style.display = 'none';
                }, 50 );
        });
        on( canvas, 'mousein', function(evt) {
                    scoreDisplay.style.display = 'block';
                    verticalLine.style.display = 'block';
        });
    },

    _showPixelValue: function( scoreDisplay, score ) {
        if( typeof score == 'number' ) {
            // display the score with only 6
            // significant digits, avoiding
            // most confusion about the
            // approximative properties of
            // IEEE floating point numbers
            // parsed out of BigWig files
            scoreDisplay.innerHTML = parseFloat( score.toPrecision(6) );
            return true;
        } else {
            return false;
        }
    },

    _exportFormats: function() {
        return ['bedGraph','Wiggle', 'GFF3' ];
    }
});
return Wiggle;
});
