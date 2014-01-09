define([
           'dojo/_base/declare',
            'jszlib/inflate',
            'jszlib/arrayCopy'
       ],
       function(
           declare,
           inflate,
           arrayCopy
       ) {
return declare( null, {
    _blockSize: function() {
        return 1<<16;
    },

    readRange: function( offset, length, opts ) {
        // need to over-request by a whole block size in bgzipped files to make sure we get the whole block
        return this.inherited( arguments, [ offset, length+this._blockSize(), opts ] );
    },

    _decodeData: function( data ) {
        return this.unbgzf( this.inherited(arguments ) );
    },

    _wrapCallback: function( callback, maxLen ) {
        var thisB = this;
        return function( bgzData ) {
            callback( thisB.unbgzf( bgzData, maxLen ) );
        };
    },

    unbgzf: function(data, lim) {
        lim = Math.min( lim || Infinity, data.byteLength - 27);
        var oBlockList = [];
        var totalSize = 0;

        function readShort (ba, offset) {
            return (ba[offset + 1] << 8) | (ba[offset]);
        }

        for( var ptr = [0]; ptr[0] < lim; ptr[0] += 8) {

            var ba = new Uint8Array( data, ptr[0], 18 );

            // check the bgzf block magic
            if( !( ba[0] == 31 && ba[1] == 139 ) ) {
                console.error( 'invalid BGZF block header, skipping', ba );
                break;
            }


            var xlen = readShort( ba, 10 );
            var compressedDataOffset = ptr[0] + 12 + xlen;

            // var inPtr = ptr[0];
            // var bSize = Utils.readShort( ba, 16 );
            // var logLength = Math.min(data.byteLength-ptr[0], 40);
            // console.log( xlen, bSize, bSize - xlen - 19, new Uint8Array( data, ptr[0], logLength ), logLength );

            var unc;
            try {
                unc = inflate(
                    data,
                    compressedDataOffset,
                    data.byteLength - compressedDataOffset,
                    ptr
                );
            } catch( inflateError ) {
                // if we have a buffer error and we have already
                // inflated some data, there is probably just an
                // incomplete BGZF block at the end of the data, so
                // ignore it and stop inflating
                if( /^Z_BUF_ERROR/.test(inflateError.statusString) && oBlockList.length ) {
                    break;
                }
                // otherwise it's some other kind of real error
                else {
                    console.error( inflateError.stack || ''+inflateError );
                    throw new Error('Error uncompressing file. Is it bgzipped correctly?');
                }
            }
            if( unc.byteLength ) {
                totalSize += unc.byteLength;
                oBlockList.push( unc );
            }
            // else {
            //     console.error( 'BGZF decompression failed for block ', compressedDataOffset, data.byteLength-compressedDataOffset, [inPtr] );
            // }
        }

        if (oBlockList.length == 1) {
            return oBlockList[0];
        } else {
            var out = new Uint8Array(totalSize);
            var cursor = 0;
            for (var i = 0; i < oBlockList.length; ++i) {
                var b = new Uint8Array(oBlockList[i]);
                arrayCopy(b, 0, out, cursor, b.length);
                cursor += b.length;
            }
            return out.buffer;
        }
    }

});
});
