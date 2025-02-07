---
layout: post
title: JBrowse 1.9.2 maintenance release
date: 2013-05-02
tags: ['Software releases']
---

JBrowse 1.9.2 has been released, with fixes for a number of smaller issues
present in the 1.9.1 release.

Files for download:

- [JBrowse-1.9.2.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=47 'download JBrowse-1.9.2.zip') -
  5.0M file SHA1 ad3f510021eebbc8e0e5f6e4cfb6f2def1a63400
- [JBrowse-1.9.2-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=48 'download JBrowse-1.9.2-dev.zip') -
  28.6M file SHA1 91eec960ffb89a9496fe670b7512b3ccb1ece587 Changes in this
  release:

- Fixed bug in which JBrowse could not properly display all data in BAM files
  with reference sequence name sections bigger than 64KB. Thanks to GitHub user
  lfgu for pointing this out (issue #245).
- Made REST feature store backend less sensitive more tolerant of
  stringification of `start`, `end`, `strand`, and `score` in feature JSON.
  Thanks to Matt Bomhoff for pointing this out.
- Fixed bug in which URLs for plugin resources were not assembled relative to
  the `browserRoot` config variable. Thanks to Matt Bomhoff for pointing this
  out.
- Fixed bug in which missing fields in a VCF variant's genotype prevented
  display of a variant's details. Thanks to Jillian Rowe for pointing this out.
- Fixed some minor issues related to the handling of empty BigWig files. Thanks
  to Nathan Boley for pointing this out (issue #252).
- The `trackSelector.type` global config variable can now contain
  fully-qualified class names, so plugins can contain their own tracklist
  classes. Thanks to Matt Bomhoff for pointing this out.
- Moved the "Select tracks" tab used to open the faceted track selector
  downward, so that it does not block access to the left side of the reference
  sequence overview.
