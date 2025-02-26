---
layout: post
title: JBrowse 1.7.5 bugfix release
date: 2012-12-12
tags: ['Software releases']
---

JBrowse 1.7.5 has been released, containing fixes for some more issues found in
the
[1.7.4 release](http://jbrowse.org/jbrowse-1-7-4-bugfix-release/ 'JBrowse 1.7.4 bugfix release')
and earlier releases in the 1.7.x series.

Files for download:

- [JBrowse-1.7.5.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=35 'download JBrowse-1.7.5.zip') -
  2.9M
- [JBrowse-1.7.5-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=36 'download JBrowse-1.7.5-dev.zip') -
  28.6M Changes in this release:

- Fixed a bug in which typing a key that is bound to a global keyboard shortcut
  (currently only 't' or '?') in the location box would erroneously execute the
  action for that global shortcut. Thanks to Gregor Rot for pointing this out.

- Fixed a bug in which toggling 'Show labels' in the track menu did not
  re-layout the track on the first toggling.

- Make columns in the faceted track selector initially each be an equal
  percentage of the total width of the grid. Thanks to Steffi Geisen for
  pointing this out.
