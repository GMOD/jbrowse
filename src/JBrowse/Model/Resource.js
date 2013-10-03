define([
           'dojo/_base/declare',
           'dojo/_base/lang',

           'JBrowse/Util/DeferredGenerator'
       ],
       function(
           declare,
           lang,

           DeferredGenerator
       ) {
var Resource = declare( null, {

    constructor: function( args ) {
        this.authManager = args.authManager;
        this.transport = args.transport;
        this.resourceDef = args.resource;
        this.defaultOpts = lang.mixin( this._defaultRequestOpts(), args.transportOpts || {} );
    },

    _defaultRequestOpts: function() {
        return { interactive: true };
    },

    readAll: function( opts ) {
        return this._read( lang.mixin( {}, this.defaultOpts, opts || {} ) );
    },

    _read: function( requestOpts ) {
        var thisB = this;
        return this.authManager.getCredentialsForResource( this, requestOpts )
            .then(function( credentialSlots ) {
                      return thisB.transport.request(
                                 thisB.resourceDef,
                                 requestOpts,
                                 credentialSlots
                             ).then( lang.hitch( thisB, '_decodeData' ) );
                });
    },
    readRange: function( offset, length, opts ) {
        return this._read( lang.mixin( { range: [ offset, offset+length-1 ] }, this.defaultOpts, opts || {} ) );
    },

    _decodeData: function( data ) {
        return data;
    },

    readLines: function( opts ) {
        var thisB = this;
        return new DeferredGenerator( function(generator) {
            return thisB.readAll(opts).then(
                function( data ) {
                    data = thisB._decodeData( data );

                    var parseState = {
                        data: data,
                        offset: 0
                    };

                    var line;
                    while( parseState.offset < data.length && ( line = thisB._getline( parseState ) )) {
                        if( line.charAt( line.length-1 ) == "\n" )
                            generator.emit( line );
                    }
                });
        });
    }
});
return Resource;
});