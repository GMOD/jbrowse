/**
 * A cache of OAuth2 tokens that belongs to a certain CredentialSlot.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/Deferred',
           'dojo/promise/all',
           'dojo/json',

           'JBrowse/Util',
           './Token'
       ],
       function(
           declare,
           lang,
           array,
           Deferred,
           all,
           djson,

           Util,
           Token
       ) {

// use native JSON if possible
var JSON = window.JSON || djson;

return declare( null, {

  constructor: function(args) {

      this.credentialSlot = args.credentialSlot;
      if( !this.credentialSlot ) throw new Error( 'credentialSlot required' );

      this.name = this.credentialSlot.getConf('name')+'-TokenStore';

      this._loadTokens();
  },

  addAccessToken: function( token ) {
      this._accessTokens = Util.uniq( this._accessTokens.concat( token ) );
      this._organizeTokens();
      this._saveTokens();
  },

  removeAccessToken: function( token ) {
      this._accessTokens = array.filter( this._accessTokens, function( t ) {
          return t.toString() != token.toString();
      });
      this._saveTokens();
  },

  clear: function() {
      this._accessTokens = [];
      this._saveTokens();
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

      // convert relevantTokens to an array of its values
      relevantTokens = Util.dojof.values( relevantTokens );

      // validate all the tokens that have not been validated yet
      var deferredTokens = array.map( relevantTokens, function( token ) {
          return token.isValid() ? Util.resolved( token )
                                 : this.credentialSlot.validateToken( token );
      },this);

      // fetch tokens if we need to, or just return what we have if
      // that's sufficient
      if( scopeStillNeeded.length ) {
          var thisB = this;
          deferredTokens.push(
              this.credentialSlot._getNewToken( scopeStillNeeded )
                  .then( function( newToken ) {
                             thisB.addAccessToken( newToken );
                             return newToken;
                         })
          );
      }

      return all( deferredTokens );
  },

  _organizeTokens: function() {
      // throw out expired access tokens
      this._accessTokens = array.filter( this._accessTokens, function(t) { return ! t.isExpired(); } )
           // sort access tokens by the the length of their scope
           // arrays descending (i.e. broadest scope first), then by
           // their expiry descending
          .sort( function( t1, t2 ) {
                     return t2.scope.length - t1.scope.length || t2.expires - t1.expires;
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