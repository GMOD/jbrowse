/**
 * Manages a set of listeners that are interested in being notified of something.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array'
       ],
       function(
           declare,
           array
       ) {

return declare( null, {

  constructor: function() {
      this._listeners = [];
      for( var i = 0; i<arguments.length; i++ )
          this.add( arguments[i] );
  },

  /**
   * Notify registered listeners with the given data.
   */
  notify: function() {
      var listeners = this._listeners.slice();
      for( var i = 0; i<listeners.length; i++ )
          listeners[i]._callback.apply( this, arguments );
  },

  /**
   * Add a listener callback.
   */
  add: function( callback, phase ) {
      if( ! phase )
          phase = 0;
      var listeners = this._listeners;
      var listener = { _callback: callback, _phase: phase };
      listeners.push( listener );
      listeners.sort( function( a, b ) { return a._phase - b._phase; } );
      listener.remove = function() {
          var i = array.indexOf( listeners, listener );
          if( i > -1 )
              listeners.splice( i, 1 );
          delete listener._callback;
          listener.remove = function() {};
      };
      return listener;
  }

});
});