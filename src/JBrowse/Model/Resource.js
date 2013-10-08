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
        this.transport = args.transport;
        this.resourceDef = args.resource;
        this.defaultOpts = lang.mixin( this._defaultRequestOpts(), args.transportOpts || {} );
        this.mediaType = args.mediaType;
        this.filename = args.filename;
    },

    getResourceDefinition: function() {
        return this.resourceDef;
    },

    _defaultRequestOpts: function() {
        return { interactive: true };
    },

    writeAll: function( dataGenerator, opts ) {
        return this.transport.sendFile(
            dataGenerator,
            this.resourceDef,
            lang.mixin( { mediaType: this.mediaType,
                          filename: this.filename
                        },
                        opts
                      )
        );
    },

    readAll: function( opts ) {
        return this._read( lang.mixin( {}, this.defaultOpts, opts || {} ) );
    },

    _read: function( requestOpts ) {
        var thisB = this;
        return thisB.transport.request(
            thisB.resourceDef,
            requestOpts
        ).then( lang.hitch( thisB, '_decodeData' ) );
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