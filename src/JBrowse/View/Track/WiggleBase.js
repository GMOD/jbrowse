define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/dom-construct',
            'dojo/on',
            'dojo/mouse',
            'JBrowse/View/Track/BlockBased',
            'JBrowse/View/Track/ExportMixin',
            'JBrowse/Util',
            './Wiggle/_Scale'
        ],
        function( declare, array, dom, on, mouse, BlockBasedTrack, ExportMixin, Util, Scale ) {

return declare( [BlockBasedTrack,ExportMixin], {

    constructor: function( args ) {
        this.trackPadding = args.trackPadding || 0;

        if( ! ('style' in this.config ) ) {
            this.config.style = {};
        }

        this.store = args.store;
    },

    _defaultConfig: function() {
        return {
            maxExportSpan: 500000,
            autoscale: 'global'
        };
    },

    _getScaling: function( successCallback, errorCallback ) {

        this._getScalingStats( dojo.hitch(this, function( stats ) {

            //calculate the scaling if necessary
            if( ! this.lastScaling || ! this.lastScaling.sameStats(stats) ) {
                try {
                    this.lastScaling = new Scale( this.config, stats );
                    successCallback( this.lastScaling );
                } catch( e ) {
                    errorCallback(e);
                }
            } else {
                successCallback( this.lastScaling );
            }

        }), errorCallback );
    },

    // get the statistics to use for scaling, if necessary, either
    // from the global stats for the store, or from the local region
    // if config.autoscale is 'local'
    _getScalingStats: function( callback, errorCallback ) {
        if( ! Scale.prototype.needStats( this.config ) ) {
            callback( null );
            return null;
        }
        else if( this.config.autoscale == 'local' ) {
            return this.getRegionStats.call( this, this.browser.view.visibleRegion(), callback, errorCallback );
        }
        else {
            return this.getGlobalStats.apply( this, arguments );
        }
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

    // the canvas width in pixels for a block
    _canvasWidth: function( block ) {
        return Math.ceil(( block.endBase - block.startBase ) * block.scale);
    },

    // the canvas height in pixels for a block
    _canvasHeight: function() {
        return parseInt(( this.config.style || {}).height) || 100;
    },

    _getBlockFeatures: function( args ) {
            var blockIndex = args.blockIndex;
            var block = args.block;

            var leftBase = args.leftBase;
            var rightBase = args.rightBase;

            var scale = args.scale;
            var finishCallback = args.finishCallback || function() {};

            var canvasWidth = this._canvasWidth( args.block );

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
                    if( ! (block.domNode && block.domNode.parentNode ))
                        return;

                    var featureRects = array.map( features, function(f) {
                        return this._featureRect( scale, leftBase, canvasWidth, f );
                    }, this );

                    block.features = features;  //< TODO: remove this
                    block.featureRects = featureRects;
                    block.pixelScores = this._calculatePixelScores( this._canvasWidth(block), features, featureRects );

                    finishCallback();
                }),
                dojo.hitch( this, function(e) {
                    this._handleError( e, args );
                })
            );
    },

    // render the actual graph display for the block.  should be called only after a scaling
    // has been decided upon and stored in this.scaling
    renderBlock: function( args ) {
        var block = args.block;

        // don't render this block again if we have already rendered
        // it with this scaling scheme
        if( ! this.scaling.compare( block.scaling ) || ! block.pixelScores )
           return;



        block.scaling = this.scaling;

        dom.empty( block.domNode );

        try {
            document.createElement('canvas').getContext('2d').fillStyle = 'red';
        } catch( e ) {
            this.fatalError = 'This browser does not support HTML canvas elements.';
            this.showFatalError( this.fatalError );
            return;
        }

        var features = block.features;
        var featureRects = block.featureRects;
        var dataScale = this.scaling;
        var canvasHeight = this._canvasHeight();

        var c = dojo.create(
            'canvas',
            { height: canvasHeight,
              width:  this._canvasWidth(block),
              style: {
                  cursor: 'default',
                  width: "100%",
                  height: canvasHeight + "px"
              },
              innerHTML: 'Your web browser cannot display this type of track.',
              className: 'canvas-track'
            },
            block.domNode
        );
        c.startBase = block.startBase;

        // schedule it to be rendered once we have all agreed on a scaling
        this._preDraw(      null, block.startBase, block.endBase, block, c, features, featureRects, dataScale );
        this._drawFeatures( null, block.startBase, block.endBase, block, c, features, featureRects, dataScale );
        this._postDraw(     null, block.startBase, block.endBase, block, c, features, featureRects, dataScale );

        this._makeScoreDisplay( null, block.startBase, block.endBase, block, c, features, featureRects );

        this.heightUpdate( c.height, args.blockIndex );
        if( !( c.parentNode && c.parentNode.parentNode )) {
            var blockWidth = block.endBase - block.startBase;

            c.style.position = "absolute";
            c.style.left = (100 * ((c.startBase - block.startBase) / blockWidth)) + "%";
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
    },

    fillBlock: function( args ) {
        var thisB = this;
        this.heightUpdate( this._canvasHeight(), args.blockIndex );

        // hook updateGraphs onto the end of the block feature fetch
        var oldFinish = args.finishCallback || function() {};
        args.finishCallback = function() {
            thisB.updateGraphs( oldFinish );
        };

        // get the features for this block, and then set in motion the
        // updating of the graphs
        this._getBlockFeatures( args );
    },

    updateGraphs: function( callback ) {
        var thisB = this;

        // update the global scaling
        this._getScaling( function( scaling ) {
                              thisB.scaling = scaling;
                              // render all of the blocks that need it
                              array.forEach( thisB.blocks, function( block, blockIndex ) {
                                  if( block && block.domNode.parentNode )
                                      thisB.renderBlock({
                                                            block: block,
                                                            blockIndex: blockIndex
                                                        });
                              });
                              callback();
                          },
                          function(e) {
                              thisB.error = e;
                              thisB._handleError( e );
                          });

    },

    startZoom: function(destScale, destStart, destEnd) {
    },

    endZoom: function(destScale, destBlockBases) {
        this.clear();
    },

    /**
     * Calculate the left and width, in pixels, of where this feature
     * will be drawn on the canvas.
     * @private
     * @returns {Object} with l, r, and w
     */
    _featureRect: function( scale, leftBase, canvasWidth, feature ) {
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
        fRect.w = Math.min( canvasWidth-fRect.l, fRect.w );
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

        var pixelValues = block.pixelScores;

        // make elements and events to display it
        var scoreDisplay = dojo.create(
            'div', {
                className: 'wiggleValueDisplay',
                style: {
                    position: 'fixed',
                    display: 'none',
                    zIndex: 15
                }
            }, block.domNode );
        var verticalLine = dojo.create( 'div', {
                className: 'wigglePositionIndicator',
                style: {
                    position: 'fixed',
                    display: 'none',
                    height: canvas.height+'px',
                    zIndex: 15
                }
        }, block.domNode );
        dojo.forEach( [canvas,verticalLine,scoreDisplay], function(element) {
            this.own( on( element, 'mousemove', dojo.hitch(this,function(evt) {
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
            })));
        },this);
        this.own( on( block.domNode, mouse.leave, function(evt) {
                          scoreDisplay.style.display = 'none';
                          verticalLine.style.display = 'none';
        }));
    },

    _showPixelValue: function( scoreDisplay, score ) {
        var scoreType = typeof score;
        if( scoreType == 'number' ) {
            // display the score with only 6
            // significant digits, avoiding
            // most confusion about the
            // approximative properties of
            // IEEE floating point numbers
            // parsed out of BigWig files
            scoreDisplay.innerHTML = parseFloat( score.toPrecision(6) );
            return true;
        }
        else if( scoreType == 'string' ) {
            scoreDisplay.innerHTML = score;
            return true;
        }
        else {
            return false;
        }
    },

    _exportFormats: function() {
        return [{name: 'bedGraph', label: 'bedGraph', fileExt: 'bedgraph'}, {name: 'Wiggle', label: 'Wiggle', fileExt: 'wig'}, {name: 'GFF3', label: 'GFF3', fileExt: 'gff3'} ];
    }
});
});
