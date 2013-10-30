define([
           'dojo/_base/declare',

	   "JBrowse/View/Track/BlockBased",
           'JBrowse/Util'
       ], function(
           declare,

           BlockBasedTrack,
           Util
       ) {

return declare( BlockBasedTrack, {

baseClass: 'viewScale',

fillBlock: function( block, blockNode ) {
    var html = [];

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

    for( var b = Math.ceil( minBase / gridPitch.majorPitch ) * gridPitch.majorPitch;
         b < maxBase;
         b += gridPitch.majorPitch
       ) {
        var label = Util.humanReadableNumber(b);
        var leftpx = projectionBlock.reverseProjectPoint(b)-blockDims.l;
        html.push(
            '<div class="posLabel" style="left: ',
                leftpx,
                'px" title="',
                Util.commifyNumber(b),
                '"><span style="left: -',
                (label.length*3),
                'px">'
                ,label,
                '</span></div>'
            );
    }

    blockNode.innerHTML = html.join('');
}

});
});