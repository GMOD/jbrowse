define( [
          'dojo/_base/declare',
          'JBrowse/View/Track/Wiggle/XYPlot',
          'JBrowse/View/Track/WiggleBase',
          'JBrowse/Util',
        ],
        function( declare, XYPlot, WiggleBase, Util ) {

var XYFunction = declare( [WiggleBase,XYPlot], {

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {style: { defaultColor: 'blue' }}
        );
    },
    
    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, pixels, dataScale ) {
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var toY = this.toY = dojo.hitch( this, function( val ) {
           return canvasHeight * ( 1-dataScale.normalize.call(this, val) );
        });

        if (this.config.valuesToPlot) {
            // If another track has inherited from this one to draw multiple plots, use config to draw graph
            for (var key in this.config.valuesToPlot) {
                if (this.config.valuesToPlot.hasOwnProperty(key)) {
                    this.drawLine( pixels,       key,
                                   this.config.style[this.config.valuesToPlot[key]],
                                   context,      toY,
                                   canvasHeight, dataScale );
                }
            }
        }
        else {
            // else, draw single graph in the default color
            this.drawLine( pixels,       null,
                           this.config.style.defaultColor,
                           context,      toY,
                           canvasHeight, dataScale );
        }
    },

    drawLine: function( pixels, pixelKey, color, context, toY, canvasHeight, dataScale ) {
        var clipColor  = this.config.style.clip_marker_color;
        var disableClipMarkers = this.config.disable_clip_markers;
        var originY = toY( dataScale.origin );

        var lastPointHadValue = false;
        context.strokeStyle = color;
        dojo.forEach( pixels, function(p,i) {
            var score = pixelKey ? toY(p[pixelKey]) : toY(p) ; // in general, the pixel array may contain a score, or an array of scores
            if ( !score && score != 0 ) {
                if (lastPointHadValue.length) {
                    context.fillStyle = color;
                    context.fillRect(lastPointHadValue[0],lastPointHadValue[1],1,1);
                }
                else if (lastPointHadValue) {
                    context.stroke();
                }
                lastPointHadValue = false;
                context.beginPath();
            }
            else {
                if (!lastPointHadValue) {
                    context.moveTo(i, score);
                }
                if( score <= canvasHeight ) { // if the point is visible at all
                    if( score <= originY ) {
                        // bar goes upward
                        context.lineTo( i, score );
                        if( !disableClipMarkers && score < 0 ) { // draw clip marker if necessary
                            context.fillStyle = clipColor || 'red';
                            context.fillRect( i, 0, 1, 2 );
                        }
                    }
                    else {
                        // bar goes downward
                        context.lineTo( i, score );
                        if( !disableClipMarkers && score >= canvasHeight ) { // draw clip marker if necessary
                            context.fillStyle = clipColor || 'red';
                            context.fillRect( i, canvasHeight-3, 1, 2 );
                        }
                    }
                }
                lastPointHadValue = lastPointHadValue ? true : [i,score];
                // The line above is a bit obfuscatory.
                // If one isolated pixel has a value associated to it, drawing lines will not work.
                // therefore, we save the position and value, and draw a rect when "score" becomes undefined
                // if adjacent pixels have scores, "lastPointHadValue" will become true, and lines will be drawn.
            }
        }, this );
        context.stroke();
    }

});
return XYFunction;
});