define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/on',
            'JBrowse/View/Track/WiggleBase',
            'JBrowse/View/Track/YScaleMixin',
            'JBrowse/Util',
            'JBrowse/Digest/Crc32'
        ],
        function( declare, array, on, WiggleBase, YScaleMixin, Util, Digest ) {

var XYPlot = declare( [WiggleBase, YScaleMixin],

/**
 * Wiggle track that shows data with an X-Y plot along the reference.
 *
 * @lends JBrowse.View.Track.Wiggle.XYPlot
 * @extends JBrowse.View.Track.WiggleBase
 */
{
    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                style: {
                    pos_color: 'blue',
                    neg_color: 'red',
                    origin_color: '#888'
                }
            }
        );
    },

    _getScaling: function( successCallback, errorCallback ) {
        this.getRegionStats( this._getScalingRegion(), dojo.hitch(this, function( stats ) {

            //calculate the scaling if necessary
            var statsFingerprint = Digest.objectFingerprint( stats );
            if( ! this.lastScaling || this.lastScaling._statsFingerprint != statsFingerprint ) {

                var scaling = this._calculateScaling( stats );

                // bump minDisplayed to 0 if it is within 0.5% of it
                if( Math.abs( scaling.min / scaling.max ) < 0.005 )
                    scaling.min = 0;

                // update our track y-scale to reflect it
                this.makeYScale({
                    fixBounds: true,
                    min: scaling.min,
                    max: scaling.max
                });
                scaling.min = this.ruler.scaler.bounds.lower;
                scaling.max = this.ruler.scaler.bounds.upper;
                scaling.range = scaling.max - scaling.min;

                this.lastScaling = scaling;
            }

            successCallback( this.lastScaling );
        }), errorCallback );
    },

    updateStaticElements: function( coords ) {
        this.inherited( arguments );
        this.updateYScaleFromViewDimensions( coords );
    },

    /**
     * Draw a set of features on the canvas.
     * @private
     */
    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, pixels, dataScale ) {
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var toY = dojo.hitch( this, function( val ) {
           return canvasHeight * ( 1-dataScale.normalize.call(this, val) );
        });
        var originY = toY( dataScale.origin );

        var posColor  = this.config.style.pos_color;
        var negColor  = this.config.style.neg_color;
        var clipColor = this.config.style.clip_marker_color;
        var bgColor   = this.config.style.bg_color;
        var disableClipMarkers = this.config.disable_clip_markers;

        dojo.forEach( pixels, function(p,i) {
            var score = toY(p);

            // draw the background color if we are configured to do so
            if( bgColor && score >= 0 ) {
                context.fillStyle = bgColor;
                context.fillRect( i, 0, 1, canvasHeight );
            }

            if( score <= canvasHeight ) { // if the rectangle is visible at all

                if( score <= originY ) {
                    // bar goes upward
                    context.fillStyle = posColor;
                    context.fillRect( i, score, 1, originY-score+1);
                    if( !disableClipMarkers && score < 0 ) { // draw clip marker if necessary
                        context.fillStyle = clipColor || negColor;
                        context.fillRect( i, 0, 1, 2 );
                    }
                }
                else {
                    // bar goes downward
                    context.fillStyle = negColor;
                    context.fillRect( i, originY, 1, score-originY+1 );
                    if( !disableClipMarkers && score >= canvasHeight ) { // draw clip marker if necessary
                        context.fillStyle = clipColor || posColor;
                        context.fillRect( i, canvasHeight-3, 1, 2 );
                    }
                }
            }
        }, this );
    },

    /**
     * Draw anything needed after the features are drawn.
     */
    _postDraw: function( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale ) {
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var toY = dojo.hitch( this, function( val ) {
           return canvasHeight * (1-dataScale.normalize.call(this, val));
        });

        // draw the variance_band if requested
        if( this.config.variance_band ) {
            this.getGlobalStats( dojo.hitch( this, function( stats ) {
                if( ('scoreMean' in stats) && ('scoreStdDev' in stats) ) {
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
            }));
        }

        // draw the origin line if it is not disabled
        var originColor = this.config.style.origin_color;
        if( typeof originColor == 'string' && !{'none':1,'off':1,'no':1,'zero':1}[originColor] ) {
            var originY = toY( dataScale.origin );
            context.fillStyle = originColor;
            context.fillRect( 0, originY, canvas.width-1, 1 );
        }

    }

});

return XYPlot;
});
