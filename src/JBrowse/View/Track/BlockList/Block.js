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

           'dijit/Destroyable',
           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           array,

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
        if( ! this.callbacks || ! this.callbacks['default'] )
            throw new Error('default update callback required');

        this._log( 'new', args.onProjectionBlockLeftEdge ? '|' : '-', args.onProjectionBlockRightEdge ? '|' : '-' );
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
        return;
        console.log.apply( console, [ this.serialNumber+' '+arguments[0]].concat(Array.prototype.slice.call( arguments, 1 )) );
    },

    update: function( changeDescription ) {

        var projectionRangePx = this.projectionBlock.getValidRangeA();
        var prev = this.prev();

        var l = this.onProjectionBlockLeftEdge ? projectionRangePx.l :
                                          prev ? prev.right          :
                     changeDescription.aUpdate ? changeDescription.aUpdate.projectPoint( this.left ) :
                                                 this.left;

        var r = this.onProjectionBlockRightEdge ? projectionRangePx.r :
                      changeDescription.aUpdate ? changeDescription.aUpdate.projectPoint( this.right ) :
                                                  this.right;


        var w = r-l;
        if( w < 0 ) {
            console.warn('block width less than 0');
            r = l+1;
            w = 1;
        }

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
                 && (prev.width() < this.idealSize/2 || w < this.idealSize/2) //< at least one of the blocks is pretty small
                 && ( prev.width() + w <= this.idealSize*3 )  //< the merged block would not be bigger than 2x ideal size
               ) {
                   prev._log( 'merge', this.serialNumber );
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
        //this._log( 'update', newLeft, newRight );

        var deltaLeft = newLeft - this.left;
        var deltaRight = newRight - this.right;
        this.left = newLeft;
        this.right = newRight;

        //this._log( 'update '+this.width() );

        this._notifyChanged({
            operation: deltaLeft != deltaRight ? 'resize' : 'move',
            deltaLeft: deltaLeft,
            deltaRight: deltaRight,
            projectionChange: changeDescription
         });
    },

    _notifyChanged: function( data ) {
        var callback = this.callbacks[ data.operation ] || this.callbacks['default'];
        callback.call( this, data );
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

        var newBlocks = [];
        for( var l = newLeft; l<this.left; l += size ) {
            newBlocks.push({
                projectionBlock: this.projectionBlock,
                blockList: this.blockList,
                left: l,
                right: Math.min(this.left,l+size)
            });
        }

        var changeInfo = {
            operation: 'split',
            deltaLeft: deltaLeft,
            deltaRight: 0,
            projectionChange: changeDescription
        };

        if( newBlocks.length ) {
            if( this.onProjectionBlockLeftEdge ) {
                newBlocks[0].onProjectionBlockLeftEdge = this.onProjectionBlockLeftEdge;
                this.onProjectionBlockLeftEdge = false;
                changeInfo.edges = { left: false };
            }
            // instantiate the blocks
            newBlocks = array.map( newBlocks, this.blockList.newBlock );
            changeInfo.newBlocks = newBlocks;
        }

        this._log( 'split', newBlocks, this );

        this._notifyChanged( changeInfo );
        return newBlocks;
    },

    mergeRight: function( rightBlock, rightBlockNewLeftPx, rightBlockNewRightPx, changeDescription ) {
        if( this._destroyed ) {
            debugger;
            // rightBlock.updatePosition( rightBlockNewLeftPx, rightBlockNewRightPx, changeDescription );
            // return;
        }

        var changeInfo = {
            operation: 'merge',
            deltaRight: rightBlockNewRightPx - this.right,
            deltaLeft: 0,
            projectionChange: changeDescription
        };

        this.right = rightBlockNewRightPx;

        if( rightBlock.onProjectionBlockRightEdge ) {
            this.onProjectionBlockRightEdge = true;
            changeInfo.edges = { right: true };
        }

        this._notifyChanged( changeInfo );
    },

    destroy: function() {
        this._log('destroy');
        this._notifyChanged({ operation: 'destroy' });

        this._llNext = this._llPrev = undefined;

        delete this.callbacks;
        this.inherited( arguments );
    }

});
});