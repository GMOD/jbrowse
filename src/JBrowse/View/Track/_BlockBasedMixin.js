define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/dom-construct',
           'dojo/dom-class'

       ], function(
           declare,
           array,
           domConstruct,
           domClass
       ) {

return declare( null, {

constructor: function(args) {
    if( !( 'genomeView' in args ) )
        throw new Error( 'genomeView argument required' );
},

// when a the genomeview attr is set on this object, make blocks for
// existing blocks, and watch its rendering blocks for changes
_setGenomeViewAttr: function( genomeView ) {
    if( this._blockWatch ) {
        this._blockWatch.remove();
        this.destroyAllBlocks();
    }

    var thisB = this;
    // watch for new projection blocks
    this.own(
        this._blockWatch = genomeView.watchRenderingBlocks(
            function( changeInfo, block ) {
                if( changeInfo.operation == 'new' )
                    thisB.newBlock( block, changeInfo );
            }
        )
    );
},

startup: function() {
    this.inherited(arguments);

    var thisB = this;
    var genomeView, blockList;
    // if this is a dijit widget, at startup, make new blocks for any existing rendering blocks
    if( (genomeView = this.get('genomeView')) && ( blockList = genomeView.get('blockList') ) ) {
        blockList.forEach( function( renderingBlock ) {
            thisB.newBlock( renderingBlock, { operation: 'new' } );
        });
    }
},

// for compatibility with dojo/Stateful
_genomeViewSetter: function( genomeview ) {
    this.genomeView = genomeview;
    return this._setGenomeViewAttr.apply( this, arguments );
},



destroyAllBlocks: function() {
    array.forEach( this.domNode.children, function(n) {
                       if( this.isBlockNode( n ) )
                           this.domNode.removeChild( n );
                   },this);
},

isBlockNode: function( node ) {
    return node.tagName == 'DIV' && /\brenderingBlock\b/.test( node.className );
},

newBlock: function( renderingBlock, changeInfo ) {
    var thisB = this,
    blockNode = this.createBlockNode( renderingBlock ),
    blockChangeWatch = renderingBlock.watch(
        function( changeInfo, block ) {
            if( changeInfo.operation == 'destroy' )
               blockChangeWatch.remove();

            thisB.blockChange( blockNode, changeInfo, block );
        });

    this.blockChange( blockNode, changeInfo, renderingBlock );
},

createBlockNode: function( renderingBlock ) {
    var d = document.createElement('div');
    d.className = 'renderingBlock';
    this.domNode.appendChild(d);
    return d;
},

_positionBlockNode: function( block, blockNode, changeInfo ) {
    var dims = block.getDimensions();
    var isNew = changeInfo.operation == 'new';
    var edgeChanges;

    // update the basic dimensions and css classes of the block
    if( isNew || changeInfo.deltaLeft )
        blockNode.style.left = Math.round(dims.l)+'px';
    if( isNew
        || ( changeInfo.deltaLeft || changeInfo.deltaRight )
           && changeInfo.deltaLeft != changeInfo.deltaRight
      )
        blockNode.style.width = Math.ceil( dims.w )+'px';

    if( isNew ) {
        if( dims.leftEdge )
            domClass.add( blockNode, 'projectionLeftBorder' );
        if( dims.rightEdge )
            domClass.add( blockNode, 'projectionRightBorder' );
    } else if(( edgeChanges = changeInfo.edges )) {
        if( 'left' in edgeChanges )
            domClass[ edgeChanges.left ? 'add' : 'remove' ]( blockNode, 'projectionLeftBorder' );
        if( 'right' in edgeChanges )
            domClass[ edgeChanges.right ? 'add' : 'remove' ]( blockNode, 'projectionRightBorder' );
    }
},

blockChange: function( blockNode, changeInfo, block ) {
    if( changeInfo.operation == 'destroy' ) {
        domConstruct.destroy( blockNode );
    }
    else {
        this._positionBlockNode( block, blockNode, changeInfo );
        if( changeInfo.operation != 'move' ) {
            return this[ changeInfo.animating && changeInfo.operation != 'new' ? 'animateBlock' : 'fillBlock' ]( block, blockNode, changeInfo );
        }
    }
    return undefined;
},

animateBlock: function() {
    return this.fillBlock.apply( this, arguments );
},

// override this in a subclass
fillBlock: function( renderingBlock, blockNode ) {
}

});
});