/**
 * Deferred generator object, allows chained asynchronous iteration.
 * Like an iterating version of dojo/Deferred.
 * Designed to be compatible with dojo/Deferred.
 */

define(
    [
        'dojo/_base/declare',
        'dojo/errors/CancelError'
    ],
    function(
        declare,
        CancelError
    ) {

var EMIT = 0, RESOLVE = 1, REJECT = 2, PROGRESS = 3, CANCEL = 4;
var METHODNAMES = [ 'emit', 'resolve', 'reject', 'progress', 'cancel' ];

var DeferredGenerator = declare( null, {
  constructor: function( cancel, parent ) {
      this._parent = parent;
      var thisB = this;
      this._callbacks = [ undefined, undefined, undefined, undefined, cancel ];
  },

  generator: function( generator ) {
      if( this._parent )
          this._parent.generator( generator );
      else {
          if( this._generatorFunction )
              console.warn( "redefining generator function, removing: "+this._generatorFunction );
          this._generatorFunction = generator;
      }
      return this;
  },

  each: function( each, end, error, progress ) {
      var child = new DeferredGenerator( undefined, this );
      child._callbacks = [ each, end, error, progress ];

      if( '_fulfilled' in this ) {
          var method = child[ METHODNAMES[type] ];
          return method && method.call( deferred, this._value );
      }

      return child;
  },

  then: function( end, error, progress ) {
      return this.each( undefined, end, error, progress );
  },

  emit: function( item ) {
      return this._signal( item, EMIT );
  },

  _signal: function( value, type ) {
      if( this._parent )
          value = this._parent._signal( value, type );

      if( value && typeof value.then == 'function' ) {
          var thisB = this;
          value = value.then(
              function(v) { return thisB._signal(v,RESOLVE, true  ); },
              function(v) { return thisB._signal(v,REJECT, true   ); },
              function(v) { return thisB._signal(v,PROGRESS, true ); }
          );
      } else {
          var cb = this._callbacks[type];
          if( cb ) {
              value = cb.call(this,value);
          }

          if( type != EMIT && type != PROGRESS )
              this._fulfill( type, value );
      }
      return value;
  },

  _fulfill: function( type, value ) {
      this._fulfilled = type;
      this._value = value;

      // free parent and callbacks
      delete this._parent;
      this._callbacks = [];

      return value;
  },

  resolve: function( value ) {
      this._signal( value, RESOLVE );
  },
  reject: function( error ) {
      this._signal( error, REJECT );
  },
  progress: function( value ) {
      this._signal( value, PROGRESS );
  },
  cancel: function( reason ) {
      if( ! reason )
          reason = new CancelError();

      if( this._parent )
          this._parent.cancel( reason );
      else {
          // the root of the hierarchy calls its cancel callback, and then rejects.
          this._callbacks[CANCEL]( reason );
          this.reject( reason );
      }
  },

  isResolved: function() {
      return this._fulfilled == RESOLVE;
  },
  isRejected: function() {
      return this._fulfilled == REJECT;
  },
  isFulfilled: function() {
      return this._fulfilled && this._fulfilled != CANCEL;
  },
  isCanceled: function() {
      return this._fulfilled == CANCEL;
  },

  start: function() {
      this._start( this );
      return this;
  },
  _start: function( head ) {
      if( '_started' in this )
          throw new Error( 'cannot start generator chain: at least one part has already been started' );
      this._started = true;

      if( this._parent )
          this._parent._start( head );
      else if( this._generatorFunction )
          this._generatorFunction( head );
      else
          this.resolve();
  }

});
return DeferredGenerator;
});