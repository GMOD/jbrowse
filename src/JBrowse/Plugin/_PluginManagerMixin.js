define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/Deferred',
           'dojo/promise/all',

           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           array,
           Deferred,
           all,

           Util
       ) {

return declare( null,  {

  configSchema: {
      slots: [
          { name: 'plugins',  type: 'multi-object',
            description: 'array of plugin configuration objects'
          }
      ]
  },

  /**
   * Get a plugin, if it is present.  Note that, if plugin
   * initialization is not yet complete, it may be a while before the
   * callback is called.
   *
   * Callback is called with one parameter, the desired plugin object,
   * or undefined if it does not exist.
   */
  getPlugin: function( name ) {
      return this.loadPlugins()
          .then( function( plugins ) {
                     return plugins[name];
                 });
  },

  _corePlugins: function() {
      return ['RegexSequenceSearch'];
  },

  /**
   * Load and instantiate any plugins defined in the configuration.
   */
  loadPlugins: function() {
      return this.plugins || ( this.plugins = (function() {
          var thisB = this;
          var pluginsToLoad = this._corePlugins().concat( this.getConf('plugins') );

          // coerce plugins to array of objects
          pluginsToLoad = array.map( pluginsToLoad, function( p ) {
              return typeof p == 'object' ? p : { 'name': p };
          });

          // set default locations for each plugin
          array.forEach( pluginsToLoad, function(p) {
              if( !( 'location' in p ))
                  p.location = 'plugins/'+p.name;

              var resolved = this.resolveUrl( p.location );

              // figure out js path
              if( !( 'js' in p ))
                  p.js = p.location+"/js"; //URL resolution for this is taken care of by the JS loader
              if( p.js.charAt(0) != '/' && ! /^https?:/i.test( p.js ) )
                  p.js = '../'+p.js;

              // figure out css path
              if( !( 'css' in p ))
                  p.css = resolved+"/css";
          },this);

          var pluginDeferreds = array.map( pluginsToLoad, function() { return new Deferred(); });

          var pluginObjectsByName = {};
          require( {
                       packages: array.map(
                           pluginsToLoad, function(p) {
                               return {
                                   name: p.name,
                                   location: p.js
                               };
                           })
                   },
                   array.map( pluginsToLoad, function(p) { return p.name; } ),
                   function() {
                       array.forEach( arguments, function( PluginClass, i ) {
                               var pluginConf = pluginsToLoad[i];
                               var thisPluginDone = pluginDeferreds[i];
                               if( typeof pluginClass == 'string' ) {
                                   thisPluginDone.reject( "could not load plugin "+pluginConf.name+": "+PluginClass );
                               }
                               else {
                                   // load its css and then instantiate it
                                   thisB._loadCSS(
                                       { url: thisB.resolveUrl( pluginConf.css+'/main.css' ) }
                                   ).then( function() {
                                               pluginObjectsByName[ pluginConf.name ] =
                                                   new PluginClass(
                                                       // make the plugin's arguments out of
                                                       // its conf in 'plugins'
                                                       lang.mixin(
                                                           {},
                                                           pluginConf,
                                                           { config: pluginConf.config || {},
                                                             app: thisB
                                                           }
                                                       ));

                                               thisPluginDone.resolve();
                                           });
                               }
                           });
                    });

          return all( pluginDeferreds )
              .then( function() { return pluginObjectsByName; });
      }).call(this) );
  }
});
});
