define([ 'dojo/_base/declare', 'dojo/has'],
       function( declare, has ) {
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
        if( ! result || typeof Uint8Array != 'function' )
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