define([
    'dojo/_base/declare',
],
    function (
        declare,
    ) {

return declare(null, {
    /**
    * Given a parser and a variant from @gmod/vcf, convert the variant into
    * a feature and return it.
    */
    variantToFeature(parser, variant) {
        const ref = variant.REF;
        const alt = variant.ALT;
        const start = variant.POS - 1;
        const end = variant.INFO['END']
            ? Number(variant.INFO['END'])
            : start + Math.max(...(alt.map(a => a.length)));
        const [SO_term, description] = this._getSOTermAndDescription(
            parser,
            ref,
            alt,
        )

        var featureData = {
            start: start,
            end: end,
            seq_id: variant.CHROM,
            description: description,
            type: SO_term,
            reference_allele: ref
        };

        if (variant.ID) {
            featureData.name = variant.ID[0]
            if (variant.ID > 1) {
                featureData.aliases = variant.ID.slice(1).join(',');
            }
        }

        if (variant.QUAL) {
            featureData.score = variant.QUAL
        };

        if (variant.FILTER) {
            featureData.filter = {
                meta: {
                    description: 'List of filters that this site has not passed, or PASS if it has passed all filters',
                    filters: parser.getMetadata('FILTER')
                },
                values: variant.FILTER === 'PASS' ? ['PASS'] : variant.FILTER
            };
        }

        if (alt) {
            featureData.alternative_alleles = {
                meta: {
                    description: 'VCF ALT field, list of alternate non-reference alleles called on at least one of the samples'
                },
                values: alt
            };
        }

        // parse the info field and store its contents as attributes in featureData
        if (variant.INFO) {
            this._parseInfoField(parser, featureData, variant.INFO);
        }

        if (Object.keys(variant.SAMPLES).length) {
            featureData.genotypes = variant.SAMPLES
        }

        return featureData
    },

    /**
    * parse a VCF line's INFO field, storing the contents as
    * attributes in featureData
    */
    _parseInfoField: function (parser, featureData, info) {
        
        // decorate the info records with references to their descriptions
        for (var field in info) {
            if (info.hasOwnProperty(field)) {
                var i = info[field] = {
                    values: info[field]
                };
                var meta = parser.getMetadata('INFO', field);
                if (meta)
                    i.meta = meta;
                featureData[field] = i
            }
        }
    },

    /**
     * Get a sequence ontology (SO) term that describes the variant type
     */
    _getSOTermAndDescription: function (parser, ref, alt) {
        // it's just a remark if there are no alternate alleles
        if (!alt || alt === []) {
            return ['remark', 'no alternative alleles']
        };

        const soTerms = new Set()
        const descriptions = new Set()
        alt.forEach(a => {
            const [soTerm, description] = this._getSOAndDescFromAltDefs(parser, ref, alt);
            if (soTerm) {
                soTerms.add(soTerm)
                descriptions.add(description)
            }
        })
        if (soTerms.size) {
            return [[...soTerms].join(','), [...descriptions.join(',')]]
        }

        return this._getSOAndDescByExamination(ref, alt);
    },

    _getSOAndDescFromAltDefs: function (parser, ref, alt) {
        // not a symbolic ALT if doesn't begin with '<', so we'll have no definition
        if (alt[0] != '<') {
            return [null, null];
        }

        alt = alt.replace(/^<|>$/g, ''); // trim off < and >

        const _altTypeToSO = {
            DEL: 'deletion',
            INS: 'insertion',
            DUP: 'copy_number_gain',
            INV: 'inversion',
            CNV: 'copy_number_variation',
            'DUP:TANDEM': 'copy_number_gain',
            NON_REF: 'sequence_variant',
            '*': 'sequence_variant',
        }

        // look for a definition with an SO type for this
        const soTerm = _altTypeToSO[alt]
        if (soTerm) {
            let description = parser.getMetadata()['ALT'][soTerm]
                ? alt + ' - ' + parser.getMetadata()['ALT'][soTerm]
                : soTerm + " " + ref + " -> " + alt
            return [soTerm, description]
        }

        // try to look for a definition for a parent term if we can
        alt = alt.split(':');
        if (alt.length > 1) {
            return this._getSOAndDescFromAltDefs(parser, ref, '<' + alt.slice(0, alt.length - 1).join(':') + '>');
        }
        else { // no parent
            return null;
        }
    },

    _getSOAndDescByExamination: function (ref, alt) {
        const altLens = alt.map( a => {
            return a.length
        });
        
        const minAltLen = Math.min(...altLens);
        const maxAltLen = Math.max(...altLens);

        if (ref.length == 1 && minAltLen == 1 && maxAltLen == 1) {
            // use SNV because SO definition of SNP says abundance must be at 
            // least 1% in population, and can't be sure we meet that
            return ['SNV', ''];
         } 

        if (ref.length == minAltLen && ref.length == maxAltLen)
            if (alt.length == 1 && ref.split('').reverse().join('') == alt[0])
                return ['inversion', ''];
            else
                return ['substitution', ''];

        if (ref.length <= minAltLen && ref.length < maxAltLen)
            return ['insertion', ''];

        if (ref.length > minAltLen && ref.length >= maxAltLen)
            return ['deletion', ''];

        return ['indel', ''];
    }

});

});
