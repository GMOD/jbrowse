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

        var gridPitch = this.get('genomeView').chooseGridPitch( scale, 60, 15 );

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
    }
});
});