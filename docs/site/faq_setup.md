---
id: faq_setup
title: Setup
---

## How do I get started with installing JBrowse?

Check out the quick start guide [indexed file formats](tutorial.md) or the [classic quick start guide](tutorial_classic.md)


## How do I load my genome as a FASTA file?

If you have JBrowse installed to your web folder and have run setup.sh,
then you can download a FASTA file for your genome and run

`bin/prepare-refseqs.pl --fasta yourfile.fasta`

If you want to use it as a Indexed FASTA instead, please see the [indexed file formats](tutorial.md) tutorial.

## How do I setup a GFF track?

The most common feature track to use is a GFF file

Using flatfile-to-json.pl is the easiest and most optimal way to load a
GFF file for jbrowse

You can run

`bin/flatfile-to-json.pl --gff myfile.gff --trackLabel trackLabel --trackType CanvasFeatures`

Alternatively, you can use GNU sort and Tabix to create a GFF3Tabix track

sort -k1,1 -k4,4n myfile.gff > myfile.sorted.gff
bgzip myfile.sorted.gff
tabix -p gff myfile.sorted.gff.gz

See [indexed file formats](tutorial.md) tutorial for more details.


Note: the CanvasFeatures track type is recommended even though it is not currently the default as it is more flexible and easy to configure

## How do I set up a BAM file?

You will want to

- Put the BAM and BAI (or CSI) index in the JBrowse data directory
- Add a section to your tracks.conf

    [tracks.mytrack]
    storeClass=JBrowse/Store/SeqFeature/BAM
    urlTemplate=myfile.bam
    type=Alignments2
    key=My BAM experiment


If this does not work feel free to ask gmod-ajax@lists.sourceforge.net

Other notes

  - Don't use bam-to-json.pl, it is old and you do not need to convert BAM to JSON
  - Your BAI should be the same as the BAM with .bai on the end, otherwise use the baiUrlTemplate paramter to point to it's location

## How do I set up a BigWig file?

When you set up a BigWig file in jbrowse, the best way to do it is as
follows

-  Put the BigWig file in your data directory
- Add a section to your tracks.conf

    [tracks.mybigwig]
    urlTemplate=file.bw
    type=JBrowse/View/Track/Wiggle/XYPlot
    storeClass=JBrowse/Store/SeqFeature/BigWig
    key=My BigWig experiment


## How do I set up a VCF file?

First bgzip and tabix your vcf file

    bgzip myfile.vcf
    tabix -p vcf myfile.vcf.gz

If your VCF isn't sorted for any reason and these steps give you an error, just use the GNU sort utility
to sort it by chromosome and coordinate or get vcf-sort from vcftools

GNU sort command from https://www.biostars.org/p/133487/

    grep '^#' in.vcf > out.vcf && grep -v '^#' in.vcf | LC_ALL=C sort -t $'\t' -k1,1 -k2,2n >> out.vcf

Now that your VCF is indexed, follow these steps

-  Put the myfile.vcf.gz and myfile.vcf.gz.tbi in your data directory
-  Edit data/trackList.json
-  Put the following in there:


    [tracks.myvcf]
    urlTemplate=myfile.vcf.gz
    storeClass=JBrowse/Store/SeqFeature/VCFTabix
    type=CanvasVariants

## How do I get IndexedFasta track to work in JBrowse

You can manually edit the config to use IndexedFasta as a reference sequence like this

    [tracks.refseqs]
    key= Reference sequence
    storeClass=JBrowse/Store/SeqFeature/IndexedFasta
    urlTemplate=SOAPdenovo-genome.fa
    useAsRefSeqStore=true
    type=Sequence
    [GENERAL]
    refSeqs=SOAPdenovo-genome.fa.fai

The equivalent thing can also be in trackList.json as

    {
       "tracks" : [
          {
             "label" : "refseqs",
             "key": "Reference sequence",
             "storeClass" : "JBrowse/Store/SeqFeature/IndexedFasta",
             "urlTemplate" : "SOAPdenovo-genome.fa",
             "useAsRefSeqStore" : true,
             "type" : "Sequence"
          }
       ],
       "refSeqs" : "SOAPdenovo-genome.fa.fai"
    }

Note that prepare-refseqs.pl also can use --indexed_fasta as an argument, but is not required for indexed FASTA


You can see from this that a couple things are needed

  - useAsRefSeqStore set to true
  - making label: refseqs is important when the storeClass is not the
    normal SequenceChunks class
  - the refSeqs attribute refers to the FASTA index file (normally it
    points to the refSeqs.json file)

With this setup, you do not need to have run prepare-refseqs.pl on a
FASTA file. Instead you can simply use the "samtools faidx" program to
index your fasta file in a data directory, and set trackList.json up in
this format.


