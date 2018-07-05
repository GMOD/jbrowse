define( [ 'jszlib/inflate',
          'jszlib/arrayCopy',
          'JBrowse/Util'
        ],
        function( inflate, arrayCopy, Util ) {

var VirtualOffset = Util.fastDeclare({
    constructor: function(b, o) {
        this.block = b;
        this.offset = o;
    },
    toString: function() {
        return '' + this.block + ':' + this.offset;
    },
    cmp: function(b) {
        var a = this;
        return b.block - a.block || b.offset - a.offset;
    }
});

/**
 * @lends JBrowse.Store.SeqFeature.BAM.Util
 * Package of utility functions used in various places in the BAM code.
 */
function lshift(num, bits) {
    return num * Math.pow(2, bits);
}
function rshift(num, bits) {
    return Math.floor(num / Math.pow(2,bits));
}
var Utils = {

    readInt: function(ba, offset) {
        return lshift(ba[offset + 3], 24) | lshift(ba[offset + 2], 16) | lshift(ba[offset + 1], 8) | (ba[offset]);
    },

    readShort: function(ba, offset) {
        return lshift(ba[offset + 1], 8) | (ba[offset]);
    },

    readByte: function(ba, offset) {
        return (ba[offset]);
    },

    readFloat: function(ba, offset) {
        var temp = new Uint8Array( 4 );
        for( var i = 0; i<4; i++ ) {
            temp[i] = ba[offset+i];
        }
        var fa = new Float32Array( temp.buffer );
        return fa[0];
    },

    readVirtualOffset: function(ba, offset) {
        //console.log( 'readVob', offset );
        var block = (ba[offset+6] & 0xff) * 0x100000000
            + (ba[offset+5] & 0xff) * 0x1000000
            + (ba[offset+4] & 0xff) * 0x10000
            + (ba[offset+3] & 0xff) * 0x100
            + (ba[offset+2] & 0xff);
        var bint = lshift(ba[offset+1], 8) | ba[offset];
        if (block == 0 && bint == 0) {
            return null;  // Should only happen in the linear index?
        } else {
            return new VirtualOffset(block, bint);
        }
    },

    unbgzf: function(data, lim) {
        lim = Math.min( lim || Infinity, data.byteLength - 27);
        var oBlockList = [];
        var totalSize = 0;

        for( var ptr = [0]; ptr[0] < lim; ptr[0] += 8) {

            var ba = new Uint8Array( data, ptr[0], 18 );

            // check the bgzf block magic
            if( !( ba[0] == 31 && ba[1] == 139 ) ) {
                console.error( 'invalid BGZF block header, skipping', ba );
                break;
            }

            var xlen = Utils.readShort( ba, 10 );
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
                    throw inflateError;
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
};

return Utils;

});
