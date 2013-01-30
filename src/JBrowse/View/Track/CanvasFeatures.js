/**
 * Feature track that draws features using HTML5 canvas elements.
 */

define( [
            'dojo/_base/declare',
            'dojo/dom-construct',
            'dojo/_base/array',
            'dojo/dom-geometry',
            'dojo/on',
            'JBrowse/View/GranularRectLayout',
            'JBrowse/View/Track/Canvas',
            'JBrowse/Errors',
            'JBrowse/View/Track/FeatureDetailMixin'
        ],
        function( declare, dom, array, domGeom, on, Layout, CanvasTrack, Errors, FeatureDetailMixin ) {

// indexes feature layout rectangles (fRects) (which include features)
// by canvas pixel coordinate, and by unique ID.  one of these indexes
// in each block.
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
    },

    _defaultConfig: function() {
        return {
            maxFeatureScreenDensity: 400,
            style: {
                bgcolor: 'goldenrod',
                mouseovercolor: 'rgba(0,0,0,0.3)',
                fgcolor: null,
                height: 11,
                marginBottom: 1
            }
        };
    },

    getStyle: function( feature, name ) {
        var val = this.config.style[name];
        if( typeof val == 'function' )
            return val.call( this, feature, name, null, null, this );
        else
            return val;
    },

    fillBlock: function( args ) {
        var blockIndex = args.blockIndex;
        var block = args.block;
        var leftBase = args.leftBase;
        var rightBase = args.rightBase;
        var scale = args.scale;

        if( ! this.testCanvasSupport( blockIndex, block ) )
            return;

        var region = { ref: this.refSeq.name, start: leftBase, end: rightBase };

        this.store.getRegionStats(
            region,
            dojo.hitch( this, function( stats ) {

                var density        = stats.featureDensity;
                var featureScale   = this.config.style.featureScale || density / this.config.maxFeatureScreenDensity; // (feat/bp) / ( feat/px ) = px/bp )

                if( scale < featureScale ) {
                    this.fillTooManyFeaturesMessage(
                        blockIndex,
                        block,
                        scale
                    );
                    args.finishCallback();
                }
                else {
                    this.fillFeatures( dojo.mixin( {stats: stats}, args ) );
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
        if( ( ! this.layout || this.layout.pitchX != 4/scale ) && scale  )
            this.layout = new Layout({pitchX: 4/scale, pitchY: this.config.layoutPitchY || (this.config.style.height + this.config.style.marginBottom) });

        return this.layout;
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

        var toX = function(coord) { return (coord-leftBase)*scale; };

        var featCallback = dojo.hitch(this,function( feature ) {
            if( timedOut )
                throw new Errors.TrackBlockTimeout({ track: this, blockIndex: blockIndex, block: block });

            fRects.push( this.layoutFeature( args, feature, toX ) );
        });

        this.store.getFeatures( { ref: this.refSeq.name,
                                  start: leftBase,
                                  end: rightBase
                                },

                                featCallback, // callback for each feature

                                // callback when all features sent
                                function () {
                                    var totalHeight = thisB._getLayout(scale)
                                                           .getTotalHeight();
                                    var c = block.featureCanvas =
                                        dojo.create(
                                            'canvas',
                                            { height: totalHeight,
                                              width:  block.offsetWidth+1,
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
                                },

                                dojo.hitch( thisB, function(e) {
                                    this._handleError(e);
                                    finishCallback(e);
                                })
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

    // calculate the placement of the feature on the canvas for this
    // block.
    layoutFeature: function( viewArgs, feature, toX ) {
        var scale = viewArgs.scale;
        var layoutStart = feature.get('start');
        var layoutEnd   = feature.get('end');

        var fHeight = this.config.style.height;
        var levelHeight = fHeight + this.config.style.marginBottom;

        var uniqueId = feature.id();
        var top = this._getLayout( scale )
                      .addRect( uniqueId,
                                layoutStart,
                                layoutEnd,
                                levelHeight);

        var fRect = {
            l: toX(layoutStart),
            h: fHeight,
            t: top,

            f: feature,
            toX: toX
        };
        fRect.w = toX(layoutEnd) - fRect.l;

        return fRect;
    },

    renderClickMap: function( args, canvas, fRects ) {
        var thisB = this;
        var block = args.block;

        // make an index of the fRects by ID, and by coordinate, and
        // store it in the block
        var index = new FRectIndex({ canvas: canvas });
        block.fRectIndex = index;
        index.addAll( fRects );

        var context = canvas.getContext('2d');
        if( ! context ) {
            console.warn( "No 2d context available from canvas" );
            return;
        }

        // make features get highlighted on mouse move
        on( canvas, 'mousemove', function( evt ) {
                domGeom.normalizeEvent( evt );
                var fRect = index.getByCoord( evt.layerX, evt.layerY );
                thisB.highlightFeature( args, fRect && fRect.f );
        });
        on( canvas, 'mouseout', function( evt ) {
                thisB.highlightFeature( args, undefined );
        });

        // connect up the event handlers
        for( var event in this.eventHandlers ) {
            var handler = this.eventHandlers[event];
            on( canvas, event, function( evt ) {
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
        array.forEach( fRects, dojo.hitch( this, 'renderFeature', context, args ) );
    },

    // given viewargs and a feature object, highlight that feature in
    // all blocks.  if feature is undefined or null, unhighlight any currently
    // highlighted feature
    highlightFeature: function( args, feature ) {

        if( this.lastHighlight == feature )
            return;

        array.forEach( this.blocks, function( block ) {
            var context;
            try      {  context = block.featureCanvas.getContext('2d'); }
            catch(e) {  return;                                         }

            if( this.lastHighlight ) {
                var r = block.fRectIndex.getByID( this.lastHighlight.id() );
                if( r )
                    this.renderFeature( context, args, r );
            }

            if( feature ) {
                var fRect = block.fRectIndex.getByID( feature.id() );
                if( ! fRect )
                    return;

                context.fillStyle = this.getStyle( fRect.f, 'mouseovercolor' );
                context.fillRect( fRect.l, fRect.t, fRect.w, fRect.h );
            }
        }, this );

        this.lastHighlight = feature;
    },

    // draw each feature
    renderFeature: function( context, viewArgs, fRect ) {
        // background
        var bgcolor = this.getStyle( fRect.f, 'bgcolor' );
        if( bgcolor ) {
            context.fillStyle = bgcolor;
            context.fillRect( fRect.l, fRect.t, fRect.w, fRect.h );
        }

        // foreground border
        var fgcolor;
        if( fRect.h > 3 ) {
            fgcolor = this.getStyle( fRect.f, 'fgcolor' );
            if( fgcolor ) {
                context.lineWidth = 1;
                context.strokeStyle = fgcolor;

                // need to stroke a smaller rectangle to remain within
                // the bounds of the feature's overall height and
                // width, because of the way stroking is done in
                // canvas.  thus the +0.5 and -1 business.
                context.strokeRect( fRect.l+0.5, fRect.t+0.5, fRect.w-1, fRect.h-1 );
            }
        }
        else if( fRect.h > 1 ) {
            fgcolor = this.getStyle( fRect.f, 'fgcolor' );
            if( fgcolor ) {
                context.fillStyle = fgcolor;
                context.fillRect( fRect.l, fRect.t+fRect.h-1, fRect.w, 1 );
            }
        }
    }
});
});