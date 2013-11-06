/**
 * Store that aggregates several track metadata stores, querying them
 * as if they were one.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/Deferred',
           'dojo/promise/all',

           'JBrowse/Store/TrackMetaData'
       ],
       function(
           declare,
           array,
           lang,
           Deferred,
           all,

           TrackMetaDataStore
       ) {
return declare( TrackMetaDataStore, {

  // activate manual constructor chaining
  "-chains-": { constructor: 'manual' },

  constructor: function( args ) {
      this._stores = args.stores || [];
  },

  // add a metadata store to use for metadata
  addStore: function( store ) {
      if( array.indexOf( this._stores, store ) == -1 )
          this._stores.push( store );
      return store;
  },

  _fetchItems: function( keywordArgs, findCallback, errorCallback ) {
      if( ! this.ready ) {
          this.onReady( lang.hitch( this, '_fetchItems', keywordArgs, findCallback, errorCallback ) );
          return;
      }

      var stores = keywordArgs.hubName
          ? array.filter( this._stores, function( store ) {
                              return store.getName() == keywordArgs.hubName;
                          })
          : this._stores;

      var resultSets = array.map( stores, function( store ) {
          var set = new Deferred();
          store._fetchItems( keywordArgs, set.resolve, set.reject );
          return set;
      });

      all( resultSets )
          .then( function( sets ) {
                     findCallback( sets[0].concat.apply( sets[0], Array.prototype.slice.call( arguments, 1 ) ) );
                 },
                 errorCallback
               );
  }

});
});