define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/Deferred',
           'dojo/promise/all',
           'dojo/io-query',
           'dojo/on',

           'JBrowse/Auth/CredentialSlot',
           'JBrowse/Errors',
           'JBrowse/Util',
           'JBrowse/Auth/OAuth2/Token',
           'JBrowse/Auth/OAuth2/TokenStore'
       ],
       function(
           declare,
           lang,
           array,
           Deferred,
           all,
           ioQuery,
           on,

           CredentialSlot,
           Errors,
           Util,
           Token,
           TokenStore
       ) {

var knownScopeTokens = {
    driveFiles:    'https://www.googleapis.com/auth/drive.file',
    driveRead:     'https://www.googleapis.com/auth/drive.readonly',
    //plusLogin:     'https://www.googleapis.com/auth/plus.login',
    //userinfoEmail: 'https://www.googleapis.com/auth/userinfo.email',
    userinfoProfile: 'https://www.googleapis.com/auth/userinfo.profile'
};

return declare( CredentialSlot, {

  configSchema: {
     slots: [
         { name: 'name', defaultValue: 'Google' },
         { name: 'urlRegExp', defaultValue: 'https?://[^/]*.?google.com/' },

         { name: 'authStartURL', type: 'string',
           description: 'Interactive web page used to start the OAuth2 authentication process.  Opened in a poopup window.',
           defaultValue: 'https://accounts.google.com/o/oauth2/auth'
         },
         { name: 'tokenValidateURL', type: 'string',
           description: 'REST service URL used to validate auth tokens',
           defaultValue: 'https://www.googleapis.com/oauth2/v1/tokeninfo'
         },
         { name: 'clientID', type: 'string',
           description: 'OAuth2 client ID for this JBrowse installation',
           required: true,
           defaultValue: '506915665486-mlc9gh1gr973vprppl4cu0ohdoh2nuq0.apps.googleusercontent.com'
         },
         { name: 'defaultScope', type: 'multi-string',
           description: 'array of authentication scope tokens to ask for by default',
           defaultValue: Util.dojof.values( knownScopeTokens )
         },
         { name: 'authWindowOpts', type: 'multi-string',
           description: 'array of [name,options] to use when instantiating the authentication window',
           defaultValue: function( slot ) {
               return [ slot.getConf('name')+'AuthWindow', 'status=no,toolbar=no,width=460,height=700' ];
           }
         },
         { name: 'userInfoURL', type: 'string',
           description: 'REST service URL used to fetch basic information about a user',
           defaultValue: 'https://www.googleapis.com/oauth2/v1/userinfo'
         },

         { name: 'label', defaultValue: '<a target="_blank" href="{link}">{name}</a>' }
     ]
  },

  constructor: function() {
      var thisB = this;
      this._tokenStore = new TokenStore({ credentialSlot: this });

      // try to fetch existing tokens when constructed
      var fetchExisting = this._getExistingTokensForScope( this.getConf('defaultScope') );
      this._credentials = fetchExisting;
      this._credentials
          .then( function( tokens ) {
                     if( tokens && tokens.length ) {
                         thisB.gotCredentials(tokens);
                     } else if( thisB._credentials === fetchExisting )
                         delete thisB._credentials;
                     return tokens;
                 },
                 function( error ) {
                     if( thisB._credentials === fetchExisting )
                         delete thisB._credentials;
                 });
  },

  neededFor: function( resourceDef ) {
      var scope = this._scopeForResource( resourceDef );
      return !!( scope && scope.length );
  },

  decorateHTTPRequest: function(req) {
      var bearer = array.map( this._tokensForResource( req ), function(tok) {
                                  return 'Bearer '+tok;
                              }).join(';');
      if( ! req.headers )
          req.headers = {};
      if(! req.headers.Authorization )
          req.headers.Authorization = bearer;
      else
          req.headers.Authorization += ';'+bearer;
 },

  _getCredentials: function( opts ) {
      var thisB = this;

      // see if we can figure out from the opts what scope we really need
      var scope = opts.url && this._scopeForResource( opts ) || [];
      // if all the scope we need for this request are in the
      // defaultScope, just go ahead and ask for the default set
      var defaultScope = this.getConf('defaultScope');
      if( array.every( scope, function(scope) { return array.indexOf( defaultScope, scope ) >= 0; } ) )
          scope = defaultScope;

      if( ! scope.length )
          return Util.resolved( [] );

      return this._getTokensForScope( scope );
  },

  getUserInfo: function( opts ) {
      var thisB = this;
      return this.get(opts)
          .then( function( tokens ) {
                     // fetch the user's data
                     return thisB._fetchUserInfo( tokens[0] );
                 });
  },

  _getExistingTokensForScope: function( scope ) {
      return all( this._tokenStore.getAccessTokensForScope( scope ).deferredTokens );
  },

  _getTokensForScope: function( scope ) {
      var res = this._tokenStore.getAccessTokensForScope( scope );
      var tokens = res.deferredTokens;
      var scopeStillNeeded = res.unmatchedScopeTokens;

      // fetch tokens if we need to, or just return what we have if
      // that's sufficient
      if( scopeStillNeeded.length ) {
          var thisB = this;
          tokens.push(
              this.credentialSlot._getNewToken( scopeStillNeeded )
                  .then( function( newToken ) {
                             thisB._tokenStore.addAccessToken( newToken );
                             return newToken;
                         })
          );
      }

      return all( tokens );
  },

  /**
   * Get a new access token for the given scope.  Will be called by
   * the tokenstore if it needs more tokens to satisfy the given
   * scope.
   */
  _getNewToken: function( scope ) {
      var authUrl = this.getConf('authStartURL') + '?' + ioQuery.objectToQuery(
          {
              response_type:  'token',
              client_id:      this.getConf('clientID'),
              scope:          scope.join(' '),
              redirect_uri:   Util.resolveUrl( ''+window.location, 'themes/blank.html' )
              //, prompt: 'consent' // force display of consent prompt

              // TODO: set login_hint here if credentials are stored
          });

      var thisB = this;

      return this._getTokenData( authUrl )
          .then( function( tokenData ) {
                     var tokenString = tokenData.access_token;
                     if( ! tokenString )
                         throw new Error('Could not find token in token data', tokenData );
                     delete tokenData.access_token;
                     tokenData.scope = scope;

                     return thisB._validateToken( new Token( tokenString, tokenData ) );
                 });
  },

  /**
   * open the auth window and get the token from its URL when it's ready.
   * returns deferred plain object of token data
   */
  _getTokenData: function( authUrl ) {
      var thisB = this;
      var d = new Deferred();

      var authWindow = window.open.apply( window, [authUrl].concat( this.getConf('authWindowOpts') ) );
      if( ! authWindow )
          throw new Error( "Could not open popup window to do "+this.getConf('name')+' authentication.  Is a popup blocker active?' );

      var tokenData;

      // set up an interval to detect if the window is closed without
      // completing auth.  can't use on() for this, because the window
      // might not be open in the same domain as us, and the browser
      // won't give us the events
      var poll = window.setInterval(
          function() {
              if( authWindow ) {
                  tokenData = tokenData || thisB._parseCredentials( authWindow );
                  if( tokenData )
                      authWindow.close();
                  if( authWindow.closed ) {
                      if( tokenData ) {
                          if( tokenData.error )
                              d.reject( tokenData.error );
                          else
                              d.resolve( tokenData );
                      }
                      else
                          d.reject( new Error( 'Authentication failed' ) );
                  }
              }
          }, 400 );
      d.then( function(v) { window.clearInterval(poll);   return v; },
              function(e) { window.clearInterval( poll );  throw e; });

      // if we get a load event from the window, it must have gotten
      // to our redirect URL and should have a token for us in its URL
      on.once( authWindow, 'load', function() {
          try {
              tokenData = thisB._parseCredentials( authWindow );
              if( ! tokenData )
                  return;
              authWindow.close();
              authWindow = undefined;

              if( tokenData.error )
                  d.reject( tokenData.error );
              else
                  d.resolve( tokenData );
          } catch(e) {
              d.reject(e);
          };
      });

      return d;
  },

  _fetchUserInfo: function( token ) {
      var resourceDef = {
          url: this.getConf('userInfoURL'),
          query: { callback: 'jbrowse_google_tokeninfo_callback', access_token: token.tokenString },
          jsonp: 'callback',
          requestTechnique: 'script'
      };
      return this.browser.getTransportForResource( resourceDef )
          .fetch( resourceDef )
          .then( function( response ) {
                     if( response.error )
                         throw new Error( response.error );

                     return response;
                 });
  },

  validateToken: function( token ) {
      var thisB = this;

      // CORS isn't working on googleapis.com, apparently, so we have to use JSONP  >:={
      var resourceDef = {
          url: this.getConf('tokenValidateURL'),
          query: { callback: 'jbrowse_google_tokeninfo_callback', access_token: token.tokenString },
          jsonp: 'callback',
          requestTechnique: 'script'
      };

      return this.browser.getTransportForResource( resourceDef )
          .fetch( resourceDef )
          .then( function( response ) {
                  if( response.error )
                      throw new Error( response.error );

                  // check `audience`; critical for security
                  var audience = response.audience || response.issued_to;
                  if( audience != thisB.getConf('clientID') )
                      throw new Error( 'Authentication token is for the wrong Client ID.' );

                  if( typeof response.scope == 'string' )
                      response.scope = response.scope.split(/\s+/);

                  var newTokenMeta = lang.mixin( {}, token.getMeta(), response );

                  token = new Token( token.tokenString, newTokenMeta );
                  token.setValidated();
                  return token;
              });
  },

  _parseCredentials: function( authWindow ) {
      if( ! /access_token=/.test( authWindow.location.hash ) )
          return null;

      // the credentials are in the #fragment of the authWindow's URL
      var fragment = authWindow.location.hash.replace(/^#/,'');
      return ioQuery.queryToObject( fragment );
  },

  _tokensForResource: function( req ) {
      var scope = this._scopeForResource( req );
      return scope && scope.length ? this._getTokensForScope( scope ) : [];
  },

  _scopeForResource: function( resourceDef ) {
      var scope = [];
      if( /^google\-drive:/.test( resourceDef.url ) ) {
          scope.push( knownScopeTokens.driveRead );
      }
      return scope;
  }

});
});