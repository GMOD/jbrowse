/**
 * Main object for managing jobs inside a Worker.  Lives in a worker process.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'dojo/when',

           'JBrowse/Util/Serialization'
       ],
       function(
           declare,
           lang,
           Deferred,
           when,

           Serialization
       ) {

return declare( null, {
constructor: function(args) {
    this._self = args.self;
    this._self.postMessage('ready');

    this._self.onmessage = lang.hitch( this, '_handleMessage' );
},

_handleMessage: function( event ) {
    var data = event.data;
    if( data && data.requestNumber && data.operation && this[data.operation] ) {
        var thisB = this;
        Serialization.inflate( data.args || [] )
            .then( function( args ) {
                       return when( thisB[data.operation].apply( thisB, args ) )
                           .then( function( result ) {
                               thisB._self.postMessage(
                                   { requestNumber: data.requestNumber,
                                     result: Serialization.deflate( result )
                                   });
                             });
                   },
                   function(e) {
                       console.error( e.stack || ''+e, e );
                   });
    }
    else {
        console.warn( "unknown request received by worker", event );
    }
},

apply: function( object, method, arguments ) {
    return object[method].apply( object, arguments );
}

});
});