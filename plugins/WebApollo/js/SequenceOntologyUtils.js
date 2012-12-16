define( [],
        function() {

var SequenceOntologyUtils = {};
            
/**
 *  Sequence Ontology feature types that are known to not have CDS children
 *  NOT a complete list (complete list would be extensive)
 */
SequenceOntologyUtils.neverHasCDS = {
    match: true, 
    nucleotide_match: true, 
    expressed_sequence_match: true, 
    cDNA_match: true, 
    EST_match: true, 
    RST_match: true, 
    UST_match: true, 
    primer_match: true, 
    tranlated_nucleotide_match: true, 
    protein_match: true, 
    protein_hmm_match: true, 
    alignment: true, 
    repeat: true
}
            
SequenceOntologyUtils.neverHasExons = {
    match: true, 
    nucleotide_match: true, 
    expressed_sequence_match: true, 
    cDNA_match: true, 
    EST_match: true, 
    RST_match: true, 
    UST_match: true, 
    primer_match: true, 
    tranlated_nucleotide_match: true, 
    protein_match: true, 
    protein_hmm_match: true, 
    alignment: true, 
    repeat: true
}

/** 
 *  flattened Sequence Ontology for UTR
 *  UTR and is-a descendants
 *  also including some other terms, relationship to UTR is noted 
 */
SequenceOntologyUtils.utrTerms = {
    UTR: true, 
    three_prime_UTR: true, 
    five_prime_UTR: true, 
    internal_UTR: true, 
    untranslated_region_polycistronic_mRNA: true, 
    UTR_region: true,   /* part_of */
    /* not including UTR_region descendants, not appropriate:
       AU_rich_element, Bruno_response_element, iron_responsive_element, upstream_AUG_codon
    */
    /* not including five_prime_open_reading_frame (part-of UTR) */
    noncoding_region_of_exon: true,  /* part_of exon */
    five_prime_coding_exon_noncoding_region: true,  /* part_of exon */
    three_prime_coding_exon_noncoding_region: true  /* part_of exon */
}

/**
 *  flattened Sequence Ontology for CDS
 *  CDS and is-a children
 *  also including some other terms, relationship to CDS is noted 
 */
SequenceOntologyUtils.cdsTerms = {
    CDS: true, 
    CDS_fragment: true, 
    CDS_independently_known: true, 
    CDS_predicted: true, 
    CDS_supported_by_sequence_similarity_data: true, 
    CDS_supported_by_EST_or_cDNA_data: true, 
    CDS_supported_by_domain_match_data: true, 
    orphan_CDS: true, 
    edited_CDS: true, 
    transposable_element_CDS: true, 
    polypeptide: true, /* part_of */
    CDS_region: true,   /* part_of */
    /* not including CDS_region descendants, not appropriate: 
       coding_end, coding_start, codon, etc.
    */
    coding_region_of_exon: true, /* part_of exon */
    five_prime_coding_exon_coding_region: true, /* part_of exon */
    three_prime_coding_exon_coding_region: true /* part_of exon */
} 

/**
 *  flattened Sequence Ontology for exon
 *  exon and is-a children
 *  also including some other terms, relationship to exon is noted 
 */
SequenceOntologyUtils.exonTerms = {
    exon: true, 
    exon_of_single_exon_gene: true, 
    coding_exon: true, 
    five_prime_coding_exon: true, 
    three_prime_coding_exon: true, 
    interior_coding_exon: true, 
    non_coding_exon: true, 
    five_prime_noncoding_exon: true, 
    three_prime_noncoding_exon: true, 
    interior_exon: true, 
    decayed_exon: true, /* non_functional_homolog_of */
    pseudogenic_exon: true, /* non_functional_homolog_of */
    exon_region: true /* part_of */
    /*  not including descendants of exon_region that are synonymous with UTR or CDS terms
        coding_region_of_exon: true, 
        five_prime_coding_exon_coding_region: true,
        three_prime_coding_exon_coding_region: true,
        noncoding_region_of_exon: true,
        five_prime_coding_exon_noncoding_region: true,
        three_prime_coding_exon_noncoding_region: true 
    */
}

SequenceOntologyUtils.startCodonTerms = {
    start_codon: true, 
    non_canonical_start_codon: true 
}

SequenceOntologyUtils.stopCodonTerms = {
    stop_codon: true
}

/* not yet complete */
SequenceOntologyUtils.spliceTerms = {
    splice_site: true, 
    cis_splice_site: true, 
    five_prime_cis_splice_site: true, 
    recursive_splice_site: true, 
    three_prime_cis_splice_site: true, 
    canonical_five_prime_splice_site: true, 
    canonical_three_prime_splice_site: true, 
    non_canonical_five_prime_splice_site: true, 
    non_canonical_three_prime_splice_site: true, 
    non_canonical_splice_site: true 
}

/* not yet complete? */
SequenceOntologyUtils.intronTerms = {
    intron: true, 
    five_prime_intron: true, 
    three_prime_intron: true, 
    interior_intron: true, 
    UTR_intron: true, 
    twintron: true, 
    spliceosomal_intron: true, 
    autocatalytically_spliced_intron: true, 
    endonuclease_spliced_intron: true, 
    mobile_intron: true
}

return SequenceOntologyUtils;
});