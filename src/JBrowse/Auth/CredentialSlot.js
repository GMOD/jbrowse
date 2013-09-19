define([
           'dojo/_base/declare',
           'dojo/Deferred',
           'JBrowse/Util',
           'JBrowse/Component'
       ],
       function(
           declare,
           Deferred,
           Util,
           Component
       ) {

return declare( Component, {

  configSchema: {
      slots: [
          { name: 'type', type: 'string', required: true },

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

  ready: function() {
      return this._ready || ( this._ready = this._getCredentials() );
  },

  neededFor: function( resourceDefinition ) {
      return this.getConf('predicate', [ this, resourceDefinition ]);
  },

  _getCredentials: function() {
      throw new Error('override either _getCredentials() or ready() in a subclass');
  },

  release: function() {
      delete this._ready;
      return Util.resolved(true);
  }

  // implement this to decorate HTTP requests with tokens and so forth
  // decorateHTTPRequest: function( req ) {
  // }

});
});