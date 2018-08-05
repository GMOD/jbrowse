---
id: reference_sequence
title: Reference sequence configuration
---

# Reference Sequences

The reference sequences on which the browser will display annotations, and which provide a common coordinate system for all tracks. At a close enough zoom level, the sequence bases are visible in the "Reference Sequence" track.

The exact interpretation of "reference sequence" will depend on how you are using JBrowse. For a model organism genome database, each reference sequence would typically represent a chromosome or a [contig](http://en.wikipedia.org/wiki/Contig). Before any feature or image tracks can be displayed in JBrowse, the reference sequences must be defined using the prepare-refseqs.pl formatting tool.

## Reference Sequence Selector Configuration

JBrowse displays a dropdown selector for changing reference sequences.

For JBrowse versions 1.6.3 to 1.8.1, if more than 30 reference sequences are loaded, this selector is not shown by default. To force JBrowse to show the reference sequence dropdown selector, set `refSeqDropdown: true` in the configuration. This can be done in any configuration file, e.g. index.html, jbrowse_conf.json, or data/trackList.json.

In JBrowse version 1.9.0 and later, the reference sequence dropdown menu is always displayed. However, if there are too many reference sequences to practically display in the dropdown selector, the first portion of the sequence list is shown in the dropdown selector, along with a message stating that there are more reference sequences than can be shown. The maximum number of reference sequences in the selector is set by the `refSeqSelectorMaxSize` configuration variable, and defaults to 30.

### Reference Sequence Display Order

The ordering of reference sequences in the selector is configurable using the `refSeqOrder` configuration variable.

Supported values for refSeqOrder include

-   `name`
-   `name descending`
-   `length`
-   `length descending`
-   `false/null/0` to disable any sorting
-   `by_list` to manually specify a list of reference sequences in the selector

One instance in which refSeqOrder is particularly useful is in displaying annotations on early-stage, incomplete genomic assemblies: to display the N biggest contigs in the assembly in the reference sequence selector dropdown, one can set `refSeqOrder` to 'length descending', and set `refSeqSelectorMaxSize` to N.

### Explicitly Specifying a Reference Sequence List

If you set `refSeqOrder` to `by_list`, you can then set `refSeqOrderList` to set the exact order of the reference sequence list.

Example (in data/tracks.conf)

    [GENERAL]
    refSeqOrder = by_list
    refSeqOrderList =
      + ctgB
      + ctgA
      + ctgAprime
      + bethsCrazyBananasContig
      + ctgAZed

## prepare-refseqs.pl

This script is used to format sequence data for use by JBrowse, and must be run before adding other tracks. In addition to formatting the sequence data, this script creates a track called "DNA" that displays the reference sequence. The simplest way to use it is with the --fasta option, which uses a single sequence or set of reference sequences from a [FASTA](/Glossary#FASTA "wikilink") file:

`bin/prepare-refseqs.pl --fasta <fasta file> [options]`

