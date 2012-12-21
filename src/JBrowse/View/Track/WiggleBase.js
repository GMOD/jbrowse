define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/on',
            'JBrowse/View/Track/Canvas',
            'JBrowse/View/Track/ExportMixin',
            'JBrowse/Util',
            'JBrowse/Digest/Crc32'
        ],
        function( declare, array, on, CanvasTrack, ExportMixin, Util, Digest ) {
var Wiggle = declare( CanvasTrack, {
    constructor: function( args ) {
        this.store = args.store;
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

    _getScaling: function( successCallback, errorCallback ) {

        this.getRegionStats( this._getScalingRegion(), dojo.hitch(this, function( stats ) {

            //calculate the scaling if necessary
            var statsFingerprint = Digest.objectFingerprint( stats );
            if( ! this.lastScaling || this.lastScaling._statsFingerprint != statsFingerprint ) {
                try {
                    this.lastScaling = this._calculateScaling( stats );
                    successCallback( this.lastScaling );
                } catch( e ) {
                    errorCallback(e);
                }
            } else {
                successCallback( this.lastScaling );
            }

        }), errorCallback );
    },

    // TODO: implement more regions over which we can get the
    // stats.  currently over whole ref seq
    _getScalingRegion: function() {
        return dojo.clone( this.browser.getCurrentRefSeq() );
    },

    _calculateScaling: function( s ) {

        // if either autoscale or scale is set to z_score, the other one should default to z_score
        if( this.config.autoscale == 'z_score' && ! this.config.scale
            || this.config.scale == 'z_score'  && !this.config.autoscale
          ) {
              this.config.scale = 'z_score';
              this.config.autoscale = 'z_score';
          }

        var z_score_bound = parseFloat( this.config.z_score_bound ) || 4;
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

        var scale = {
            offset: offset,
            min: min + offset,
            max: max + offset,
            range: max - min,
            origin: origin,
            _statsFingerprint: Digest.objectFingerprint( s )
        };

        // make a func that converts wiggle values to a range between
        // 0 and 1, depending on what kind of scale we are using
        scale.normalize = function() {
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

        return scale;
    },

    getFeatures: function( query, callback, errorCallback ) {
        this.store.getFeatures.apply( this.store, arguments );
    },

    getGlobalStats: function( successCallback, errorCallback ) {
        this.store.getGlobalStats( successCallback, errorCallback );
    },

    getRegionStats: function( region, successCallback, errorCallback ) {
        this.store.getRegionStats( region, successCallback, errorCallback );
    },

    fillBlock: function( args ) {
        var blockIndex = args.blockIndex;
        var block = args.block;
        var leftBase = args.leftBase;
        var rightBase = args.rightBase;
        var scale = args.scale;
        var finishCallback = args.finishCallback || function() {};

        var blockWidth = rightBase - leftBase;
        var canvasWidth  = Math.ceil(( rightBase - leftBase ) * scale);
        var canvasHeight = parseInt(( this.config.style || {}).height) || 100;
        this.heightUpdate( canvasHeight, blockIndex );

        try {
            dojo.create('canvas').getContext('2d').fillStyle = 'red';
        } catch( e ) {
            this.error = 'This browser does not support HTML canvas elements.';
            this.fillError( blockIndex, block );
            return;
        }

        this._getScaling( dojo.hitch( this, function( dataScale ) {
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

            var features = [];
            this.getFeatures(
                { ref: this.refSeq.name,
                  basesPerSpan: 1/scale,
                  scale: scale,
                  start: leftBase,
                  end: rightBase+1
                },
                function(f) { features.push(f); },
                dojo.hitch( this, function() {
                    var featureRects = array.map( features, function(f) {
                        return this._featureRect( scale, leftBase, c, f, dataScale );
                    }, this );

                    this._preDraw(      scale, leftBase, rightBase, block, c, features, featureRects, dataScale );
                    this._drawFeatures( scale, leftBase, rightBase, block, c, features, featureRects, dataScale );
                    this._postDraw(     scale, leftBase, rightBase, block, c, features, featureRects, dataScale );

                    this._makeScoreDisplay( scale, leftBase, rightBase, block, c, features, featureRects );

                    this.heightUpdate( c.height, blockIndex );
                    if( !( c.parentNode && c.parentNode.parentNode )) {
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
                    finishCallback();
                }));
        }),
        dojo.hitch( this, function(e) {
                        this.error = e;
                        this.fillError( blockIndex, block );
                        finishCallback();
                    })
        );
    },

    /**
     * Calculate the left and width, in pixels, of where this feature
     * will be drawn on the canvas.
     * @private
     * @returns {Object} with l, r, and w
     */
    _featureRect: function( scale, leftBase, canvas, feature, dataScale ) {
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
                    position: 'fixed',
                    display: 'none',
                    zIndex: 15
                }
            }, block );
        var verticalLine = dojo.create( 'div', {
                className: 'wigglePositionIndicator',
                style: {
                    position: 'fixed',
                    display: 'none',
                    height: canvas.height+'px',
                    zIndex: 15
                }
        }, block);
        var outTimeout;
        dojo.forEach( [canvas,verticalLine,scoreDisplay], function(element) {
            on( element, 'mousemove', dojo.hitch(this,function(evt) {
                    var cPos = dojo.position(canvas);
                    var x = evt.pageX;
                    var cx = evt.pageX - cPos.x;

                    verticalLine.style.display = 'block';
                    verticalLine.style.left = x+'px';
                    verticalLine.style.top = cPos.y+'px';
                    if( this._showPixelValue( scoreDisplay, pixelValues[Math.round(cx)] ) ) {
                        scoreDisplay.style.left = x+'px';
                        scoreDisplay.style.top = cPos.y+'px';
                        scoreDisplay.style.display = 'block';
                    } else {
                        scoreDisplay.style.display = 'none';
                    }
            }));
        },this);
        on( block, 'mouseout', function(evt) {
                     scoreDisplay.style.display = 'none';
                     verticalLine.style.display = 'none';
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
