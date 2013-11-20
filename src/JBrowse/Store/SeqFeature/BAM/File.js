define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/promise/all',
            'dojo/Deferred',
            'JBrowse/has',
            'JBrowse/Util',
            'JBrowse/Util/DeferredGenerator',
            'JBrowse/Util/DeferredGenerator/Combine',
            'JBrowse/Errors',
            'JBrowse/Store/LRUCache',
            './Util',
            './LazyFeature'
        ],
        function(
            declare,
            lang,
            array,
            all,
            Deferred,
            has,
            Util,
            DeferredGenerator,
            CombineGenerators,
            Errors,
            LRUCache,
            BAMUtil,
            BAMFeature
        ) {

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

        var thisB = this;
        this._initialized =
            this._readBAI()
                .then( lang.hitch( this, '_readBAMheader') )
                .then( function() { return thisB; } );
    },

    init: function() {
        return this._initialized;
    },

    _readBAI: function() {
        var d = new Deferred();
        if( ! has('typed-arrays') ) {
            dlog('Web browser does not support typed arrays');
            d.reject('Web browser does not support typed arrays');
            return d;
        }

        var thisB = this;
        return this.bai.readAll()
            .then( lang.hitch( this, '_parseBAI' ) );
    },

    _parseBAI:function( headerData) {
        var uncba = new Uint8Array( headerData );
        if( readInt(uncba, 0) != BAI_MAGIC) {
            throw new Error('Not a BAI file');
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
                this.indices[ref] = new Uint8Array(headerData, blockStart, p - blockStart);
            }
        }

        this.empty = ! this.indices.length;

        return [ this.indices, this.minAlignmentVO ];
    },

    _findMinAlignment: function( candidate ) {
        if( candidate && ( ! this.minAlignmentVO || this.minAlignmentVO.cmp( candidate ) < 0 ) )
            this.minAlignmentVO = candidate;
    },

    _readBAMheader: function() {
        var thisB = this;
        // We have the virtual offset of the first alignment
        // in the file.  Cannot completely determine how
        // much of the first part of the file to fetch to get just
        // up to that, since the file is compressed.  Thus, fetch
        // up to the start of the BGZF block that the first
        // alignment is in, plus 64KB, which should get us that whole
        // BGZF block, assuming BGZF blocks are no bigger than 64KB.
        return thisB.data.readRange(
            0,
            thisB.minAlignmentVO ? thisB.minAlignmentVO.block : null
        ).then( function( unc ) {
                    var uncba = new Uint8Array(unc,0,8);

                    if( readInt(uncba, 0) != BAM_MAGIC)
                        throw new Error( 'Not a BAM file' );

                    var headLen = readInt(uncba, 4);

                    return thisB._readRefSeqs( headLen+8, 65536*4 );
                }
              );
    },

    _readRefSeqs: function( start, refSeqBytes ) {
        var thisB = this;
        // have to do another request, because sometimes
        // minAlignmentVO is just flat wrong.
        // if headLen is not too big, this will just be in the
        // global byte-range cache
        return thisB.data.readRange( 0, start+refSeqBytes )
            .then( function(unc) {
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
                               return thisB._readRefSeqs( start, refSeqBytes );
                           }
                       }

                       return null;
                   });
    },

    /**
     * Get an array of Chunk objects for the given ref seq id and range.
     */
    _blocksForRange: function(refId, min, max) {
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

    fetchFeatures: function( refNames, min, max ) {
        return CombineGenerators.combine(
            this.init()
                .then( function(thisB) {
                           // coerce query.seq_id to array, and if no ref specified, fetch all refs
                           refNames = refNames ? ( lang.isArray( refNames ) ? refNames : [ refNames ] ) :
                                                 array.map( thisB.indexToChr, function(c) { return c.name; } );

                           return array.map(
                               refNames,
                               function( chrName ) {
                                   chrName = thisB.store.browser.regularizeReferenceName( chrName );
                                   var chrId = thisB.chrToIndex && thisB.chrToIndex[chrName];
                                   var chrInfo = thisB.indexToChr[chrId];
                                   var chrMin = min === undefined && chrInfo ? (chrInfo.start || 0) : min;
                                   var chrMax = max === undefined && chrInfo ? (chrInfo.start || 0) + chrInfo.length : max;
                                   return new DeferredGenerator(
                                       function( d ) {
                                           var chunks;
                                           if( !( chrId >= 0 ) ) {
                                               chunks = [];
                                           } else {
                                               chunks = thisB._blocksForRange(
                                                   chrId,
                                                   chrMin,
                                                   chrMax
                                               );
                                               if (!chunks) {
                                                   throw new Errors.Fatal('Index fetch failed for '+chrId+':'+min+'..'+max);
                                               }
                                           }

                                           // toString function is used by the cache for making cache keys
                                           chunks.toString = function() {
                                               return thisB.join(', ');
                                           };

                                           //console.log( chr, min, max, chunks.toString() );

                                           return thisB._fetchChunkFeatures(
                                               d,
                                               chunks,
                                               chrId,
                                               chrMin,
                                               chrMax
                                           );
                                       });
                               });
                       })
        );
    },

    _fetchChunkFeatures: function( d, chunks, chrId, min, max ) {
        var thisB = this;

        if( ! chunks.length ) {
            d.resolve();
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
                throw new Errors.DataOverflow('Too many BAM features. BAM chunk size '+Util.commifyNumber(size)+' bytes exceeds chunkSizeLimit of '+Util.commifyNumber(this.chunkSizeLimit)+'.' );
            }
        }

        var haveError;
        var pastStart;
        var chunkFetches =
            array.map(
                chunks,
                function( c ) {
                    return cache.getD( c )
                        .then( function( f ) {
                                   for( var i = 0; i<f.length; i++ ) {
                                       var feature = f[i];
                                       if( feature._refID == chrId ) {
                                           // on the right ref seq
                                           if( feature.get('start') > max ) // past end of range, can stop iterating
                                               break;
                                           else if( feature.get('end') >= min ) // must be in range
                                           d.emit( feature );
                                       }
                                   }
                               });
                });

        all( chunkFetches )
           .then( lang.hitch( d, 'resolve' ) );
    },

    _readChunk: function( chunk, callback ) {
        var thisB = this;
        var features = [];
        // console.log('chunk '+chunk+' size ',Util.humanReadableNumber(size));

        thisB.data.readRange( chunk.minv.block, chunk.fetchedSize() )
             .then( function(data) {
                        thisB._readBamFeatures( new Uint8Array(data), chunk.minv.offset, features, callback );
                    }, function( e ) {
                        callback( null, new Errors.Fatal(e) );
                    });
    },

    _readBamFeatures: function(ba, blockStart, sink, callback ) {
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
                    that._readBamFeatures( ba, blockStart, sink, callback );
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
