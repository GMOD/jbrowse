define([
  'dojo/request',
  'dojo/promise/all',
  'dojo/Deferred',
  'JBrowse/Util',
  'JBrowse/Store/LRUCache',
], function (request, all, Deferred, Util, LRUCache) {
  /**

Nested containment list.

@class

After
<pre>
  Alekseyenko, A., and Lee, C. (2007).
  Nested Containment List (NCList): A new algorithm for accelerating
     interval query of genome alignment and interval databases.
  Bioinformatics, doi:10.1093/bioinformatics/btl647
</pre>

<a href="http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1">http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1</a>

 */

  function NCList() {
    this.topList = []
  }

  NCList.prototype.importExisting = function (
    nclist,
    attrs,
    baseURL,
    lazyUrlTemplate,
    lazyClass,
  ) {
    this.topList = nclist
    this.attrs = attrs
    this.start = attrs.makeFastGetter('Start')
    this.end = attrs.makeFastGetter('End')
    this.lazyClass = lazyClass
    this.baseURL = baseURL
    this.lazyUrlTemplate = lazyUrlTemplate
    this.lazyChunks = {}
  }

  /**
   *
   *  Given an array of features, creates the nested containment list data structure
   *  WARNING: DO NOT USE directly for adding additional intervals!
   *  completely replaces existing nested containment structure
   *  (erases current topList and subarrays, repopulates from intervals)
   *  currently assumes each feature is array as described above
   */
  NCList.prototype.fill = function (intervals, attrs) {
    //intervals: array of arrays of [start, end, ...]
    //attrs: an ArrayRepr object
    //half-open?
    if (intervals.length == 0) {
      this.topList = []
      return
    }

    this.attrs = attrs
    this.start = attrs.makeFastGetter('Start')
    this.end = attrs.makeFastGetter('End')
    var sublist = attrs.makeSetter('Sublist')
    var start = this.start
    var end = this.end
    var myIntervals = intervals
    //sort by OL
    myIntervals.sort(function (a, b) {
      if (start(a) != start(b)) return start(a) - start(b)
      else return end(b) - end(a)
    })
    var sublistStack = []
    var curList = []
    this.topList = curList
    curList.push(myIntervals[0])
    if (myIntervals.length == 1) return
    var curInterval, topSublist
    for (var i = 1, len = myIntervals.length; i < len; i++) {
      curInterval = myIntervals[i]
      //if this interval is contained in the previous interval,
      if (end(curInterval) < end(myIntervals[i - 1])) {
        //create a new sublist starting with this interval
        sublistStack.push(curList)
        curList = new Array(curInterval)
        sublist(myIntervals[i - 1], curList)
      } else {
        //find the right sublist for this interval
        while (true) {
          if (0 == sublistStack.length) {
            curList.push(curInterval)
            break
          } else {
            topSublist = sublistStack[sublistStack.length - 1]
            if (end(topSublist[topSublist.length - 1]) > end(curInterval)) {
              //curList is the first (deepest) sublist that
              //curInterval fits into
              curList.push(curInterval)
              break
            } else {
              curList = sublistStack.pop()
            }
          }
        }
      }
    }
  }

  NCList.prototype.binarySearch = function (arr, item, getter) {
    var low = -1
    var high = arr.length
    var mid

    while (high - low > 1) {
      mid = (low + high) >>> 1
      if (getter(arr[mid]) >= item) high = mid
      else low = mid
    }

    //if we're iterating rightward, return the high index;
    //if leftward, the low index
    if (getter === this.end) return high
    else return low
  }
  NCList.prototype._readChunkItems = function (chunk, callback) {
    request
      .get(
        Util.resolveUrl(
          this.baseURL,
          this.lazyUrlTemplate.replace(/\{Chunk\}/gi, chunk.chunkNum),
        ),
        {
          handleAs: 'json',
          headers: {
            'X-Requested-With': null,
          },
        },
      )
      .then(
        function (sublist) {
          callback(sublist)
        },
        function (error) {
          if (error.response.status != 404) callback(null, error)
          else callback()
        },
      )
  }
  NCList.prototype.iterHelper = function (
    arr,
    from,
    to,
    fun,
    inc,
    searchGet,
    testGet,
    path,
  ) {
    var len = arr.length
    var i = this.binarySearch(arr, from, searchGet)
    var getChunk = this.attrs.makeGetter('Chunk')
    var getSublist = this.attrs.makeGetter('Sublist')

    var promises = []

    var cache = (this.chunkCache =
      this.chunkCache ||
      new LRUCache({
        name: 'NCListCache',
        fillCallback: dojo.hitch(this, '_readChunkItems'),
        sizeFunction: function (chunkItems) {
          return chunkItems.length
        },
        maxSize: 5000, // cache up to 100 seqchunks
      }))
    while (i < len && i >= 0 && inc * testGet(arr[i]) < inc * to) {
      if (arr[i][0] == this.lazyClass) {
        // this is a lazily-loaded chunk of the nclist
        ;(function () {
          var thisB = this
          var chunkNum = getChunk(arr[i])
          if (!(chunkNum in this.lazyChunks)) {
            this.lazyChunks[chunkNum] = {}
          }

          var getDone = new Deferred()
          promises.push(getDone.promise)

          cache.get({ chunkNum: chunkNum }, function (item, e) {
            if (e) {
              getDone.reject(e)
              return
            }
            if (!item) {
              getDone.resolve()
              return
            }
            return thisB
              .iterHelper(item, from, to, fun, inc, searchGet, testGet, [
                chunkNum,
              ])
              .then(function () {
                getDone.resolve()
              })
          })
        }).call(this)
      } else {
        // this is just a regular feature

        fun(arr[i], path.concat(i))
      }

      // if this node has a contained sublist, process that too
      var sublist = getSublist(arr[i])
      if (sublist)
        promises.push(
          this.iterHelper(
            sublist,
            from,
            to,
            fun,
            inc,
            searchGet,
            testGet,
            path.concat(i),
          ),
        )
      i += inc
    }

    return all(promises)
  }

  NCList.prototype.iterate = function (from, to, fun, postFun) {
    // calls the given function once for each of the
    // intervals that overlap the given interval
    //if from <= to, iterates left-to-right, otherwise iterates right-to-left

    //inc: iterate leftward or rightward
    var inc = from > to ? -1 : 1
    //searchGet: search on start or end
    var searchGet = from > to ? this.start : this.end
    //testGet: test on start or end
    var testGet = from > to ? this.end : this.start

    if (this.topList.length > 0) {
      this.iterHelper(this.topList, from, to, fun, inc, searchGet, testGet, [
        0,
      ]).then(postFun)
    }
  }

  NCList.prototype.histogram = function (from, to, numBins, callback) {
    //calls callback with a histogram of the feature density
    //in the given interval

    var result = new Array(numBins)
    var binWidth = (to - from) / numBins
    var start = this.start
    var end = this.end
    for (var i = 0; i < numBins; i++) result[i] = 0
    this.iterate(
      from,
      to,
      function (feat) {
        var firstBin = Math.max(0, ((start(feat) - from) / binWidth) | 0)
        var lastBin = Math.min(numBins, ((end(feat) - from) / binWidth) | 0)
        for (var bin = firstBin; bin <= lastBin; bin++) result[bin]++
      },
      function () {
        callback(result)
      },
    )
  }

  /*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
  return NCList
})
