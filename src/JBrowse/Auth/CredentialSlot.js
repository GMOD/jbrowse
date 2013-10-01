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
            description: 'label that should be shown in the UI for the credential when it is ready.  Typically a username.  Templated with the data from getUserInfo.',
            defaultValue: '{user}'
          },

          { name: 'keyringCSSClass', type: 'string',
            description: "CSS class used for this credential's item in the keyring menu",
            defaultValue: ''
          },
          { name: 'icon', type: 'string',
            description: "URL of an icon that should be shown next to the slot's name in the credential control"
          },

          { name: 'keyringWidgetClass', type: 'object',
            description: "JavaScript class to be used for this slot's GUI control in the JBrowse keyring"
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
  get: function( opts ) {
      var thisB = this;
      return this._credentials && ( !this._credentials.isRejected() || !this.shouldRetry( opts ) )
          ? this._credentials
          : this._watchDeferred( this._credentials = this._getCredentials( opts ) );
  },

  // watch a deferred/promise and call gotCredentials or gotCredentialError
  // when it resolves or rejects
  _watchDeferred: function(d) {
      var thisB = this;
      d.then( function(data) { thisB.gotCredentials(data); return data; },
              function(error) { thisB.gotCredentialError(error); throw error; } );
      return d;
  },

  _getCredentials: function() {
      throw new Error('override either _getCredentials() or get() in a subclass');
  },

  /**
   * Hook called after credentials are successfully fetched into this slot.
   */
  gotCredentials: function( credentialData ) {
  },

  /**
   * Hook called after a non-retryable error was encountered fetching
   * credentials for this slot.
   */
   gotCredentialError: function( error ) {
       this._lastError = error;
       console.error( error.stack || ''+error );
   },

  /**
   * Return boolean indicating whether we should try again to get the credentials.
   */
  shouldRetry: function( opts, attemptNumber ) {
      return opts.interactive && ( !attemptNumber || attemptNumber < this.getConf('maxInteractiveAttempts') );
  },

  /**
   * Returns true if the credentials in this slot have already been
   * fetched.
   */
  isReady: function() {
      return !!this._credentials && this._credentials.isResolved();
  },

  getUserInfo: function( opts ) {
      return this.get( opts );
  },

  /**
   * Get the human-readable label for the credentials in this slot.
   * Gets the credentials if they have not already been fetched.
   *
   * @returns {Deferred} string
   */
  getLabel: function( opts ) {
      var thisB = this;
      return this.getUserInfo( opts )
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
   *
   * Takes a flag saying whether user interaction is allowed during this process.
   */
  release: function( opts ) {
      delete this._credentials;
      return Util.resolved( true );
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