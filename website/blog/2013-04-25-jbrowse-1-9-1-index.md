---
layout: post
title: JBrowse 1.9.1 maintenance release
date: 2013-04-25
tags: ['Software releases']
---

JBrowse 1.9.1 has been released, with performance improvements in both BAM and
VCF tracks, and lots of smaller fixes and improvements.

Files for download:

- [JBrowse-1.9.1.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=45 'download JBrowse-1.9.1.zip') -
  5.0M file SHA1 1dc089e42e626da5312a8091dbcd1972a1cfb0fd
- [JBrowse-1.9.1-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=46 'download JBrowse-1.9.1-dev.zip') -
  28.6M file SHA1 bc5bb43ad8b71a9190e8c2a400d7db2364882e09 Changes in this
  release:

- Significant speed and memory optimizations in BAM data backend (issue #242).
- Significant speed and memory optimizations in VCF data backend.
- JBrowse now attempts to smooth over mismatches in the naming of reference
  sequences between various datasets. For instance, if a BAM file contains
  reference sequences named like "chrom1", and the canonical reference sequences
  used in a JBrowse installation are named like "chr1", JBrowse will recognize
  these two names as equivalent for the purposes of displaying the BAM data.
  This behavior can be disabled by setting the global configuration variable
  `exactReferenceSequenceNames` to `true`. (issue #239).
- Removed support for track `blockDisplayTimeout` configuration variable. It
  never worked very well, and the problem it was meant to address (delays caused
  by large data) are better mitigated by `maxHeight` and the faster rendering
  offered by canvas-based track types.
- Fixed a bug that prevented displaying some VCF files. Thanks to Steffi Geisen
  for pointing this out.
- Reduced the default value of `maxHeight` for canvas-based feature tracks (like
  Alignments2) from 1000 to 600.
- Fixed a bug in the `Alignments` track type where BAM features with missing
  mate pairs that are not drawn due to their position above the track's
  `maxHeight` caused the track rendering to crash. Thanks to Tristan Lubinski
  for reporting this.
- If no global `refSeqOrder` is specified in the configuration, the reference
  sequences are now not sorted. Currently, this means that they will appear in
  the same order as loaded by `prepare-refseqs.pl`. Users with a very large
  number of (more than 10,000) reference sequences may wish to avoid specifying
  a `refSeqOrder`, since sorting the reference sequences is done at JBrowse
  startup time. Thanks to Tristan Lubinski for reporting this.
- Fixed bug preventing display of quantitative data from files loaded with
  flatfile-to-json.pl. Thanks to Gwendoline Andres for pointing this out.
- Instead of quantitative (wiggle) tracks throwing an error when they cannot
  choose a min and max for the display scale, they now just make a guess. While
  probably wrong, this at least has the track displaying something, and users
  can then look up how to fix the display scale.
- Added support for a `chunkSizeLimit` configuration variable for BAM and
  VCF-based tracks, which defaults to 5MB for BAM and 15MB for VCF. When
  fetching data, if a given region requires fetching a file chunk that is larger
  than this limit, a 'Too much data' message is displayed. This helps prevent
  speed and memory problems when displaying deep-coverage BAM tracks and large
  VCF tracks (issue #242). Thanks to Gustavo Cerquiera (GitHub user cerca11) for
  pushing for progress on this.
- Fixed a regression in which callbacks and interpolations were not evaluated in
  left-click and right-click menu configurations.
- Fixed incorrect display of negative values in log-scale wiggle tracks. Thanks
  to GitHub user drusch for pointing this out (issue #244).
- Fixed more minor errors when running under IE 7.
- Fixed "Max height reached" message sometimes being drawn under instead of over
  HTML-based features.
