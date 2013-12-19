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
var sentRequests     = {};
var receivedRequests = {};

return declare( null, {

constructor: function() {
},

request: function( desc ) {
    var thisB = this;
    if( typeof desc != 'object' )
        desc = { operation: desc };
    var args = Array.prototype.slice.call( arguments, 1 );

    var requestNumber = ++requestCounter;
    this.postMessage(
        { requestNumber: requestNumber,
          operation: desc.operation,
          cancelOK: ( 'cancelOK' in desc ) ? desc.cancelOK : true,
          args: Serialization.deflate( desc.args || args )
        });

    var deferred = new Deferred( function( reason ) {
        //console.log( 'owner canceling request '+requestNumber );
        thisB.postMessage({ requestNumber: requestNumber,
                            operation: 'cancel',
                            reason: Serialization.deflate( reason )
                          });
    });
    sentRequests[ requestNumber ] = {
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
    if( req.operation == 'cancel' ) {
        if( receivedRequests[requestNumber] ) {
            //console.log( 'worker asked to cancel request '+requestNumber, receivedRequests[requestNumber] );
            Serialization.inflate( req.reason )
                .then( function( reason ) {
                           reason.requestNumber = requestNumber;
                           receivedRequests[requestNumber].deferred.cancel( reason );
                           delete receivedRequests[requestNumber];
                      });
        }
    }
    else {
        return Serialization.inflate( req.args || [], { app: this } )
            .then( function( args ) {
                       var methodName = '_handleRequest_'+operation;
                       if( ! thisB[methodName] )
                           throw new Error('cannot handle request "'+operation+'", there is no '+methodName+' handler method' );
                       var deferred = when( thisB[methodName].apply( thisB, args ) );
                       if( req.cancelOK )
                           deferred = deferred.then( null, Util.cancelOK );
                       receivedRequests[ requestNumber ] = {
                           deferred: deferred,
                           req: req
                       };
                       return deferred;
                   }
                 )
            .then( function( result ) {
                       delete receivedRequests[requestNumber];
                       return thisB.postMessage(
                           { requestNumber: requestNumber,
                             result: Serialization.deflate( result )
                           });
                   },
                   function( error ) {
                       delete receivedRequests[requestNumber];
                       throw error;
                   }
                 );
    }
},

_handleResponse: function( data ) {
    var requestRecord = sentRequests[ data.requestNumber ];
    if( ! requestRecord )
        throw new Error( "received response for unrecorded request "+data.requestNumber+": "+data );

    delete sentRequests[ data.requestNumber ];
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