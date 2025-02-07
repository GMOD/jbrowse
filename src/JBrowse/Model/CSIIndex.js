define([
  'dojo/_base/declare',
  'JBrowse/Util',
  'JBrowse/Model/DataView',
  'JBrowse/Model/TabixIndex',
  'JBrowse/Model/BGZip/VirtualOffset',
], function (declare, Util, jDataView, TabixIndex, VirtualOffset) {
  function lshift(num, bits) {
    return num * Math.pow(2, bits)
  }
  function rshift(num, bits) {
    return Math.floor(num / Math.pow(2, bits))
  }
  // inner class representing a chunk
  var Chunk = Util.fastDeclare({
    constructor: function (minv, maxv, bin) {
      this.minv = minv
      this.maxv = maxv
      this.bin = bin
    },
    toUniqueString: function () {
      return this.minv + '..' + this.maxv + ' (bin ' + this.bin + ')'
    },
    toString: function () {
      return this.toUniqueString()
    },
    compareTo: function (b) {
      return (
        this.minv.compareTo(b.minv) ||
        this.maxv.compareTo(b.maxv) ||
        this.bin - b.bin
      )
    },
    compare: function (b) {
      return this.compareTo(b)
    },
    fetchedSize: function () {
      return this.maxv.block + lshift(1, 16) - this.minv.block + 1
    },
  })

  return declare(TabixIndex, {
    // fetch and parse the index
    _parseIndex: function (bytes, deferred) {
      this._littleEndian = true
      var data = new jDataView(bytes, 0, undefined, this._littleEndian)

      // check TBI magic numbers
      if (data.getInt32() != 21582659 /* "CSI\1" */) {
        // try the other endianness if no magic
        this._littleEndian = false
        data = new jDataView(bytes, 0, undefined, this._littleEndian)
        if (data.getInt32() != 21582659 /* "CSI\1" */) {
          console.error('Not a CSI file')
          deferred.reject('Not a CSI file')
          return
        }
      }

      // number of reference sequences in the index
      this.minShift = data.getInt32()
      this.depth = data.getInt32()
      var l_aux = data.getInt32()
      var aux = data.getBytes(l_aux, undefined, false)
      var refCount = data.getInt32()

      // read sequence dictionary
      this._refIDToName = new Array(refCount)
      this._refNameToID = {}

      if (l_aux) {
        this._parseAux(aux)
      }

      // read the per-reference-sequence indexes
      this._indices = new Array(refCount)
      for (var i = 0; i < refCount; ++i) {
        // the binning index
        var binCount = data.getInt32()
        var idx = (this._indices[i] = { binIndex: {} })
        for (var j = 0; j < binCount; ++j) {
          var bin = data.getInt32()
          var loffset = new VirtualOffset(data.getBytes(8))
          var chunkCount = data.getInt32()
          var chunks = new Array(chunkCount)
          for (var k = 0; k < chunkCount; ++k) {
            var u = new VirtualOffset(data.getBytes(8))
            var v = new VirtualOffset(data.getBytes(8))
            this._findFirstData(u)
            chunks[k] = new Chunk(u, v, bin)
          }
          idx.binIndex[bin] = chunks
        }
        // the linear index
      }

      this.minAlignmentVO = this.firstDataLine
      deferred.resolve({ success: true })
    },

    _parseAux: function (aux) {
      var data = new jDataView(new Uint8Array(aux).buffer, 0, undefined, true)
      var ret = data.getInt32()
      this.columnNumbers = {
        ref: data.getInt32(),
        start: data.getInt32(),
        end: data.getInt32(),
      }
      this.metaValue = data.getInt32()
      this.metaChar = this.metaValue
        ? String.fromCharCode(this.metaValue)
        : null
      this.skipLines = data.getInt32()
      var nameSectionLength = data.getInt32()

      this._parseNameBytes(data.getBytes(nameSectionLength, undefined, false))
    },

    TAD_LIDX_SHIFT: 14,

    featureCount: function (refName, refNameIsID) {
      var tid
      if (refNameIsID) {
        tid = refName
      } else {
        tid = this.getRefId(refName)
      }

      var indexes = this._indices[tid]
      if (!indexes) {
        return -1
      }
      var bl = this._bin_limit(this.minShift, this.depth)
      var ret = indexes.binIndex[bl + 1]
      return ret ? ret[ret.length - 1].minv.offset : -1
    },
    blocksForRange: function (refName, beg, end, refNameIsID) {
      if (beg < 0) {
        beg = 0
      }

      var tid
      if (refNameIsID) {
        tid = refName
      } else {
        tid = this.getRefId(refName)
      }

      var indexes = this._indices[tid]
      if (!indexes) {
        return []
      }

      var linearIndex = indexes.linearIndex,
        binIndex = indexes.binIndex

      var bins = this._reg2bins(beg, end, this.minShift, this.depth)
      // var linearCount = data.getInt32();
      // var linear = idx.linearIndex = new Array( linearCount );
      // for (var k = 0; k < linearCount; ++k) {
      //     linear[k] = new VirtualOffset( data.getBytes(8) );
      //     this._findFirstData( linear[k] );
      // }
      var min_off = new VirtualOffset(0, 0)

      var i,
        l,
        n_off = 0
      for (i = 0; i < bins.length; ++i) {
        n_off += (binIndex[bins[i]] || []).length
      }

      if (n_off == 0) {
        return []
      }

      var off = []

      var chunks
      for (i = n_off = 0; i < bins.length; ++i) {
        if ((chunks = binIndex[bins[i]])) {
          for (
            var j = 0;
            j < chunks.length;
            ++j //if( min_off.compareTo( chunks[j].maxv ) < 0 )
          ) {
            off[n_off++] = new Chunk(
              chunks[j].minv,
              chunks[j].maxv,
              chunks[j].bin,
            )
          }
        }
      }

      if (!off.length) {
        return []
      }

      off = off.sort(function (a, b) {
        return a.compareTo(b)
      })

      // resolve completely contained adjacent blocks
      for (i = 1, l = 0; i < n_off; ++i) {
        if (off[l].maxv.compareTo(off[i].maxv) < 0) {
          ++l
          off[l].minv = off[i].minv
          off[l].maxv = off[i].maxv
        }
      }
      n_off = l + 1

      return off.slice(0, n_off)
    },

    /* calculate bin given an alignment covering [beg,end) (zero-based, half-close-half-open) */
    _reg2bin: function (beg, end, min_shift, depth) {
      let l,
        s = min_shift,
        t = ((1 << (depth * 3)) - 1) / 7
      for (--end, l = depth; l > 0; --l, s += 3, t -= 1 << (l * 3)) {
        if (beg >> s == end >> s) {
          return t + (beg >> s)
        }
      }
      return 0
    },

    _reg2bins: function (beg, end, min_shift, depth) {
      let l,
        t,
        s = min_shift + depth * 3,
        n
      let bins = []
      for (
        --end, l = n = t = 0;
        l <= depth;
        s -= 3, t += lshift(1, l * 3), ++l
      ) {
        let b = t + rshift(beg, s)
        let e = t + rshift(end, s)
        for (let i = b; i <= e; ++i) {
          bins[n++] = i
        }
      }
      return bins
    },
    _bin_limit: function (min_shift, depth = 5) {
      return ((1 << ((depth + 1) * 3)) - 1) / 7
    },
  })
})
