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
          { name: 'defaultDataHubUrl', type: 'string',
            description: 'name of the data hub to use by default'
          },

          { name: 'dataHubs', type: 'multi-object',
            description: 'configuration objects for each available data hub',
            defaultValue: function( mgr ) {
                return [
                    { type: 'JSON',
                      url: mgr.getConf('dataRoot')+'/hub.json'
                    }
                ];
            }
          }
      ]
  },

  _initDataHubs: function() {
      var hubConf = this.getConf('dataHubs');
      this._dataHubs = {};
      var ops =
          array.map( hubConf, function(c) {
                         return this.addDataHub( c );
                     }, this );
      ops.push( this._initTrackMetadata() );
      return all(ops);
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
      var hubConf = this.getConf('dataHubs');
      hubConf[conf.url] = conf;
      this.setConf( 'dataHubs', hubConf );

      var thisB = this;
      var hubD = this._dataHubs[conf.url] =
          Util.instantiateComponent(
              { browser: this.browser, dataHubManager: this }, conf, 'JBrowse/DataHub'
          )
          // after the hub is loaded, put it in our hash of hubs under its real name
          .then( function( hub ) {
                     return hub.loaded;
                 });

      // connect this new data hub to the global metadata store if it
      // has already been created
      var trackmeta;
      if(( trackmeta = this.get('trackMetadataStore') )) {
          return hubD.then(
              function(hub) {
                  return hub.getMetadataStore()
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

  removeDataHub: function( url ) {
      if( this._dataHubs[url] )
          delete this._dataHubs[url];
  },

  getDataHub: function( url ) {
      // return a specific one if possible
      if( url || url == 'default' && ( url = this.getConf('defaultDataHubUrl') ) )
          return this._dataHubs[url];

      // otherwise just return the first one in storage
      for( var u in this._dataHubs )
          return this._dataHubs[u];

      return undefined;
  },

  // get an array of names of each available data hub
  listAvailableDataHubs: function() {
      var k = [];
      for( var n in this._dataHubs )
          k.push( n );
      return k.sort();
  },

  getReferenceSet: function( hubUrl, refSetName ) {
      return this.getDataHub( hubUrl )
          .then( function(hub) {
                     return hub && hub.getReferenceSet( refSetName ) || undefined;
                 });
  },

  getTrack: function( hubUrl, trackName ) {
      return this.getDataHub( hubUrl )
          .then( function(hub) {
                     return hub.getTrack( trackName );
                 });
  },

  getStore: function( hubUrl, storeName ) {
      return this.getDataHub( hubUrl )
          .then( function(hub) {
                     return hub.getStore( storeName );
                 });
  }

});
});