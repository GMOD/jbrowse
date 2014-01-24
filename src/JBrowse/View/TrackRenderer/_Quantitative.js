define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/_base/event',
            'JBrowse/has!jbrowse-main-process?dojo/dom-construct',
            'JBrowse/has!jbrowse-main-process?dojo/dom-geometry',
            'dojo/on',
            'dojo/mouse',
            'dojo/when',
            'dojo/promise/all',


            'JBrowse/DOMNode/Remote',
            'JBrowse/has',
            './_Base',
            'JBrowse/View/Track/_TrackDetailsStatsMixin',
            'JBrowse/Util',
            './Quantitative/_Scale'
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
            when,
            all,

            RemoteDOMNode,
            has,
            RendererBase,
            DetailStatsMixin,
            Util,
            Scale
        ) {

return declare( [RendererBase, DetailStatsMixin ], {

    constructor: function() {

        this._widgetNode = new RemoteDOMNode();
    },

    trackCSSClass: 'quantitative',

    postStartup: function() {
        this.inherited(arguments);
        this._makeScoreDisplay();
        this.updateGraphs().then( null, Util.logError );
    },

    configSchema: {
        slots: [

            { name: 'maxExportSpan', type: 'integer', defaultValue: 500000 },
            { name: 'autoscale', type: 'string', defaultValue:  'local',
              description: 'Auto-scaling method to use.'
                           + ' Local: adjust scale based on the data in the visible region.'
                           + ' Global: set scale base on the statistics for the whole reference sequence.'
                           + ' zScore: set scale to +/- a certain number of standard deviations (set by zScoreBound)'
            },
            { name: 'zScoreBound', type: 'float', defaultValue: 4,
              description: 'Number of standard deviations to show on the scale when autoscale is set to "zScore".'
            },
            { name: 'bicolorPivot', type: 'string' },
            { name: 'maxScore', type: 'float' },
            { name: 'minScore', type: 'float' },
            { name: 'scale', type: 'string' },
            { name: 'height', type: 'integer', defaultValue: 100 },
            { name: 'dataOffset', type: 'float', defaultValue: 0 },

            { name: 'graphUpdateInterval', type: 'integer', defaultValue: 200,
              description: 'time in milliseconds to wait for additional block modifications before redrawing all the graphs'
            }
        ]
    },

    _getScaling: function() {
        var thisB = this;
        return this._getScalingStats()
            .then( function( stats ) {
                       //calculate the scaling if necessary
                       if( ! thisB.lastScaling || ! thisB.lastScaling.sameStats(stats) ) {
                           return thisB.lastScaling = new Scale( thisB, stats );
                       } else {
                           return thisB.lastScaling;
                       }

                   });
    },

    // get the statistics to use for scaling, if necessary, either
    // from the global stats for the store, or from the local region
    // if config.autoscale is 'local'
    _getScalingStats: function() {
        if( ! Scale.prototype.needStats( this ) ) {
            return Util.resolved( null );
        }
        else if( this.getConf('autoscale') == 'global' && this.get('store').getGlobalStats ) {
            return this.get('store').getGlobalStats();
        }
        else {
            // aggregate the stats in the blocks that have data
            var stats = { scoreSum: 0, scoreSumSquares: 0, featureCount: 0, scoreMax: -Infinity, scoreMin: Infinity };
            var blockStats;
            var s = this.getBlockStash();
            for( var blockID in s ) {
                if(( blockStats = s[blockID].stats )) {
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
    },

    getFeatures: function() {
        return this.get('store').getFeatures.apply( this.get('store'), arguments );
    },

    getRegionStats: function( region ) {
        return this.get('store').getRegionStats( region );
    },

    _getBlockData: function( block, blockNode, changeInfo ) {
        var thisB = this;

        var baseSpan = block.getBaseSpan();
        var projectionBlock = block.getProjectionBlock();
        var scale = projectionBlock.getScale();
        var canvasWidth = this._canvasWidth( block );

        var features = [];
        return this.getFeatures( this.makeStoreQueryForBlock( block, blockNode, changeInfo ) )
        .forEach(
                function(f) {
                    if( thisB.filterFeature(f) )
                        features.push(f);
                },
                function(args) {
                    var blockData = {};

                    var featureRects = array.map( features, function(f) {
                        return this._featureRect( 1/scale, baseSpan.l, canvasWidth, f );
                    }, thisB );


                    blockData.features = features; //< TODO: remove this
                    blockData.featureRects = featureRects;

                    blockData.pixelScores = thisB._calculatePixelScores(
                        canvasWidth, features, featureRects );

                    //console.log( 'block '+block.id()+' has '+blockData.pixelScores.length+' pixelScores for canvas '+canvasWidth+', basespan '+JSON.stringify( baseSpan ));

                    blockData.stats = thisB._calculateBlockStats( block, features );

                    if (args && args.maskingSpans)
                        blockData.maskingSpans = args.maskingSpans; // used for masking

                    lang.mixin( thisB.getBlockStash( block ), blockData );
                    return blockData;
                },
                Util.cancelOK
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
        var blockdata = this.getBlockStash( block );
        if( ! blockdata )
            return { node: blockNode };

        dom.empty( blockNode );

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
                  height: canvasHeight + "px",
                  position: 'absolute',
                  left: 0,
                  top: 0
              },
              innerHTML: 'Your web browser cannot display this type of track.',
              className: 'canvas-track'
            }, blockNode
        );

        //Calculate the score for each pixel in the block
        this._draw( blockdata.scale,    basespan.l,
                    basespan.r,     block,
                    c,              features,
                    featureRects,   dataScale,
                    blockdata.pixelScores,  blockdata.maskingSpans ); // note: spans may be undefined.

        blockdata.canvas = c;
        return { node: blockNode, canvas: c };
    },

    projectionChange: function( changeInfo ) {
        if( !( changeInfo && changeInfo.animating ) )
            return this.updateGraphs();
        return undefined;
    },

    fillBlock: function( block, blockNode, changeInfo ) {
        var thisB = this;
        var i = this.inherited(arguments);
        // if( changeInfo && changeInfo.animating ) {
        //     var stash = this.get('widget').blockStash;
        //     return i.then( function() {
        //                        return thisB.renderBlock( block, blockNode );
        //                    });
        // }
        return i;
    },

    workerFillBlock: function( block, blockNode, changeInfo ) {
        // just fills the block with data
        return this._getBlockData( block, blockNode, changeInfo );
    },

    updateGraphs: function( changeInfo ) {
        var thisB = this;
        //console.log( 'update graphs' );

        // wait for any in-flight block fills before updating
        var blockFills = [];
        if( this.get('widget') ) {
            var stash = this.get('widget').blockStash;
            for( var blockID in stash ) {
                if( stash[blockID].fillInProgress && ! stash[blockID].fillInProgress.isFulfilled() )
                    blockFills.push( stash[blockID].fillInProgress );
            }
            //console.log( blockFills.length+' block fills in flight' );
        }

        return all( blockFills )
            .then( function() {
                       return thisB._getScaling()
                           .then( function( scaling ) {
                               thisB.scaling = scaling;

                               // render all of the blocks that need it
                               var s = thisB.getBlockStash();
                               for( var blockid in s ) {
                                   var blockData = s[blockid];
                                   thisB.renderBlock( blockData.block, blockData.node );
                               }

                               thisB.heightUpdate( thisB._canvasHeight() );
                           }, Util.cancelOK );
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
        var widget = this.get('widget');
        var domNode = widget.domNode;

        if( ! this._mouseoverEvent )
            this._mouseoverEvent = widget.own(
                on( domNode, 'mousemove', function( evt ) {
                        evt = domEvent.fix( evt );
                        thisB.getBlockStashForRange( evt.clientX, evt.clientX )
                            .then( function( stashEntries ) {
                                       if( ! stashEntries.length )
                                           return;
                                       var bp = stashEntries[0].block.getProjectionBlock().projectPoint( evt.clientX );
                                       thisB.mouseover( bp, stashEntries[0], evt );
                                   });
                    }))[0];

        if( ! this._mouseoutEvent )
            this._mouseoutEvent = widget.own(
                on( domNode, mouse.leave, function( evt) {
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
                    }, domNode ),
                pole: dom.create(
                    'div', {
                        className: 'wigglePositionIndicator',
                        style: {
                            position: 'fixed',
                            display: 'none',
                            zIndex: 15
                        }
                    }, domNode )
            };
    },

    mouseover: function( bpX, blockdata, evt ) {
        if( bpX && blockdata && evt && blockdata.canvas && blockdata.pixelScores ) {
            var pixelValues = blockdata.pixelScores;
            var canvas = blockdata.canvas;
            var cPos = domGeom.position( canvas );
            var x = evt.pageX;
            var cx = Math.round( evt.pageX - cPos.x );

            if( this._showPixelValue( this.scoreDisplay.flag, pixelValues[ cx ] ) ) {
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
            scoreDisplay.innerText = parseFloat( score.toPrecision(6) );
            return true;
        }
        else if( score && score['score'] && typeof score['score'] == 'number' ) {
            // "score" may be an object.
            scoreDisplay.innerText = parseFloat( score['score'].toPrecision(6) );
            return true;
        }
        else {
            return false;
        }
    }

});
});
