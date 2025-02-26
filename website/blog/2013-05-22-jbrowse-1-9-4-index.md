---
layout: post
title: JBrowse 1.9.4 maintenance release
date: 2013-05-22
tags: ['Software releases']
---

JBrowse 1.9.4 has been released, with fixes for a number of smaller issues
present in the 1.9.3 release.

Files for download:

- [JBrowse-1.9.4.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=51 'download JBrowse-1.9.4.zip') -
  5.0M file SHA1 35d5b1a7b0d6ac5eec90d3d786ea62158cceca67
- [JBrowse-1.9.4-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=52 'download JBrowse-1.9.4-dev.zip') -
  26M file SHA1 56a6ab1585794987017b70069aa4ff32b2ed28ca Changes in this
  release:

- Fixed a bug with configuration handling that preventing disabling right-click
  feature menus, and probably had other undesirable effects. Thanks to Daniel
  Troesser for pointing this out (issue #260).
- Fixed a bug in which facet renaming specified in the
  `trackSelector.renameFacets` configuration variable was not properly applied
  to facet titles in the accordion widget on the left side of the faceted track
  selector (issue #251). Thanks to Jason Gao for pointing this out.
- Fixed a bug with GFF3 and Sequin Table export of GFF3 alternate_allele
  attributes. Thanks to Jillian Rowe for pointing this out (issue #256).
- Fixed some hard-coded image paths that were not respecting the setting of the
  `browserRoot` configuration variable. Thanks to Harry Yoo for pointing this
  out (issue #258).
- Fixed a bug in which running `biodb-to-json.pl` with no arguments caused it to
  crash instead of producing help output. Thanks to GitHub user sreyesch for
  pointing this out (issue #257).
- Fixed a bug in which some browsers report that
  src/dijit/\_editor/nls/commands.js is missing. Thanks to Steffi Geisen for
  pointing this out.
