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
        
        if (width < 500){
            this._drawTriangle(left, top, width, height, feature.data.pos, context, style, feature);
            this._drawBorder(left, top, width, height, feature.data.pos, context, style, feature);
        }
        else {
            this._drawRepeatingArrows(left, top, width, height, feature.data.pos, context, style, feature);
        }

    },
    // background
    _drawTriangle: function(left, top, width, height, direction, context, style, feature){ 
        if( bgcolor = style( feature, 'color' )) {
            context.fillStyle = bgcolor.toString();
            this._doPoints(left, top, width, height, direction, context);
            context.fill();
        }
        else {
            context.clearRect( left, top, Math.max(1,width), height );
        }
    },

    // foreground border
    _drawBorder: function(left, top, width, height, direction, context, style, feature){
        var borderColor, lineWidth;
        if( (borderColor = style( feature, 'borderColor' )) && ( lineWidth = style( feature, 'borderWidth')) ) {
            if( width > 3 ) {
                context.lineWidth = lineWidth;
                context.strokeStyle = borderColor.toString();
                this._doPoints(left, top, width, height, direction, context);
                context.stroke();
            }
            else {
                context.globalAlpha = lineWidth*2/width;
                context.fillStyle = borderColor.toString();
                this._doPoints(left, top, width, height, direction, context);
                context.stroke();
                context.globalAlpha = 1;
            }
        }
    },

    _drawRepeatingArrows: function(left, top, width, height, direction, context, style, feature){
        var numofArrows = (4*(Math.ceil(width*0.01)));
        var arrowWidth = width/numofArrows;
        for (var i=0; i <= numofArrows; i++){
            context.fillStyle = (i%2===1) ? '#B3B3B3' : '#8B2323';
            this._drawArrow(left, top, width, height, direction, context, arrowWidth, i);
        }
    },
    
    _drawArrow: function (left, top, width, height, direction, context, arrowWidth, i){
        context.beginPath();
        if (direction === 'left'){
            context.moveTo(left+width-i*arrowWidth, top+height/2);
            context.lineTo(left+width-(i+1)*arrowWidth, top);
            context.lineTo(left+width-(i+2)*arrowWidth, top);
            context.lineTo(left+width-(i+2)*arrowWidth, top+height);
            context.lineTo(left+width-(i+1)*arrowWidth, top+height);
        }else if(direction === 'right'){
            context.moveTo(left+i*arrowWidth, top+height/2);
            context.lineTo(left+(i+1)*arrowWidth, top);
            context.lineTo(left+(i+2)*arrowWidth, top);
            context.lineTo(left+(i+2)*arrowWidth, top+height);
            context.lineTo(left+(i+1)*arrowWidth, top+height);
        } else {
            this._drawArrow(left, top, width*0.5, height, 'left', context, arrowWidth, i);
            this._drawArrow(left+width*0.5, top, width*0.5, height, 'right', context, arrowWidth, i)
        }
        context.closePath();
        context.fill();
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
