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

        if( /[^\d-]/.test( this.startBase ) )
            throw 'invalid startBase';
        if( /[^\d-]/.test( this.endBase ) )
            throw 'invalid endBase';

    },

    bpToX: function( coord ) {
        return (coord-this.startBase)*this.scale;
    }

});
});