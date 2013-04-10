define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'JBrowse/Model/Range',
            'jszlib/inflate'
        ],
        function( declare, dlang, Range, inflate ) {

var dlog = function(){ console.log.apply(console, arguments); };

var gettable = declare( null, {
    get: function(name) {
        return this[ { start: 'min', end: 'max', seq_id: 'segment' }[name] || name ];
    },
    tags: function() {
        return ['start','end','seq_id','score','type','source'];
    }
});
var Feature = declare( gettable, {} );
var Group = declare( gettable, {} );

var RequestWorker = declare( null,
 /**
  * @lends JBrowse.Store.BigWig.Window.RequestWorker.prototype
  */
 {

    BIG_WIG_TYPE_GRAPH: 1,
    BIG_WIG_TYPE_VSTEP: 2,
    BIG_WIG_TYPE_FSTEP: 3,

    /**
     * Worker object for reading data from a bigwig or bigbed file.
     * Manages the state necessary for traversing the index trees and
     * so forth.
     *
     * Adapted by Robert Buels from bigwig.js in the Dalliance Genome
     * Explorer by Thomas Down.
     * @constructs
     */
    constructor: function( window, chr, min, max, callback ) {
        this.window = window;
        this.source = window.bwg.name || undefined;

        this.blocksToFetch = [];
        this.outstanding = 0;

        this.chr = chr;
        this.min = min;
        this.max = max;
        this.callback = callback;
    },

    cirFobRecur: function(offset, level) {
        this.outstanding += offset.length;

        var maxCirBlockSpan = 4 +  (this.window.cirBlockSize * 32);   // Upper bound on size, based on a completely full leaf node.
        var spans;
        for (var i = 0; i < offset.length; ++i) {
            var blockSpan = new Range(offset[i], Math.min(offset[i] + maxCirBlockSpan, this.window.cirTreeOffset + this.window.cirTreeLength));
            spans = spans ? spans.union( blockSpan ) : blockSpan;
        }

        var fetchRanges = spans.ranges();
        //dlog('fetchRanges: ' + fetchRanges);
        for (var r = 0; r < fetchRanges.length; ++r) {
            var fr = fetchRanges[r];
            this.cirFobStartFetch(offset, fr, level);
        }
    },

    cirFobStartFetch: function(offset, fr, level, attempts) {
        var length = fr.max() - fr.min();
        //dlog('fetching ' + fr.min() + '-' + fr.max() + ' (' + (fr.max() - fr.min()) + ')');
        //console.log('cirfobstartfetch');
        this.window.bwg.data
            .slice(fr.min(), fr.max() - fr.min())
            .fetch( dlang.hitch( this,function(resultBuffer) {
                                     for (var i = 0; i < offset.length; ++i) {
                                         if (fr.contains(offset[i])) {
                                             this.cirFobRecur2(resultBuffer, offset[i] - fr.min(), level);
                                             --this.outstanding;
                                             if (this.outstanding == 0) {
                                                 this.cirCompleted();
                                             }
                                         }
                                     }
                                 }));
    },

    cirFobRecur2: function(cirBlockData, offset, level) {
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
                if ((startChrom < this.chr || (startChrom == this.chr && startBase <= this.max)) &&
                    (endChrom   > this.chr || (endChrom == this.chr && endBase >= this.min)))
                {
                    // dlog('Got an interesting block: startBase=' + startBase + '; endBase=' + endBase + '; offset=' + blockOffset + '; size=' + blockSize);
                    this.blocksToFetch.push({offset: blockOffset, size: blockSize});
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
                if ((startChrom < this.chr || (startChrom == this.chr && startBase <= this.max)) &&
                    (endChrom   > this.chr || (endChrom == this.chr && endBase >= this.min)))
                {
                    recurOffsets.push(blockOffset);
                }
                offset += 24;
            }
            if (recurOffsets.length > 0) {
                this.cirFobRecur(recurOffsets, level + 1);
            }
        }
    },

    cirCompleted: function() {
        this.blocksToFetch.sort(function(b0, b1) {
                               return (b0.offset|0) - (b1.offset|0);
                           });

        if (this.blocksToFetch.length == 0) {
            this.callback([]);
        } else {
            this.features = [];
            this.tramp();
        }
    },

    createFeature: function(fmin, fmax, opts) {
        // dlog('createFeature(' + fmin +', ' + fmax + ')');

        if (!opts) {
            opts = {};
        }

        var f = new Feature();
        f.segment = (this.window.bwg.refsByNumber[this.chr]||{}).name;
        f.min = fmin;
        f.max = fmax;
        f.type = 'remark';
        f.source = this.source;

        for (k in opts) {
            f[k] = opts[k];
        }

        this.features.push(f);
    },
    maybeCreateFeature: function(fmin, fmax, opts) {
        if (fmin <= this.max && fmax >= this.min) {
            this.createFeature( fmin, fmax, opts );
        }
    },
    tramp: function() {
        if (this.blocksToFetch.length == 0) {
            //var afterBWG = new Date();
            // dlog('BWG fetch took ' + (afterBWG - beforeBWG) + 'ms');
            this.callback( this.features );
            return;  // just in case...
        } else {
            var block = this.blocksToFetch[0];
            if (block.data) {
                var ba = new Uint8Array(block.data);

                if (this.window.isSummary) {
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

                        if (chromId == this.chr) {
                            var summaryOpts = {score: sumData/validCnt};
                            if (this.window.bwg.type == 'bigbed') {
                                summaryOpts.type = 'density';
                            }
                            this.maybeCreateFeature( start, end, summaryOpts);
                        }
                    }
                } else if (this.window.bwg.type == 'bigwig') {
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

                    if (blockType == this.BIG_WIG_TYPE_FSTEP) {
                        for (var i = 0; i < itemCount; ++i) {
                            var score = fa[i + 6];
                            this.maybeCreateFeature( blockStart + (i*itemStep), blockStart + (i*itemStep) + itemSpan, {score: score});
                        }
                    } else if (blockType == this.BIG_WIG_TYPE_VSTEP) {
                        for (var i = 0; i < itemCount; ++i) {
                            var start = la[(i*2) + 6];
                            var score = fa[(i*2) + 7];
                            this.maybeCreateFeature( start, start + itemSpan, {score: score});
                        }
                    } else if (blockType == this.BIG_WIG_TYPE_GRAPH) {
                        for (var i = 0; i < itemCount; ++i) {
                            var start = la[(i*3) + 6];
                            var end   = la[(i*3) + 7];
                            var score = fa[(i*3) + 8];
                            if (start > end) {
                                start = end;
                            }
                            this.maybeCreateFeature( start, end, {score: score});
                        }
                    } else {
                        dlog('Currently not handling bwgType=' + blockType);
                    }
                } else if (this.window.bwg.type == 'bigbed') {
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
                            if (this.window.BED_COLOR_REGEXP.test(color)) {
                                featureOpts.override_color = 'rgb(' + color + ')';
                            }
                        }

                        if (bedColumns.length < 9) {
                            if (chromId == this.chr) {
                                this.maybeCreateFeature( start, end, featureOpts);
                            }
                        } else if (chromId == this.chr && start <= this.max && end >= this.min) {
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
                                    spans = spans.union( span );
                                } else {
                                    spans = span;
                                }
                            }

                            var tsList = spans.ranges();
                            for (var s = 0; s < tsList.length; ++s) {
                                var ts = tsList[s];
                                this.createFeature( ts.min(), ts.max(), featureOpts);
                            }

                            if (thickEnd > thickStart) {
                                var tl = spans.intersection( new Range(thickStart, thickEnd) );
                                if (tl) {
                                    featureOpts.type = 'bb-translation';
                                    var tlList = tl.ranges();
                                    for (var s = 0; s < tlList.length; ++s) {
                                        var ts = tlList[s];
                                        this.createFeature( ts.min(), ts.max(), featureOpts);
                                    }
                                }
                            }
                        }
                    }
                } else {
                    dlog("Don't know what to do with " + this.window.bwg.type);
                }
                this.blocksToFetch.splice(0, 1);
                this.tramp();
            } else {
                var fetchStart = block.offset;
                var fetchSize = block.size;
                var bi = 1;
                while (bi < this.blocksToFetch.length && this.blocksToFetch[bi].offset == (fetchStart + fetchSize)) {
                    fetchSize += this.blocksToFetch[bi].size;
                    ++bi;
                }

                //dlog('other thing');
                this.window.bwg.data
                    .slice(fetchStart, fetchSize)
                    .fetch(dlang.hitch( this, function(result) {
                                            var offset = 0;
                                            var bi = 0;
                                            while (offset < fetchSize) {
                                                var fb = this.blocksToFetch[bi];

                                                var data;
                                                if (this.window.bwg.uncompressBufSize > 0) {
                                                    // var beforeInf = new Date();
                                                    data = inflate(result, offset + 2, fb.size - 2);
                                                    // var afterInf = new Date();
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
                                            this.tramp();
                                        }));
            }
        }
    }
});

return RequestWorker;

});