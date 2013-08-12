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
    }
});

return declare( [BlockBasedTrack,FeatureDetailMixin,ExportMixin,FeatureContextMenuMixin], {

    constructor: function( args ) {
        this.glyphsLoaded = {};
        this.glyphsBeingLoaded = {};
        this.regionStats = {};
        this.showLabels = this.getConf('showLabels');

        this._setupEventHandlers();
    },

    _configSchemaDefinition: function() {
        var def = this.inherited( arguments );
        def.slots.push.apply( def.slots, [
                { name: 'maxFeatureScreenDensity', defaultValue: 400, type: 'integer' },
                { name: 'maxLabelScreenDensity', defaultValue: 1/30, type: 'integer' },
                { name: 'maxDescriptionScreenDensity', defaultValue: 1/120, type: 'integer' },
                { name: 'minHistScreenDensity', defaultValue: 400, type: 'integer' },

                { name: 'featureScale', type: 'float' },
                { name: 'labelScale', type: 'float' },
                { name: 'descriptionScale', type: 'float' },


                { name: 'layoutPitchY', type: 'integer', defaultValue: 4 },

                // default glyph class to use
                { name: 'glyph', defaultValue: lang.hitch( this, 'guessGlyphType' ), type: 'string|function' },

                // maximum number of pixels on each side of a
                // feature's bounding coordinates that a glyph is
                // allowed to use
                { name: 'maxFeatureGlyphExpansion', defaultValue: 500, type: 'integer' },

                // maximum height of the track, in pixels
                { name: 'maxHeight', defaultValue: 600, type: 'integer' },

                { name: 'showLabels', defaultValue: true, type: 'boolean' },

                { name: 'displayMode', defaultValue: 'normal', type: 'string' },

                { name: 'events', type: 'object', defaultValue: {
                      contextmenu: function( feature, fRect, block, track, evt ) {
                          evt = domEvent.fix( evt );
                          if( fRect && fRect.contextMenu )
                              fRect.contextMenu._openMyself({ target: block.featureCanvas, coords: { x: evt.pageX, y: evt.pageY }} );
                          domEvent.stop( evt );
                      }
                  }
                },

                { name: 'menuTemplate', type: 'multi-object', defaultValue: [
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
                }
            ]);

        return def;
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
                        displayMode: this.getConf('displayMode'),
                        showFeatures: scale >= ( this.getConf('featureScale')
                                                 || (stats.featureDensity||0) / this.getConf('maxFeatureScreenDensity') ),
                        showLabels: this.showLabels && this.getConf('displayMode') == "normal"
                            && scale >= ( this.getConf('labelScale')
                                          || (stats.featureDensity||0) / this.getConf('maxLabelScreenDensity') ),
                        showDescriptions: this.showLabels && this.getConf('displayMode') == "normal"
                            && scale >= ( this.getConf('descriptionScale')
                                          || (stats.featureDensity||0) * this.getConf('maxDescriptionScreenDensity') )
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

        this.store.getRegionStats(
            lang.mixin( { ref: this.refSeq.name, start: this.refSeq.start, end: this.refSeq.end }, this.getConf('query') ),
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
            var pitchY = this.getConf('layoutPitchY');
            this.layout = new Layout({ pitchX: 4/scale, pitchY: pitchY, maxHeight: this.getConf('maxHeight'), displayMode: this.getConf('displayMode') });
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
        var bpExpansion = Math.round( this.getConf('maxFeatureGlyphExpansion') / scale );

        var query = lang.mixin(
            { ref: this.refSeq.name,
              start: Math.max( 0, leftBase - bpExpansion ),
              end: rightBase + bpExpansion
            },
            this.getConf('query')
        );

        this.store.getFeatures( query,
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

        if( this.getConf('displayMode') != 'collapsed' ) {
            // make features get highlighted on mouse move
            block.own( on( block.featureCanvas, 'mousemove', function( evt ) {
                               evt = domEvent.fix( evt );
                               var bpX = ( evt.offsetX === undefined ? evt.layerX : evt.offsetX ) / block.scale + block.startBase;
                               var feature = thisB.layout.getByCoord( bpX, ( evt.offsetY === undefined ? evt.layerY : evt.offsetY ) );
                               thisB.mouseoverFeature( feature );
                           }));
            block.own( on( block.featureCanvas, 'mouseout', function( evt ) {
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
                 block.own(
                     on( block.featureCanvas, event, function( evt ) {
                             evt = domEvent.fix( evt );
                             var bpX = ( evt.offsetX === undefined ? evt.layerX : evt.offsetX ) / block.scale + block.startBase;
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
                checked: thisB.getConf('displayMode') == displayMode,
                onClick: function() {
                    thisB.setConf( 'displayMode', displayMode );
                    thisB._clearLayout();
                    thisB.hideAll();
                    thisB.genomeView.showVisibleBlocks(true);
                    thisB.makeTrackMenu();
                }
            };
        });

        var updateMenuItems = dojo.hitch(this, function() {
            for(var index in this.displayModeMenuItems) {
                this.displayModeMenuItems[index].checked = (this.getConf('displayMode') == this.displayModeMenuItems[index].label);
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
                  checked: !!( 'showLabels' in this ? this.showLabels : this.getConf('showLabels') ),
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

    destroy: function() {
        this.destroyed = true;
        delete this.layout;
        delete this.glyphsLoaded;
        this.inherited( arguments );
    }
});
});