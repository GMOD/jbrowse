---
layout: post
title: JBrowse 1.8.1 bugfix release
date: 2013-02-12
tags: ['Software releases']
---

JBrowse 1.8.1 has been released, with several small fixes and additional
features, mostly related to displaying features on peptide sequences.

Files for download:

- [JBrowse-1.8.1.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=41 'download JBrowse-1.8.1.zip') -
  3.3M
- [JBrowse-1.8.1-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=42 'download JBrowse-1.8.1-dev.zip') -
  28.6M Changes in this release:

- Added support for `cigarAttribute` and `mdAttributes` configuration variables
  to Alignments and Alignments2 tracks, allowing users to change which feature
  attribute is used for showing mismatches (issue #200).
- Fixed some bugs preventing `Alignments` and `Alignments2` tracks from working
  with non-BAM data backends.
- Added `--trackLabel` and `--key` options to `prepare-refseqs.pl`, allowing
  users to specify the sequence track's label and title.
- Added `--seqType` option to `prepare-refseqs.pl`, allowing users to specify
  the type of sequences being formatted, usually either 'dna', 'rna', or
  'protein'. Additionally, if --seqType is something over than DNA (case
  insensitive), "showReverseStrand" is set to false on the reference sequence
  track.
- Added a `shareURL` configuration option that accepts a JS function to assemble
  the URL that users will get when clicking the "Share" button or the "Full
  view" link in embedded mode (issue #198).
- Fixed annoying bug in which popup feature detail boxes are initially scrolled
  all the way to the bottom.
