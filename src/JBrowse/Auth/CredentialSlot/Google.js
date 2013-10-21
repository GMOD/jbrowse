define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/_base/url',
           'dojo/Deferred',
           'dojo/promise/all',
           'dojo/io-query',
           'dojo/on',

           'JBrowse/Auth/CredentialSlot/_OAuth2Base',
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

           _OAuth2Base,
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

return declare( _OAuth2Base, {

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
               { urlPrefix: 'https://www.googleapis.com/upload/drive/v2',
                 requires: [ knownScopes.driveFiles ]
               },
               { urlRegExp: 'docs\.googleusercontent\.com',
                 requires: [ knownScopes.driveFiles, knownScopes.driveRead ]
               }
           ]
         }
     ]
  },

  neededFor: function( request ) {
      var scope = this._scopeForResource( request.resource );
      return !!( scope && scope.length );
  },

  decorateGAPIRequest: function( req ) {
      var httpReq = lang.mixin({ resource: 'https://www.googleapis.com'+req.path, query: req.params ||{} }, req );
      return this.decorateHTTPRequest( httpReq )
         .then( function( newreq ) {
                    req.headers = newreq.headers;
                    req.params = newreq.query;
                    return req;
                });
  }


});
});