define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/json',
           'JBrowse/Util/TextIterator',
           'JBrowse/Digest/Crc32',
           './LazyFeature'
       ],
       function(
           declare,
           array,
           JSON,
           TextIterator,
           Digest,
           LazyFeature
       ) {

return declare( null, {

    /**
     * Parse the bytes that contain the VCF header, storing the parsed
     * data in this.header.
     */
    parseHeader: function( headerBytes ) {

        // parse the header lines
        var headData = {};
        var lineIterator = new TextIterator.FromBytes({ bytes: headerBytes });
        var line;
        while(( line = lineIterator.getline() )) {
            // only interested in meta and header lines
            if( line[0] != '#' )
                continue;

            var match = /^##([^\s#=]+)=(.+)/.exec( line);
            // parse meta line
            if( match && match[1] ) {
                var metaField = match[1].toLowerCase();
                var metaData = (match[2]||'');

                // TODO: do further parsing for some fields
                if( metaData.match(/^<.+>$/) ) {
                    metaData = this._parseGenericHeaderLine( metaData );
                }

                if( ! headData[metaField] )
                    headData[metaField] = [];

                headData[metaField].push( metaData );
            }
            else if( /^#CHROM\t/.test( line ) ) {
                var f = line.split("\t");
                if( f[8] == 'FORMAT' && f.length > 9 )
                    headData.samples = f.slice(9);
            }
        }
        //console.log(headData);

        // index some of the headers by ID
        for( var headerType in headData ) {
            if( dojo.isArray( headData[headerType] ) && typeof headData[headerType][0] == 'object' && 'id' in headData[headerType][0] )
                headData[headerType] = this._indexUniqObjects( headData[headerType], 'id' );
        }

        this.header = headData;
        return headData;
    },

    /**
     * Given a line from a TabixIndexedFile, convert it into a feature
     * and return it.  Assumes that the header has already been parsed
     * and stored (i.e. _parseHeader has already been called.)
     */
    lineToFeature: function( line ) {
        var fields = line.fields;
        var ids = [];
        for( var i=0; i<fields.length; i++ )
            if( fields[i] == '.' )
                fields[i] = null;

        var ref = fields[3];
        var alt = fields[4];

        var SO_term = this._find_SO_term( ref, alt );
        var featureData = {
            start:  line.start,
            end:    line.start+ref.length,
            seq_id: line.ref,
            description: this._makeDescriptionString( SO_term, ref, alt ),
            type:   SO_term,
            reference_allele:    ref
        };

        if( fields[2] !== null ) {
            ids = (fields[2]||'').split(';');
            featureData.name = ids[0];
            if( ids.length > 1 )
                featureData.aliases = ids.slice(1).join(',');
        }

        if( fields[5] !== null )
            featureData.score = parseFloat( fields[5] );
        if( fields[6] !== null ) {
            featureData.filter = {
                meta: {
                    description: 'List of filters that this site has not passed, or PASS if it has passed all filters',
                    filters: this.header.filter
                },
                values: fields[6].split(';')
            };
        }

        if( alt && alt[0] != '<' )
            featureData.alternative_alleles = {
                meta: {
                    description: 'VCF ALT field, list of alternate non-reference alleles called on at least one of the samples'
                },
                values: alt
            };

        // parse the info field and store its contents as attributes in featureData
        this._parseInfoField( featureData, fields );

        var f = new LazyFeature({
            id: ids[0] || fields.slice( 0, 9 ).join('/'),
            data: featureData,
            fields: fields,
            parser: this
        });

        return f;
    },

    _parseGenericHeaderLine: function( metaData ) {
        metaData = metaData.replace(/^<|>$/g,'');
        return this._parseKeyValue( metaData, ',', ';', 'lowercase' );
    },

    _vcfReservedInfoFields: {
        // from the VCF4.1 spec, http://www.1000genomes.org/wiki/Analysis/Variant%20Call%20Format/vcf-variant-call-format-version-41
        AA:    { description: "ancestral allele" },
        AC:    { description: "allele count in genotypes, for each ALT allele, in the same order as listed" },
        AF:    { description: "allele frequency for each ALT allele in the same order as listed: use this when estimated from primary data, not called genotypes" },
        AN:    { description: "total number of alleles in called genotypes" },
        BQ:    { description: "RMS base quality at this position" },
        CIGAR: { description: "cigar string describing how to align an alternate allele to the reference allele" },
        DB:    { description: "dbSNP membership" },
        DP:    { description: "combined depth across samples, e.g. DP=154" },
        END:   { description: "end position of the variant described in this record (esp. for CNVs)" },
        H2:    { description: "membership in hapmap2" },
        MQ:    { description: "RMS mapping quality, e.g. MQ=52" },
        MQ0:   { description: "Number of MAPQ == 0 reads covering this record" },
        NS:    { description: "Number of samples with data" },
        SB:    { description: "strand bias at this position" },
        SOMATIC: { description: "indicates that the record is a somatic mutation, for cancer genomics" },
        VALIDATED: { description: "validated by follow-up experiment" },

        //specifically for structural variants
        "IMPRECISE": { number: 0, type: 'Flag', description: "Imprecise structural variation" },
        "NOVEL":     { number: 0, type: 'Flag',description: "Indicates a novel structural variation" },
        "END":       { number: 1, type: 'Integer', description: "End position of the variant described in this record" },

        // For precise variants, END is POS + length of REF allele -
        // 1, and the for imprecise variants the corresponding best
        // estimate.

        "SVTYPE": { number: 1, type: 'String',description: "Type of structural variant" },

        // Value should be one of DEL, INS, DUP, INV, CNV, BND. This
        // key can be derived from the REF/ALT fields but is useful
        // for filtering.

        "SVLEN": { number:'.',type: 'Integer', description: 'Difference in length between REF and ALT alleles' },

        // One value for each ALT allele. Longer ALT alleles
        // (e.g. insertions) have positive values, shorter ALT alleles
        // (e.g. deletions) have negative values.

        "CIPOS":  { number: 2, "type": 'Integer', "description": 'Confidence interval around POS for imprecise variants' },
        "CIEND":  { number: 2, "type": 'Integer', "description": "Confidence interval around END for imprecise variants" },
        "HOMLEN": {            "type": "Integer", "description": "Length of base pair identical micro-homology at event breakpoints" },
        "HOMSEQ": {            "type": "String",  "description": "Sequence of base pair identical micro-homology at event breakpoints" },
        "BKPTID": {            "type": "String",  "description": "ID of the assembled alternate allele in the assembly file" },

        // For precise variants, the consensus sequence the alternate
        // allele assembly is derivable from the REF and ALT
        // fields. However, the alternate allele assembly file may
        // contain additional information about the characteristics of
        // the alt allele contigs.

        "MEINFO":  { number:4, "type": "String", "description": "Mobile element info of the form NAME,START,END,POLARITY" },
        "METRANS": { number:4, "type": "String", "description": "Mobile element transduction info of the form CHR,START,END,POLARITY" },
        "DGVID":   { number:1, "type": "String", "description": "ID of this element in Database of Genomic Variation"},
        "DBVARID": { number:1, "type": "String", "description": "ID of this element in DBVAR"},
        "DBRIPID": { number:1, "type": "String", "description": "ID of this element in DBRIP"},
        "MATEID":  {           "type": "String", "description": "ID of mate breakends"},
        "PARID":   { number:1, "type": "String", "description": "ID of partner breakend"},
        "EVENT":   { number:1, "type": "String", "description": "ID of event associated to breakend"},
        "CILEN":   { number:2, "type": "Integer","description": "Confidence interval around the length of the inserted material between breakends"},
        "DP":      { number:1, "type": "Integer","description": "Read Depth of segment containing breakend"},
        "DPADJ":   {           "type": "Integer","description": "Read Depth of adjacency"},
        "CN":      { number:1, "type": "Integer","description": "Copy number of segment containing breakend"},
        "CNADJ":   {           "type": "Integer","description": "Copy number of adjacency"},
        "CICN":    { number:2, "type": "Integer","description": "Confidence interval around copy number for the segment"},
        "CICNADJ": {           "type": "Integer","description": "Confidence interval around copy number for the adjacency"}
    },

    _vcfStandardGenotypeFields: {
        // from the VCF4.1 spec, http://www.1000genomes.org/wiki/Analysis/Variant%20Call%20Format/vcf-variant-call-format-version-41
        GT : { description: "genotype, encoded as allele values separated by either of '/' or '|'. The allele values are 0 for the reference allele (what is in the REF field), 1 for the first allele listed in ALT, 2 for the second allele list in ALT and so on. For diploid calls examples could be 0/1, 1|0, or 1/2, etc. For haploid calls, e.g. on Y, male non-pseudoautosomal X, or mitochondrion, only one allele value should be given; a triploid call might look like 0/0/1. If a call cannot be made for a sample at a given locus, '.' should be specified for each missing allele in the GT field (for example './.' for a diploid genotype and '.' for haploid genotype). The meanings of the separators are as follows (see the PS field below for more details on incorporating phasing information into the genotypes): '/' meaning genotype unphased, '|' meaning genotype phased" },
        DP : { description: "read depth at this position for this sample (Integer)" },
        FT : { description: "sample genotype filter indicating if this genotype was \"called\" (similar in concept to the FILTER field). Again, use PASS to indicate that all filters have been passed, a semi-colon separated list of codes for filters that fail, or \".\" to indicate that filters have not been applied. These values should be described in the meta-information in the same way as FILTERs (String, no white-space or semi-colons permitted)" },
        GL : { description: "genotype likelihoods comprised of comma separated floating point log10-scaled likelihoods for all possible genotypes given the set of alleles defined in the REF and ALT fields. In presence of the GT field the same ploidy is expected and the canonical order is used; without GT field, diploidy is assumed. If A is the allele in REF and B,C,... are the alleles as ordered in ALT, the ordering of genotypes for the likelihoods is given by: F(j/k) = (k*(k+1)/2)+j.  In other words, for biallelic sites the ordering is: AA,AB,BB; for triallelic sites the ordering is: AA,AB,BB,AC,BC,CC, etc.  For example: GT:GL 0/1:-323.03,-99.29,-802.53 (Floats)" },
        GLE : { description: "genotype likelihoods of heterogeneous ploidy, used in presence of uncertain copy number. For example: GLE=0:-75.22,1:-223.42,0/0:-323.03,1/0:-99.29,1/1:-802.53 (String)" },
        PL : { description: "the phred-scaled genotype likelihoods rounded to the closest integer (and otherwise defined precisely as the GL field) (Integers)" },
        GP : { description: "the phred-scaled genotype posterior probabilities (and otherwise defined precisely as the GL field); intended to store imputed genotype probabilities (Floats)" },
        GQ : { description: "conditional genotype quality, encoded as a phred quality -10log_10p(genotype call is wrong, conditioned on the site's being variant) (Integer)" },
        HQ : { description: "haplotype qualities, two comma separated phred qualities (Integers)" },
        PS : { description: "phase set.  A phase set is defined as a set of phased genotypes to which this genotype belongs.  Phased genotypes for an individual that are on the same chromosome and have the same PS value are in the same phased set.  A phase set specifies multi-marker haplotypes for the phased genotypes in the set.  All phased genotypes that do not contain a PS subfield are assumed to belong to the same phased set.  If the genotype in the GT field is unphased, the corresponding PS field is ignored.  The recommended convention is to use the position of the first variant in the set as the PS identifier (although this is not required). (Non-negative 32-bit Integer)" },
        PQ : { description: "phasing quality, the phred-scaled probability that alleles are ordered incorrectly in a heterozygote (against all other members in the phase set).  We note that we have not yet included the specific measure for precisely defining \"phasing quality\"; our intention for now is simply to reserve the PQ tag for future use as a measure of phasing quality. (Integer)" },
        EC : { description: "comma separated list of expected alternate allele counts for each alternate allele in the same order as listed in the ALT field (typically used in association analyses) (Integers)" },
        MQ : { description: "RMS mapping quality, similar to the version in the INFO field. (Integer)" }
    },

    _vcfReservedAltTypes: {
        "DEL": { description: "Deletion relative to the reference", so_term: 'deletion' },
        "INS": { description: "Insertion of novel sequence relative to the reference", so_term: 'insertion' },
        "DUP": { description: "Region of elevated copy number relative to the reference", so_term: 'copy_number_gain' },
        "INV": { description: "Inversion of reference sequence", so_term: 'inversion' },
        "CNV": { description: "Copy number variable region (may be both deletion and duplication)", so_term: 'copy_number_variation' },
        "DUP:TANDEM": { description: "Tandem duplication", so_term: 'copy_number_gain' },
        "DEL:ME": { description: "Deletion of mobile element relative to the reference" },
        "INS:ME": { description: "Insertion of a mobile element relative to the reference" }
    },

    /**
     * parse a VCF line's INFO field, storing the contents as
     * attributes in featureData
     */
    _parseInfoField: function( featureData, fields ) {
        if( !fields[7] || fields[7] == '.' )
            return;
        var info = this._parseKeyValue( fields[7] );

        // decorate the info records with references to their descriptions
        for( var field in info ) {
            if( info.hasOwnProperty( field ) ) {
                    var i = info[field] = {
                        values: info[field],
                        toString: function() { return (this.values || []).join(','); }
                    };
                    var meta = this.getVCFMetaData( 'INFO', field );
                    if( meta )
                        i.meta = meta;
            }
        }

        dojo.mixin( featureData, info );
    },

    getVCFMetaData: function( field, key ) {
        field = field.toLowerCase();
        var inHeader = this.header[field] || {};
        var inFormat = { alt: this._vcfReservedAltTypes,
                         info: this._vcfReservedInfoFileds,
                         format: this._vcfStandardGenotypeFields
                       }[field] || {};
        return inHeader[key] || inFormat[key];
    },

    /**
     * Take an array of objects and make another object that indexes
     * them into another object for easy lookup by the given field.
     * WARNING: Values of the field must be unique.
     */
    _indexUniqObjects: function( entries, indexField, lowerCase ) {
        // index the info fields by field ID
        var items = {};
        array.forEach( entries, function( rec ) {
            var k = rec[indexField];
            if( dojo.isArray(k) )
                k = k[0];
            if( lowerCase )
                k = k.toLowerCase();
            items[ rec[indexField] ]= rec;
        });
        return items;
    },

    /**
     * Parse a VCF key-value string like DP=154;Foo="Bar; baz";MQ=52;H2 into an object like
     *  { DP: [154], Foo:['Bar',' baz'], ... }
     *
     * Done in a low-level style to properly support quoted values.  >:-{
     */
    _parseKeyValue: function( str, pairSeparator, valueSeparator, lowercaseKeys ) {
        pairSeparator  = pairSeparator  || ';';
        valueSeparator = valueSeparator || ',';

        var data = {};
        var currKey = '';
        var currValue = '';
        var state = 1;  // states: 1: read key to =, 2: read value to comma or sep, 3: read value to quote
        for( var i = 0; i < str.length; i++ ) {
            if( state == 1 ) { // read key
                if( str[i] == '=' ) {
                    if( lowercaseKeys )
                        currKey = currKey.toLowerCase();
                    data[currKey] = [];
                    state = 2;
                }
                else if( str[i] == pairSeparator ) {
                    if( lowercaseKeys )
                        currKey = currKey.toLowerCase();
                    data[currKey] = [true];
                    currKey = '';
                    state = 1;
                }
                else {
                    currKey += str[i];
                }
            }
            else if( state == 2 ) { // read value to value sep or pair sep
                if( str[i] == valueSeparator ) {
                    data[currKey].push( currValue );
                    currValue = '';
                }
                else if( str[i] == pairSeparator ) {
                    data[currKey].push( currValue );
                    currKey = '';
                    state = 1;
                    currValue = '';
                } else if( str[i] == '"' ) {
                    state = 3;
                    currValue = '';
                }
                else
                    currValue += str[i];
            }
            else if( state == 3 ) { // read value to quote
                if( str[i] != '"' )
                    currValue += str[i];
                else
                    state = 2;
            }
        }

        if( state == 2 || state == 3) {
            data[currKey].push( currValue );
        }

        return data;
    },

    _find_SO_term: function( ref, alt ) {
        // it's just a remark if there are no alternate alleles
        if( ! alt || alt == '.' )
            return 'remark';

        var types = array.filter( array.map( alt.split(','), function( alt ) {
                                                 return this._find_SO_term_from_alt_definitions( alt );
                                             }, this ),
                                  function( t ) { return t; } );

        if( types[0] )
            return types.join(',');


        return this._find_SO_term_by_examination( ref, alt );
    },

    /**
     * Given an ALT string, return a string suitable for appending to
     * the feature description, if available.
     */
    _makeDescriptionString: function( SO_term, ref, alt ) {
        if( ! alt )
            return 'no alternative alleles';

        alt = alt.replace(/^<|>$/g,'');

        var def = this.getVCFMetaData( 'alt', alt );
        return def && def.description ? alt+' - '+def.description : SO_term+" "+ref+" -> "+ alt;
    },

    _find_SO_term_from_alt_definitions: function( alt ) {
        // not a symbolic ALT if doesn't begin with '<', so we'll have no definition
        if( alt[0] != '<' )
            return null;

        alt = alt.replace(/^<|>$/g,''); // trim off < and >

        // look for a definition with an SO type for this
        var def = (this.header.alt||{})[alt] || this._vcfReservedAltTypes[alt];
        if( def && def.so_term )
            return def.so_term;

        // try to look for a definition for a parent term if we can
        alt = alt.split(':');
        if( alt.length > 1 )
            return this._find_SO_term_from_alt_definitions( '<'+alt.slice( 0, alt.length-1 ).join(':')+'>' );
        else // no parent
            return null;
    },

    _find_SO_term_by_examination: function( ref, alt ) {
        alt = alt.split(',');

        var minAltLen = Infinity;
        var maxAltLen = -Infinity;
        var altLen = array.map( alt, function(a) {
            var l = a.length;
            if( l < minAltLen )
                minAltLen = l;
            if( l > maxAltLen )
                maxAltLen = l;
            return a.length;
        });

        if( ref.length == 1 && minAltLen == 1 && maxAltLen == 1 )
            return 'SNV'; // use SNV because SO definition of SNP says
                          // abundance must be at least 1% in
                          // population, and can't be sure we meet
                          // that

        if( ref.length == minAltLen && ref.length == maxAltLen )
            if( alt.length == 1 && ref.split('').reverse().join('') == alt[0] )
                return 'inversion';
            else
                return 'substitution';

        if( ref.length <= minAltLen && ref.length < maxAltLen )
            return 'insertion';

        if( ref.length > minAltLen && ref.length >= maxAltLen )
            return 'deletion';

        return 'indel';
    }

});
});
