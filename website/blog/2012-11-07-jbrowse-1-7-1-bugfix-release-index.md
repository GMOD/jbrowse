---
layout: post
title: JBrowse 1.7.1 bugfix release
date: 2012-11-07
tags: ['Software releases']
---

JBrowse 1.7.1 has been released, containing fixes for some issues in the
[1.7.0 release](http://jbrowse.org/jbrowse-1-7-0/ 'JBrowse 1.7.0, now with data export, direct BAM display, and much more').

Files for download:

- [JBrowse-1.7.1.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=27 'download JBrowse-1.7.1.zip') -
  2.9M
- [JBrowse-1.7.1-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=28 'download JBrowse-1.7.1-dev.zip') -
  28.3M Changes in this release:

- Fixed bug in which bars below the origin of `Wiggle/XYPlot` were drawn
  incorrectly (issue #161). Thanks to GitHub user @makela for pointing this out.
- `Wiggle/XYPlot` tracks now by default draw a horizontal line at the origin,
  and support a `style.origin_color` configuration variable to set its color or
  turn it off.
- Fixed bug in BAM backend that caused an infinite loop and/or browser crash
  with some BAM files. Thanks to Gleb Kuznetzov for pointing this out.
