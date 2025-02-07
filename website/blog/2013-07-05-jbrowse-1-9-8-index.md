---
layout: post
title: JBrowse 1.9.8 maintenance release
date: 2013-07-05
tags: ['Software releases']
---

JBrowse 1.9.8 has been released, with fixes for some minor issues, a performance
improvement when many HTML-based tracks are open, and a new `yScalePosition`
configuration option for all tracks can can be set to "left", "right", or
"center" to change where the y-axis scale is displayed.

Files for download:

- [JBrowse-1.9.8.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=59 'download JBrowse-1.9.8.zip') -
  5.1M file SHA1 ad7814dae6acfdc1393942dfcce5097c2db93cec
- [JBrowse-1.9.8-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=60 'download JBrowse-1.9.8-dev.zip') -
  26M file SHA1 6e022fc7e8222e0a479044936334b4228f7cf25f Changes in this
  release:

- Removed "XX has no data for this chromosome" popup warning message. It was
  just annoying and not very useful.
- Added an optional "yScalePosition" element to track configs that allows
  configs with Y axes to have those axes positioned on the left or right side of
  the view, as well as in the center. Thanks to Alexis Grimaldi for making this
  change.
- Fixed a bug in which NCList-based tracks display with an error for reference
  sequences on which they have no data. Thanks to Michael Axtell for pointing
  this out.
- Improved GFF3 handling in the File->Open tool, fixed a bug in the GFF3 parser
  in which an empty (.) source column caused the GFF3 parser to crash.
- Improved scrolling speed when many HTML feature tracks are active.
- Fixed a bug in which the browser can fail to start for a reference sequence
  that has never been seen before.
- Fixed a confusing behavior in JBrowse/Store/SeqFeature/REST in which the URLs
  it constructs to fetch from did not always have a '/' where one would expect.
  Thanks to Alex Kalderimis for pointing this out.
