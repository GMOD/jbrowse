define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/Component'
       ],
       function(
           declare,
           array,
           Component
       ) {

return declare( Component, {
    constructor: function( args ) {
        this.track = args.track;
    },

    getStyle: function( feature, name ) {
        return this.getConfForFeature( 'style.'+name, feature );
    },

    /**
     * Like getConf, but get a conf value that explicitly can vary
     * feature by feature.  Provides a uniform function signature for
     * user-defined callbacks.
     */
    getConfForFeature: function( path, feature ) {
        return this.getConf( path, [feature, path, null, null, this, this.track ] );
    },

    /**
     * Get the dimensions of the rendered feature in pixels.
     */
    _getFeatureRectangle: function( viewArgs, feature ) {
        var block = viewArgs.block;
        var fRect = {
            l: block.bpToX( feature.get('start') ),
            h: this.getStyle( feature, 'height' )
        };

        fRect.w = block.bpToX( feature.get('end') ) - fRect.l;

        // if feature has masks, add them to the fRect
        if (feature.masks) {
            fRect.m = [];
            array.forEach( feature.masks, function(m) {
                var tempM = { l: block.bpToX( m.start ) };
                tempM.w = block.bpToX( m.end ) - tempM.l;
                fRect.m.push(tempM);
            });
        }

        return fRect;
    },

    layoutFeature: function( viewArgs, layout, feature ) {
        var fRect = this._getFeatureRectangle( viewArgs, feature );

        var scale = viewArgs.scale;
        var leftBase = viewArgs.leftBase;
        var startbp = fRect.l/scale + leftBase;
        var endbp   = (fRect.l+fRect.w)/scale + leftBase;
        fRect.t = layout.addRect(
            feature.id(),
            startbp,
            endbp,
            fRect.h,
            feature
        );
        if( fRect.t === null )
            return null;

        fRect.f = feature;

        return fRect;
    },

    // wrapper
    renderFeature: function( context, block, fRect ) {
        this._renderFeature( context, block, fRect );
        if (fRect.m) {
            this.maskBySpans( context, block, fRect );
        }
    },

    // stub
    _renderFeature: function( context, block, fRect ) {
    },

    /* If it's a boolean track, mask accordingly */
    maskBySpans: function( context, block, fRect ) {
        var canvasHeight = context.canvas.height;
        var booleanAlpha = 0.17;

        // make a temporary canvas to store image data
        var tempCan = dojo.create( 'canvas', {height: canvasHeight, width: context.canvas.width} );
        var ctx2 = tempCan.getContext('2d');
        var l = Math.floor(fRect.l);
        var w = Math.ceil(fRect.w);
        array.forEach( fRect.m, function(m) { try {
            if ( m.l < l ) {
                m.w += m.l-l;
                m.l = l;
            }
            if ( m.w > w )
                m.w = w;
            if ( m.l < 0 ) {
                m.w += m.l;
                m.l = 0;
            }
            if ( m.l + m.w > l + w )
                m.w = w + l - m.l;
            if ( m.l + m.w > context.canvas.width )
                m.w = context.canvas.width-m.l;
            ctx2.drawImage(context.canvas, m.l, fRect.t, m.w, fRect.h, m.l, fRect.t, m.w, fRect.h);
            context.globalAlpha = booleanAlpha;
            // clear masked region and redraw at lower opacity.
            context.clearRect(m.l, fRect.t, m.w+1, fRect.h);
            context.drawImage(tempCan, m.l, fRect.t, m.w, fRect.h, m.l, fRect.t, m.w, fRect.h);
            context.globalAlpha = 1;
        } catch(e) {};
        });
    }

});
});