define( [ 'dojo/_base/declare',
          'jszlib/inflate',
          'jszlib/arrayCopy'
        ],
        function( declare, inflate, arrayCopy ) {

var VirtualOffset = declare( null, {
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
var Utils = {

    readInt: function(ba, offset) {
        return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset]);
    },

    readShort: function(ba, offset) {
        return (ba[offset + 1] << 8) | (ba[offset]);
    },

    readVirtualOffset: function(ba, offset) {
        //console.log( 'readVob', offset );
        var block = (ba[offset+6] & 0xff) * 0x100000000
            + (ba[offset+5] & 0xff) * 0x1000000
            + (ba[offset+4] & 0xff) * 0x10000
            + (ba[offset+3] & 0xff) * 0x100
            + (ba[offset+2] & 0xff);
        var bint = (ba[offset+1] << 8) | ba[offset];
        if (block == 0 && bint == 0) {
            return null;  // Should only happen in the linear index?
        } else {
            return new VirtualOffset(block, bint);
        }
    },

    unbgzf: function(data, lim) {
         lim = lim || data.byteLength;
         var oBlockList = [];
         var totalSize = 0;

         for(var ptr = [0]; ptr[0] < lim-12; ptr[0] += 8 ) {
             var ba = new Uint8Array( data, ptr[0], 12 );
             var xlen = ba[11] << 8 | ba[10];
             // dlog('xlen[' + (ptr[0]) +']=' + xlen);
             var startInflate = ptr[0] + 12 + xlen;
             var unc = inflate(
                 data,
                 startInflate,
                 data.byteLength - startInflate,
                 ptr
             );
             totalSize += unc.byteLength;
             oBlockList.push( unc );
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