define(['JBrowse/Util', 'JBrowse/Finisher', 'dojo/_base/xhr'], function (
  Util,
  Finisher,
  xhr,
) {
  /*
   * For a JSON array that gets too large to load in one go, this class
   * helps break it up into chunks and provides an
   * async API for using the information in the array.
   */

  /**
   * Construct a new LazyArray, which partially loads large JSON arrays.
   * @class
   * @constructor
   * @param lazyArrayParams {Object} as:
   * <ul>
   * <li><code>urlTemplate</code> - for each lazily-loaded array chunk, the chunk number will get substituted for {chunk} in this template, and the result will beused as the URL of the JSON for that array chunk</li>
   * <li><code>length</code> - length of the overall array</li>
   * <li><code>chunkSize</code> - the size of each array chunk</li>
   * </ul>
   */
  var LazyArray = function (lazyArrayParams, baseUrl) {
    this.urlTemplate = lazyArrayParams.urlTemplate
    this.chunkSize = lazyArrayParams.chunkSize
    this.length = lazyArrayParams.length
    this.baseUrl = baseUrl === undefined ? '' : baseUrl
    // Once a range gets loaded, it goes into the "chunks" array.
    // this.chunks[n] contains data for indices in the range
    // [n * chunkSize, Math.min(length - 1, (n * (chunkSize + 1)) - 1)]
    this.chunks = []
    // If a range is currently loading, this will contain a property
    // "chunk number": [{start, end, callback, param}, ...]
    this.toProcess = {}
  }

  /**
   * call the callback on one element of the array
   * @param i index
   * @param callback callback, gets called with (i, value, param)
   * @param param (optional) callback will get this as its last parameter
   */
  LazyArray.prototype.index = function (i, callback, param) {
    this.range(i, i, callback, undefined, param)
  }

  /**
   * call the callback on each element in the range [start, end]
   * @param start index of first element to call the callback on
   * @param end index of last element to call the callback on
   * @param callback callback, gets called with (i, value, param)
   * @param postFun (optional) callback that gets called when <code>callback</code> has been run on every element in the range
   * @param param (optional) callback will get this as its last parameter
   */
  LazyArray.prototype.range = function (start, end, callback, postFun, param) {
    start = Math.max(0, start)
    end = Math.min(end, this.length - 1)

    var firstChunk = Math.floor(start / this.chunkSize)
    var lastChunk = Math.floor(end / this.chunkSize)

    if (postFun === undefined) /** @inner */ postFun = function () {}
    var finish = new Finisher(postFun)

    for (var chunk = firstChunk; chunk <= lastChunk; chunk++) {
      if (this.chunks[chunk]) {
        // chunk is loaded
        this._processChunk(start, end, chunk, callback, param)
      } else {
        var toProcessInfo = {
          start: start,
          end: end,
          callback: callback,
          param: param,
          finish: finish,
        }

        finish.inc()
        if (this.toProcess[chunk]) {
          // chunk is currently being loaded
          this.toProcess[chunk].push(toProcessInfo)
        } else {
          // start loading chunk
          this.toProcess[chunk] = [toProcessInfo]
          var url = this.urlTemplate.replace(/\{Chunk\}/gi, chunk)
          var thisObj = this
          dojo.xhrGet({
            url: this.baseUrl ? Util.resolveUrl(this.baseUrl, url) : url,
            handleAs: 'json',
            load: this._makeLoadFun(chunk),
            error: function () {
              finish.dec()
            },
          })
        }
      }
    }
    finish.finish()
  }

  LazyArray.prototype._makeLoadFun = function (chunk) {
    var thisObj = this
    return function (data) {
      thisObj.chunks[chunk] = data
      var toProcess = thisObj.toProcess[chunk]
      delete thisObj.toProcess[chunk]
      for (var i = 0; i < toProcess.length; i++) {
        thisObj._processChunk(
          toProcess[i].start,
          toProcess[i].end,
          chunk,
          toProcess[i].callback,
          toProcess[i].param,
        )
        toProcess[i].finish.dec()
      }
    }
  }

  LazyArray.prototype._processChunk = function (
    start,
    end,
    chunk,
    callback,
    param,
  ) {
    // index (in the overall lazy array) of the first position in this chunk
    var firstIndex = chunk * this.chunkSize

    var chunkStart = start - firstIndex
    var chunkEnd = end - firstIndex
    chunkStart = Math.max(0, chunkStart)
    chunkEnd = Math.min(chunkEnd, this.chunkSize - 1)

    for (var i = chunkStart; i <= chunkEnd; i++) {
      callback(i + firstIndex, this.chunks[chunk][i], param)
    }
  }

  return LazyArray
})
