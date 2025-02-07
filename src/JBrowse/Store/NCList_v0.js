define(['JBrowse/Finisher', 'JBrowse/Util'], function (Finisher, Util) {
  /**
   * Legacy-compatible NCList for 1.2.1 backward compatibility.
   * @lends JBrowse.Store.NCList_v0
   * @constructs
   */
  function NCList_v0() {}

  NCList_v0.prototype.importExisting = function (
    nclist,
    sublistIndex,
    lazyIndex,
    baseURL,
    lazyUrlTemplate,
  ) {
    this.topList = nclist
    this.sublistIndex = sublistIndex
    this.lazyIndex = lazyIndex
    this.baseURL = baseURL
    this.lazyUrlTemplate = lazyUrlTemplate
  }

  NCList_v0.prototype.fill = function (intervals, sublistIndex) {
    //intervals: array of arrays of [start, end, ...]
    //sublistIndex: index into a [start, end] array for storing a sublist
    //              array. this is so you can use those arrays for something
    //              else, and keep the NCList_v0 bookkeeping from interfering.
    //              That's hacky, but keeping a separate copy of the intervals
    //              in the NCList_v0 seems like a waste (TODO: measure that waste).
    //half-open?
    this.sublistIndex = sublistIndex
    var myIntervals = intervals //.concat();
    //sort by OL
    myIntervals.sort(function (a, b) {
      if (a[0] != b[0]) {
        return a[0] - b[0]
      } else {
        return b[1] - a[1]
      }
    })
    var sublistStack = []
    var curList = []
    this.topList = curList
    curList.push(myIntervals[0])
    var curInterval, topSublist
    for (var i = 1, len = myIntervals.length; i < len; i++) {
      curInterval = myIntervals[i]
      //if this interval is contained in the previous interval,
      if (curInterval[1] < myIntervals[i - 1][1]) {
        //create a new sublist starting with this interval
        sublistStack.push(curList)
        curList = new Array(curInterval)
        myIntervals[i - 1][sublistIndex] = curList
      } else {
        //find the right sublist for this interval
        while (true) {
          if (0 == sublistStack.length) {
            curList.push(curInterval)
            break
          } else {
            topSublist = sublistStack[sublistStack.length - 1]
            if (topSublist[topSublist.length - 1][1] > curInterval[1]) {
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

  NCList_v0.prototype.binarySearch = function (arr, item, itemIndex) {
    var low = -1
    var high = arr.length
    var mid

    while (high - low > 1) {
      mid = (low + high) >>> 1
      if (arr[mid][itemIndex] > item) {
        high = mid
      } else {
        low = mid
      }
    }

    //if we're iterating rightward, return the high index;
    //if leftward, the low index
    if (1 == itemIndex) {
      return high
    } else {
      return low
    }
  }

  NCList_v0.prototype.iterHelper = function (
    arr,
    from,
    to,
    fun,
    finish,
    inc,
    searchIndex,
    testIndex,
    path,
  ) {
    var len = arr.length
    var i = this.binarySearch(arr, from, searchIndex)
    while (i < len && i >= 0 && inc * arr[i][testIndex] < inc * to) {
      if ('object' == typeof arr[i][this.lazyIndex]) {
        var ncl = this
        // lazy node
        if (arr[i][this.lazyIndex].state) {
          if ('loading' == arr[i][this.lazyIndex].state) {
            // node is currenly loading; finish this query once it
            // has been loaded
            finish.inc()
            arr[i][this.lazyIndex].callbacks.push(
              (function (parentIndex) {
                return function (o) {
                  ncl.iterHelper(
                    o,
                    from,
                    to,
                    fun,
                    finish,
                    inc,
                    searchIndex,
                    testIndex,
                    path.concat(parentIndex),
                  )
                  finish.dec()
                }
              })(i),
            )
          } else if ('loaded' == arr[i][this.lazyIndex].state) {
            // just continue below
          } else {
            console.log(`unknown lazy type: ${arr[i]}`)
          }
        } else {
          // no "state" property means this node hasn't been loaded,
          // start loading
          arr[i][this.lazyIndex].state = 'loading'
          arr[i][this.lazyIndex].callbacks = []
          finish.inc()
          dojo.xhrGet({
            url: Util.resolveUrl(
              this.baseURL,
              this.lazyUrlTemplate.replace(
                /\{chunk\}/g,
                arr[i][this.lazyIndex].chunk,
              ),
            ),
            headers: {
              'X-Requested-With': null,
            },
            handleAs: 'json',
            load: (function (lazyFeat, lazyObj, sublistIndex, parentIndex) {
              return function (o) {
                lazyObj.state = 'loaded'
                lazyFeat[sublistIndex] = o
                ncl.iterHelper(
                  o,
                  from,
                  to,
                  fun,
                  finish,
                  inc,
                  searchIndex,
                  testIndex,
                  path.concat(parentIndex),
                )
                for (var c = 0; c < lazyObj.callbacks.length; c++) {
                  lazyObj.callbacks[c](o)
                }
                finish.dec()
              }
            })(arr[i], arr[i][this.lazyIndex], this.sublistIndex, i),
            error: function () {
              finish.dec()
            },
          })
        }
      } else {
        fun(arr[i], path.concat(i))
      }

      if (arr[i][this.sublistIndex]) {
        this.iterHelper(
          arr[i][this.sublistIndex],
          from,
          to,
          fun,
          finish,
          inc,
          searchIndex,
          testIndex,
          path.concat(i),
        )
      }
      i += inc
    }
  }

  NCList_v0.prototype.iterate = function (from, to, fun, postFun) {
    // calls the given function once for each of the
    // intervals that overlap the given interval
    //if from <= to, iterates left-to-right, otherwise iterates right-to-left

    //inc: iterate leftward or rightward
    var inc = from > to ? -1 : 1
    //searchIndex: search on start or end
    var searchIndex = from > to ? 0 : 1
    //testIndex: test on start or end
    var testIndex = from > to ? 1 : 0
    var finish = new Finisher(postFun)
    this.iterHelper(
      this.topList,
      from,
      to,
      fun,
      finish,
      inc,
      searchIndex,
      testIndex,
      [],
    )
    finish.finish()
  }

  NCList_v0.prototype.histogram = function (from, to, numBins, callback) {
    //calls callback with a histogram of the feature density
    //in the given interval

    var result = new Array(numBins)
    var binWidth = (to - from) / numBins
    for (var i = 0; i < numBins; i++) {
      result[i] = 0
    }
    //this.histHelper(this.topList, from, to, result, numBins, (to - from) / numBins);
    this.iterate(
      from,
      to,
      function (feat) {
        var firstBin = Math.max(0, ((feat[0] - from) / binWidth) | 0)
        var lastBin = Math.min(numBins, ((feat[1] - from) / binWidth) | 0)
        for (var bin = firstBin; bin <= lastBin; bin++) {
          result[bin]++
        }
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

  return NCList_v0
})
