define([
           'dojo/_base/declare',
           'dojo/Deferred',
           'JBrowse/Util',
           'JBrowse/Component',
           'JBrowse/View/Dialog/Prompt'
       ],
       function(
           declare,
           Deferred,
           Util,
           Component,
           PromptDialog
       ) {

return declare( Component, {

  constructor: function() {
      this._credentials = new Deferred();
  },

  configSchema: {
      slots: [
          { name: 'name', type: 'string', defaultValue: 'site' },
          { name: 'type', type: 'string', required: true },

          { name: 'getActionLabel', type: 'string',
            description: 'string describing the action of getting these credentials',
            defaultValue: 'Log in'
            //defaultValue: function(slot) { return 'Log into '+slot.getConf('name'); }
          },
          { name: 'releaseActionLabel', type: 'string',
            description: 'string describing the action of getting these credentials',
            defaultValue: 'Log out'
            //defaultValue: function(slot) { return 'Log out of '+slot.getConf('name'); }
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
      if( ! this.ready )
          this._getCredentials();
      return this._credentials;
  },

  isReady: function() {
      return this._credentials.isResolved();
  },

  neededFor: function( resourceDefinition ) {
      return this.getConf('predicate', [ this, resourceDefinition ]);
  },

  _getCredentials: function() {
      throw new Error('override either _getCredentials() or get() in a subclass');
  },

  release: function() {
      this._credentials = new Deferred();
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