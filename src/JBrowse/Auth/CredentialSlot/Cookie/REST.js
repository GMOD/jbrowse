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
      var d = this._credentials;
      var resolve = lang.hitch(d, 'resolve');
      var reject = lang.hitch(d,   'reject');

      function tryLogin( attempt ) {
          thisB._promptForData( 'Login', thisB.getConf('loginRequest' ) )
              .then( function( loginRequest ) {
                         var t = thisB.browser.getTransportForResource(loginRequest);
                         if( ! t ) {
                             reject('no transport found for login request');
                             return;
                         }
                         t.fetch(loginRequest)
                             .then( resolve,
                                    function(error) {
                                        if( thisB.shouldRetryLogin( error, loginRequest, attempt ) )
                                            tryLogin(++attempt);
                                        else
                                            reject(error);
                                    });
                     }, reject );
      }

      tryLogin( 1 );

      return d;
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