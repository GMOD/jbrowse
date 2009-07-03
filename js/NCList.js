//After
//Alekseyenko, A., and Lee, C. (2007).
//Nested Containment List (NCList): A new algorithm for accelerating
//   interval query of genome alignment and interval databases.
//Bioinformatics, doi:10.1093/bioinformatics/btl647
//http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1

function NCList() {
}

NCList.prototype.importExisting = function(nclist, sublistIndex,
                                           lazyIndex, baseURL) {
    this.topList = nclist;
    this.sublistIndex = sublistIndex;
    this.lazyIndex = lazyIndex;
    this.baseURL = baseURL;
};

NCList.prototype.fill = function(intervals, sublistIndex) {
    //intervals: array of arrays of [start, end, ...]
    //sublistIndex: index into a [start, end] array for storing a sublist
    //              array. this is so you can use those arrays for something
    //              else, and keep the NCList bookkeeping from interfering.
    //              That's hacky, but keeping a separate copy of the intervals
    //              in the NCList seems like a waste (TODO: measure that waste).
    //half-open?
    this.sublistIndex = sublistIndex;
    var myIntervals = intervals;//.concat();
    //sort by OL
    myIntervals.sort(function(a, b) {
        if (a[0] != b[0])
            return a[0] - b[0];
        else
            return b[1] - a[1];
    });
    var sublistStack = new Array();
    var curList = new Array();
    this.topList = curList;
    curList.push(myIntervals[0]);
    var curInterval, topSublist;
    for (var i = 1, len = myIntervals.length; i < len; i++) {
        curInterval = myIntervals[i];
        //if this interval is contained in the previous interval,
        if (curInterval[1] < myIntervals[i - 1][1]) {
            //create a new sublist starting with this interval
            sublistStack.push(curList);
            curList = new Array(curInterval);
            myIntervals[i - 1][sublistIndex] = curList;
        } else {
            //find the right sublist for this interval
            while (true) {
                if (0 == sublistStack.length) {
                    curList.push(curInterval);
                    break;
                } else {
                    topSublist = sublistStack[sublistStack.length - 1];
                    if (topSublist[topSublist.length - 1][1] > curInterval[1]) {
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

NCList.prototype.binarySearch = function(arr, item, itemIndex) {
    var low = -1;
    var high = arr.length;
    var mid;

    while (high - low > 1) {
        mid = (low + high) >>> 1;
        if (arr[mid][itemIndex] > item)
            high = mid;
        else
            low = mid;
    }

    //if we're iterating rightward, return the high index;
    //if leftward, the low index
    if (1 == itemIndex) return high; else return low;
};

//due to javascript function-call overhead, there's some copy/paste code below,
//for performance.  If later profiling shows that we can get away with a cleaner
//version using function pointers then it might be better to re-arrange this.

NCList.prototype.iterHelper = function(arr, from, to, fun, finish,
                                       inc, searchIndex, testIndex) {
    var len = arr.length;
    var i = this.binarySearch(arr, from, searchIndex);
    while ((i < len)
           && (i >= 0)
           && ((inc * arr[i][testIndex]) < (inc * to)) ) {

        if ("object" == typeof arr[i][this.lazyIndex]) {
            var ncl = this;
            // lazy node
            if ("loading" == arr[i][this.lazyIndex].state) {
                //node is currently loading, just add ourselves
                //as a callback
                finish.inc();
                arr[i][this.lazyIndex].callbacks.push(
                    function(o) {
                        ncl.iterHelper(o, from, to, fun, finish, inc,
                                       searchIndex, testIndex);
                        finish.dec();
                    });
                return;
            } else if ("lazy" == arr[i][this.lazyIndex].state) {
                //node hasn't been loaded, start loading
                arr[i][this.lazyIndex].state = "loading";
                arr[i][this.lazyIndex].callbacks = [];
                finish.inc();
                dojo.xhrGet(
                    {
                        url: this.baseURL + arr[i][this.lazyIndex].path,
                        handleAs: "json",
                        load: function(lazyFeat, lazyObj, sublistIndex) {
                            return function(o) {
                                lazyObj.state = "loaded";
                                lazyFeat[sublistIndex] = o;
                                ncl.iterHelper(o, from, to,
                                               fun, finish, inc,
                                               searchIndex, testIndex);
                                for (var c = 0;
                                     c < lazyObj.callbacks.length;
                                     c++)
                                     lazyObj.callbacks[c](o);
                                finish.dec();
                            };
                        }(arr[i], arr[i][this.lazyIndex], this.sublistIndex),
                        error: function() {
                            finish.dec();
                        }
                    });
                return;
            } else if ("loaded" == arr[i][this.lazyIndex].state) {
                //just continue below
            } else {
                console.log("unknown lazy type: " + arr[i]);
            }
        } else {
            fun(arr[i]);
        }

        if (arr[i][this.sublistIndex])
            this.iterHelper(arr[i][this.sublistIndex], from, to,
                            fun, finish, inc, searchIndex, testIndex);
        i += inc;
    }
};

NCList.prototype.iterate = function(from, to, fun, postFun) {
    // calls the given function with an array containing all the
    // intervals that overlap the given interval
    //if from <= to, iterates left-to-right, otherwise iterates right-to-left

    //inc: iterate leftward or rightward
    var inc = (from > to) ? -1 : 1;
    //searchIndex: search on start or end
    var searchIndex = (from > to) ? 0 : 1;
    //testIndex: test on start or end
    var testIndex = (from > to) ? 1 : 0;
    var finish = new Finisher(postFun);
    this.iterHelper(this.topList, from, to, fun, finish,
                    inc, searchIndex, testIndex);
    finish.finish();
};

NCList.prototype.overlaps = function(from, to) {
    //returns an array of all of the intervals that overlap
    //the given interval.
    //if from <= to, result is sorted left-to-right (on start),
    //otherwise right-to-left (on end)

    //inc: iterate leftward or rightward
    var inc = (from > to) ? -1 : 1;
    //searchIndex: search on start or end
    var searchIndex = (from > to) ? 0 : 1;
    //testIndex: test on start or end
    var testIndex = (from > to) ? 1 : 0;
    var result = [];
    this.overlapHelper(this.topList, from, to, result,
		       inc, searchIndex, testIndex);
    return result;
};

NCList.prototype.overlapHelper = function(arr, from, to, result,
					  inc, searchIndex, testIndex) {
    var len = arr.length;
    var i = this.binarySearch(arr, from, searchIndex);
    while ((i < len)
           && (i >= 0)
           && ((inc * arr[i][testIndex]) < (inc * to))) {
	result.push(arr[i]);
        if (arr[i][this.sublistIndex] !== undefined)
            this.overlapHelper(arr[i][this.sublistIndex], from, to,
			       result, inc, searchIndex, testIndex);
        i += inc;
    }
};

NCList.prototype.histogram = function(from, to, numBins) {
    //returns a histogram of the feature density in the given interval

    var result = new Array(numBins);
    for (var i = 0; i < numBins; i++) result[i] = 0;
    this.histHelper(this.topList, from, to, result, numBins, (to - from) / numBins);
    return result;
};

NCList.prototype.histHelper = function(arr, from, to, result, numBins, binWidth) {
    var len = arr.length;
    var i = this.binarySearch(arr, from, 1);
    var firstBin, lastBin;
    while ((i < len)
           && (i >= 0)
           && (arr[i][0] < to)) {
	firstBin = Math.max(0, ((arr[i][0] - from) / binWidth) | 0);
	lastBin = Math.min(numBins, ((arr[i][1] - from) / binWidth) | 0);
	for (var bin = firstBin; bin <= lastBin; bin++) result[bin]++;
        if (arr[i][this.sublistIndex] !== undefined)
            this.histHelper(arr[i][this.sublistIndex], from, to, result, numBins, binWidth);
        i++;
    }
};

function Finisher(fun) {
    this.fun = fun;
    this.count = 0;
}

Finisher.prototype.inc = function() {
    this.count++;
};

Finisher.prototype.dec = function() {
    this.count--;
    this.finish();
};

Finisher.prototype.finish = function() {
    if (this.count <= 0) this.fun();
};

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
