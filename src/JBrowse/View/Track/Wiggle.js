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
        this.store.whenReady( this, 'loadSuccess' );

        this.globalOffset = this.config.offset || 0;
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
        // if we are not loaded yet, we won't have any metadata, so just return
        var s = this.store.getStats();
        var min = 'min_score' in this.config ? this.config.min_score : this.globalOffset + s.global_min;
        var max = 'max_score' in this.config ? this.config.max_score : this.globalOffset + ( s.global_max > s.mean+5*s.stdDev ? s.mean + 5*s.stdDev : s.global_max );

        // bump minDisplayed to 0 if it is within 0.5% of it
        if( Math.abs( min / max ) < 0.005 )
            min = 0;

        this.makeYScale({
            fixBounds: true,
            min: this.config.log_scale ? ( min ? Math.log(min) : 0 ) : min,
            max: this.config.log_scale ? Math.log(max) : max
        });
        this.minDisplayed = this.ruler.scaler.bounds.lower;
        this.maxDisplayed = this.ruler.scaler.bounds.upper;
    },

    renderCanvases: function( scale, leftBase, rightBase, callback ) {
        if( ! callback ) {
            console.error('null callback?');
            return;
        }


        var canvasWidth  = Math.ceil(( rightBase - leftBase ) * scale);
        var canvasHeight = 100;
        this.height = canvasHeight;

        var toY = dojo.hitch( this, this.config.log_scale ? '_logY' : '_linearY', canvasHeight );
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
                             drawBand( 2*stats.stdDev, '#ccc' );
                             drawBand( stats.stdDev, '#aaa' );
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

    _linearY: function( canvasHeight, value ) {
        return canvasHeight - canvasHeight * (value+this.globalOffset-this.minDisplayed)/((this.maxDisplayed||1) - this.minDisplayed);
    },

    _logY: function( canvasHeight, value ) {
        return canvasHeight - canvasHeight * (Math.log(value+this.globalOffset)-this.minDisplayed)/((this.maxDisplayed||1) - this.minDisplayed );
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
