define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/Deferred',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/TabixIndexedFile',
           'JBrowse/Model/SimpleFeature',
           'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
           'JBrowse/Model/XHRBlob',
           'JBrowse/Digest/Crc32'
       ],
       function(
           declare,
           array,
           Deferred,
           SeqFeatureStore,
           DeferredStatsMixin,
           DeferredFeaturesMixin,
           TabixIndexedFile,
           SimpleFeature,
           GlobalStatsEstimationMixin,
           XHRBlob,
           Digest
       ) {


// subclass the TabixIndexedFile to modify the parsed items a little
// bit so that the range filtering in TabixIndexedFile will work.  VCF
// files don't actually have an end coordinate, so we have to make it
// here.  also convert coordinates to interbase.
var VCFIndexedFile = declare( TabixIndexedFile, {
    parseItem: function() {
        var i = this.inherited( arguments );
        if( i ) {
            i.start--;
            i.end = i.start + i.fields[3].length;
        }
        return i;
    }
});

return declare( [SeqFeatureStore,DeferredStatsMixin,DeferredFeaturesMixin,GlobalStatsEstimationMixin],
{

    constructor: function( args ) {
        var thisB = this;

        var tbiBlob = args.tbiBlob ||
            new XHRBlob( this.resolveUrl(
                             this.getConf('tbiUrlTemplate',[]) || this.getConf('urlTemplate',[])+'.tbi',
                             {'refseq': (this.refSeq||{}).name }
                         )
                       );

        var fileBlob = args.fileBlob ||
            new XHRBlob( this.resolveUrl( this.getConf('urlTemplate',[]),
                             {'refseq': (this.refSeq||{}).name }
                           )
                       );

        this.indexedData = new VCFIndexedFile({ tbi: tbiBlob, file: fileBlob });

        this._loadHeader().then( function() {
            thisB._estimateGlobalStats( function( stats, error ) {
                if( error )
                    thisB._failAllDeferred( error );
                else {
                    thisB.globalStats = stats;
                    thisB._deferred.stats.resolve({success:true});
                    thisB._deferred.features.resolve({success:true});
                }
            });
        });
    },

    /** fetch and parse the VCF header lines */
    _loadHeader: function() {
        var thisB = this;
        return this._parsedHeader = this._parsedHeader || function() {
            var d = new Deferred();

            thisB.indexedData.indexLoaded.then( function() {
                var maxFetch = thisB.indexedData.index.firstDataLine
                    ? thisB.indexedData.index.firstDataLine.block + thisB.indexedData.data.blockSize - 1
                    : null;

                thisB.indexedData.data.read(
                    0,
                    maxFetch,
                    function( bytes ) {

                        thisB.header = thisB._parseHeader( new Uint8Array( bytes ) );

                        d.resolve({ success:true});
                    },
                    dojo.hitch( d, 'reject' )
                );
            });

            return d;
        }.call();
    },

    _newlineCode: "\n".charCodeAt(0),

    /**
     *  helper method that parses the next line from a Uint8Array or similar.
     *  @param parseState.data the byte array
     *  @param parseState.offset the offset to start parsing.  <MODIFIED AS A SIDE EFFECT OF THI SMETHOD
     */
    _getlineFromBytes: function( parseState ) {
        if( ! parseState.offset )
            parseState.offset = 0;

        var newlineIndex = array.indexOf( parseState.data, this._newlineCode, parseState.offset );

        if( newlineIndex == -1 ) // no more lines
            return null;

        var line = String.fromCharCode.apply( String, Array.prototype.slice.call( parseState.data, parseState.offset, newlineIndex ));
        parseState.offset = newlineIndex+1;
        return line;
    },

    /**
     * Parse the bytes that contain the VCF header, returning an
     * object containing the parsed data.
     */
    _parseHeader: function( headerBytes ) {

        // parse the header lines
        var headData = {};
        var parseState = { data: headerBytes, offset: 0 };
        var line;
        while(( line = this._getlineFromBytes( parseState ))) {
            // only interested in meta and header lines
            if( line[0] != '#' )
                continue;

            var match = /^##([^\s#=]+)=(.+)/.exec( line);
            // parse meta line
            if( match && match[1] ) {
                var metaField = match[1].toLowerCase();
                var metaData = (match[2]||'');

                // TODO: do further parsing for some fields
                if( metaField == 'info' ) {
                    metaData = this._parseInfoHeaderLine( metaData );
                }
                else if( metaField == 'format' ) {
                    metaData = this._parseFormatHeaderLine( metaData );
                }
                else if( metaField == 'filter' ) {
                    metaData = this._parseFilterHeaderLine( metaData );
                }
                else if( metaField == 'alt' ) {
                    metaData = this._parseAltHeaderLine( metaData );
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

        // index the info fields by field ID
        if( headData.info ) {
            var i = {};
            array.forEach( headData.info, function( irec ) {
                i[irec.id]= irec;
            });
            headData.info = i;
        }

        return headData;
    },

    _parseInfoHeaderLine: function( metaData ) {
        var match = /^<\s*ID\s*=\s*([^,]*),\s*Number\s*=\s*([^,]*),\s*Type\s*=\s*([^,]*),\s*Description\s*=\s*"([^"]*)"/i.exec( metaData );
        if( match ) {
            return {
                id: match[1],
                number: match[2],
                type: match[3],
                description: match[4]
            };
        }
        return metaData;
    },
    _parseFormatHeaderLine: function( metaData ) {
        return this._parseInfoHeaderLine( metaData );
    },
    _parseFilterHeaderLine: function( metaData ) {
        var match = /^<\s*ID\s*=\s*([^,]*),\s*Description\s*=\s*"([^"]*)"/i.exec( metaData );
        if( match ) {
            return {
                id: match[1],
                description: match[2]
            };
        }
        return metaData;
    },
    _parseAltHeaderLine: function( metaData ) {
        // ##ALT has same format as ##FILTER
        return this._parseFilterHeaderLine( metaData );
    },


    _vcfReservedInfoFields: {
        // from the VCF4.1 spec, http://www.1000genomes.org/wiki/Analysis/Variant%20Call%20Format/vcf-variant-call-format-version-41
        AA: "ancestral allele",
        AC: "allele count in genotypes, for each ALT allele, in the same order as listed",
        AF: "allele frequency for each ALT allele in the same order as listed: use this when estimated from primary data, not called genotypes",
        AN: "total number of alleles in called genotypes",
        BQ: "RMS base quality at this position",
        CIGAR: "cigar string describing how to align an alternate allele to the reference allele",
        DB: "dbSNP membership",
        DP: "combined depth across samples, e.g. DP=154",
        END: "end position of the variant described in this record (esp. for CNVs)",
        H2: "membership in hapmap2",
        MQ: "RMS mapping quality, e.g. MQ=52",
        MQ0: "Number of MAPQ == 0 reads covering this record",
        NS: "Number of samples with data",
        SB: "strand bias at this position",
        SOMATIC: "indicates that the record is a somatic mutation, for cancer genomics",
        VALIDATED: "validated by follow-up experiment"
    },

    _vcfReservedGenotypeKeywords: {
        // from the VCF4.1 spec, http://www.1000genomes.org/wiki/Analysis/Variant%20Call%20Format/vcf-variant-call-format-version-41
        GT : "genotype, encoded as allele values separated by either of '/' or '|'. The allele values are 0 for the reference allele (what is in the REF field), 1 for the first allele listed in ALT, 2 for the second allele list in ALT and so on. For diploid calls examples could be 0/1, 1|0, or 1/2, etc. For haploid calls, e.g. on Y, male non-pseudoautosomal X, or mitochondrion, only one allele value should be given; a triploid call might look like 0/0/1. If a call cannot be made for a sample at a given locus, '.' should be specified for each missing allele in the GT field (for example './.' for a diploid genotype and '.' for haploid genotype). The meanings of the separators are as follows (see the PS field below for more details on incorporating phasing information into the genotypes): '/' meaning genotype unphased, '|' meaning genotype phased",
        DP : "read depth at this position for this sample (Integer)",
        FT : "sample genotype filter indicating if this genotype was “called” (similar in concept to the FILTER field). Again, use PASS to indicate that all filters have been passed, a semi-colon separated list of codes for filters that fail, or ”.” to indicate that filters have not been applied. These values should be described in the meta-information in the same way as FILTERs (String, no white-space or semi-colons permitted)",
        GL : "genotype likelihoods comprised of comma separated floating point log10-scaled likelihoods for all possible genotypes given the set of alleles defined in the REF and ALT fields. In presence of the GT field the same ploidy is expected and the canonical order is used; without GT field, diploidy is assumed. If A is the allele in REF and B,C,... are the alleles as ordered in ALT, the ordering of genotypes for the likelihoods is given by: F(j/k) = (k*(k+1)/2)+j.  In other words, for biallelic sites the ordering is: AA,AB,BB; for triallelic sites the ordering is: AA,AB,BB,AC,BC,CC, etc.  For example: GT:GL 0/1:-323.03,-99.29,-802.53 (Floats)",
        GLE : "genotype likelihoods of heterogeneous ploidy, used in presence of uncertain copy number. For example: GLE=0:-75.22,1:-223.42,0/0:-323.03,1/0:-99.29,1/1:-802.53 (String)",
        PL : "the phred-scaled genotype likelihoods rounded to the closest integer (and otherwise defined precisely as the GL field) (Integers)",
        GP : "the phred-scaled genotype posterior probabilities (and otherwise defined precisely as the GL field); intended to store imputed genotype probabilities (Floats)",
        GQ : "conditional genotype quality, encoded as a phred quality -10log_10p(genotype call is wrong, conditioned on the site's being variant) (Integer)",
        HQ : "haplotype qualities, two comma separated phred qualities (Integers)",
        PS : "phase set.  A phase set is defined as a set of phased genotypes to which this genotype belongs.  Phased genotypes for an individual that are on the same chromosome and have the same PS value are in the same phased set.  A phase set specifies multi-marker haplotypes for the phased genotypes in the set.  All phased genotypes that do not contain a PS subfield are assumed to belong to the same phased set.  If the genotype in the GT field is unphased, the corresponding PS field is ignored.  The recommended convention is to use the position of the first variant in the set as the PS identifier (although this is not required). (Non-negative 32-bit Integer)",
        PQ : "phasing quality, the phred-scaled probability that alleles are ordered incorrectly in a heterozygote (against all other members in the phase set).  We note that we have not yet included the specific measure for precisely defining \"phasing quality\"; our intention for now is simply to reserve the PQ tag for future use as a measure of phasing quality. (Integer)",
        EC : "comma separated list of expected alternate allele counts for each alternate allele in the same order as listed in the ALT field (typically used in association analyses) (Integers)",
        MQ : "RMS mapping quality, similar to the version in the INFO field. (Integer) "
    },

    /**
     * parse a VCF line's INFO field.
     */
    _parseInfoField: function( featureData, fields ) {
        if( !fields[7] || fields[7] == '.' )
            return null;
        var info = this._parseKeyValue( fields[7] );

        // decorate the info records with references to their descriptions
        var infoMeta = this.header.info || {};
        array.forEach( info, function( i ) {
            var meta = infoMeta[i.key] || ( this._vcfReservedInfoFields[i.key] && { description: this._vcfReservedInfoFields[i.key] } );
            if( meta )
                i.meta = meta;
        },this);

        return info;
    },

    /**
     * Parse a VCF key-value string like DP=154;MQ=52;H2
     */
    _parseKeyValue: function( str ) {
        return array.map( (str||'').split(';'), function(f) {
            var match = /^([^=]+)=?(.*)/.exec( f );
            var i = { key: match[1] };
            if( match[2] )
                i.values = match[2].split(',');
            return i;
        });
    },

    _lineToFeature: function( line ) {
        var fields = line.fields;
        for( var i=0; i<fields.length; i++ )
            if( fields[i] == '.' )
                fields[i] = null;

        var ref = fields[3];
        var alt = fields[4];
        var ids = (fields[2]||'').split(';');
        var SO_type = this._so_type( ref, alt );
        var featureData = {
            start:  line.start,
            end:    line.start+ref.length,
            seq_id: line.ref,
            description: SO_type+": "+ref+" -> "+alt,
            name:   ids[0],
            type:   SO_type,
            reference_allele:    ref,
            alternative_alleles: alt,
            score:   fields[5],
            filter: fields[6]
        };

        if( ids.length > 1 )
            featureData.aliases = ids.slice(1).join(',');

        featureData.info = this._parseInfoField( featureData, fields );

        var genotypes = this._parseGenotypes( featureData, fields );
        if( genotypes )
            featureData.genotypes = genotypes;

        //console.log( featureData );

        var f = new SimpleFeature({
            id: ids[0] || Digest.objectFingerprint( fields.slice( 0, 9 ) ),
            data: featureData
        });


        return f;
    },

    _parseGenotypes: function( featureData, fields ) {
        if( fields.length < 10 )
            return null;

        // parse the genotype data fields
        var genotypes = [];
        var format = fields[8].split(':');
        for( var i = 9; i < fields.length; ++i ) {
            var g = (fields[i]||'').split(':');
            var gdata = {};
            for( var j = 0; j<format.length; ++j ) {
                gdata[format[j]] = g[j];
            }
            genotypes.push( gdata );
        }

        // index the genotypes by sample ID
        var bySample = {};
        for( var i = 0; i<genotypes.length; i++ ) {
            var sname = this.header.samples[i];
            if( sname ) {
                bySample[sname] = genotypes[i];
            }
        }

        return bySample;
    },

    _so_type: function( ref, alt ) {
        // it's just a remark if there are no alternate alleles
        if( alt == '.' )
            return 'remark';

        alt = (alt||'.').split(',');
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

        if( ref.length == minAltLen && ref.length < maxAltLen )
            return 'insertion';

        if( ref.length > minAltLen && ref.length == maxAltLen )
            return 'deletion';

        return 'indel';
    },

    _getFeatures: function( query, featureCallback, finishedCallback, errorCallback ) {
        var thisB = this;
        thisB._loadHeader().then( function() {
            thisB.indexedData.getLines(
                query.ref || thisB.refSeq.name,
                query.start,
                query.end,
                function( line ) {
                    var f = thisB._lineToFeature( line );
                    //console.log(f);
                    featureCallback( f );
                    //return f;
                },
                finishedCallback,
                errorCallback
            );
        });
    },

    getRefSeqs: function( refSeqCallback, finishedCallback, errorCallback ) {
        return this.indexedData.index.getRefSeqs.apply( this.indexedData.index, arguments );
    }

});
});