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
return declare( Destroyable, {

    constructor: function( args ) {
        lang.mixin( this, args );
        this.updatePosition( args.left, args.right );
        if( ! this.updateCallback )
            throw new Error('updateCallback required');
    },

    width: function() {
        return this.right - this.left + 1;
    },

    next: function() {
        return this._llNext;
    },
    prev: function() {
        return this._llPrev;
    },

    updatePosition: function( newLeft, newRight, changeDescription ) {
        if( this._destroyed ) return;

        var deltaLeft = newLeft - this.left;
        var deltaRight = newRight - this.right;
        this.left = newLeft;
        this.right = newRight;
        if( this.domNode ) {
            this.domNode.style.left = newLeft+'px';
            this.domNode.style.width = this.width()+'px';
        }

        ( this.updatePositionCallback || this.updateCallback ).call( this, deltaLeft, deltaRight, changeDescription );
    },

    mergeRight: function( rightBlock, rightBlockNewLeftPx, rightBlockNewRightPx, changeDescription ) {
        if( this._destroyed ) {
            rightBlock.updatePosition( rightBlockNewLeftPx, rightBlockNewRightPx, changeDescription );
            return;
        }

        var deltaRight = rightBlockNewRightPx - this.right;
        console.log( 'merge '+this.left+' , '+this.right+'->'+rightBlockNewRightPx );
        this.right = rightBlockNewRightPx;
        this.onProjectionBlockRightEdge = rightBlock.onProjectionBlockRightEdge;

        if( this.domNode ) {
            this.domNode.style.width = this.width()+'px';
        }

        if( this.mergeCallback )
            this.mergeCallback( rightBlock, changeDescription );
        else
            this.updateCallback( 0, deltaRight );

        // update linked list
        if(( this._llNext = rightBlock._llNext )) {
            this._llNext._llPrev = this;
        }
        // destroy the old block
        rightBlock.destroy();

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
        //console.log('destroy');
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