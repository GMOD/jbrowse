---
layout: post
title: JBrowse 1.7.3 bugfix release
date: 2012-11-28
tags: ['Software releases']
---

JBrowse 1.7.3 has been released, containing fixes for some more issues found in
the
[1.7.2 release](http://jbrowse.org/jbrowse-1-7-2-bugfix-release/ 'JBrowse 1.7.2 bugfix release')
and earlier. Remote BAM access is rather difficult to get right, thanks very
much to the people who continue to step forward to report and help correct
problems with JBrowse displaying their BAM data.

Files for download:

- [JBrowse-1.7.3.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=31 'download JBrowse-1.7.3.zip') -
  2.9M
- [JBrowse-1.7.3-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=32 'download JBrowse-1.7.3-dev.zip') -
  28.6M Changes in this release:

- Fixed several more bugs in the BAM data backend that prevented display of some
  BAM files. Thanks to Gleb Kuznetzov for help in isolating these.
- Fixed bug in display of faceted track selector in which the facet titles were
  taking up too much vertical height. Thanks to Steffi Geisen for pointing this
  out.
- "Alignments" tracks now parse an alignment's CIGAR string if it does not have
  an MD field, and display mismatches and skipped sequence regions (particularly
  important for RNA-seq alignments). Thanks to Gregg Helt for providing the
  sample dataset used to test this.
- Added support for a `showReverseStrand` config variable to Sequence track
  that, if set to false, turns off display of the reverse sequence strand.
- "Alignments" tracks now show reads with missing mate pairs with a red
  crosshatched pattern instead of with a red border.
- Added an Apache .htaccess file to the JBrowse root directory that enabled CORS
  by default for all files under it, if AllowOverride is on.
- Fixed bug in which the vertical scroll position can sometimes be set too far
  down when zooming in and out.
- Fixed some bugs in server-side formatting code for feature tracks: data was
  recorded multiple times in JSON files in some circumstances. Thanks to
  Volodymyr Zavidovych and Steffi Geisen for pointing this out.
