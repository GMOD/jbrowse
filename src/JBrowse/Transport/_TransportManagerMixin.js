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
          new HTTPTransport({ browser: this }),
          new GoogleDrive({ browser: this })
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
  }

});
});