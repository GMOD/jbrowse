define([
           'dojo/_base/declare',
           'dojo/Deferred',
           'dojo/request',
           'JBrowse/Auth/CredentialSlot'
       ],
       function(
           declare,
           Deferred,
           request,
           CredentialSlot
       ) {

return declare( CredentialSlot, {

  configSchema: {
      slots: [
          { name: 'realm', type: 'string', defaultValue: 'Restricted' },
          { name: 'baseUrl', type: 'string' },
          { name: 'urlRegex', type: 'string' },
          { name: 'urlRegexOpts', type: 'string', defaultValue: '' },
          { name: 'predicate', type: 'function', defaultValue: function( slot, url ) {
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

  neededFor: function( resourceDefinition ) {
      return this.getConf('predicate', [ this, resourceDefinition.url ]);
  },

  _getCredentials: function() {
      request(
  }

});
});
