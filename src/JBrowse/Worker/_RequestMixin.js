/**
 * Mixin that lets an object respond to one-off requests from a
 * remote source (like a worker, or the main process).
 */
define([
           'dojo/_base/declare'
           ,'dojo/_base/lang'
           ,'dojo/Deferred'
           ,'dojo/when'

           ,'JBrowse/Util'
           ,'JBrowse/Util/Serialization'
       ],

       function(
           declare
           ,lang
           ,Deferred
           ,when

           ,Util
           ,Serialization
       ) {

return declare( null, {

constructor: function() {
    this._requests = {};
    this._requestCounter = 0;
},

request: function( operation ) {
    var args = Array.prototype.slice.call( arguments, 1 );

    var requestNumber = ++this._requestCounter;
    this.postMessage(
        { requestNumber: requestNumber,
          operation: operation,
          args: Serialization.deflate( args )
        });

    var deferred = new Deferred();
    this._requests[ requestNumber ] = {
        deferred: deferred
    };
    return deferred;
},

_handleRequestMessage: function( data ) {
    // if( ! data )
    //     debugger;
    if( data.result || data.error )
        this._handleResponse( data );
    else if( data.operation )
        this._handleRequest( data );
    else
        console.warn( 'unknown request/response message', event );
},

_handleRequest: function( req ) {
    var thisB = this;
    var requestNumber = req.requestNumber;
    var operation = req.operation;
    return Serialization.inflate( req.args || [], { app: this } )
        .then( function( args ) {
                   var methodName = '_handleRequest_'+operation;
                   if( ! thisB[methodName] )
                       throw new Error('cannot handle request "'+operation+'", there is no '+methodName+' handler method' );
                   return when( thisB[methodName].apply( thisB, args ) )
                       .then( function( result ) {
                                  thisB.postMessage(
                                      { requestNumber: requestNumber,
                                        result: Serialization.deflate( result )
                                      });
                              });
               },
               function(e) {
                   console.error( e.stack || ''+e );
               });
},

_handleResponse: function( data ) {
    var requestRecord = this._requests[ data.requestNumber ];
    if( ! requestRecord )
        throw new Error( "received response for unrecorded request "+data.requestNumber+": "+data );

    delete this._requests[ data.requestNumber ];
    if( data.error ) {
        requestRecord.deferred.reject( data.error );
    }
    else if( data.result ) {
        Serialization.inflate( data.result )
            .then( requestRecord.deferred.resolve, requestRecord.deferred.reject );
    }
},

_handleRequest_apply: function( object, method, arguments ) {
    object = object || this;
    return object[method].apply( object, arguments );
},
_handleRequest_instantiate: function( className, args ) {
    return Util.instantiate( className, args );
}


});
});