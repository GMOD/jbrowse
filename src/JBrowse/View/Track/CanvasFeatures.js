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
            'JBrowse/Util',
            'JBrowse/View/GranularRectLayout',
            'JBrowse/View/Track/BlockBased',
            'JBrowse/View/Track/_ExportMixin',
            'JBrowse/Errors',
            'JBrowse/View/Track/_FeatureDetailMixin',
            'JBrowse/View/Track/_FeatureContextMenusMixin',
            'JBrowse/View/Track/_YScaleMixin',
            'JBrowse/Model/Location',
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
            Util,
            Layout,
            BlockBasedTrack,
            ExportMixin,
            Errors,
            FeatureDetailMixin,
            FeatureContextMenuMixin,
            YScaleMixin,
            Location,
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

return declare(
    [ BlockBasedTrack,
      FeatureDetailMixin,
      ExportMixin,
      FeatureContextMenuMixin,
      YScaleMixin
    ], {

    constructor: function( args ) {
        this.glyphsLoaded = {};
        this.glyphsBeingLoaded = {};
        this.regionStats = {};
        this.showLabels = this.config.style.showLabels;
        this.showTooltips = this.config.style.showTooltips;
        this.displayMode = this.config.displayMode;

        this._setupEventHandlers();
    },

    _defaultConfig: function() {
        return Util.deepUpdate(
            lang.clone( this.inherited(arguments) ),
            {
            maxFeatureScreenDensity: 3,

            // default glyph class to use
            glyph: lang.hitch( this, 'guessGlyphType' ),

            // maximum number of pixels on each side of a
            // feature's bounding coordinates that a glyph is
            // allowed to use
            maxFeatureGlyphExpansion: 500,

            // maximum height of the track, in pixels
            maxHeight: 600,

            histograms: {
                description: 'feature density',
                min: 0,
                height: 100,
                color: 'goldenrod',
                clip_marker_color: 'red'
            },

            style: {
                // not configured by users
                _defaultHistScale: 4,
                _defaultLabelScale: 30,
                _defaultDescriptionScale: 120,

                showLabels: true,
                showTooltips: true,
                label: 'name,id',
                description: 'note, description'
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
                {
                    "label" : function() {
                        return 'Zoom to this '+( this.feature.get('type') || 'feature' );
                    },
                    "action" : function(){
                        var ref   = this.track.refSeq;
                        var paddingBp = Math.round( 10 /*pixels*/ / this.viewInfo.scale /* px/bp */ );
                        var start = Math.max( ref.start, this.feature.get('start') - paddingBp );
                        var end   = Math.min( ref.end, this.feature.get('end') + paddingBp );
                        this.track.genomeView.setLocation( ref, start, end );
                    },
                    "iconClass" : "dijitIconConnector"
                },
                {
                  label : function() {
                      return 'Highlight this '+( this.feature.get('type') || 'feature' );
                  },
                  action: function() {
                     var loc = new Location({ feature: this.feature, tracks: [this.track] });
                     this.track.browser.setHighlightAndRedraw(loc);
                  },
                  iconClass: 'dijitIconFilter'
                }
            ]
        });
    },

    setViewInfo: function( genomeView, heightUpdate, numBlocks, trackDiv, widthPct, widthPx, scale ) {
        this.inherited( arguments );
        this.staticCanvas = domConstruct.create('canvas', { style: { height: "100%", cursor: "default", position: "absolute", zIndex: 15 }}, trackDiv);
        this.staticCanvas.height = this.staticCanvas.offsetHeight;

        this._makeLabelTooltip( );
    },

    guessGlyphType: function(feature) {
        return 'JBrowse/View/FeatureGlyph/'+( {'gene': 'Gene', 'mRNA': 'ProcessedTranscript', 'transcript': 'ProcessedTranscript' }[feature.get('type')] || 'Box' );
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

        var fill = lang.hitch( this, function( stats ) {

                // calculate some additional view parameters that
                // might depend on the feature stats and add them to
                // the view args we pass down
                var renderArgs = lang.mixin(
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

                if( renderArgs.showFeatures ) {
                    this.setLabel( this.key );
                    this.removeYScale();
                    this.fillFeatures( renderArgs );
                }
                else if( this.config.histograms.store || this.store.getRegionFeatureDensities ) {
                    this.fillHistograms( renderArgs );
                }
                else {
                    this.setLabel( this.key );
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

    // override the base error handler to try to draw histograms if
    // it's a data overflow error and we know how to draw histograms
    _handleError: function( error, viewArgs ) {

        if( typeof error == 'object'
            && error instanceof Errors.DataOverflow
            && ( this.config.histograms.store || this.store.getRegionFeatureDensities )
          ) {
              this.fillHistograms( viewArgs );
        }
        else
            this.inherited(arguments);
    },

    // create the layout if we need to, and if we can
    _getLayout: function( scale ) {
        if( ! this.layout || this._layoutpitchX != 4/scale ) {
            // if no layoutPitchY configured, calculate it from the
            // height and marginBottom (parseInt in case one or both are functions), or default to 3 if the
            // calculation didn't result in anything sensible.
            var pitchY = this.getConf('layoutPitchY') || 4;
            this.layout = new Layout({ pitchX: 4/scale, pitchY: pitchY, maxHeight: this.getConf('maxHeight'), displayMode: this.displayMode });
            this._layoutpitchX = 4/scale;
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

                         glyph = thisB.glyphsLoaded[glyphClassName] =
                             new GlyphClass({ track: thisB, config: thisB.config, browser: thisB.browser });

                         array.forEach( thisB.glyphsBeingLoaded[glyphClassName], function( cb ) {
                                            cb( glyph );
                                        });

                         delete thisB.glyphsBeingLoaded[glyphClassName];

                     });
        }
    },

    fillHistograms: function( args ) {
        // set the track label if we have a description
        if( this.config.histograms.description ) {
            this.setLabel(
                this.key + ' <span class="feature-density">('
                    + this.config.histograms.description
                    + ')</span>'
            );
        }
        else {
            this.setLabel( this.key );
        }

        var numBins = this.config.histograms.binsPerBlock || 200;
        var blockSizeBp = Math.abs( args.rightBase - args.leftBase );
        var basesPerBin = blockSizeBp / numBins;
        var query = {
            ref:   this.refSeq.name,
            start: args.leftBase,
            end:   args.rightBase,
            basesPerSpan: basesPerBin,
            basesPerBin: basesPerBin
        };

        if( this.store.getRegionFeatureDensities ) {
            this.store.getRegionFeatureDensities(
                query,
                lang.hitch( this, '_drawHistograms', args )
            );
        } else {
            var thisB = this;
            var histData = { features: [], stats: {} };
            var handleError = lang.hitch( this, '_handleError' );
            this.browser.getStore(
                this.config.histograms.store,
                function( histStore ) {
                    histStore.getGlobalStats(
                        function( stats ) {
                            histData.stats.max = stats.scoreMax;
                            histStore.getFeatures(
                                query,
                                function( feature ) {
                                    histData.features.push( feature );
                                },
                                function() {
                                    thisB._drawHistograms( args, histData );
                                    args.finishCallback();
                                },
                                handleError
                            );
                        },
                        handleError
                    );
                });
        }
    },

    _drawHistograms: function( viewArgs, histData ) {

        var maxScore = 'max' in this.config.histograms ? this.config.histograms.max : histData.stats.max;

        // don't do anything if we don't know the score max
        if( maxScore === undefined ) {
            console.warn( 'no stats.max in hist data, not drawing histogram for block '+viewArgs.blockIndex );
            return;
        }

        // don't do anything if we have no hist features
        var features;
        if(!( ( features = histData.features )
              || histData.bins && ( features = this._histBinsToFeatures( viewArgs, histData ) )
            ))
            return;

        var block = viewArgs.block;
        var height = this.config.histograms.height;
        var scale = viewArgs.scale;
        var leftBase = viewArgs.leftBase;
        var minVal = this.config.histograms.min;

        domConstruct.empty( block.domNode );
        var c = block.featureCanvas =
            domConstruct.create(
                'canvas',
                { height: height,
                  width:  block.domNode.offsetWidth+1,
                  style: {
                      cursor: 'default',
                      height: height+'px',
                      position: 'absolute'
                  },
                  innerHTML: 'Your web browser cannot display this type of track.',
                  className: 'canvas-track canvas-track-histograms'
                },
                block.domNode
            );
        this.heightUpdate( height, viewArgs.blockIndex );
        var ctx = c.getContext('2d');

        // finally query the various pixel ratios
        var devicePixelRatio = window.devicePixelRatio || 1;
        var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                                                ctx.mozBackingStorePixelRatio ||
                                                ctx.msBackingStorePixelRatio ||
                                                ctx.oBackingStorePixelRatio ||
                                                ctx.backingStorePixelRatio || 1;

        var ratio = devicePixelRatio / backingStoreRatio;
        // upscale canvas if the two ratios don't match
        if (devicePixelRatio !== backingStoreRatio) {

            var oldWidth = c.width;
            var oldHeight = c.height;

            c.width = oldWidth * ratio;
            c.height = oldHeight * ratio;

            c.style.width = oldWidth + 'px';
            c.style.height = oldHeight + 'px';

            // now scale the context to counter
            // the fact that we've manually scaled
            // our canvas element
            ctx.scale(ratio, ratio);
        }

        ctx.fillStyle = this.config.histograms.color;
        for( var i = 0; i<features.length; i++ ) {
            var feature = features[i];
            var barHeight = feature.get('score')/maxScore * height;
            var barWidth = Math.ceil( ( feature.get('end')-feature.get('start') )*scale );
            var barLeft = Math.round(( feature.get('start') - leftBase )*scale );
            ctx.fillRect(
                barLeft,
                height-barHeight,
                barWidth,
                barHeight
            );
            if( barHeight > height ) {
                ctx.fillStyle = this.config.histograms.clip_marker_color;
                ctx.fillRect( barLeft, 0, barWidth, 3 );
                ctx.fillStyle = this.config.histograms.color;
            }
        }

        // make the y-axis scale for our histograms
        this.makeHistogramYScale( height, minVal, maxScore );
    },

    _histBinsToFeatures: function( viewArgs, histData ) {
        var bpPerBin = parseFloat( histData.stats.basesPerBin );
        var leftBase = viewArgs.leftBase;

        return array.map(
            histData.bins,
            function( bin, i ) {
                return new SimpleFeature(
                    { data: {
                          start: leftBase + i*bpPerBin,
                          end: leftBase + (i+1)*bpPerBin,
                          score: bin
                      }});
            });
    },


    makeHistogramYScale: function( height, minVal, maxVal ) {
        if( this.yscale_params
            && this.yscale_params.height == height
            && this.yscale_params.max == maxVal
            && this.yscale_params.min == minVal
          )
            return;

        this.yscale_params = { height: height, min: minVal, max: maxVal };
        this.makeYScale({ min: minVal, max: maxVal });
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
                                                      position: 'absolute'
                                                  },
                                                  innerHTML: 'Your web browser cannot display this type of track.',
                                                  className: 'canvas-track'
                                                },
                                                block.domNode
                                            );
                                        var ctx = c.getContext('2d');

                                        // finally query the various pixel ratios
                                        var devicePixelRatio = window.devicePixelRatio || 1;
                                        var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                                                                                ctx.mozBackingStorePixelRatio ||
                                                                                ctx.msBackingStorePixelRatio ||
                                                                                ctx.oBackingStorePixelRatio ||
                                                                                ctx.backingStorePixelRatio || 1;

                                        var ratio = devicePixelRatio / backingStoreRatio;
                                        // upscale canvas if the two ratios don't match
                                        if (devicePixelRatio !== backingStoreRatio) {

                                            var oldWidth = c.width;
                                            var oldHeight = c.height;

                                            c.width = oldWidth * ratio;
                                            c.height = oldHeight * ratio;

                                            c.style.width = oldWidth + 'px';
                                            c.style.height = oldHeight + 'px';

                                            // now scale the context to counter
                                            // the fact that we've manually scaled
                                            // our canvas element
                                            ctx.scale(ratio, ratio);
                                        }



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

        this._attachMouseOverEvents( );

        // connect up the event handlers
        this._connectEventHandlers( block );

        this.updateStaticElements( { x: this.browser.view.getX() } );
    },

    _attachMouseOverEvents: function( ) {
        var gv = this.browser.view;
        var thisB = this;

        if( this.displayMode == 'collapsed' ) {
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
                    evt = domEvent.fix( evt );
                    var bpX = gv.absXtoBp( evt.clientX );
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

        if( !this.showTooltips || this.labelTooltip )
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
                             var bpX = thisB.browser.view.absXtoBp( evt.clientX );
                             if( block.containsBp( bpX ) ) {
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
            var bpX = this.browser.view.absXtoBp( evt.clientX );

        if( this.labelTooltip)
            this.labelTooltip.style.display = 'none';

        array.forEach( this.blocks, function( block, i ) {
            if( ! block )
                return;
            var context = this.getRenderingContext({ block: block, leftBase: block.startBase, scale: block.scale });
            if( ! context )
                return;

            if( this.lastMouseover && block.fRectIndex ) {
                var r = block.fRectIndex.getByID( this.lastMouseover.id() );
                if( r )
                    this.renderFeature( context, r );
            }

            if( block.tooltipTimeout )
                window.clearTimeout( block.tooltipTimeout );

            if( feature ) {
                var fRect = block.fRectIndex && block.fRectIndex.getByID( feature.id() );
                if( ! fRect )
                    return;

                if( block.containsBp( bpX ) ) {
                    var renderTooltip = dojo.hitch( this, function() {
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
                        var labelSpan = this.labelTooltip.childNodes[0],
                            descriptionSpan = this.labelTooltip.childNodes[1];
                        if( label ) {
                            labelSpan.style.display = 'block';
                            labelSpan.style.font = label.font;
                            labelSpan.style.color = label.fill;
                            labelSpan.innerHTML = label.text;
                        } else {
                            labelSpan.style.display = 'none';
                            labelSpan.innerHTML = '(no label)';
                        }
                        if( description ) {
                            descriptionSpan.style.display = 'block';
                            descriptionSpan.style.font = description.font;
                            descriptionSpan.style.color = description.fill;
                            descriptionSpan.innerHTML = description.text;
                        }
                        else {
                            descriptionSpan.style.display = 'none';
                            descriptionSpan.innerHTML = '(no description)';
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
                block.tooltipTimeout = window.setTimeout( dojo.hitch(this, function() { this.ignoreTooltipTimeout = false; }), 200);
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

        this.updateYScaleFromViewDimensions( coords );

        if( coords.hasOwnProperty("x") ) {
            var context = this.staticCanvas.getContext('2d');

            this.staticCanvas.width = this.browser.view.elem.clientWidth;
            this.staticCanvas.style.left = coords.x + "px";
            context.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

            var minVisible = this.browser.view.minVisible();
            var maxVisible = this.browser.view.maxVisible();
            var viewArgs = {
                minVisible: minVisible,
                maxVisible: maxVisible,
                bpToPx: dojo.hitch(this.browser.view, "bpToPx"),
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
