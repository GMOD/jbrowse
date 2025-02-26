---
id: minimal
title: Minimal JBrowse configurations
---

# Minimal configs

In 1.15.3, many track types were given the ability to "auto-infer" track type
and storeClass from the file extension of the urlTemplate so minimal configs can
be specified

For example you can simply create a "data directory" folder, and hand edit a
"tracks.conf" file to contain something like

    [GENERAL]
    refSeqs=genome.fa.fai
    [tracks.refseqs]
    urlTemplate=genome.fa
    [tracks.mybam]
    urlTemplate=alignments.bam
    [tracks.mycram]
    urlTemplate=alignments.cram
    [tracks.myvcftabix]
    urlTemplate=variants.vcf.gz
    [tracks.mygfftabix]
    urlTemplate=genes.gff3.gz
    [tracks.mybedtabix]
    urlTemplate=peaks.bed.gz

The refSeqs config tells JBrowse the list of chromosomes, which can be an FAI
file, a 2bit file, a chrom.sizes file, or if prepare-refseqs.pl was used, it is
unnecessary to specify this.

### Sequence track minimal config

For the sequence track, specifying the urlTemplate as genome.fa will assume that
indexed FASTA is used and will automatically locate genome.fa.fai (unindexed
fasta is too slow for even modest sized reference sequences so it just assumes
indexed FASTA)

    [tracks.refseqs]
    urlTemplate=genome.fa

### Feature track minimal config

To specify genes, you can use GFF3Tabix or BigBed

    [tracks.mygfftabix]
    urlTemplate=genes.gff3.gz
    [tracks.mybigbed]
    urlTemplate=genes.bb

Note GFF3Tabix supports indexing feature names, IDs, and other things (if
nameAttributes is specified in the config of a GFF3Tabix, it indexes those
features) with generate-names.pl. BigBed does not currently have
generate-names.pl support

### Alignments

Alignments tracks can be specified with CRAM and BAM using the minimal config

    [tracks.mybam]
    urlTemplate=alignments.bam
    [tracks.mycram]
    urlTemplate=alignments.cram

The BAM index (bai) and CRAM index (crai) will automatically be located. If CSI
indexes are used, csiUrlTemplate must be specified. Or if the BAI/CRAI index is
in a non-standard location, specify baiUrlTemplate/craiUrlTemplate.

### Variants

A minimal VCF tabix track can use

    [tracks.myvcf]
    urlTemplate=variants.vcf.gz

The tbi index will automatically be located by adding .tbi to the urlTemplate.
If CSI indexes are used, csiUrlTemplate must be specified

### BigWig

A minimal bigwig config is simply a url template to the bigwig file

    [tracks.mybw]
    urlTemplate=bigwig.bw

## Specifying minimal JSON configs

The trackList.json also can do minimal configs. An example

    {
        "refSeqs": "genome.fa.fai",
        "tracks": [
            {"label": "refseqs", "urlTemplate": "genome.fa"},
            {"label": "bam", "urlTemplate": "alignments.bam"},
            {"label": "cram", "urlTemplate": "alignments.cram"},
            {"label": "vcf", "urlTemplate": "variats.vcf.gz"},
            {"label": "gff3tabix", "urlTemplate": "genes.gff3.gz"},
            {"label": "bigbed", "urlTemplate": "bigbed.bb"},
            {"label": "bigwig", "urlTemplate": "bigwig.bw"}
        ]
    }
