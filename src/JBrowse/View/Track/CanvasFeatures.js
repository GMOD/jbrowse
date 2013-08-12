/**
 * Feature track that draws features using HTML5 canvas elements.
 */

define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/_base/event',
            'dojo/mouse',
            'dojo/dom-construct',
            'dojo/Deferred',
            'dojo/on',
            'JBrowse/has',
            'JBrowse/View/GranularRectLayout',
            'JBrowse/View/Track/BlockBased',
            'JBrowse/View/Track/ExportMixin',
            'JBrowse/Errors',
            'JBrowse/View/Track/FeatureDetailMixin',
            'JBrowse/View/Track/_FeatureContextMenusMixin',
            'JBrowse/Model/Location'
        ],
        function(
            declare,
            array,
            lang,
            domEvent,
            mouse,
            domConstruct,
            Deferred,
            on,
            has,
            Layout,
            BlockBasedTrack,
            ExportMixin,
            Errors,
            FeatureDetailMixin,
            FeatureContextMenuMixin,
            Location
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
    },

    getAll: function( ) {
        var fRects = [];
        for( var id in this.byID ) {
            fRects.push( this.byID[id] );
        }
        return fRects;
    }
});

return declare( [BlockBasedTrack,FeatureDetailMixin,ExportMixin,FeatureContextMenuMixin], {

    constructor: function( args ) {
        this.glyphsLoaded = {};
        this.glyphsBeingLoaded = {};
        this.regionStats = {};
        this.showLabels = this.config.style.showLabels;
        this.displayMode = this.config.displayMode;

        this._setupEventHandlers();
    },

    _defaultConfig: function() {
        return {
            maxFeatureScreenDensity: 400,

            // default glyph class to use
            glyph: lang.hitch( this, 'guessGlyphType' ),

            // maximum number of pixels on each side of a
            // feature's bounding coordinates that a glyph is
            // allowed to use
            maxFeatureGlyphExpansion: 500,

            // maximum height of the track, in pixels
            maxHeight: 600,

            style: {
                // not configured by users
                _defaultHistScale: 4,
                _defaultLabelScale: 30,
                _defaultDescriptionScale: 120,

                showLabels: true
            },

            displayMode: 'normal',

            events: {
                contextmenu: function( feature, fRect, block, track, evt ) {
                    evt = domEvent.fix( evt );
                    if( fRect && fRect.contextMenu )
                        fRect.contextMenu._openMyself({ target: block.featureCanvas, coords: { x: evt.pageX, y: evt.pageY }} );
                    domEvent.stop( evt );
                }
            },

            menuTemplate: [
                { label: 'View details',
                  title: '{type} {name}',
                  action: 'contentDialog',
                  iconClass: 'dijitIconTask',
                  content: dojo.hitch( this, 'defaultFeatureDetail' )
                },
                { label: function() {
                      return 'Highlight this '
                          +( this.feature && this.feature.get('type') ? this.feature.get('type')
                                                                      : 'feature'
                           );
                  },
                  action: function() {
                     var loc = new Location({ feature: this.feature, tracks: [this.track] });
                     this.track.browser.setHighlightAndRedraw(loc);
                  },
                  iconClass: 'dijitIconFilter'
                }
            ]
        };
    },

    setViewInfo: function( genomeView, heightUpdate, numBlocks, trackDiv, widthPct, widthPx, scale ) {
        this.inherited( arguments );
        this.staticCanvas = domConstruct.create('canvas', { style: { height: "100%", cursor: "default", position: "absolute", "z-index": 15 }}, trackDiv);
        this.staticCanvas.height = this.staticCanvas.offsetHeight;
    },

    guessGlyphType: function(feature) {
        return 'JBrowse/View/FeatureGlyph/'+( {'gene': 'Gene', 'mRNA': 'ProcessedTranscript' }[feature.get('type')] || 'Box' );
    },

    fillBlock: function( args ) {
        var blockIndex = args.blockIndex;
        var block = args.block;
        var leftBase = args.leftBase;
        var rightBase = args.rightBase;
        var scale = args.scale;

        if( ! has('canvas') ) {
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
                        displayMode: this.displayMode,
                        showFeatures: scale >= ( this.config.style.featureScale
                                                 || (stats.featureDensity||0) / this.config.maxFeatureScreenDensity ),
                        showLabels: this.showLabels && this.displayMode == "normal"
                            && scale >= ( this.config.style.labelScale
                                          || (stats.featureDensity||0) * this.config.style._defaultLabelScale ),
                        showDescriptions: this.showLabels && this.displayMode == "normal"
                            && scale >= ( this.config.style.descriptionScale
                                          || (stats.featureDensity||0) * this.config.style._defaultDescriptionScale)
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
                            this._handleError( e, args );
                            args.finishCallback(e);
                        })
        );
    },

    // create the layout if we need to, and if we can
    _getLayout: function( scale ) {
        if( ! this.layout || this.layout.pitchX != 4/scale ) {
            // if no layoutPitchY configured, calculate it from the
            // height and marginBottom (parseInt in case one or both are functions), or default to 3 if the
            // calculation didn't result in anything sensible.
            var pitchY = this.config.layoutPitchY || 4;
            this.layout = new Layout({ pitchX: 4/scale, pitchY: pitchY, maxHeight: this.getConf('maxHeight'), displayMode: this.displayMode });
        }

        return this.layout;
    },

    _clearLayout: function() {
        delete this.layout;
    },

    hideAll: function() {
        delete this.layout;
        return this.inherited( arguments );
    },

    /**
     * Returns a promise for the appropriate glyph for the given
     * feature and args.
     */
    getGlyph: function( viewArgs, feature, callback, errorCallback ) {
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

        var fRects = [];

        // count of how many features are queued up to be laid out
        var featuresInProgress = 0;
        // promise that resolved when all the features have gotten laid out by their glyphs
        var featuresLaidOut = new Deferred();
        // flag that tells when all features have been read from the
        // store (not necessarily laid out yet)
        var allFeaturesRead = false;

        var errorCallback = dojo.hitch( thisB, function( e ) {
            this._handleError( e, args );
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
                                    if( thisB.destroyed || ! thisB.filterFeature( feature ) )
                                        return;
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
                                function () {
                                    if( thisB.destroyed )
                                        return;

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
                                                      height: totalHeight+'px',
                                                      position: 'relative'
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

        if( this.displayMode != 'collapsed' ) {
            // make features get highlighted on mouse move

            var gv = this.browser.view;

            // These handlers are being added in the wrong place
            this.own( on( this.staticCanvas, 'mousemove', function( evt ) {
                evt = domEvent.fix( evt );
                var bpX = gv.absXtoBp( evt.clientX );
                var feature = thisB.layout.getByCoord( bpX, ( evt.offsetY === undefined ? evt.layerY : evt.offsetY ) );
                thisB.mouseoverFeature( feature );
            }));

            this.own( on( this.staticCanvas, 'mouseout', function( evt) {
                thisB.mouseoverFeature( undefined );
            }));
        }

        // connect up the event handlers
        this._connectEventHandlers( block );
    },

    _connectEventHandlers: function( block ) {
        for( var event in this.eventHandlers ) {
            var handler = this.eventHandlers[event];
            (function( event, handler ) {
                 var thisB = this;
                 var gv = this.browser.view;
                 this.own(
                     on( this.staticCanvas, event, function( evt ) {
                             evt = domEvent.fix( evt );
                             var bpX = gv.absXtoBp( evt.clientX );
                             var feature = thisB.layout.getByCoord( bpX, ( evt.offsetY === undefined ? evt.layerY : evt.offsetY ) );
                             if( feature ) {
                                 var fRect = block.fRectIndex.getByID( feature.id() );
                                 handler.call({
                                                  track: thisB,
                                                  feature: feature,
                                                  fRect: fRect,
                                                  block: block,
                                                  callbackArgs: [ thisB, feature, fRect ]
                                              },
                                              feature,
                                              fRect,
                                              block,
                                              thisB,
                                              evt
                                             );
                             }
                         })
                 );
             }).call( this, event, handler );
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
                    thisB.renderFeature( context, fRect );
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
                    this.renderFeature( context, r );
            }

            if( feature ) {
                var fRect = block.fRectIndex.getByID( feature.id() );
                if( ! fRect )
                    return;

                fRect.glyph.mouseoverFeature( context, fRect );
                this._refreshContextMenu( fRect );
            }
        }, this );

        this.lastMouseover = feature;
    },

    cleanupBlock: function(block) {
        // garbage collect the layout
        if ( block && this.layout )
            this.layout.discardRange( block.startBase, block.endBase );
    },

    // draw each feature
    renderFeature: function( context, fRect ) {
        fRect.glyph.renderFeature( context, fRect );
    },

    _trackMenuOptions: function () {
        var opts = this.inherited(arguments);
        var thisB = this;

        var displayModeList = ["normal", "compact", "collapsed"];
        this.displayModeMenuItems = displayModeList.map(function(displayMode) {
            return {
                label: displayMode,
                type: 'dijit/CheckedMenuItem',
                title: "Render this track in " + displayMode + " mode",
                checked: thisB.displayMode == displayMode,
                onClick: function() {
                    thisB.displayMode = displayMode;
                    thisB._clearLayout();
                    thisB.hideAll();
                    thisB.genomeView.showVisibleBlocks(true);
                    thisB.makeTrackMenu();
                }
            };
        });

        var updateMenuItems = dojo.hitch(this, function() {
            for(var index in this.displayModeMenuItems) {
                this.displayModeMenuItems[index].checked = (this.displayMode == this.displayModeMenuItems[index].label);
            }
        });

        opts.push.apply(
            opts,
            [
                { type: 'dijit/MenuSeparator' },
                {
                    label: "Display mode",
                    iconClass: "dijitIconPackage",
                    title: "Make features take up more or less space",
                    children: this.displayModeMenuItems
                },
                { label: 'Show labels',
                  type: 'dijit/CheckedMenuItem',
                  checked: !!( 'showLabels' in this ? this.showLabels : this.config.style.showLabels ),
                  onClick: function(event) {
                      thisB.showLabels = this.checked;
                      thisB.changed();
                  }
                }
            ]
        );

        return opts;
    },

    _exportFormats: function() {
        return [ {name: 'GFF3', label: 'GFF3', fileExt: 'gff3'}, {name: 'BED', label: 'BED', fileExt: 'bed'}, { name: 'SequinTable', label: 'Sequin Table', fileExt: 'sqn' } ];
    },

    updateStaticElements: function( coords ) {
        this.inherited( arguments );

        var context = this.staticCanvas.getContext('2d');

        var gv = this.browser.view;

        this.staticCanvas.width = gv.elem.clientWidth;
        this.staticCanvas.style.left = gv.getX() + "px";
        context.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

        var minVisible = this.browser.view.minVisible();
        var maxVisible = this.browser.view.maxVisible();
        var viewArgs = {
            minVisible: minVisible,
            maxVisible: maxVisible,
            bpToPx: dojo.hitch(gv, "bpToPx"),
            lWidth: this.label.offsetWidth
        };

        var allFRects = {};

        array.forEach( this.blocks, dojo.hitch( this, function(block) {
            if( !block || !( block.fRectIndex ) )
                return;
            lang.mixin( allFRects, block.fRectIndex.byID );
        }));

        for( var id in allFRects ) {
            if( allFRects.hasOwnProperty( id ) ) {
                var fRect = allFRects[id];
                fRect.glyph.updateStaticElements( context, fRect, viewArgs );
            }
        }
    },

    heightUpdate: function( height, blockIndex ) {
        this.inherited( arguments );
        this.staticCanvas.height = this.staticCanvas.offsetHeight;
    },

    destroy: function() {
        this.destroyed = true;

        domConstruct.destroy( this.staticCanvas );
        delete this.staticCanvas;

        delete this.layout;
        delete this.glyphsLoaded;
        this.inherited( arguments );
    }
});
});