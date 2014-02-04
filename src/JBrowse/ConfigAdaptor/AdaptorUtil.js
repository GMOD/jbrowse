define( [ 'dojox/lang/functional/object',
          'dojox/lang/functional/fold'
        ], function() {
    var AdaptorUtil;
    AdaptorUtil = {

        evalHooks: function( conf ) {
            for( var x in conf ) {
                if( typeof conf[x] == 'object' )
                    // recur
                    conf[x] = this.evalHooks( conf[x] );
                else if( typeof conf[x] == 'string' ) {
                    // compile
                    var spec = conf[x];
                    if( /^\s*function\s*\(/.test(spec) ) {
                        conf[x] = this.evalHook(spec);
                    }
                }
            }
            return conf;
        },

        evalHook: function() {
            // can't bind arguments because the closure compiler
            // renames variables, and we need to assign in the eval
            if ( "string" != typeof arguments[0])
                return arguments[0];
            try {
                eval("arguments[0]="+arguments[0]+";");
            } catch (e) {
                console.error(e+" parsing config callback '"+arguments[0]+"'");
            }
            return arguments[0];
        }
    };
    return AdaptorUtil;
});
