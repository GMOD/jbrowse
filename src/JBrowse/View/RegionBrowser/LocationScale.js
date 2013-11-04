define([
           'dojo/_base/declare',

           'dijit/_WidgetBase',

           "JBrowse/View/Track/_BlockBasedMixin",
	   "./_HorizScaleMixin",
           'JBrowse/Util'
       ], function(
           declare,

           _WidgetBase,

           _BlockBasedMixin,
           _HorizScaleMixin,
           Util
       ) {

return declare( [ _WidgetBase, _BlockBasedMixin, _HorizScaleMixin ], {

baseClass: 'viewScale',

fillBlock: function( block, blockNode ) {
    var html = [];
    var blockDims = block.getDimensions();
    var projectionBlock = block.getProjectionBlock();

    // draw a reference label if this rendering block is on the left
    // edge of the projection block, or if its range in px coordinates
    // (system A in the projection) overlaps the left side of the
    // regionbrowser viewport
    if( blockDims.leftEdge ) {
        html.push( '<div class="referenceLabel"',
                   ' style="left: 0"><span>',
                   projectionBlock.getBName(),
                   '</span></div>'
                 );
    }
    if( blockDims.rightEdge ) {
        html.push( '<div class="referenceRightBorder"',
                   ' style="right: 0"></div>'
                 );
    }

    // draw the bp labels
    this._horizontalScaleIterate(
        block,
        // label each major tick
        function(b) {
            var label = Util.humanReadableNumber(b);
            var leftpx = Math.round( projectionBlock.reverseProjectPoint(b) - blockDims.l );
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

        },
        // don't make labels for minor ticks
        function(){}
    );

    blockNode.innerHTML = html.join('');
}

});
});