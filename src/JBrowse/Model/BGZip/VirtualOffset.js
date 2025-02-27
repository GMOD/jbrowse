/**
 * a virtual offset into a bgzipped file
 */
define(['JBrowse/Util'], function (Util) {
  var VirtualOffset = Util.fastDeclare({
    constructor: function (b, o) {
      if (arguments.length >= 2) {
        this.block = b
        this.offset = o
      } else {
        this._fromBytes(b)
      }
    },

    _fromBytes: function (ba, offset) {
      offset = offset || 0

      //console.log( 'readVob', offset );
      var block =
        ba[offset] * 0x10000000000 +
        ba[offset + 1] * 0x100000000 +
        ba[offset + 2] * 0x1000000 +
        ba[offset + 3] * 0x10000 +
        ba[offset + 4] * 0x100 +
        ba[offset + 5]
      var bint = (ba[offset + 6] << 8) | ba[offset + 7]
      if (block == 0 && bint == 0) {
        this.block = this.offset = null
      } else {
        this.block = block
        this.offset = bint
      }
    },
    toString: function () {
      return `${this.block}:${this.offset}`
    },
    compareTo: function (b) {
      return this.block - b.block || this.offset - b.offset
    },
    cmp: function (b) {
      return this.compareTo(b)
    },
  })

  return VirtualOffset
})
