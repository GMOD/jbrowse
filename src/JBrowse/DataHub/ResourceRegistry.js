/**
 * Singleton that keeps references to all loaded resources, based on
 * their URL.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array'
       ],
       function(
           declare,
           array
       ) {

var Registry = {

  _resources: {},

  addResources: function( resources ) {
      return array.map( resources, this.addResource, this );
  },

  addResource: function( resource ) {
      return this._resources[ resource.getURL() ] = resource;
  },

  getResource: function( url ) {
      return this._resources[ url ];
  }
  // getResource: function( urlOrConfig ) {
  //     if( typeof urlOrConfig == 'string' )
  //         return this._resources[ url ];
  //     else
  //         return 
  // }

};

return Registry;
});