define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/Deferred',
            'JBrowse/Model/Range',
            'jszlib/js/inflate'
        ],
        function( declare, lang, Deferred, Range, inflate_buffer ) {
var dlog = function(){ console.log.apply(console, arguments); };

var gettable = declare( null, {
    get: function(name) {
        return this[ { start: 'min', end: 'max' }[name] || name ];
    }
});
var Feature = declare( gettable, {} );
var Group = declare( gettable, {} );

return declare( null,
 /**
  * @lends JBrowse.Store.BigWig.Window
  */
{

    BIG_WIG_TYPE_GRAPH: 1,
    BIG_WIG_TYPE_VSTEP: 2,
    BIG_WIG_TYPE_FSTEP: 3,

    /**
     * View into a subset of the data in a BigWig file.
     *
     * Adapted by Robert Buels from bigwig.js in the Dalliance Genome
     * Explorer which is copyright Thomas Down 2006-2010
     * @constructs
     */
    constructor: function(bwg, cirTreeOffset, cirTreeLength, isSummary) {
        this.bwg = bwg;
        this.cirTreeOffset = cirTreeOffset;
        this.cirTreeLength = cirTreeLength;
        this.isSummary = isSummary;
    },

    BED_COLOR_REGEXP: /^[0-9]+,[0-9]+,[0-9]+/,

    readWigData: function(chrName, min, max, callback) {
        this.bwg.whenReady( this, function() {
            // console.log( 'reading wig data from '+chrName+':'+min+'..'+max);
            var chr = this.bwg.chromsToIDs[chrName];
            if (chr === undefined) {
                // Not an error because some .bwgs won't have data for all chromosomes.

                // dlog("Couldn't find chr " + chrName);
                // dlog('Chroms=' + miniJSONify(this.bwg.chromsToIDs));
                callback([]);
            } else {
                this.readWigDataById(chr, min, max, callback);
            }
        });
    },

    readWigDataById: function() {
        var args = arguments;
        this.bwg.whenReady( this, function() {
            this._readWigDataById.apply( this, args );
        });
    },

    _readWigDataById: function(chr, min, max, callback) {
        if (!this.cirHeader) {
            this.cirHeaderLoading = this.cirHeaderLoading || new Deferred();
            this.cirHeaderLoading.then( lang.hitch( this, function() { this.cirHeaderLoading = false; } ));
            this.cirHeaderLoading.then( lang.hitch( this, '_readWigDataById', chr, min, max, callback ) );

            if( !this.cirHeaderFetchInflight ) {
                this.cirHeaderFetchInflight = true;
                // dlog('No CIR yet, fetching');
                this.bwg.data
                    .slice(this.cirTreeOffset, 48)
                    .fetch( lang.hitch( this, function(result) {
                                this.cirHeader = result;
                                var la = new Int32Array( this.cirHeader);
                                this.cirBlockSize = la[1];
                                this.cirHeaderLoading.resolve({success: true});
                            }));
                return;
            }
            return;
        }

        var thisB = this;
        var blocksToFetch = [];
        var outstanding = 0;

        var beforeBWG = Date.now();

        var cirFobRecur = function(offset, level) {
            outstanding += offset.length;

            var maxCirBlockSpan = 4 +  (thisB.cirBlockSize * 32);   // Upper bound on size, based on a completely full leaf node.
            var spans;
            for (var i = 0; i < offset.length; ++i) {
                var blockSpan = new Range(offset[i], Math.min(offset[i] + maxCirBlockSpan, thisB.cirTreeOffset + thisB.cirTreeLength));
                spans = spans ? union(spans, blockSpan) : blockSpan;
            }

            var fetchRanges = spans.ranges();
            // dlog('fetchRanges: ' + fetchRanges);
            for (var r = 0; r < fetchRanges.length; ++r) {
                var fr = fetchRanges[r];
                cirFobStartFetch(offset, fr, level);
            }
        };

        var cirFobStartFetch = function(offset, fr, level, attempts) {
            var length = fr.max() - fr.min();
            // dlog('fetching ' + fr.min() + '-' + fr.max() + ' (' + (fr.max() - fr.min()) + ')');
            thisB.bwg.data.slice(fr.min(), fr.max() - fr.min()).fetch(function(resultBuffer) {
                                                                          for (var i = 0; i < offset.length; ++i) {
                                                                              if (fr.contains(offset[i])) {
                                                                                  cirFobRecur2(resultBuffer, offset[i] - fr.min(), level);
                                                                                  --outstanding;
                                                                                  if (outstanding == 0) {
                                                                                      cirCompleted();
                                                                                  }
                                                                              }
                                                                          }
                                                                      });
        };

        var cirFobRecur2 = function(cirBlockData, offset, level) {
            var ba = new Int8Array(cirBlockData);
            var sa = new Int16Array(cirBlockData);
            var la = new Int32Array(cirBlockData);

            var isLeaf = ba[offset];
            var cnt = sa[offset/2 + 1];
            // dlog('cir level=' + level + '; cnt=' + cnt);
            offset += 4;

            if (isLeaf != 0) {
                for (var i = 0; i < cnt; ++i) {
                    var lo = offset/4;
                    var startChrom = la[lo];
                    var startBase = la[lo + 1];
                    var endChrom = la[lo + 2];
                    var endBase = la[lo + 3];
                    var blockOffset = (la[lo + 4]<<32) | (la[lo + 5]);
                    var blockSize = (la[lo + 6]<<32) | (la[lo + 7]);
                    if ((startChrom < chr || (startChrom == chr && startBase <= max)) &&
                        (endChrom   > chr || (endChrom == chr && endBase >= min)))
                    {
                        // dlog('Got an interesting block: startBase=' + startBase + '; endBase=' + endBase + '; offset=' + blockOffset + '; size=' + blockSize);
                        blocksToFetch.push({offset: blockOffset, size: blockSize});
                    }
                    offset += 32;
                }
            } else {
                var recurOffsets = [];
                for (var i = 0; i < cnt; ++i) {
                    var lo = offset/4;
                    var startChrom = la[lo];
                    var startBase = la[lo + 1];
                    var endChrom = la[lo + 2];
                    var endBase = la[lo + 3];
                    var blockOffset = (la[lo + 4]<<32) | (la[lo + 5]);
                    if ((startChrom < chr || (startChrom == chr && startBase <= max)) &&
                        (endChrom   > chr || (endChrom == chr && endBase >= min)))
                    {
                        recurOffsets.push(blockOffset);
                    }
                    offset += 24;
                }
                if (recurOffsets.length > 0) {
                    cirFobRecur(recurOffsets, level + 1);
                }
            }
        };


        var cirCompleted = function() {
            blocksToFetch.sort(function(b0, b1) {
                                   return (b0.offset|0) - (b1.offset|0);
                               });

            if (blocksToFetch.length == 0) {
                callback([]);
            } else {
                var features = [];
                var createFeature = function(fmin, fmax, opts) {
                    // dlog('createFeature(' + fmin +', ' + fmax + ')');

                    if (!opts) {
                        opts = {};
                    }

                    var f = new Feature();
                    f.segment = thisB.bwg.idsToChroms[chr];
                    f.min = fmin;
                    f.max = fmax;
                    f.type = 'bigwig';

                    for (k in opts) {
                        f[k] = opts[k];
                    }

                    features.push(f);
                };
                var maybeCreateFeature = function(fmin, fmax, opts) {
                    if (fmin <= max && fmax >= min) {
                        createFeature(fmin, fmax, opts);
                    }
                };
                var tramp = function() {
                    if (blocksToFetch.length == 0) {
                        var afterBWG = Date.now();
                        // dlog('BWG fetch took ' + (afterBWG - beforeBWG) + 'ms');
                        callback(features);
                        return;  // just in case...
                    } else {
                        var block = blocksToFetch[0];
                        if (block.data) {
                            var ba = new Uint8Array(block.data);

                            if (thisB.isSummary) {
                                var sa = new Int16Array(block.data);
                                var la = new Int32Array(block.data);
                                var fa = new Float32Array(block.data);

                                var itemCount = block.data.byteLength/32;
                                for (var i = 0; i < itemCount; ++i) {
                                    var chromId =   la[(i*8)];
                                    var start =     la[(i*8)+1];
                                    var end =       la[(i*8)+2];
                                    var validCnt =  la[(i*8)+3];
                                    var minVal    = fa[(i*8)+4];
                                    var maxVal    = fa[(i*8)+5];
                                    var sumData   = fa[(i*8)+6];
                                    var sumSqData = fa[(i*8)+7];

                                    if (chromId == chr) {
                                        var summaryOpts = {type: 'bigwig', score: sumData/validCnt};
                                        if (thisB.bwg.type == 'bigbed') {
                                            summaryOpts.type = 'density';
                                        }
                                        maybeCreateFeature(start, end, summaryOpts);
                                    }
                                }
                            } else if (thisB.bwg.type == 'bigwig') {
                                var sa = new Int16Array(block.data);
                                var la = new Int32Array(block.data);
                                var fa = new Float32Array(block.data);

                                var chromId = la[0];
                                var blockStart = la[1];
                                var blockEnd = la[2];
                                var itemStep = la[3];
                                var itemSpan = la[4];
                                var blockType = ba[20];
                                var itemCount = sa[11];

                                // dlog('processing bigwig block, type=' + blockType + '; count=' + itemCount);

                                if (blockType == thisB.BIG_WIG_TYPE_FSTEP) {
                                    for (var i = 0; i < itemCount; ++i) {
                                        var score = fa[i + 6];
                                        maybeCreateFeature(blockStart + (i*itemStep), blockStart + (i*itemStep) + itemSpan, {score: score});
                                    }
                                } else if (blockType == thisB.BIG_WIG_TYPE_VSTEP) {
                                    for (var i = 0; i < itemCount; ++i) {
                                        var start = la[(i*2) + 6];
                                        var score = fa[(i*2) + 7];
                                        maybeCreateFeature(start, start + itemSpan, {score: score});
                                    }
                                } else if (blockType == thisB.BIG_WIG_TYPE_GRAPH) {
                                    for (var i = 0; i < itemCount; ++i) {
                                        var start = la[(i*3) + 6] + 1;
                                        var end   = la[(i*3) + 7];
                                        var score = fa[(i*3) + 8];
                                        if (start > end) {
                                            start = end;
                                        }
                                        maybeCreateFeature(start, end, {score: score});
                                    }
                                } else {
                                    dlog('Currently not handling bwgType=' + blockType);
                                }
                            } else if (thisB.bwg.type == 'bigbed') {
                                var offset = 0;
                                while (offset < ba.length) {
                                    var chromId = (ba[offset+3]<<24) | (ba[offset+2]<<16) | (ba[offset+1]<<8) | (ba[offset+0]);
                                    var start = (ba[offset+7]<<24) | (ba[offset+6]<<16) | (ba[offset+5]<<8) | (ba[offset+4]);
                                    var end = (ba[offset+11]<<24) | (ba[offset+10]<<16) | (ba[offset+9]<<8) | (ba[offset+8]);
                                    offset += 12;
                                    var rest = '';
                                    while (true) {
                                        var ch = ba[offset++];
                                        if (ch != 0) {
                                            rest += String.fromCharCode(ch);
                                        } else {
                                            break;
                                        }
                                    }

                                    var featureOpts = {};

                                    var bedColumns = rest.split('\t');
                                    if (bedColumns.length > 0) {
                                        featureOpts.label = bedColumns[0];
                                    }
                                    if (bedColumns.length > 1) {
                                        featureOpts.score = stringToInt(bedColumns[1]);
                                    }
                                    if (bedColumns.length > 2) {
                                        featureOpts.orientation = bedColumns[2];
                                    }
                                    if (bedColumns.length > 5) {
                                        var color = bedColumns[5];
                                        if (thisB.BED_COLOR_REGEXP.test(color)) {
                                            featureOpts.override_color = 'rgb(' + color + ')';
                                        }
                                    }

                                    if (bedColumns.length < 9) {
                                        if (chromId == chr) {
                                            maybeCreateFeature(start + 1, end, featureOpts);
                                        }
                                    } else if (chromId == chr && start <= max && end >= min) {
                                        // Complex-BED?
                                        // FIXME this is currently a bit of a hack to do Clever Things with ensGene.bb

                                        var thickStart = bedColumns[3]|0;
                                        var thickEnd   = bedColumns[4]|0;
                                        var blockCount = bedColumns[6]|0;
                                        var blockSizes = bedColumns[7].split(',');
                                        var blockStarts = bedColumns[8].split(',');

                                        featureOpts.type = 'bb-transcript';
                                        var grp = new Group();
                                        grp.id = bedColumns[0];
                                        grp.type = 'bb-transcript';
                                        grp.notes = [];
                                        featureOpts.groups = [grp];

                                        if (bedColumns.length > 10) {
                                            var geneId = bedColumns[9];
                                            var geneName = bedColumns[10];
                                            var gg = new Group();
                                            gg.id = geneId;
                                            gg.label = geneName;
                                            gg.type = 'gene';
                                            featureOpts.groups.push(gg);
                                        }

                                        var spans = null;
                                        for (var b = 0; b < blockCount; ++b) {
                                            var bmin = (blockStarts[b]|0) + start;
                                            var bmax = bmin + (blockSizes[b]|0);
                                            var span = new Range(bmin, bmax);
                                            if (spans) {
                                                spans = union(spans, span);
                                            } else {
                                                spans = span;
                                            }
                                        }

                                        var tsList = spans.ranges();
                                        for (var s = 0; s < tsList.length; ++s) {
                                            var ts = tsList[s];
                                            createFeature(ts.min() + 1, ts.max(), featureOpts);
                                        }

                                        if (thickEnd > thickStart) {
                                            var tl = intersection(spans, new Range(thickStart, thickEnd));
                                            if (tl) {
                                                featureOpts.type = 'bb-translation';
                                                var tlList = tl.ranges();
                                                for (var s = 0; s < tlList.length; ++s) {
                                                    var ts = tlList[s];
                                                    createFeature(ts.min() + 1, ts.max(), featureOpts);
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                dlog("Don't know what to do with " + thisB.bwg.type);
                            }
                            blocksToFetch.splice(0, 1);
                            tramp();
                        } else {
                            var fetchStart = block.offset;
                            var fetchSize = block.size;
                            var bi = 1;
                            while (bi < blocksToFetch.length && blocksToFetch[bi].offset == (fetchStart + fetchSize)) {
                                fetchSize += blocksToFetch[bi].size;
                                ++bi;
                            }

                            thisB.bwg.data.slice(fetchStart, fetchSize).fetch(function(result) {
                                                                                  var offset = 0;
                                                                                  var bi = 0;
                                                                                  while (offset < fetchSize) {
                                                                                      var fb = blocksToFetch[bi];

                                                                                      var data;
                                                                                      if (thisB.bwg.uncompressBufSize > 0) {
                                                                                          // var beforeInf = Date.now();
                                                                                          data = inflate_buffer(result, offset + 2, fb.size - 2);
                                                                                          // var afterInf = Date.now();
                                                                                          // dlog('inflate: ' + (afterInf - beforeInf) + 'ms');
                                                                                      } else {
                                                                                          var tmp = new Uint8Array(fb.size);    // FIXME is this really the best we can do?
                                                                                          arrayCopy(new Uint8Array(result, offset, fb.size), 0, tmp, 0, fb.size);
                                                                                          data = tmp.buffer;
                                                                                      }
                                                                                      fb.data = data;

                                                                                      offset += fb.size;
                                                                                      ++bi;
                                                                                  }
                                                                                  tramp();
                                                                              });
                        }
                    }
                };
                tramp();
            }
        };

        cirFobRecur([thisB.cirTreeOffset + 48], 1);
    },

    getFirstAdjacent: function(chrName, pos, dir, callback) {
        var chr = this.bwg.chromsToIDs[chrName];
        if (chr === undefined) {
            // Not an error because some .bwgs won't have data for all chromosomes.

            // dlog("Couldn't find chr " + chrName);
            // dlog('Chroms=' + miniJSONify(this.bwg.chromsToIDs));
            return callback([]);
        } else {
            return this.getFirstAdjacentById(chr, pos, dir, callback);
        }
    },

    getFirstAdjacentById: function(chr, pos, dir, callback) {
        var thisB = this;
        if (!this.cirHeader) {
            // dlog('No CIR yet, fetching');
            this.bwg.data.slice(this.cirTreeOffset, 48).fetch(function(result) {
                                                                  thisB.cirHeader = result;
                                                                  var la = new Int32Array(thisB.cirHeader);
                                                                  thisB.cirBlockSize = la[1];
                                                                  thisB.readWigDataById(chr, min, max, callback);
                                                              });
            return;
        }

        var blockToFetch = null;
        var bestBlockChr = -1;
        var bestBlockOffset = -1;

        var outstanding = 0;

        var beforeBWG = Date.now();

        var cirFobRecur = function(offset, level) {
            outstanding += offset.length;

            var maxCirBlockSpan = 4 +  (thisB.cirBlockSize * 32);   // Upper bound on size, based on a completely full leaf node.
            var spans;
            for (var i = 0; i < offset.length; ++i) {
                var blockSpan = new Range(offset[i], Math.min(offset[i] + maxCirBlockSpan, thisB.cirTreeOffset + thisB.cirTreeLength));
                spans = spans ? union(spans, blockSpan) : blockSpan;
            }

            var fetchRanges = spans.ranges();
            // dlog('fetchRanges: ' + fetchRanges);
            for (var r = 0; r < fetchRanges.length; ++r) {
                var fr = fetchRanges[r];
                cirFobStartFetch(offset, fr, level);
            }
        };

        var cirFobStartFetch = function(offset, fr, level, attempts) {
            var length = fr.max() - fr.min();
            // dlog('fetching ' + fr.min() + '-' + fr.max() + ' (' + (fr.max() - fr.min()) + ')');
            thisB.bwg.data.slice(fr.min(), fr.max() - fr.min()).fetch(function(result) {
                                                                          var resultBuffer = result;

                                                                          for (var i = 0; i < offset.length; ++i) {
                                                                              if (fr.contains(offset[i])) {
                                                                                  cirFobRecur2(resultBuffer, offset[i] - fr.min(), level);
                                                                                  --outstanding;
                                                                                  if (outstanding == 0) {
                                                                                      cirCompleted();
                                                                                  }
                                                                              }
                                                                          }
                                                                      });
        };

        var cirFobRecur2 = function(cirBlockData, offset, level) {
            var ba = new Int8Array(cirBlockData);
            var sa = new Int16Array(cirBlockData);
            var la = new Int32Array(cirBlockData);

            var isLeaf = ba[offset];
            var cnt = sa[offset/2 + 1];
            // dlog('cir level=' + level + '; cnt=' + cnt);
            offset += 4;

            if (isLeaf != 0) {
                for (var i = 0; i < cnt; ++i) {
                    var lo = offset/4;
                    var startChrom = la[lo];
                    var startBase = la[lo + 1];
                    var endChrom = la[lo + 2];
                    var endBase = la[lo + 3];
                    var blockOffset = (la[lo + 4]<<32) | (la[lo + 5]);
                    var blockSize = (la[lo + 6]<<32) | (la[lo + 7]);
                    // dlog('startChrom=' + startChrom);
                    if ((dir < 0 && ((startChrom < chr || (startChrom == chr && startBase <= pos)))) ||
                        (dir > 0 && ((endChrom > chr || (endChrom == chr && endBase >= pos)))))
                    {
                        // dlog('Got an interesting block: startBase=' + startChrom + ':' + startBase + '; endBase=' + endChrom + ':' + endBase + '; offset=' + blockOffset + '; size=' + blockSize);
                        if (/_random/.exec(thisB.bwg.idsToChroms[startChrom])) {
                            // dlog('skipping random: ' + thisB.bwg.idsToChroms[startChrom]);
                        } else if (blockToFetch == null || ((dir < 0) && (endChrom > bestBlockChr || (endChrom == bestBlockChr && endBase > bestBlockOffset)) ||
                                                            (dir > 0) && (startChrom < bestBlockChr || (startChrom == bestBlockChr && startBase < bestBlockOffset))))
                        {
                            //                        dlog('best is: startBase=' + startChrom + ':' + startBase + '; endBase=' + endChrom + ':' + endBase + '; offset=' + blockOffset + '; size=' + blockSize);
                            blockToFetch = {offset: blockOffset, size: blockSize};
                            bestBlockOffset = (dir < 0) ? endBase : startBase;
                            bestBlockChr = (dir < 0) ? endChrom : startChrom;
                        }
                    }
                    offset += 32;
                }
            } else {
                var bestRecur = -1;
                var bestPos = -1;
                var bestChr = -1;
                for (var i = 0; i < cnt; ++i) {
                    var lo = offset/4;
                    var startChrom = la[lo];
                    var startBase = la[lo + 1];
                    var endChrom = la[lo + 2];
                    var endBase = la[lo + 3];
                    var blockOffset = (la[lo + 4]<<32) | (la[lo + 5]);
                    // dlog('startChrom=' + startChrom);
                    if ((dir < 0 && ((startChrom < chr || (startChrom == chr && startBase <= pos)) &&
                                     (endChrom   >= chr))) ||
                        (dir > 0 && ((endChrom > chr || (endChrom == chr && endBase >= pos)) &&
                                     (startChrom <= chr))))
                    {
                        // dlog('Got an interesting block: startBase=' + startChrom + ':' + startBase + '; endBase=' + endChrom + ':' + endBase + '; offset=' + blockOffset + '; size=' + blockSize);
                        if (bestRecur < 0 || endBase > bestPos) {
                            bestRecur = blockOffset;
                            bestPos = (dir < 0) ? endBase : startBase;
                            bestChr = (dir < 0) ? endChrom : startChrom;
                        }
                    }
                    offset += 24;
                }
                if (bestRecur >= 0) {
                    cirFobRecur([bestRecur], level + 1);
                }
            }
        };


        var cirCompleted = function() {
            if (blockToFetch == null) {
                return dlog('got nothing');
            }
            var blocksToFetch = [blockToFetch];

            blocksToFetch.sort(function(b0, b1) {
                                   return (b0.offset|0) - (b1.offset|0);
                               });

            if (blocksToFetch.length == 0) {
                callback([]);
            } else {
                var bestFeature = null;
                var bestChr = -1;
                var bestPos = -1;
                var createFeature = function(chrx, fmin, fmax, opts) {
                    //                dlog('createFeature(' + fmin +', ' + fmax + ')');

                    if (!opts) {
                        opts = {};
                    }

                    var f = new Feature();
                    f.segment = thisB.bwg.idsToChroms[chrx];
                    f.min = fmin;
                    f.max = fmax;
                    f.type = 'bigwig';

                    for (k in opts) {
                        f[k] = opts[k];
                    }

                    if (bestFeature == null || ((dir < 0) && (chrx > bestChr || fmax > bestPos)) || ((dir > 0) && (chrx < bestChr || fmin < bestPos))) {
                        bestFeature = f;
                        bestPos = (dir < 0) ? fmax : fmin;
                        bestChr = chrx;
                    }
                };
                var maybeCreateFeature = function(chrx, fmin, fmax, opts) {
                    //                dlog('maybeCreateFeature(' + thisB.bwg.idsToChroms[chrx] + ',' + fmin + ',' + fmax + ')');
                    if ((dir < 0 && (chrx < chr || fmax < pos)) || (dir > 0 && (chrx > chr || fmin > pos))) {
                        //                if (fmin <= max && fmax >= min) {
                        createFeature(chrx, fmin, fmax, opts);
                        //}
                    }
                };
                var tramp = function() {
                    if (blocksToFetch.length == 0) {
                        var afterBWG = Date.now();
                        // dlog('BWG fetch took ' + (afterBWG - beforeBWG) + 'ms');
                        callback([bestFeature]);
                        return;  // just in case...
                    } else {
                        var block = blocksToFetch[0];
                        if (block.data) {
                            var ba = new Uint8Array(block.data);

                            if (thisB.isSummary) {
                                var sa = new Int16Array(block.data);
                                var la = new Int32Array(block.data);
                                var fa = new Float32Array(block.data);

                                var itemCount = block.data.byteLength/32;
                                for (var i = 0; i < itemCount; ++i) {
                                    var chromId =   la[(i*8)];
                                    var start =     la[(i*8)+1];
                                    var end =       la[(i*8)+2];
                                    var validCnt =  la[(i*8)+3];
                                    var minVal    = fa[(i*8)+4];
                                    var maxVal    = fa[(i*8)+5];
                                    var sumData   = fa[(i*8)+6];
                                    var sumSqData = fa[(i*8)+7];

                                    var summaryOpts = {type: 'bigwig', score: sumData/validCnt};
                                    if (thisB.bwg.type == 'bigbed') {
                                        summaryOpts.type = 'density';
                                    }
                                    maybeCreateFeature(chromId, start, end, summaryOpts);
                                }
                            } else if (thisB.bwg.type == 'bigwig') {
                                var sa = new Int16Array(block.data);
                                var la = new Int32Array(block.data);
                                var fa = new Float32Array(block.data);

                                var chromId = la[0];
                                var blockStart = la[1];
                                var blockEnd = la[2];
                                var itemStep = la[3];
                                var itemSpan = la[4];
                                var blockType = ba[20];
                                var itemCount = sa[11];

                                // dlog('processing bigwig block, type=' + blockType + '; count=' + itemCount);

                                if (blockType == thisB.BIG_WIG_TYPE_FSTEP) {
                                    for (var i = 0; i < itemCount; ++i) {
                                        var score = fa[i + 6];
                                        maybeCreateFeature(chromId, blockStart + (i*itemStep), blockStart + (i*itemStep) + itemSpan, {score: score});
                                    }
                                } else if (blockType == thisB.BIG_WIG_TYPE_VSTEP) {
                                    for (var i = 0; i < itemCount; ++i) {
                                        var start = la[(i*2) + 6];
                                        var score = fa[(i*2) + 7];
                                        maybeCreateFeature(start, start + itemSpan, {score: score});
                                    }
                                } else if (blockType == thisB.BIG_WIG_TYPE_GRAPH) {
                                    for (var i = 0; i < itemCount; ++i) {
                                        var start = la[(i*3) + 6] + 1;
                                        var end   = la[(i*3) + 7];
                                        var score = fa[(i*3) + 8];
                                        if (start > end) {
                                            start = end;
                                        }
                                        maybeCreateFeature(start, end, {score: score});
                                    }
                                } else {
                                    dlog('Currently not handling bwgType=' + blockType);
                                }
                            } else if (thisB.bwg.type == 'bigbed') {
                                var offset = 0;
                                while (offset < ba.length) {
                                    var chromId = (ba[offset+3]<<24) | (ba[offset+2]<<16) | (ba[offset+1]<<8) | (ba[offset+0]);
                                    var start = (ba[offset+7]<<24) | (ba[offset+6]<<16) | (ba[offset+5]<<8) | (ba[offset+4]);
                                    var end = (ba[offset+11]<<24) | (ba[offset+10]<<16) | (ba[offset+9]<<8) | (ba[offset+8]);
                                    offset += 12;
                                    var rest = '';
                                    while (true) {
                                        var ch = ba[offset++];
                                        if (ch != 0) {
                                            rest += String.fromCharCode(ch);
                                        } else {
                                            break;
                                        }
                                    }

                                    var featureOpts = {};

                                    var bedColumns = rest.split('\t');
                                    if (bedColumns.length > 0) {
                                        featureOpts.label = bedColumns[0];
                                    }
                                    if (bedColumns.length > 1) {
                                        featureOpts.score = 100; /* bedColumns[1]; */
                                    }
                                    if (bedColumns.length > 2) {
                                        featureOpts.orientation = bedColumns[2];
                                    }

                                    maybeCreateFeature(chromId, start + 1, end, featureOpts);
                                }
                            } else {
                                dlog("Don't know what to do with " + thisB.bwg.type);
                            }
                            blocksToFetch.splice(0, 1);
                            tramp();
                        } else {
                            var fetchStart = block.offset;
                            var fetchSize = block.size;
                            var bi = 1;
                            while (bi < blocksToFetch.length && blocksToFetch[bi].offset == (fetchStart + fetchSize)) {
                                fetchSize += blocksToFetch[bi].size;
                                ++bi;
                            }

                            thisB.bwg.data.slice(fetchStart, fetchSize)
                                .fetch(function(result) {
                                           var offset = 0;
                                           var bi = 0;
                                           while (offset < fetchSize) {
                                               var fb = blocksToFetch[bi];

                                               var data;
                                               if (thisB.bwg.uncompressBufSize > 0) {
                                                   // var beforeInf = Date.now()
                                                   data = inflate_buffer(result, offset + 2, fb.size - 2);
                                                   // var afterInf = Date.now();
                                                   // dlog('inflate: ' + (afterInf - beforeInf) + 'ms');
                                               } else {
                                                   var tmp = new Uint8Array(fb.size);    // FIXME is this really the best we can do?
                                                   arrayCopy(new Uint8Array(result, offset, fb.size), 0, tmp, 0, fb.size);
                                                   data = tmp.buffer;
                                               }
                                               fb.data = data;

                                               offset += fb.size;
                                               ++bi;
                                           }
                                           tramp();
                                       });
                        }
                    }
                };
                tramp();
            }
        };

        cirFobRecur([thisB.cirTreeOffset + 48], 1);
    }
});

});
