define(
    [
        'dojo/_base/declare',
        'JBrowse/Util'
    ],
function( declare, Util ) { return declare(null,

/**
 * @lends JBrowse.ConfigManager.prototype
 */
{

/**
 * @constructs
 */
constructor: function( args ) {
    this.config = dojo.clone( args.config || {} );
    this.browser = args.browser;
    this.skipValidation = args.skipValidation;
    this.topLevelIncludes = this.config.include;
    delete this.config.include;
},

getFinalConfig: function( callback ) {
    this._loadIncludes({ include: this.topLevelIncludes }, dojo.hitch( this, function( includedConfig ) {

        // merge the root config *into* the included config last, so
        // that values in the root config override the others
        this._mergeConfigs( includedConfig, this.config );
        this.config = includedConfig;

        // now validate the final merged config, and finally give it
        // to the callback
        this._applyDefaults( this.config );
        if( ! this.skipValidation )
            this._validateConfig( this.config );
        callback( this.config );
    }));
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
    return require([adaptor_name], function(adaptor_class) {
        callback( new adaptor_class( config_def ) );
    });
},

/**
 * Recursively fetch, parse, and merge all the includes in the given
 * config object.  Calls the callback with the resulting configuration
 * when finished.
 * @private
 */
_loadIncludes: function( inputConfig, callback ) {
    inputConfig = dojo.clone( inputConfig );

    var includes = inputConfig.include || [];
    delete inputConfig.include;

    // coerce include to an array
    if( typeof includes != 'object' )
        includes = [ includes ];
    // coerce bare strings in the includes to URLs
    for (var i = 0; i < includes.length; i++) {
        if( typeof includes[i] == 'string' )
            includes[i] = { url: includes[i] };
    }

    var configs_remaining = includes.length;
    var included_configs = dojo.map( includes, function( include ) {
        var loadingResult = {};

        // include array might have undefined elements in it if
        // somebody left a trailing comma in and we are running under
        // IE
        if( !include )
            return loadingResult;

        // set defaults for format and version
        if( ! ('format' in include) ) {
            include.format = 'JB_json';
        }
        if( include.format == 'JB_json' && ! ('version' in include) ) {
            include.version = 1;
        }

        // instantiate the adaptor and load the config
        this._getConfigAdaptor( include, dojo.hitch(this, function(adaptor) {
            if( !adaptor ) {
                loadingResult.error = "Could not load config "+include.url+", no configuration adaptor found for config format "+include.format+' version '+include.version;
                return;
            }

            adaptor.load({
                config: include,
                baseUrl: inputConfig.baseUrl,
                onSuccess: dojo.hitch( this, function( config_data ) {
                    this._loadIncludes( config_data, dojo.hitch(this, function( config_data_with_includes_resolved ) {
                        loadingResult.loaded = true;
                        loadingResult.data = config_data_with_includes_resolved;
                        if( ! --configs_remaining )
                            callback( this._mergeIncludes( inputConfig, included_configs ) );
                           //if you need a backtrace: window.setTimeout( function() { that.onConfigLoaded(); }, 1 );
                     }));
                }),
                onFailure: dojo.hitch( this, function( error ) {
                    loadingResult.error = error;
                    console.error(error);
                    if( ! --configs_remaining )
                        callback( this._mergeIncludes( inputConfig, included_configs ) );
                        //if you need a backtrace: window.setTimeout( function() { that.onConfigLoaded(); }, 1 );
                })
            });
        }));
        return loadingResult;
    }, this);

    // if there were not actually any includes, just call our callback
    if( ! included_configs.length ) {
        callback( inputConfig );
    }
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

_applyDefaults: function( config ) {
    if( ! config.tracks )
        config.tracks = [];
},

/**
 * Examine the loaded and merged configuration for errors.  Throws
 * exceptions if it finds anything amiss.
 * @private
 * @returns nothing meaningful
 */
_validateConfig: function( c ) {
    if( ! c.baseUrl ) {
        this._fatalError( 'Must provide a <code>baseUrl</code> in configuration' );
    }
    if( this.hasFatalErrors )
        throw "Errors in configuration, aborting.";
},

_fatalError: function( error ) {
    this.hasFatalErrors = true;
    console.error(error);
    this.browser.fatalError( error );
},

/**
 * Merges config object b into a.  a <- b
 * @private
 */
_mergeConfigs: function( a, b, spaces ) {
    for (var prop in b) {
        if( prop == 'tracks' && (prop in a) ) {
            this._mergeTrackConfigs( a[prop], b[prop] );
        }
        else if ( (prop in a)
              && ("object" == typeof b[prop])
              && ("object" == typeof a[prop]) ) {
            this._mergeConfigs(a[prop], b[prop]);
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
}

});
});

