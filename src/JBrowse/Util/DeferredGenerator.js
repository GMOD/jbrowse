/**
 * Deferred generator object, allows chained asynchronous iteration.
 * Like an iterating version of dojo/Deferred.
 */

define(
    ['dojo/_base/declare'],
    function(
        declare
    ) {
var DeferredGenerator = declare( null, {
  constructor: function( parent ) {
      this._parent = parent;
  },

  generator: function( generator ) {
      if( this._parent )
          this._parent.generator( generator );
      else {
          if( this._generatorFunction ) {
              console.warn( "redefining generator function, removing: "+this._generatorFunction );
          }
          this._generatorFunction = generator;
      }
      return this;
  },

  each: function( each, end, error ) {
      var child = new DeferredGenerator( this );
      child._onEnd   = end;
      child._onError = error;

      if( '_rejected' in this ) {
          child.reject( (error || function(){})( this._rejected ) );
      }
      else if( '_resolved' in this ) {
          child.resolve( (end || function(){})( this._resolved ) );
      }

      child._onEach  = each;

      return child;
  },

  then: function( end, error ) {
      return this.each( null, end, error );
  },

  feed: function( item ) {
      if( this._parent )
          item = this._parent.feed( item );
      if( this._onEach )
          item = this._onEach( item );
      return item;
  },

  resolve: function( value ) {
      delete this._onEach;

      if( this._parent ) {
          value = this._parent.resolve( value );
          delete this._parent;
      }

      if( this._onEnd ) {
          value = this._onEnd(value);
          delete this._onEnd;
      }

      return this._resolved = value;
  },

  reject: function( error ) {
      delete this._onEach;

      if( this._parent ) {
          error = this._parent.reject( error );
          delete this._parent;
      }

      if( this._onError ) {
          error = this._onError( error );
          delete this._onError;
      }

      return this._rejected = error;
  },

  start: function() {
      this._start( this );
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