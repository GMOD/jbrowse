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
          { name: 'credentials', type: 'multi-object' }
      ]
  },

  /**
   * Get a Deferred array of CredentialSlot objects, representing the
   * currently configured credential slots.
   */
  getCredentialSlots: function() {
      var thisB = this;
      return this._credentialSlots || ( this._credentialSlots = function() {
          var conf = this.getConf('credentials');
          return all( array.map( conf, lang.hitch( thisB, '_inflateSlotDefinition' )));
      }.call(this) );
  },

  _inflateSlotDefinition: function( def ) {
      var classname = def.type;
      if( ! classname )
          throw new Error( "credentials definition has no `type`: "+JSON.stringify( def ) );
      if( classname.indexOf('/') == -1 )
          classname = "JBrowse/Auth/Credential/"+classname;
      return Util.loadJS( classname )
          .then( function( slotClass ) {
                     return new SlotClass({ browser: thisB.browser, config: def });
                 });
  },

  // deferred
  addCredentialSlot: function( slot ) {
      return this.getCredentialSlots()
         .then( function( existing ) {
                    for( var i = 0; i < existing.length; i++ ) {
                        if( ! existing[i].compare( slot ) )
                            return;
                    }
                    this._credentialSlots.push( slot );
                });
  },

  // deferred
  getCredentialsForResource: function( resourceDefinition ) {
      return this.getCredentialSlots()
          .then( function( slots ) {
              var credentials = array.filter(
                  slots,
                  function( credentialSlot ) {
                      return credentialSlot.neededFor( resourceDefinition );
                  });
              return credentials;
              // return all( array.map( credentials, function(c) { return c.ready(); } ) )
              //           .then( lang.hitch( d, 'resolve' ), lang.hitch( d, 'reject' ) );
          });
  }
});
});