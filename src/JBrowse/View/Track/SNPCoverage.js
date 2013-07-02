define( ['dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/View/Track/Wiggle/XYPlot',
         'JBrowse/Util',
         'JBrowse/View/Track/_AlignmentsMixin',
         'JBrowse/Store/SeqFeature/SNPCoverage'
        ],
        function( declare, array, WiggleXY, Util, AlignmentsMixin, SNPCoverageStore ) {

var dojof = Util.dojof;

return declare( [WiggleXY, AlignmentsMixin],
{
    constructor: function() {
        // force conf variables that are meaningless for this kind of track, and maybe harmful
        delete this.config.bicolor_pivot;
        delete this.config.scale;
        delete this.config.align;

        this.store = new SNPCoverageStore({ store: this.store, browser: this.browser });
    },

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                autoscale: 'local',
                min_score: 0
            }
        );
    },

    /*
     * Draw a set of features on the canvas.
     * @private
     */
    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale ) {
        var thisB = this;
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var toY = dojo.hitch( this, function( val ) {
           return canvasHeight * ( 1-dataScale.normalize.call(this, val) );
        });
        var originY = toY( dataScale.origin );

        // a canvas element below the histogram that will contain indicators of likely SNPs
        var snpCanvasHeight = parseInt( block.domNode.parentNode.style.height ) - canvas.height;
        var snpCanvas = dojo.create('canvas',
                                    {height: snpCanvasHeight,
                                     width: canvas.width,
                                     style: {
                                         cursor: 'default',
                                         width: "100%",
                                         height: snpCanvasHeight + "px"
                                     },
                                     innerHTML: 'Your web browser cannot display this type of track.',
                                     className: 'SNP-indicator-track'
                                 }, block.domNode);
        var snpContext = snpCanvas.getContext('2d');

        var negColor  = this.config.style.neg_color;
        var clipColor = this.config.style.clip_marker_color;
        var bgColor   = this.config.style.bg_color;
        var disableClipMarkers = this.config.disable_clip_markers;

        var drawRectangle = function(ID, yPos, height, fRect) {
            if( yPos <= canvasHeight ) { // if the rectangle is visible at all
                context.fillStyle = thisB.colorForBase(ID);
                if( yPos <= originY ) {
                    // bar goes upward
                    context.fillRect( fRect.l, yPos, fRect.w, height);
                    if( !disableClipMarkers && yPos < 0 ) { // draw clip marker if necessary
                        context.fillStyle = clipColor || negColor;
                        context.fillRect( fRect.l, 0, fRect.w, 2 );
                    }
                }
                else {
                    // bar goes downward
                    context.fillRect( fRect.l, originY, fRect.w, height );
                    if( !disableClipMarkers && yPos >= canvasHeight ) { // draw clip marker if necessary
                        context.fillStyle = clipColor || thisB.colorForBase(ID);
                        context.fillRect( fRect.l, canvasHeight-3, fRect.w, 2 );
                    }
                }
            }
        };

        // Note: 'reference' is done first to ensure the grey part of the graph is on top
        dojo.forEach( features, function(f,i) {
            var fRect = featureRects[i];
            var score = f.get('score');

            // draw the background color if we are configured to do so
            if( bgColor ) {
                context.fillStyle = bgColor;
                context.fillRect( fRect.l, 0, fRect.w, canvasHeight );
            }

            drawRectangle( 'reference', toY( score.total() ), originY-toY( score.get('reference'))+1, fRect);
        });

        dojo.forEach( features, function(f,i) {
            var fRect = featureRects[i];
            var score = f.get('score');
            var totalHeight = score.total();

            // draw indicators of SNPs if base coverage is greater than 50% of total coverage
            score.forEach( function( count, category ) {
                if ( category != 'reference' && count > 0.5*totalHeight ) {
                    snpContext.beginPath();
                    snpContext.arc( fRect.l + 0.5*fRect.w,
                                    0.40*snpCanvas.height,
                                    0.20*snpCanvas.height,
                                    1.75 * Math.PI,
                                    1.25 * Math.PI,
                                    false);
                    snpContext.lineTo(fRect.l + 0.5*fRect.w, 0);
                    snpContext.closePath();
                    snpContext.fillStyle = thisB.colorForBase(category);
                    snpContext.fill();
                    snpContext.lineWidth = 1;
                    snpContext.strokeStyle = 'black';
                    snpContext.stroke();
                }
            });

            totalHeight -= score.get('reference');

            score.forEach( function( count, category ) {
                if ( category != 'reference' ) {
                    drawRectangle( category, toY(totalHeight), originY-toY( count )+1, fRect);
                    totalHeight -= count;
                }
            });
        }, this );
    },

    // Overwrites the method from WiggleBase
    _draw: function( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale, pixels, spans ) {
        // Note: pixels currently has no meaning, as the function that generates it is not yet defined for this track
        this._preDraw(      scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale );
        this._drawFeatures( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale );
        if ( spans ) {
            this._maskBySpans( scale, leftBase, canvas, spans );
        }
        this._postDraw(     scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale );
    },

    /* If it's a boolean track, mask accordingly */
    _maskBySpans: function( scale, leftBase, canvas, spans ) {
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var booleanAlpha = this.config.style.masked_transparancy || 0.17;
        this.config.style.masked_transparancy = booleanAlpha;

        // make a temporary canvas to store image data
        var tempCan = dojo.create( 'canvas', {height: canvasHeight, width: canvas.width} );
        var ctx2 = tempCan.getContext('2d');

        for ( var index in spans ) {
            if (spans.hasOwnProperty(index)) {
                var w = Math.round(( spans[index].end   - spans[index].start ) * scale );
                var l = Math.round(( spans[index].start - leftBase ) * scale );
                if (l+w >= canvas.width)
                    w = canvas.width-l // correct possible rounding errors
                if (w==0)
                    continue; // skip if there's no width.
                ctx2.drawImage(canvas, l, 0, w, canvasHeight, l, 0, w, canvasHeight);
                context.globalAlpha = booleanAlpha;
                // clear masked region and redraw at lower opacity.
                context.clearRect(l, 0, w, canvasHeight);
                context.drawImage(tempCan, l, 0, w, canvasHeight, l, 0, w, canvasHeight);
                context.globalAlpha = 1;
            }
        }
    },

    /*
     * The following method is required to override the equivalent method in "WiggleBase.js"
     * It displays more complete data.
     */
    _showPixelValue: function( scoreDisplay, score ) {
        if( ! score )
            return false;

        function fmtNum( num ) {
            return parseFloat( num ).toPrecision(6).replace(/0+$/,'').replace(/\.$/,'');
        }

        if( score.snpsCounted ) {
            var total = score.total();
            var scoreSummary = '<table>';
            function pctString( count ) {
                return Math.round(count/total*100)+'%';
            }
            scoreSummary +=
                  '<tr class="ref"><td>'
                + (score.refBase ? score.refBase+'*' : 'Ref')
                + '</td><td class="count">'
                + fmtNum( score.get('reference') )
                + '</td><td class="pct">'
                + pctString( score.get('reference') )
                + '</td></tr>';

            score.forEach( function( count, category ) {
                if( category == 'reference' ) return;

                // if this count has more nested categories, do counts of those
                var subdistribution = '';
                if( count.forEach ) {
                    subdistribution = [];
                    count.forEach( function( count, category ) {
                        subdistribution.push( fmtNum(count) + ' '+category );
                    });
                    subdistribution = subdistribution.join(', ');
                    if( subdistribution )
                        subdistribution = '('+subdistribution+')';
                }

                category = { '*': 'del' }[category] || category;
                scoreSummary += '<tr><td>'+category + '</td><td class="count">' + fmtNum(count) + '</td><td class="pct">'
                                   +pctString(count)+'</td><td class="subdist">'+subdistribution + '</td></tr>';
            });
            scoreSummary += '<tr class="total"><td>Total</td><td class="count">'+fmtNum(total)+'</td><td class="pct">&nbsp;</td><td class="subdist">&nbsp;</td></tr>';
            scoreDisplay.innerHTML = scoreSummary+'</table>';
            return true;
        } else {
            scoreDisplay.innerHTML = '<table><tr><td>Total</td><td class="count">'+fmtNum(score)+'</td></tr></table>';
            return true;
        }
    }
});
});