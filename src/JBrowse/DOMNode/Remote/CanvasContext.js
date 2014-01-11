

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
    this.operations = [];
    this.replayCode = args.replayCode;
    this.settings = {};

    array.forEach(
        [
            'fillText',
            'fillRect',
            'strokeRect',
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

set: function( name, val ) {
    if( this.settings[name] === val )
        return;
    this.settings[name] = val;
    this._record( 'set', Array.prototype.slice.apply( arguments ) );
},


deflate: function() {
    return {
        $class: 'JBrowse/DOMNode/Remote/CanvasContext',
        replayCode: this._buildReplayCode()
    };
},

_buildReplayCode: function() {
    return this.operations.join(";\n");
},

_record: function( op, args ) {
    if( op == 'set' )
        this.operations.push( 'c.'+args.shift()+'='+JSON.stringify(Array.prototype.slice.call(args)).replace(/^\[|\]$/g,'') );
    else {
        var argStr = typeof args == 'string' ? args : JSON.stringify(Array.prototype.slice.call(args)).replace(/^\[|\]$/g,'');
        this.operations.push( 'c.'+op+'('+argStr+')' );
    }
},

replayOnto: function( c ) {
    if( this.replayCode )
        eval( this.replayCode );
}

});
});