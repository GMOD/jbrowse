define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/promise/all',

           'JBrowse/Store/MultiTrackMetaData',
           'JBrowse/Util'
       ],
       function(
           declare,
           array,
           all,

           MultiMetaStore,
           Util
       ) {
return declare( null, {
  configSchema: {
      slots: [
          { name: 'defaultDataHubName', type: 'string', defaultValue: 'default',
            description: 'name of the data hub to use by default'
          },

          { name: 'dataHubs', type: 'multi-object',
            description: 'configuration objects for each available data hub',
            defaultValue: function( mgr ) {
                return [
                    { type: 'JSON',
                      name: 'default',
                      include: [ mgr.getConf('dataRoot')+'/trackList.json']
                    }
                ];
            }
          }
      ]
  },

  _initDataHubs: function() {
      var hubConf = this.getConf('dataHubs');
      this._dataHubs = {};
      array.forEach( hubConf, function(c) {
          this.addDataHub( c );
      }, this );

      this._initTrackMetadata();
  },

  _initTrackMetadata: function() {
      var metaStoresD = [];
      for( var n in this._dataHubs ) {
          metaStoresD.push(
              this._dataHubs[n].then( function(h) {
                  return h.getTrackMetadataStore();
              })
          );
      }
      var thisB = this;
      all( metaStoresD )
          .then( function( metaStores ) {
                     var globalTrackMetadataStore = new MultiMetaStore({ stores: metaStores });
                     thisB.set( 'trackMetadataStore', globalTrackMetadataStore );
                 });
  },

  // add a data hub from configuration.  returns a Deferred for the new datahub object.
  addDataHub: function( conf ) {
      var name = conf.name;
      if( ! name ) throw new Error('data hub has no name');

      var hubConf = this.getConf('dataHubs');
      hubConf[name] = conf;
      this.setConf( 'dataHubs', hubConf );

      var hubD = this._dataHubs[name] = Util.instantiateComponent( { browser: this.browser, dataHubManager: this }, conf, 'JBrowse/DataHub' );
      var thisB = this;

      // connect this new data hub to the global metadata store if it has already been created
      var trackmeta;
      if(( trackmeta = this.get('trackMetadataStore') )) {
          return hubD.then( function(hub) {
                                return hub.getMetaStore()
                                    .then( function(hubstore) {
                                               trackmeta.addStore( hubstore );
                                               return hub;
                                           });
                            });
      }
      // otherwise just return the deferred hub
      else
          return hubD;
  },

  removeDataHub: function( hubName ) {
      if( this._dataHubs[hubName] )
          delete this._dataHubs[hubName];
  },

  getDataHub: function( name ) {
      if( name == 'default' )
          name = this.getConf('defaultDataHubName');

      return this._dataHubs[name];
  },

  getReferenceSet: function( hubName, refSetName ) {
      return this.getDataHub( hubName )
          .then( function(hub) {
                     return hub && hub.getReferenceSet( refSetName ) || undefined;
                 });
  },

  getTrack: function( hubName, trackName ) {
      return this.getDataHub( hubName )
          .then(function(hub) { return hub.getTrack( trackName ); } );
  },

  getStore: function( hubName, storeName ) {
      return this.getDataHub( hubName )
          .then( function(hub) { return hub.getStore( storeName ); });
  }

});
});