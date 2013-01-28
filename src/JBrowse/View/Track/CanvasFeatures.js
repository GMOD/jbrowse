/**
 * Feature track that draws features using HTML5 canvas elements.
 */

define( [
            'dojo/_base/declare',
            'dojo/dom-construct',
            'dojo/_base/array',
            'dojo/on',
            'JBrowse/View/GranularRectLayout',
            'JBrowse/View/Track/Canvas',
            'JBrowse/Errors',
            'JBrowse/View/Track/FeatureDetailMixin'
        ],
        function( declare, dom, array, on, Layout, CanvasTrack, Errors, FeatureDetailMixin ) {

return declare( [CanvasTrack,FeatureDetailMixin], {

    constructor: function( args ) {
    },

    _defaultConfig: function() {
        return {
            maxFeatureScreenDensity: 400,
            style: {
                bgcolor: 'goldenrod',
                fgcolor: null,
                height: 3,
                marginBottom: 1
            }
        };
    },

    getStyle: function( feature, name ) {
        var val = this.config.style[name];
        if( typeof val == 'function' )
            return val( feature, name, null, null, this );
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
        var track = this;

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
                                    var totalHeight = track._getLayout(scale)
                                                           .getTotalHeight();
                                    var c = dojo.create(
                                        'canvas',
                                        { height: totalHeight,
                                          width:  block.offsetWidth+1,
                                          style: { cursor: 'default' },
                                          innerHTML: 'Your web browser cannot display this type of track.',
                                          className: 'canvas-track'
                                        },
                                        block
                                    );
                                    track.renderFeatures( args, c, fRects );

                                    track.renderClickMap( args, c, fRects );

                                    track.layoutCanvases([c]);
                                    track.heightUpdate( totalHeight,
                                                        blockIndex );
                                    finishCallback();
                                },

                                dojo.hitch( track, function(e) {
                                    this._handleError(e);
                                    finishCallback(e);
                                })
                              );
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

        var featureMap = [];
        array.forEach( fRects, function( fRect ) {
            for( var i = 0; i < fRect.w; i++ ) {
                for( var j = 0; j < fRect.h; j++ ) {
                    var x = Math.round( fRect.l+i );
                    var y = Math.round( fRect.t+j );
                    (featureMap[x] = featureMap[x] || [])[y] = fRect.f;
                }
            }
        });

        for( var event in this.eventHandlers ) {
            var handler = this.eventHandlers[event];
            on( canvas, event, function( evt ) {
                if( ('offsetX' in evt) && ('offsetY' in evt) ) {
                    var clickedFeature = (featureMap[evt.offsetX]||[])[evt.offsetY];
                    if( clickedFeature ) {
                        handler.call({
                            track: thisB,
                            feature: clickedFeature,
                            callbackArgs: [ thisB, clickedFeature ]
                        });
                    }
                }
            });
        }
    },

    // draw the features on the canvas
    renderFeatures: function( args, canvas, fRects ) {
        var context = canvas.getContext('2d');
        array.forEach( fRects, dojo.hitch( this, 'renderFeature', context ) );
    },

    // draw each feature
    renderFeature: function( c, fRect ) {
        // background
        var bgcolor = this.getStyle( fRect.f, 'bgcolor' );
        if( bgcolor ) {
            c.fillStyle = bgcolor;
            c.fillRect( fRect.l, fRect.t, fRect.w, fRect.h );
        }

        // foreground
        var fgcolor = this.getStyle( fRect.f, 'fgcolor' );
        if( fgcolor ) {
            c.lineWidth = 1;
            c.strokeStyle = fgcolor;

            // need to stroke a smaller rectangle to remain within
            // the bounds of the feature's overall height and
            // width, because of the way stroking is done in
            // canvas.  thus the +0.5 and -1 business.
            context.strokeRect( fRect.l+0.5, fRect.t+0.5, fRect.w-1, fRect.h-1 );
        }
    }
});
});