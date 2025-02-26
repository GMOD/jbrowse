---
id: perl_config
title: Sample configuration bash script
---

A common way of preparing data for usage in JBrowse is running the perl
pre-processing scripts. These are not CGI perl scripts, they simple transform
some feature data into JSON format for JBrowse to statically consume.

Here is an example script that prepares an instance of tomato genomic data

```
#!/usr/bin/env bash

## example script that fetches and formats large data from the tomato
## genome (similar in size to Human) using flatfile-to-json

IN='sample_data/raw/tomato';
OUT='sample_data/json/tomato';

# uncomment the line below to compress all the datasets on disk
# (requires a little bit of web server configuration for the files to
# be served correctly)
#COMPRESS='--compress'

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

set -x;

# format the reference sequences
bin/prepare-refseqs.pl $COMPRESS --fasta $IN/ITAG2.3_genomic.fasta --out $OUT;

# official ITAG2.3 gene models
bin/flatfile-to-json.pl $COMPRESS \
    --out $OUT \
    --gff $IN/ITAG2.3_gene_models.gff3 \
    --type mRNA \
    --autocomplete all \
    --trackLabel genes  \
    --key 'Gene models' \
    --getSubfeatures    \
    --className transcript \
    --subfeatureClasses '{"CDS": "transcript-CDS", "exon": "hidden"}' \
    --arrowheadClass arrowhead \
    --urltemplate "http://solgenomics.net/search/quick?term={name}" \
    ;

# SL2.40 assembly
bin/flatfile-to-json.pl $COMPRESS  \
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
bin/flatfile-to-json.pl $COMPRESS  \
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
bin/flatfile-to-json.pl $COMPRESS  \
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
bin/flatfile-to-json.pl $COMPRESS  \
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
```
