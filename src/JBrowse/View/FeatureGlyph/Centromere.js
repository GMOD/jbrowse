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
            this._doPoints(left, top, width, height, feature.data.pos, context);
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
                this._doPoints(left, top, width, height, feature.data.pos, context);
                context.stroke();
            }
            else {
                context.globalAlpha = lineWidth*2/width;
                context.fillStyle = borderColor.toString();
                this._doPoints(left, top, width, height, feature.data.pos, context);
                context.stroke();
                context.globalAlpha = 1;
            }
        }
    },
    
    // Generic function to go between points of triangle(s). 
    // stroke() or fill() still needs to be called after this
    _doPoints: function(left, top, width, height, direction, context){

        context.beginPath();
        if (direction === 'left'){
            context.moveTo( left, top );
            context.lineTo( left, top+height );
            context.lineTo( left+width, top+height*0.5 );
        }else if(direction === 'right'){
            context.moveTo( left+width, top );
            context.lineTo( left+width, top+height );
            context.lineTo( left, top+height*0.5 );
        } else {
            context.moveTo( left, top );
            context.lineTo( left, top+height );
            context.lineTo( left+width, top );
            context.lineTo( left+width, top+height );
        }
        context.closePath();
    }
});
});
