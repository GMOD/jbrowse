define([
           'dojo/_base/declare',
           'dojo/dom-construct',
           'dojo/dom-class',

	   "dijit/_WidgetBase"
       ], function(
           declare,
           domConstruct,
           domClass,

           _WidgetBase
       ) {

return declare( _WidgetBase, {

baseClass: 'track',

_setGenomeViewAttr: function( genomeView ) {
    if( this._blockWatch )
        this._blockWatch.remove();

    var thisB = this;
    this.own(
        this._blockWatch = genomeView.watchRenderingBlocks(
            function( data, block ) {
                if( data.operation == 'new' ) {
                    thisB.newBlock( block );
                }
            }
        )
    );
},

newBlock: function( renderingBlock ) {
    var thisB = this,
    blockNode = domConstruct.create( 'div', { className: 'renderingBlock' }, this.domNode ),
    blockChangeWatch = renderingBlock.watch(
        function( changeInfo, block ) {
            if( changeInfo.operation == 'destroy' )
                blockChangeWatch.remove();

            thisB.blockChange( blockNode, changeInfo, block );
        });

    this.blockChange( blockNode, { operation: 'new' }, renderingBlock );
},

_positionBlockNode: function( block, blockNode, changeInfo ) {
    var dims = block.getDimensions();
    var isNew = changeInfo.operation == 'new';
    var edgeChanges;

    // update the basic dimensions and css classes of the block
    if( isNew || changeInfo.deltaLeft )
        blockNode.style.left = dims.l+1+'px';
    if( isNew
        || ( changeInfo.deltaLeft || changeInfo.deltaRight )
           && changeInfo.deltaLeft != changeInfo.deltaRight
      )
        blockNode.style.width = dims.w+'px';

    if( isNew ) {
        if( dims.leftEdge )
            domClass.add( blockNode, 'projectionLeftBorder' );
        if( dims.rightEdge )
            domClass.add( blockNode, 'projectionRightBorder' );
    } else if(( edgeChanges = changeInfo.edges )) {
        if( 'leftEdge' in edgeChanges )
            domClass[ edgeChanges.leftEdge ? 'add' : 'remove' ]( 'projectionLeftBorder' );
        if( 'rightEdge' in edgeChanges )
            domClass[ edgeChanges.rightEdge ? 'add' : 'remove' ]( 'projectionRightBorder' );
    }
},

blockChange: function( blockNode, changeInfo, block ) {
    if( changeInfo.operation == 'destroy' ) {
        domConstruct.destroy( blockNode );
    }
    else {
        this._positionBlockNode( block, blockNode, changeInfo );
        if( changeInfo.operation != 'move' ) {
            return this.fillBlock( block, blockNode );
        }
    }
    return undefined;
},

// override this in a subclass
fillBlock: function( renderingBlock, blockNode ) {
}

});
});