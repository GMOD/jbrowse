define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/_base/url',
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
           URL,
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

var knownScopes = {
    driveFiles:      'https://www.googleapis.com/auth/drive.file',
    driveRead:       'https://www.googleapis.com/auth/drive.readonly',
    plusLogin:       'https://www.googleapis.com/auth/plus.login',
    userinfoEmail:   'https://www.googleapis.com/auth/userinfo.email',
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
           defaultValue: [ knownScopes.userinfoProfile, knownScopes.driveRead, knownScopes.driveFiles ]
         },
         { name: 'authPopupWindowOpts', type: 'multi-string',
           description: 'array of [name,optionsString] to use when instantiating an authentication popup window',
           defaultValue: function( slot ) {
               return [ slot.getConf('name')+'AuthWindow', 'status=no,toolbar=no,width=460,height=700' ];
           }
         },
         { name: 'userInfoURL', type: 'string',
           description: 'REST service URL used to fetch basic information about a user',
           defaultValue: 'https://www.googleapis.com/oauth2/v1/userinfo'
         },

         { name: 'label', defaultValue: '<a target="_blank" href="{link}">{name}</a>' },
         { name: 'keyringCSSClass',  defaultValue: 'google' },
         { name: 'notReadyStatusLabel',  defaultValue: 'Click to authorize' },
         { name: 'readyStatusLabel', defaultValue: 'Connected' },

         { name: 'accessTokenQueryVar', type: 'string',
           description: 'URL query string variable to use for putting access tokens in JSONP or other requests',
           defaultValue: 'access_token'
         },

         { name: 'scopeMap', type: 'multi-object',
           defaultValue: [
               { urlPrefix: 'https://www.googleapis.com/drive/v2/files',
                 requires: [ knownScopes.driveFiles, knownScopes.driveRead ]
               },
               { urlRegExp: 'docs\.googleusercontent\.com',
                 requires: [ knownScopes.driveFiles, knownScopes.driveRead ]
               }
           ]
         }
     ]
  },

  constructor: function() {
      var thisB = this;
      this._tokenStore = new TokenStore({ credentialSlot: this });

      // try to fetch user info with existing tokens when constructed
      var fetchExisting =
          this.getExistingTokensForScope( this.getConf('defaultScope') )
              .then( function( tokens ) {
                         // if we have some valid existing tokens
                         if( tokens && tokens.length )
                             thisB._userinfo = thisB._fetchUserInfo(tokens[0]);
                     });
  },

  neededFor: function( resourceDef ) {
      var scope = this._scopeForResource( resourceDef );
      return !!( scope && scope.length );
  },

  decorateHTTPRequest: function( req ) {
      var thisB = this;
      return this._tokensForResource( req )
          .then( function( tokens ) {
                     if( !req.jsonp && req.requestTechnique != 'script' && req.requestTechnique != 'iframe' ) {
                         var bearer = array.map( tokens, function(tok) {
                                                     return 'Bearer '+tok;
                                                 }).join(';');
                         if( ! req.headers )
                             req.headers = {};
                         if(! req.headers.Authorization )
                             req.headers.Authorization = bearer;
                         else
                             req.headers.Authorization += ';'+bearer;
                     } else {
                         if( ! req.query )
                             req.query = {};
                         req.query[ thisB.getConf('accessTokenQueryVar') ] = tokens[0];
                     }

                     return req;
                 });
 },

  // true if we have some existing, valid tokens.
  isReady: function() {
      return array.some( this._tokenStore.getAccessTokens(), function(t) { return t.isValid(); } );
  },

  release: function() {
      this._tokenStore.clear();
      delete this._userinfo;
      return this._watchDeferred( Util.resolved(true) );
  },

  get: function( opts ) {
      var thisB = this;
      if( !opts ) opts = {};

      // add scope to the opts if necessary
      var scope = opts.scope;
      if( ! scope ) {
          // see if we can figure out from the opts what scope we really need
          scope = opts.url && this._scopeForResource( opts ) || [];
          // if all the scope we need for this request are in the
          // defaultScope, just go ahead and ask for the default set
          var defaultScope = this.getConf('defaultScope');
          if( array.every( scope, function(scope) { return array.indexOf( defaultScope, scope ) >= 0; } ) )
              scope = defaultScope;
      }
      else if( typeof scope == 'string' )
          scope = scope.split(/\s+/);

      return this.getTokensForScope( scope );
  },

  getUserInfo: function( opts ) {
      var thisB = this;
      return this._userinfo && ! this._userinfo.isRejected()
          ? this._userinfo
          : ( this._userinfo =
                  this.get( opts )
                      .then( function( tokens ) {
                                 // fetch the user's data
                                 if( tokens && tokens[0] )
                                     return thisB._fetchUserInfo( tokens[0] );
                                 throw 'could not obtain any auth tokens to get user info';
                             })
            );
  },

  getExistingTokensForScope: function( scope ) {
      return this.validateAndFilterTokens(
          this._tokenStore.getAccessTokensForScope( scope ).tokens
      );
  },

  /**
   * Filter the given array of tokens to make sure they are all valid,
   * and remove any undefined.  Throws an error if the array then
   * becomes empty.
   */
  _ensureValidTokens: function( tokens ) {
      tokens = this._filterTokens( tokens );
      if( ! tokens.length ) throw 'no valid tokens found';
      return tokens;
  },
  _filterTokens: function( tokens ) {
      return array.filter( tokens, function( t ) { return t && t.isValid(); } );
  },

  getTokensForScope: function( scope ) {
      var thisB = this;
      var res = this._tokenStore.getAccessTokensForScope( scope );
      var existingTokens = res.tokens;
      var scopeStillNeeded = res.unmatchedScopeTokens;

      // if the existing tokens did not cover our whole scope, get a
      // new token and just return that
      if( scopeStillNeeded && scopeStillNeeded.length ) {
          return this._getNewToken( scope )
                  .then( function( newToken ) {
                             return [ newToken ];
                         });
      }
      else {
          // if the existing tokens cover the scope, try to make sure they are all valid
          return this.validateAndFilterTokens( existingTokens )
              .then( function( existingValidTokens ) {
                         if( existingValidTokens.length == existingTokens.length ) {
                             return existingValidTokens;
                         }
                         else { // if they are not all valid, we need to get a new token
                             return thisB._getNewToken( scope )
                                 .then( function(t) {
                                            return [t];
                                        });
                         }
                     });
      }
  },

  /**
   * Get a new access token for the given scope.  Will be called by
   * the tokenstore if it needs more tokens to satisfy the given
   * scope.
   */
  _getNewToken: function( scope ) {
      var thisB = this;

      var authUrl = this.getConf('authStartURL') + '?' + ioQuery.objectToQuery(
          {
              response_type:  'token',
              client_id:      this.getConf('clientID'),
              scope:          scope.join(' '),
              redirect_uri:   Util.resolveUrl( ''+window.location, 'themes/blank.html' )
              //, prompt: 'consent' // force display of consent prompt

              // TODO: set login_hint here if credentials are stored
          });

      return this._getTokenFromPopupWindow( authUrl )
          .then( function( tokenData ) {
                     var tokenString = tokenData.access_token;
                     if( ! tokenString )
                         throw new Error('Could not find token in token data', tokenData );
                     delete tokenData.access_token;
                     tokenData.scope = scope;

                     return thisB.validateToken( new Token( tokenString, tokenData ) );
                 });
  },

  /**
   * open the auth window and get the token from its URL when it's ready.
   * returns deferred plain object of token data
   */
  _getTokenFromPopupWindow: function( authUrl ) {
      var thisB = this;
      var d = new Deferred();

      var authWindow = window.open.apply( window, [authUrl].concat( this.getConf('authPopupWindowOpts') ) );
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

                  try {
                      tokenData = tokenData || thisB._parseCredentials( authWindow );
                  } catch(e) {}

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
          query: { access_token: token.tokenString },
          jsonp: 'callback',
          requestTechnique: 'script'
      };
      var fetch = this.browser.getTransportForResource( resourceDef )
          .fetch( resourceDef )
          .then( function( response ) {
                     if( response.error )
                         throw new Error( response.error );

                     return response;
                 });
      this._watchDeferred( fetch );
      return fetch;
  },

  /**
   * Given an array of tokens, try to validate all that need to be
   * validated, and filter out the ones that turned out to be invalid.
   *
   * Returns a deferred array of tokens.
   */
  validateAndFilterTokens: function( tokens ) {
      return all( array.map( tokens, function(t) {
                                 return t.isValid() ? t : this.validateToken(t);
                             }, this )
                )
          .then( function( tokens ) {
                     return array.filter( tokens, function( t ) { return t && t.isValid(); } );
                 });
  },

  /**
   * Takes a Token, returns a Deferred with either a new validated
   * Token with the same data, or undefined if the Token could not be
   * validated.
   */
  validateToken: function( inputToken ) {
      var thisB = this;

      // CORS isn't working on googleapis.com, apparently, so we have to use JSONP  >:={
      var resourceDef = {
          url: this.getConf('tokenValidateURL'),
          query: { access_token: inputToken.tokenString },
          jsonp: 'callback',
          requestTechnique: 'script'
      };

      return this.browser.getTransportForResource( resourceDef )
          .fetch( resourceDef )
          .then( function( response ) {
                  if( response.error )
                      throw response.error;

                  // check `audience`; critical for security
                  var audience = response.audience || response.issued_to;
                  if( audience != thisB.getConf('clientID') ) {
                      console.warn( 'Authentication token is for the wrong Client ID.' );
                      throw 'invalid_token';
                  }

                  if( typeof response.scope == 'string' )
                      response.scope = response.scope.split(/\s+/);

                  var newTokenMeta = lang.mixin( {}, inputToken.getMeta(), response );

                  var validatedToken = new Token( inputToken.tokenString, newTokenMeta );
                  validatedToken.setValidated();
                  thisB._tokenStore.replaceAccessToken( inputToken, validatedToken );

                  return validatedToken;
                 })
           .then( null, function( error ) {
                     if( error == 'invalid_token' ) {
                         // if the token was invalid, remove it from the token store
                         thisB._tokenStore.removeAccessTokens([inputToken]);
                         return undefined;
                     } else
                         throw error;
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
      return scope && scope.length ? this.getTokensForScope( scope ) : [];
  },

  _scopeForResource: function( resourceDef ) {
      var url = typeof resourceDef == 'string' ? resourceDef : resourceDef.url;
      if( ! url )
          return undefined;

      var scopeMap = this.getConf('scopeMap');

      var scope;
      array.some( scopeMap, function( sm ) {
          if( this._urlMatches( url, sm ) ) {
              scope = sm.requires.slice();
              return true;
          }
          return false;
      },this);

      // if( ! scope )
      //     console.warn( "No "+this.getConf('name')+" auth scopes found for url: "+url );
      // else
      //     console.log( this.getConf('name')+" scope for url '"+url+"': "+scope.join(' ') );

      return scope;
  }

});
});