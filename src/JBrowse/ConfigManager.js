define(
    [
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/_base/array',
        'dojo/Deferred',

        'JBrowse/Util'
    ],
    function(
        declare,
        lang,
        array,
        Deferred,

        Util
    ) {

return declare(null,

/**
 * @lends JBrowse.ConfigManager.prototype
 */
{

/**
 * @constructs
 */
constructor: function( args ) {
    this.bootConfig = lang.clone( args.bootConfig || {} );
    this.defaults = lang.clone( args.defaults || {} );
    this.browser = args.browser;
    this.skipValidation = args.skipValidation;
    // this.topLevelIncludes = this._fillTemplates(
    //     lang.clone( this.config.include || this.defaults.include ),
    //     this._applyDefaults( lang.clone( this.config ), this.defaults )
    // );
    // delete this.defaults.include;
    // delete this.config.include;
},

/**
 * @param callback {Function} callback, receives a single arguments,
 * which is the final processed configuration object
 */
getFinalConfig: function() {
    return this.finalConfig || ( this.finalConfig = function() {
        var thisB = this;
        var bootstrapConf = this._applyDefaults( lang.clone( this.bootConfig ), this.defaults );
        return this._loadIncludes( this._fillTemplates( bootstrapConf, bootstrapConf ) )
            .then( function( includedConfig ) {

                       // merge the boot config *into* the included config last, so
                       // that values in the boot config override the others
                       var finalConf = thisB._mergeConfigs( includedConfig, thisB.bootConfig );

                       thisB._fillTemplates( finalConf, finalConf );

                       if( ! thisB.skipValidation )
                           thisB._validateConfig( finalConf );

                       return finalConf;
                   });
    }.call(this) );
},

/**
 * Instantiate the right config adaptor for a given configuration source.
 * @param {Object} config the configuraiton
 * @param {Function} callback called with the new config object
 * @returns {Object} the right configuration adaptor to use, or
 * undefined if one could not be found
 * @private
 */

_getConfigAdaptor: function( config_def, callback ) {
    var adaptor_name = "JBrowse/ConfigAdaptor/" + config_def.format;
    if( 'version' in config_def )
        adaptor_name += '_v'+config_def.version;
    adaptor_name.replace( /\W/g,'' );
    return Util.loadJS( [adaptor_name] )
        .then( function( modules ) {
                   return new (modules[0])( config_def );
               });
},

_fillTemplates: function( subconfig, config ) {
    // skip "menuTemplate" keys to prevent messing
    // up their feature-based {} interpolation
    var skip = { menuTemplate: true };

    var type = typeof subconfig;
    if( lang.isArray( subconfig ) ) {
        for( var i = 0; i<subconfig.length; i++ )
            subconfig[i] = this._fillTemplates( subconfig[i], config );
    }
    else if( type == 'object' ) {
        for( var name in subconfig ) {
            if( subconfig.hasOwnProperty( name ) && !skip[name] )
                subconfig[name] = this._fillTemplates( subconfig[name], config );
        }
    }
    else if( type == 'string' ) {
        return Util.fillTemplate( subconfig, config );
    }

    return subconfig;
},

/**
 * Recursively fetch, parse, and merge all the includes in the given
 * config object.  Calls the callback with the resulting configuration
 * when finished.
 * @private
 */
_loadIncludes: function( inputConfig ) {
    var thisB = this;
    inputConfig = lang.clone( inputConfig );

    function _loadRecur( config ) {
        var includes = thisB._fillTemplates(
            thisB._regularizeIncludes( config.include || [] ),
            config
        );
        delete config.include;

        var current = Util.resolved( config );
        array.forEach(
            includes,
            function( include ) {
                current = current
                    .then( function() {
                               return thisB._loadInclude( include, config.baseUrl );
                           })
                    .then( function( includedData ) {
                               return _loadRecur( thisB._mergeConfigs( config, includedData ) );
                           });
            });

        return current;
    }

    return _loadRecur( inputConfig );
},

_loadInclude: function( include, baseUrl ) {
    var thisB = this;
    // instantiate the adaptor and load the config
    return this._getConfigAdaptor( include )
        .then( function( adaptor ) {
                   if( !adaptor )
                       throw new Error(
                           "Could not load config "+include.url+", "
                               + "no configuration adaptor found for config format "
                               +include.format+' version '+include.version
                       );

                   return adaptor.load(
                       { config: include,
                         baseUrl: baseUrl
                       });
               });
},


_regularizeIncludes: function( includes ) {
    if( ! includes )
        return [];

    // coerce include to an array
    if( typeof includes != 'object' )
        includes = [ includes ];

    // include array might have undefined elements in it if
    // somebody left a trailing comma in and we are running under
    // IE
    includes = array.filter( includes, function(r) { return r; } );

    return array.map( includes, function( include ) {
        // coerce bare strings in the includes to URLs
        if( typeof include == 'string' )
            include = { url: include };

        // set defaults for format and version
        if( ! ('format' in include) ) {
            include.format = 'JB_json';
        }
        if( include.format == 'JB_json' && ! ('version' in include) ) {
            include.version = 1;
        }
        return include;
   });
},

/**
 * @private
 */
_mergeIncludes: function( inputConfig, config_includes ) {
    // load all the configuration data in order
    dojo.forEach( config_includes, function( config ) {
                      if( config.loaded && config.data )
                              this._mergeConfigs( inputConfig, config.data );
                  }, this );
    return inputConfig;
},

/**
 * @private
 */
_applyDefaults: function( config, defaults ) {
    return Util.deepUpdate( dojo.clone(defaults), config );
},

/**
 * Examine the loaded and merged configuration for errors.  Throws
 * exceptions if it finds anything amiss.
 * @private
 * @returns nothing meaningful
 */
_validateConfig: function( c ) {
    if( ! c.tracks )
        c.tracks = [];
    if( ! c.baseUrl ) {
        this._fatalError( 'Must provide a <code>baseUrl</code> in configuration' );
    }
    if( this.hasFatalErrors )
        throw "Errors in configuration, cannot start.";
},

/**
 * @private
 */
_fatalError: function( error ) {
    this.hasFatalErrors = true;
    // if( error.url )
    //     error = error + ' when loading '+error.url;
    this.browser.fatalError( error );
},

/**
 * Merges config object b into a.  a <- b
 * @private
 */
_mergeConfigs: function( a, b ) {
    if( b === null )
        return null;

    if( a === null )
        a = {};

    for (var prop in b) {
        if( prop == 'tracks' && (prop in a) ) {
            a[prop] = this._mergeTrackConfigs( a[prop] || [], b[prop] || [] );
        }
        else if ( (prop in a)
              && ("object" == typeof b[prop])
              && ("object" == typeof a[prop]) ) {
            a[prop] = Util.deepUpdate( a[prop], b[prop] );
        } else if( typeof a[prop] == 'undefined' || typeof b[prop] != 'undefined' ){
            a[prop] = b[prop];
        }
    }
    return a;
},

/**
 * Special-case merging of two <code>tracks</code> configuration
 * arrays.
 * @private
 */
_mergeTrackConfigs: function( a, b ) {
    if( ! b.length ) return;

    // index the tracks in `a` by track label
    var aTracks = {};
    dojo.forEach( a, function(t,i) {
        t.index = i;
        aTracks[t.label] = t;
    });

    dojo.forEach( b, function(bT) {
        var aT = aTracks[bT.label];
        if( aT ) {
            this._mergeConfigs( aT, bT );
        } else {
            a.push( bT );
        }
    },this);

    return a;
}

});
});

