---
layout: post
title: JBrowse 1.6.3 bugfix release
date: 2012-09-28
tags: ['Software releases']
---

JBrowse 1.6.3 has been released, containing fixes for some small issues in the
[1.6.2 release](http://jbrowse.org/jbrowse-1-6-2-bugfix-release/ 'JBrowse 1.6.2 bugfix release').

Files for download:

- [JBrowse-1.6.3-min.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=19 'download JBrowse-1.6.3-min.zip') -
  2.8M
- [JBrowse-1.6.3-full.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=20 'download JBrowse-1.6.3-full.zip') -
  27.3M Changes in this release:

- Fixed bug with shift-rubberband-zooming not working on Windows (issue #150)
  (Erik Derohanian).
- Fixed "Can't locate JSON.pm" errors with add-track-json.pl.
- Added a reference-sequence-selection dropdown box, similar to the old one,
  that is shown by default if fewer than 30 reference sequences, otherwise it's
  off unless `refSeqDropdown: true` is set in the configuration (issue #138).
- Fixed bug in which popup dialog boxes showing other websites showed the
  website in only the top portion of the dialog box. Only present in some
  browsers (issue #149).
- Fix coordinate display bug in feature detail popups. The feature's position
  was being displayed in interbase coordinates, but should be displayed in
  1-based coordinates. Thanks to Steffi Geisen for pointing this out.
- Added a `style.height` option to Wiggle tracks to control the track's height
  in pixels (issue #131) (Erik Derohanian).
- Added support for a `style.trackLabelCss` configuration variable to allow
  customizing the appearance of the label for a particular track (issue #4)
  (Erik Derohanian).
