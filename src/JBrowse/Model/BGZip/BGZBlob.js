/**
 * File blob in Heng Li's `bgzip` format.
 */
define([
  'dojo/_base/declare',
  'JBrowse/Util/jszlib',
  'JBrowse/Util/arrayCopy',
], function (declare, inflate, arrayCopy) {
  var BGZBlob = declare(null, {
    constructor: function (blob) {
      this.blob = blob
    },

    blockSize: 1 << 16,

    slice: function (s, l) {
      return new BGZBlob(this.blob.slice(s, l))
    },

    fetch: function (callback, failCallback) {
      this.blob.fetch(this._wrap(callback), failCallback)
    },

    read: function (offset, length, callback, failCallback) {
      this.blob.read(
        offset,
        length + this.blockSize, //< need to over-fetch by a whole block size
        this._wrap(callback, length),
        failCallback,
      )
    },

    _wrap: function (callback, maxLen) {
      var thisB = this
      return function (bgzData) {
        callback(thisB.unbgzf(bgzData, maxLen))
      }
    },

    readInt: function (ba, offset) {
      return (
        (ba[offset + 3] << 24) |
        (ba[offset + 2] << 16) |
        (ba[offset + 1] << 8) |
        ba[offset]
      )
    },

    readShort: function (ba, offset) {
      return (ba[offset + 1] << 8) | ba[offset]
    },

    readFloat: function (ba, offset) {
      var temp = new Uint8Array(4)
      for (var i = 0; i < 4; i++) {
        temp[i] = ba[offset + i]
      }
      var fa = new Float32Array(temp.buffer)
      return fa[0]
    },

    unbgzf: function (data, lim) {
      lim = Math.min(lim || Infinity, data.byteLength - 27)
      var oBlockList = []
      var totalSize = 0

      for (var ptr = [0]; ptr[0] < lim; ptr[0] += 8) {
        var ba = new Uint8Array(data, ptr[0], 18)

        // check the bgzf block magic
        if (!(ba[0] == 31 && ba[1] == 139)) {
          console.error('invalid BGZF block header, skipping', ba)
          break
        }

        var xlen = this.readShort(ba, 10)
        var compressedDataOffset = ptr[0] + 12 + xlen

        // var inPtr = ptr[0];
        // var bSize = Utils.readShort( ba, 16 );
        // var logLength = Math.min(data.byteLength-ptr[0], 40);
        // console.log( xlen, bSize, bSize - xlen - 19, new Uint8Array( data, ptr[0], logLength ), logLength );

        var unc
        try {
          unc = inflate(
            data,
            compressedDataOffset,
            data.byteLength - compressedDataOffset,
            ptr,
          )
        } catch (inflateError) {
          // if we have a buffer error and we have already
          // inflated some data, there is probably just an
          // incomplete BGZF block at the end of the data, so
          // ignore it and stop inflating
          if (
            /^Z_BUF_ERROR/.test(inflateError.statusString) &&
            oBlockList.length
          ) {
            break
          }
          // otherwise it's some other kind of real error
          else {
            throw inflateError
          }
        }
        if (unc.byteLength) {
          totalSize += unc.byteLength
          oBlockList.push(unc)
        }
        // else {
        //     console.error( 'BGZF decompression failed for block ', compressedDataOffset, data.byteLength-compressedDataOffset, [inPtr] );
        // }
      }

      if (oBlockList.length == 1) {
        return oBlockList[0]
      } else {
        var out = new Uint8Array(totalSize)
        var cursor = 0
        for (var i = 0; i < oBlockList.length; ++i) {
          var b = new Uint8Array(oBlockList[i])
          arrayCopy(b, 0, out, cursor, b.length)
          cursor += b.length
        }
        return out.buffer
      }
    },
  })

  return BGZBlob
})
