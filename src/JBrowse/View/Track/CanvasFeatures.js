/**
 * Feature track that draws features using HTML5 canvas elements.
 */

define( [
            'dojo/_base/declare',
            'dojo/dom-construct',
            'dojo/_base/array',
            'dojo/dom-geometry',
            'dojo/Deferred',
            'dojo/on',
            'JBrowse/View/GranularRectLayout',
            'JBrowse/View/Track/Canvas',
            'JBrowse/Errors',
            'JBrowse/View/Track/FeatureDetailMixin'
        ],
        function(
            declare,
            dom,
            array,
            domGeom,
            Deferred,
            on,
            Layout,
            CanvasTrack,
            Errors,
            FeatureDetailMixin
        ) {

/**
 *  inner class that indexes feature layout rectangles (fRects) (which
 *  include features) by canvas pixel coordinate, and by unique ID.
 *
 *  We have one of these indexes in each block.
 */
var FRectIndex = declare( null,  {
    constructor: function(args) {
        var canvas = args.canvas;

        this.canvasDims = { h: canvas.height, w: canvas.width };

        this.byCoord = new Array( canvas.width );
        for( var i = 0; i < canvas.width; i++ )
            this.byCoord[i] = new Array( canvas.height );

        this.byID = {};
    },

    getByID: function( id ) {
        return this.byID[id];
    },

    getByCoord: function( x, y ) {
        return (this.byCoord[x]||[])[y];
    },

    _clampCoord: function( val, lBound, uBound ) {
        return Math.round( Math.max( lBound, Math.min( val, uBound ) ) );
    },

    addAll: function( fRects ) {
        var byCoord = this.byCoord;
        var byID = this.byID;
        var cW = this.canvasDims.w;
        var cH = this.canvasDims.h;
        array.forEach( fRects, function( fRect ) {
            // by coord
            for( var i = 0; i < fRect.w; ++i ) {
                for( var j = 0; j < fRect.h; ++j ) {
                    var x = this._clampCoord( fRect.l + i, 0, cW-1 );
                    var y = this._clampCoord( fRect.t + j, 0, cH-1 );
                    byCoord[x][y] = fRect;
                }
            }

            // by ID
            byID[ fRect.f.id() ] = fRect;
        }, this );
    }
});

return declare( [CanvasTrack,FeatureDetailMixin], {

    constructor: function( args ) {
        this._setupEventHandlers();
        this.glyphLoadingPromises = {};
        this.showLabels = this.config.style.showLabels;
    },

    _defaultConfig: function() {
        return {
            maxFeatureScreenDensity: 400,
            glyph: 'JBrowse/View/FeatureGlyph/Rectangle',
            style: {

                // not configured by users
                _defaultHistScale: 4,
                _defaultLabelScale: 30,
                _defaultDescriptionScale: 120,

                showLabels: true
            }
        };
    },

    fillBlock: function( args ) {
        var blockIndex = args.blockIndex;
        var block = args.block;
        var leftBase = args.leftBase;
        var rightBase = args.rightBase;
        var scale = args.scale;

        if( ! this.browserHasCanvas( blockIndex, block ) ) {
            this.fatalError = 'This browser does not support HTML canvas elements.';
            this.fillBlockError( blockIndex, block, this.fatalError );
            return;
        }

        var region = { ref: this.refSeq.name, start: leftBase, end: rightBase };

        this.store.getRegionStats(
            region,
            dojo.hitch( this, function( stats ) {

                // calculate some additional view parameters that
                // might depend on the feature stats and add them to
                // the view args we pass down
                var renderHints = dojo.mixin(
                    {
                        stats: stats,
                        showFeatures:     scale >= (this.config.style.featureScale     || stats.featureDensity / this.config.maxFeatureScreenDensity ),
                        showLabels:       this.showLabels && scale >= ( this.config.style.labelScale || stats.featureDensity * this.config.style._defaultLabelScale ),
                        showDescriptions: this.showLabels && scale >= ( this.config.style.descriptionScale || stats.featureDensity * this.config.style._defaultDescriptionScale)
                    },
                    args
                );

                if( renderHints.showFeatures ) {
                    this.fillFeatures( dojo.mixin( renderHints, args ) );
                }
                else {
                    this.fillTooManyFeaturesMessage(
                        blockIndex,
                        block,
                        scale
                    );
                    args.finishCallback();
                }
            }),
            dojo.hitch( this, function(e) {
                this._handleError(e);
                args.finishCallback(e);
            })
        );
    },

    _getLayout: function( scale ) {
        // create the layout if we need to, and if we can
        if( ! this.layout || this.layout.pitchX != 4/scale ) {
            // if no layoutPitchY configured, calculate it from the
            // height and marginBottom (parseInt in case one or both are functions), or default to 3 if the
            // calculation didn't result in anything sensible.
            var pitchY = this.config.layoutPitchY || 4;
            this.layout = new Layout({ pitchX: 4/scale, pitchY: pitchY });
        }

        return this.layout;
    },

    /**
     * Returns a promise for the appropriate glyph for the given
     * feature and args.
     */
    getGlyph: function( viewArgs, feature ) {
        var glyphClassName = this.getConfForFeature( 'glyph', feature );
        var thisB = this;
        return this.glyphLoadingPromises[glyphClassName] || function() {
            var d = new Deferred();
            require( [glyphClassName], function( GlyphClass ) {
                d.resolve( new GlyphClass({ track: thisB, config: thisB.config, browser: thisB.browser }) );
            });
            return d;
        }();
    },

    fillFeatures: function( args ) {
        var thisB = this;

        var blockIndex = args.blockIndex;
        var block = args.block;
        var scale = args.scale;
        var leftBase = args.leftBase;
        var rightBase = args.rightBase;
        var finishCallback = args.finishCallback;

        var timedOut = false;
        if( this.config.blockDisplayTimeout )
            window.setTimeout( function() { timedOut = true; }, this.config.blockDisplayTimeout );

        var fRects = [];

        // count of how many features are queued up to be laid out
        var featuresInProgress = 0;
        // promise that resolved when all the features have gotten laid out by their glyphs
        var featuresLaidOut = new Deferred();
        // flag that tells when all features have been read from the
        // store (not necessarily laid out yet)
        var allFeaturesRead = false;

        var errorCallback = dojo.hitch( thisB, function(e) {
                                            this._handleError(e);
                                            finishCallback(e);
                                        });
        function toX(coord) {
            return (coord-leftBase)*scale;
        };

        var layout = this._getLayout( scale );

        this.store.getFeatures( { ref: this.refSeq.name,
                                  start: leftBase,
                                  end: rightBase
                                },

                                function( feature ) {
                                    if( timedOut )
                                        throw new Errors.TrackBlockTimeout({
                                            track: thisB,
                                            blockIndex: blockIndex,
                                            block: block
                                        });

                                    fRects.push( false ); // put a placeholder in the fRects array
                                    featuresInProgress++;
                                    var rectNumber = fRects.length-1;
                                    thisB.getGlyph( args, feature )
                                         .then( function( glyph ) {
                                             var fRect = glyph.layoutFeature({
                                                             view: args,
                                                             layout: layout,
                                                             toX: toX,
                                                             feature: feature
                                                         });
                                             fRect.glyph = glyph;
                                             fRect.toX = toX;
                                             fRects[rectNumber] = fRect;

                                             // this might happen after all the features have been sent from the store
                                             if( ! --featuresInProgress && allFeaturesRead ) {
                                                 featuresLaidOut.resolve();
                                             }

                                          },
                                          errorCallback
                                          );
                                },

                                // callback when all features sent
                                function () {
                                    allFeaturesRead = true;
                                    if( ! featuresInProgress && ! featuresLaidOut.isFulfilled() )
                                        featuresLaidOut.resolve();

                                    featuresLaidOut.then( function() {
                                        var totalHeight = thisB._getLayout(scale)
                                                               .getTotalHeight();
                                        var c = block.featureCanvas =
                                            dojo.create(
                                                'canvas',
                                                { height: totalHeight,
                                                  width:  block.offsetWidth*3, // wider so labels can extend to the right
                                                  style: {
                                                      cursor: 'default',
                                                      height: totalHeight+'px'
                                                  },
                                                  innerHTML: 'Your web browser cannot display this type of thisB.',
                                                  className: 'canvas-track'
                                                },
                                                block
                                            );
                                        thisB.renderFeatures( args, c, fRects );

                                        thisB.renderClickMap( args, c, fRects );

                                        thisB.layoutCanvases([c]);
                                        thisB.heightUpdate( totalHeight,
                                                            blockIndex );
                                        finishCallback();
                                    });
                                },
                                errorCallback
                              );
    },

    startZoom: function() {
        this.inherited( arguments );

        array.forEach( this.blocks, function(b) {
            try {
                b.featureCanvas.style.width = '100%';
            } catch(e) {};
        });
    },

    endZoom: function() {

        array.forEach( this.blocks, function(b) {
            try {
                delete b.featureCanvas.style.width;
            } catch(e) {};
        });

        this.inherited( arguments );
    },

    renderClickMap: function( args, canvas, fRects ) {
        var thisB = this;
        var block = args.block;

        // make an index of the fRects by ID, and by coordinate, and
        // store it in the block
        var index = new FRectIndex({ canvas: canvas });
        block.fRectIndex = index;
        index.addAll( fRects );

        if( ! canvas.getContext('2d') ) {
            console.warn( "No 2d context available from canvas" );
            return;
        }

        // make features get highlighted on mouse move
        on( block, 'mousemove', function( evt ) {
                domGeom.normalizeEvent( evt );
                var fRect = index.getByCoord( evt.layerX, evt.layerY );
                thisB.mouseoverFeature( fRect && fRect.f );
        });
        on( block, 'mouseout', function( evt ) {
                thisB.mouseoverFeature( undefined );
        });

        // connect up the event handlers
        for( var event in this.eventHandlers ) {
            var handler = this.eventHandlers[event];
            on( block, event, function( evt ) {
                domGeom.normalizeEvent( evt );
                var fRect = index.getByCoord( evt.layerX, evt.layerY );
                if( fRect ) {
                    handler.call({
                        track: thisB,
                        feature: fRect.f,
                        fRect: fRect,
                        callbackArgs: [ thisB, fRect.f ]
                    });
                }
            });
        }
    },

    // draw the features on the canvas
    renderFeatures: function( args, canvas, fRects ) {
        var context = canvas.getContext('2d');
        array.forEach( fRects, dojo.hitch( this, 'renderFeature', context, args.block ) );
    },

    // given viewargs and a feature object, highlight that feature in
    // all blocks.  if feature is undefined or null, unhighlight any currently
    // highlighted feature
    mouseoverFeature: function( feature ) {

        if( this.lastMouseover == feature )
            return;

        array.forEach( this.blocks, function( block ) {
            var context;
            try      {  context = block.featureCanvas.getContext('2d'); }
            catch(e) {  return;                                         }

            if( this.lastMouseover ) {
                var r = block.fRectIndex.getByID( this.lastMouseover.id() );
                if( r )
                    this.renderFeature( context, block, r );
            }

            if( feature ) {
                var fRect = block.fRectIndex.getByID( feature.id() );
                if( ! fRect )
                    return;

                fRect.glyph.mouseoverFeature( context, block, fRect );
            }
        }, this );

        this.lastMouseover = feature;
    },

    // draw each feature
    renderFeature: function( context, block, fRect ) {
        fRect.glyph.renderFeature( context, block, fRect );
    }
});
});