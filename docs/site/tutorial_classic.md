---
id: tutorial_classic
title: Classic quick-start guide
---

## Reference Sequences

Before loading annotation data, format your reference sequences for JBrowse
using bin/prepare-refseqs.pl.

For FASTA format sequence files

    bin/prepare-refseqs.pl --fasta docs/tutorial/data_files/volvox.fa

For sequences already stored in a Bio::DB::\* database, you can use
prepare-refseqs.pl with a biodb-to-json.pl config, see [here](biodb_to_json.md)
for details.

    bin/prepare-refseqs.pl --conf docs/tutorial/conf_files/volvox.json

## Genomic annotations and features

JBrowse can import feature data from flat files, or from databases that have
Bio::DB::\* Perl interfaces.

### bin/flatfile-to-json.pl

If you have flat files like GFF3 or BED, it is usually best to use
`bin/flatfile-to-json.pl` to import them. `bin/flatfile-to-json.pl` accepts many
different command-line settings that can be used to customize the appearance of
the new track. Run `bin/flatfile-to-json.pl` --help to see a description of the
available settings.

    bin/flatfile-to-json.pl --gff path/to/my.gff3 --trackType CanvasFeatures --trackLabel mygff

### bin/biodb-to-json.pl

If you have a genomic annotation database such as Chado,
Bio::DB::SeqFeature::Store, or Bio::DB::GFF, then you can use JBrowse's
`biodb-to-json.pl`. You use `bin/biodb-to-json.pl` with a configuration file
(the format of which is documented here).

    bin/biodb-to-json.pl --conf docs/tutorial/conf_files/volvox.json

### Next-gen reads (BAM)

JBrowse can display alignments directly from BAM files, with no pre-processing
necessary. To use, download the BAM file and BAM index into your data folder and
you can manually edit text snippets into tracks.conf

    [tracks.alignments]
    storeClass = JBrowse/Store/SeqFeature/BAM
    urlTemplate = myfile.bam
    category = NGS
    type = JBrowse/View/Track/Alignments2
    key = BAM alignments from SEQ1654

Then, you will have a data structure that looks like

    data/myfile.bam
    data/myfile.bam.bai
    data/tracks.conf

Where tracks.conf contains this above config, and then myfile.bam will be
located relative to the location of tracks.conf so since they are in the same
directory, it does not need any additional path qualifications. Note that
urlTemplate can be a full URL path

Also note: BAM files are required to be sorted and indexed (i.e. have a
corresponding .bai file or .csi file. If it is .csi, then the csiUrlTemplate can
be used. If it is .bai, then it will automatically be located as
<yourbamfile.bam> with .bai added on the end).

#### Next-gen read track types

JBrowse has two main track types that are designed especially for use with BAM
data:

##### Alignments2

Shows individual alignments from the BAM file, as well as insertions, deletions,
skipped regions, and SNPs encoded in the BAM's MD or CIGAR fields.

##### SNPCoverage

Shows a coverage histogram plot, with colored bars showing the locations of
base-level mismatches and possible SNPs in the reads. To use them, set type =
Alignments2 or type = SNPCoverage in the track configuration.

## Index Names

After loading feature data, to let users find features by typing feature names
or IDs in the autocompleting search box, a special index of feature names must
be generated using `bin/generate-names.pl`.

    bin/generate-names.pl -v

Note: You need to re-run bin/generate-names.pl to add new feature names to the
index every time you add new annotations to JBrowse using any of the
\*-to-json.pl scripts.

Also note: the track types that are indexed by bin/generate-names.pl include

- GFF, GBK, BED loaded via flatfile-to-json.pl. By default "ID", "Name", and
  "Alias" are indexed. Note that --nameAttributes can be used to index
  additional fields
- Features from biodb-to-json.pl
- VCF tabix files and GFF3 tabix files (their "ID" and "Name" field from GFF are
  indexed and only ID from VCF are indexed)

BAM reads and BigWigs are not indexed by generate-names.pl

## Quantitative tracks (BigWig and Wiggle)

JBrowse can display alignments directly from BigWig files, with no
pre-processing necessary. Simply add a stanza with the relative URL of the file
to your data/tracks.conf file, of the form:

    [ tracks.my-bigwig-track ]
    storeClass = JBrowse/Store/SeqFeature/BigWig
    urlTemplate = myfile.bw
    type = JBrowse/View/Track/Wiggle/XYPlot
    key = Coverage plot of NGS alignments from XYZ

JBrowse has two track types that are designed especially for use with
quantitative data:

### JBrowse/View/Track/Wiggle/XYPlot

Shows quantitative data as a bar graph. See the JBrowse wiki for configuration
options.

### JBrowse/View/Track/Wiggle/Density

Shows quantitative data as a "heatmap" plot, which by default draws regions with
positive scores as progressively more intense blue, and negative scores as
progressively more intense red. See the JBrowse wiki for configuration options,
including how to change the color-change point (bicolor_pivot), and the colors.

To use them, set type = JBrowse/View/Track/Wiggle/XYPlot or type =
JBrowse/View/Track/Wiggle/Density in the track configuration.

## Troubleshooting

Sometimes things just don't go well. It seems like nothing is ever as easy as it
should be. Here are several resources you can use if it turns out that this
guide is not enough to get JBrowse working for you.

- [JBrowse FAQ](faq.html#troubleshooting) - The FAQ contains extended
  documentation on many aspects JBrowse, including troubleshooting tips.
- Mailing list gmod-ajax@lists.sourceforge.net - send an email to this mailing
  address and/or subscribe. If it is related to just getting started with
  jbrowse, please attach the setup.log file that is generated by setup.sh
- GitHub at GMOD/jbrowse - This is preferably for actual JBrowse issues and
  feature requests but some help issues can be addressed here too :)
- Gitter channel at https://gitter.im/GMOD/jbrowse

## Conclusion

Good luck and enjoy JBrowse!
