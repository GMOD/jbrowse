/**
 * Serializable test class to test SerializationUtils.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/json',

           'JBrowse/Util/Serialization'
       ],
       function(
           declare,
           array,
           JSON,

           Serialization
       ) {

return declare( null, {
  constructor: function( args ) {
      var params = [];
      for( var n in args ) {
          params.push( n );
          this[n] = args[n];
      }
      this._params = params;
  },

  deflate: function() {
      var d = { $class: 'JBrowseTest/TestClass1' };
      array.forEach( this._params, function(pname) {
                         d[pname] = Serialization.deflate( this[pname] );
                     },this);
      delete d._params;
      return d;
  }
});

});
