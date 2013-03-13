define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/Deferred',
            'dojo/promise/all',
            'JBrowse/View/Track/CanvasFeatures'
        ],
    function( declare, array, Deferred, all, CanvasFeatures ) {

return declare( CanvasFeatures,
{
    constructor: function( args ) {
        this.store = args.store;
    },
    _defaultConfig: function() {
        return {
            maxFeatureScreenDensity: 400,
            style: {
                bgcolor: 'maroon',
                fgcolor: null,
                alpha: 0.2,
                height: 3,
                marginBottom: 1
            }
        };
    },

    /* Overrides layoutFeature from CanvasFeatures.
       Allows us to display information about clipped features.
     */
    layoutFeature: function( viewArgs, feature, toX ) {
        var scale = viewArgs.scale;
        var layoutStart = feature.get('start');
        var layoutEnd   = feature.get('end');
        var overlaps = [];
        if (feature.overlaps) {
            for (var key in feature.overlaps) {
                if (feature.overlaps.hasOwnProperty(key)) {
                    overlaps.push( { start: feature.overlaps[key].start,
                                     end:   feature.overlaps[key].end } );
                }
            }
        }
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
        if (overlaps.length != 0) {
            fRect.overlaps = [];
            for (var key in overlaps) {
                if (overlaps.hasOwnProperty(key)) {
                    fRect.overlaps.push( { w: (overlaps[key].end-overlaps[key].start)*scale,
                                           l: toX(overlaps[key].start) } );
                }
            }
        }
        return fRect;
    },

    /* draw the features on the canvas
       Overrides the method from CanvasFeatures
     */
    renderFeatures: function( args, canvas, fRects ) {
        var context = canvas.getContext('2d');
        var fgcolor = this.config.style.fgcolor;
        var alpha = this.config.style.alpha;
        context.fillStyle = this.config.style.bgcolor;
        array.forEach( fRects, function( fRect ) {
            context.globalAlpha = alpha;
            context.fillRect( fRect.l, fRect.t, fRect.w, fRect.h );
            if (fRect.overlaps) {
                context.globalAlpha = 1;
                for (var key in fRect.overlaps) {
                    if (fRect.overlaps.hasOwnProperty(key)) {
                        context.fillRect( fRect.overlaps[key].l, fRect.t, fRect.overlaps[key].w, fRect.h );
                    }
                }
            }
        });
        if( fgcolor ) {
            context.lineWidth = 1;
            context.strokeStyle = fgcolor;
            array.forEach( fRects, function( fRect ) {
                // need to stroke a smaller rectangle to remain within
                // the bounds of the feature's overall height and
                // width, because of the way stroking is done in
                // canvas.  thus the +0.5 and -1 business.
                context.globalAlpha = alpha;
                context.strokeRect( fRect.l+0.5, fRect.t+0.5, fRect.w-1, fRect.h-1 );
                if (fRect.overlaps) {
                    context.globalAlpha = 1;
                    for (var key in fRect.overlaps) {
                        if (fRect.overlaps.hasOwnProperty(key)) {
                            context.strokeRect( fRect.overlaps[key].l+0.5, fRect.t+0.5, fRectoverlaps[key].w-1, fRect.h-1 );
                        }
                    }
                }
            });
        }
    }

});
});