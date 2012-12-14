require({
           packages: [
               { name: 'jqueryui', location: '../plugins/WebApollo/jslib/jqueryui' },
               { name: 'jquery', location: '../plugins/WebApollo/jslib/jquery', main: 'jquery' }
           ]
       },
       [],
       function() {

define.amd.jQuery = true;

define(
       [
           'dojo/_base/declare',
           'dijit/CheckedMenuItem',
           'JBrowse/Plugin',
           './FeatureEdgeMatchManager', 
	   './FeatureSelectionManager'
       ],
    function( declare, dijitCheckedMenuItem, JBPlugin, FeatureEdgeMatchManager, FeatureSelectionManager ) {

return declare( JBPlugin,
{

    colorCdsByFrame: false,

    constructor: function( args ) {
        var thisB = this;
        var browser = args.browser;
        
        /**
         *  Sequence Ontology feature types that are known to not have CDS children
         *  NOT a complete list (complete list would be extensive)
         */
        this.neverHasCDS = {
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
        
        this.neverHasExons = {
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
        this.utrTerms = {
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
        this.cdsTerms = {
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
        this.exonTerms = {
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

        // hand the browser object to the feature edge match manager
        FeatureEdgeMatchManager.setBrowser( browser );
	
	this.featSelectionManager = new FeatureSelectionManager();
	this.annotSelectionManager = new FeatureSelectionManager();

	// setting up selection exclusiveOr --
	//    if selection is made in annot track, any selection in other tracks is deselected, and vice versa,
	//    regardless of multi-select mode etc.
	this.annotSelectionManager.addMutualExclusion(this.featSelectionManager);
	this.featSelectionManager.addMutualExclusion(this.annotSelectionManager);

	FeatureEdgeMatchManager.addSelectionManager(this.featSelectionManager);
	FeatureEdgeMatchManager.addSelectionManager(this.annotSelectionManager);


        // add a global menu option for setting CDS color
        var cds_frame_toggle = new dijitCheckedMenuItem(
                {
                    label: "Color by CDS frame",
                    checked: false,
                    onClick: function(event) {
                        thisB.colorCdsByFrame = cds_frame_toggle.checked;
                        browser.view.redrawTracks();
                    }
                });
        browser.addGlobalMenuItem( 'options', cds_frame_toggle );

        // register the WebApollo track types with the browser, so
        // that the open-file dialog and other things will have them
        // as options
        browser.registerTrackType({
            type:                 'WebApollo/View/Track/DraggableHTMLFeatures',
            defaultForStoreTypes: [ 'JBrowse/Store/SeqFeature/NCList',
                                    'JBrowse/Store/SeqFeature/GFF3'
                                  ],
            label: 'WebApollo Features'
        });
        browser.registerTrackType({
            type:                 'WebApollo/View/Track/DraggableAlignments',
            defaultForStoreTypes: [ 
                                    'JBrowse/Store/SeqFeature/BAM',
                                  ],
            label: 'WebApollo Alignments'
        });
        browser.registerTrackType({
            type:                 'WebApollo/View/Track/SequenceTrack',
            defaultForStoreTypes: [ 'JBrowse/Store/Sequence/StaticChunked' ],
            label: 'WebApollo Sequence'
        });



    }
});

});

});