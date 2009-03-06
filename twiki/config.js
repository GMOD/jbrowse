    {
      "track": "ExampleFeatures",
      "key": "Example Features",
      "feature": ["remark"],
      "autocomplete": "all",
      "class": "feature2"
    },
    {
      "track": "NameTest",
      "feature": ["protein_coding_primary_transcript", "polypeptide"],
      "class": "feature2",
      "key": "Name test track"
    },
    {
      "track": "Motifs",
      "feature": ["polypeptide_domain"],
      "class": "feature3",
      "description": 1,
      "key": "Example motifs"
    },
    {
      "track": "Alignments",
      "feature": ["match"],
      "class": "feature4",
      "key": "Example alignments",
      "category": "Alignments"
    },
    {
      "track": "Genes",
      "feature": ["gene"],
      "class": "feature5",
      "key": "Protein-coding genes"
    },
    {
      "track": "ReadingFrame",
      "feature": ["mRNA"],
      "class": "dblhelix",
      "key": "Frame usage",
      "category": "Genes"
    },
    {
      "track": "CDS",
      "feature": ["CDS:predicted", "mRNA:exonerate"],
      "class": "cds",
      "phase": 1,
      "key": "Predicted genes",
      "category": "Genes"
    },
    {
      "track": "Transcript",
      "feature": ["mRNA:exonerate"],
      "description": 1,
      "class": "transcript",
      "subfeature_classes": {
        "CDS": "transcript-CDS",
        "five_prime_UTR": "transcript-five_prime_UTR",
        "three_prime_UTR": "transcript-three_prime_UTR"
      },
      "key": "Exonerate predictions",
      "category": "Genes"
    },
    {
      "track": "Clones",
      "feature": ["BAC"],
      "class": "exon",
      "description": 1,
      "key": "Fingerprinted BACs"
    },
    {
      "track": "EST",
      "feature": ["EST_match:est"],
      "class": "est",
      "key": "ESTs"
    }
