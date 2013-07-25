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
                border_color: '#333'
            }
        });
},

renderBox: function( context, block, fRect ) {
    var rectWidth = fRect.rect.w;
    var rectHeight = fRect.rect.h;

    // connector
    var connectorColor = this.getStyle( fRect.f, 'connector_color' );
    if( connectorColor ) {
        context.fillStyle = connectorColor;
        context.fillRect( fRect.rect.l, fRect.t+Math.round(fRect.rect.h/2)-1, fRect.rect.w, 2 );
    }

    var subfeatures = fRect.f.children();
    if( subfeatures ) {

        // segment backgrounds
        var color = this.getStyle( fRect.f, 'color' );
        if( color ) {
            context.fillStyle = color;
            for( var i = 0; i < subfeatures.length; ++i ) {
                var left = block.bpToX( subfeatures[i].get('start') );
                var width = block.bpToX( subfeatures[i].get('end') ) - left;
                context.fillRect( left, fRect.t, width, rectHeight );
            }
        }

        // segment foregrounds
        // foreground border
        var border_color;
        if( rectHeight > 3 ) {
            border_color = this.getStyle( fRect.f, 'border_color' );
            if( border_color ) {
                context.lineWidth = 1;
                context.strokeStyle = border_color;
                for( var i = 0; i < subfeatures.length; ++i ) {
                    var left = block.bpToX( subfeatures[i].get('start') );
                    var width = block.bpToX( subfeatures[i].get('end') ) - left;

                    // need to stroke a smaller rectangle to remain within
                    // the bounds of the feature's overall height and
                    // width, because of the way stroking is done in
                    // canvas.  thus the +0.5 and -1 business.
                    context.strokeRect( left+0.5, fRect.t+0.5, width-1, rectHeight-1 );
                }
            }
        }
        else if( rectHeight > 1 ) {
            border_color = this.getStyle( fRect.f, 'border_color' );
            if( border_color ) {
                context.fillStyle = border_color;
                for( var i = 0; i < subfeatures.length; ++i ) {
                    var left = block.bpToX( subfeatures[i].get('start') );
                    var width = block.bpToX( subfeatures[i].get('end') ) - left;

                    context.fillRect( left, fRect.t+fRect.h-1, width, 1 );
                }
            }
        }

    }
}

});
});