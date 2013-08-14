define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/Color',
            'dojo/on',
            'JBrowse/View/Track/WiggleBase',
            'JBrowse/View/Track/YScaleMixin',
            'JBrowse/Util',
            './_Scale'
        ],
        function( declare, array, Color, on, WiggleBase, YScaleMixin, Util, Scale ) {

var XYPlot = declare( [WiggleBase, YScaleMixin],

/**
 * Wiggle track that shows data with an X-Y plot along the reference.
 *
 * @lends JBrowse.View.Track.Wiggle.XYPlot
 * @extends JBrowse.View.Track.WiggleBase
 */
{
    _configSchemaDefinition: function() {
        var def = this.inherited( arguments );
        def.slots.push.apply( def.slots, [
            { name: 'height', defaultValue: 100 },
            { name: 'posColor', type: 'Color', defaultValue: 'blue' },
            { name: 'negColor', type: 'Color', defaultValue: 'red' },
            { name: 'originColor',  type: 'string', defaultValue: '#888' },
            { name: 'clipMarkerColor', type: 'Color', defaultValue: 'red' },
            { name: 'backgroundColor', type: 'Color' },
            { name: 'varianceBandColor', type: 'Color', defaultValue: 'rgba(0,0,0,0.3)' },
            { name: 'showVarianceBands', type: 'boolean', defaultValue: false },
            { name: 'varianceBandPositions', type: 'multi-float', defaultValue: [2,1] },
            { name: 'color', type: 'Color' },
            { name: 'maskAlpha', type: 'float', defaultValue: 0.2 },
            { name: 'disableClipMarkers', type: 'boolean', defaultValue: false }
        ]);
        return def;
    },

    _getScaling: function( successCallback, errorCallback ) {

        this._getScalingStats( dojo.hitch(this, function( stats ) {

            //calculate the scaling if necessary
            if( ! this.lastScaling || ! this.lastScaling.sameStats( stats ) ) {

                var scaling = new Scale( this.exportMergedConfig(), stats );

                // bump minDisplayed to 0 if it is within 0.5% of it
                if( Math.abs( scaling.min / scaling.max ) < 0.005 )
                    scaling.min = 0;

                // update our track y-scale to reflect it
                this.makeYScale({
                    fixBounds: true,
                    min: scaling.min,
                    max: scaling.max
                });

                // and finally adjust the scaling to match the ruler's scale rounding
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

        var disableClipMarkers = this.getConf('disableClipMarkers');

        dojo.forEach( pixels, function(p,i) {
            if (!p)
                return;
            var score = toY(p['score']);
            var f = p['feat'];

            // draw the background color if we are configured to do so
            if( score >= 0 ) {
                var bgColor = this.getConfForFeature('backgroundColor', f );
                if( bgColor ) {
                    context.fillStyle = bgColor.toString();
                    context.fillRect( i, 0, 1, canvasHeight );
                }
            }


            if( score <= canvasHeight || score > originY) { // if the rectangle is visible at all
                if( score <= originY ) {
                    // bar goes upward
                    context.fillStyle = this.getConfForFeature('posColor',f).toString();
                    context.fillRect( i, score, 1, originY-score+1);
                    if( !disableClipMarkers && score < 0 ) { // draw clip marker if necessary
                        context.fillStyle = (this.getConfForFeature('clipMarkerColor',f) || this.getConfForFeature('negColor',f)).toString();
                        context.fillRect( i, 0, 1, 3 );

                    }
                }
                else {
                    // bar goes downward
                    context.fillStyle = this.getConfForFeature('negColor',f).toString();
                    context.fillRect( i, originY, 1, score-originY+1 );
                    if( !disableClipMarkers && score >= canvasHeight ) { // draw clip marker if necessary
                        context.fillStyle = (this.getConfForFeature('clipMarkerColor',f) || this.getConfForFeature('posColor',f)).toString();
                        context.fillRect( i, canvasHeight-3, 1, 3 );

                    }
                }
            }
        }, this );
    },

    _calculatePixelScores: function( canvasWidth, features, featureRects ) {
        /* A variant of calculatePixelScores that stores the feature used at each pixel. 
         * If there are multiple features, use the first one */
        var pixelValues = new Array( canvasWidth );
        dojo.forEach( features, function( f, i ) {
            var store = f.source;
            var fRect = featureRects[i];
            var jEnd = fRect.r;
            var score = f.get('score');
            for( var j = Math.round(fRect.l); j < jEnd; j++ ) {
                if ( pixelValues[j] && pixelValues[j]['lastUsedStore'] == store ) {
                    /* Note: if the feature is from a different store, the condition should fail,
                     *       and we will add to the value, rather than adjusting for overlap */
                    pixelValues[j]['score'] = Math.max( pixelValues[j]['score'], score );
                }
                else if ( pixelValues[j] ) {
                    pixelValues[j]['score'] = pixelValues[j]['score'] + score;
                    pixelValues[j]['lastUsedStore'] = store;
                }
                else {
                    pixelValues[j] = { score: score, lastUsedStore: store, feat: f }
                }
            }
        },this);
        // when done looping through features, forget the store information.
        for (var i=0; i<pixelValues.length; i++) {
            if ( pixelValues[i] ) {
                pixelValues[i] = { score: pixelValues[i]['score'], feat: pixelValues[i]['feat'] };
            }
        }
        return pixelValues;
    },

    /* If it's a boolean track, mask accordingly */
    _maskBySpans: function( scale, leftBase, rightBase, block, canvas, pixels, dataScale, spans ) {
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;

        for ( var index in spans ) {
            if (spans.hasOwnProperty(index)) {
                var w = Math.ceil(( spans[index].end   - spans[index].start ) * scale );
                var l = Math.round(( spans[index].start - leftBase ) * scale );
                context.clearRect( l, 0, w, canvasHeight );
            }
        }
        context.globalAlpha = this.getConf('maskAlpha');
        this._drawFeatures( scale, leftBase, rightBase, block, canvas, pixels, dataScale );
        context.globalAlpha = 1;
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
        if( this.getConf('showVarianceBands') ) {
            var bandPositions = this.getConf('varianceBandPositions').sort().reverse();
            this.getRegionStats(
                this.makeStoreQuery({ ref: this.refSeq.name, start: this.refSeq.start, end: this.refSeq.end }),
                dojo.hitch( this, function( stats ) {
                                if( ('scoreMean' in stats) && ('scoreStdDev' in stats) ) {
                                    var drawVarianceBand = function( plusminus, fill, label ) {
                                        context.fillStyle = fill.toString();
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

                                    var maxColor = new Color( this.getConf('varianceBandColor') );
                                    var minColor = new Color( this.getConf('varianceBandColor') );
                                    minColor.a /= bandPositions.length;

                                    var bandOpacityStep = 1/bandPositions.length;
                                    var minOpacity = bandOpacityStep;

                                    array.forEach( bandPositions, function( pos,i ) {
                                                       drawVarianceBand( pos*stats.scoreStdDev,
                                                                         Color.blendColors( minColor, maxColor, (i+1)/bandPositions.length).toCss(true),
                                                                         pos+'σ');
                                                   });
                                    drawVarianceBand( 0, 'rgba(255,255,0,0.7)', 'mean' );
                                }
                            }));
        }

        // draw the origin line if it is not disabled
        var originColor = this.getConf('originColor');
        if( typeof originColor == 'string' && !{'none':1,'off':1,'no':1,'zero':1}[originColor] ) {
            var originY = toY( dataScale.origin );
            context.fillStyle = originColor;
            context.fillRect( 0, originY, canvas.width, 1 );
        }

    }

});

return XYPlot;
});
