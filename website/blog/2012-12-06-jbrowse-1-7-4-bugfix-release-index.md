---
layout: post
title: JBrowse 1.7.4 bugfix release
date: 2012-12-06
tags: ['Software releases']
---

JBrowse 1.7.4 has been released, containing fixes for some more issues found in
the
[1.7.3 release](http://jbrowse.org/jbrowse-1-7-3-bugfix-release/ 'JBrowse 1.7.3 bugfix release')
and earlier. In particular, several bad bugs have been fixed in support for
Safari, Opera, and Internet Explorer.

Files for download:

- [JBrowse-1.7.4.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=33 'download JBrowse-1.7.4.zip') -
  2.9M
- [JBrowse-1.7.4-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=34 'download JBrowse-1.7.4-dev.zip') -
  28.6M Changes in this release:

- Fixed a bug preventing loading of JBrowse in some browsers. Thanks to Steffi
  Geisen for pointing this out.

- Fixed a bug in the BigWig data backend that prevented some BigWig files with
  large numbers of reference sequences from displaying. Thanks to Gregg Helt for
  providing sample data to help isolate this.

- Fixed a bug in the BigWig data backend that prevented BigWig files rendering
  in Safari. Thanks to Gregor Rot for his help in isolating this.

- Worked around a bug in Safari 6 (and probably earlier) in which HTTP
  byte-range requests are erroneously cached. Thanks to Gregor Rot for pointing
  out the Safari problems.

- Fixed some minor styling bugs in the facet menus of the faceted track
  selector.

- Fixed blurry edges of location trapezoid in Firefox (Eric Derohanian).
