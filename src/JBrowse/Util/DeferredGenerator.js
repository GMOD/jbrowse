/**
 * Deferred generator object, allows chained asynchronous iteration.
 * Basically a more standard-OO reimplementation of dojo/Deferred,
 * with some emit() logic added on.  Like an iterating version of
 * dojo/Deferred.  Designed to be compatible with dojo/Deferred.
 */

define(
    [
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/has',
        'dojo/Deferred',
        'dojo/errors/CancelError',
        "dojo/has!config-deferredInstrumentation?dojo/promise/instrumentation"
    ],
    function(
        declare,
        lang,
        has,
        Deferred,
        CancelError,
        instrumentation
    ) {


var DeferredGenerator = declare( null, {

  constructor: function( starter, canceler ) {
      this._starter  = starter;
      this._canceler = canceler;
      this._waiting = [];
  },

  EMIT: 0,
  RESOLVED: 1,
  REJECTED: 2,
  PROGRESS: 3,

  METHODNAMES: [ 'emit', 'resolve', 'reject', 'progress' ],
  FULFILLED_ERROR_MESSAGE: "This deferred has already been fulfilled.",

  resolve: function( value, strict ) {
      if( ! this._fulfilled ){
          // Set fulfilled, store value. After signaling waiting listeners, free _waiting
          this._signalWaitingListeners( this._fulfilled = this.RESOLVED, this._result = value, null );
          this._waiting = null;
          return this._promise;
      } else if( strict === true ) {
          throw new Error( this.FULFILLED_ERROR_MESSAGE );
      } else {
          return this._promise;
      }
  },

  reject: function( error, strict ) {
      if( ! this._fulfilled ){
          if( has("config-deferredInstrumentation") && Error.captureStackTrace ){
              Error.captureStackTrace( this._rejection = {}, this.reject );
          }
          this._signalWaitingListeners( this._fulfilled = this.REJECTED, this._result = error, this._rejection );
          this._waiting = null;
          return this._promise;
      } else if(strict === true){
          throw new Error(FULFILLED_ERROR_MESSAGE);
      } else {
          return this._promise;
      }
  },

  progress: function( value ) {
      this._signal( value, this.PROGRESS );
  },

  cancel: function( reason ) {
      if( ! this._fulfilled ){
          // Cancel can be called even after the deferred is fulfilled
          if( this._canceler ){
              var returnedReason = this._canceler( reason );
              reason = typeof returnedReason === "undefined" ? reason : returnedReason;
          }
          this._canceled = true;
          if( ! this._fulfilled ){
              // Allow canceler to provide its own reason, but fall back to a CancelError
              if( typeof reason === "undefined" ){
                  reason = new CancelError();
              }
              this.reject( reason );
              return reason;
          } else if( this._fulfilled === this.REJECTED && this._result === reason ){
              return reason;
          }
      } else if( strict === true ){
          throw new Error( this.FULFILLED_ERROR_MESSAGE);
      }

      return reason;
  },

  isResolved: function() {
      return this._fulfilled == this.RESOLVED;
  },
  isRejected: function() {
      return this._fulfilled == this.REJECTED;
  },
  isFulfilled: function() {
      return !!( this._fulfilled && ! this._canceled );
  },
  isCanceled: function() {
      return !! this._canceled;
  },

  toString: function() { return "[object DeferredGenerator]"; },

  each: function( each, end, error, progress ) {
      var thisB = this;
      var listener = [ each, end, error, progress ];
      listener.deferred = new DeferredGenerator(
          lang.hitch( this, '_start' ),
          function() {
              if( listener.cancel )
                  listener.cancel();
              thisB.cancel();
          }
      );

      if( '_fulfilled' in this && ! this._waiting ) {
          this._signalListener( listener, this._fulfilled, this._result, this._rejection );
      }
      else
          this._waiting.push( listener );

      return listener.deferred;
  },

  forEach: function() {
      return this.each.apply( this, arguments )
          .run();
  },
  last: function( end, error, progress ) {
      var val;
      var first = true;
      return this.each( function(v) { return val = v; },
                        function() { return val; }
                      )
                 .run()
                 .then( end, error, progress );
  },
  first: function( end, error, progress ) {
      var val;
      var first = true;
      return this.each( function(v) {
                            if( first ) {
                                val = v;
                                first = false;
                            }
                            return v;
                        },
                        function() { return val; }
                      )
                 .run()
                 .then( end, error, progress );
  },

  then: function( end, error, progress ) {
      return this.each( undefined, end, error, progress );
  },

  emit: function( item ) {
      if( ! this._fulfilled )
          this._signalWaitingListeners( this.EMIT, item );
  },

  run: function() {
      this._start();

      // make a Deferred that can be used after starting to still do
      // things after the iteration is done, and handle errors
      var d = new Deferred( lang.hitch( this, 'cancel') );
      this.then(
          lang.hitch( d, 'resolve' ),
          lang.hitch( d, 'reject' ),
          lang.hitch( d, 'progress' )
      );

      return d;
  },

  _start: function() {
      if( this._starter ) {
          var val = this._starter( this ); // will recur up to the root of the tree
          delete this._starter;
          if( val ) {
              if( typeof val.each === 'function' ) {
                  val.each(
                      this._makeDeferredSignaler( this, this.EMIT ),
                      this._makeDeferredSignaler( this, this.RESOLVED ),
                      this._makeDeferredSignaler( this, this.REJECTED ),
                      this._makeDeferredSignaler( this, this.PROGRESS )
                  );
                  return;
              } else if ( typeof val.then === 'function' ) {
                  val.then(
                      this._makeDeferredSignaler( this, this.RESOLVED ),
                      this._makeDeferredSignaler( this, this.REJECTED ),
                      this._makeDeferredSignaler( this, this.PROGRESS )
                  );
                  return;
              }
          }
      }
      else {
          throw new Error('DeferredGenerator already started');
      }
  },

  _signalWaitingListeners: function( type, value, rejection ) {
      var listeners = this._waiting;
      if( listeners )
          for( var i = 0; i < listeners.length; i++ ) {
              this._signalListener( listeners[i], type, value, rejection );
          }
  },

  _signalListener: function( listener, type, result, rejection ) {
      var func = listener[ type ];
      var deferred = listener.deferred;
      if( func ){
          try{
              var newResult = func(result);
              if( type === this.EMIT ) {
                  this._signalDeferred( deferred, type, newResult );
              }
              else if( type === this.PROGRESS ){
                  if( newResult !== undefined ){
                      this._signalDeferred( deferred, type, newResult );
                  }
              } else {
                  if( newResult ) {
                      if( typeof newResult.each == 'function' ) {
                          listener.cancel = newResult.cancel;
                          newResult.each(
                              // Only make resolvers if they're actually going to be used
                              this._makeDeferredSignaler( deferred, this.EMIT ),
                              this._makeDeferredSignaler( deferred, this.RESOLVED ),
                              this._makeDeferredSignaler( deferred, this.REJECTED ),
                              this._makeDeferredSignaler( deferred, this.PROGRESS )
                          );
                          return;
                      }
                      else if( typeof newResult.then === "function" ){
                          listener.cancel = newResult.cancel;
                          newResult.then(
                              // Only make resolvers if they're actually going to be used
                              this._makeDeferredSignaler( deferred, this.RESOLVED ),
                              this._makeDeferredSignaler( deferred, this.REJECTED ),
                              this._makeDeferredSignaler( deferred, this.PROGRESS )
                          );
                          return;
                      }
                  }
                  this._signalDeferred( deferred, this.RESOLVED, newResult );
              }
          } catch( error ) {
              this._signalDeferred( deferred, this.REJECTED, error );
          }
      } else {
          this._signalDeferred( deferred, type, result );
      }

      if( has("config-deferredInstrumentation") ) {
          if( type === this.REJECTED && Deferred.instrumentRejected ) {
              Deferred.instrumentRejected( this._result, !!func, this._rejection, this );
          }
      }
  },

  _signalDeferred: function( deferred, type, result ) {
      if( ! deferred.isCanceled() ) {
          var method = deferred[ this.METHODNAMES[type] ];
          if( method )
              method.call( deferred, result );
      }
  },

  _makeDeferredSignaler: function( deferred, type ) {
      var thisB = this;
      return function( value ){
          thisB._signalDeferred( deferred, type, value );
      };
  }

});

if( instrumentation ){
    instrumentation( DeferredGenerator );
}

return DeferredGenerator;
});