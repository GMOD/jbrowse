define( ['dojo/_base/array',
         'JBrowse/Util',
         './Util',
         'JBrowse/Model/SimpleFeature'
        ],
        function( array, Util, BAMUtil, SimpleFeature ) {

var SEQRET_DECODER = ['=', 'A', 'C', 'x', 'G', 'x', 'x', 'x', 'T', 'x', 'x', 'x', 'x', 'x', 'x', 'N'];
var CIGAR_DECODER  = ['M', 'I', 'D', 'N', 'S', 'H', 'P', '=', 'X', '?', '?', '?', '?', '?', '?', '?'];

var readInt   = BAMUtil.readInt;
var readShort = BAMUtil.readShort;
var readFloat = BAMUtil.readFloat;

var counter = 0;

var Feature = Util.fastDeclare(
{
    constructor: function( args ) {
        this.store = args.store;
        this.file  = args.file;
        this.data  = {
            type: 'match',
            source: args.store.source
        };
        this.bytes = {
            start: args.bytes.start,
            end: args.bytes.end,
            byteArray: args.bytes.byteArray
        };

        this._coreParse();
    },

    get: function( field ) {
        field = field.toLowerCase();
        return field in this.data ? this.data[field] : // maybe already parsed
            function() {
                var v = this.data[field] = this[field] ? this[field]()                       : // maybe we have a special parser for it
                                           this._flagMasks[field] ? this._parseFlag( field ) : // or is it a flag?
                                           this._parseTag( field );                            // otherwise, must be a tag
                return v;
            }.call(this);
    },

    tags: function() {
        return this.get('_tags');
    },

    _tags: function() {
        this._parseAllTags();
        var tags = [ 'seq', 'seq_reverse_complemented', 'unmapped' ];
        if( ! this.get('unmapped') )
            tags.push( 'start', 'end', 'strand', 'score', 'qual', 'MQ', 'CIGAR', 'length_on_ref' );
        if( this.get('multi_segment_template') ) {
            tags.push( 'multi_segment_all_aligned',
                       'multi_segment_next_segment_unmapped',
                       'multi_segment_next_segment_reversed',
                       'multi_segment_first',
                       'multi_segment_last',
                       'secondary_alignment',
                       'qc_failed',
                       'duplicate',
                       'next_segment_position'
                     );
        }

        var d = this.data;
        for( var k in d ) {
            if( d.hasOwnProperty( k ) && k[0] != '_' )
                tags.push( k );
        }

        var seen = {};
        tags = array.filter( tags, function(t) {
            if( t in this.data && this.data[t] === undefined )
                return false;

            var s = seen[t];
            seen[t] = true;
            return ! s;
        },this);

        return tags;
    },

    parent: function() {
        return undefined;
    },

    children: function() {
        return this.get('subfeatures');
    },

    id: function() {
        return this.get('name')+'/'+this.get('MD')+'/'+this.get('CIGAR')+'/'+this.get('start');
    },

    // special parsers
    /**
     * Mapping quality score.
     */
    mq: function() {
        var mq = (this.get('_bin_mq_nl') & 0xff00) >> 8;
        return mq == 255 ? undefined : mq;
    },
    score: function() {
        return this.get('MQ');
    },
    qual: function() {
        if( this.get('unmapped') )
            return undefined;

        var qseq = [];
        var byteArray = this.bytes.byteArray;
        var p = this.bytes.start + 36 + this.get('_l_read_name') + this.get('_n_cigar_op')*4 + this.get('_seq_bytes');
        var lseq = this.get('seq_length');
        for (var j = 0; j < lseq; ++j) {
            qseq.push( byteArray[p + j] );
        }
        return qseq.join(' ');
    },
    strand: function() {
        // var xs = this.get('XS');
        // return xs ? ( xs == '-' ? -1 : 1 ) :
        return this.get('seq_reverse_complemented') ? -1 :  1;
    },
    /**
     * Length in characters of the read name.
     */
    _l_read_name: function() {
        return this.get('_bin_mq_nl') & 0xff;
    },
    /**
     * number of bytes in the sequence field
     */
    _seq_bytes: function() {
        return (this.get('seq_length') + 1) >> 1;
    },
    seq: function() {
        var seq = '';
        var byteArray = this.bytes.byteArray;
        var p = this.bytes.start + 36 + this.get('_l_read_name') + this.get('_n_cigar_op')*4;
        var seqBytes = this.get('_seq_bytes');
        for (var j = 0; j < seqBytes; ++j) {
            var sb = byteArray[p + j];
            seq += SEQRET_DECODER[(sb & 0xf0) >> 4];
            seq += SEQRET_DECODER[(sb & 0x0f)];
        }
        return seq;
    },
    name: function() {
        return this.get('read_name');
    },
    read_name: function() {
        var byteArray = this.bytes.byteArray;
        var readName = '';
        var nl = this.get('_l_read_name');
        var p = this.bytes.start + 36;
        for (var j = 0; j < nl-1; ++j) {
            readName += String.fromCharCode(byteArray[p+j]);
        }
        return readName;
    },
    _n_cigar_op: function() {
        return this.get('_flag_nc') & 0xffff;
    },
    cigar: function() {
        if( this.get('unmapped') )
            return undefined;

        var byteArray   = this.bytes.byteArray;
        var numCigarOps = this.get('_n_cigar_op');
        var p = this.bytes.start + 36 + this.get('_l_read_name');
        var cigar = '';
        var lref = 0;
        for (var c = 0; c < numCigarOps; ++c) {
            var cigop = readInt(byteArray, p);
            var lop = cigop >> 4;
            var op = CIGAR_DECODER[cigop & 0xf];
            cigar = cigar + lop + op;
            p += 4;
        }
        return cigar;
    },
    next_segment_position: function() {
        var nextRefID = this.get('_next_refID');
        var nextSegment = this.file.indexToChr[nextRefID];
        if( nextSegment )
            return nextSegment.name+':'+this.get('_next_pos');
        else
            return undefined;
    },
    subfeatures: function() {
        if( ! this.store.createSubfeatures )
            return undefined;

        var cigar = this.get('CIGAR');
        if( cigar )
            return this._cigarToSubfeats( cigar );

        return undefined;
    },
    length_on_ref: function() {
        if( this.get('unmapped') )
            return undefined;

        var numbers = this.get('CIGAR').match(/\d+(?=[MDN=X])/ig);
        var sum = 0;
        for( var i = 0; i<numbers.length; i++ )
            sum += parseInt( numbers[i] );
        return sum;
    },
    _flags: function() {
        return (this.data._flag_nc & 0xffff0000) >> 16;
    },
    end: function() {
        return this.get('start') + ( this.get('length_on_ref') || this.get('seq_length') || undefined );
    },

    seq_id: function() {
        if( this.get('unmapped') )
            return undefined;

        return ( this.file.indexToChr[ this._refID ] || {} ).name;
    },

    /**
     * parse the core data: start, end, strand, etc
     */
    _coreParse: function() {
        var byteArray = this.bytes.byteArray;
        var blockStart = this.bytes.start;

        var tempBytes = new Uint8Array( 36 );
        for( var i = 0; i<36; i++ ) {
            tempBytes[i] = byteArray[i+blockStart];
        }
        var ints = new Int32Array( tempBytes.buffer );

        this._refID = ints[1];
        var start = this.data.start = ints[2];
        this.data._bin_mq_nl = ints[3];
        this.data._flag_nc   = ints[4];
        this.data.seq_length = ints[5];
        this.data._next_refID = ints[6];
        this.data._next_pos   = ints[7];
        this.data.template_length = ints[8];
    },

    /**
     * Get the value of a tag, parsing the tags as far as necessary.
     * Only called if we have not already parsed that field.
     */
    _parseTag: function( tagName ) {
        var byteArray = this.bytes.byteArray;
        var p = this.bytes.start + 36 + this.get('_l_read_name') + this.get('_n_cigar_op')*4 + this.get('_seq_bytes') + this.get('seq_length');
        var blockEnd = this.bytes.end;
        while( p < blockEnd && !(tag == tagName)) { // really should be blockEnd - 3, but this works too and is faster
            var tag = String.fromCharCode( byteArray[p] ) + String.fromCharCode(byteArray[p + 1] );
            var origType = String.fromCharCode( byteArray[p + 2] );
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
            if( tag == tagName )
                return value;
            else
                this.data[tag] = value;
        }
        return undefined;
    },
    _parseAllTags: function() {
        if( ! this._allTagsParsed )
            this._parseTag(); // calling _parseTag with no arg just parses
                              // all the tags and returns the last one

        this._allTagsParsed = true;
    },

    _flagMasks: {
        multi_segment_template:              0x1,
        multi_segment_all_aligned:           0x2,
        unmapped:                            0x4,
        multi_segment_next_segment_unmapped: 0x8,
        seq_reverse_complemented:            0x10,
        multi_segment_next_segment_reversed: 0x20,
        multi_segment_first:                 0x40,
        multi_segment_last:                  0x80,
        secondary_alignment:                 0x100,
        qc_failed:                           0x200,
        duplicate:                           0x400
    },

    _parseFlag: function( flagName ) {
        return !!( this.get('_flags') & this._flagMasks[flagName] );
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
            if( op !== 'N' ) {
                var subfeat = new SimpleFeature({
                    data: {
                    type: op,
                        start: min,
                        end: max,
                        strand: this.get('strand'),
                        cigar_op: lop+op
                    },
                    parent: this
                });
                subfeats.push(subfeat);
            }
            min = max;
        }
        return subfeats;
    }

});

return Feature;
});