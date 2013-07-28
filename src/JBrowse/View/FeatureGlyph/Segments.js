define([
           'dojo/_base/declare',
           'JBrowse/View/FeatureGlyph/Box'
       ],
       function(
           declare,
           BoxGlyph
       ) {

return declare( BoxGlyph, {

_defaultConfig: function() {
    return this._mergeConfigs(
        this.inherited(arguments),
        {
            style: {
                connector_color: '#333',
                border_color: 'rgba( 0, 0, 0, 0.3 )'
            }
        });
},

renderFeature: function( context, block, fRect ) {
    if( this.track.displayMode != 'collapsed' )
        context.clearRect( Math.floor(fRect.l), fRect.t, Math.ceil(fRect.w), fRect.h );

    this.renderConnector( context, block, fRect );
    this.renderSegments( context, block, fRect );
    this.renderLabel( context, block, fRect );
    this.renderDescription( context, block, fRect );
    this.renderArrowhead( context, block, fRect );
},

renderConnector: function( context, block, fRect ) {
    // connector
    var connectorColor = this.getStyle( fRect.f, 'connector_color' );
    if( connectorColor ) {
        context.fillStyle = connectorColor;
        context.fillRect( fRect.rect.l, fRect.t+Math.round(fRect.rect.h/2)-1, fRect.rect.w, 2 );
    }
},

renderSegments: function( context, block, fRect ) {
    var subfeatures = fRect.f.children();
    if( subfeatures ) {

        var thisB = this;
        var parentFeature = fRect.f;

        function style( feature, stylename ) {
            return thisB.getStyle( feature, stylename ) || thisB.getStyle( parentFeature, stylename );
        }

        for( var i = 0; i < subfeatures.length; ++i ) {
            this.renderBox( context, block, subfeatures[i], fRect.t, fRect.rect.h, fRect.f, style );
        }
    }
}

});
});