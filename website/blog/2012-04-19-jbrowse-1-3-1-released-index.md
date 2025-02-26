---
layout: post
title: JBrowse 1.3.1 released
date: 2012-04-19
tags: ['Software releases']
---

JBrowse 1.3.1 has been released, this is a minor release with fixes for some
bugs found in 1.3.0.

<dl><dt>[JBrowse-1.3.1-min.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=7 "download JBrowse 1.3.1 - min") - 2.0MB</dt><dd>Includes all that is needed for running JBrowse and formatting your own data.</dd><dt>[JBrowse-1.3.1-full.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=8 "download JBrowse 1.3.1 - full") - 4.7MB</dt><dd>Includes developer API documentation, developer test suites, additional sample data</dd></dl>

### **Changes in this release**

- Fixed memory-management bug that caused way too much RAM to be used by
  FeatureTrack loading (flatfile, bam, and biodb-to-json.pl) when loading with
  very large numbers of reference sequences. Big thanks to Tristan Lubinski for
  help in isolating this.

- Fixed some bugs in BAM support section of setup.sh autosetup script, thanks to
  Tristan Lubinski for help in isolating this as well.

- Added an example document with an iframe running JBrowse in embedded mode in
  docs/examples/embedded_mode.html

- flatfile-to-json.pl now loads the 'score' attribute of features in the JSON.
