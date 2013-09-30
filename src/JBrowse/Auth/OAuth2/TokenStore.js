/**
 * A cache of OAuth2 tokens that belongs to a certain CredentialSlot.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/Deferred',

           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           array,
           Deferred,

           Util
       ) {
return declare( null, {

  constructor: function(args) {

      this.credentialSlot = args.credentialSlot;
      if( !this.credentialSlot ) throw new Error( 'credentialSlot required' );

      this.name = this.credentialSlot.getConf('name')+'-TokenStore';

      this._loadTokens();
  },

  addAccessToken: function( token ) {
      this._accessTokens = Util.uniq( this._accessTokens.concat( token ) );
  },

  removeAccessToken: function( token ) {
      this._accessTokens = array.filter( this._accessTokens, function( t ) {
          return t.toString() != token.toString();
      });
  },

  clear: function() {
      this._accessTokens = [];
  },

  getAccessTokensForScopes: function( scopes ) {
      this._organizeTokens();

      var relevantTokens = {};

      var scopesStillNeeded = [];
      array.forEach( scopes, function( scope ) {
          // find the first existing token that includes this scope
          // (this._accessTokens is sorted by most to least widely-scoped
          // tokens)
          var scopeIsCovered = array.some( this._accessTokens, function( token ) {
             if( ! token.isExpired() && array.indexOf( token.scopes, scope ) >= 0 ) {
                 relevantTokens[token.toString()] = token;
                 return true;
             }
             return false;
          }, this );

          if( ! scopeIsCovered )
              scopesStillNeeded.push( scope );
      },this);

      // convert relevantTokens to an array of its values
      relevantTokens = Util.dojof.values( relevantTokens );

      // fetch tokens if we need to, or just return what we have if
      // that's sufficient
      if( scopesStillNeeded.length ) {
          var thisB = this;
          return this.credentialSlot._getNewToken( scopesStillNeeded )
              .then( function( newToken ) {
                         thisB.addAccessToken( newToken );
                         return [newToken].concat(relevantTokens);
                     });
      }
      else {
          return Util.resolved( relevantTokens );
      }
  },

  _organizeTokens: function() {
      // throw out expired access tokens
      this._accessTokens = array.filter( this._accessTokens, function(t) { return ! t.isExpired(); } )
           // sort access tokens by the the length of their scope
           // arrays descending (i.e. broadest scope first), then by
           // their expiry descending
          .sort( function( t1, t2 ) {
                     return t2.scopes.length - t1.scopes.length || t2.expires - t1.expires;
                 });

      // TODO: store tokens in local storage
  },

  _loadTokens: function() {
      // TODO: load tokens from local storage
      this._accessTokens = [];
  }

});
});