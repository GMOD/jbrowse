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
    },

    next: function() {
        return this._llNext;
    },
    prev: function() {
        return this._llPrev;
    },

    updatePosition: function( newLeft, newRight, changeDescription ) {
        var deltaLeft = newLeft - this.left;
        var deltaRight = newRight - this.right;
        this.left = newLeft;
        this.right = newRight;
        if( this.domNode ) {
            this.domNode.style.left = newLeft+'px';
            this.domNode.style.width = (newRight-newLeft+1)+'px';
        }
        if( this.updatePositionCallback ) {
            this.updatePositionCallback( deltaLeft, deltaRight, changeDescription );
        }
        return this.left;
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