define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'dojo/when',
           'JBrowse/Auth/CredentialSlot'
       ],
       function(
           declare,
           lang,
           Deferred,
           when,
           CredentialSlot
       ) {
return declare( CredentialSlot, {

  configSchema: {
      slots: [
          { name: 'loginURL', type: 'string', defaultValue: '/login' },
          { name: 'loginData', type: 'object', defaultValue: { user: '<prompt>', password: '<prompt>' } },

          { name: 'visibleLoginData', type: 'string',
            description: 'string of login data to make visible in the client UI.  templated with `loginData`.',
            defaultValue: '{user}'
          },

          { name: 'loginRequest', type: 'object',
            defaultValue: function(slot) {
                return {
                    url: slot.getConf('loginURL'),
                    method: 'post',
                    data: slot.getConf('loginData'),
                    handleAs: 'json'
                };
            }},

          { name: 'logoutURL', type: 'string',
            defaultValue: '/logout' },
          { name: 'logoutData', type: 'object',
            defaultValue: {} },

          { name: 'logoutRequest', type: 'object',
            defaultValue: function(slot) {
                return {
                    url: slot.getConf('logoutURL'),
                    method: 'post',
                    data: slot.getConf('logoutData'),
                    handleAs: 'json'
                };
            }
          },

          { name: 'promptTitle', type: 'string',
            description: 'title of the dialog box used to prompt for login data',
            defaultValue: 'Login' }
      ]
  },

  _getCredentials: function( opts ) {
      var thisB = this;
      var allowInteractive = opts.interactive;
      function tryLogin( attempt ) {
          return when(
              allowInteractive
                  ? thisB._promptForData( thisB.getConf('promptTitle'),
                                          thisB.getConf('loginRequest' ) )
                  : thisB.getConf('loginRequest')
            ).then( function( loginRequest ) {
                         var t = thisB.browser.getTransportForResource( loginRequest.url );
                         if( ! t )
                             throw new Error( 'no transport found for login request' );

                         var d = new Deferred();
                         var resolve = function(response) {
                             if( ! response.req )
                                 response.req = loginRequest;
                             d.resolve( response );
                         };
                         var reject = lang.hitch( d, 'reject' );

                         thisB._lastRequest = loginRequest;

                         t.request( loginRequest.url, loginRequest )
                          .then( resolve,
                                 function(error) {
                                     thisB._lastError   = error;
                                     if( thisB.shouldRetry( opts, attempt ) )
                                         tryLogin(++attempt).then( resolve, function(e) { reject(e); throw e } );
                                     else
                                         reject(error);
                                     throw error;
                                 });
                         return d;
                     });
      }

      return tryLogin( 1 );
  },

  getUserInfo: function(opts) {
      var thisB = this;
      return this.get( opts )
          .then( function( response ) {
                     return thisB._extractCredentialsData( response );
                });
  },

  _extractCredentialsData: function( response, request ) {
      return response.req.data;
  },

  release: function() {
      var thisB = this;
      return this.inherited( arguments )
                 .then( function() {
                            return thisB._promptForData( 'Logout', thisB.getConf('logoutRequest' ) )
                                .then( function( logoutRequest ) {
                                           return thisB.browser.getTransportForResource( logoutRequest.url )
                                               .request( logoutRequest.url, logoutRequest );
                                       });
                        });
  }

});
});