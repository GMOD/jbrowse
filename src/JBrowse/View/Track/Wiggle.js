define( ['dojo/_base/declare',
         'JBrowse/View/Track/Canvas',
         'JBrowse/View/Track/YScaleMixin'
        ],
        function( declare,  CanvasTrack, YScaleMixin ) {
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

    _getView: function(scale) {
        if( !this._viewCache || this._viewCache.scale != scale ) {
            this._viewCache = {
                scale: scale,
                view: this.store.getView(1/scale)
            };
        }
        return this._viewCache.view;
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
        var s = this.store.getStats();
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

        // if autoscale is set to z_score, config.scale should default to z_score
        if( this.config.autoscale == 'z_score' )
            this.config.scale = this.config.scale || 'z_score';

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
            range: max - min
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

    renderCanvases: function( scale, leftBase, rightBase, callback ) {
        if( ! callback ) {
            console.error('null callback?');
            return;
        }


        var canvasWidth  = Math.ceil(( rightBase - leftBase ) * scale);
        var canvasHeight = 100;
        this.height = canvasHeight;

        var dataFillStyle = (this.config.style||{}).dataFillStyle || '#00f';

        this._getView( scale )
            .readWigData( this.refSeq.name, leftBase, rightBase, dojo.hitch(this,function( features ) {
                if(! this.yscale )
                    this.makeWiggleYScale();

                var c = dojo.create(
                    'canvas',
                    { height: canvasHeight,
                      width:  canvasWidth,
                      innerHTML: 'Canvas-based tracks not supported by this browser'
                    }
                );
                c.startBase = leftBase;
                var context = c && c.getContext && c.getContext('2d');
                if( context ) {
                    var toY = dojo.hitch( this, this.scale.toY, canvasHeight );
                    if( this.config.variance_band )
                        (function() {
                             var stats = this.store.getStats();
                             var drawBand = function( plusminus, fill ) {
                                 context.fillStyle = fill;
                                 var varTop = toY( stats.mean + plusminus );
                                 var varHeight = toY( stats.mean - plusminus ) - varTop;
                                 varHeight = Math.max( 1, varHeight );
                                 context.fillRect( 0, varTop, c.width, varHeight );
                             };
                             drawBand( 2*stats.stdDev, 'rgba(0,0,0,0.15)' );
                             drawBand( stats.stdDev, 'rgba(0,0,0,0.25)' );
                             drawBand( 0,'yellow' );
                         }).call(this);

                    //context.fillText(features.length+' spans', 10,10);
                    context.fillStyle = dataFillStyle;
                    //console.log( 'filling '+leftBase+'-'+rightBase);
                    dojo.forEach(features, function(f) {
                        //console.log( f.get('start') +'-'+f.get('end')+':'+f.get('score') );
                        var rTop = toY( f.get('score') );
                        if( rTop <= canvasHeight ) {
                            var rWidth = Math.ceil(( f.get('end') - f.get('start') + 1 ) * scale );
                            var rLeft  = Math.floor(( f.get('start')-1 - leftBase ) * scale );
                            context.fillRect( rLeft, rTop, rWidth, canvasHeight-rTop );
//                            console.log('fillRect', rLeft, rTop, rWidth, canvasHeight-rTop );
                        }
                    }, this );
                }

                callback( [c] );
            }));
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
