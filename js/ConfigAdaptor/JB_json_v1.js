var ConfigAdaptor; if( !ConfigAdaptor ) ConfigAdaptor = {};
ConfigAdaptor.JB_json_v1 = function() {
};

ConfigAdaptor.JB_json_v1.prototype.load = function( args ) {
    var config_def = args.config;
    dojo.xhrGet({
        url: config_def.url,
        handleAs: 'json',
        load: function( o ) {
            o.sourceUrl = o.sourceUrl || config_def.url;
            o.baseUrl   = o.baseUrl || Util.resolveUrl( o.sourceUrl, '.' );
            if( ! /\/$/.test( o.baseUrl ) )
                o.baseUrl += "/";

            args.onSuccess.call( args.context || this, o );
        },
        error: function( i ) {
            console.error( ''+i );
            if( args.onFailure )
                args.onFailure.call( args.context || this, i);
        }
    });
};
