/**
 * A JBrowse component keeps a reference to the main browser object, and is configurable.
 */

define([
           'dojo/_base/declare',
           'JBrowse/Util'
       ],
       function(
           declare,
           Util
       ) {

return declare( null, {

    constructor: function( args ) {
        args = args || {};

        // merge our config with the config defaults
        this._finalizeConfig( args.config );

        this.browser = args.browser;
        if( ! this.browser )
            throw "a reference to the main browser is required by this constructor";

        this.compiledConfig = {};
    },

    _finalizeConfig: function( config ) {
        this.config = this._mergeConfigs( dojo.clone( this._defaultConfig() ), config || {} );
    },

    _defaultConfig: function() {
        return {
            baseUrl: '/'
        };
    },

    resolveUrl: function( url, args ) {
        args = args || {};
        return Util.resolveUrl(
            this.getConf('baseUrl',[]),
            Util.fillTemplate( url,
                               args
                             )
        );

    },

    _mergeConfigs: function(a, b) {
        for (var prop in b) {
            if ((prop in a)
                && ("object" == typeof b[prop])
                && ("object" == typeof a[prop]) ) {
                this._mergeConfigs( a[prop], b[prop] );
            } else if( typeof a[prop] == 'undefined' || typeof b[prop] != 'undefined' ){
                a[prop] = b[prop];
            }
        }
        return a;
    },

    _compileConfigurationPath: function( path ) {
        var confVal = this.config;

        if( typeof path == 'string' )
            path = path.split('.');
        while( path.length && confVal )
            confVal = confVal[ path.shift() ];

        if( path.length )
            return function() { return null; };

        return typeof confVal == 'function'
            ? confVal
            : function() { return confVal; };
    },

    /**
     * Given a dot-separated string configuration path into the config
     * (e.g. "style.bg_color"), get the value of the configuration.
     * If args are given, evaluate the configuration using them.
     * Otherwise, return a function that returns the value of the
     * configuration when called.
     */
    getConf: function( path, args ) {
        var func = this.compiledConfig[path];
        if( ! func ) {
            func = this.compiledConfig[path] = this._compileConfigurationPath( path );
        }

        return args ? func.apply( this, args ) : func.call( this );
    }
});
});