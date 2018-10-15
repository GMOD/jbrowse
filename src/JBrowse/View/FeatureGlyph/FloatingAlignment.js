define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'JBrowse/View/FeatureGlyph/Alignment'
],
function(
    declare,
    array,
    lang,
    Alignment
) {
return declare(Alignment, {

renderFeature( context, fRect ) {
    this.renderConnector( context,  fRect );
    this.renderSegments( context, fRect );
},

layoutFeature(viewArgs, layout, feature) {
    var rect = this.inherited(arguments);
    if (!rect) {
        return rect;
    }
    var t = Math.abs(feature.get('insert_size'))

    // need to set the top of the inner rect
    rect.rect.t = t / (this.config.scaleFactor||1);
    rect.t = t / (this.config.scaleFactor||1);

    return rect;
},
renderConnector( context, fRect ) {
    // connector
    var connectorColor = this.getStyle( fRect.f, 'connectorColor' );
    if( connectorColor ) {
        context.fillStyle = connectorColor;
        var connectorThickness = this.getStyle( fRect.f, 'connectorThickness' );
        context.fillRect(
            fRect.rect.l, // left
            Math.round(fRect.rect.t+(fRect.rect.h-connectorThickness)/2), // top
            fRect.rect.w, // width
            connectorThickness
        );
    }
}

});
});

