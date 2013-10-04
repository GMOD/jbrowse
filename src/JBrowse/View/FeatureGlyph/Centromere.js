define([
           'dojo/_base/declare',
           './Box',
           'dojo/_base/lang'
       ],
       function(
           declare,
           BoxGlyph,
           lang
       ) {

return declare([ BoxGlyph ], {
    configSchema: {
        slots: [
            { name: 'color', defaultValue: '#8B2323', type: 'Color'},
            { name: 'height', defaultValue: 30, type: 'float' },
            { name: 'borderColor', defaultValue: 'black', type: 'Color' },
            { name: 'borderWidth', defaultValue: 1, type: 'float' }
        ]
    },

    renderBox: function( context, viewInfo, feature, top, overallHeight, parentFeature, style ) {
        var left  = viewInfo.block.bpToX( feature.get('start') );
        var width = viewInfo.block.bpToX( feature.get('end') ) - left;

        style = style || lang.hitch( this, 'getStyle' );

        var height = this.getFeatureHeight( viewInfo, feature );
        if( ! height )
            return;
        if( height != overallHeight )
            top += Math.round( (overallHeight - height)/2 );

        // background
        var bgcolor = style( feature, 'color' );
        if( bgcolor ) {
            context.fillStyle = bgcolor.toString();
            context.beginPath();
            context.moveTo(left, top);
            context.lineTo(left, top+height);
            context.lineTo(left+width/2, (top+height)*0.5);
            context.fill();

            context.beginPath();
            context.moveTo(left+width, top);
            context.lineTo(left+width, top+height);
            context.lineTo(left+width/2, (top+height)*0.5);
            context.fill();
        }
        else {
            context.clearRect( left, top, Math.max(1,width), height );
        }

        // foreground border
        var borderColor, lineWidth;
        if( (borderColor = style( feature, 'borderColor' )) && ( lineWidth = style( feature, 'borderWidth')) ) {
            if( width > 3 ) {
                context.lineWidth = lineWidth;
                context.strokeStyle = borderColor.toString();

                // need to stroke a smaller rectangle to remain within
                // the bounds of the feature's overall height and
                // width, because of the way stroking is done in
                // canvas.  thus the +0.5 and -1 business.
                context.strokeRect( left+lineWidth/2, top+lineWidth/2, width-lineWidth, height-lineWidth );
            }
            else {
                context.globalAlpha = lineWidth*2/width;
                context.fillStyle = borderColor.toString();
                context.fillRect( left, top, Math.max(1,width), height );
                context.globalAlpha = 1;
            }
        }
    },
});
});
