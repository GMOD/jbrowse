
//////////////////////////////

define(
    [
        'dojo/_base/declare'
    ],
function( declare ) { return declare(null,

/**
 * @lends JBrowse.ConfigManager.prototype
 */
{

/**
 * @constructs
 */
constructor: function( args ) {
    this.browser = args.browser;
},

load: function( inputConfig, callback ) {

},

/**
 * Instantiate the right config adaptor for a given configuration source.
 * @param {Object} config the configuraiton
 * @param {Function} callback called with the new config object
 * @returns {Object} the right configuration adaptor to use, or
 * undefined if one could not be found
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

_loadIncludes: function( inputConfig, callback ) {
    var config = dojo.clone( inputConfig );

    // coerce include to an array
    if( typeof config.include != 'object' || !config.include.length )
        config.include = [ config.include ];

    // coerce bare strings in the includes to URLs
    for (var i = 0; i < config.include.length; i++) {
        if( typeof config.include[i] == 'string' )
            config.include[i] = { url: config.include[i] };
    }

    // fetch and parse all the configuration data
    var configs_remaining = config.include.length;
    var included_configs = dojo.map( config.include, function(config) {
        var loadingResult = {};

        // include array might have undefined elements in it if
        // somebody left a trailing comma in and we are running under
        // IE
        if( !config )
            return loadingResult;

        // set defaults for format and version
        if( ! ('format' in config) ) {
            config.format = 'JB_json';
        }
        if( config.format == 'JB_json' && ! ('version' in config) ) {
            config.version = 1;
        }

        // instantiate the adaptor and load the config
        this.getConfigAdaptor( config, dojo.hitch(this, function(adaptor) {
            if( !adaptor ) {
                loadingResult.error = "Could not load config "+config.url+", no configuration adaptor found for config format "+config.format+' version '+config.version;
                return;
            }

            adaptor.load({
                config: config,
                context: this,
                onSuccess: function( config_data ) {
                    loadingResult.config = config_data;
                    if( ! --configs_remaining )
                        mergeConfigs();
                        //if you need a backtrace: window.setTimeout( function() { that.onConfigLoaded(); }, 1 );
                },
                onFailure: function( error ) {
                    loadingResult.error = error;
                    if( ! --configs_remaining )
                        mergeConfigs();
                        //if you need a backtrace: window.setTimeout( function() { that.onConfigLoaded(); }, 1 );
                }
            });
        }));
        return loadingResult;
    }, this);

},

/**
 * Merge in some additional configuration data.  Properties in the
 * passed configuration will override those properties in the existing
 * configuration.
 */
addConfigData: function( /**Object*/ config_data ) {
    Util.deepUpdate( this.config, config_data );
},

/**
 * Examine the loaded and merged configuration for errors.  Throws
 * exceptions if it finds anything amiss.
 * @returns nothing meaningful
 */
validateConfig: function() {
    var c = this.config;
    if( ! c.tracks ) {
        this.fatalError( 'No tracks defined in configuration' );
    }
    if( ! c.baseUrl ) {
        this.fatalError( 'Must provide a <code>baseUrl</code> in configuration' );
    }
    if( this.hasFatalErrors )
        throw "Errors in configuration, aborting.";
},

onConfigLoaded: function() {

    var initial_config = this.config;
    this.config = {};

    // load all the configuration data in order
    dojo.forEach( initial_config.include, function( config ) {
                      if( config.loaded && config.data )
                          this.addConfigData( config.data );
                  }, this );

    // load the initial config (i.e. constructor params) last so that
    // it overrides the other config
    this.addConfigData( initial_config );

    this.validateConfig();

    // index the track configurations by name
    this.trackConfigsByName = {};
    dojo.forEach( this.config.tracks || [], function(conf){
        this.trackConfigsByName[conf.label] = conf;
    },this);

}

});
});

