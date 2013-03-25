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
        return this.getConf( path, [feature, path, null, null, this, this.track ] );
    },

    /**
     * Get the dimensions of the rendered feature in pixels.
     */
    _getFeatureRectangle: function( args ) {
        var feature = args.feature;
        var block = args.view.block;
        var fRect = {
            l: block.bpToX( feature.get('start') ),
            h: this.getStyle( feature, 'height' )
        };

        fRect.w = block.bpToX( feature.get('end') ) - fRect.l;
        return fRect;
    },

    layoutFeature: function( args ) {
        var feature = args.feature;
        var fRect = this._getFeatureRectangle( args );

        var scale = args.view.scale;
        var leftBase = args.view.leftBase;
        var startbp = fRect.l/scale + leftBase;
        var endbp   = (fRect.l+fRect.w)/scale + leftBase;
        fRect.t = args.layout.addRect(
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
    renderFeature: function( context, block, fRect ) {
    }

});
});