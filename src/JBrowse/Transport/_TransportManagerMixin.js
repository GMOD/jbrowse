define([
           'dojo/_base/declare',
           'JBrowse/Transport/HTTP',
           'JBrowse/Transport/GoogleDrive'
       ],
       function(
           declare,
           HTTPTransport,
           GoogleDrive
       ) {
return declare( null, {

  constructor: function() {
      this._initTransportDrivers();
  },

  _initTransportDrivers: function() {
      // instantiate the default transport drivers
      this._transportDrivers = [
          new HTTPTransport({ transportManager: this, authManager: this }),
          new GoogleDrive({ transportManager: this, authManager: this })
      ];
  },

  getTransport: function( name ) {
      for( var i = 0; i<this._transportDrivers.length; i++ ) {
          if( this._transportDrivers[i].name == name )
              return this._transportDrivers[i];
      }
      return undefined;
  },

  // can be called by plugins to add their own transport drivers
  addTransportDriver: function( driver ) {
      this._transportDrivers.unshift( driver );
  },

  getTransportForResource: function( resourceDef ) {
      for( var i = 0; i < this._transportDrivers.length; i++ ) {
          if( this._transportDrivers[i].canHandle( resourceDef ) )
              return this._transportDrivers[i];
      }
      return undefined;
  },

  request: function( resource, requestOpts ) {
      var transport = this.browser.getTransportForResource( resource );
      if( ! transport )
          throw new Error( 'no transport driver found for resource '+resourceDef );
      if( ! transport.request )
          throw new Error( 'error requesting '+resource+', transport driver '+transport.name+' does not support request()');

      return transport.request( resource, requestOpts );
  },

  openResource: function( resourceClass, resourceDef, transportOpts) {
      var transport = this.getTransportForResource( resourceDef );
      if( ! transport )
          throw new Error( 'no transport driver found for resource '+resourceDef );
      return new resourceClass({ authManager: this, transport: transport, resource: resourceDef, transportOpts: transportOpts });
  }

});
});