---
layout: post
title: JBrowse 1.6.1 bugfix release
date: 2012-08-28
tags: ['Software releases']
---

JBrowse 1.6.1 has been released, containing fixes for some small issues in the
[1.6.0 release](http://jbrowse.org/jbrowse-1-6-0-released-includes-feature-descriptions-and-more/ 'JBrowse 1.6.0 released, includes feature descriptions and more!').

Files for download:

- [JBrowse-1.6.1-min.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=16 'download JBrowse-1.6.1-min.zip') -
  2.8M
- [JBrowse-1.6.1-full.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=15 'download JBrowse-1.6.1-full.zip') -
  27.3M Changes in this release:

- JBrowse now attempts to prevent feature labels being obscured by track labels
  by keeping the feature labels a bit further away from the left side of the
  view, if possible.
- Fixed bug in which welcome page was not shown when JBrowse has not been
  configured yet (issue #130).
- Fixed bug in which passing `tracklist=0` (as when running the browser in
  embedded mode) caused JBrowse to crash (issue #132).
- Added dependency on Bio::GFF3::LowLevel::Parser 1.4, which has an important
  bugfix related to multi-location features (issue #109).
