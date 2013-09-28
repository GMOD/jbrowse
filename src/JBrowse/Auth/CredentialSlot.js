define([
           'dojo/_base/declare',
           'dojo/Deferred',
           'JBrowse/Util',
           'JBrowse/Component',
           'JBrowse/View/Dialog/Prompt',
           'JBrowse/Errors'
       ],
       function(
           declare,
           Deferred,
           Util,
           Component,
           PromptDialog,
           Errors
       ) {

return declare( Component, {

  constructor: function() {
  },

  configSchema: {
      slots: [
          { name: 'name', type: 'string',
            description: 'name of this kind of credential, e.g. "MySite", or "Google"',
            defaultValue: 'Site'
          },
          { name: 'type', type: 'string',
            description: "JavaScript type of this credential",
            required: true
          },

          { name: 'notReadyStatusLabel', type: 'string',
            description: 'status string that should be shown in the keyring control when these credentials are not ready',
            defaultValue: 'Click to log in'
          },
          { name: 'readyStatusLabel', type: 'string',
            description: 'status string that should be shown in the keyring control when these credentials are not ready',
            defaultValue: 'Logged in'
          },
          { name: 'getSuccessMessage', type: 'string',
            description: 'message displayed when credentials are successfully obtained',
            defaultValue: 'Successfully logged in'
          },
          { name: 'getFailureMessage', type: 'string',
            description: 'message displayed when credentials could not be obtained',
            defaultValue: 'Login failed'
          },
          { name: 'releaseSuccessMessage', type: 'string',
            description: 'message displayed when credentials are successfully released',
            defaultValue: 'Successfully logged out'
          },
          { name: 'releaseFailureMessage', type: 'string',
            description: 'message displayed when credentials could not be released',
            defaultValue: 'Logout failed'
          },

          { name: 'label', type: 'string',
            description: 'label that should be shown in the UI for the credential when it is ready.  Usually a username.  Templated using the credential data.',
            defaultValue: '{user}'
          },

          { name: 'keyringCSSClass', type: 'string',
            description: "CSS class used for this credential's item in the keyring menu",
            defaultValue: ''
          },

          { name: 'urlPrefix', type: 'string' },
          { name: 'urlRegExp', type: 'string' },
          { name: 'urlRegExpOpts', type: 'string', defaultValue: 'i' },
          { name: 'predicate', type: 'boolean', defaultValue: function( slot, resourceDef ) {
                var url = resourceDef.url || '';
                var re = slot.getConf('urlRegExp');
                if( re ) {
                    re = new RegExp( re, slot.getConf('urlRegExpOpts') );
                    return re.test( url );
                }
                var prefix = slot.getConf('urlPrefix');
                if( prefix ) {
                    return url.indexOf( prefix ) != -1;
                }
                return false;
            }
          }

      ]
  },

  get: function() {
      var thisB = this;
      return this._credentials && ! this._credentials.isRejected() ? this._credentials : (
          this._credentials = this._getCredentials()
      );
  },
  getSync: function() {
      return this._credentials ? Util.sync( this._credentials ) : undefined;
  },

  _getCredentials: function() {
      throw new Error('override either _getCredentials() or get() in a subclass');
  },

  isReady: function() {
      return !!this._credentials && this._credentials.isResolved();
  },

  getLabel: function() {
      var thisB = this;
      return this.get()
          .then( function(data) {
                     return Util.fillTemplate( thisB.getConf('label'), data );
                 });
  },

  neededFor: function( resourceDefinition ) {
      return this.getConf('predicate', [ this, resourceDefinition ]);
  },

  release: function() {
      delete this._credentials;
      return Util.resolved( true );
  },

  _promptForData: function( title, data ) {
      return new PromptDialog(
              {
                  title: title || this.getConf('name')
              })
              .promptForPlaceHolders( data );
  }

  // implement this in a subclass to decorate HTTP requests with
  // auth tokens and so forth
  // decorateHTTPRequest: function( req ) {
  // }

});
});