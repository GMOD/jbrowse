/**
 * Feature track that draws features using HTML5 canvas elements.
 */

define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/dom-construct',
            'dojo/dom-geometry',
            'dojo/Deferred',
            'dojo/on',
            'JBrowse/View/GranularRectLayout',
            'JBrowse/View/Track/BlockBased',
            'JBrowse/Errors',
            'JBrowse/View/Track/FeatureDetailMixin'
        ],
        function(
            declare,
            array,
            domConstruct,
            domGeom,
            Deferred,
            on,
            Layout,
            BlockBasedTrack,
            Errors,
            FeatureDetailMixin
        ) {

/**
 *  inner class that indexes feature layout rectangles (fRects) (which
 *  include features) by unique ID.
 *
 *  We have one of these indexes in each block.
 */
var FRectIndex = declare( null,  {
    constructor: function( args ) {
        var height = args.h;
        var width  = args.w;

        this.dims = { h: height, w: width };

        this.byID = {};
    },

    getByID: function( id ) {
        return this.byID[id];
    },

    addAll: function( fRects ) {
        var byID = this.byID;
        var cW = this.dims.w;
        var cH = this.dims.h;
        array.forEach( fRects, function( fRect ) {
            if( ! fRect )
                return;

            // by ID
            byID[ fRect.f.id() ] = fRect;
        }, this );
    }
});

return declare( [BlockBasedTrack,FeatureDetailMixin], {

    constructor: function( args ) {
        this._setupEventHandlers();
        this.glyphsLoaded = {};
        this.glyphsBeingLoaded = {};
        this.regionStats = {};
        this.showLabels = this.config.style.showLabels;
    },

    browserHasCanvas: function( blockIndex, block ) {
        try {
            document.createElement('canvas').getContext('2d').fillStyle = 'red';
            return true;
        } catch( e ) {
            return false;
        }
    },

    _defaultConfig: function() {
        return {
            maxFeatureScreenDensity: 400,

            // default glyph class to use
            glyph: 'JBrowse/View/FeatureGlyph/Box',

            // maximum number of pixels on each side of a
            // feature's bounding coordinates that a glyph is
            // allowed to use
            maxFeatureGlyphExpansion: 500,

            // maximum height of the track, in pixels
            maxHeight: 1000,

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

        var fill = dojo.hitch( this, function( stats ) {

                // calculate some additional view parameters that
                // might depend on the feature stats and add them to
                // the view args we pass down
                var renderHints = dojo.mixin(
                    {
                        stats: stats,
                        showFeatures: scale >= ( this.config.style.featureScale
                                                 || stats.featureDensity / this.config.maxFeatureScreenDensity ),
                        showLabels: this.showLabels
                            && scale >= ( this.config.style.labelScale
                                          || stats.featureDensity * this.config.style._defaultLabelScale ),
                        showDescriptions: this.showLabels
                            && scale >= ( this.config.style.descriptionScale
                                          || stats.featureDensity * this.config.style._defaultDescriptionScale)
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
            });

        this.store.getGlobalStats(
            fill,
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
            this.layout = new Layout({ pitchX: 4/scale, pitchY: pitchY, maxHeight: this.getConf('maxHeight') });
        }

        return this.layout;
    },

    /**
     * Returns a promise for the appropriate glyph for the given
     * feature and args.
     */
    getGlyph: function( viewArgs, feature, callback ) {
        var glyphClassName = this.getConfForFeature( 'glyph', feature );
        var glyph, interestedParties;
        if(( glyph = this.glyphsLoaded[glyphClassName] )) {
            callback( glyph );
        }
        else if(( interestedParties = this.glyphsBeingLoaded[glyphClassName] )) {
            interestedParties.push( callback );
        }
        else {
            var thisB = this;
            this.glyphsBeingLoaded[glyphClassName] = [callback];
            require( [glyphClassName], function( GlyphClass ) {

                glyph = thisB.glyphsLoaded[glyphClassName] =
                    new GlyphClass({ track: thisB, config: thisB.config, browser: thisB.browser });

                array.forEach( thisB.glyphsBeingLoaded[glyphClassName], function( cb ) {
                    cb( glyph );
                });

                delete thisB.glyphsBeingLoaded[glyphClassName];

            });
        }
    },

    fillFeatures: function( args ) {
        var thisB = this;

        var blockIndex = args.blockIndex;
        var block = args.block;
        var blockWidthPx = block.domNode.offsetWidth;
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

        var layout = this._getLayout( scale );

        // query for a slightly larger region than the block, so that
        // we can draw any pieces of glyphs that overlap this block,
        // but the feature of which does not actually lie in the block
        // (long labels that extend outside the feature's bounds, for
        // example)
        var bpExpansion = Math.round( this.config.maxFeatureGlyphExpansion / scale );

        var region = { ref: this.refSeq.name,
                       start: Math.max( 0, leftBase - bpExpansion ),
                       end: rightBase + bpExpansion
                     };
        this.store.getFeatures( region,

                                function( feature ) {
                                    if( timedOut )
                                        throw new Errors.TrackBlockTimeout({
                                            track: thisB,
                                            blockIndex: blockIndex,
                                            block: block
                                        });

                                    fRects.push( null ); // put a placeholder in the fRects array
                                    featuresInProgress++;
                                    var rectNumber = fRects.length-1;

                                    // get the appropriate glyph object to render this feature
                                    thisB.getGlyph(
                                        args,
                                        feature,
                                        function( glyph ) {
                                            // have the glyph attempt
                                            // to add a rendering of
                                            // this feature to the
                                            // layout
                                            var fRect = glyph.layoutFeature(
                                                args,
                                                layout,
                                                feature
                                            );
                                            if( fRect === null ) {
                                                // could not lay out, would exceed our configured maxHeight
                                                // mark the block as exceeding the max height
                                                block.maxHeightExceeded = true;
                                            }
                                            else {
                                                // laid out successfully
                                                fRect.glyph = glyph;
                                                if( !( fRect.l >= blockWidthPx || fRect.l+fRect.w < 0 ) )
                                                    fRects[rectNumber] = fRect;
                                            }

                                            // this might happen after all the features have been sent from the store
                                            if( ! --featuresInProgress && allFeaturesRead ) {
                                                featuresLaidOut.resolve();
                                            }
                                        },
                                        errorCallback
                                    );
                                },

                                // callback when all features sent
                                function ( callbackArgs ) {
                                    allFeaturesRead = true;
                                    if( ! featuresInProgress && ! featuresLaidOut.isFulfilled() ) {
                                        featuresLaidOut.resolve();
                                    }

                                    featuresLaidOut.then( function() {

                                        var totalHeight = layout.getTotalHeight();
                                        var c = block.featureCanvas =
                                            domConstruct.create(
                                                'canvas',
                                                { height: totalHeight,
                                                  width:  block.domNode.offsetWidth+1,
                                                  style: {
                                                      cursor: 'default',
                                                      height: totalHeight+'px'
                                                  },
                                                  innerHTML: 'Your web browser cannot display this type of track.',
                                                  className: 'canvas-track'
                                                },
                                                block.domNode
                                            );

                                        if( block.maxHeightExceeded )
                                            thisB.markBlockHeightOverflow( block );

                                        thisB.heightUpdate( totalHeight,
                                                            blockIndex );


                                        thisB.renderFeatures( args, fRects );

                                        thisB.renderClickMap( args, fRects );

                                        if ( callbackArgs && callbackArgs.spans ) {
                                            block.maskingSpans = callbackArgs.spans;
                                            thisB.maskBySpans( args, c, fRects, callbackArgs.spans );
                                        }

                                        finishCallback();
                                    });
                                },
                                errorCallback
                              );
    },

    /* If it's a boolean track, mask accordingly */
    maskBySpans: function( args, canvas, fRects, spans ) {
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var scale = args.scale;
        var leftBase = args.leftBase;

        for ( var index in spans ) {
            if (spans.hasOwnProperty(index)) {
                var w = Math.ceil(( spans[index].end   - spans[index].start ) * scale );
                var l = Math.round(( spans[index].start - leftBase ) * scale );
                context.clearRect( l, 0, w+1, canvasHeight );
            }
        }
        context.globalAlpha = this.config.style.masked_transparancy || 0.2;
        this.config.style.masked_transparancy = context.globalAlpha;
        this.renderFeatures( args, canvas, fRects );
        context.globalAlpha = 1;
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

        this.clear();
        this.inherited( arguments );
    },

    renderClickMap: function( args, fRects ) {
        var thisB = this;
        var block = args.block;

        // make an index of the fRects by ID, and by coordinate, and
        // store it in the block
        var index = new FRectIndex({ h: block.featureCanvas.height, w: block.featureCanvas.width });
        block.fRectIndex = index;
        index.addAll( fRects );

        if( ! block.featureCanvas || ! block.featureCanvas.getContext('2d') ) {
            console.warn( "No 2d context available from canvas" );
            return;
        }

        // make features get highlighted on mouse move
        block.own(
            on( block.featureCanvas, 'mousemove', function( evt ) {
                domGeom.normalizeEvent( evt );
                var bpX = evt.layerX / block.scale + block.startBase;
                var feature = thisB.layout.getByCoord( bpX, evt.layerY );
                thisB.mouseoverFeature( feature );
            }),
            on( block.featureCanvas, 'mouseout', function( evt ) {
                    thisB.mouseoverFeature( undefined );
            })
        );

        // connect up the event handlers
        for( var event in this.eventHandlers ) {
            var handler = this.eventHandlers[event];
            block.own(
                on( block.featureCanvas, event, function( evt ) {
                    domGeom.normalizeEvent( evt );
                    var bpX = evt.layerX / block.scale + block.startBase;
                    var feature = thisB.layout.getByCoord( bpX, evt.layerY );
                    if( feature ) {
                        handler.call({
                            track: thisB,
                            feature: feature,
                            callbackArgs: [ thisB, feature ]
                        });
                    }
                })
            );
        }
    },

    getRenderingContext: function( viewArgs ) {
        if( ! viewArgs.block || ! viewArgs.block.featureCanvas )
            return null;
        try {
            var ctx = viewArgs.block.featureCanvas.getContext('2d');
            // ctx.translate( viewArgs.block.offsetLeft - this.featureCanvas.offsetLeft, 0 );
            // console.log( viewArgs.blockIndex, 'block offset', viewArgs.block.offsetLeft - this.featureCanvas.offsetLeft );
            return ctx;
        } catch(e) {
            console.error(e, e.stack);
            return null;
        }
    },

    // draw the features on the canvas
    renderFeatures: function( args, fRects ) {
        var context = this.getRenderingContext( args );
        if( context ) {
            var thisB = this;
            array.forEach( fRects, function( fRect ) {
                if( fRect )
                    thisB.renderFeature( context, args.block, fRect );
            });
        }
    },

    // given viewargs and a feature object, highlight that feature in
    // all blocks.  if feature is undefined or null, unhighlight any currently
    // highlighted feature
    mouseoverFeature: function( feature ) {

        if( this.lastMouseover == feature )
            return;

        array.forEach( this.blocks, function( block, i ) {
            if( ! block )
                return;
            var context = this.getRenderingContext({ block: block, leftBase: block.startBase, scale: block.scale });
            if( ! context )
                return;

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

    cleanupBlock: function(block) {
        // garbage collect the layout
        if ( block && this.layout )
            this.layout.discardRange( block.startBase, block.endBase );
    },

// Current version of renderFeature doesn't support masking.
    // draw each feature
// <<<<<<< HEAD
//     renderFeature: function( context, viewArgs, fRect ) {
//         var thisB = this;
//         var drawFeature = function( context, viewArgs, fRect ) {
//             // background
//             var color = thisB.getStyle( fRect.f, 'color' );
//             if( color ) {
//                 context.fillStyle = color;
//                 context.fillRect( fRect.l, fRect.t, fRect.w, fRect.h );
//             }

//             // foreground border
//             var border_color;
//             if( fRect.h > 3 ) {
//                 border_color = thisB.getStyle( fRect.f, 'border_color' );
//                 if( border_color ) {
//                     context.lineWidth = 1;
//                     context.strokeStyle = border_color;

//                     // need to stroke a smaller rectangle to remain within
//                     // the bounds of the feature's overall height and
//                     // width, because of the way stroking is done in
//                     // canvas.  thus the +0.5 and -1 business.
//                     context.strokeRect( fRect.l+0.5, fRect.t+0.5, fRect.w-1, fRect.h-1 );
//                 }
//             }
//             else if( fRect.h > 1 ) {
//                 border_color = thisB.getStyle( fRect.f, 'border_color' );
//                 if( border_color ) {
//                     context.fillStyle = border_color;
//                     context.fillRect( fRect.l, fRect.t+fRect.h-1, fRect.w, 1 );
//                 }
//             }
//         };
//         drawFeature( context, viewArgs, fRect );

//         // boolean masking section
//         if ( viewArgs.block.maskingSpans ) {
//             var spans = viewArgs.block.maskingSpans;
//             var scale = viewArgs.scale;
//             var leftBase = viewArgs.block.startBase;

//             for ( var index in spans ) {
//                 if ( spans.hasOwnProperty(index) ) {
//                     if ( !( fRect.toX(spans[index].start) > fRect.l+fRect.w || fRect.toX(spans[index].end) < fRect.l ) ) {
//                         var l = Math.max( fRect.toX(spans[index].start), fRect.l );
//                         var r = Math.min( fRect.toX(spans[index].end), fRect.l+fRect.w );
//                         var w = r - l;
//                         context.clearRect( l, fRect.t, w+1, fRect.h );
//                     }
//                 }
//             }
//             context.globalAlpha = this.config.style.masked_transparancy;
//             drawFeature( context, viewArgs, fRect );
//             context.globalAlpha = 1;
//         }
// =======
    renderFeature: function( context, block, fRect ) {
        fRect.glyph.renderFeature( context, block, fRect );
    },

    destroy: function() {
        delete this.layout;
        delete this.glyphsLoaded;
        this.inherited( arguments );
    }
});
});