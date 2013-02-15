define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/dom-construct',
            'dojo/on',
            'JBrowse/View/Track/Canvas',
            'JBrowse/View/Track/ExportMixin',
            'JBrowse/Util',
            './Wiggle/_Scale'
        ],
        function( declare, array, dom, on, CanvasTrack, ExportMixin, Util, Scale ) {

return declare( [CanvasTrack,ExportMixin], {

    constructor: function( args ) {
        this.store = args.store;
    },

    _defaultConfig: function() {
        return {
            maxExportSpan: 500000
        };
    },

    _getScaling: function( successCallback, errorCallback ) {

        this.getRegionStats( this._getScalingRegion(), dojo.hitch(this, function( stats ) {

            //calculate the scaling if necessary
            if( ! this.lastScaling || ! this.lastScaling.sameStats(stats) ) {
                try {
                    this.lastScaling = new Scale( this, stats );
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
        return dojo.clone(
            this.config.autoscale == 'local'  ? this.browser.view.visibleRegion() :
                                                this.browser.getCurrentRefSeq()
        );
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

    _renderWithScale: function( args, dataScale ) {
            var blockIndex = args.blockIndex;
            var canvasHeight = parseInt(( this.config.style || {}).height) || 100;
            var block = args.block;
            var leftBase = args.leftBase;
            var rightBase = args.rightBase;
            var scale = args.scale;
            var finishCallback = args.finishCallback || function() {};

            var blockWidth = rightBase - leftBase;
            var canvasWidth  = Math.ceil(( rightBase - leftBase ) * scale);

            dom.empty( block );

            try {
                dojo.create('canvas').getContext('2d').fillStyle = 'red';
            } catch( e ) {
                this.fatalError = 'This browser does not support HTML canvas elements.';
                this.fillBlockError( blockIndex, block, this.fatalError );
                return;
            }

            var c = dojo.create(
                'canvas',
                { height: canvasHeight,
                  width:  canvasWidth,
                  style: {
                      cursor: 'default',
                      width: "100%",
                      height: canvasHeight + "px"
                  },
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

                    // if the block has been freed in the meantime,
                    // don't try to render
                    if( ! block.parentNode )
                        return;

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
    },


    fillBlock: function( args ) {
        var thisB = this;
        var canvasHeight = parseInt(( this.config.style || {}).height) || 100;
        this.heightUpdate( canvasHeight, args.blockIndex );

        this._getScaling( function( scaling ) {

                              var block = args.block;
                              if( scaling.compare( block.scaling ) ) {
                                  args.block.scaling = scaling;
                                  thisB._renderWithScale( args, scaling );
                              }
                          },
                          function(e) {
                              thisB.error = e;
                              thisB.fillBlockError( args.blockIndex, args.block );
                              args.finishCallback();
                          });
    },

    /**
     * Calculate the left and width, in pixels, of where this feature
     * will be drawn on the canvas.
     * @private
     * @returns {Object} with l, r, and w
     */
    _featureRect: function( scale, leftBase, canvas, feature, dataScale ) {
        var fRect = {
            w: Math.ceil(( feature.get('end')   - feature.get('start') ) * scale ),
            l: Math.round(( feature.get('start') - leftBase ) * scale )
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

    _calculatePixelScores: function( canvasWidth, features, featureRects ) {
        // make an array of the max score at each pixel on the canvas
        var pixelValues = new Array( canvasWidth );
        dojo.forEach( features, function( f, i ) {
            var fRect = featureRects[i];
            var jEnd = fRect.r;
            var score = f.get('score');
            for( var j = Math.round(fRect.l); j < jEnd; j++ ) {
                pixelValues[j] = j in pixelValues ? Math.max( pixelValues[j], score ) : score;
            }
        },this);
        return pixelValues;
    },

    _makeScoreDisplay: function( scale, leftBase, rightBase, block, canvas, features, featureRects ) {

        var pixelValues = this._calculatePixelScores( canvas.width, features, featureRects );

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
                var target = evt.srcElement || evt.target;
                var evtParent = evt.relatedTarget || evt.toElement;
                if( !target || !evtParent || target.parentNode != evtParent.parentNode) {
                    scoreDisplay.style.display = 'none';
                    verticalLine.style.display = 'none';
                }
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
});
