/**
 * Wrapper object for a Worker.  Lives in the main process.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',

           'JBrowse/Util/Serialization'
       ],
       function(
           declare,
           lang,
           Deferred,

           Serialization
       ) {

var serialNumber = 0;

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

  apply: function( obj, methodName, args ) {
      if( typeof methodName != 'string' )
          throw new Error('must pass a string method name');

      var requestNumber = ++serialNumber;

      this._worker.postMessage( Serialization.deflate(
          { requestNumber: requestNumber,
            operation: 'apply',
            args: [ obj, methodName, args ]
          }));
      var deferred = new Deferred();
      this._requests[ requestNumber ] = {
          deferred: deferred
      };
      return deferred;
  }
});
});
