/**
 * Mixin for JBrowse/Component that contains all of the stuff related
 * to configuration.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'JBrowse/Util',
           'JBrowse/Model/Configuration/Schema'
       ],
       function(
           declare,
           lang,
           array,
           Util,
           ConfigSchema
       ) {

return declare( null, {

    constructor: function( args ) {
        args = args || {};

        this.browser = args.browser;
        this.declaredClass = this.constructor.prototype.declaredClass;

        this._finalizeConfig( args.baseConfig || args.config, args.localConfig );
    },

    _finalizeConfig: function( baseConfig, localConfig ) {
        this._config = this._configSchema().newConfig( baseConfig );
        // TODO: import local config here

        var missing = this._config.missingRequired();
        if( missing && missing.length ) {
            throw new Error( "Missing required configuration: "+missing.join(', ') );
        }
    },

    // assembles the complete config schema for this object by
    // composing the configSchema members of all the classes and
    // mixins it inherits from, in C3 order.
    _configSchema: function() {
        function composeConfigSchema( obj ) {
            return obj.constructor._composedConfigSchema
                || ( obj.constructor._composedConfigSchema = function() {

                         var defs = array.map( this.constructor._meta.bases.slice(1), function( baseClass ) {
                                                   return composeConfigSchema( baseClass.prototype );
                                               });
                         defs.unshift( this.constructor._meta.bases[0].prototype.configSchema||{} );
                         defs = defs.reverse();
                         defs.unshift( {} );

                         // compose most of the properties with a mixin
                         var composed = lang.mixin.apply( lang, defs );

                         // compose the slots separately
                         composed.slots = [];
                         for( var i=0; i<defs.length; i++ ) {
                             if( defs[i].slots )
                                 composed.slots.push.apply( composed.slots, defs[i].slots );
                         }

                         return composed;
                     }.call( obj ) );
        }

        return this.__configSchema || ( this.__configSchema = new ConfigSchema( composeConfigSchema( this ) ));
    },

    // fetch this component's local configuration from browser localstorage
    _getLocalConfig: function() {
        return {};
    },

    configSchema: {
        slots: [
            { name: 'baseUrl', type: 'string', defaultValue: '.' },
            { name: 'type', type: 'string',
              description: 'JS class path for this object',
              defaultValue: function(obj) { return obj.declaredClass; }
            }
        ]
    },

    /**
     * Return an object containing all information that should be
     * saved across browser reloads in order to reconstruct the
     * current state of this object.
     */
    getState: function() {
        return this._config.exportLocal();
    },

    resolveUrl: function( url, args ) {
        args = args || {};
        return Util.resolveUrl(
            this.getConf('baseUrl',[]),
            this.fillTemplate( url, args )
        );
    },

    exportMergedConfig: function() {
        return this._config.exportMerged();
    },
    exportBaseConfig: function() {
        return this._config.exportBase();
    },
    exportLocalConfig: function() {
        return this._config.exportLocal();
    },

    /**
     * Given a dot-separated string configuration path into the config
     * (e.g. "style.bg_color"), get the value of the configuration.
     *
     * If args are given, evaluate the configuration using them.
     * Otherwise, return a function that returns the value of the
     * configuration when called.
     */
    getConf: function( path, args ) {
        return this._config.get( path, args || [ this ] );
    },
    getConfFunc: function( path ) {
        return this._config.getFunc( path );
    },
    confIsSet: function( path ) {
        return !! this._config.getRaw( path );
    },

    setConf: function( path, value ) {
        if( ! this._config )
            throw new Error('setConf attempted with no component configuration');

        return this._config.set( path, value );
    },

    watchConf: function( path, callback ) {
        return this._config.watch( path, callback );
    }
});
});