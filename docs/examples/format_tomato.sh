#!/usr/bin/env bash

## example script that fetches and formats large data from the tomato
## genome (similar in size to Human) using flatfile-to-json

IN='sample_data/raw/tomato';
OUT='sample_data/json/tomato';

set -e;
rm -rf $OUT;
mkdir -p $IN $OUT;

# fetch the tomato data using `wget` (about 1G total)
for f in ITAG2.3_assembly.gff3        \
         ITAG2.3_gene_models.gff3     \
         ITAG2.3_genomic.fasta        \
         ITAG2.3_cdna_alignments.gff3 \
         ITAG2.3_sgn_data.gff3        \
         ; do
    if [ ! -e $IN/$f ]; then
        wget -v -O $IN/$f ftp://ftp.solgenomics.net/genomes/Solanum_lycopersicum/annotation/ITAG2.3_release/$f;
    fi
done

# format the reference sequences
bin/prepare-refseqs.pl --compress --fasta $IN/ITAG2.3_genomic.fasta --out $OUT;

# official ITAG2.3 gene models
bin/flatfile-to-json.pl --compress \
    --out $OUT \
    --gff $IN/ITAG2.3_gene_models.gff3 \
    --type mRNA \
    --autocomplete all \
    --trackLabel genes  \
    --key 'Gene models' \
    --getSubfeatures    \
    --className transcript \
    --subfeatureClasses '{"CDS": "transcript-CDS", "exon": "transcript-exon"}' \
    --arrowheadClass arrowhead \
    --urltemplate "http://solgenomics.net/search/quick?term={name}" \
    ;

# SL2.40 assembly
bin/flatfile-to-json.pl --compress  \
    --out $OUT \
    --trackLabel assembly \
    --key 'Assembly' \
    --gff $IN/ITAG2.3_assembly.gff3 \
    --type supercontig,remark \
    --autocomplete all \
    --getSubfeatures \
    --className generic_parent \
    --subfeatureClasses '{"contig": "feature3"}' \
    --urltemplate "http://solgenomics.net/search/quick?term={name}" \
    ;

# SGN unigene alignments
bin/flatfile-to-json.pl --compress  \
    --out $OUT \
    --trackLabel sgn_unigenes \
    --key 'SGN unigenes' \
    --gff $IN/ITAG2.3_sgn_data.gff3 \
    --type match:ITAG_sgn_unigenes \
    --autocomplete all \
    --getSubfeatures \
    --className generic_parent \
    --subfeatureClasses '{"match_part": "match_part"}' \
    --arrowheadClass 'arrowhead' \
    --urltemplate "http://solgenomics.net/search/quick?term={name}" \
    ;

# microtom cDNA alignments
bin/flatfile-to-json.pl --compress  \
    --out $OUT \
    --trackLabel microtom_cdna \
    --key 'MicroTom full-length cDNAs' \
    --gff $IN/ITAG2.3_cdna_alignments.gff3 \
    --type match:ITAG_microtom_flcdnas \
    --autocomplete all \
    --getSubfeatures \
    --className generic_parent \
    --subfeatureClasses '{"match_part": "match_part"}' \
    --arrowheadClass 'arrowhead' \
    ;

# SGN marker sequences
bin/flatfile-to-json.pl --compress  \
    --out $OUT \
    --trackLabel sgn_markers \
    --key 'SGN markers' \
    --gff $IN/ITAG2.3_sgn_data.gff3 \
    --type match:ITAG_sgn_markers \
    --autocomplete all \
    --getSubfeatures \
    --className transcript \
    --subfeatureClasses '{"match_part": "match_part"}' \
    --arrowheadClass 'arrowhead' \
    --urltemplate "http://solgenomics.net/search/quick?term={name}" \
    ;

# index feature names
bin/generate-names.pl --out $OUT;

echo "To see the formatted ITAG2.3 tomato genome, point your browser at http://your.jbrowse.root/index.html?data=sample_data/json/tomato";