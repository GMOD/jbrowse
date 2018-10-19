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
    if( this.track.displayMode != 'collapsed' && !this.config.readCloud )
        context.clearRect( Math.floor(fRect.l), fRect.t, Math.ceil(fRect.w), fRect.h );


    if(fRect.f.pairedFeature()) {
        this.renderConnector( context, fRect );
        this.renderSegments( context, fRect );
        if( fRect.w > 2 ) {
            if( fRect.viewInfo.scale > 0.2 ) {
                this._drawMismatches( context, fRect, fRect.f.f1, this._getMismatches( fRect.f.f1 ) );
                this._drawMismatches( context, fRect, fRect.f.f2, this._getMismatches( fRect.f.f2 ) );
            }
            else {
                this._drawMismatches( context, fRect, fRect.f.f1, this._getSkipsAndDeletions( fRect.f.f1 ));
                this._drawMismatches( context, fRect, fRect.f.f2, this._getSkipsAndDeletions( fRect.f.f2 ));
            }
        }

    } else {
        this.inherited(arguments)
    }
},

renderSegments( context, fRect ) {
    this.renderBox(context, fRect.viewInfo, fRect.f.f1,  fRect.t, fRect.rect.h, fRect.f);
    this.renderBox(context, fRect.viewInfo, fRect.f.f2,  fRect.t, fRect.rect.h, fRect.f);
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
},

_defaultConfig() {
    return this._mergeConfigs(dojo.clone( this.inherited(arguments) ), {
        style: {
            connectorColor: '#333',
            connectorThickness: 1,
        }
    });
},
layoutFeature(viewArgs, layout, feature) {
    var rect = this.inherited(arguments);
    if (!rect) {
        return rect;
    }
    if(this.config.readCloud) {
        if(feature.pairedFeature()) {
            var tlen = feature.f1.get('template_length')
            var t = Math.abs(tlen)

            // need to set the top of the inner rect
            rect.rect.t = t / (this.config.scaleFactor||1);
            rect.t = t / (this.config.scaleFactor||1);
        } else {
            rect.t = 0
            rect.rect.t = 0
        }
    }

    return rect;
}

});
});
