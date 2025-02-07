---
layout: post
title: JBrowse 1.6.4 bugfix release
date: 2012-10-16
tags: ['Software releases']
---

JBrowse 1.6.4 has been released, containing fixes for some small issues in the
[1.6.3 release](http://jbrowse.org/jbrowse-1-6-3-bugfix-release/ 'JBrowse 1.6.3 bugfix release').

Files for download:

- [JBrowse-1.6.4-min.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=21 'download JBrowse-1.6.4-min.zip') -
  2.8M
- [JBrowse-1.6.4-full.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=22 'download JBrowse-1.6.4-full.zip') -
  27.3M Changes in this release:

- Improvements to the scalability of `generate-names.pl`. Many thanks to Steffi
  Geisen for her ongoing help with this.

      *   Users can now manually specify which tracks will be indexed to

  enable autocompletion and searching for their feature names in the JBrowse
  location box. \* The lazy-trie name indexing structure now correctly handles
  the case of large numbers of features that may share the same name. Before, it
  was generating files that were too large for the client to handle.

- Fixed off-by-one error in Wiggle track display code: wiggle data was
  incorrectly displayed shifted one base to the left of its proper position.
  Thanks to Steffi Geisen for noticing this.
- Fixed bug in which the reference-sequence selection box did not automatically
  update in all situations to reflect the current reference sequence.
