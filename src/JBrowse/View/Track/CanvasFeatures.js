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
            'JBrowse/Model/SimpleFeature'
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
            SimpleFeature
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

        this._setupEventHandlers();
    },

    configSchema: {
        slots: [
                { name: 'maxFeatureScreenDensity', defaultValue: 400, type: 'float',
                  description: "Maximum feature density (features per horizontal pixel)"
                               + " at which to show features.  When density grows higher"
                               + " than this (e.g. when zoomed further out), features will not be shown."
                },
                { name: 'maxLabelScreenDensity', defaultValue: 1/30, type: 'float' },
                { name: 'maxDescriptionScreenDensity', defaultValue: 1/120, type: 'float' },
                { name: 'minHistScreenDensity', defaultValue: 400, type: 'float' },

                { name: 'featureScale', type: 'float' },
                { name: 'labelScale', type: 'float' },
                { name: 'descriptionScale', type: 'float' },

                { name: 'layoutPitchY', type: 'integer' },

                // default glyph class to use
                { name: 'glyph', defaultValue: function( feature, path, glyph, track ) { return track.guessGlyphType(feature); }, type: 'string' },

                { name: 'glyphConfig', type: 'object', defaultValue: {}, shortDesc: 'object holding base configurations for each glyph class' },

                // maximum number of pixels on each side of a
                // feature's bounding coordinates that a glyph is
                // allowed to use
                { name: 'maxFeatureGlyphExpansion', defaultValue: 500, type: 'integer' },

                // maximum height of the track, in pixels
                { name: 'maxHeight', defaultValue: 600, type: 'integer' },

                { name: 'showLabels', defaultValue: true, type: 'boolean' },
                { name: 'showTooltips', defaultValue: true, type: 'boolean' },

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
                        content: function( feature, fRect, block, track ) {
                            return track.defaultFeatureDetail();
                        }
                      },
                      { label: function() {
                            return 'Highlight this '
                                +( this.feature && this.feature.get('type') ? this.feature.get('type')
                                   : 'feature'
                                 );
                        },
                        action: function() {
                            this.track.browser.setHighlightAndRedraw( this.feature );
                        },
                        iconClass: 'dijitIconFilter'
                      }
                  ]
                }
            ]
    },

    setViewInfo: function( genomeView, heightUpdate, numBlocks, trackDiv, widthPct, widthPx, scale ) {
        this.inherited( arguments );
        this.staticCanvas = domConstruct.create('canvas', { style: { height: "100%", cursor: "default", position: "absolute", zIndex: 15 }}, trackDiv);
        this.staticCanvas.height = this.staticCanvas.offsetHeight;

        this._makeLabelTooltip( );
    },

    guessGlyphType: function(feature) {
        return 'JBrowse/View/FeatureGlyph/'+( {'gene': 'Gene', 'mRNA': 'ProcessedTranscript' }[feature.get('type')] || 'Box' );
    },

    fillBlock: function( args ) {
        var thisB = this;
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

        this.store.getRegionStats(
            this.makeStoreQuery( { ref: this.refSeq.get('name'), start: this.refSeq.get('start'), end: this.refSeq.get('end') } )
        ).then(
            function( stats ) {
                // calculate some additional view parameters that
                // might depend on the feature stats and add them to
                // the view args we pass down
                var renderHints = lang.mixin(
                    {
                        stats: stats,
                        displayMode: thisB.getConf('displayMode'),
                        showFeatures: scale >= ( thisB.getConf('featureScale')
                                                 || (stats.featureDensity||0) / thisB.getConf('maxFeatureScreenDensity') ),
                        showLabels: thisB.getConf('showLabels') && thisB.getConf('displayMode') == "normal"
                            && scale >= ( thisB.getConf('labelScale')
                                          || (stats.featureDensity||0) / thisB.getConf('maxLabelScreenDensity') ),
                        showDescriptions: thisB.getConf('showLabels') && thisB.getConf('displayMode') == "normal"
                            && scale >= ( thisB.getConf('descriptionScale')
                                          || (stats.featureDensity||0) * thisB.getConf('maxDescriptionScreenDensity') )
                    },
                    args
                );

                if( renderHints.showFeatures ) {
                    thisB.fillFeatures( lang.mixin( renderHints, args ) );
                }
                else {
                    thisB.fillTooManyFeaturesMessage(
                        blockIndex,
                        block,
                        scale
                    );
                    args.finishCallback();
                }
            },
            function( error ) {
                thisB._handleError( error, args );
                args.finishCallback( error );
            }
        );
    },

    // create the layout if we need to, and if we can
    _getLayout: function( args ) {
        if( ! this.layout || args && this._layoutpitchX != 4/args.scale ) {
            // if no layoutPitchY configured, calculate it from the
            // height and marginBottom (parseInt in case one or both are functions), or default to 3 if the
            // calculation didn't result in anything sensible.

            var pitchY = this.getConf('layoutPitchY') || args.glyphHeight*0.7 || 4;
            this.layout = new Layout(
                {
                    pitchX: 4/args.scale,
                    pitchY: pitchY,
                    maxHeight: this.getConf('maxHeight'),
                    displayMode: this.getConf('displayMode')
                });
            this._layoutpitchX = 4/args.scale;
        }

        return this.layout;
    },

    _clearLayout: function() {
        delete this.layout;
    },

    hideAll: function() {
        this._clearLayout();
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

                         var glyphArgs = { track: thisB, browser: thisB.browser };
                         // use a specific glyphConfig for this class if we have one
                         var glyphConfig = thisB.getConf('glyphConfig',[glyphClassName]);
                         if(( glyphArgs.baseConfig = glyphConfig[glyphClassName] || glyphConfig['default'] )) {
                             // ( do nothing more )
                         }
                         // otherwise just use our track config as the glyph config
                         else {
                             glyphArgs.baseConfig = thisB.exportBaseConfig();
                             glyphArgs.localConfig = thisB.exportLocalConfig();
                         }
                         glyph = thisB.glyphsLoaded[glyphClassName] = new GlyphClass( glyphArgs );

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

        var errorCallback = function( e ) {
            thisB._handleError( e, args );
            finishCallback(e);
        };

        // query for a slightly larger region than the block, so that
        // we can draw any pieces of glyphs that overlap this block,
        // but the feature of which does not actually lie in the block
        // (long labels that extend outside the feature's bounds, for
        // example)
        var bpExpansion = Math.round( this.getConf('maxFeatureGlyphExpansion') / scale );

        var query = this.makeStoreQuery(
            { ref: this.refSeq.get('name'),
              start: Math.max( 0, leftBase - bpExpansion ),
              end: rightBase + bpExpansion
            });

        var layout;
        return this.store
            .getFeatures( query )
            .forEach( function( feature ) {
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
                               if( ! layout )
                                   layout = thisB._getLayout({ scale: scale, glyphHeight: glyph.getFeatureHeight( args, feature ) });

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

                                                 var totalHeight = layout ? layout.getTotalHeight() : 0;
                                                 var c = block.featureCanvas =
                                                     domConstruct.create(
                                                         'canvas',
                                                         { height: totalHeight,
                                                           width:  block.domNode.offsetWidth+1,
                                                           style: {
                                                               cursor: 'default',
                                                               height: totalHeight+'px',
                                                               position: 'absolute'
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
                b.featureCanvas.style.width = '';
            } catch(e) {};
        });

        this.clear();
        this.inherited( arguments );
    },

    renderClickMap: function( args, fRects ) {
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
                               if( ! thisB.layout )
                                   return;

                               evt = domEvent.fix( evt );
                               var bpX = ( evt.offsetX === undefined ? evt.layerX : evt.offsetX ) / block.scale + block.startBase;
                               var feature = thisB.layout.getByCoord( bpX, ( evt.offsetY === undefined ? evt.layerY : evt.offsetY ) );
                               thisB.mouseoverFeature( feature );
                           }));
            block.own( on( block.featureCanvas, 'mouseout', function( evt ) {
                               thisB.mouseoverFeature( undefined );
                           }));
        }

        this._attachMouseOverEvents( );

        // connect up the event handlers
        this._connectEventHandlers( block );

        this.updateStaticElements( { x: this.genomeView.getX() } );
    },

    _attachMouseOverEvents: function( ) {
        var thisB = this;

        if( this.getConf('displayMode') == 'collapsed' ) {
            if( this._mouseoverEvent ) {
                this._mouseoverEvent.remove();
                delete this._mouseoverEvent;
            }

            if( this._mouseoutEvent ) {
                this._mouseoutEvent.remove();
                delete this._mouseoutEvent;
            }
        } else {
            if( !this._mouseoverEvent ) {
                this._mouseoverEvent = this.own( on( this.staticCanvas, 'mousemove', function( evt ) {
                    if( ! thisB.layout )
                        return;

                    evt = domEvent.fix( evt );
                    var bpX = thisB.genomeView.absXtoBp( evt.clientX );
                    var feature = thisB.layout.getByCoord( bpX, ( evt.offsetY === undefined ? evt.layerY : evt.offsetY ) );
                    thisB.mouseoverFeature( feature, evt );
                }))[0];
            }

            if( !this._mouseoutEvent ) {
                this._mouseoutEvent = this.own( on( this.staticCanvas, 'mouseout', function( evt) {
                    thisB.mouseoverFeature( undefined );
                }))[0];
            }
        }
    },

    _makeLabelTooltip: function( ) {

        if( ! this.getConf('showTooltips') || this.labelTooltip )
            return;

        var labelTooltip = this.labelTooltip = domConstruct.create(
            'div', {
                className: 'featureTooltip',
                style: {
                    position: 'fixed',
                    display: 'none',
                    zIndex: 19
                }
            }, document.body );
        domConstruct.create(
            'span', {
                className: 'tooltipLabel',
                style: {
                    display: 'block'
                }
            }, labelTooltip);
        domConstruct.create(
            'span', {
                className: 'tooltipDescription',
                style: {
                    display: 'block'
                }
            }, labelTooltip);
    },

    _connectEventHandlers: function( block ) {
        for( var event in this.eventHandlers ) {
            var handler = this.eventHandlers[event];
            (function( event, handler ) {
                 var thisB = this;
                 block.own(
                     on( this.staticCanvas, event, function( evt ) {
                             evt = domEvent.fix( evt );
                             var bpX = thisB.genomeView.absXtoBp( evt.clientX );
                             if( block.containsBp( bpX ) && thisB.layout ) {
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
    mouseoverFeature: function( feature, evt ) {

        if( this.lastMouseover == feature )
            return;

        if( evt )
            var bpX = this.genomeView.absXtoBp( evt.clientX );

        if( this.labelTooltip)
            this.labelTooltip.style.display = 'none';

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

            if( block.tooltipTimeout )
                window.clearTimeout( block.tooltipTimeout );

            if( feature ) {
                var fRect = block.fRectIndex.getByID( feature.id() );
                if( ! fRect )
                    return;

                if( block.containsBp( bpX ) ) {
                    var renderTooltip = lang.hitch( this, function() {
                        if( !this.labelTooltip )
                            return;
                        var label = fRect.label || fRect.glyph.makeFeatureLabel( feature );
                        var description = fRect.description || fRect.glyph.makeFeatureDescriptionLabel( feature );

                        if( ( !label && !description ) )
                            return;

                        if( !this.ignoreTooltipTimeout ) {
                            this.labelTooltip.style.left = evt.clientX + "px";
                            this.labelTooltip.style.top = (evt.clientY + 15) + "px";
                        }
                        this.ignoreTooltipTimeout = true;
                        this.labelTooltip.style.display = 'block';
                        if( label ) {
                            var labelSpan = this.labelTooltip.childNodes[0];
                            labelSpan.style.font = label.font;
                            labelSpan.style.color = label.fill;
                            labelSpan.innerHTML = label.text;
                        }
                        if( description ) {
                            var descriptionSpan = this.labelTooltip.childNodes[1];
                            descriptionSpan.style.font = description.font;
                            descriptionSpan.style.color = description.fill;
                            descriptionSpan.innerHTML = description.text;
                        }
                    });
                    if( this.ignoreTooltipTimeout )
                        renderTooltip();
                    else
                        block.tooltipTimeout = window.setTimeout( renderTooltip, 600);
                }

                fRect.glyph.mouseoverFeature( context, fRect );
                this._refreshContextMenu( fRect );
            } else {
                block.tooltipTimeout = window.setTimeout( lang.hitch(this, function() { this.ignoreTooltipTimeout = false; }), 200);
            }
        }, this );

        this.lastMouseover = feature;
    },

    cleanupBlock: function(block) {
        this.inherited( arguments );

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
        this.displayModeMenuItems = displayModeList.map(function( modename ) {
            return {
                label: modename,
                type: 'dijit/CheckedMenuItem',
                title: "Render this track in " + modename + " mode",
                checked: thisB.getConf('displayMode') == modename,
                onClick: function() {
                    thisB.setConf( 'displayMode', modename );
                    thisB._clearLayout();
                    thisB.hideAll();
                    thisB.genomeView.showVisibleBlocks(true);
                    thisB.makeTrackMenu();
                }
            };
        });

        var updateMenuItems = lang.hitch(this, function() {
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
                  checked: this.getConf('showLabels'),
                  onClick: function(event) {
                      thisB.setConf( 'showLabels', this.checked );
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

        if( coords.hasOwnProperty("x") ) {
            var context = this.staticCanvas.getContext('2d');

            this.staticCanvas.width = this.genomeView.elem.clientWidth;
            this.staticCanvas.style.left = coords.x + "px";
            context.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

            var minVisible = this.genomeView.minVisible();
            var maxVisible = this.genomeView.maxVisible();
            var viewArgs = {
                minVisible: minVisible,
                maxVisible: maxVisible,
                bpToPx: lang.hitch(this.genomeView, "bpToPx"),
                lWidth: this.label.offsetWidth
            };

            array.forEach( this.blocks, function(block) {
                if( !block || !block.fRectIndex )
                    return;

                var idx = block.fRectIndex.byID;
                for( var id in idx ) {
                     var fRect = idx[id];
                     fRect.glyph.updateStaticElements( context, fRect, viewArgs );
                }
            }, this );
        }
    },

    heightUpdate: function( height, blockIndex ) {
        this.inherited( arguments );
        if( this.staticCanvas )
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