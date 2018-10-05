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
            ? Number(variant.INFO['END'][0])
            : start + Math.max(...(alt.map(a => {
                if (a.match(/</)) return 1
                return a.length
            })));
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
            featureData.genotypes = {}
            Object.keys(variant.SAMPLES).forEach(sample => {
                featureData.genotypes[sample] = {}
                Object.keys(variant.SAMPLES[sample]).forEach(field => {
                    featureData.genotypes[sample][field] = {
                        meta: {
                            description: [parser.getMetadata('FORMAT', field, 'Description')],
                            id: [field],
                            number: [parser.getMetadata('FORMAT', field, 'Number')],
                            type: parser.getMetadata('FORMAT', field, 'Type')
                        },
                        values: variant.SAMPLES[sample][field]
                    }
                })
            })
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
        let descriptions = new Set()
        alt.forEach(a => {
            let [soTerm, description] = this._getSOAndDescFromAltDefs(parser, ref, a);
            if (!soTerm) {
                [soTerm, description] = this._getSOAndDescByExamination(ref, a);
            }
            if (soTerm) {
                soTerms.add(soTerm)
                descriptions.add(description)
            }
        })
        // Combine descriptions like ["SNV G -> A", "SNV G -> T"] to ["SNV G -> A,T"]
        if (descriptions.size > 1) {
            const prefixes = new Set();
            [...descriptions].forEach(desc => {
                const prefix = desc.match(/(\w+? \w+? -> )\w+/)
                if (prefix && prefix[1]) prefixes.add(prefix[1])
                else prefixes.add(desc)
            });
            const new_descs = [];
            [...prefixes].forEach(prefix => {
                const suffixes = [];
                [...descriptions].forEach(desc => {
                    if (desc.startsWith(prefix)) {
                        suffixes.push(desc.slice(prefix.length))
                    }
                })
                new_descs.push(prefix + suffixes.join(','))
            })
            descriptions = new_descs
        }
        if (soTerms.size) {
            return [[...soTerms].join(','), [...descriptions].join(',')]
        }
        else
            return [null, null]
    },

    _altTypeToSO: {
        DEL: 'deletion',
        INS: 'insertion',
        DUP: 'copy_number_gain',
        INV: 'inversion',
        CNV: 'copy_number_variation',
        'DUP:TANDEM': 'copy_number_gain',
        NON_REF: 'sequence_variant',
        '*': 'sequence_variant',
    },

    _getSOAndDescFromAltDefs: function (parser, ref, alt) {
        // not a symbolic ALT if doesn't begin with '<', so we'll have no definition
        if (alt[0] != '<') {
            return [null, null];
        }

        alt = alt.replace(/^<|>$/g, ''); // trim off < and >

        // look for a definition with an SO type for this
        let soTerm = this._altTypeToSO[alt]
        // if no SO term but ALT is in metadata, assume sequence_variant
        if (!soTerm && parser.getMetadata('ALT', alt)) soTerm = 'sequence_variant'
        if (soTerm) {
            let description = parser.getMetadata('ALT', alt, 'Description')
                ? alt + ' - ' + parser.getMetadata('ALT', alt, 'Description')
                : this._makeDescriptionString(soTerm, ref, alt)
            return [soTerm, description]
        }

        // try to look for a definition for a parent term if we can
        alt = alt.split(':');
        if (alt.length > 1) {
            return this._getSOAndDescFromAltDefs(parser, ref, '<' + alt.slice(0, alt.length - 1).join(':') + '>');
        }
        else { // no parent
            return [null, null];
        }
    },

    _getSOAndDescByExamination: function (ref, alt) {
        if (ref.length == 1 && alt.length == 1) {
            // use SNV because SO definition of SNP says abundance must be at 
            // least 1% in population, and can't be sure we meet that
            return [
                'SNV',
                this._makeDescriptionString('SNV', ref, alt)
            ];
         } 

        if (ref.length == alt.length)
            if (ref.split('').reverse().join('') == alt)
                return [
                    'inversion',
                    this._makeDescriptionString('inversion', ref, alt)
                ];
            else
                return [
                    'substitution',
                    this._makeDescriptionString('substitution', ref, alt)
                ];

        if (ref.length <= alt.length)
            return [
                'insertion',
                this._makeDescriptionString('insertion', ref, alt)
            ];

        if (ref.length > alt.length)
            return [
                'deletion',
                this._makeDescriptionString('deletion', ref, alt)
            ];

        return [
            'indel',
            this._makeDescriptionString('indel', ref, alt)
        ];
    },

    _makeDescriptionString: function (soTerm, ref, alt) {
        return soTerm + " " + ref + " -> " + alt
    }

});

});
