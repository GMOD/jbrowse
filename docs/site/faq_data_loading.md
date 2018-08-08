---
id: faq_data_loading
title: Data loading
---

# Data loading tips

## How can I only load a specific type of feature from my GFF file?

You can use the --type argument for flatfile-to-json.pl

E.g.

`flatfile-to-json.pl --type mRNA —gff mygff.gff`

This will only load mRNAs from the GFF. Additionally, if you want to
filter on the source column of the GFF, you can augment the --type
argument with an extra formatted parameter for source --type
mRNA:augustus

The --type argument can also be a commas separated list of filters like
this.

## What if I dont want to load the sequence data for the genome, but I want to display the features?

prepare-refseqs.pl accepts a --sizes parameter, which takes a
"chrom.sizes" file which is just a tab separated file with two columns,
refseq names and their lengths

This let's you view the genome and the features on the genome without
loading the sequence data.


## How do I convert GTF to GFF

Since flatfile-to-json.pl does not accept GTF, you can convert your GTF
to GFF3. Tools like gffread or gtf2gff3.pl are available

The gffread tool is packaged with cufflinks so simply install cufflinks,
then you can run

`gffread -E merged.gtf -o- > merged.gff3`


