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

blockChange: function( blockNode, changeInfo, block ) {
    this.inherited(arguments);

    var blockDims = block.getDimensions();
    if( changeInfo.operation != 'destroy' ) {
        // possibly draw a label on the left side of the block if the
        // block is overlapping the left edge of the screen
        if( blockDims.l < 0 && blockDims.r > 0 ) {
            if( ! this.floatingLabel ) {
                var floater = this.floatingLabel = document.createElement('div');
                floater.className = 'referenceLabel floatingReferenceLabel';
                floater.appendChild( document.createElement('span') );
                this.domNode.appendChild( floater );
            }
            this.floatingLabel.style.visibility = 'visible';
            var bName = block.getProjectionBlock().getBName();
            if( this.floatingLabel.firstChild.innerHTML != bName )
                this.floatingLabel.firstChild.innerHTML = bName;
        }
    }
    if( changeInfo.operation != 'new'
        && ! block.prev()
        && blockDims.l > 0
        && this.floatingLabel
      )
        this.floatingLabel.style.visibility = 'hidden';

},


fillBlock: function( block, blockNode ) {
    var html = [];
    var blockDims = block.getDimensions();
    var projectionBlock = block.getProjectionBlock();


    // draw a reference label if this rendering block is on the left
    // edge of the projection block, or if its range in px coordinates
    // (system A in the projection) overlaps the left side of the
    // regionbrowser viewport
    if( blockDims.leftEdge && blockDims.l > 0 ) {
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