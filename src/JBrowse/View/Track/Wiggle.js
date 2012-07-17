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
        try {
            var s = this.store.getStats();
            this.minDisplayed = 0;//s.global_min;
            this.maxDisplayed = s.global_max > s.mean+3*s.stdDev ? s.mean + 2.5*s.stdDev : s.global_max;

            // bump minDisplayed to 0 if it is within 0.5% of it
            if( this.minDisplayed / this.maxDisplayed < 0.005 )
                this.minDisplayed = 0;

        } catch (x) {
            return;
        }
        this.makeYScale();
    },

    renderCanvases: function( scale, leftBase, rightBase, callback ) {
        if( ! callback ) {
            console.error('null callback?');
            return;
        }

        var canvasWidth  = Math.ceil(( rightBase - leftBase ) * scale);
        var canvasHeight = 100;
        var fillStyle = (this.config.style||{}).fillStyle || '#00f';
        this._getView( scale )
            .readWigData( this.refSeq.name, leftBase, rightBase, dojo.hitch(this,function( features ) {
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
                    //context.fillText(features.length+' spans', 10,10);
                    context.fillStyle = fillStyle;
                    //console.log( 'filling '+leftBase+'-'+rightBase);
                    dojo.forEach(features, function(f) {
                        //console.log( f.get('start') +'-'+f.get('end')+':'+f.get('score') );
                        var rHeight = f.get('score')/(this.maxDisplayed||1) * canvasHeight;
                        if( rHeight >= 1 ) {
                            var rWidth = Math.ceil(( f.get('end') - f.get('start') + 1 ) * scale );
                            var rLeft  = Math.floor(( f.get('start')-1 - leftBase ) * scale );
                            context.fillRect( rLeft, canvasHeight-rHeight, rWidth, rHeight );
//                            console.log('fillRect',rLeft, canvasHeight-rHeight, rWidth, rHeight, 'maxDisplayed='+this.maxDisplayed );
                        }
                    }, this );
                }

                callback( [c] );
                if(! this.yscale )
                    this.makeWiggleYScale();
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
