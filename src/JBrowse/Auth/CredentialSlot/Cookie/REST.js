define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'JBrowse/Auth/CredentialSlot'
       ],
       function(
           declare,
           lang,
           Deferred,
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

          { name: 'loginRequest', type: 'object', defaultValue: function(slot) {
                return {
                    url: slot.getConf('loginURL'),
                    method: 'post',
                    data: slot.getConf('loginData'),
                    handleAs: 'json'
                };
            }},

          { name: 'logoutURL', type: 'string', defaultValue: '/logout' },
          { name: 'logoutData', type: 'object', defaultValue: {} },

          { name: 'logoutRequest', type: 'object', defaultValue: function(slot) {
                return {
                    url: slot.getConf('logoutURL'),
                    method: 'post',
                    data: slot.getConf('logoutData'),
                    handleAs: 'json'
                };
            }
          }
      ]
  },

  _getCredentials: function() {
      var thisB = this;
      function tryLogin( attempt ) {
          return thisB._promptForData( 'Login', thisB.getConf('loginRequest' ) )
              .then( function( loginRequest ) {
                         var t = thisB.browser.getTransportForResource(loginRequest);
                         if( ! t )
                             throw new Error( 'no transport found for login request' );
                         var d = new Deferred();
                         var resolve = lang.hitch( d, 'resolve', loginRequest.data );
                         var reject = lang.hitch( d, 'reject' );
                         t.fetch(loginRequest)
                          .then( resolve,
                                 function(error) {
                                     if( thisB.shouldRetryLogin( error, loginRequest, attempt ) )
                                         tryLogin(++attempt).then( resolve, reject );
                                     else
                                         reject(error);
                                 });
                         return d;
                     });
      }

      return tryLogin( 1 )
          .then( function(response) {
                     console.log('response',response);
                     return { user: 'louie' };
                 });
  },

  shouldRetryLogin: function( error, loginRequest, attemptNumber ) {
      return loginRequest.prompted && error.response.status == 400 && attemptNumber < 3;
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