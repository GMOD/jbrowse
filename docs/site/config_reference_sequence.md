---
id: reference_sequence
title: Reference sequence configuration
---

The reference sequence track displays the genome sequence

**For information on creating the reference sequence track, view
[prepare-refseqs.pl](prepare_refseqs.md) in the config or the
[indexed file tutorial](tutorial.md)**

# Reference Sequences

The reference sequences on which the browser will display annotations, and which
provide a common coordinate system for all tracks. At a close enough zoom level,
the sequence bases are visible in the "Reference Sequence" track.

The exact interpretation of "reference sequence" will depend on how you are
using JBrowse. For a model organism genome database, each reference sequence
would typically represent a chromosome or a
[contig](http://en.wikipedia.org/wiki/Contig). Before any feature or image
tracks can be displayed in JBrowse, the reference sequences must be defined
using the prepare-refseqs.pl formatting tool.

## Reference Sequence Selector Configuration

JBrowse displays a dropdown selector for changing reference sequences.

For JBrowse versions 1.6.3 to 1.8.1, if more than 30 reference sequences are
loaded, this selector is not shown by default. To force JBrowse to show the
reference sequence dropdown selector, set `refSeqDropdown: true` in the
configuration. This can be done in any configuration file, e.g. index.html,
jbrowse_conf.json, or data/trackList.json.

In JBrowse version 1.9.0 and later, the reference sequence dropdown menu is
always displayed. However, if there are too many reference sequences to
practically display in the dropdown selector, the first portion of the sequence
list is shown in the dropdown selector, along with a message stating that there
are more reference sequences than can be shown. The maximum number of reference
sequences in the selector is set by the `refSeqSelectorMaxSize` configuration
variable, and defaults to 30.

### Reference Sequence Display Order

The ordering of reference sequences in the selector is configurable using the
`refSeqOrder` configuration variable.

Supported values for refSeqOrder include

- `name`
- `name descending`
- `length`
- `length descending`
- `false/null/0` to disable any sorting
- `by_list` to manually specify a list of reference sequences in the selector

One instance in which refSeqOrder is particularly useful is in displaying
annotations on early-stage, incomplete genomic assemblies: to display the N
biggest contigs in the assembly in the reference sequence selector dropdown, one
can set `refSeqOrder` to 'length descending', and set `refSeqSelectorMaxSize` to
N.

### Explicitly Specifying a Reference Sequence List

If you set `refSeqOrder` to `by_list`, you can then set `refSeqOrderList` to set
the exact order of the reference sequence list.

Example (in data/tracks.conf)

    [GENERAL]
    refSeqOrder = by_list
    refSeqOrderList =
      + ctgB
      + ctgA
      + ctgAprime
      + bethsCrazyBananasContig
      + ctgAZed

## Codon table

The Sequence track added support for using a specified codon table or partial
codon table, with start or stop codons highlighted

| Option        | Value                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codonTable`  | Specify a codon table or partial codon table. See <http://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi>. Example "codonTable": { "AAA": "N" }. Available since 1.11.6 |
| `codonStarts` | Specify a set of start codons. See <http://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi>. Example "codonStarts": [ "AAA" ]. Available since 1.12.0                    |
| `codonStops`  | Specify a set of stop codons. See <http://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi>. Example "codonStops": [ "AAA" ]. Available since 1.12.0                      |

Note that the colors of nucleotide bases rendered is controlled via CSS, so you
can add custom CSS to a plugin or edit the jbrowse CSS to override it. The
classes are

`base_n,base_a,base_g,base_t,base_c`

The amino acid track highlights can also be controlled via CSS. They can be
either the letter "aminoAcid_m" for example or the "aminoAcid_start",
"aminoAcid_stop" classes

```
.translatedSequence td.aminoAcid_start
.translatedSequence td.aminoAcid_m
.translatedSequence td.aminoAcid_k
```

## Other options

| Option             | Value                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useAsRefSeqStore` | Make a given track specifically identified as a refseq store, and JBrowse will then use the store class specified on your track to retrieve the data for the FASTA in "View details" popups, etc. |
