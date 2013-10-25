/**
 * Rendering block.  Represents the screen area that renders all or
 * part of a single projection block.  Depending on the zoom level,
 * there can be betwee one and many of these for a single projection
 * block.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/dom-construct',

           'dijit/Destroyable',
           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           domConstruct,

           Destroyable,
           Util
       ) {
var serialNumber = 0;

return declare( Destroyable, {

    constructor: function( args ) {
        lang.mixin( this, args );
        this.serialNumber = ++serialNumber;
        this.updatePosition( args.left, args.right );
        if( ! this.updateCallback )
            throw new Error('updateCallback required');

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
        console.log.apply( console, [ this.serialNumber+' '+arguments[0]].concat(Array.prototype.slice.call( arguments, 1 )) );
    },

    updatePosition: function( newLeft, newRight, changeDescription ) {
        if( this._destroyed ) return;

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
    splitLeft: function( newCallback, idealSize, newLeft, newRight, changeDescription ) {
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
            newBlocks.push( { projectionBlock: this.projectionBlock, left: l, right: Math.min(this.left,l+size) } );
        }
        if( newBlocks[0] ) {
            newBlocks[0].onProjectionBlockLeftEdge = this.onProjectionBlockLeftEdge;
            this.onProjectionBlockLeftEdge = false;
        }
        // instantiate the blocks
        newBlocks = array.map( newBlocks, newCallback );

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

        // var rightNodeChildren = rightBlock.domNode && rightBlock.domNode.childNodes;
        // if( rightNodeChildren ) {
        //     for( var i = 0; i < rightNodeChildren.length; i++ ) {
        //         var child = rightNodeChildren[i];
        //         var cl = (child.style.left || '').match( /^(\d+)px$/ );
        //         if( cl && cl[1] ) {
        //             child.style.left = parseFloat( cl[1] )+this.width()+'px';
        //         }
        //     }
        // }
    },

    destroy: function() {
        this._log('destroy');
        this._llNext = this._llPrev = undefined;

        if( this.domNode ) {
            domConstruct.destroy( this.domNode );
            delete this.domNode;
        }

        delete this.updatePositionCallback;
        this.inherited( arguments );
    }

});
});