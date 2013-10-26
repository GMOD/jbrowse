/**
 * Rendering block.  Represents the screen area that renders all or
 * part of a single projection block.  Depending on the zoom level,
 * there can be betwee one and many of these for a single projection
 * block.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-construct',

           'dijit/Destroyable',
           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           array,
           domConstruct,

           Destroyable,
           Util
       ) {
var serialNumber = 0;

return declare( Destroyable, {

    constructor: function( args ) {
        lang.mixin( this, args );

        if( ! this.idealSize )
            this.idealSize = 400;

        this.serialNumber = ++serialNumber;
        this.updatePosition( args.left, args.right );

        if( ! this.projectionBlock )
            throw new Error('projectionBlock required');
        if( ! this.blockList )
            throw new Error('blockList required');
        if( ! this.updateCallback )
            throw new Error('updateCallback required');

        var thisB = this;
        this.blockWatch = this.projectionBlock.watch(
            function(c) { thisB._update(c); }
        );

        this._log( 'new', this.width() );
    },

    width: function() {
        return this.right - this.left;
    },

    next: function() {
        return this._llNext;
    },
    prev: function() {
        return this._llPrev;
    },

    _log: function() {
        //return;
        console.log.apply( console, [ this.serialNumber+' '+arguments[0]].concat(Array.prototype.slice.call( arguments, 1 )) );
    },

    _update: function( changeDescription ) {

        var projectionRangePx = this.projectionBlock.getValidRangeA();
        var prev = this.prev(),
            next = this.next();

        var l = this.onProjectionBlockLeftEdge ? projectionRangePx.l :
                                          prev ? prev.right          :
                     changeDescription.aUpdate ? changeDescription.aUpdate.projectPoint( this.left ) :
                                                 this.left;

        var r = this.onProjectionBlockRightEdge ? projectionRangePx.r :

                      changeDescription.aUpdate ? changeDescription.aUpdate.projectPoint( this.right ) :
                                                  this.right;


        var w = r-l;
        if( w < 0 )
            debugger;

        // if the new size of this block is much bigger than
        // the ideal size, we need to split it
        if( w > this.idealSize*5 ) {
            var newBlocks = this.splitLeft( this.idealSize, l, r, changeDescription );
            this.blockList.insertBefore( newBlocks, this );
        }
        // if we know how to merge blocks, and it would be a good idea to merge this block with the previous one, do it
        else if( prev                                  //< there is a previous block
                 //&& ! changeDescription.animating
                 && !prev.onProjectionBlockRightEdge   //< they are both in the same projection block
                 && !this.onProjectionBlockLeftEdge   //< they are both in the same projection block
                 && (prev.width() < this.idealSize/5 || w < this.idealSize/5) //< at least one of the blocks is pretty small
                 && ( prev.width() + w <= this.idealSize*2 )  //< the merged block would not be bigger than 2x ideal size
               ) {
                   prev._log( 'merge', prev.width(), this.width(), w );
                   prev.mergeRight( this, l, r, changeDescription );
                   this.blockList.remove( this );
                   this.destroy();
               } else {
                   // otherwise just resize it
                   this.updatePosition( l, r, changeDescription );
               }
    },

    updatePosition: function( newLeft, newRight, changeDescription ) {
        if( this._destroyed ) return;
        this._log( 'update', newLeft, newRight );

        var deltaLeft = newLeft - this.left;
        var deltaRight = newRight - this.right;
        this.left = newLeft;
        this.right = newRight;
        if( this.domNode ) {
            this.domNode.style.left = this.left+'px';
            this.domNode.style.width = this.width()+'px';
        }
        //this._log( 'update '+this.width() );

        ( this.updatePositionCallback || this.updateCallback ).call( this, deltaLeft, deltaRight, changeDescription );
    },

    // split this block into several smaller blocks, modifying the
    // current block in-place to be the last block in the new blocks,
    // and returning an array containing the other blocks.
    splitLeft: function( idealSize, newLeft, newRight, changeDescription ) {
        var w = newRight-newLeft;
        var numBlocks = Math.round(w/idealSize);
        var size = w/numBlocks;

        var deltaLeft = newRight-size-this.left;
        this.left = newRight-size;
        if( this.domNode ) {
            this.domNode.style.left = this.left+'px';
            this.domNode.style.width = this.width()+'px';
        }

        var newBlocks = [];
        for( var l = newLeft; l<this.left; l += size ) {
            newBlocks.push( { projectionBlock: this.projectionBlock, blockList: this.blockList, left: l, right: Math.min(this.left,l+size) } );
        }
        if( newBlocks[0] ) {
            newBlocks[0].onProjectionBlockLeftEdge = this.onProjectionBlockLeftEdge;
            this.onProjectionBlockLeftEdge = false;
        }
        // instantiate the blocks
        newBlocks = array.map( newBlocks, this.blockList.newBlock );

        this.updateCallback( this, deltaLeft, 0, changeDescription );

        this._log( 'split', newBlocks, this );

        return newBlocks;
    },

    mergeRight: function( rightBlock, rightBlockNewLeftPx, rightBlockNewRightPx, changeDescription ) {
        if( this._destroyed ) {
            rightBlock.updatePosition( rightBlockNewLeftPx, rightBlockNewRightPx, changeDescription );
            return;
        }

        var deltaRight = rightBlockNewRightPx - this.right;
        //console.log( 'merge '+this.left+' , '+this.right+'->'+rightBlockNewRightPx );
        this.right = rightBlockNewRightPx;
        this.onProjectionBlockRightEdge = rightBlock.onProjectionBlockRightEdge;

        if( this.domNode ) {
            this.domNode.style.width = this.width()+'px';
        }

        if( this.mergeCallback )
            this.mergeCallback( rightBlock, changeDescription );
        else
            this.updateCallback( 0, deltaRight );
    },

    destroy: function() {
        this._log('destroy');
        this._llNext = this._llPrev = undefined;

        if( this.domNode ) {
            domConstruct.destroy( this.domNode );
            delete this.domNode;
        }

        this.blockWatch.remove();

        delete this.updatePositionCallback;
        this.inherited( arguments );
    }

});
});