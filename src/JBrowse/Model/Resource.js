define([
           'dojo/_base/declare',
           'dojo/_base/lang'
       ],
       function(
           declare,
           lang
       ) {
var Resource = declare( null, {

    constructor: function( args ) {
        this.transport = args.transport;
        this.resource = args.resource;
        this.defaultOpts = lang.mixin( this._defaultFetchOpts(), args.fetchOpts || {} );
    },

    _defaultFetchOpts: function() {
        return { interactive: true };
    },

    fetch: function( opts ) {
        return this.transport.fetch( this.resource, lang.mixin( {}, this.defaultOpts, opts || {} ))
                   .then( lang.hitch( this, '_decodeData' ) );
    },

    fetchRange: function( offset, length, opts ) {
        return this.transport.fetch( this.resource, lang.mixin( { range: [ offset, offset+length-1 ] }, this.defaultOpts, opts ) )
                   .then( lang.hitch( this, '_decodeData' ) );
    },

    _decodeData: function( data ) {
        return data;
    },

    fetchLines: function( lineCallback, endCallback, failCallback, opts ) {
        var thisB = this;
        this.fetch(opts).then(
            function( data ) {
                data = thisB._decodeData( data );

                var parseState = {
                    data: data,
                    offset: 0
                };
                var line;
                while( parseState.offset < data.length && ( line = thisB._getline( parseState ) )) {
                    if( line.charAt( line.length-1 ) == "\n" )
                        lineCallback( line );
                }

                endCallback();
            }, failCallback );
    }
});
return Resource;
});