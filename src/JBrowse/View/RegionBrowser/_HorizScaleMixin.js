define([
           'dojo/_base/declare',

           'JBrowse/Util'
       ], function(
           declare,

           Util
       ) {

return declare( null, {

    _horizontalScaleIterate: function( block, majorCallback, minorCallback ) {
        var projectionBlock = block.getProjectionBlock();
        var aRange = projectionBlock.getValidRangeA();
        var scale = projectionBlock.getScale();
        var blockDims = block.getDims();

        var gridPitch = this.chooseGridPitch( scale, 60, 15 );

        var minBase = projectionBlock.projectPoint( blockDims.l );
        var maxBase = projectionBlock.projectPoint( blockDims.r );
        if( minBase === null || maxBase === null )
            return;

        if( scale < 0 ) { // swap if negative
            var tmp = minBase;
            minBase = maxBase;
            maxBase = tmp;
        }

        // apply left and right margins
        if( scale > 0 ) {
            if( blockDims.leftEdge )
                minBase += Math.abs( 10*scale );
            if( blockDims.rightEdge )
                maxBase -= Math.abs( 10*scale );
        }
        else {
            if( blockDims.rightEdge )
                minBase += Math.abs( 10*scale );
            if( blockDims.leftEdge )
                maxBase -= Math.abs( 10*scale );
        }

        for( var b = Math.ceil( minBase / gridPitch.minorPitch ) * gridPitch.minorPitch;
             b < maxBase;
             b += gridPitch.minorPitch
           ) {
               if( b % gridPitch.majorPitch )
                   minorCallback( b );
               else
                   majorCallback( b );
        }
    },

    /**
     * Given a scale ( bp/px ) and minimum distances (px) between major
     * and minor gridlines, return an object like { majorPitch: bp,
     * minorPitch: bp } giving the gridline pitches to use.
     */
    chooseGridPitch: function( scale, minMajorPitchPx, minMinorPitchPx ) {
        scale = Math.abs(scale);
        var minMajorPitchBp = minMajorPitchPx * scale;
        var majorMagnitude = parseInt(
             new Number( minMajorPitchBp ).toExponential().split(/e/i)[1]
        );

        var majorPitch = Math.pow( 10, majorMagnitude );
        while( majorPitch < minMajorPitchBp ) {
            majorPitch *= 2;
            if( majorPitch >= minMajorPitchBp )
                break;
            majorPitch *= 2.5;
        }

        var majorPitchPx = majorPitch/scale;

        var minorPitch = !( majorPitch % 10 ) && majorPitchPx/10 > minMinorPitchPx ? majorPitch/10 :
                         !( majorPitch % 5  ) && majorPitchPx/5  > minMinorPitchPx ? majorPitch/5  :
                         !( majorPitch % 2  ) && majorPitchPx/2  > minMinorPitchPx ? majorPitch/2  :
                          0;

        return { majorPitch: majorPitch, minorPitch: minorPitch };
    }

});
});