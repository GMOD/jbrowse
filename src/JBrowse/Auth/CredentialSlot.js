define([
           'dojo/_base/declare',
           'dojo/Deferred',
           'JBrowse/Component'
       ],
       function(
           declare,
           Deferred,
           Component
       ) {

return declare( Component, {

  configSchema: {
      slots: [
          { name: 'type', type: 'string' },

          { name: 'baseUrl', type: 'string' },
          { name: 'urlRegex', type: 'string' },
          { name: 'urlRegexOpts', type: 'string', defaultValue: '' },
          { name: 'predicate', type: 'function', defaultValue: function( slot, resourceDef ) {
                var url = resourceDef.url || '';
                var re = this.getConf('urlRegex');
                if( re ) {
                    re = new RegExp( re, this.getConf('urlRegexOpts') );
                    return re.test( url );
                }
                var base = this.getConf('baseUrl');
                if( base ) {
                    return url.indexOf( base ) != -1;
                }
                return false;
            }
          }

      ]
  },

  ready: function() {
      var thisB = this;
      return this._ready || ( this._ready = function() {
          return thisB._getCredentials();
      });
  },

  neededFor: function( resourceDefinition ) {
      return this.getConf('predicate', [ this, resourceDefinition ]);
  },

  _getCredentials: function() {
      throw new Error('override either _getCredentials() or ready() in a subclass');
  },

  clear: function() {
      var d = new Deferred();
      d.resolve();
      return d;
  }

  // implement this to decorate HTTP requests with tokens and so forth
  // decorateHTTPRequest: function( req ) {
  // }

});
});