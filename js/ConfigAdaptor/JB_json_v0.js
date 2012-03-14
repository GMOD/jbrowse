var ConfigAdaptor; if( !ConfigAdaptor ) ConfigAdaptor = {};

/**
 * Configuration adaptor for JBrowse JSON version 0
 * <code>trackInfo.js</code> files.
 * @class
 * @extends ConfigAdaptor.JB_json_v1
 */
ConfigAdaptor.JB_json_v0 = function() {
};
ConfigAdaptor.JB_json_v0.prototype = new ConfigAdaptor.JB_json_v1();

/**
 * Munge the v0 configuration to conform to v1.
 *
 * @param {Object} o the object containing the configuration, which it
 *                   modifies in-place
 * @param {Object} load_args the arguments that were passed to <code>load()</code>
 * @returns {Object} v1-compliant configuration
 */
ConfigAdaptor.JB_json_v0.prototype.regularize_conf = function( o, load_args ) {

    console.log(o);

    // transform the object to conform to format version 1
    o = { tracks: o };
    dojo.forEach( o.tracks, function( trackdef ) {
        if( 'url' in trackdef ) {
            trackdef.urlTemplate = trackdef.url;
            //trackdef.urlTemplate = trackdef.url.replace(/\{refseq\}\/([^/]+)/, "$1/{refseq}");
            delete trackdef.url;
        }
    });

    console.log(o);

    return ConfigAdaptor.JB_json_v1.prototype.regularize_conf.call( this, o, load_args );
};

/**
 * Parse the trackInfo.js configuration text into JSON.
 *
 * @param {String} conf_text the text in the conf file
 * @returns {Object} parsed JSON
 */
ConfigAdaptor.JB_json_v0.prototype.parse_conf = function( conf_text ) {
    conf_text.replace( /^[^\{]+/, '' );
    var conf;
    return eval( 'conf = ' + conf_text );
};


