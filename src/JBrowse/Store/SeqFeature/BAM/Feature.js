define( ['dojo/_base/array',
         'JBrowse/Util',
         './Util'
        ],
        function( array, Util, BAMUtil ) {


var SEQRET_DECODER = ['=', 'A', 'C', 'x', 'G', 'x', 'x', 'x', 'T', 'x', 'x', 'x', 'x', 'x', 'x', 'N'];
var CIGAR_DECODER  = ['M', 'I', 'D', 'N', 'S', 'H', 'P', '=', 'X', '?', '?', '?', '?', '?', '?', '?'];

var readInt   = BAMUtil.readInt;
var readShort = BAMUtil.readShort;
var readFloat = BAMUtil.readFloat;

var Feature = Util.fastDeclare(

/**
 * @lends JBrowse.Store.BAM.Feature
 */
{

    /**
     * Feature object used for the JBrowse BAM backend.
     * @param args.store the BAM store this feature comes from
     * @param args.record optional BAM record (a plain object) containing the data for this feature
     * @constructs
     */
    constructor: function( args ) {
        this.file = args.file;
        this.store = args.store;

        var data = args.data
            || args.bytes && this._fromBytes( args.bytes.byteArray, args.bytes.start, args.bytes.end )
            || args.record && dojo.clone(args.record);

        // figure out start and end
        data.start = data.start || data.pos;
        data.end = data.end || ( data.length_on_ref ? data.pos + data.length_on_ref : data.seq ? data.pos + data.seq.length : undefined );

        // trying to determine orientation from 'XS' optional field,
        // or from the seq_reverse_complemented flag
        data.strand = ('XS' in data )                ? ( data.XS == '-' ? -1 : 1 ) :
                       data.seq_reverse_complemented ? -1                          :
                                                       1;

        data.score = data.mapping_quality || data.MQ || data.mq;
        data.type = data.type || 'match';
        data.source = args.store.source;

        if( data.qual && data.qual.join )
            data.qual = data.qual.join(' ');

        if( data.readName ) {
            data.name = data.readName;
            delete data.readName;
        }
        delete data.pos;

        this._refID = data._refID;
        delete data._refID;

        this.data = data;
        this._subCounter = 0;
        this._uniqueID = args.parent ? args.parent._uniqueID + '-' + ++args.parent._subCounter
                                     : data.name+'/'+data.MD+'/'+data.cigar+'/'+data.start;

        if( this.store.createSubfeatures ) {
            var subs = this.data.subfeatures = [];
	    var cigar = data.CIGAR || data.cigar;
	    if( cigar )
	        subs.push.apply( subs, this._cigarToSubfeats( cigar ) );
        }
    },

    _fromBytes: function( byteArray, blockStart, blockEnd ) {
        var record = {};

        var refID = readInt(byteArray, blockStart + 4);
        var pos = readInt(byteArray, blockStart + 8);

        var bmn = readInt(byteArray, blockStart + 12);
        //var bin = (bmn & 0xffff0000) >> 16;
        var mq = (bmn & 0xff00) >> 8;
        var nl = bmn & 0xff;

        var flag_nc = readInt(byteArray, blockStart + 16);
        this._decodeFlags( record, (flag_nc & 0xffff0000) >> 16 );

        record.template_length = readInt(byteArray, blockStart + 32);

        var lseq = readInt(byteArray, blockStart + 20);
        record.seq_length = lseq;

        // If the read is unmapped, no assumptions can be made about RNAME, POS,
        // CIGAR, MAPQ, bits 0x2, 0x10 and 0x100 and the bit 0x20 of the next
        // segment in the template.
        var numCigarOps = flag_nc & 0xffff;

        // if this is a multi-segment read (e.g. mate pairs), parse
        // out the position of the next segment and format it as a
        // locstring
        if( record.multi_segment_template ) {
            var nextRefID = readInt(byteArray, blockStart + 24);
            var nextSegment = this.file.indexToChr[nextRefID];
            if( nextSegment )
                record.next_segment_position = nextSegment.name+':'+readInt(byteArray, blockStart + 28);
        }

        if( ! record.unmapped ) {
            var readName = '';
            for (var j = 0; j < nl-1; ++j) {
                readName += String.fromCharCode(byteArray[blockStart + 36 + j]);
            }
        }

        var p = blockStart + 36 + nl;
        var cigar = '';
        var lref = 0;
        for (var c = 0; c < numCigarOps; ++c) {
            var cigop = readInt(byteArray, p);
            var lop = cigop >> 4;
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
            var sb = byteArray[p + j];
            seq += SEQRET_DECODER[(sb & 0xf0) >> 4];
            seq += SEQRET_DECODER[(sb & 0x0f)];
        }
        p += seqBytes;
        record.seq = seq;

        if( ! record.unmapped ) {
            var qseq = [];
            for (var j = 0; j < lseq; ++j) {
                qseq.push( byteArray[p + j] );
            }
        }

        p += lseq;

        if( ! record.unmapped ) {
            record.qual = qseq;

            record.pos = pos;
            if( mq != 255 ) // value of 255 means MQ is not available
                record.mapping_quality = mq;
            record.readName = readName;

            record.seq_id = this.file.indexToChr[refID];
            if( record.seq_id )
                record.seq_id = record.seq_id.name;

            record._refID = refID;
        }

        while( p < blockEnd ) { // really should be blockEnd - 3, but this works too and is faster
            var tag = String.fromCharCode(byteArray[p]) + String.fromCharCode(byteArray[p + 1]);
            var origType = String.fromCharCode(byteArray[p + 2]);
            var type = origType.toLowerCase();
            p += 3;

            var value;
            if (type == 'a') {
                value = String.fromCharCode( byteArray[p] );
                p += 1;
            } else if (type == 'i' ) {
                value = readInt(byteArray, p );
                p += 4;
            } else if (type == 'c' ) {
                value = byteArray[p];
                p += 1;
            } else if (type == 's' ) {
                value = readShort(byteArray, p);
                p += 2;
            } else if (type == 'f') {
                value = readFloat( byteArray, p );
                p += 4;
            } else if ( type == 'z' || type == 'h' ) {
                value = '';
                while( p <= blockEnd ) {
                    var cc = byteArray[p++];
                    if( cc == 0 ) {
                        break;
                    }
                    else {
                        value += String.fromCharCode(cc);
                    }
                }
            } else {
                console.warn( "Unknown BAM tag type '"+origType
                              +'\', tags for '+(readName||'(unnamed read)')
                              +' may be incomplete'
                            );
                value = undefined;
                p = blockEnd+1; // stop parsing tags
            }
            record[tag] = value;
        }
        return record;
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
    },

    _parseCigar: function( cigar ) {
        return array.map( cigar.match(/\d+\D/g), function( op ) {
           return [ op.match(/\D/)[0].toUpperCase(), parseInt( op ) ];
        });
    },

    /**
     *  take a cigar string, and initial position, return an array of subfeatures
     */
    _cigarToSubfeats: function(cigar)    {
        var subfeats = [];
        var min = this.get('start');
        var max;
        var ops = this._parseCigar( cigar );
        for (var i = 0; i < ops.length; i++)  {
            var lop = ops[i][1];
            var op = ops[i][0];  // operation type
            // converting "=" to "E" to avoid possible problems later with non-alphanumeric type name
            if (op === "=")  { op = "E"; }

            switch (op) {
            case 'M':
            case 'D':
            case 'N':
            case 'E':
            case 'X':
                max = min + lop;
                break;
            case 'I':
                max = min;
                break;
            case 'P':  // not showing padding deletions (possibly change this later -- could treat same as 'I' ?? )
            case 'H':  // not showing hard clipping (since it's unaligned, and offset arg meant to be beginning of aligned part)
            case 'S':  // not showing soft clipping (since it's unaligned, and offset arg meant to be beginning of aligned part)
                break;
                // other possible cases
            }
	    //  TODO may want to redo cigar subfeaturs as SimpleFeatures, and any need for more detail can crawl up to parent?
            var subfeat = new Feature({
                store: this.store,
                file: this.file,
                data: {
                    // type: 'match_part',
		    type: op,
                    start: min,
                    end: max,
                    strand: this.get('strand'),
                    cigar_op: lop+op,
		    parent: this
                },
                parent: this  // need parent at this level too in order to get proper setting of _uniqueID 
            });
            if (op !== 'N')  {
                subfeats.push(subfeat);
            }
            min = max;
        }
        return subfeats;
    },

    /**
     * Takes a CIGAR string, translates to a GFF3 Gap attribute
     */
    _cigarToGap: function(cigar)    {
        return array.map( this._parseCigar( cigar ), function( op ) {
            return ( {
                         // map the CIGAR operations to the less-descriptive
                         // GFF3 gap operations
                         M: 'M',
                         I: 'I',
                         D: 'D',
                         N: 'D',
                         S: 'M',
                         H: 'M',
                         P: 'I'
                     }[op[0]] || op[0]
                   )+op[1];
        }).join(' ');
    },

    get: function(name) {
        return this.data[ name ];
    },

    tags: function() {
        var t = [];
        var d = this.data;
        for( var k in d ) {
            if( d.hasOwnProperty( k ) )
                t.push( k );
        }
        return t;
    },

    id: function() {
        return this._uniqueID;
    },

    parent: function() {
	return this.data.parent;
    },

    children: function() {
	return this.data.subfeatures;
    }
});

return Feature;
});
