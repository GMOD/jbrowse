/**
 * A JBrowse component keeps a reference to the main browser object, and is configurable.
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
           ConfigSchema,
           Configuration
       ) {

var Component = declare( null, {

    constructor: function( args ) {
        args = args || {};

        this._finalizeConfig( args.baseConfig || args.config, args.localConfig );

        this.browser = args.browser;
    },

    _finalizeConfig: function( baseConfig, localConfig ) {
        this._config = this._configSchema().newConfig( baseConfig );
        // TODO: import local config here
    },

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
            { name: 'baseUrl', type: 'string', defaultValue: '/' }
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
        return this._config.set( path, value );
    },

    /**
     * Given a string with templating strings like {refseq}, fill them
     * in using the given values.
     *
     * With no additional values given, knows how to interpolate
     * {refseq}, {refSeq}, {refSeqNum}, and {refSeqNumNoLeadingZeroes}.
     *
     * @param {String} str string to interpolate values into
     * @param {Object} values optional object with additional values that can be interpolated
     * @returns new string with interpolations
     */
    fillTemplate: function( str, values ) {

        // skip if it's not a string or the string has no interpolations
        if( typeof str != 'string' || str.indexOf('{') == -1 )
            return str;

        // fill in a bunch of args for this.refSeq or this.ref
        var templateFillArgs = {
            'refseq': (this.refSeq||{}).name || (this.ref||{}).name || this.ref || ''
        };
        templateFillArgs.refSeq = templateFillArgs.refseq;

        if( templateFillArgs.refSeq ) {
            templateFillArgs.refSeqNum = ( /\d+/.exec( templateFillArgs.refSeq ) || [] )[0] || '';
        }
        // make refseqNumNoLeadingZeroes
        if( templateFillArgs.refSeqNum ) {
            templateFillArgs.refSeqNumNoLeadingZeroes = ( /^0*(\d+)/.exec( templateFillArgs.refSeqNum ) || [] )[1] || '';
        }

        if( values )
            lang.mixin( templateFillArgs, values );

        return Util.fillTemplate( str, templateFillArgs );
    }
});
return Component;
});