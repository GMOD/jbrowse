define([
           'dojo/_base/declare',
           'dijit/Destroyable',
           'JBrowse/Util'
       ],
       function(
           declare,
           Destroyable,
           Util
       ) {
return declare( Destroyable, {

    constructor: function( args ) {
        dojo.mixin( this, args );
        var nodeArgs = this.node || {};
        delete this.node;
        this.domNode = dojo.create( 'div', nodeArgs );
        this.domNode.block = this;
    },

    bpToX: function( coord ) {
        return (coord-this.startBase)*this.scale;
    },

    toString: function() {
        return this.startBase+'..'+this.endBase;
    },

    destroy: function() {
        if( this.domNode )
            Util.removeAttribute( this.domNode, 'block' );
        this.inherited( arguments );
    }
});
});