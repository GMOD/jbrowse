---
layout: post
title: JBrowse 1.4.1 released
date: 2012-07-10
tags: ['Software releases']
---

JBrowse 1.4.1 has been released, containing some small fixes for issues in the
[1.4.0 release](http://jbrowse.org/jbrowse-1-4-0-released-includes-faceted-track-selection/ 'JBrowse 1.4.0 released, includes faceted track selection!').

- [JBrowse-1.4.1-min.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=4 'download JBrowse-1.4.1-min.zip') -
  2.6M
- [JBrowse-1.4.1-full.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=3 'download JBrowse-1.4.1-full.zip') -
  5.5M Changes in this release:

- Made displayColumns option for the faceted track selector case-insensitive,
  and interpret a column name of "Name" as meaning the track's key.
- `bam-to-json.pl` now filters out alignments that are not at least two
  nucleotides in length. Thanks to Tristan Lubinski for assistance.
- Introduced limits on the sizes of cookies that can be set, preventing '400 bad
  request' errors (issue #113).
