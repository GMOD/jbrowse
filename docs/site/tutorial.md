---
id: tutorial
title: Indexed file formats tutorial
---

In this tutorial, we will use "indexed file formats", which exemplifies using
plain text configuration

# Loading Indexed FASTA

To begin, we'll pretend as though we are setting up the genome of _Volvox
mythicus_, a mythical species in the genus
[Volvox](https://en.wikipedia.org/wiki/Volvox). The Volvox genome was sequenced
by your sequencing core in 2018 and they'd like to setup JBrowse now. They give
us a link to their FASTA file that we'll download

{@inject: fasta_download_snip}

We are going to use samtools to create a "FASTA index" using their faidx
command. FASTA indexing allows even very large FASTA files to be downloaded into
JBrowse "on demand" e.g. only downloading the sequence required for a certain
view.

    samtools faidx data/volvox.fa

The FASTA index will be a file called volvox.fa.fai. Then we'll move these files
into a "data directory" that JBrowse can use

Then create the file data/tracks.conf with this file content

    [GENERAL]
    refSeqs=volvox.fa.fai
    [tracks.refseq]
    urlTemplate=volvox.fa
    storeClass=JBrowse/Store/SeqFeature/IndexedFasta
    type=Sequence

Now your directory structure is something like

    /var/www/jbrowse
    /var/www/jbrowse/data
    /var/www/jbrowse/data/tracks.conf
    /var/www/jbrowse/data/volvox.fa
    /var/www/jbrowse/data/volvox.fa.fai

At this point, you should be able to open up http://localhost/jbrowse/?data=data
(or just simply http://localhost/jbrowse/) and you will see your genome with the
reference sequence track. If you have any problems at this stage, send an email
to gmod-ajax@lists.sourceforge.net with details about your setup for
troubleshooting, or file a GitHub issue.

## Loading Tabix GFF3

We will use the newly generated "gene annotation" file that was generated for
Volvox mythicus

{@inject: gff3_download_snip}

When we are processing GFF3 for usage in JBrowse, we can aim to use GFF3Tabix
format. Tabix allows random access to genomic regions similar to Indexed FASTA.
We must first sort the GFF to prepare it for tabx

You can do two different ways for this, simple GNU sort, or genome tools sort

With genometools, it has added validation checking mechanisms that are helpful

    gt gff3 -sortlines -tidy data/volvox.gff3 > data/volvox.sorted.gff3

With normal GNU sort you can try something like this

    (grep ^"#" data/volvox.gff3; grep -v ^"#" data/volvox.gff3 | grep -v "^$" | grep "\t" | sort -k1,1 -k4,4n) > data/volvox.sorted.gff3

If you are running on a custom dataset instead of this volvox one, then you
should be confident that your GFF is properly formatted to use the GNU sort,
otherwise try `brew install genometools` and use the genometools sort

After you have a sorted GFF3, we run bgzip and tabix

    bgzip data/volvox.sorted.gff3
    tabix -p gff data/volvox.sorted.gff3.gz

Then we can create a gene track in data/tracks.conf

    [tracks.genes]
    urlTemplate=volvox.sorted.gff3.gz
    storeClass=JBrowse/Store/SeqFeature/GFF3Tabix
    type=CanvasFeatures

Note that urlTemplate is resolved relative to the folder that the tracks.conf
file is in, so we don't write data/volvox.sorted.gff3.gz, just
volvox.sorted.gff3.gz

## Loading BAM

If you have been given sequenced alignments, you can also create a Alignments
track that displays the alignments

For volvox, we are given a file

{@inject: bam_download_snip}

Note that this BAM file is already sorted. If your BAM is not sorted, it must be
sorted to use in JBrowse. Next index this file

    samtools index data/volvox-sorted.bam

Finally add this content into data/tracks.conf

    [tracks.alignments]
    urlTemplate=volvox-sorted.bam
    storeClass=JBrowse/Store/SeqFeature/BAM
    type=Alignments2

Note that as of JBrowse 1.15.0, CRAM format is also supported, simply switch
.bam and .bam.bai with .cram and .cram.crai and use
JBrowse/Store/SeqFeature/CRAM

## Check that your files are "loaded"

At this point, if the jbrowse files are in your webserver, you should have a
directory layout such as

    /var/www/html/jbrowse
    /var/www/html/jbrowse/data
    /var/www/html/jbrowse/data/volvox.fa
    /var/www/html/jbrowse/data/volvox.fa.fai
    /var/www/html/jbrowse/data/volvox.sorted.gff3.gz
    /var/www/html/jbrowse/data/volvox.sorted.gff3.gz.tbi
    /var/www/html/jbrowse/data/volvox-sorted.bam
    /var/www/html/jbrowse/data/volvox-sorted.bam.bai
    /var/www/html/jbrowse/data/tracks.conf

Then your tracks.conf file should say

    [GENERAL]
    refSeqs=volvox.fa.fai

    [tracks.refseq]
    urlTemplate=volvox.fa
    storeClass=JBrowse/Store/SeqFeature/IndexedFasta
    type=Sequence

    [tracks.genes]
    urlTemplate=volvox.sorted.gff3.gz
    storeClass=JBrowse/Store/SeqFeature/GFF3Tabix
    type=CanvasFeatures

    [tracks.alignments]
    urlTemplate=volvox-sorted.bam
    storeClass=JBrowse/Store/SeqFeature/BAM
    type=Alignments2

Then you can visit http://localhost/jbrowse/ and the "data" directory will
automatically be loaded.

## Final step

Note that this tutorial largely does not require the use of the perl programs
like prepare-refseqs.pl and flatfile-to-json.pl used in
https://jbrowse.org/docs/tutorial_classic.html, however, if you want to search
names from the GFF using the search box you will need to run one perl program

    bin/generate-names.pl

## Congratulations

You have now setup JBrowse!

If you have troubles, send an email to gmod-ajax@lists.sourceforge.net or create
a GitHub issue (note that GitHub issues tend to be for pure concerns about
JBrowse having bugs, so email list is preferre).

## Footnotes

a) If the folder was not called data, e.g. you had your files in
/var/www/html/jbrowse/otherdata, then you can visit
http://localhost/jbrowse/?data=otherdata (this automatically lends a way to have
"multiple data directories" since you could navigate to different ?data= URL
paths this way. the "dataset selector" configuration contains more details)

b) The "configuration format" is called .conf, but JSON format is also allowed.
See [configuration file formats](configuration_file_formats.html) guide for
details.

c) If you are doing source code updates or using plugins, you must use a git
clone or the "source code" release from GitHub pages. Also the "-dev" release
from older versions is supplanted by using a git clone or "source code" release
