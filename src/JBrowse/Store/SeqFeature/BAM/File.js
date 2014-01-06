define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/has',
            'JBrowse/Util',
            'JBrowse/Errors',
            'JBrowse/Store/LRUCache',
            './Util',
            './LazyFeature'
        ],
        function( declare, array, has, Util, Errors, LRUCache, BAMUtil, BAMFeature ) {

var BAM_MAGIC = 21840194;
var BAI_MAGIC = 21578050;

var dlog = function(){ console.error.apply(console, arguments); };

var Chunk = Util.fastDeclare({
    constructor: function(minv,maxv,bin) {
        this.minv = minv;
        this.maxv = maxv;
        this.bin = bin;
    },
    toUniqueString: function() {
        return this.minv+'..'+this.maxv+' (bin '+this.bin+')';
    },
    toString: function() {
        return this.toUniqueString();
    },
    fetchedSize: function() {
        return this.maxv.block + (1<<16) - this.minv.block + 1;
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

        this.chunkSizeLimit = args.chunkSizeLimit || 5000000;
    },

    init: function( args ) {
        var bam = this;
        var successCallback = args.success || function() {};
        var failCallback = args.failure || function(e) { console.error(e, e.stack); };

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

            if( ! has('typed-arrays') ) {
                dlog('Web browser does not support typed arrays');
                failCallback('Web browser does not support typed arrays');
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
                try {
                    var uncba;
                    try {
                        uncba = new Uint8Array( BAMUtil.unbgzf(r) );
                    } catch(e) {
                        throw new Error( "Could not uncompress BAM data. Is it compressed correctly?" );
                    }

                    if( readInt(uncba, 0) != BAM_MAGIC)
                        throw new Error('Not a BAM file');

                    var headLen = readInt(uncba, 4);

                    thisB._readRefSeqs( headLen+8, 65536*4, successCallback, failCallback );
                } catch(e) {
                    dlog( ''+e );
                    failCallback( ''+e );
                }
            },
            failCallback
        );
    },

    _readRefSeqs: function( start, refSeqBytes, successCallback, failCallback ) {
        var thisB = this;
        // have to do another request, because sometimes
        // minAlignment VO is just flat wrong.
        // if headLen is not too big, this will just be in the
        // RemoteBinaryFile cache
        thisB.data.read( 0, start+refSeqBytes,
                         function(r) {
            var unc = BAMUtil.unbgzf(r);
            var uncba = new Uint8Array(unc);

            var nRef = readInt(uncba, start );
            var p = start + 4;

            thisB.chrToIndex = {};
            thisB.indexToChr = [];
            for (var i = 0; i < nRef; ++i) {
                var lName = readInt(uncba, p);
                var name = '';
                for (var j = 0; j < lName-1; ++j) {
                    name += String.fromCharCode(uncba[p + 4 + j]);
                }

                var lRef = readInt(uncba, p + lName + 4);
                //console.log(name + ': ' + lRef);
                thisB.chrToIndex[ thisB.store.browser.regularizeReferenceName( name ) ] = i;
                thisB.indexToChr.push({ name: name, length: lRef });

                p = p + 8 + lName;
                if( p > uncba.length ) {
                    // we've gotten to the end of the data without
                    // finishing reading the ref seqs, need to fetch a
                    // bigger chunk and try again.  :-(
                    refSeqBytes *= 2;
                    console.warn( 'BAM header is very big.  Re-fetching '+refSeqBytes+' bytes.' );
                    thisB._readRefSeqs( start, refSeqBytes, successCallback, failCallback );
                    return;
                }
            }

            successCallback();

        }, failCallback );
    },

    /**
     * Get an array of Chunk objects for the given ref seq id and range.
     */
    blocksForRange: function(refId, min, max) {
        var index = this.indices[refId];
        if (!index) {
            return [];
        }

        // object as { <binNum>: true, ... } containing the bin numbers
        // that overlap this range
        var overlappingBins = function() {
            var intBins = {};
            var intBinsL = this._reg2bins(min, max);
            for (var i = 0; i < intBinsL.length; ++i) {
                intBins[intBinsL[i]] = true;
            }
            return intBins;
        }.call(this);

        // parse the chunks for the overlapping bins out of the index
        // for this ref seq, keeping a distinction between chunks from
        // leaf (lowest-level, smallest) bins, and chunks from other,
        // larger bins
        var leafChunks  = [];
        var otherChunks = [];
        var nbin = readInt(index, 0);
        var p = 4;
        for (var b = 0; b < nbin; ++b) {
            var bin   = readInt(index, p  );
            var nchnk = readInt(index, p+4);
            p += 8;
            if( overlappingBins[bin] ) {
                for (var c = 0; c < nchnk; ++c) {
                    var cs = readVirtualOffset( index, p     );
                    var ce = readVirtualOffset( index, p + 8 );
                    ( bin < 4681 ? otherChunks : leafChunks ).push( new Chunk(cs, ce, bin) );
                    p += 16;
                }
            } else {
                p += nchnk * 16;
            }
        }

        // parse the linear index to find the lowest virtual offset
        var lowest = function() {
            var lowest = null;
            var nintv  = readInt(index, p);
            var minLin = Math.min(min>>14, nintv - 1);
            var maxLin = Math.min(max>>14, nintv - 1);
            for (var i = minLin; i <= maxLin; ++i) {
                var lb =  readVirtualOffset(index, p + 4 + (i * 8));
                if( !lb )
                    continue;

                if ( ! lowest || lb.cmp( lowest ) > 0 )
                    lowest = lb;
            }
            return lowest;
        }();

        // discard any chunks that come before the lowest
        // virtualOffset that we got from the linear index
        if( lowest ) {
            otherChunks = function( otherChunks ) {
                var relevantOtherChunks = [];
                for (var i = 0; i < otherChunks.length; ++i) {
                    var chnk = otherChunks[i];
                    if( chnk.maxv.block >= lowest.block ) {
                        relevantOtherChunks.push(chnk);
                    }
                }
                return relevantOtherChunks;
            }(otherChunks);
        }

        // add the leaf chunks in, and sort the chunks ascending by virtual offset
        var allChunks = otherChunks
            .concat( leafChunks )
            .sort( function(c0, c1) {
                      return c0.minv.block - c1.minv.block || c0.minv.offset - c1.minv.offset;
                   });

        // merge chunks from the same block together
        var mergedChunks = [];
        if( allChunks.length ) {
            var cur = allChunks[0];
            for (var i = 1; i < allChunks.length; ++i) {
                var nc = allChunks[i];
                if (nc.minv.block == cur.maxv.block /* && nc.minv.offset == cur.maxv.offset */) { // no point splitting mid-block
                    cur = new Chunk(cur.minv, nc.maxv, 'merged');
                } else {
                    mergedChunks.push(cur);
                    cur = nc;
                }
            }
            mergedChunks.push(cur);
        }

        return mergedChunks;
    },

    fetch: function(chr, min, max, featCallback, endCallback, errorCallback ) {

        chr = this.store.browser.regularizeReferenceName( chr );

        var chrId = this.chrToIndex && this.chrToIndex[chr];
        var chunks;
        if( !( chrId >= 0 ) ) {
            chunks = [];
        } else {
            chunks = this.blocksForRange(chrId, min, max);
            if (!chunks) {
                errorCallback( new Errors.Fatal('Error in index fetch') );
            }
        }

        // toString function is used by the cache for making cache keys
        chunks.toString = function() {
            return this.join(', ');
        };

        //console.log( chr, min, max, chunks.toString() );

        try {
            this._fetchChunkFeatures(
                chunks,
                chrId,
                min,
                max,
                featCallback,
                endCallback,
                errorCallback
            );
        } catch( e ) {
            errorCallback( e );
        }
    },

    _fetchChunkFeatures: function( chunks, chrId, min, max, featCallback, endCallback, errorCallback ) {
        var thisB = this;

        if( ! chunks.length ) {
            endCallback();
            return;
        }

        var chunksProcessed = 0;

        var cache = this.featureCache = this.featureCache || new LRUCache({
            name: 'bamFeatureCache',
            fillCallback: dojo.hitch( this, '_readChunk' ),
            sizeFunction: function( features ) {
                return features.length;
            },
            maxSize: 100000 // cache up to 100,000 BAM features
        });

        // check the chunks for any that are over the size limit.  if
        // any are, don't fetch any of them
        for( var i = 0; i<chunks.length; i++ ) {
            var size = chunks[i].fetchedSize();
            if( size > this.chunkSizeLimit ) {
                errorCallback( new Errors.DataOverflow('Too many BAM features. BAM chunk size '+Util.commifyNumber(size)+' bytes exceeds chunkSizeLimit of '+Util.commifyNumber(this.chunkSizeLimit)+'.' ) );
                return;
            }
        }

        var haveError;
        var pastStart;
        array.forEach( chunks, function( c ) {
            cache.get( c, function( f, e ) {
                if( e && !haveError )
                    errorCallback(e);
                if(( haveError = haveError || e )) {
                    return;
                }

                for( var i = 0; i<f.length; i++ ) {
                    var feature = f[i];
                    if( feature._refID == chrId ) {
                        // on the right ref seq
                        if( feature.get('start') > max ) // past end of range, can stop iterating
                            break;
                        else if( feature.get('end') >= min ) // must be in range
                            featCallback( feature );
                    }
                }
                if( ++chunksProcessed == chunks.length ) {
                    endCallback();
                }
            });
        });

    },

    _readChunk: function( chunk, callback ) {
        var thisB = this;
        var features = [];
        // console.log('chunk '+chunk+' size ',Util.humanReadableNumber(size));

        thisB.data.read( chunk.minv.block, chunk.fetchedSize(), function(r) {
            try {
                var data = BAMUtil.unbgzf(r, chunk.maxv.block - chunk.minv.block + 1);
                thisB.readBamFeatures( new Uint8Array(data), chunk.minv.offset, features, callback );
            } catch( e ) {
                callback( null, new Errors.Fatal(e) );
            }
        }, function( e ) {
            callback( null, new Errors.Fatal(e) );
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
    },
    //
    // Binning (transliterated from SAM1.3 spec)
    //

    /* calculate bin given an alignment covering [beg,end) (zero-based, half-close-half-open) */
    _reg2bin: function( beg, end ) {
        --end;
        if (beg>>14 == end>>14) return ((1<<15)-1)/7 + (beg>>14);
        if (beg>>17 == end>>17) return ((1<<12)-1)/7 + (beg>>17);
        if (beg>>20 == end>>20) return ((1<<9)-1)/7 + (beg>>20);
        if (beg>>23 == end>>23) return ((1<<6)-1)/7 + (beg>>23);
        if (beg>>26 == end>>26) return ((1<<3)-1)/7 + (beg>>26);
        return 0;
    },

    /* calculate the list of bins that may overlap with region [beg,end) (zero-based) */
    MAX_BIN: (((1<<18)-1)/7),
    _reg2bins: function( beg, end ) {
        var k, list = [ 0 ];
        --end;
        for (k = 1    + (beg>>26); k <= 1    + (end>>26); ++k) list.push(k);
        for (k = 9    + (beg>>23); k <= 9    + (end>>23); ++k) list.push(k);
        for (k = 73   + (beg>>20); k <= 73   + (end>>20); ++k) list.push(k);
        for (k = 585  + (beg>>17); k <= 585  + (end>>17); ++k) list.push(k);
        for (k = 4681 + (beg>>14); k <= 4681 + (end>>14); ++k) list.push(k);
        return list;
    }

});

return BamFile;

});
