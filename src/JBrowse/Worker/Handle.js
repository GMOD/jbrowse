/**
 * Wrapper object for a Worker.  Lives in the main process.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',

           'JBrowse/Util/Serialization',
           './Job'
       ],
       function(
           declare,
           lang,
           Deferred,

           Serialization,
           Job
       ) {

var requestCounter = 0;
var jobCounter = 0;

return declare( null, {
  constructor: function( args ) {
      this._worker = args.worker;
      this._worker.onmessage = lang.hitch( this, '_handleMessage' );
      this._worker.onerror   = lang.hitch( this, '_handleError' );
      this._requests = {};
  },

  _handleError: function( errorEvent ) {
      console.error( errorEvent );
  },

  _handleMessage: function( event ) {
      var data = event.data;
      var requestRecord;
      if( data && data.requestNumber && (requestRecord = this._requests[ data.requestNumber ] )) {
          delete this._requests[ data.requestNumber ];
          if( data.error ) {
              requestRecord.deferred.reject( data.error );
          }
          else if( data.result ) {
              Serialization.inflate( data.result )
                  .then( requestRecord.deferred.resolve, requestRecord.deferred.reject );
          }
      }
      else {
          console.warn( "unknown message from worker", event );
      }
  },

  getWorker: function() {
      return this._worker;
  },

  request: function( operation, args ) {
      var requestNumber = ++requestCounter;

      this._worker.postMessage( Serialization.deflate(
          { requestNumber: requestNumber,
            operation: operation,
            args: args
          }));

      var deferred = new Deferred();
      this._requests[ requestNumber ] = {
          deferred: deferred
      };
      return deferred;
  },

  postMessage: function( message ) {
      return this._worker.postMessage( Serialization.deflate( message ) );
  },

  remoteApply: function( obj, methodName, args ) {
      if( typeof methodName != 'string' )
          throw new Error('must pass a string method name');

      return this.request( 'apply', arguments );
  },

  newJob: function( localHandler, className, args ) {
      var jobNumber = ++jobCounter;
      var thisB = this;
      return this.request( 'newJob', [ jobNumber, className, args ] )
          .then( function(){
                     return new Job(
                         { handlerObject: localHandler,
                           worker: thisB,
                           jobNumber: jobNumber
                         });
                 });
  }

});
});
