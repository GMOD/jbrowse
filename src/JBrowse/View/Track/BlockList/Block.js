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

           'JBrowse/Util',
           'JBrowse/Util/ListenerSet'
       ],
       function(
           declare,
           lang,
           array,

           Destroyable,
           Util,
           ListenerSet
       ) {
var serialNumber = 0;

return declare( Destroyable, {

    constructor: function( args ) {
        Util.privateMixin( this, args );

        if( ! this._idealSize )
            this._idealSize = 400;

        this._changeListeners = new ListenerSet();
        this._serialNumber = ++serialNumber;
        this.updatePosition( args.left, args.right );

        if( ! this._projectionBlock )
            throw new Error('projectionBlock required');
        if( ! this._blockList )
            throw new Error('blockList required');

        this._log( 'new', args.onProjectionBlockLeftEdge ? '|' : '-', args.onProjectionBlockRightEdge ? '|' : '-' );
    },

    getProjectionBlock: function() {
        return this._projectionBlock;
    },

    getDimensions: function() {
        return {
            l: this._left,
            r: this._right,
            w: this._right-this._left,
            leftEdge:  this._onProjectionBlockLeftEdge,
            rightEdge: this._onProjectionBlockRightEdge
        };
    },
    getDims: function() {
        return this.getDimensions();
    },

    getWidth: function() {
        return this._right - this._left;
    },

    next: function() {
        return this._llNext;
    },
    prev: function() {
        return this._llPrev;
    },

    _log: function() {
        return;
        console.log.apply(
            console,
            [ this._serialNumber+' '+arguments[0]]
                .concat(Array.prototype.slice.call( arguments, 1 ))
        );
    },

    update: function( changeDescription ) {

        var projectionRangePx = this._projectionBlock.getValidRangeA();
        var prev = this.prev();

        var l = this._onProjectionBlockLeftEdge ? projectionRangePx.l :
                                           prev ? prev._right          :
                      changeDescription.aUpdate ? changeDescription.aUpdate.projectPoint( this._left ) :
                                                  this._left;

        var r = this._onProjectionBlockRightEdge ? projectionRangePx.r :
                       changeDescription.aUpdate ? changeDescription.aUpdate.projectPoint( this._right ) :
                                                   this._right;


        var w = r-l;
        if( w < 0 ) {
            console.warn('block width less than 0');
            r = l+1;
            w = 1;
        }

        // if the new size of this block is much bigger than
        // the ideal size, we need to split it
        if( w > this._idealSize*5 ) {
            var newBlocks = this.splitLeft( this._idealSize, l, r, changeDescription );
            this._blockList.insertBefore( newBlocks, this );
        }
        // if it would be a good idea to merge this block with the previous one, do it
        else if( prev  //< there is a previous block
                 // they are both in the same projection block
                 && !prev._onProjectionBlockRightEdge && !this._onProjectionBlockLeftEdge
                 // at least one of the blocks is pretty small
                 && (prev.getWidth() < this._idealSize/2 || w < this._idealSize/2)
                 // the merged block would not be bigger than 2x ideal size
                 && ( (prev.getWidth() + w) <= this._idealSize*3 )
               ) {
                   prev._log( 'merge', this._serialNumber );
                   prev.mergeRight( this, l, r, changeDescription );
                   this._blockList.remove( this );
                   this.destroy();
        }
        // otherwise just resize it
        else {
            this.updatePosition( l, r, changeDescription );
        }
    },

    updatePosition: function( newLeft, newRight, changeDescription ) {
        this._log( 'update', newLeft, newRight );

        var deltaLeft = newLeft - this._left;
        var deltaRight = newRight - this._right;
        this._left = newLeft;
        this._right = newRight;

        //this._log( 'update '+this.getWidth() );

        this._notifyChanged({
            operation:  deltaLeft != deltaRight ? 'resize' : 'move',
            deltaLeft:  deltaLeft,
            deltaRight: deltaRight,
            projectionChange: changeDescription
         });
    },

    _notifyChanged: function( data ) {
        this._changeListeners.notify( data, this );
    },
    watch: function( callback ) {
        return this._changeListeners.add( callback );
    },

    // split this block into several smaller blocks, modifying the
    // current block in-place to be the last block in the new blocks,
    // and returning an array containing the other blocks.
    splitLeft: function( idealSize, newLeft, newRight, changeDescription ) {
        var w = newRight-newLeft;
        var numBlocks = Math.round(w/idealSize);
        var size = w/numBlocks;

        var deltaLeft = newRight-size-this._left;
        this._left = newRight-size;

        var newBlocks = [];
        for( var l = newLeft; l<this._left; l += size ) {
            newBlocks.push({
                projectionBlock: this._projectionBlock,
                blockList: this._blockList,
                left: l,
                right: Math.min(this._left,l+size)
            });
        }

        var changeInfo = {
            operation: 'splitLeft',
            deltaLeft: deltaLeft,
            deltaRight: 0,
            projectionChange: changeDescription
        };

        if( newBlocks.length ) {
            if( this._onProjectionBlockLeftEdge ) {
                newBlocks[0].onProjectionBlockLeftEdge = this._onProjectionBlockLeftEdge;
                this._onProjectionBlockLeftEdge = false;
                changeInfo.edges = { left: false };
            }
            // instantiate the blocks
            newBlocks = array.map( newBlocks, this._blockList._newBlock );
            changeInfo.newBlocks = newBlocks;
        }

        this._log( 'split', newBlocks, this );

        this._notifyChanged( changeInfo );
        return newBlocks;
    },

    mergeRight: function( rightBlock, rightBlockNewLeftPx, rightBlockNewRightPx, changeDescription ) {
        var changeInfo = {
            operation: 'mergeRight',
            mergeWith: {
                block: rightBlock,
                deltaRight: rightBlockNewRightPx - rightBlock._right,
                deltaLeft: rightBlockNewLeftPx - rightBlock._left
            },
            deltaRight: rightBlockNewRightPx - this._right,
            deltaLeft: 0,
            projectionChange: changeDescription
        };

        this._right = rightBlockNewRightPx;

        if( rightBlock._onProjectionBlockRightEdge ) {
            this._onProjectionBlockRightEdge = true;
            changeInfo.edges = { right: true };
        }

        this._notifyChanged( changeInfo );
    },

    destroy: function() {
        this._log('destroy');
        this._notifyChanged({ operation: 'destroy' });

        delete this._changeCallbacks;
        this.inherited( arguments );
    }

});
});