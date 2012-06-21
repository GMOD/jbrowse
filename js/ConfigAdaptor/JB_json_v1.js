dojo.declare( 'JBrowse.ConfigAdaptor.JB_json_v1', null,

/**
 * @lends JBrowse.ConfigAdaptor.JB_json_v1.prototype
 */
{
    /**
     * Configuration adaptor for JBrowse JSON version 1 configuration
     * files (formerly known as trackList.json files).
     * @constructs
     */
    constructor: function() {
    },

    /**
     * Load the configuration.
     * @param args.onSuccess callback for successful conf loading.
     *                       1 arg: an object containing the configuration.
     * @param args.onFailure callback for successful conf loading.
     *                       1 arg: the error that was thrown.
     */
    load: function( /**Object*/ args ) {
        var that = this;
        dojo.xhrGet({
                        url: args.config.url,
                        handleAs: 'text',
                        load: function( o ) {
                            o = that.parse_conf( o, args );
                            o = that.regularize_conf( o, args );
                            args.onSuccess.call( args.context || this, o );
                        },
                        error: function( i ) {
                            console.error( ''+i );
                            if( args.onFailure )
                                args.onFailure.call( args.context || this, i);
                        }
                    });
    },

    /**
     * In this adaptor, just evals the conf text to parse the JSON, but
     * other conf adaptors might want to inherit and override this.
     * @param {String} conf_text the configuration text
     * @param {Object} load_args the arguments that were passed to <code>load()</code>
     * @returns {Object} the parsed JSON
     */
    parse_conf: function( conf_text, load_args ) {
        var conf;
        return eval( 'conf = ' + conf_text );
    },


    /**
     * Applies defaults and any other necessary tweaks to the loaded JSON
     * configuration.  Called by <code>load()</code> on the JSON
     * configuration before it calls the <code>onSuccess</code> callback.
     * @param {Object} o the object containing the configuration, which it
     *                   modifies in-place
     * @param {Object} load_args the arguments that were passed to <code>load()</code>
     * @returns the same object it was passed
     */
    regularize_conf: function( o, load_args ) {
        o.sourceUrl = o.sourceUrl || load_args.config.url;
        o.baseUrl   = o.baseUrl || Util.resolveUrl( o.sourceUrl, '.' );
        if( ! /\/$/.test( o.baseUrl ) )
            o.baseUrl += "/";
        return o;
    }
});
