---
layout: post
title: JBrowse 1.6.2 bugfix release
date: 2012-09-10
tags: ['Software releases']
---

JBrowse 1.6.2 has been released, containing fixes for some small issues in the
[1.6.1 release](http://jbrowse.org/jbrowse-1-6-1-bugfix-release/ 'JBrowse 1.6.1 bugfix release').

Files for download:

- [JBrowse-1.6.2-min.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=18 'download JBrowse-1.6.2-min.zip') -
  2.8M
- [JBrowse-1.6.2-full.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=17 'download JBrowse-1.6.2-full.zip') -
  27.3M Changes in this release:

- Fixed feature-layout performance problem when zoomed very far in on features
  that are much larger than the viewing window.

- Added a default `menuTemplate` to all HTML-based features, so that all HTML
  features now have a right-click menu by default.

- Add `css` configuration variable that allows users to specify either strings
  or URLs containing CSS to add.

- improved `bin/ucsc-to-json.pl` error messages

- `bin/add-track-json.pl` now replaces tracks in the target configuration if
  they have the same label.
