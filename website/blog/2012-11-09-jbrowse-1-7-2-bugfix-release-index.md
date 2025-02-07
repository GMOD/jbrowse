---
layout: post
title: JBrowse 1.7.2 bugfix release
date: 2012-11-09
tags: ['Software releases']
---

JBrowse 1.7.2 has been released, containing a fix for some further BAM issues
found in the
[1.7.1 release](http://jbrowse.org/jbrowse-1-7-1-bugfix-release/ 'JBrowse 1.7.1 bugfix release').
Thanks so much to everyone who has worked with me to isolate problems in
JBrowse's BAM support. The more people report problems, the more bulletproof the
BAM backend gets.

Files for download:

- [JBrowse-1.7.2.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=29 'download JBrowse-1.7.2.zip') -
  2.9M
- [JBrowse-1.7.2-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=30 'download JBrowse-1.7.2-dev.zip') -
  28.6M Changes in this release:

- Fixed more bugs in BAM backend that failed to load some BAM files, including
  BAM files containing no alignments. Thanks to John St. John for his assistance
  in isolating the problem.
