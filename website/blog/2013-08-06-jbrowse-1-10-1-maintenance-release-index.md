---
layout: post
title: JBrowse 1.10.1 maintenance release
date: 2013-08-06
tags: ['Software releases']
---

JBrowse 1.10.1 has been released, with fixes for some minor issues and one major
issue.

Files for download:

- [JBrowse-1.10.1.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=63 'download JBrowse-1.10.1.zip') -
  5.2M file SHA1 3677d10ba4ffd6ba604871dc11b1989131baff9f
- [JBrowse-1.10.1-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=64 'download JBrowse-1.10.1-dev.zip') -
  26M file SHA1 f6a1a89d42498887ee0123ce2b98afea4478b6e0

Changes in this release:

- Added support in `maker2jbrowse` for user-defined source tags in GFF3 output
  from MAKER. Thanks to Carson Holt for contributing this fix.

- NCList data stores (actually the array representation used therein) now store
  feature attribute names case-insensitively.

- Fixed a bug in which features in canvas-based feature tracks could not be
  clicked in Firefox. Thanks to GitHub user mke21 for pointing this out, and to
  Daniel Kasenberg for fixing my fix to work with older versions of Chrome.

- Fixed a bug with client-side GFF3 parsing in which the strand of features was
  not being correctly parsed.

- Fixed bug preventing backward-compatibility with 1.2.1-formatted data. Thanks
  to Daniel Kasenberg for implementing this.

- Fixed a bug in the Gene glyph that caused the browser to crash if a gene
  feature has no subfeatures.
