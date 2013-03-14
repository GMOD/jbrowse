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


    layoutFeature: function( args ) {
        var toX = args.toX;

        var feature = args.feature;
        var layoutStart = feature.get('start');
        var layoutEnd   = feature.get('end');

        var fHeight = this.getStyle( feature, 'height' );
        var levelHeight = fHeight + this.getStyle( feature, 'marginBottom' );

        var top = args.layout.addRect(
            feature.id(),
            layoutStart,
            layoutEnd,
            levelHeight
        );

        var fRect = {
            l: toX(layoutStart),
            h: fHeight,
            t: top,

            f: feature,
            toX: toX
        };
        fRect.w = toX(layoutEnd) - fRect.l;

        return fRect;
    }


});
});