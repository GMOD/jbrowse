//After
//Alekseyenko, A., and Lee, C. (2007).
//Nested Containment List (NCList): A new algorithm for accelerating
//   interval query of genome alignment and interval databases.
//Bioinformatics, doi:10.1093/bioinformatics/btl647
//http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1

function NCList() {
}

NCList.prototype.importExisting = function(nclist, attrs, baseURL,
                                           lazyUrlTemplate, lazyClass) {
    this.topList = nclist;
    this.attrs = attrs;
    this.start = attrs.makeFastGetter("Start");
    this.end = attrs.makeFastGetter("End");
    this.lazyClass = lazyClass;
    this.baseURL = baseURL;
    this.lazyUrlTemplate = lazyUrlTemplate;
    this.lazyChunks = {};
};

NCList.prototype.fill = function(intervals, attrs) {
    //intervals: array of arrays of [start, end, ...]
    //attrs: an ArrayRepr object
    //half-open?
    this.attrs = attrs;
    this.start = attrs.makeFastGetter("Start");
    this.end = attrs.makeFastGetter("End");
    var sublist = attrs.makeSetter("Sublist");
    var start = this.start;
    var end = this.end;
    var myIntervals = intervals;
    //sort by OL
    myIntervals.sort(function(a, b) {
        if (start(a) != start(b))
            return start(a) - start(b());
        else
            return end(b) - end(a);
    });
    var sublistStack = new Array();
    var curList = new Array();
    this.topList = curList;
    curList.push(myIntervals[0]);
    var curInterval, topSublist;
    for (var i = 1, len = myIntervals.length; i < len; i++) {
        curInterval = myIntervals[i];
        //if this interval is contained in the previous interval,
        if (end(curInterval) < end(myIntervals[i - 1])) {
            //create a new sublist starting with this interval
            sublistStack.push(curList);
            curList = new Array(curInterval);
            sublist(myIntervals[i - 1], curList);
        } else {
            //find the right sublist for this interval
            while (true) {
                if (0 == sublistStack.length) {
                    curList.push(curInterval);
                    break;
                } else {
                    topSublist = sublistStack[sublistStack.length - 1];
                    if (end(topSublist[topSublist.length - 1])
                        > end(curInterval)) {
                        //curList is the first (deepest) sublist that
                        //curInterval fits into
                        curList.push(curInterval);
                        break;
                    } else {
                        curList = sublistStack.pop();
                    }
                }
            }
        }
    }
};

NCList.prototype.binarySearch = function(arr, item, getter) {
    var low = -1;
    var high = arr.length;
    var mid;

    while (high - low > 1) {
        mid = (low + high) >>> 1;
        if (getter(arr[mid]) > item)
            high = mid;
        else
            low = mid;
    }

    //if we're iterating rightward, return the high index;
    //if leftward, the low index
    if (1 == itemIndex) return high; else return low;
};

