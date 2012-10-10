define( ['dojo/_base/declare'
        ],
        function( declare ) {


return declare( null,

/**
 * @lends JBrowse.Store.BAM.Feature
 */
{

    /**
     * Feature object used for the JBrowse BAM backend.
     * @param store the BAM store this feature comes from
     * @param record the BAM record (a plain object) containing the data for this feature
     * @constructs
     */
    constructor: function( /**JBrowse.Store.SeqFeature.BAM*/ store, /**Object*/ record ) {
        var data = {};

        // copy all of the fields verbatim to start, for things people might want
        for( var k in record ) {
            if( record.hasOwnProperty(k) )
                data['sam_'+k] = record[k];
        }

        // figure out start and end
        data.start = data.sam_pos;
        if( data.sam_lref ) {
            data.end = data.sam_pos + data.sam_lref;
        } else {
            data.end = data.sam_pos + data.sam_seq.length;
        }

        /*  can extract "SEQ reverse complement" from bitwise flag, 
         *    but that gives orientation of the _read sequence_ relative to the reference, 
         *    whereas feat[STRAND] is intended to indicate orientation of the _template_
         *        (in the case of RNA-Seq, the RNA that the read is derived from) relative to the reference
         *   for some BAM sources (such as TopHat), an optional field "XS" is used to to indicate RNA orientation 
         *        relative to ref.  'XS' values are '+' or '-' (any others?), 
         *        for some sources, lack of 'XS' is meant to indicate plus strand, only minus strand are specifically tagged
         *   for more on strandedness, see seqanswers.com/forums/showthread.php?t=9303
         *   TODO: really need to determine whether to look at bitwise flag, or XS, or something else based 
         *           on the origin of the BAM data (type of sequencer or program name, etc.)
         *           for now using XS based on honeybee BAM data
         */
        // trying to determine orientation from 'XS' optional field
        data.strand = data.sam_XS == '-' ? -1 : 1;

        data.score = data.sam_MQ;
        data.type = 'match';
        data.source = store.source;
        data.seq_id = data.sam_segment;

        data.name = data.sam_readName;

        this.data = data;
        this.store = store;
        this._uniqueID = data.name+':'+data.start+'..'+data.end;
    },


// BamUtils.convertBamRecord = function (br, make_cigar_subfeats)  {
//     var feat = [];
//     var arep = BamUtils.attrs;
//     // var fields = this.fields;
//     // feat[fields.start] = br.pos;

//     feat[BamUtils.CINDEX] = BamUtils.feat_class_index;
//     feat[BamUtils.START] = br.pos;
    
//     // lref calc'd in dalliance/js/bam.js  BamFile.readBamRecords() function
//     if (br.lref)  {  // determine length based on CIGAR (lref is calc'd based on CIGAR string)
// 	feat[BamUtils.END] = br.pos + br.lref;
//     }
//     else  {  // determin length based on read length (no CIGAR found to calc lref)
// 	feat[BamUtils.END] = br.pos + br.seq.length;
//     }
//     //feat[END] = br.pos + br.lref;
//     // feat.segment = br.segment;
//     // feat.type = 'bam';

//     // trying to determine orientation from 'XS' optional field
//     if (br.XS === '-') { feat[BamUtils.STRAND] = -1; }
//     else  { feat[BamUtils.STRAND] = 1; }
//     // var reverse = ((br.flag & 0x10) != 0);
//     // feat[BamUtils.STRAND] = reverse ? -1 : 1;
//     // feat[BamUtils.STRAND] = 1; // just calling starnd as forward for now

//     // simple ID, just same as readName
//     // feat[BamUtils.ID] = br.readName;

//     // or possibly uniquify name by combining name, start, end (since read pairs etc. can have same readName):
//     feat[BamUtils.ID] = br.readName + "/" + feat[BamUtils.START] + "-" + feat[BamUtils.END];

//     // or to really guarantee uniqueness, combine name, start, end, cigar string
//     //     since different alignments of same read could have identical start and end, but 
//     //     differing alignment in between (and therefore different CIGAR string)
//     // feat[BamUtils.ID] = br.readName + "/" + feat[BamUtils.START] + "-" + feat[BamUtils.END] + "/" + feat[BamUtils.CIGAR];

//     // feat.notes = ['Sequence=' + br.seq, 'CIGAR=' + br.cigar, 'MQ=' + br.mq];
//     // feat.seq = br.seq;  // not having seq field in feat for now
//     feat[BamUtils.CIGAR] = br.cigar;   // cigar already translated from int array 
//     if (make_cigar_subfeats)  {
// 	BamUtils.createSubfeats(feat);
//     }

    get: function(name) {
        return this.data[ name ];
    },
    tags: function() {
        return this.store.featureKeys();
    }
});
});