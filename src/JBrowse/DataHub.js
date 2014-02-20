/**
 *  A data hub is a logical grouping of track configurations,
 *  reference sequence sets, and data stores.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/when',
           'dojo/promise/all',
           'dojo/store/Memory',

           'JBrowse/Component',
           'JBrowse/Digest/Crc32',
           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           array,
           when,
           all,
           MemoryStore,

           Component,
           Digest,
           Util
       ) {
return declare( Component, {
  constructor: function(args) {
      this._trackCache = {};
      this.loaded = when(this);
  },

  configSchema: {
      slots: [
          { name: 'name', type: 'string' },
          { name: 'url', type: 'string', required: true },
          { name: 'stores', type: 'object', defaultValue: {} },
          { name: 'tracks', type: 'multi-object', defaultValue: [] },
          { name: 'referenceSets', type: 'multi-object', defaultValue: [] },

          { name: 'trackSelector', type: 'object', defaultValue: undefined,
            description: 'object holding track selector configuration for this data hub'
          },

          { name: 'defaultReferenceSetName', type: 'string',
            defaultValue: function(hub) {
                var sets = hub.getConf('referenceSets');
                return sets && sets[0] && sets[0].name || 'default';
            },
            description: "default reference sequence set to display"
          },

          { name: 'displayedReferenceSetNames', type: 'multi-string',
            description: 'array of names of reference sets that are currently set up to be displayed',
            defaultValue: []
          },

          { name: 'defaultReferenceSetClass', type: 'string',
            defaultValue: 'JBrowse/Model/ReferenceSet',
            description: "default JS class to use for instantiating reference"
                         + " set objects, if they don't have a class specified"
          }
      ]
  },

  _instantiateTrack: function( trackConf ) {
      var thisB = this;
      return this.openStore( trackConf.store )
          .then( function( store ) {
                     return Util.instantiateComponent(
                         { app: thisB.app,
                           dataHub: thisB,
                           store: store,
                           resourceUrl: thisB._makeResourceURL( 'track', trackConf.name )
                         },
                         trackConf,
                         'JBrowse/Track'
                     );
                 });
  },

  _makeResourceURL: function( type, name ) {
      return this.getConf('url').replace( /^http/, 'jbrowse-r' ) + '/' + type + '/' +escape( name );
  },

  _modifiable: false,

  isModifiable: function() {
      return this._modifiable;
  },

  getDisplayedReferenceSets: function() {
      var names = this.getConf('displayedReferenceSetNames');
      if( ! names.length && this.getConf('defaultReferenceSetName') )
          names = [ this.getConf('defaultReferenceSetName') ];
      return all( array.map( names, this.getReferenceSet, this ) )
          .then( function( sets ) {
                 return array.filter( sets, function(s) { return !!s; } );
             });
  },

  getTrack: function( trackName ) {
      if( typeof trackName == 'object' )
          trackName = trackName.getConf ? trackName.getConf('name') : trackName.name;

      return this._trackCache[ trackName ] || ( this._trackCache[trackName] = function() {
          var thisB = this;
          // get the track's record out of the metadata store, then instantiate the track object
          return this.getMetadataStore()
                     .then( function( metaStore ) {
                                return when( metaStore.get( 'tracks/'+trackName ) )
                                    .then( function( trackmeta ) {
                                               if( trackmeta && trackmeta.config )
                                                   return thisB._instantiateTrack( trackmeta.config );
                                               else {
                                                   console.warn( 'track "%s" not found in data hub "%s"',
                                                                 trackName, thisB.getConf('name') );
                                                   return undefined;
                                               }
                                           });
                            });
      }.call(this));
  },

  getReferenceSet: function( name ) {
      if( ! this._refSets ) this._refSets = {};
      if( name == 'default' )
          name = this.getConf('defaultReferenceSetName');

      return this._refSets[name] || ( this._refSets[name] = function() {
          // find the ref set's conf
          var conf;
          array.some( this.getConf('referenceSets'), function(c) {
              return ( c.name == name ) ? ( conf = c ) : false;
          });
          if( ! conf ) return Util.resolved(undefined);
          conf = lang.mixin( {}, conf, { dataHub: this, browser: this.browser } );

          // instantiate the ref set
          var thisB = this;
          if( conf.store )
              return this.openStore( conf.store )
                  .then( function( store ) {
                        return Util.instantiate(
                            lang.mixin(
                                { resourceUrl: thisB._makeResourceURL( 'refset', conf.name ) },
                                conf.type || thisB.getConf('defaultReferenceSetClass')
                            ),
                            lang.mixin({},conf,{store:store})
                        );
                   });
          else
              return Util.instantiate(
                  conf.type || thisB.getConf('defaultReferenceSetClass'),
                  conf
              );

      }.call(this));
  },

  makeTrackSelector: function( args ) {
      var thisB = this;
      return this.getMetadataStore()
          .then( function( store ) {
                     return Util.instantiateComponent(
                         lang.mixin(
                             { app: thisB.app, metaDataStore: store,
                               onTrackShow: function( trackNames ) {
                               },
                               onTrackHide: function( trackNames ) {
                               }
                             },
                             args
                         ),
                         thisB.getConf('trackSelector') || { type: 'Hierarchical' },
                         'JBrowse/View/TrackSelector'
                     );
                 });
  },

  getStore: function( storeName ) {
      return this.openStore( storeName );
  },

  // given a store name or store configuration, return a Deferred
  // store object for it.  if a store name, the store must be for data
  // in this data hub.
  openStore: function( storeNameOrConf ) {
      this._storeCache   = this._storeCache || {};
      this._storeClasses = this._storeClasses || {};

      var conf, storeName;
      if( ! storeNameOrConf ) {
          return Util.resolved(undefined);
      }
      else if( typeof storeNameOrConf !== 'string' ) {
          conf = storeNameOrConf;
          storeName = 'store'+Digest.objectFingerprint( conf );
      }
      else {
          storeName = storeNameOrConf;
          conf = this.getConf('stores')[ storeName ];
      }

      return this._storeCache[ storeName ] || ( this._storeCache[ storeName ] = function() {

          if( ! conf )
              throw new Error( "store '"+storeName+"' not found" );

          var storeClassName = conf.type;
          if( ! storeClassName )
              throw new Error( "store "+storeName+" has no type defined" );

          var thisB = this;
          return (
              this._storeClasses[storeClassName]
                  || ( this._storeClasses[storeClassName] = Util.loadJSClass(storeClassName) )
          ).then(function( storeClass ) {
                     return new storeClass(
                         {
                             browser: thisB.browser, config: conf, dataHub: thisB,
                             resourceUrl: thisB._makeResourceURL( 'store', storeName )
                         });
                 });
      }.call(this));
  },

  /**
   * Add a store configuration to the data hub.  If name is falsy or
   * missing, will autogenerate one.
   */
   uniqCounter: 0,
   addStoreConfig: function( /**String*/ name, /**Object*/ storeConfig ) {
       name = name || 'addedStore'+this.uniqCounter++;

       if( ! this._storeCache )
           this._storeCache = {};

       if( this.getConf('stores')[name] || this._storeCache[name] ) {
           throw "store "+name+" already exists!";
       }

       this.getConf('stores')[name] = storeConfig;
       return name;
   },

   /**
    * Get a deferred dojo.store object that can be used to connect this hub's
    * metadata to dijit widgets.
    */
   getMetadataStore: function() {
       var thisB = this;
       return this._dojoStore || ( this._dojoStore = function() {
               var resourceRecords = [];
               var stores = thisB.getConf('stores');
               for( var storename in stores ) {
                   resourceRecords.push(
                       lang.mixin( { id: 'stores/'+storename, name: storename, type: 'store', config: stores[storename] },
                                   stores[storename].metadata || {}
                                 )
                   );
               }

               var tracks = thisB.getConf('tracks');
               if( tracks.length ) {
                   array.forEach( tracks, function( t ) {
                       resourceRecords.push( lang.mixin( { id: 'tracks/'+t.name, name: t.name, type: 'track', config: t }, t.metadata || {} ));
                   });
               }

               var refSets = thisB.getConf('referenceSets');
               if( refSets.length ) {
                   array.forEach( refSets, function( r ) {
                       resourceRecords.push( lang.mixin( { id: 'refsets/'+r.name, name: r.name, type: 'refset', config: r }, r.metadata || {} ));
                   });
               }

               //console.log( resourceRecords );

               return when( new MemoryStore({
                   data: resourceRecords
               }) );
           }.call(this) );
   }

