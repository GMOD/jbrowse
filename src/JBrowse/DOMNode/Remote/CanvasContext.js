

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
    if( ! args ) args = {};
    this.operations = args.operations || [];

    array.forEach(
        [
            'fillText',
            'fillRect',
            'strokeRect',
            'set',
            'get'
        ],
        function( op ) {
            this[op] = function() {
                this._record( op, Array.prototype.slice.apply( arguments ) );
            };
        },
        this
    );
},

deflate: function() {
    return {
        $class: 'JBrowse/DOMNode/Remote/CanvasContext',
        operations: this.operations
    };
},

_record: function( op, args ) {
    this.operations.push( [ op, args ] );
},

replayOnto: function( ctx ) {
    var o = this.operations;
    for( var i=0; i<o.length; i++) {
        if( o[i][0] == 'set' ) {
            ctx[o[i][1][0]] = o[i][1][1];
        } else {
            ctx[o[i][0]].apply( ctx, o[i][1] );
        }
    }
}

});
});