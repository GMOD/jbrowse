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

var requestCounter = 0;
var outstandingRequests = {};

return declare( null, {

constructor: function() {
},

request: function( operation ) {
    var args = Array.prototype.slice.call( arguments, 1 );

    var requestNumber = ++requestCounter;
    this.postMessage(
        { requestNumber: requestNumber,
          operation: operation,
          args: Serialization.deflate( args )
        });

    var deferred = new Deferred();
    outstandingRequests[ requestNumber ] = {
        deferred: deferred
    };
    return deferred;
},

_handleRequestMessage: function( data ) {
    // if( ! data )
    //     debugger;
    if( data.result || data.error )
        return this._handleResponse( data );
    else if( data.operation )
        return this._handleRequest( data );
    else
        console.warn( 'unknown request/response message', event );
    return undefined;
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
                   return when( thisB[methodName].apply( thisB, args ) );
               })
        .then( function( result ) {
                   return thisB.postMessage(
                       { requestNumber: requestNumber,
                         result: Serialization.deflate( result )
                       });
               });

},

_handleResponse: function( data ) {
    var requestRecord = outstandingRequests[ data.requestNumber ];
    if( ! requestRecord )
        throw new Error( "received response for unrecorded request "+data.requestNumber+": "+data );

    delete outstandingRequests[ data.requestNumber ];
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