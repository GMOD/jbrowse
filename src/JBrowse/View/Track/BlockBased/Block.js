define([
           'dojo/_base/declare',
           'dijit/Destroyable'
       ],
       function(
           declare,
           Destroyable
       ) {
return declare( Destroyable, {

    constructor: function( args ) {
        dojo.mixin( this, args );
        var nodeArgs = this.node || {};
        delete this.node;
        this.domNode = dojo.create( 'div', nodeArgs );
    },

    bpToX: function( coord ) {
        return (coord-this.startBase)*this.scale;
    }

});
});