define([
           'dojo/_base/declare',
           'JBrowse/View/FeatureGlyph'
       ],
       function(
           declare,
           FeatureGlyph
       ) {

return declare( FeatureGlyph, {

    highlightFeature: function( context, args, fRect ) {
        context.fillStyle = this.getStyle( fRect.f, 'mouseovercolor' );
        context.fillRect( fRect.l, fRect.t, fRect.w, fRect.h );
    },

    renderFeature: function( context, viewArgs, fRect ) {
        // background
        var color = this.getStyle( fRect.f, 'color' );
        if( color ) {
            context.fillStyle = color;
            context.fillRect( fRect.l, fRect.t, fRect.w, fRect.h );
        }

        // foreground border
        var border_color;
        if( fRect.h > 3 ) {
            border_color = this.getStyle( fRect.f, 'border_color' );
            if( border_color ) {
                context.lineWidth = 1;
                context.strokeStyle = border_color;

                // need to stroke a smaller rectangle to remain within
                // the bounds of the feature's overall height and
                // width, because of the way stroking is done in
                // canvas.  thus the +0.5 and -1 business.
                context.strokeRect( fRect.l+0.5, fRect.t+0.5, fRect.w-1, fRect.h-1 );
            }
        }
        else if( fRect.h > 1 ) {
            border_color = this.getStyle( fRect.f, 'border_color' );
            if( border_color ) {
                context.fillStyle = border_color;
                context.fillRect( fRect.l, fRect.t+fRect.h-1, fRect.w, 1 );
            }
        }
    }

});
});