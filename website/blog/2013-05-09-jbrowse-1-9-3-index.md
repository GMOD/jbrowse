---
layout: post
title: JBrowse 1.9.3 maintenance release
date: 2013-05-09
tags: ['Software releases']
---

JBrowse 1.9.3 has been released, with fixes for a number of smaller issues
present in the 1.9.2 release.

Files for download:

- [JBrowse-1.9.3.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=49 'download JBrowse-1.9.3.zip') -
  5.0M file SHA1 b7a0d23430b1c6d0504322136bcc2f5b0329bc9d
- [JBrowse-1.9.3-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=50 'download JBrowse-1.9.3-dev.zip') -
  28.6M file SHA1 a928cbb654e2cfefb87535c05f281965d5f3f5d4

Changes in this release:

- Fixed a bug in VCF backend that prevented display of VCF features containing
  lines in which the ALT column was '.' or not provided. Thanks to Ignazio
  Carbone for pointing this out.

- Fixed a display bug in faceted track selector in which selected facets that
  have no available matches were squashed to the left side.

- Fixed issue with HTMLVariants track type not being available for selection
  from the File->Open dialog.
