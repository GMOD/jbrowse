define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'JBrowse/View/FeatureGlyph/Alignment',
    'JBrowse/View/FeatureGlyph/AlignmentColoring'
],
function(
    declare,
    array,
    lang,
    Alignment,
    AlignmentColoring
) {


return declare(Alignment, {

clearFeat(context, fRect) {
    if( this.track.displayMode != 'collapsed' )
        context.clearRect( Math.floor(fRect.l), fRect.t, Math.ceil(fRect.w), fRect.h );
},
renderFeature(context, fRect) {
    this.clearFeat(context, fRect)

    if (fRect.f.pairedFeature()) {
        this.renderConnector( context, fRect )
        this.renderSegments( context, fRect )
        if (fRect.w > 2) {
            if (fRect.viewInfo.scale > 0.2) {
                this._drawMismatches( context, fRect, this._getMismatches( fRect.f.read1 ), fRect.f.read1 )
                this._drawMismatches( context, fRect, this._getMismatches( fRect.f.read2 ), fRect.f.read2 )
            }
            else {
                this._drawMismatches( context, fRect, this._getSkipsAndDeletions( fRect.f.read1 ), fRect.f.read1 )
                this._drawMismatches( context, fRect, this._getSkipsAndDeletions( fRect.f.read2 ), fRect.f.read2 )
            }
        }
    } else {
        this.inherited(arguments)
    }
},

renderSegments(context, fRect) {
    this.renderBox(context, fRect.viewInfo, fRect.f.read1,  fRect.t, fRect.rect.h, fRect.f);
    this.renderBox(context, fRect.viewInfo, fRect.f.read2,  fRect.t, fRect.rect.h, fRect.f);
},

renderConnector(context, fRect) {
    // connector
    var connectorColor = this.getStyle( fRect.f, 'connectorColor' );
    if (connectorColor) {
        context.fillStyle = connectorColor;
        var connectorThickness = this.getStyle( fRect.f, 'connectorThickness' );
        context.fillRect(
            fRect.rect.l, // left
            Math.round(fRect.rect.t+(fRect.rect.h-connectorThickness)/2), // top
            fRect.rect.w, // width
            connectorThickness
        );
    }
},

_defaultConfig() {
    return this._mergeConfigs(dojo.clone( this.inherited(arguments) ), {
        style: {
            connectorColor: AlignmentColoring.connectorColor,
            connectorThickness: 1
        }
    });
}

});
});
