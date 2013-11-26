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
       ],
       function(
           declare
           ,lang

           ,Destroyable

           ,has
           ,Util
           ,Serialization
       ) {
return declare( Destroyable, {

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
      this._worker.postMessage({ jobNumber: this._jobNumber, message: message });
  },

  handleMessage: function( message ) {
      if( message.operation == 'apply' ) {
          var thisB = this;
          return Serialization.inflate( message.args || [], { app: this._worker } )
                     .then( function( args ) {
                                return thisB._handlerObject[message.methodName].apply( thisB._handlerObject, args );
                            });
      }
      return undefined;
  },

  setHandlerObject: function( obj ) {
      this._handlerObject = obj;
  },

  remoteApply: function( methodName, args ) {
      return this._worker.postMessage(
          { jobNumber: this._jobNumber,
            operation: 'apply',
            methodName: methodName,
            args: args
          });
  },

  destroy: function() {
      this._worker.finishJob( this._jobNumber );
      delete this._handlerObject;
      this.inherited(arguments);
  }

});
});