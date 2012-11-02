define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/on',
            'JBrowse/View/Track/WiggleBase',
            'JBrowse/View/Track/YScaleMixin'
        ],
        function( declare, array, on, WiggleBase, YScaleMixin ) {
var XYPlot = declare( WiggleBase,
{
    makeWiggleYScale: function() {
        if( ! this.scale )
            return;

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

    _preDraw: function() {
        if(! this.yscale )
            this.makeWiggleYScale();
    },

    updateStaticElements: function( coords ) {
        this.inherited( arguments );
        this.updateYScaleFromViewDimensions( coords );
    },

    /**
     * Draw a set of features on the canvas.
     * @private
     */
    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, features, featureRects ) {
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var toY = dojo.hitch( this, function( val ) {
           return canvasHeight * (1-this.scale.normalize.call(this, val));
        });
        var originY = toY( this.scale.origin );

        var posColor  = this.config.style.pos_color || '#00f';
        var negColor  = this.config.style.neg_color || '#f00';
        var clipColor = this.config.style.clip_marker_color;
        var disableClipMarkers = this.config.disable_clip_markers;

        dojo.forEach( features, function(f,i) {

            var fRect = featureRects[i];

            //console.log( f.get('start') +'-'+f.get('end')+':'+f.get('score') );
            var score = f.get('score');
            fRect.t = toY( score );
            //console.log( score, fRect.t );

            if( fRect.t <= canvasHeight ) { // if the rectangle is visible at all

                if( fRect.t <= originY ) {
                    // bar goes upward
                    context.fillStyle = posColor;
                    context.fillRect( fRect.l, fRect.t, fRect.w, originY-fRect.t);
                    if( !disableClipMarkers && fRect.t < 0 ) { // draw clip marker if necessary
                        context.fillStyle = clipColor || negColor;
                        context.fillRect( fRect.l, 0, fRect.w, 2 );
                    }
                }
                else {
                    // bar goes downward
                    context.fillStyle = negColor;
                    context.fillRect( fRect.l, originY, fRect.w, canvasHeight-fRect.t );
                    if( !disableClipMarkers && fRect.t >= canvasHeight ) { // draw clip marker if necessary
                        context.fillStyle = clipColor || posColor;
                        context.fillRect( fRect.l, canvasHeight-3, fRect.w, 2 );
                    }
                }
            }
        }, this );
    },

    /**
     * Draw anything needed after the features are drawn.
     */
    _postDraw: function( scale, leftBase, rightBase, block, canvas, features, featureRects ) {
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var toY = dojo.hitch( this, function( val ) {
           return canvasHeight * (1-this.scale.normalize.call(this, val));
        });

        // draw the variance_band if requested
        if( this.config.variance_band ) {
            var stats = this.getGlobalStats();
            if( stats && ('scoreMean' in stats) && ('scoreStdDev' in stats) ) {
                var drawVarianceBand = function( plusminus, fill, label ) {
                    context.fillStyle = fill;
                    var varTop = toY( stats.scoreMean + plusminus );
                    var varHeight = toY( stats.scoreMean - plusminus ) - varTop;
                    varHeight = Math.max( 1, varHeight );
                    context.fillRect( 0, varTop, canvas.width, varHeight );
                    context.font = '12px sans-serif';
                    if( plusminus > 0 ) {
                        context.fillText( '+'+label, 2, varTop );
                        context.fillText( '-'+label, 2, varTop+varHeight );
                    }
                    else {
                        context.fillText( label, 2, varTop );
                    }
                };
                drawVarianceBand( 2*stats.scoreStdDev, 'rgba(0,0,0,0.12)', '2σ' );
                drawVarianceBand( stats.scoreStdDev, 'rgba(0,0,0,0.25)', '1σ' );
                drawVarianceBand( 0, 'rgba(255,255,0,0.7)', 'mean' );
            }
        }
    }

});

XYPlot.extend( YScaleMixin );

return XYPlot;
});
