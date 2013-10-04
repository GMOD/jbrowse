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

         // default request opts for all requests to the auth services
         { name: 'apiRequestOpts', type: 'object',
           defaultValue: { jsonp: 'callback', requestTechnique: 'script', handleAs: 'json' }
         },

         // auth window popups
         { name: 'authPopupURL', type: 'string',
           description: 'Interactive web page used to start the OAuth2 authentication process.  Opened in a poopup window.',
           defaultValue: 'https://accounts.google.com/o/oauth2/auth'
         },
         { name: 'authPopupWindowOpts', type: 'multi-string',
           description: 'array of [name,optionsString] to use when instantiating an authentication popup window',
           defaultValue: function( slot ) {
               return [ slot.getConf('name')+'AuthWindow', 'status=no,toolbar=no,width=460,height=700' ];
           }
         },

         { name: 'authPopupRedirectURL', type: 'string',
           description: 'Redirect URL for the end of the auth popup flow.  Can be relative to the JBrowse index.html page.',
           defaultValue: 'themes/blank.html'
         },

         // token validation requests
         { name: 'tokenValidateURL', type: 'string',
           description: 'REST service URL used to validate auth tokens',
           defaultValue: 'https://www.googleapis.com/oauth2/v1/tokeninfo'
         },
         { name: 'tokenValidateRequestOpts', type: 'object',
           description: 'Additional request options for token validation requests',
           defaultValue: {}
         },

         // configure user info requests
         { name: 'userInfoURL', type: 'string',
           description: 'REST service URL used to fetch basic information about a user',
           defaultValue: 'https://www.googleapis.com/oauth2/v1/userinfo'
         },
         { name: 'userInfoRequestOpts', type: 'object',
           description: 'Additional request options for user info requests',
           defaultValue: {}
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
         { name: 'userIDField', type: 'string',
           description: 'Token metadata field name that contains the unique ID of the user it was issued to.',
           defaultValue: 'user_id'
         },

         // opts for customizing how its control looks in the keyring pane
         { name: 'keyringLabel', defaultValue: '<a target="_blank" href="{link}">{name}</a>' },
         { name: 'keyringCSSClass',  defaultValue: 'google' },
         { name: 'notReadyStatusLabel',  defaultValue: 'Click to authorize' },
         { name: 'readyStatusLabel', defaultValue: 'Connected' },

         { name: 'accessTokenQueryVar', type: 'string',
           description: 'URL query string variable to use for putting access tokens in the URL query string for JSONP or other requests',
           defaultValue: 'access_token'
         },

         { name: 'scopeMap', type: 'multi-object',
           description: 'map used to match URL patterns to the auth scopes that we know we need for them',
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

  neededFor: function( request ) {
      var scope = this._scopeForResource( request.resource );
      return !!( scope && scope.length );
  },

  decorateHTTPRequest: function( req ) {
      var thisB = this;
      return this._tokensForRequest( req )
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

  get: function( request ) {
      var thisB = this;
      if( !request ) request = {};

      // add scope to the opts if necessary
      var scope = request.scope;
      if( ! scope ) {
          // see if we can figure out from the opts what scope we really need
          if( request.resource ) {
              scope = this._scopeForResource( request.resource ) || [];
              // if all the scope we need for this request are in the
              // defaultScope, just go ahead and ask for the default set
              var defaultScope = this.getConf('defaultScope');
              if( array.every( scope, function(scope) { return array.indexOf( defaultScope, scope ) >= 0; } ) )
                  scope = defaultScope;
          } else {
              scope = this.getConf('defaultScope');
          }
      }
      else if( typeof scope == 'string' )
          scope = scope.split(/\s+/);

      return this._watchDeferred( this.getTokensForScope( scope ) );
  },

  getUserInfo: function(opts) {
      var thisB = this;
      return this._userinfo && ! this._userinfo.isRejected()
          ? this._userinfo
          : ( this._userinfo =
                  this.get(opts)
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
  _filterTokens: function( tokens ) {

      // filter for defined and valid tokens
      tokens = array.filter( tokens, function( t ) { return t && t.isValid(); } );
      if( ! tokens.length ) return tokens;

      // filter the tokens to all be for the same user, just in case.
      var userIDField = this.getConf('userIDField');
      if( ! userIDField ) return tokens;
      tokens.sort( function(a,b) {
                       return b.getMetab.getExpiryTime() - a.getExpiryTime();
                   });
      var primary_user = tokens[0].getMeta( userIDField );
      if( ! primary_user ) return tokens;
      tokens = array.filter( tokens, function(t) { return t.getMeta(userIDField) == primary_user; } );
      return tokens;
  },

  getTokensForScope: function( scope ) {
      var thisB = this;
      var res = this._tokenStore.getAccessTokensForScope( scope );
      var existingTokens = res.tokens;
      var scopeStillNeeded = res.unmatchedScopeTokens;

      // if the existing tokens did not cover our whole scope, get a
      // new token and just return that
      if( scopeStillNeeded && scopeStillNeeded.length
          || !scope.length && !existingTokens.length ) {
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

      var authUrl = this._assembleAuthPopupURL( scope );

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

  _assembleAuthPopupRedirectURL: function() {
      return Util.resolveUrl( ''+window.location, this.getConf('authPopupRedirectURL') );
  },

  _assembleAuthPopupURL: function( scope ) {
      return this.getConf('authPopupURL') + '?' + ioQuery.objectToQuery(
          {
              response_type:  'token',
              client_id:      this.getConf('clientID'),
              scope:          scope.join(' '),
              redirect_uri:   this._assembleAuthPopupRedirectURL()
              //, prompt: 'consent' // force display of consent prompt

              // TODO: set login_hint here if credentials are stored
          });
  },

  /**
   * open a popup window to start the OAuth2 flow, and get the token
   * from its URL when it's ready.  returns deferred plain object of
   * token data
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
                      tokenData = tokenData || thisB._parseCredentialsFromPopupWindow( authWindow );
                  } catch(e) {}

                  if( tokenData )
                      authWindow.close();

                  if( authWindow.closed ) {
                      if( tokenData ) {
                          if( tokenData.error ) {
                              console.error( tokenData );
                              d.reject( tokenData.error );
                          } else
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
              tokenData = thisB._parseCredentialsFromPopupWindow( authWindow );
              if( ! tokenData )
                  return;
              authWindow.close();
              authWindow = undefined;

              if( tokenData.error ) {
                  console.error( tokenData );

                  d.reject( tokenData.error );
              } else
                  d.resolve( tokenData );
          } catch(e) {
              d.reject(e);
          };
      });

      return d;
  },

  _fetchUserInfo: function( token ) {
      var req = this._assembleAPIRequest(
          'userInfo',
          { query: { access_token: ''+token } }
      );

      var fetch = this.browser.request( req.url, req )
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
      var thisB = this;
      return all( array.map( tokens, function(t) {
                                 return t.isValid() ? t : this.validateToken(t);
                             }, this )
                )
          .then( function( tokens ) {
                     return thisB._filterTokens( tokens );
                 });
  },

  _assembleAPIRequest: function( reqTypeName, fetchOpts ) {
      var url = this.getConf( reqTypeName+'URL' );
      if( ! url )
          return undefined;

      return lang.mixin(
          {},
          this.getConf('apiRequestOpts'),
          this.getConf( reqTypeName+'RequestOpts'),
          fetchOpts,
          { url: url }
      );
  },


  /**
   * Given a token and the response from the token validation service,
   * throw if the token is invalid, and otherwise return a valid
   * token.  Might be the same token, or a different token object.
   */
  _validateTokenFromResponse: function( inputToken, response ) {
      if( response.error )
          throw response.error;

      // check `audience`; critical for security
      var audience = response.audience || response.issued_to;
      if( audience != this.getConf('clientID') ) {
          console.warn( 'Authentication token is for the wrong Client ID.' );
          throw 'invalid_token';
      }

      if( typeof response.scope == 'string' )
          response.scope = response.scope.split(/\s+/);

      var newTokenMeta = lang.mixin( {}, inputToken.getMeta(), response );

      var validatedToken = new Token( inputToken.tokenString, newTokenMeta );
      validatedToken.setValidated();
      return validatedToken;
  },

  /**
   * Takes a Token, returns a Deferred with either a new validated
   * Token with the same data, or undefined if the Token could not be
   * validated.
   */
  validateToken: function( inputToken ) {
      var thisB = this;

      var req = this._assembleAPIRequest( 'tokenValidate', {query:{ access_token: ''+inputToken }} )
                || this._assembleAPIRequest( 'userInfo', {query:{ access_token: ''+inputToken }} );

      return this.browser.request( req.url, req )
          .then( function( response ) {
                  var validatedToken = thisB._validateTokenFromResponse( inputToken, response );
                  thisB._tokenStore.replaceAccessToken( inputToken, validatedToken );

                  return validatedToken;
                 },
                 function( error ) {
                     if( error == 'invalid_token' ) {
                         // if the token was invalid, remove it from the token store
                         thisB._tokenStore.removeAccessTokens([inputToken]);
                         return undefined;
                     } else
                         throw error;
                 });
  },

  _parseCredentialsFromPopupWindow: function( authWindow ) {
      var fragment = ( authWindow.location.hash || '' ).replace(/^#/,'');
      if( fragment && fragment.indexOf( this._assembleAuthPopupRedirectURL() ) != 0 ) {
          // the credentials are in the #fragment of the authWindow's URL
          return ioQuery.queryToObject( fragment );
      }
      return undefined;
  },

  _tokensForRequest: function( req ) {
      var scope = this._scopeForResource( req.url );
      return scope && scope.length ? this.getTokensForScope( scope ) : [];
  },

  _scopeForResource: function( resourceDef ) {
      if( ! resourceDef ) return undefined;
      var url = typeof resourceDef == 'string' ? resourceDef : resourceDef.url;
      if( ! url ) return undefined;

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