/**
 * A cache of OAuth2 tokens that belongs to a certain CredentialSlot.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/Deferred',
           'dojo/json',

           'JBrowse/Util',
           './Token'
       ],
       function(
           declare,
           lang,
           array,
           Deferred,
           djson,

           Util,
           Token
       ) {

// use native JSON if possible
var JSON = window.JSON || djson;

return declare( null, {

  constructor: function(args) {

      this.name = args.name || args.credentialSlot && args.credentialSlot.getConf('name')+'-TokenStore';
      if( ! this.name )
          throw 'must provide either `name` or `credentialSlot` when instantiating token store';

      this._loadTokens();
  },

  addAccessTokens: function( token ) {
      this._accessTokens.push( token );
      this._organizeTokens();
      this._saveTokens();
  },

  removeAccessTokens: function( tokens ) {
      this._accessTokens = array.filter( this._accessTokens, function( existing ) {
          return ! array.some( tokens, function( toRemove ) {
                                   return toRemove.toString() == existing.toString();
                               });
      });
      this._saveTokens();
  },

  replaceAccessToken: function( old, newToken ) {
      this._accessTokens = array.filter( this._accessTokens, function( t ) {
          return t.toString() != old.toString() && t.toString() != newToken.toString();
      });
      this._accessTokens.unshift( newToken );
      this._organizeTokens();
      this._saveTokens();
  },

  clear: function() {
      this._accessTokens = [];
      this._saveTokens();
  },

  getAccessTokens: function() {
      return this._accessTokens.slice();
  },

  getAccessTokensForScope: function( scope ) {
      var relevantTokens = {};

      var scopeStillNeeded = [];
      array.forEach( scope, function( scope ) {
          // find the first existing token that includes this scope
          // (this._accessTokens is sorted by most to least widely-scoped
          // tokens)
          var scopeIsCovered = array.some( this._accessTokens, function( token ) {
             if( ! token.isExpired() && array.indexOf( token.getMeta('scope'), scope ) >= 0 ) {
                 relevantTokens[token.toString()] = token;
                 return true;
             }
             return false;
          }, this );

          if( ! scopeIsCovered )
              scopeStillNeeded.push( scope );
      },this);


      return {
          // convert relevantTokens to an array of its values, and
          // validate all the tokens that need it
          tokens: Util.dojof.values( relevantTokens ),
          unmatchedScopeTokens: scopeStillNeeded
      };
   },

  _organizeTokens: function() {
      // throw out expired access tokens
      this._accessTokens = array.filter( this._accessTokens, function(t) { return ! t.isExpired(); } )
           // sort access tokens by the the length of their scope
           // arrays descending (i.e. broadest scope first), then by
           // their expiry descending
          .sort( function( t1, t2 ) {
                     return t2.getMeta('scope').length - t1.getMeta('scope').length || t2.getExpiryTime() - t1.getExpiryTime();
                 });
  },

  _saveTokens: function() {
      // store tokens in local storage if we can
      try {
          window.localStorage.setItem(
              'JBrowse-'+this.name,
              '{ "accessTokens":['
                  +array.map( this._accessTokens || [], function(t) { return t.toJSON();} ).join(',')
                  +']}'
          );
      } catch(e) {
          console.warn( 'Could not store tokens in localStorage: '+e );
      }
  },

  _loadTokens: function() {
      this._accessTokens = [];

      // get tokens from local storage if we can
      try {
          var data = JSON.parse( window.localStorage.getItem( 'JBrowse-'+this.name ) || '{ "accessTokens": [] }' );
          this._accessTokens = array.map( data.accessTokens || [], function( tdata ) {
                                              return new Token( tdata[0], tdata[1] );
                                          });
      } catch(e) {
          console.warn('Could not get tokens from localStorage: '+e);
      }
  }

});
});