// /**
//  * Replace existing track configurations.
//  * @private
//  */
// _replaceTrackConfigs: function( /**Array*/ newConfigs ) {
//     if( ! this.trackConfigsByName )
//         this.trackConfigsByName = {};

//     array.forEach( newConfigs, function( conf ) {
//         if( ! this.trackConfigsByName[ conf.label ] ) {
//             console.warn("track with label "+conf.label+" does not exist yet.  creating a new one.");
//         }

//         this.trackConfigsByName[conf.label] =
//                            dojo.mixin( this.trackConfigsByName[ conf.label ] || {}, conf );
//    },this);
// },
// /**
//  * Delete existing track configs.
//  * @private
//  */
// _deleteTrackConfigs: function( configsToDelete ) {
//     // remove from this.config.tracks
//     this.config.tracks = array.filter( this.config.tracks || [], function( conf ) {
//         return ! array.some( configsToDelete, function( toDelete ) {
//             return toDelete.label == conf.label;
//         });
//     });

//     // remove from trackConfigsByName
//     array.forEach( configsToDelete, function( toDelete ) {
//         if( ! this.trackConfigsByName[ toDelete.label ] ) {
//             console.warn( "track "+toDelete.label+" does not exist, cannot delete" );
//             return;
//         }

//         delete this.trackConfigsByName[ toDelete.label ];
//     },this);
// },

});
});