---
layout: post
title: JBrowse 1.9.7 maintenance release
date: 2013-06-25
tags: ['Software releases']
---

JBrowse 1.9.7 has been released, with an important fix for a race condition that
intermittently causes some NCList-based tracks to show the wrong genomic region
when the browser is first started, and a fix for a bug in how JBrowse plugin
paths are calculated.

Files for download:

- [JBrowse-1.9.7.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=57 'download JBrowse-1.9.7.zip') -
  5.1M file SHA1 cc30de7d23ad0ca7f0d9ea0121ce92bb008cca17
- [JBrowse-1.9.7-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=56 'download JBrowse-1.9.7-dev.zip') -
  26M file SHA1 0504f07e0817e8ba66dafb21734dab7900f6a2c6 Changes in this
  release:

- Fixed a bug in which the initial viewing location (passed from a URL parameter
  or similar) is not always set correctly in NCList-based tracks. Thanks to
  Steffi Geisen for pointing this out.

- Fixed a bug in which JavaScript paths for plugins were incorrectly calculated
  when a `baseUrl` global configuration variable was set. Thanks to Matt Bomhoff
  for pointing this out.
