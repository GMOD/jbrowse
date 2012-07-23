define( ['dojo/_base/declare',
         'dojo/on',
         'JBrowse/View/Track/Canvas',
         'JBrowse/View/Track/YScaleMixin'
        ],
        function( declare, on, CanvasTrack, YScaleMixin ) {
var Wiggle = declare( CanvasTrack,
/**
 * @lends JBrowse.View.Track.Wiggle.prototype
 */
{
    constructor: function( args ) {
        this.inherited( arguments );
        this.store = args.store;
        this.store.whenReady( this, '_calculateScaling' );
        this.store.whenReady( this, 'loadSuccess' );
    },

    load: function() {
    },

    loadSuccess: function(o,url) {
        this.empty = this.store.empty || false;
        this.setLoaded();
    },

    makeWiggleYScale: function() {
        // bump minDisplayed to 0 if it is within 0.5% of it
        if( Math.abs( this.scale.min / this.scale.max ) < 0.005 )
            this.scale.min = 0;

        this.makeYScale({
            fixBounds: true,
            min: this.scale.min,
            max: this.scale.max
        });
        this.scale.min = this.ruler.scaler.bounds.lower;
        this.scale.max = this.ruler.scaler.bounds.upper;
        this.scale.range = this.scale.max - this.scale.min;
    },

    _calculateScaling: function() {
        // if either autoscale or scale is set to z_score, the other one should default to z_score
        if( this.config.autoscale == 'z_score' && ! this.config.scale
            || this.config.scale == 'z_score'  && !this.config.autoscale
          ) {
              this.config.scale = 'z_score';
              this.config.autoscale = 'z_score';
          }

        var s = this.store.getGlobalStats();
        var min = 'min_score' in this.config ? this.config.min_score :
            (function() {
                 switch( this.config.autoscale ) {
                     case 'z_score':
                         return Math.max( -(this.config.z_score_bound || 4), (s.global_min-s.mean) / s.stdDev );
                     case 'global':
                         return s.global_min;
                     case 'clipped_global':
                     default:
                         return Math.max( s.global_min, s.mean - (this.config.z_score_bound || 4) * s.stdDev );
                 }
             }).call(this);
        var max = 'max_score' in this.config ? this.config.max_score :
            (function() {
                 switch( this.config.autoscale ) {
                     case 'z_score':
                         return Math.min( this.config.z_score_bound || 4, (s.global_max-s.mean) / s.stdDev );
                     case 'global':
                         return s.global_max;
                     case 'clipped_global':
                     default:
                         return Math.min( s.global_max, s.mean + (this.config.z_score_bound || 4) * s.stdDev );
                 }
             }).call(this);

        // if we have a log scale, need to take the log of the min and max
        if( this.config.scale == 'log' ) {
            max = Math.log(max);
            min = min ? Math.log(min) : 0;
        }

        var offset = this.config.data_offset || 0;
        this.scale = {
            offset: offset,
            min: min + offset,
            max: max + offset,
            range: max - min,
            origin: 'bicolor_pivot' in this.config ? ( this.config.bicolor_pivot == 'mean' ? s.mean :
                                                       this.config.bicolor_pivot == 'zero' ? 0 :
                                                         parseFloat( this.config.bicolor_pivot )
                                                     ) :
                    this.config.scale == 'z_score' ? s.mean :
                                                     0
        };

        // make a func that converts wiggle values to Y coordinates on
        // the plot, depending on what kind of scale we are using
        this.scale.toY = function() {
            var scale = this.scale;
            switch( this.config.scale ) {
            case 'z_score':
                return function( canvasHeight, value ) {
                    with(scale)
                        return canvasHeight * (1-((value+offset-s.mean)/s.stdDev-min)/range);
                };
            case 'log':
                return function( canvasHeight, value ) {
                    with(scale)
                        return canvasHeight * (1-(Math.log(value+offset)-min)/range);
                };
            case 'linear':
            default:
                return function( canvasHeight, value ) {
                    with(scale)
                        return canvasHeight * (1-(value+offset-min)/range);
                };
            }
        }.call(this);

        return this.scale;
    },

    fillBlock: function( blockIndex,     block,
                         leftBlock,      rightBlock,
                         leftBase,       rightBase,
                         scale,          stripeWidth,
                         containerStart, containerEnd) {

        var blockWidth = rightBase - leftBase;
        this.heightUpdate( this.height, blockIndex );

        var canvasWidth  = Math.ceil(( rightBase - leftBase ) * scale);
        var canvasHeight = 100;
        this.height = canvasHeight;

        var posColor  = this.config.style.pos_color || '#00f';
        var negColor  = this.config.style.neg_color || '#f00';
        var clipColor = this.config.style.clip_color;
        var disableClipMarkers = this.config.disable_clip_markers;

        this.store.readWigData( scale, this.refSeq.name, leftBase, rightBase, dojo.hitch(this,function( features ) {
                if(! this.yscale )
                    this.makeWiggleYScale();

                var c = dojo.create(
                    'canvas',
                    { height: canvasHeight,
                      width:  canvasWidth,
                      style: { cursor: 'default' },
                      innerHTML: 'Your web browser cannot display this type of track.'
                    }
                );
                c.startBase = leftBase;
                var context = c && c.getContext && c.getContext('2d');
                if( context ) {
                    var toY = dojo.hitch( this, this.scale.toY, c.height );
                    var originY = toY( this.scale.origin );

                    //context.fillText(features.length+' spans', 10,10);
                    //console.log( 'filling '+leftBase+'-'+rightBase);
                    var pixelScores = new Array( c.width );
                    dojo.forEach(features, function(f) {
                        //console.log( f.get('start') +'-'+f.get('end')+':'+f.get('score') );
                        var score = f.get('score');
                        var rTop = toY( score );
                        if( rTop <= canvasHeight ) {
                            var rWidth = Math.ceil(( f.get('end') - f.get('start') + 1 ) * scale );
                            var rLeft  = Math.floor(( f.get('start')-1 - leftBase ) * scale );
                            this._updatePixelScores( pixelScores, rLeft, rWidth, score );
                            if( rTop <= originY ) {
                                // bar goes upward
                                context.fillStyle = posColor;
                                context.fillRect( rLeft, rTop, rWidth, originY-rTop);
                                if( !disableClipMarkers && rTop < 0 ) { // draw clip marker if necessary
                                    context.fillStyle = clipColor || negColor;
                                    context.fillRect( rLeft, 0, rWidth, 2 );
                                }
                            }
                            else {
                                // bar goes downward
                                context.fillStyle = negColor;
                                context.fillRect( rLeft, originY, rWidth, canvasHeight-rTop );
                                if( !disableClipMarkers && rTop >= canvasHeight ) { // draw clip marker if necessary
                                    context.fillStyle = clipColor || posColor;
                                    context.fillRect( rLeft, canvasHeight-3, rWidth, 2 );
                                }
                            }
                        }
                    }, this );

                    // draw the variance_band if requested
                    if( this.config.variance_band ) {
                        var stats = this.store.getGlobalStats();
                        if( stats && ('mean' in stats) && ('stdDev' in stats) ) {
                            var drawVarianceBand = function( plusminus, fill, label ) {
                                context.fillStyle = fill;
                                var varTop = toY( stats.mean + plusminus );
                                var varHeight = toY( stats.mean - plusminus ) - varTop;
                                varHeight = Math.max( 1, varHeight );
                                context.fillRect( 0, varTop, c.width, varHeight );
                                context.font = '12px sans-serif';
                                if( plusminus > 0 ) {
                                    context.fillText( '+'+label, 2, varTop );
                                    context.fillText( '-'+label, 2, varTop+varHeight );
                                }
                                else {
                                    context.fillText( label, 2, varTop );
                                }
                            };
                            drawVarianceBand( 2*stats.stdDev, 'rgba(0,0,0,0.12)', '2σ' );
                            drawVarianceBand( stats.stdDev, 'rgba(0,0,0,0.25)', '1σ' );
                            drawVarianceBand( 0,'yellow', 'mean' );
                        }
                    }

                    var scoreDisplay = dojo.create(
                        'div', {
                            className: 'wiggleValueDisplay',
                            style: {
                                position: 'absolute',
                                display: 'none',
                                top: 0,
                                left: 0,
                                //height: (c.height + 50)+'px',
                                zIndex: 15
                            }
                        }, block );
                    var verticalLine = dojo.create( 'div', {
                            className: 'trackVerticalPositionIndicator',
                            style: {
                                position: 'absolute',
                                top: 0,
                                cursor: 'default',
                                left: '-2px',
                                height: c.height+'px',
                                width: '1px',
                                borderWidth: '0'
                            }
                    }, block);
                    on( c, 'mousemove', function(evt) {
                            verticalLine.style.display = 'block';
                            verticalLine.style.left = (evt.offsetX-3)+'px';

                            if( typeof pixelScores[evt.offsetX-3] == 'number' ) {
                                scoreDisplay.innerHTML = pixelScores[evt.offsetX-3];
                                scoreDisplay.style.left = (evt.offsetX-3)+'px';
                                scoreDisplay.style.display = 'block';
                            } else {
                                scoreDisplay.style.display = 'none';
                            }
                    });
                    on( c, 'mouseout', function(evt) {
                            scoreDisplay.style.display = 'none';
                            verticalLine.style.display = 'none';
                    });
                }

                this.heightUpdate( c.height, blockIndex );
                c.className = 'canvas-track';
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
                    block.appendChild(c);
	        }
            }));
    },

    _updatePixelScores: function( pixelScores, rLeft, rWidth, score ) {
        var iend = rLeft+rWidth;
        for( var i = rLeft; i < iend; i++ ) {
            pixelScores[i] = i in pixelScores ? Math.max( pixelScores[i], score ) : score;
        }
    },

    updateStaticElements: function( coords ) {
        this.inherited( arguments );
        this.updateYScaleFromViewDimensions( coords );
    }
});

/**
 * Mixin: JBrowse.View.Track.YScaleMixin.
 */
declare.safeMixin( Wiggle.prototype, YScaleMixin );

return Wiggle;
});
