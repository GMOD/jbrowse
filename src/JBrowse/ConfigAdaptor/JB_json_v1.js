define(['dojo/_base/declare','dojo/_base/json','JBrowse/Util'], function(declare,json,Util) {
return declare('JBrowse.ConfigAdaptor.JB_json_v1',null,

    /**
     * @lends JBrowse.ConfigAdaptor.JB_json_v1.prototype
     */
    {

        /**
         * Configuration adaptor for JBrowse JSON version 1 configuration
         * files (formerly known as trackList.json files).
         * @constructs
         */
        constructor: function() {},

        /**
         * Load the configuration file from a URL.
         *
         * @param args.config.url {String} URL for fetching the config file.
         * @param args.onSuccess {Function} callback for a successful config fetch
         * @param args.onFailure {Function} optional callback for a
         *   config fetch failure
         * @param args.context {Object} optional context in which to
         *   call the callbacks, defaults to the config object itself
         */
        load: function( /**Object*/ args ) {
            var that = this;
            if( args.config.url ) {
                dojo.xhrGet({
                                url: Util.resolveUrl( args.baseUrl || window.location.href, args.config.url ),
                                handleAs: 'text',
                                load: function( o ) {
                                    window.setTimeout( dojo.hitch(this, function() {
                                    o = that.parse_conf( o, args );
                                    o = that.regularize_conf( o, args );
                                    args.onSuccess.call( args.context || this, o );
                                                                  }, 10 ));
                                },
                                error: function( i ) {
                                    console.error( ''+i );
                                    if( args.onFailure )
                                        args.onFailure.call( args.context || this, i);
                                }
                            });
            }
            else if( args.config.data ) {
                var conf = this.regularize_conf( args.config.data, args );
                args.onSuccess.call( args.context || this, conf );
            }
        },

        /**
         * In this adaptor, just evals the conf text to parse the JSON, but
         * other conf adaptors might want to inherit and override this.
         * @param {String} conf_text the configuration text
         * @param {Object} load_args the arguments that were passed to <code>load()</code>
         * @returns {Object} the parsed JSON
         */
        parse_conf: function( conf_text, load_args ) {
            return json.fromJson( conf_text );
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
            if( o.baseUrl.length && ! /\/$/.test( o.baseUrl ) )
                o.baseUrl += "/";

            return this._evalHooks( o );
        },

        _evalHooks: function( conf ) {
            for( var x in conf ) {
                if( typeof conf[x] == 'object' )
                    // recur
                    conf[x] = this._evalHooks( conf[x] );
                else if( typeof conf[x] == 'string' ) {
                    // compile
                    var spec = conf[x];
                    if( /^function\s*\(/.test(spec) && /\}[\s;]*$/.test(spec) ) {
                        conf[x] = this._evalHook(spec);
                    }
                }
            }
            return conf;
        },
        _evalHook: function() {
            // can't bind arguments because the closure compiler
            // renames variables, and we need to assign in the eval
            if ( "string" != typeof arguments[0])
                return arguments[0];
            try {
                eval("arguments[0]="+arguments[0]+";");
            } catch (e) {
                console.error("eval failed for callback '"+arguments[0]+"': "+e);
            }
            return arguments[0];
        }
});
});
