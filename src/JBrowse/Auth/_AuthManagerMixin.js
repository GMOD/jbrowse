define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/promise/all',
           'dojo/Deferred',
           'JBrowse/Util'
       ],
       function(
           declare,
           array,
           lang,
           all,
           Deferred,
           Util
       ) {

return declare( null, {

  configSchema: {
      slots: [
          { name: 'credentials', type: 'multi-object',
            defaultValue: [
                {type:'Google'},
                {type:'Dropbox'}
            ]
          }
      ]
  },

  /**
   * Get a Deferred array of CredentialSlot objects, representing the
   * currently configured credential slots.
   */
  getCredentialSlots: function() {
      return this._credentialSlots || ( this._credentialSlots = function() {
          var conf = this.getConf('credentials');
          return all( array.map( conf, lang.hitch( this, '_instantiateSlot' )));
      }.call(this) );
  },

  /**
   * Instantiate a config slot object from a config definition.
   */
  _instantiateSlot: function( def ) {
      var classname = def.type;
      if( ! classname )
          throw new Error( "credentials definition has no `type`: "+JSON.stringify( def ) );
      if( classname.indexOf('/') == -1 )
          classname = "JBrowse/Auth/CredentialSlot/"+classname.replace(/\./g,'/');
      return Util.instantiate( classname, {browser: this.browser, config: def } );
  },

  // deferred
  addCredentialSlot: function( slot ) {
      return this.getCredentialSlots()
         .then( function( existing ) {
                    for( var i = 0; i < existing.length; i++ ) {
                        if( ! existing[i].compare( slot ) )
                            return;
                    }
                    existing.push( slot );
                });
  },

  /**
   * Return a Deferred list of all the needed credentials for a
   * resource object, making sure each one is ready to use before
   * resolving.
   */
  getCredentialsForRequest: function( request ) {
      return this.getCredentialSlots()
          .then( function( slots ) {
              var neededCredentials = array.filter(
                  slots,
                  function( credentialSlot ) {
                      return credentialSlot.neededFor( request );
                  });
              return all( array.map( neededCredentials, function(c) {
                                         return c.get( request )
                                                 .then(function(){ return c; });
                                     })
                        );
          });
  }

});
});