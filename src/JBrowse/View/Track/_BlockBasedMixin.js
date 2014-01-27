define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/dom-construct',
           'dojo/dom-class',

           'JBrowse/Errors'
       ], function(
           declare,
           array,
           domConstruct,
           domClass,

           Errors
       ) {

return declare( null, {

constructor: function(args) {
    if( !( 'genomeView' in args ) )
        throw new Error( 'genomeView argument required' );

    this.blockStash = {};
},

// when a the genomeview attr is set on this object, make blocks for
// existing blocks, and watch its rendering blocks for changes
_setGenomeViewAttr: function( genomeView ) {
    this.inherited(arguments);

    if( this._blockWatch ) {
        this._blockWatch.remove();
        this.destroyAllBlocks();
    }

    var thisB = this;
    // watch for new rendering blocks
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
    array.forEach( Array.prototype.slice.call(this.domNode.children), function(n) {
                       if( this.isBlockNode( n ) )
                           this.domNode.removeChild( n );
                   },this);
},

isBlockNode: function( node ) {
    if( ! node )
        debugger;
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
    this.own( blockChangeWatch );

    this.blockChange( blockNode, changeInfo, renderingBlock );
},

createBlockNode: function( renderingBlock ) {
    var d = document.createElement('div');
    d.className = 'renderingBlock';
    d.setAttribute( 'data-rendering-block-id', renderingBlock.id() );
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
        // keep a this.blockStash object that remembers the dom nodes and
        // blocklist blocks by their ID, and cleans them all up
        // properly.  subclasses can stash whatever they want in here.
        if( changeInfo.operation == 'new' ) {
            this.blockStash[ block.id() ] = {
                node: blockNode,
                block: block,
                projectionBlock: block.getProjectionBlock()
            };
        }

        // if we are not just moving the block, we need to cnacel any
        // in-progress block fill.
        if( changeInfo.operation != 'move' ) {
            var inprogress;
            if(( inprogress = this.blockStash[block.id()] && this.blockStash[ block.id() ].fillInProgress ) && ! inprogress.isCanceled() )
                inprogress.cancel( new Errors.Cancel( changeInfo.operation == 'destroy' ? 'block destroyed' : 'block changed' ) );
        }

        if( changeInfo.operation == 'destroy' ) {
            blockNode.parentNode.removeChild( blockNode );
        }
        else {
            this._positionBlockNode( block, blockNode, changeInfo );
            this[ changeInfo.animating || changeInfo.operation == 'move' ? 'animateBlock' : 'fillBlock' ]( block, blockNode, changeInfo );
        }

        // if not animating, also fill any blocks that are marked in
        // the stash as needing to be filled later
        if( ! changeInfo.animating ) {
            if( changeInfo.operation != 'destroy' && changeInfo.operation != 'move' ) {
                // in this case, the block will have already been filled, so don't fill later
                delete this.blockStash[ block.id() ].fillLater;
            }

            for( var id in this.blockStash ) {
                var b = this.blockStash[id];
                if( b.fillLater && block.id() != id ) {
                    this.fillBlock( b.block, b.node, b.fillLater );
                    delete b.fillLater;
                }
            }
        }

        if( changeInfo.operation == 'destroy' ) {
            delete this.blockStash[ block.id() ];
        }
},

getBlockStash: function( block ) {
    return block ? this.blockStash[ block.id() ] : this.blockStash;
},

animateBlock: function() {
    return this.fillBlock.apply( this, arguments );
},

// override this in a subclass
fillBlock: function( renderingBlock, blockNode ) {
}

});
});