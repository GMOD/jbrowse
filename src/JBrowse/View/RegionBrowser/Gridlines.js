define([
           'dojo/_base/declare',
           'dojo/dom-construct',
           'dojo/Stateful',

           'dijit/Destroyable',

	   "JBrowse/View/Track/_BlockBasedMixin",
	   "./_HorizScaleMixin",
           'JBrowse/Util'
       ], function(
           declare,
           domConstruct,
           Stateful,

           Destroyable,

           _BlockBasedMixin,
           _HorizScaleMixin,
           Util
       ) {

var serialNumber = 0;

return declare( [ Stateful, Destroyable, _BlockBasedMixin, _HorizScaleMixin ] , {

constructor: function( args ) {
    this.height = 1;
    this.domNode = domConstruct.create(
        'div',
        { className: 'gridlines' }
    );
},

// the Gridlines widget uses bare canvas elements as rendering blocks
// instead of divs
createBlockNode: function( block ) {
    var d = document.createElement('canvas');
    d.className = 'renderingBlock';
    d.setAttribute('serialNumber', serialNumber++ );
    d.height = this.height;
    this.domNode.appendChild(d);
    return d;
},


newBlock: function( renderingBlock, changeInfo ) {
    var thisB = this,
    blockNode = this.createBlockNode( renderingBlock ),
    blockChangeWatch = renderingBlock.watch(
        function( changeInfo, block ) {
            console.log( changeInfo.operation, blockNode );
            if( changeInfo.operation == 'destroy' )
                blockChangeWatch.remove();

            thisB.blockChange( blockNode, changeInfo, block );
        });

    this.blockChange( blockNode, changeInfo, renderingBlock );
},

_positionBlockNode: function( block, canvasNode, changeInfo ) {
    this.inherited(arguments);

    // need to update the canvas's natural pixel width also
    if( changeInfo.operation === 'new'
        || ( changeInfo.deltaLeft || changeInfo.deltaRight )
           && changeInfo.deltaLeft != changeInfo.deltaRight
      ) {
          canvasNode.width = Math.ceil( block.getDimensions().w );
      }
},

fillBlock: function( block, blockNode ) {

    var blockDims = block.getDimensions();
    var projectionBlock = block.getProjectionBlock();
    var ctx = blockNode.getContext('2d');
    var height = this.height;

    ctx.clearRect( 0, 0, blockNode.width, blockNode.height );

    // draw borders on the edge of the projection block if needed
    if( blockDims.leftEdge ) {
        ctx.fillStyle = 'black';
        ctx.fillRect( 0, 0, 1, height );
    }
    if( blockDims.rightEdge ) {
        ctx.fillStyle = 'black';
        ctx.fillRect( blockNode.width-1, 0, 1, height );
    }

    // draw the major and minor grid lines
    this._horizontalScaleIterate(
        block,
        //major
        function( bp ) {
            var leftpx = Math.round( projectionBlock.reverseProjectPoint(bp)-blockDims.l );
            ctx.fillStyle = '#b3b3b3';
            ctx.fillRect( leftpx, 0, 1, height );
        },
        //minor
        function( bp ) {
            var leftpx = Math.round( projectionBlock.reverseProjectPoint(bp)-blockDims.l );
            ctx.fillStyle = '#eee';
            ctx.fillRect( leftpx, 0, 1, height );
        });
}

});
});