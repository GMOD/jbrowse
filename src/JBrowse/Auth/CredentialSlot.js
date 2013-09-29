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

          { name: 'maxInteractiveAttempts', type: 'integer',
            description: 'maximum number of attempts before failing when interacting with the user to manage the authentication',
            defaultValue: 3
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

  /**
   * Get the credentials.  Accepts a boolean flag of whether user
   * interaction is allowed during this process.
   */
  get: function( allowInteractive ) {
      var thisB = this;
      return this._credentials && ( !this._credentials.isRejected() || !this.shouldRetry( allowInteractive ) )
          ? this._credentials
          : ( this._credentials = this._getCredentials( allowInteractive ) );
  },
  _getCredentials: function() {
      throw new Error('override either _getCredentials() or get() in a subclass');
  },

  /**
   * Return boolean indicating whether we should try again to get the credentials.
   */
  shouldRetry: function( interactive, attemptNumber ) {
      return interactive && ( !attemptNumber || attemptNumber < this.getConf('maxInteractiveAttempts') );
  },

  /**
   * Return true if the last error encountered getting credentials was probably caused by the user.
   */
  lastErrorWasUsersFault: function() {
      return false;
  },

  /**
   * Returns true if the credentials in this slot have already been
   * fetched.
   */
  isReady: function() {
      return !!this._credentials && this._credentials.isResolved();
  },

  /**
   * Get the human-readable label for the credentials in this slot.
   * Gets the credentials if they have not already been fetched.
   *
   * @returns {Deferred} string
   */
  getLabel: function( allowInteractive ) {
      var thisB = this;
      return this.get( allowInteractive )
          .then( function(data) {
                     return Util.fillTemplate( thisB.getConf('label'), data );
                 });
  },

  /**
   * Given a resource definition, return true if the credentials that
   * go in this slot will be needed to access the resource.
   */
  neededFor: function( resourceDefinition ) {
      return this.getConf('predicate', [ this, resourceDefinition ]);
  },

  /**
   * Release the credentials in this slot (i.e. log out, or whatever).
   * Do not necessarily clear stored credentials.
   *
   * Takes a flag saying whether user interaction is allowed during this process.
   */
  release: function( allowInteractive ) {
      delete this._credentials;
      return Util.resolved( true );
  },

  /**
   * Delete any stored credentials for this slot.
   */
  clear: function() {
  },

  _promptForData: function( title, data ) {
      return new PromptDialog({ title: title || this.getConf('name') })
          .promptForPlaceHolders( data );
  },

  /**
   * implement this in a subclass to decorate HTTP requests with auth
   * token headers and so forth
   */
  decorateHTTPRequest: function( req ) {
      return req;
  }

});
});