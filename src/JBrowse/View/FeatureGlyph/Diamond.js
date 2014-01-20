define(['dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'JBrowse/Util/FastPromise',
           'JBrowse/View/FeatureGlyph',
           './_FeatureLabelMixin',
           './Box'],
       function(declare,
           array,
           lang,
           FastPromise,
           FeatureGlyph,
           FeatureLabelMixin,
           Box) {
		   
return declare(Box, {
	
    renderBox: function( context, viewInfo, feature, top, overallHeight, parentFeature, style ) {
		
        var left  = viewInfo.block.bpToX( feature.get('start') );
        var width = viewInfo.block.bpToX( feature.get('end') ) - left;
        //left = Math.round( left );
        //width = Math.round( width );

        style = style || lang.hitch( this, 'getStyle' );

        var height = this._getFeatureHeight( viewInfo, feature );
        if( ! height )
            return;
        if( height != overallHeight )
            top += Math.round( (overallHeight - height)/2 );

        // background
        var bgcolor = style( feature, 'color' );
        if( bgcolor ) {
            context.fillStyle = bgcolor;
            leftCoor = [left,top+height/2]
            rightCoor = [left+Math.max(1,width),top+height/2]
            topCoor = [left + Math.max(1,width)/2, top]
            bottomCoor = [left + Math.max(1,width)/2, top+height]
            context.beginPath();
            context.moveTo(leftCoor[0],leftCoor[1]);
            context.lineTo(topCoor[0],topCoor[1]);
            context.lineTo(rightCoor[0],rightCoor[1]);
            context.lineTo(bottomCoor[0],bottomCoor[1]);
            context.closePath();
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
                context.strokeStyle = borderColor;

                // need to stroke a smaller rectangle to remain within
                // the bounds of the feature's overall height and
                // width, because of the way stroking is done in
                // canvas.  thus the +0.5 and -1 business.
                context.strokeRect( left+lineWidth/2, top+lineWidth/2, width-lineWidth, height-lineWidth );
            }
            else {
                context.globalAlpha = lineWidth*2/width;
                context.fillStyle = borderColor;
                context.fillRect( left, top, Math.max(1,width), height );
                context.globalAlpha = 1;
            }
        }
        
    }

});
});
