define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/store/JsonRest',
            'dojo/store/util/QueryResults',
            'JBrowse/Digest/Crc32'
        ],
        function(
            declare,
            array,
            dojoJSONRest,
            QueryResults,
            digest
        ) {

return declare( null, {

    constructor: function( args ) {
        // make sure url has a trailing slash
        var url = /\/$/.test( args.url ) ? args.url : args.url + '/';
        this.bucketStore = new dojoJSONRest({
            target: url
        });
    },

    query: function( query, options ) {
        return this._get( (query.name || '').toString() )
                   .then( function( value ) {
                              return QueryResults( (value||{}).exact || [] );
                          });
    },

    get: function( key ) {
        return this._getBucket(key)
                   .then( function( bucket ) {
                        return bucket[key];
                    });
    },

    _getBucket: function( key ) {
        var thisObj = this;

        var bucketIdent = this._hash( key );

        // remember that then() returns a new Deferred that fires after
        // the callback of the then()
        return this.bucketStore.get( this._hexToDirPath( bucketIdent ) );
    },

    _hexToDirPath: function( hex ) {
        // zero-pad the hex string to be 8 chars if necessary
        while( hex.length < 8 )
            hex = '0'+hex;
        var dirpath = [];
        for( var i = 0; i < hex.length; i += 3 ) {
            dirpath.push( hex.substring( i, i+3 ) );
        }
        return dirpath.join('/');
    },

    _hash: function( data ) {
        return digest.objectFingerprint( data )
                     .toString(16)
                     .toLowerCase()
                     .replace('-','n');
    },

    getIdentity: function( object ) {
        return object.id;
    }
});
});