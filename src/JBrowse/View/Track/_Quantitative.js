define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/_base/event',
            'dojo/dom-construct',
            'dojo/dom-geometry',
            'dojo/on',
            'dojo/mouse',

            'JBrowse/has',
            'JBrowse/View/Track/BlockBased',
            'JBrowse/View/Track/_ExportMixin',
            'JBrowse/View/Track/_TrackDetailsStatsMixin',
            'JBrowse/Util',
            './Wiggle/_Scale'
        ],
        function(
            declare,
            array,
            lang,
            domEvent,
            dom,
            domGeom,
            on,
            mouse,

            has,
            BlockBasedTrack,
            ExportMixin,
            DetailStatsMixin,
            Util,
            Scale
        ) {

return declare( [BlockBasedTrack, ExportMixin, DetailStatsMixin ], {

    constructor: function( args ) {
    },

    startup: function() {
        this.inherited(arguments);
        this._makeScoreDisplay();
    },

    configSchema: {
        slots: [

            { name: 'maxExportSpan', type: 'integer', defaultValue: 500000 },
            { name: 'autoscale', type: 'string', defaultValue:  'local' },
            { name: 'bicolorPivot', type: 'string' },
            { name: 'maxScore', type: 'float' },
            { name: 'minScore', type: 'float' },
            { name: 'scale', type: 'string' },
            { name: 'height', type: 'integer', defaultValue: 100 },
            { name: 'dataOffset', type: 'float', defaultValue: 0 }
        ]
    },

    _getScaling: function() {
        var thisB = this;
        return this._getScalingStats()
            .then( function( stats ) {
                       //calculate the scaling if necessary
                       if( ! thisB.lastScaling || ! thisB.lastScaling.sameStats(stats) ) {
                           return thisB.lastScaling = new Scale( thisB.exportMergedConfig(), stats );
                       } else {
                           return thisB.lastScaling;
                       }

                   });
    },

    // get the statistics to use for scaling, if necessary, either
    // from the global stats for the store, or from the local region
    // if config.autoscale is 'local'
    _getScalingStats: function() {
        if( ! Scale.prototype.needStats( this.exportMergedConfig() ) ) {
            return Util.resolved( null );
        }
        else if( this.getConf('autoscale') == 'local' ) {
            // aggregate the stats in the blocks that have data
            var stats = { scoreSum: 0, scoreSumSquares: 0, featureCount: 0, scoreMax: -Infinity, scoreMin: Infinity };
            var blockStats;
            for( var blockID in this.blockStash ) {
                if(( blockStats = this.blockStash[blockID].stats )) {
                    stats.featureCount += blockStats.featureCount || 0;
                    stats.scoreSum += blockStats.scoreSum || 0;
                    stats.scoreSumSquares += blockStats.scoreSumSquares || 0;
                    if( 'scoreMin' in blockStats )
                        stats.scoreMin = Math.min( stats.scoreMin, blockStats.scoreMin );
                    if( 'scoreMax' in blockStats )
                        stats.scoreMax = Math.max( stats.scoreMax, blockStats.scoreMax );
                }
            }
            if( stats.featureCount ) {
                stats.scoreMean = stats.scoreSum / stats.featureCount;
                stats.scoreStdDev = Util.calcStdDevFromSums( stats.scoreSum, stats.scoreSumSquares, stats.featureCount );
            }
            return Util.resolved( stats );
        }
        else {
            return this.getRegionStats.call(
                this,
                {
                    scale: 1000/(this.refSeq.get('end') - this.refSeq.get('start')),
                    ref: this.refSeq.get('name'),
                    start: this.refSeq.get('start'),
                    end: this.refSeq.get('end')
                });
        }
    },

    getFeatures: function() {
        return this.get('store').getFeatures.apply( this.get('store'), arguments );
    },

    getRegionStats: function( region ) {
        return this.get('store').getRegionStats( region );
    },

    // the canvas width in pixels for a block
    _canvasWidth: function( block ) {
        return Math.ceil( block.getDimensions().w );
    },

    // the canvas height in pixels for a block
    _canvasHeight: function() {
        return this.getConf('height');
    },

    _getBlockData: function( block, blockNode ) {
        var thisB = this;

        var baseSpan = block.getBaseSpan();
        var projectionBlock = block.getProjectionBlock();

        var scale = projectionBlock.getScale();

        var canvasWidth = this._canvasWidth( block );

        var features = [];
        return this.getFeatures(
            { ref: projectionBlock.getBName(),
              basesPerSpan: scale,
              scale: 1/scale,
              start: Math.floor( baseSpan.l ),
              end: Math.ceil( baseSpan.r )
            })
        .forEach(
                function(f) {
                    if( thisB.filterFeature(f) )
                        features.push(f);
                },
                function(args) {
                    var blockData = thisB.blockStash[ block.id() ];

                    // if the block has been freed in the meantime,
                    // don't try to render
                    if( ! blockData )
                        return;

                    var featureRects = array.map( features, function(f) {
                        return this._featureRect( 1/scale, baseSpan.l, canvasWidth, f );
                    }, thisB );


                    blockData.features = features; //< TODO: remove this
                    blockData.featureRects = featureRects;

                    blockData.pixelScores = thisB._calculatePixelScores(
                        thisB._canvasWidth(block), features, featureRects );

                    blockData.stats = thisB._calculateBlockStats( block, features );

                    if (args && args.maskingSpans)
                        blockData.maskingSpans = args.maskingSpans; // used for masking
                }
        );
    },

    _calculateBlockStats: function( block, features ) {
        var stats = {
            featureCount: features.length,
            scoreMin: Infinity,
            scoreMax: -Infinity,
            scoreSum: 0,
            scoreSumSquares: 0
        };

        var score;

        for( var i = 0; i<features.length; i++ ) {
            if(( score = features[i].get('score') )) {
                stats.scoreSum += score;
                stats.scoreSumSquares += score*score;
                stats.scoreMin = Math.min( stats.scoreMin, score );
                stats.scoreMax = Math.max( stats.scoreMax, score );
            }
        }

        if( stats.scoreMin == Infinity )
            delete stats.scoreMin;
        if( stats.scoreMax == -Infinity )
            delete stats.scoreMax;

        return stats;
    },

    // render the actual graph display for the block.  should be called only after a scaling
    // has been decided upon and stored in this.scaling
    renderBlock: function( block, blockNode ) {
        var blockdata = this.blockStash[block.id()];

        // don't render this block again if we have already rendered
        // it with this scaling scheme
        if( ! this.scaling.compare( blockdata.scaling ) || ! blockdata.pixelScores )
           return;

        blockdata.scaling = this.scaling;

        dom.empty( blockNode );

        if( ! has('canvas') )
            throw new Error( 'This browser does not support HTML canvas elements.' );

        var features = blockdata.features;
        var featureRects = blockdata.featureRects;
        var dataScale = this.scaling;
        var canvasHeight = this._canvasHeight();
        var basespan = block.getBaseSpan();

        var c = dom.create(
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
            blockNode
        );
        blockdata.canvas = c;

        //Calculate the score for each pixel in the block
        this._draw( blockdata.scale,    basespan.l,
                    basespan.r,     block,
                    c,              features,
                    featureRects,   dataScale,
                    blockdata.pixelScores,  blockdata.maskingSpans ); // note: spans may be undefined.

        this.heightUpdate( c.height );
        if( !( c.parentNode && c.parentNode.parentNode )) {
            c.style.position = "absolute";
            c.style.left = 0;//(100 * ((c.startBase - basespan.l) / basespan.w)) + "%";
            c.style.top = 0;
        }
    },

    _fillBlock: function( block, blockNode, changeInfo ) {
        var thisB = this;
        this.heightUpdate( this._canvasHeight() );

        // get the features for this block, and then set in motion the
        // updating of the graphs
        return this._getBlockData( block, blockNode, changeInfo )
            .then( function() {
                       return thisB.updateGraphs( block, blockNode );
                   });
    },

    updateGraphs: function( block, blockNode ) {
        var thisB = this;

        // update the global scaling
        return this._getScaling()
            .then( function( scaling ) {
                       thisB.scaling = scaling;
                       // render all of the blocks that need it
                       for( var blockid in thisB.blockStash ) {
                           var blockData = thisB.blockStash[blockid];
                           if( blockData.node.parentNode )
                               thisB.renderBlock( blockData.block, blockData.node );
                       }
                   });
    },

    // Draw features
    _draw: function(scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale, pixels, spans) {
        this._preDraw(      scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale );
        this._drawFeatures( scale, leftBase, rightBase, block, canvas, pixels, dataScale );
        if ( spans ) {
            this._maskBySpans( scale, leftBase, rightBase, block, canvas, pixels, dataScale, spans );
        }
        this._postDraw(     scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale );
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

    // If we are making a boolean track, this will be called. Overwrite.
    _maskBySpans: function( scale, leftBase, canvas, spans, pixels ) {
    },

    _postDraw: function() {
    },

    _calculatePixelScores: function( canvasWidth, features, featureRects ) {
        // make an array of the max score at each pixel on the canvas
        var pixelValues = new Array( canvasWidth );
        array.forEach( features, function( f, i ) {
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
                    pixelValues[j] = { score: score, lastUsedStore: store, feat: f };
                }
            }
        },this);
        // when done looping through features, forget the store information.
        for (var i=0; i<pixelValues.length; i++) {
            if ( pixelValues[i] ) {
                delete pixelValues[i]['lastUsedStore'];
            }
        }
        return pixelValues;
    },

    _makeScoreDisplay: function() {
        var thisB = this;

        if( ! this._mouseoverEvent )
            this._mouseoverEvent = this.own(
                on( this.domNode, 'mousemove', function( evt ) {
                        evt = domEvent.fix( evt );
                        thisB.getBlockStashForRange( evt.clientX, evt.clientX )
                            .then( function( stashEntries ) {
                                       if( ! stashEntries.length )
                                           return;
                                       var bp = stashEntries[0].projectionBlock.projectPoint( evt.clientX );
                                       thisB.mouseover( bp, stashEntries[0], evt );
                                   });
                    }))[0];

        if( ! this._mouseoutEvent )
            this._mouseoutEvent = this.own(
                on( this.domNode, mouse.leave, function( evt) {
                        thisB.mouseover( undefined );
                    }))[0];

        // make elements and events to display it
        if( ! this.scoreDisplay )
            this.scoreDisplay = {
                flag: dom.create(
                    'div', {
                        className: 'wiggleValueDisplay',
                        style: {
                            position: 'fixed',
                            display: 'none',
                            zIndex: 15
                        }
                    }, this.domNode),
                pole: dom.create(
                    'div', {
                        className: 'wigglePositionIndicator',
                        style: {
                            position: 'fixed',
                            display: 'none',
                            zIndex: 15
                        }
                    }, this.domNode )
            };
    },

    mouseover: function( bpX, blockdata, evt ) {
        if( bpX && blockdata && evt && blockdata.canvas && blockdata.pixelScores ) {
            var pixelValues = blockdata.pixelScores;
            var canvas = blockdata.canvas;
            var cPos = domGeom.position( canvas );
            var x = evt.pageX;
            var cx = evt.pageX - cPos.x;

            if( this._showPixelValue( this.scoreDisplay.flag, pixelValues[ Math.round( cx ) ] ) ) {
                this.scoreDisplay.flag.style.display = 'block';
                this.scoreDisplay.pole.style.display = 'block';

                this.scoreDisplay.flag.style.left = evt.clientX+'px';
                this.scoreDisplay.flag.style.top  = cPos.y+'px';
                this.scoreDisplay.pole.style.left = evt.clientX+'px';
                this.scoreDisplay.pole.style.height = cPos.h+'px';
                return;
            }
        }

        this.scoreDisplay.flag.style.display = 'none';
        this.scoreDisplay.pole.style.display = 'none';
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
        }
        else if( score && score['score'] && typeof score['score'] == 'number' ) {
            // "score" may be an object.
            scoreDisplay.innerHTML = parseFloat( score['score'].toPrecision(6) );
            return true;
        }
        else {
            return false;
        }
    }

});
});
