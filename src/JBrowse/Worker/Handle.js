define([
           'dojo/_base/declare',
           'dojo/_base/lang'
       ],
       function(
           declare,
           lang

       ) {
return declare( null, {
  constructor: function( args ) {
      this._worker = args.worker;
      this._worker.onmessage = lang.hitch( this, '_handleMessage' );
  },

  _handleMessage: function( event ) {
      console.log( 'worker said', event.data, event );
  },

  getWorker: function() {
      return this._worker;
  }

});
});
