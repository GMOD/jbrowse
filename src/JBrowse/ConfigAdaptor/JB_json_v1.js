define( [ 'dojo/_base/declare',
          'dojo/_base/array',
          'dojo/_base/json',
          'JBrowse/Util',
          'JBrowse/Digest/Crc32'
        ], function( declare, array, json, Util, digest ) {

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
                var url = Util.resolveUrl( args.baseUrl || window.location.href, args.config.url );
                var handleError = function(e) {
                    var str = ''+e+' when loading '+url;
                    console.error( str, e.stack, e );
                    if( args.onFailure )
                        args.onFailure.call( args.context || this, str );
                };
                dojo.xhrGet({
                                url: url,
                                handleAs: 'text',
                                load: function( o ) {
                                    try {
                                        o = that.parse_conf( o, args ) || {};
                                        o.sourceUrl = url;
                                        o = that.regularize_conf( o, args );
                                        args.onSuccess.call( args.context || that, o );
                                    } catch(e) {
                                        handleError(e);
                                    }
                                },
                                error: handleError
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

            // set a default baseUrl in each of the track confs if needed
            if( o.sourceUrl ) {
                dojo.forEach( o.tracks || [], function(t) {

                                  if( ! t.baseUrl )
                                      t.baseUrl = o.baseUrl || '/';
                              },this);
            }

            o = this._evalHooks( o );

            o = this._regularizeTrackConfigs( o );

            return o;
        },

        _regularizeTrackConfigs: function( conf ) {
            conf.stores = conf.stores || {};

            array.forEach( conf.tracks || [], function( trackConfig ) {

                // if there is a `config` subpart,
                // just copy its keys in to the
                // top-level config
                if( trackConfig.config ) {
                    var c = trackConfig.config;
                    delete trackConfig.config;
                    for( var prop in c ) {
                        if( !(prop in trackConfig) && c.hasOwnProperty(prop) ) {
                            trackConfig[prop] = c[prop];
                        }
                    }
                }

                // skip if it's a new-style track def
                if( trackConfig.store )
                    return;

                var trackClassName = this._regularizeClass(
                    'JBrowse/View/Track', {
                        'FeatureTrack':      'JBrowse/View/Track/HTMLFeatures',         'ImageTrack':        'JBrowse/View/Track/FixedImage',
                        'ImageTrack.Wiggle': 'JBrowse/View/Track/FixedImage/Wiggle',
                        'SequenceTrack':     'JBrowse/View/Track/Sequence'
                    }[ trackConfig.type ]
                    || trackConfig.type
                );
                trackConfig.type = trackClassName;

                // figure out what data store class to use with the track,
                // applying some defaults if it is not explicit in the
                // configuration
                var storeClass = this._regularizeClass(
                    'JBrowse/Store',
                    trackConfig.storeClass                       ? trackConfig.storeClass :
                        /\/HTMLFeatures$/.test( trackClassName ) ? 'JBrowse/Store/SeqFeature/NCList'+( trackConfig.backendVersion == 0 ? '_v0' : '' )  :
                        /\/FixedImage/.test( trackClassName )    ? 'JBrowse/Store/TiledImage/Fixed' +( trackConfig.backendVersion == 0 ? '_v0' : '' )  :
                        /\/Sequence$/.test( trackClassName )     ? 'JBrowse/Store/Sequence/StaticChunked'                                              :
                                                                    null
                );

                if( ! storeClass ) {
                    console.error( "Unable to determine an appropriate data store to use with a "
                                   + trackClassName + " track, please explicitly specify a "
                                   + "storeClass in the configuration." );
                    return;
                }

                // synthesize a separate store conf
                var storeConf = {
                    urlTemplate: trackConfig.urlTemplate,
                    compress: trackConfig.compress,
                    baseUrl: trackConfig.baseUrl,
                    type: storeClass
                };

                // if this is the first sequence store we see, and we
                // have no refseqs store defined explicitly, make this the refseqs store.
                if( storeClass == 'JBrowse/Store/Sequence/StaticChunked' && !conf.stores['refseqs'] )
                    storeConf.name = 'refseqs';
                else
                    storeConf.name = 'store'+digest.objectFingerprint( storeConf );

                // record it
                conf.stores[storeConf.name] = storeConf;

                // connect it to the track conf
                trackConfig.store = storeConf.name;

            }, this);

            return conf;
        },

        _regularizeClass: function( root, class_ ) {
            // prefix the class names with JBrowse/* if they contain no slashes
            if( ! /\//.test( class_ ) )
                class_ = root+'/'+class_;
            class_ = class_.replace(/^\//);
            return class_;
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
        _evalHook: function( hook ) {
            // can't bind arguments because the closure compiler
            // renames variables, and we need to assign in the eval
            if ( "string" != typeof hook )
                return hook;
            try {
                eval('arguments[0]='+hook+';');
            } catch (e) {
                console.error("error parsing parsing JavaScript callback: '"+hook+"': "+e);
            }
            return (function(h) { return h; }).apply( this, arguments );
        }
});
});