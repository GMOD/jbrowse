define( [
            'JBrowse/Util'
        ],
        function(
            Util
        ) {

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
var Utils = {

    readInt: function(ba, offset) {
        return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset]);
    },

    readShort: function(ba, offset) {
        return (ba[offset + 1] << 8) | (ba[offset]);
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
        var bint = (ba[offset+1] << 8) | ba[offset];
        if (block == 0 && bint == 0) {
            return null;  // Should only happen in the linear index?
        } else {
            return new VirtualOffset(block, bint);
        }
    }
};

return Utils;

});