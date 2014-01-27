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

           'JBrowse/has',
           'JBrowse/Util',
           'JBrowse/Util/Serialization',
           'JBrowse/Util/ListenerSet'
       ],
       function(
           declare,
           lang,
           array,

           Destroyable,

           has,
           Util,
           Serialization,
           ListenerSet
       ) {
var serialNumber = 0;

return declare( Destroyable, {

    constructor: function( args ) {
        Util.privateMixin( this, args );

        if( ! this._idealSize )
            this._idealSize = 400;

        this._changeListeners = new ListenerSet();
        this._id = args.id || ++serialNumber;
        this.updatePosition( args.left, args.right );

        if( ! this._projectionBlock )
            throw new Error('projectionBlock required');
        if( ! this._blockList )
            throw new Error('blockList required');

        this._log( 'new '+[ this._left, this._right, '('+(this._right-this._left)+')', args.onProjectionBlockLeftEdge ? '|' : '-', args.onProjectionBlockRightEdge ? '|' : '-' ].join(' ') );
    },

    deflate: function() {
        return {
            $class: 'JBrowse/View/Track/BlockList/Block',
            projectionBlock: this._projectionBlock.deflate(),
            blockList: 'FAKE',
            id: this._id,
            left: this._left,
            right: this._right,
            onProjectionBlockLeftEdge:  this._onProjectionBlockLeftEdge,
            onProjectionBlockRightEdge: this._onProjectionBlockRightEdge
        };
    },

    getProjectionBlock: function() {
        return this._projectionBlock;
    },

    // return the distance, in pixels, from the left side of this block to the given basepair
    bpToPx: function( bp ) {
        return this._projectionBlock.reverseProjectPoint( bp ) - this._left;
    },
    // convert pixels relative to the document to bp coordinates
    docPxToBp: function( px ) {
        return this._projectionBlock.projectPoint( px );
    },
    // convert pixels relative to the block to bp coordinates
    blockPxToBp: function( px ) {
        return this._projectionBlock.projectPoint( px + this._left );
    },
    containsBasePosition: function( refName, bp ) {
        if( this._projectionBlock.getBName() != refName )
            return false;

        var lbp = this._projectionBlock.projectPoint( this._left );
        var rbp = this._projectionBlock.projectPoint( this._right );
        return !( bp > rbp || bp < lbp );
    },
    containsDocPx: function( px ) {
        return !( this._right < px || this._left > px );
    },



    getBaseSpan: function() {
        var dims = this.getDimensions();
        var span = {
            l: this._projectionBlock.projectPoint( dims.l ),
            r: this._projectionBlock.projectPoint( dims.r ),
            refName: this._projectionBlock.getBName()
        };
        span.w = Math.abs( span.r - span.l );
        return span;
    },

    id: function() {
        return this._id;
    },

    getDimensions: function() {
        return {
            l: this._left,
            r: this._right,
            w: this._right - this._left,
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
            [ 'block '+this._id+' '+arguments[0]]
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
                   prev._log( 'merge', this._id );
                   prev.mergeRight( this, l, r, changeDescription );
                   this._blockList.remove( this );
                   this.destroy( changeDescription );
        }
        // otherwise just resize it
        else {
            this.updatePosition( l, r, changeDescription );
        }
    },

    updatePosition: function( newLeft, newRight, changeDescription ) {
        var deltaLeft = newLeft - this._left;
        var deltaRight = newRight - this._right;
        this._left = newLeft;
        this._right = newRight;

        var op = Math.abs(deltaLeft - deltaRight) > 0.1 ? 'resize' : 'move';
        this._log( ['update', op, newLeft,newRight,'('+(newRight-newLeft)+')'].join(' ') );

        //this._log( 'update '+this.getWidth() );

        this._notifyChanged({
            operation: op,
            deltaLeft:  deltaLeft,
            deltaRight: deltaRight,
            projectionChange: changeDescription
         });
    },

    _notifyChanged: function( data ) {
        if( data.projectionChange )
            data.animating = data.projectionChange.animating;

        // var w = this._right - this._left;
        // try {
        //     console.log( 'block '+this._id+' '+w+' '+JSON.stringify(data) );
        // } catch(e) {
        //     var c = lang.mixin( {}, data );
        //     delete c.mergeWith;
        //     console.log( 'block '+this._id+' '+w+' '+JSON.stringify(c) );
        // }
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
            newBlocks = array.map(
                newBlocks,
                function( args ) {
                    return this._blockList._newBlock( args, changeDescription );
                }, this);
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

        // also update the left and right of the right block in case
        // listening code needs it
        rightBlock._right = rightBlockNewRightPx;
        rightBlock._left = rightBlockNewLeftPx;

        if( rightBlock._onProjectionBlockRightEdge ) {
            this._onProjectionBlockRightEdge = true;
            changeInfo.edges = { right: true };
        }

        this._notifyChanged( changeInfo );
    },

    destroy: function( projectionChange ) {
        this._log('destroy');
        this._notifyChanged({ operation: 'destroy', projectionChange: projectionChange });

        delete this._changeCallbacks;
        this.inherited( arguments );
    }

});
});