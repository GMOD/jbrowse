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

return declare( [ Stateful, Destroyable, _BlockBasedMixin, _HorizScaleMixin ] , {

constructor: function( args ) {
    this.height = 1;
    this.domNode = domConstruct.create(
        'div',
        { className: 'gridlines' }
    );
    this.set('genomeView', args.genomeView );
},

createBlockNode: function( block ) {
    var d = document.createElement('canvas');
    d.className = 'renderingBlock';
    d.height = this.height;
    this.domNode.appendChild(d);
    return d;
},

_positionBlockNode: function( block, canvasNode, changeInfo ) {
    this.inherited(arguments);

    if( changeInfo.operation === 'new'
        || ( changeInfo.deltaLeft || changeInfo.deltaRight )
           && changeInfo.deltaLeft != changeInfo.deltaRight
      ) {
          var dims = block.getDimensions();
          canvasNode.width = Math.round( dims.w );
      }
},

fillBlock: function( block, blockNode ) {

    var blockDims = block.getDimensions();
    var projectionBlock = block.getProjectionBlock();
    var ctx = blockNode.getContext('2d');
    var height = this.height;

    ctx.clearRect( 0, 0, blockNode.width, blockNode.height );

    if( blockDims.leftEdge ) {
        ctx.fillStyle = 'black';
        ctx.fillRect( 0, 0, 1, height );
    }
    if( blockDims.rightEdge ) {
        ctx.fillStyle = 'black';
        ctx.fillRect( blockNode.width-1, 0, 1, height );
    }

    this._horizontalScaleIterate(
        block,
        //major
        function( bp ) {
            var leftpx = Math.round( projectionBlock.reverseProjectPoint(bp)-blockDims.l );
            ctx.fillStyle = '#666';
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