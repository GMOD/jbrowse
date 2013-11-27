/**
 * Persistent connection between two objects, one in a worker and one
 * in the main process.  There is a Job object in each process, with
 * the same job number.
 */
define([
           'dojo/_base/declare'
           ,'dojo/_base/lang'

           ,'dijit/Destroyable'

           ,'JBrowse/has'
           ,'JBrowse/Util'
           ,'JBrowse/Util/Serialization'
           ,'./_RequestMixin'
       ],
       function(
           declare
           ,lang

           ,Destroyable

           ,has
           ,Util
           ,Serialization
           ,_RequestMixin
       ) {
return declare( [_RequestMixin, Destroyable], {

  constructor: function( args ) {
      Util.validate(
          args, {
              worker:    'object',
              jobNumber: 'number'
          });

      this._worker = args.worker;
      this._jobNumber = args.jobNumber;
      this._handlerObject = args.handlerObject;
  },

  postMessage: function( message ) {
      return this._worker.postMessage( lang.mixin( { jobNumber: this._jobNumber }, message ) );
  },

  handleMessage: function( message ) {
      if( message.requestNumber )
          return this._handleRequestMessage( message );

      console.warn( "unknown message received by job "+this._jobNumber, message );
      return undefined;
  },

  setHandlerObject: function( obj ) {
      this._handlerObject = obj;
  },

  remoteApply: function( methodName, args ) {
      return this.request( 'apply', methodName, args );
  },

  _handleRequest_apply: function( methodName, args ) {
      return this._handlerObject[ methodName ].apply( this._handlerObject, args );
  },

  destroy: function() {
      this._worker.finishJob( this._jobNumber );
      delete this._handlerObject;
      this.inherited(arguments);
  }

});
});