NCList.prototype.iterHelper = function(arr, from, to, fun, finish,
                                       inc, searchGet, testGet, path) {
    var len = arr.length;
    var i = this.binarySearch(arr, from, searchGet);
    var getChunk = this.attrs.makeGetter("Chunk");
    var getSublist = this.attrs.makeGetter("Sublist");

    while ((i < len)
           && (i >= 0)
           && ((inc * testGet(arr[i])) < (inc * to)) ) {

        if (arr[i][0] == this.lazyClass) {
            var ncl = this;
            var chunkNum = getChunk(arr[i]);
            if (!(chunkNum in this.lazyChunks)) {
                this.lazyChunks[chunkNum] = {};
            }
            var chunk = this.lazyChunks[chunkNum];
            finish.inc();
            Util.maybeLoad(Util.resolveUrl(this.baseURL,
                                           this.lazyUrlTemplate.replace(
                                                   /\{Chunk\}/g, chunkNum
                                           ) ),
                           chunk,
                           (function (myChunkNum) {
                               return function(o) {
                                   ncl.iterHelper(o, from, to, fun, finish,
                                                  inc, searchGet, testGet,
                                                  [myChunkNum]);
                                   finish.dec();
                               };
                            })(chunkNum),
                           function() {
                               finish.dec();
                           }
                          );

            // // lazy node
            // if (chunk) {
            //     if ("loading" == chunk.state) {
            //         // node is currenly loading; finish this query once it
            //         // has been loaded
            //         finish.inc();
            //         chunk.callbacks.push(
            //             function(parentIndex) {
            //                 return function(o) {
            //                     ncl.iterHelper(o, from, to, fun, finish, inc,
            //                                    searchGet, testGet,
            //                                    [chunkNum]);
            //                     finish.dec();
            //                 };
            //             }(i)
            //         );
            //     } else if ("loaded" == chunk.state) {
            //         this.iterHelper(chunk.sublist, from, to, fun, finish,
            //                         inc, searchGet, testGet, [chunkNum]);
            //     } else {
            //         console.log("unknown lazy type: " + arr[i]);
            //     }
            // } else {
            //     // if the chunk doesn't already exist in this.lazyChunks,
            //     // that means this node hasn't been loaded, so start loading
            //     chunk = {
            //         state: "loading",
            //         callbacks: []
            //     };
            //     this.lazyChunks[chunkNum] = chunk;
            //     finish.inc();
            //     dojo.xhrGet(
            //         {
            //             url: this.baseURL +
            //                 this.lazyUrlTemplate.replace(
            //                         /\{Chunk\}/g, chunkNum
            //                 ),
            //             handleAs: "json",
            //             load: function(myChunk, parentIndex) {
            //                 return function(o) {
            //                     myChunk.state = "loaded";
            //                     myChunk.sublist = o;
            //                     ncl.iterHelper(o, from, to,
            //                                    fun, finish, inc,
            //                                    searchGet, testGet,
            //                                    [chunkNum]);
            //                     for (var c = 0;
            //                          c < lazyObj.callbacks.length;
            //                          c++)
            //                          myChunk.callbacks[c](o);
            //                     finish.dec();
            //                 };
            //             }(chunk, i),
            //             error: function() {
            //                 finish.dec();
            //             }
            //         });
            // }
        } else {
            fun(arr[i], path.concat(i));
        }

        var sublist = getSublist(arr[i]);
        if (sublist)
            this.iterHelper(sublist, from, to,
                            fun, finish, inc, searchGet, testGet,
                            path.concat(i));
        i += inc;
    }
};

NCList.prototype.iterate = function(from, to, fun, postFun) {
    // calls the given function once for each of the
    // intervals that overlap the given interval
    //if from <= to, iterates left-to-right, otherwise iterates right-to-left

    //inc: iterate leftward or rightward
    var inc = (from > to) ? -1 : 1;
    //searchGet: search on start or end
    var searchGet = (from > to) ? this.start : this.end;
    //testGet: test on start or end
    var testIndex = (from > to) ? this.end : this.start;
    var finish = new Finisher(postFun);
    this.iterHelper(this.topList, from, to, fun, finish,
                    inc, searchGet, testGet, [0]);
    finish.finish();
};

NCList.prototype.histogram = function(from, to, numBins, callback) {
    //calls callback with a histogram of the feature density
    //in the given interval

    var result = new Array(numBins);
    var binWidth = (to - from) / numBins;
    var start = this.start;
    var end = this.end;
    for (var i = 0; i < numBins; i++) result[i] = 0;
    //this.histHelper(this.topList, from, to, result, numBins, (to - from) / numBins);
    this.iterate(from, to,
                 function(feat) {
	             var firstBin =
                         Math.max(0, ((start(feat - from) / binWidth) | 0));
                     var lastBin =
                         Math.min(numBins, ((end(feat) - from) / binWidth) | 0);
	             for (var bin = firstBin; bin <= lastBin; bin++)
                         result[bin]++;
                 },
                 function() {
                     callback(result);
                 }
                 );
};

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
