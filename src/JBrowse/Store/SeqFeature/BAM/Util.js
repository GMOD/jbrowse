define( [ 'jszlib/inflate',
          'jszlib/arrayCopy'
        ],
        function( inflate, arrayCopy ) {

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

    unbgzf: function(data, lim) {
         lim = Math.min(lim || 1, data.byteLength - 100);
         var oBlockList = [];
         var ptr = [0];
         var totalSize = 0;

         while (ptr[0] < lim) {
             var ba = new Uint8Array(data, ptr[0], 100); // FIXME is this enough for all credible BGZF block headers?
             var xlen = (ba[11] << 8) | (ba[10]);
             // dlog('xlen[' + (ptr[0]) +']=' + xlen);
             var unc = inflate(
                 data,
                 12 + xlen + ptr[0],
                 Math.min(65536, data.byteLength - 12 - xlen - ptr[0]),
                 ptr
             );
             ptr[0] += 8;
             totalSize += unc.byteLength;
             oBlockList.push(unc);
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