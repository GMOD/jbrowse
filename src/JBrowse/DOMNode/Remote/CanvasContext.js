

define([
           'dojo/_base/declare',
           'dojo/_base/array'
       ],
       function(
           declare,
           array
       ) {
return declare( null, {

constructor: function( args ) {
    this.operations = args.operations || [];

    array.forEach(
        [
            'fillText',
            'fillRect',
            'setAttribute',
            'getAttribute'
        ],
        function( op ) {
            var thisB = this;
            this[op] = function() {
                thisB._record( op, Array.prototype.slice.apply( arguments ) );
            };
        },
        this
    );
},

_record: function( op, args ) {
    this.operations.push( [ op, args ] );
},

replayOnto: function( ctx ) {
    var o = this.operations;
    for( var i=0; i<o.length; i++)
        ctx[o[i][0]].apply( ctx, o[i][1] );
}

});
});