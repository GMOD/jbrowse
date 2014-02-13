define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',

           'JBrowse/Util/DeferredGenerator',
           'JBrowse/ConfigManager',
           'JBrowse/Util',
           '../DataHub'
       ],
       function(
           declare,
           lang,
           Deferred,

           DeferredGenerator,
           ConfigLoader,
           Util,
           DataHub
       ) {
return declare( DataHub, {

  constructor: function( args ) {
      this._inputConfig = args.config;
      this.metadataStore = this._loadMetaStore();
  },

  _loadConf: function() {
      var c = new ConfigLoader(
          { config: this._inputConfig || {},
            defaults: {},
            browser: this.browser
          });
      var thisB = this;
      return c.getFinalConfig()
          .then( function( finishedConfig ) {
                     thisB._finalizeConfig( finishedConfig, thisB._getLocalConfig() );
                 });
  },

  configSchema: {
      slots: [
          { name: 'trackMetadata', type: 'object', defaultValue: {},
            description: 'track metadata configuration'
          }
      ]
  },

  getReferenceSet: function() {
      var args = arguments;
      var thisB = this;
      return this._loadConf()
          .then( function() {
                     return thisB.inherited(args);
                 });
  },

  openStore: function() {
      var args = arguments;
      var thisB = this;
      return this._loadConf()
          .then( function() {
                     return thisB.inherited(args);
                 });
  },

   // initialize our track metadata
  _loadMetaStore: function( callback ) {
      var thisB = this;
      return this._loadConf()
          .then( function() {
                     var metaConf = thisB.getConf('trackMetadata');
                     var metadataSourceClasses = dojo.map(
                         metaConf.sources,
                         function( sourceDef ) {
                             var url  = sourceDef.url || 'trackMeta.csv';
                             var type = sourceDef.type || (
                                     /\.csv$/i.test(url)     ? 'csv'  :
                                     /\.js(on)?$/i.test(url) ? 'json' :
                                     'csv'
                             );
                             var storeClass = sourceDef['class']
                                 || { csv: 'dojox/data/CsvStore', json: 'dojox/data/JsonRestStore' }[type];
                             if( !storeClass ) {
                                 console.error( "No store class found for type '"
                                                +type+"', cannot load track metadata from URL "+url);
                                 return null;
                             }
                             return { class_: storeClass, url: url };
                         });

                     var classes = ['JBrowse/Store/TrackMetaData']
                         .concat( dojo.map( metadataSourceClasses, function(c) { return c.class_; } ) );

                     return Util.loadJS( classes )
                         .then( function( classes ) {
                                    var mdStores = [];
                                    for( var i = 1; i<classes.length; i++ ) {
                                        mdStores.push( new (arguments[i])({url: metadataSourceClasses[i-1].url}) );
                                    }

                                    var store = new classes[0](
                                        lang.mixin(
                                            {},
                                            thisB.getConf('trackMetadata'),
                                            {
                                                trackConfigs: thisB.getConf('tracks'),
                                                browser: thisB.browser,
                                                metadataStores: mdStores
                                            })
                                    );
                                    var d = new Deferred();
                                    store.onReady( d, function() { d.resolve( store ); } );
                                    return d;
                                });
                 });
  },

  getDisplayedReferenceSets: function() {
      var args = arguments;
      var thisB = this;
      return this._loadConf()
          .then( function() {
                     return thisB.inherited( args );
                 });
  },

  getMetadataStore: function() {
      var args = arguments;
      var thisB = this;
      return this._loadConf()
          .then( function() {
                     return thisB.inherited( args );
                 });
  }

});
});


