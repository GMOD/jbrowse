define([
           'dojo/_base/declare',
           'JBrowse/Component'
       ],
       function(
           declare,
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
        return this.getConf( path, [feature, path, this, this.track ] );
    },

    mouseoverFeature: function( context, fRect ) {
        this.renderFeature( context, fRect );

        // highlight the feature rectangle if we're moused over
        context.fillStyle = this.getStyle( fRect.f, 'mouseovercolor' );
        context.fillRect( fRect.rect.l, fRect.t, fRect.rect.w, fRect.rect.h );
    },

    /**
     * Get the dimensions of the rendered feature in pixels.
     */
    _getFeatureRectangle: function( viewInfo, feature ) {
        var block = viewInfo.block;
        var fRect = {
            l: block.bpToX( feature.get('start') ),
            h: this._getFeatureHeight( viewArgs, feature ),
            viewInfo: viewInfo,
            f: feature,
            glyph: this
        };

        fRect.w = block.bpToX( feature.get('end') ) - fRect.l;
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

    //stub
    renderFeature: function( context, fRect ) {
    },

    _getFeatureHeight: function( viewArgs, feature ) {
        return this.getStyle( feature, 'height');
    }

});
});