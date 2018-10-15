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

renderSegments( context, fRect ) {
    const f1 = dojo.clone(fRect);
    const f2 = dojo.clone(fRect);
    f1.f = fRect.f.f1
    f2.f = fRect.f.f2
    this.inherited(arguments, [context, f1])
    this.inherited(arguments, [context, f2])
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

