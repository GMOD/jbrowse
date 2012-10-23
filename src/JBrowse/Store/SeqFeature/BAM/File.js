define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/Util',
            './Util',
            'JBrowse/Store/LRUCache'
        ],
        function( declare, array, Util, BAMUtil, LRUCache ) {

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

var SEQRET_DECODER = ['=', 'A', 'C', 'x', 'G', 'x', 'x', 'x', 'T', 'x', 'x', 'x', 'x', 'x', 'x', 'N'];
var CIGAR_DECODER = ['M', 'I', 'D', 'N', 'S', 'H', 'P', '=', 'X', '?', '?', '?', '?', '?', '?', '?'];

var Chunk = function(minv,maxv) {
        this.minv = minv;
        this.maxv = maxv;
};

var readInt   = BAMUtil.readInt;
var readShort = BAMUtil.readInt;
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
    constructor: function() {},

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
                dlog("Couldn't access BAI");
                failCallback();
                return;
            }

            var uncba = new Uint8Array(header);
            if( readInt(uncba, 0) != BAI_MAGIC) {
                dlog('Not a BAI file');
                failCallback();
                return;
            }

            var nref = readInt(uncba, 4);

            this.indices = [];

            var p = 8;
            var minVO; // get smallest virtual offset in the indexes, which indicates where the BAM header ends
            for (var ref = 0; ref < nref; ++ref) {
                var blockStart = p;
                var nbin = readInt(uncba, p); p += 4;
                for (var b = 0; b < nbin; ++b) {
                    var bin = readInt(uncba, p);
                    var nchnk = readInt(uncba, p+4);
                    p += 8 + (nchnk * 16);
                }
                var nintv = readInt(uncba, p); p += 4;
                var firstVO = readVirtualOffset(uncba,p);
                if( ! this.minAlignmentVO || this.minAlignmentVO.cmp( firstVO ) < 0 )
                    this.minAlignmentVO = firstVO;
                //console.log( ref, ''+firstVO );
                p += (nintv * 8);
                if (nbin > 0) {
                    this.indices[ref] = new Uint8Array(header, blockStart, p - blockStart);
                }
            }

            successCallback( this.indices, this.minAlignmentVO );
        }));
    },

    _readBAMheader: function( successCallback, failCallback ) {
        this.data.read( 0, this.minAlignmentVO.block, dojo.hitch( this, function(r) {
//        this.data.read(0, (1<<16)-1, dojo.hitch( this, function(r) {
            var unc = BAMUtil.unbgzf(r);
            var uncba = new Uint8Array(unc);

            if( readInt(uncba, 0) != BAM_MAGIC) {
                dlog('Not a BAM file');
                failCallback();
                return;
            }

            var headLen = readInt(uncba, 4);
            // var header = '';
            // for (var i = 0; i < headLen; ++i) {
            //     header += String.fromCharCode(uncba[i + 8]);
            // }

            var nRef = readInt(uncba, headLen + 8);
            var p = headLen + 12;

            this.chrToIndex = {};
            this.indexToChr = [];
            for (var i = 0; i < nRef; ++i) {
                var lName = readInt(uncba, p);
                var name = '';
                for (var j = 0; j < lName-1; ++j) {
                    name += String.fromCharCode(uncba[p + 4 + j]);
                }
                var lRef = readInt(uncba, p + lName + 4);
                // dlog(name + ': ' + lRef);
                this.chrToIndex[name] = i;
                if (name.indexOf('chr') == 0) {
                    this.chrToIndex[name.substring(3)] = i;
                } else {
                    this.chrToIndex['chr' + name] = i;
                }

                this.indexToChr.push(name);

                p = p + 8 + lName;
            }

            successCallback();
        }));
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
                    (bin < 4681 ? otherChunks : leafChunks).push(new Chunk(cs, ce));
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
                    cur = new Chunk(cur.minv, nc.maxv);
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
            var str = '';
            array.forEach( this, function(c) {
                str += c.minv+'..'+c.maxv+',';
            });
            return str;
        };

        this.recordCache = this.recordCache || new LRUCache({
            name: 'bamRecordCache',
            fillCallback: dojo.hitch(this, '_fetchChunkRecords' ),
            sizeFunction: function( records ) {
                return records.length;
            },
            maxSize: 100000 // cache up to 100,000 BAM records
        });

        this.recordCache.get( chunks, function( records ) {
            records = array.filter( records, function( record ) {
                return ( !min || record.pos <= max && record.pos + (record.length_on_ref || record.seq_length) >= min)
                        && (chrId === undefined || record._refID == chrId);
            });
            callback( records );
        });

    },

    _fetchChunkRecords: function( chunks, callback ) {
        var thisB = this;
        var records = [];
        var index = 0;
        var data;

        function tramp() {
            if (index >= chunks.length) {
                return callback(records);
            } else if (!data) {
                // dlog('fetching ' + index);
                var c = chunks[index];
                var fetchMin = c.minv.block;
                var fetchMax = c.maxv.block + (1<<16); // *sigh*
                thisB.data.read(fetchMin, fetchMax - fetchMin + 1, function(r) {
                    data = BAMUtil.unbgzf(r, c.maxv.block - c.minv.block + 1);
                    return tramp();
                });
                return null;
            } else {
                var ba = new Uint8Array(data);
                thisB.readBamRecords(ba, chunks[index].minv.offset, records );
                data = null;
                ++index;
                return tramp();
            }
        };
        tramp();
    },

    readBamRecords: function(ba, offset, sink ) {
        while (true) {
            var blockSize = readInt(ba, offset);
            var blockEnd = offset + blockSize + 4;
            if (blockEnd >= ba.length) {
                return sink;
            }

            var record = {};

            var refID = readInt(ba, offset + 4);
            var pos = readInt(ba, offset + 8);

            var bmn = readInt(ba, offset + 12);
            var bin = (bmn & 0xffff0000) >> 16;
            var mq = (bmn & 0xff00) >> 8;
            var nl = bmn & 0xff;

            var flag_nc = readInt(ba, offset + 16);
            this._decodeFlags( record, (flag_nc & 0xffff0000) >> 16 );

            var tlen = readInt(ba, offset + 32);
            record.template_length = tlen;

            var lseq = readInt(ba, offset + 20);
            record.seq_length = lseq;

            // If the read is unmapped, no assumptions can be made about RNAME, POS,
            // CIGAR, MAPQ, bits 0x2, 0x10 and 0x100 and the bit 0x20 of the next
            // segment in the template.
            var numCigarOps = flag_nc & 0xffff;

            var nextRef  = readInt(ba, offset + 24);
            var nextPos = readInt(ba, offset + 28);

            if( ! record.unmapped ) {
                var readName = '';
                for (var j = 0; j < nl-1; ++j) {
                    readName += String.fromCharCode(ba[offset + 36 + j]);
                }
            }

            var p = offset + 36 + nl;
            var cigar = '';
            var lref = 0;
            for (var c = 0; c < numCigarOps; ++c) {
                var cigop = readInt(ba, p);
                cigar = cigar + (cigop>>4) + CIGAR_DECODER[cigop & 0xf];
                var lop = (cigop>>4);
                var op = CIGAR_DECODER[cigop & 0xf];
                cigar = cigar + lop + op;
                switch (op) {
                case 'M':
                case 'D':
                case 'N':
                case '=':
                case 'X':
                    lref += lop;
                    break;
                }
                p += 4;
            }
            if( ! record.unmapped ) {
                record.cigar = cigar;
                record.length_on_ref = lref;
            }

            var seq = '';
            var seqBytes = (lseq + 1) >> 1;
            for (var j = 0; j < seqBytes; ++j) {
                var sb = ba[p + j];
                seq += SEQRET_DECODER[(sb & 0xf0) >> 4];
                seq += SEQRET_DECODER[(sb & 0x0f)];
            }
            p += seqBytes;
            record.seq = seq;

            if( ! record.unmapped ) {
                var qseq = [];
                for (var j = 0; j < lseq; ++j) {
                    qseq.push( ba[p + j] );
                }
            }

            p += lseq;

            if( ! record.unmapped ) {
                record.qual = qseq;

                record.pos = pos;
                if( mq != 255 ) // value of 255 means MQ is not available
                    record.mapping_quality = mq;
                record.readName = readName;
                record.segment = this.indexToChr[refID];
                record._refID = refID;
            }

            while (p < blockEnd) {
                var tag = String.fromCharCode(ba[p]) + String.fromCharCode(ba[p + 1]);
                var type = String.fromCharCode(ba[p + 2]);
                var value;

                if (type == 'A') {
                    value = String.fromCharCode(ba[p + 3]);
                    p += 4;
                } else if (type == 'i' || type == 'I') {
                    value = readInt(ba, p + 3);
                    p += 7;
                } else if (type == 'c' || type == 'C') {
                    value = ba[p + 3];
                    p += 4;
                } else if (type == 's' || type == 'S') {
                    value = readShort(ba, p + 3);
                    p += 5;
                } else if (type == 'f') {
                    throw 'FIXME need floats';
                } else if (type == 'Z') {
                    p += 3;
                    value = '';
                    for (;;) {
                        var cc = ba[p++];
                        if (cc == 0) {
                            break;
                        } else {
                            value += String.fromCharCode(cc);
                        }
                    }
                } else {
                    throw 'Unknown type '+ type;
                }
                record[tag] = value;
            }

            sink.push(record);
            offset = blockEnd;
        }
        // Exits via top of loop.
    },

    /**
     * Decode the BAM flags field and set them in the record.
     */
    _decodeFlags: function( record, flags ) {
        // the following explanations are taken verbatim from the SAM/BAM spec

        // 0x1 template having multiple segments in sequencing
        // If 0x1 is unset, no assumptions can be made about 0x2, 0x8, 0x20,
        // 0x40 and 0x80.
        if( flags & 0x1 ) {
            record.multi_segment_template = true;
            // 0x2 each segment properly aligned according to the aligner
            record.multi_segment_all_aligned = !!( flags & 0x2 );
            // 0x8 next segment in the template unmapped
            record.multi_segment_next_segment_unmapped = !!( flags & 0x8 );
            // 0x20 SEQ of the next segment in the template being reversed
            record.multi_segment_next_segment_reversed = !!( flags & 0x20 );

            // 0x40 the first segment in the template
            var first = !!( flags & 0x40 );
            // 0x80 the last segment in the template
            var last =  !!( flags & 0x80 );
            // * If 0x40 and 0x80 are both set, the segment is part of a linear
            // template, but it is neither the first nor the last segment. If both
            // 0x40 and 0x80 are unset, the index of the segment in the template is
            // unknown. This may happen for a non-linear template or the index is
            // lost in data processing.
            if( first && last ) {
                record.multi_segment_inner = true;
            }
            else if( first && !last ) {
                record.multi_segment_first = true;
            }
            else if( !first && last ) {
                record.multi_segment_last = true;
            }
            else {
                record.multi_segment_index_unknown = true;
            }
        }

        // 0x4 segment unmapped
        // * Bit 0x4 is the only reliable place to tell whether the segment is
        // unmapped. If 0x4 is set, no assumptions can be made about RNAME, POS,
        // CIGAR, MAPQ, bits 0x2, 0x10 and 0x100 and the bit 0x20 of the next
        // segment in the template.
        // only set unmapped if true
        if( flags & 0x4 ) {
            record.unmapped = true;
        } else {
            // 0x10 SEQ being reverse complemented
            record.seq_reverse_complemented = !!(flags & 0x10);

            // 0x100 secondary alignment
            // * Bit 0x100 marks the alignment not to be used in certain analyses
            // when the tools in use are aware of this bit.
            if( flags & 0x100 )
                record.secondary_alignment = true;
        }

        // 0x200 not passing quality controls
        // only set qc_failed if it is true
        if( flags & 0x200 )
            record.qc_failed = true;

        // 0x400 PCR or optical duplicate
        // only set duplicate if true
        if ( flags & 0x400 )
            record.duplicate = true;
    }
});

return BamFile;

});
