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

  _getCredentials: function( allowInteractive ) {
      var thisB = this;
      function tryLogin( attempt ) {
          return when(
              allowInteractive
                  ? thisB._promptForData( thisB.getConf('promptTitle'),
                                          thisB.getConf('loginRequest' ) )
                  : thisB.getConf('loginRequest')
            ).then( function( loginRequest ) {
                         var t = thisB.browser.getTransportForResource(loginRequest);
                         if( ! t )
                             throw new Error( 'no transport found for login request' );

                         var d = new Deferred();
                         var resolve = function( response ) {
                             d.resolve( thisB._extractCredentialsData( response, loginRequest ) );
                         };
                         var reject = lang.hitch( d, 'reject' );

                         thisB._lastRequest = loginRequest;

                         var isInteractive = loginRequest.prompted;

                         t.fetch( loginRequest )
                          .then( resolve,
                                 function(error) {
                                     thisB._lastError   = error;
                                     if( thisB.shouldRetry( isInteractive, attempt ) )
                                         tryLogin(++attempt).then( resolve, reject );
                                     else
                                         reject(error);
                                 });
                         return d;
                     });
      }

      return tryLogin( 1 );
  },

  lastErrorWasUsersFault: function() {
      return this._lastError && this._lastError.response.status == 400;
  },

  _extractCredentialsData: function( response, request ) {
      return request.data;
  },

  release: function() {
      var thisB = this;
      return this.inherited( arguments )
                 .then( function() {
                            return thisB._promptForData( 'Logout', thisB.getConf('logoutRequest' ) )
                                .then( function( logoutRequest ) {
                                           return thisB.browser.getTransportForResource(logoutRequest)
                                               .fetch( logoutRequest );
                                       });
                        });
  }

});
});