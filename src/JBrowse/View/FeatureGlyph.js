define([
           'dojo/_base/declare'
       ],
       function(
           declare
       ) {

return declare( null, {
    constructor: function( args ) {
        this.track = args.track;
    },

    getStyle: function( feature, keyName ) {
        return this.track.getStyle( feature, keyName );
    },

    /**
     * Get the dimensions of the rendered feature in pixels.
     */
    _getFeatureRectangle: function( args ) {
        var feature = args.feature;
        var fRect = {
            l: args.toX( feature.get('start') ),
            h: this.getStyle( feature, 'height' )
        };

        fRect.w = args.toX( feature.get('end') ) - fRect.l;
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
            fRect.h
        );

        fRect.f = feature;

        return fRect;
    }


});
});