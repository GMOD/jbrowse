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

    // get a line of text, properly decoding UTF-8
    _getline: function( parseState ) {
        var newline = this._newlineCode;

        var data = parseState.data;
        var i = parseState.offset;

        var line = [];
        while( i < data.length ) {
            var c1 = data[i], c2, c3;
            if (c1 < 128) {
                line.push( String.fromCharCode(c1) );
                i++;
                if( c1 == newline ) {
                    parseState.offset = i;
                    return line.join('');
                }
            } else if (c1 > 191 && c1 < 224) {
                c2 = data[i + 1];
                line.push( String.fromCharCode(((c1 & 31) << 6) | (c2 & 63)) );
                i += 2;
            } else {
                c2 = data[i + 1];
                c3 = data[i + 2];
                line.push( String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63)) );
                i += 3;
            }
        }

        // did not get a full line
        parseState.offset = i;
        return null;
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