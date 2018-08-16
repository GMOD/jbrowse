---
id: faq_other
title: Other
---
# Other

## Can I get started with JBrowse without all the fuss of setup.sh and what-not

Yes\! Try the jbrowse desktop versions, built with electron\!

The Windows and OSX versions are easy to use, and all you need is to
open your fasta file (ideally: indexed fasta).

You can also open BAM tracks, BigWig, VCF.gz, GFF3, BED, BigBed, and
more\!

## Can I install the perl packages using cpanm?

Yes\! The packages are not hosted on cpan, but you can install them from
github using cpanm

`cpanm git://github.com/GMOD/jbrowse.git`

This will install jbrowse scripts such as prepare-refseqs.pl and
flatfile-to-json.pl to, commonly, a folder like ~/perl5/bin if you are
using local::lib, or simply a system folder like /usr/local/bin if using
sudo.

There are a couple scripts that don't work with this such as
maker2jbrowse, but it is otherwise fine to install the perl scripts this
way.

Note: you might also use --notest option to avoid testing all
dependencies

## Why does my trackList.json contain "className" (even on CanvasFeatures?)

className refers to a CSS class for your features.

If you are using CanvasFeatures, this is an unused artifact.

If you are using HTMLFeatures, then you can add custom CSS to make your
feature have a custom class. Note that the "subfeatureClasses" is a
related variable: it is a CSS class for subfeatures.

By default, it would just use the "exon" class for exons or whatnot, but
subfeatureClasses allows you to create a map e.g.

`"subfeatureClasses": {"exon": "myCustomExonCSSClass"}`

## How do I create a Tabix indexed GFF

The most reliable way to do this is to use gff3sort from
<https://github.com/billzt/gff3sort>

See <http://biorxiv.org/content/early/2017/06/04/145938> for a
description of their algorithm

Note that you can try and use GNU sort (sort -k1,1 -k4,4n) or
genometools (gt gff3 -sortlines) but these both have problems where it
will place child features behind the parent features in the GFF

In JBrowse 1.14, the problem of child features being behind their
parents was fixed so the full GFF3Sort algorithm from @billzt is now not
necessary and a simple GNU sort does work.

## How do I create a Indexed FASTA?

JBrowse 1.12+ allow opening FASTA files directly in the browser or via
JBrowse Desktop. Indexed FASTA is however much more efficient as it does
not require being read into memory.

To create an Indexed FASTA, install samtools and run

`samtools faidx yourfile.fa`

This will create a file called yourfile.fa.fai. When you want to open up
your own sequence file in JBrowse, you can then use the "Open sequence
file" option, and drag and drop both the .fa and the .fai in the file
area. JBrowse will understand that these are to be used together, and
will open it.

Note: you can also open unindexed FASTA, but it requires parsing the
whole FASTA up front, so this is slow and memory intensive with the
current setup. Indexed FASTA is quite efficient though.

