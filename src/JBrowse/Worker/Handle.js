/**
 * Wrapper object for a Worker.  Lives in the main process.
 */
define([
           'dojo/_base/declare'
           ,'dojo/_base/lang'
           ,'dojo/Deferred'

           ,'./_RequestMixin'
           ,'JBrowse/Util'
           ,'JBrowse/Util/Serialization'
           ,'./Job'
       ],
       function(
           declare
           ,lang
           ,Deferred

           ,_RequestMixin
           ,Util
           ,Serialization
           ,Job
       ) {

var jobCounter = 0;

return declare( [_RequestMixin], {
  constructor: function( args ) {
      Util.validate( args, { authManager: 'object' } );
      this._authManager = args.authManager;
      this._worker = args.worker;
      var thisB = this;
      this._worker.onmessage = function() {
          return thisB._handleMessage.apply( thisB, arguments );
      };
      this._worker.onerror   = lang.hitch( this, '_handleError' );
      this._requests = {};
  },

  _handleError: function( errorEvent ) {
      console.error( errorEvent );
  },

  _handleMessage: function( event ) {
      var data = event.data;
      if( data && data.requestNumber ) {
          this._handleRequestMessage( data );
      }
      else {
          console.warn( "unknown message from worker", event );
      }
  },

  getWorker: function() {
      return this._worker;
  },

  postMessage: function( message ) {
      //console.log( 'main says', message );
      return this._worker.postMessage( message );
  },

  newJob: function( localHandler, className, args ) {
      var jobNumber = ++jobCounter;
      var thisB = this;
      return this.request( 'newJob', jobNumber, className, args )
          .then( function(){
                     return new Job(
                         { handlerObject: localHandler,
                           worker: thisB,
                           jobNumber: jobNumber
                         });
                 });
  },

  _handleRequest_getCredentialsForRequest: function( request ) {
      return this._authManager.getCredentialsForRequest( request );
  }

});
});
