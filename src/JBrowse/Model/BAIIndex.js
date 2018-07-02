define([
           'dojo/_base/declare',
           'JBrowse/Util',
           'JBrowse/Model/DataView',
           'JBrowse/Model/TabixIndex',
           'JBrowse/Model/BGZip/VirtualOffset'
       ],
       function(
           declare,
           Util,
           jDataView,
           TabixIndex,
           VirtualOffset
       ) {

var BAI_MAGIC = 21578050;

function lshift(num, bits) {
    return num * Math.pow(2, bits);
}
function rshift(num, bits) {
    return Math.floor(num / Math.pow(2,bits));
}
// inner class representing a chunk
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
    compareTo: function( b ) {
        return this.minv.compareTo(b.minv) || this.maxv.compareTo(b.maxv) || this.bin - b.bin;
    },
    compare: function( b ) {
        return this.compareTo( b );
    },
    fetchedSize: function() {
        return this.maxv.block + (1<<16) - this.minv.block + 1;
    }
});

return declare( TabixIndex, {

    _parseIndex: function( successCallback, failCallback ) {
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





   blocksForRange: function( refName, beg, end ) {
       if( beg < 0 )
           beg = 0;

       var tid = this.getRefId( refName );
       var indexes = this._indices[tid];
       if( ! indexes )
           return [];

       var linearIndex = indexes.linearIndex,
            binIndex   = indexes.binIndex;

       var bins = this._reg2bins(beg, end, this.minShift, this.depth);
    // var linearCount = data.getInt32();
            // var linear = idx.linearIndex = new Array( linearCount );
            // for (var k = 0; k < linearCount; ++k) {
            //     linear[k] = new VirtualOffset( data.getBytes(8) );
            //     this._findFirstData( linear[k] );
            // }
       var min_off = new VirtualOffset( 0, 0 );

       var i, l, n_off = 0;
       for( i = 0; i < bins.length; ++i ) {
           n_off += ( binIndex[ bins[i] ] || [] ).length;
       }

       if( n_off == 0 )
           return [];

       var off = [];

       var chunks;
       for (i = n_off = 0; i < bins.length; ++i)
           if (( chunks = binIndex[ bins[i] ] ))
               for (var j = 0; j < chunks.length; ++j)
                   //if( min_off.compareTo( chunks[j].maxv ) < 0 )
                       off[n_off++] = new Chunk( chunks[j].minv, chunks[j].maxv, chunks[j].bin );

       if( ! off.length )
           return [];

       off = off.sort( function(a,b) {
                           return a.compareTo(b);
                       });

       // resolve completely contained adjacent blocks
       for (i = 1, l = 0; i < n_off; ++i) {
           if( off[l].maxv.compareTo( off[i].maxv ) < 0 ) {
               ++l;
               off[l].minv = off[i].minv;
               off[l].maxv = off[i].maxv;
           }
       }
       n_off = l + 1;

       // resolve overlaps between adjacent blocks; this may happen due to the merge in indexing
       for (i = 1; i < n_off; ++i)
           if ( off[i-1].maxv.compareTo(off[i].minv) >= 0 )
               off[i-1].maxv = off[i].minv;
       // merge adjacent blocks
       for (i = 1, l = 0; i < n_off; ++i) {
           if( off[l].maxv.block == off[i].minv.block )
               off[l].maxv = off[i].maxv;
           else {
               ++l;
               off[l].minv = off[i].minv;
               off[l].maxv = off[i].maxv;
           }
       }
       n_off = l + 1;

       return off.slice( 0, n_off );
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
});
