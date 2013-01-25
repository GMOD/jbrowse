define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/Util',
            'JBrowse/Store/LRUCache',
            './Util',
            './LazyFeature'
        ],
        function( declare, array, Util, LRUCache, BAMUtil, BAMFeature ) {

var BAM_MAGIC = 21840194;
var BAI_MAGIC = 21578050;

var dlog = function(){ console.error.apply(console, arguments); };

//
// Binning (transliterated from SAM1.3 spec)
//

/* calculate bin given an alignment covering [beg,end) (zero-based, half-close-half-open) */
function reg2bin(beg, end)
{
    --end;
    if (beg>>14 == end>>14) return ((1<<15)-1)/7 + (beg>>14);
    if (beg>>17 == end>>17) return ((1<<12)-1)/7 + (beg>>17);
    if (beg>>20 == end>>20) return ((1<<9)-1)/7 + (beg>>20);
    if (beg>>23 == end>>23) return ((1<<6)-1)/7 + (beg>>23);
    if (beg>>26 == end>>26) return ((1<<3)-1)/7 + (beg>>26);
    return 0;
}

/* calculate the list of bins that may overlap with region [beg,end) (zero-based) */
var MAX_BIN = (((1<<18)-1)/7);
function reg2bins(beg, end)
{
    var k, list = [];
    --end;
    list.push(0);
    for (k = 1 + (beg>>26); k <= 1 + (end>>26); ++k) list.push(k);
    for (k = 9 + (beg>>23); k <= 9 + (end>>23); ++k) list.push(k);
    for (k = 73 + (beg>>20); k <= 73 + (end>>20); ++k) list.push(k);
    for (k = 585 + (beg>>17); k <= 585 + (end>>17); ++k) list.push(k);
    for (k = 4681 + (beg>>14); k <= 4681 + (end>>14); ++k) list.push(k);
    return list;
}

var Chunk = Util.fastDeclare({
    constructor: function(minv,maxv,bin) {
        this.minv = minv;
        this.maxv = maxv;
        this.bin = bin;
    },
    toString: function() {
        return this.minv+'..'+this.maxv+' (bin '+this.bin+')';
    }
});

var readInt   = BAMUtil.readInt;
var readVirtualOffset = BAMUtil.readVirtualOffset;

var BamFile = declare( null,


/**
 * @lends JBrowse.Store.SeqFeature.BAM.File
 */
{

    /**
     * Low-level BAM file reading code.
     *
     * Adapted by Robert Buels from bam.js in the Dalliance Genome
     * Explorer which is copyright Thomas Down 2006-2010
     * @constructs
     */
    constructor: function( args ) {
        this.store = args.store;
        this.data  = args.data;
        this.bai   = args.bai;
    },

    init: function( args ) {
        var bam = this;
        var successCallback = args.success || function() {};
        var failCallback = args.failure || function() {};

        this._readBAI( dojo.hitch( this, function() {
            this._readBAMheader( function() {
                successCallback();
            }, failCallback );
        }), failCallback );
    },

    _readBAI: function( successCallback, failCallback ) {
        // Do we really need to fetch the whole thing? :-(
        this.bai.fetch( dojo.hitch( this, function(header) {
            if (!header) {
                dlog("No data read from BAM index (BAI) file");
                failCallback("No data read from BAM index (BAI) file");
                return;
            }

            if( ! Uint8Array ) {
                dlog('Browser does not support typed arrays');
                failCallback('Browser does not support typed arrays');
                return;
            }

            var uncba = new Uint8Array(header);
            if( readInt(uncba, 0) != BAI_MAGIC) {
                dlog('Not a BAI file');
                failCallback('Not a BAI file');
                return;
            }

            var nref = readInt(uncba, 4);

            this.indices = [];

            var p = 8;
            for (var ref = 0; ref < nref; ++ref) {
                var blockStart = p;
                var nbin = readInt(uncba, p); p += 4;
                for (var b = 0; b < nbin; ++b) {
                    var bin = readInt(uncba, p);
                    var nchnk = readInt(uncba, p+4);
                    p += 8;
                    for( var chunkNum = 0; chunkNum < nchnk; chunkNum++ ) {
                        var vo = readVirtualOffset( uncba, p );
                        this._findMinAlignment( vo );
                        p += 16;
                    }
                }
                var nintv = readInt(uncba, p); p += 4;
                // as we're going through the linear index, figure out
                // the smallest virtual offset in the indexes, which
                // tells us where the BAM header ends
                this._findMinAlignment( nintv ? readVirtualOffset(uncba,p) : null );

                p += nintv * 8;
                if( nbin > 0 || nintv > 0 ) {
                    this.indices[ref] = new Uint8Array(header, blockStart, p - blockStart);
                }
            }

            this.empty = ! this.indices.length;

            successCallback( this.indices, this.minAlignmentVO );
        }), failCallback );
    },

    _findMinAlignment: function( candidate ) {
        if( candidate && ( ! this.minAlignmentVO || this.minAlignmentVO.cmp( candidate ) < 0 ) )
            this.minAlignmentVO = candidate;
    },

    _readBAMheader: function( successCallback, failCallback ) {
        var thisB = this;
        // We have the virtual offset of the first alignment
        // in the file.  Cannot completely determine how
        // much of the first part of the file to fetch to get just
        // up to that, since the file is compressed.  Thus, fetch
        // up to the start of the BGZF block that the first
        // alignment is in, plus 64KB, which should get us that whole
        // BGZF block, assuming BGZF blocks are no bigger than 64KB.
        thisB.data.read(
            0,
            thisB.minAlignmentVO ? thisB.minAlignmentVO.block + 65535 : null,
            function(r) {
                var unc = BAMUtil.unbgzf(r);
                var uncba = new Uint8Array(unc);

                if( readInt(uncba, 0) != BAM_MAGIC) {
                    dlog('Not a BAM file');
                    failCallback( 'Not a BAM file' );
                    return;
                }

                var headLen = readInt(uncba, 4);
                // var header = '';
                // for (var i = 0; i < headLen; ++i) {
                //     header += String.fromCharCode(uncba[i + 8]);
                // }


                // have to do another request, because sometimes
                // minAlignment VO is just flat wrong.
                // if headLen is not too big, this will just be in the
                // RemoteBinaryFile cache
                thisB.data.read( 0, headLen+8+65536,
                                 function(r) {
                    var unc = BAMUtil.unbgzf(r);
                    var uncba = new Uint8Array(unc);

                    var nRef = readInt(uncba, headLen + 8);
                    var p = headLen + 12;

                    thisB.chrToIndex = {};
                    thisB.indexToChr = [];
                    for (var i = 0; i < nRef; ++i) {
                        var lName = readInt(uncba, p);
                        var name = '';
                        for (var j = 0; j < lName-1; ++j) {
                            name += String.fromCharCode(uncba[p + 4 + j]);
                        }
                        var lRef = readInt(uncba, p + lName + 4);
                        // dlog(name + ': ' + lRef);
                        thisB.chrToIndex[name] = i;
                        if (name.indexOf('chr') == 0) {
                            thisB.chrToIndex[name.substring(3)] = i;
                        } else {
                            thisB.chrToIndex['chr' + name] = i;
                        }

                        thisB.indexToChr.push({ name: name, length: lRef });

                        p = p + 8 + lName;
                    }

                    successCallback();
            });
        });
    },

    blocksForRange: function(refId, min, max) {
        var index = this.indices[refId];
        if (!index) {
            return [];
        }

        var intBinsL = reg2bins(min, max);
        var intBins = [];
        for (var i = 0; i < intBinsL.length; ++i) {
            intBins[intBinsL[i]] = true;
        }
        var leafChunks = [], otherChunks = [];

        var nbin = readInt(index, 0);
        var p = 4;
        for (var b = 0; b < nbin; ++b) {
            var bin = readInt(index, p);
            var nchnk = readInt(index, p+4);
    //        dlog('bin=' + bin + '; nchnk=' + nchnk);
            p += 8;
            if (intBins[bin]) {
                for (var c = 0; c < nchnk; ++c) {
                    var cs = readVirtualOffset(index, p);
                    var ce = readVirtualOffset(index, p + 8);
                    (bin < 4681 ? otherChunks : leafChunks).push(new Chunk(cs, ce, bin));
                    p += 16;
                }
            } else {
                p +=  (nchnk * 16);
            }
        }
    //    dlog('leafChunks = ' + miniJSONify(leafChunks));
    //    dlog('otherChunks = ' + miniJSONify(otherChunks));

        var nintv = readInt(index, p);
        var lowest = null;
        var minLin = Math.min(min>>14, nintv - 1), maxLin = Math.min(max>>14, nintv - 1);
        for (var i = minLin; i <= maxLin; ++i) {
            var lb =  readVirtualOffset(index, p + 4 + (i * 8));
            if (!lb) {
                continue;
            }
            if (!lowest || lb.block < lowest.block || lb.offset < lowest.offset) {
                lowest = lb;
            }
        }
        // dlog('Lowest LB = ' + lowest);

        var prunedOtherChunks = [];
        if (lowest != null) {
            for (var i = 0; i < otherChunks.length; ++i) {
                var chnk = otherChunks[i];
                if (chnk.maxv.block >= lowest.block && chnk.maxv.offset >= lowest.offset) {
                    prunedOtherChunks.push(chnk);
                }
            }
        }
        // dlog('prunedOtherChunks = ' + miniJSONify(prunedOtherChunks));
        otherChunks = prunedOtherChunks;

        var intChunks = [];
        for (var i = 0; i < otherChunks.length; ++i) {
            intChunks.push(otherChunks[i]);
        }
        for (var i = 0; i < leafChunks.length; ++i) {
            intChunks.push(leafChunks[i]);
        }

        intChunks.sort(function(c0, c1) {
            var dif = c0.minv.block - c1.minv.block;
            if (dif != 0) {
                return dif;
            } else {
                return c0.minv.offset - c1.minv.offset;
            }
        });
        var mergedChunks = [];
        if (intChunks.length > 0) {
            var cur = intChunks[0];
            for (var i = 1; i < intChunks.length; ++i) {
                var nc = intChunks[i];
                if (nc.minv.block == cur.maxv.block /* && nc.minv.offset == cur.maxv.offset */) { // no point splitting mid-block
                    cur = new Chunk(cur.minv, nc.maxv, 'linear');
                } else {
                    mergedChunks.push(cur);
                    cur = nc;
                }
            }
            mergedChunks.push(cur);
        }
    //    dlog('mergedChunks = ' + miniJSONify(mergedChunks));

        return mergedChunks;
    },

    fetch: function(chr, min, max, callback) {

        var chrId = this.chrToIndex[chr];
        var chunks;
        if (chrId === undefined) {
            chunks = [];
        } else {
            chunks = this.blocksForRange(chrId, min, max);
            if (!chunks) {
                callback(null, 'Error in index fetch');
            }
        }

        // toString function is used by the cache for making cache keys
        chunks.toString = function() {
            return this.join(', ');
        };

        try {
            this._fetchChunkFeatures( chunks, function( features, error ) {
                if( error ) {
                    callback( null, error );
                } else {
                    features = array.filter( features, function( feature ) {
                        return ( !( feature.get('end') < min || feature.get('start') > max )
                                 && ( chrId === undefined || feature._refID == chrId ) );
                    });
                    callback( features );
                }
            });
        } catch( e ) {
            callback( null, e );
        }
    },

    _fetchChunkFeatures: function( chunks, callback ) {
        var thisB = this;

        if( ! chunks.length ) {
            callback([]);
            return;
        }

        var features = [];
        var chunksProcessed = 0;

        var cache = this.featureCache = this.featureCache || new LRUCache({
            name: 'bamFeatureCache',
            fillCallback: dojo.hitch( this, '_readChunk' ),
            sizeFunction: function( features ) {
                return features.length;
            },
            maxSize: 100000 // cache up to 100,000 BAM features
        });

        var error;
        array.forEach( chunks, function( c ) {
            cache.get( c, function( f, e ) {
                error = error || e;
                features.push.apply( features, f );
                if( ++chunksProcessed == chunks.length )
                    callback( features, error );
            });
        });

    },

    _readChunk: function( chunk, callback ) {
        var thisB = this;
        var features = [];
        var fetchMin = chunk.minv.block;
        var fetchMax = chunk.maxv.block + (1<<16); // *sigh*

        thisB.data.read(fetchMin, fetchMax - fetchMin + 1, function(r) {
            try {
                var data = BAMUtil.unbgzf(r, chunk.maxv.block - chunk.minv.block + 1);
                thisB.readBamFeatures( new Uint8Array(data), chunk.minv.offset, features, callback );
            } catch( e ) {
                callback( null, e );
            }
        });
    },

    readBamFeatures: function(ba, blockStart, sink, callback ) {
        var that = this;
        var featureCount = 0;

        var maxFeaturesWithoutYielding = 300;

        while ( true ) {
            if( blockStart >= ba.length ) {
                // if we're done, call the callback and return
                callback( sink );
                return;
            }
            else if( featureCount <= maxFeaturesWithoutYielding ) {
                // if we've read no more than 200 features this cycle, read another one
                var blockSize = readInt(ba, blockStart);
                var blockEnd = blockStart + 4 + blockSize - 1;

                // only try to read the feature if we have all the bytes for it
                if( blockEnd < ba.length ) {
                    var feature = new BAMFeature({
                        store: this.store,
                        file: this,
                        bytes: { byteArray: ba, start: blockStart, end: blockEnd }
                     });
                    sink.push(feature);
                    featureCount++;
                }

                blockStart = blockEnd+1;
            }
            else {
                // if we're not done but we've read a good chunk of
                // features, put the rest of our work into a timeout to continue
                // later, avoiding blocking any UI stuff that's going on
                window.setTimeout( function() {
                    that.readBamFeatures( ba, blockStart, sink, callback );
                }, 1);
                return;
            }
        }
    }
});

return BamFile;

});
