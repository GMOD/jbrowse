define([], function () {
  var testArray
  try {
    testArray = new Uint8Array(1)
  } catch (x) {}
  var hasSlice = false /* (typeof testArray.slice === 'function'); */ // Chrome slice performance is so dire that we're currently not using it...

  function arrayCopy(src, srcOffset, dest, destOffset, count) {
    if (count == 0) {
      return
    }
    if (!src) {
      throw 'Undef src'
    } else if (!dest) {
      throw 'Undef dest'
    }

    if (srcOffset == 0 && count == src.length) {
      arrayCopy_fast(src, dest, destOffset)
    } else if (src.subarray) {
      arrayCopy_fast(
        src.subarray(srcOffset, srcOffset + count),
        dest,
        destOffset,
      )
    } else if (src.BYTES_PER_ELEMENT == 1 && count > 100) {
      arrayCopy_fast(
        new Uint8Array(src.buffer, src.byteOffset + srcOffset, count),
        dest,
        destOffset,
      )
    } else {
      arrayCopy_slow(src, srcOffset, dest, destOffset, count)
    }
  }

  function arrayCopy_slow(src, srcOffset, dest, destOffset, count) {
    // dlog('_slow call: srcOffset=' + srcOffset + '; destOffset=' + destOffset + '; count=' + count);

    for (var i = 0; i < count; ++i) {
      dest[destOffset + i] = src[srcOffset + i]
    }
  }

  function arrayCopy_fast(src, dest, destOffset) {
    dest.set(src, destOffset)
  }

  return arrayCopy
})
