define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/has',
           'JBrowse/Util/TextIterator'
       ],
       function( declare, array, has, TextIterator ) {
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

    fetchLines: function( lineCallback, endCallback, failCallback ) {
        var thisB = this;
        this.fetch( function( data ) {
                        data = new Uint8Array(data);

                        var lineIterator = new TextIterator.FromBytes(
                            { bytes: data,
                              // only return a partial line at the end
                              // if we are not operating on a slice of
                              // the file
                              returnPartialRecord: !this.end
                            });
                        var line;
                        while(( line = lineIterator.getline() )) {
                                lineCallback( line );
                        }

                        endCallback();
             }, failCallback );
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