define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/has'
       ],
       function( declare, array, has ) {
var FileBlob = declare( null,
/**
 * @lends JBrowse.Model.FileBlob.prototype
 */
{

    /**
     * Blob of binary data fetched from a local file (with FileReader).
     *
     * Adapted by Robert Buels from the BlobFetchable object in the
     * Dalliance Genome Explorer, which was is copyright Thomas Down
     * 2006-2011.
     * @constructs
     */
    constructor: function(b) {
        this.blob = b;
        this.size = b.size;
        this.totalSize = b.size;
    },

    slice: function(start, length) {
        var sliceFunc = this.blob.mozSlice || this.blob.slice || this.blob.webkitSlice;
        return new FileBlob(
            length ? sliceFunc.call( this.blob, start, start + length )
                   : sliceFunc.call( this.blob, start )
        );
    },

    _newlineCode: "\n".charCodeAt(0),


    fetchLines: function( lineCallback, endCallback, failCallback ) {
        var thisB = this;
        this.fetch( function( data ) {
                        data = new Uint8Array(data);

                        // throw away the first (probably incomplete) line
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
    },

    _getline: function( parseState ) {
        var data = parseState.data;
        var newlineIndex = array.indexOf( data, this._newlineCode, parseState.offset );

        if( newlineIndex == -1 ) // no more lines
            return null;

        var line = '';
        for( var i = parseState.offset; i <= newlineIndex; i++ )
            line += String.fromCharCode( data[i] );
        parseState.offset = newlineIndex+1;
        return line;
    },

    readLines: function( offset, length, lineCallback, endCallback, failCallback ) {
        var start = this.start + offset,
            end   = start + length;
        var skipFirst = offset != 0;
        this.slice( offset, length )
            .fetchLines(
                function() {
                    // skip the first line if we have a
                    // nonzero offset, because it is probably
                    // incomplete
                    if( ! skipFirst )
                        lineCallback();
                    skipFirst = false;
                }, endCallback, failCallback );
    },

    read: function( offset, length, callback, failCallback ) {
        var start = this.start + offset,
            end = start + length;
        this.slice( offset, length )
            .fetch( callback, failCallback );
    },

    fetch: function( callback, failCallback ) {
        var that = this,
            reader = new FileReader();
        reader.onloadend = function(ev) {
            callback( that._stringToBuffer( reader.result ) );
        };
        reader.readAsBinaryString( this.blob );
    },

    _stringToBuffer: function(result) {
        if( ! result || ! has('typed-arrays') )
            return null;

        var ba = new Uint8Array( result.length );
        for ( var i = 0; i < ba.length; i++ ) {
            ba[i] = result.charCodeAt(i);
        }
        return ba.buffer;
    }

});
return FileBlob;
});