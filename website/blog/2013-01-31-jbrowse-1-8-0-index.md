---
layout: post
title: JBrowse 1.8.0: opens local files, new BAM track types, new plugin system
date: 2013-01-31
tags: ["Software releases"]
---

JBrowse 1.8.0 is finally here, with some great new features, and lots of smaller
improvements.

Download links:

- [JBrowse-1.8.0.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=39 'download JBrowse-1.8.0.zip') -
  3.3M - Includes everything you need to display your data on the web with
  JBrowse, optimized for fast loading speed.
- [JBrowse-1.8.0-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=40 'download JBrowse-1.8.0-dev.zip') -
  28M - Primarily for developers. Includes additional developer documentation,
  developer test suites, and full copies of Dojo and Dijit. The number 1 new
  feature is: JBrowse can now **open local BAM, BigWig, and GFF3 files** that
  reside on the user's computer, without the need to transfer any data over the
  network. For example, if a user is viewing a genome in JBrowse 1.8 at her
  favorite database website, and she has a 20GB BAM file on her computer for
  that same genome, she can just open her local BAM file and view it alongside
  the data from the website, without needing to upload the BAM file anywhere.
  Give this new feature a try, and let us know how it goes! The File->Open
  dialog works for remote URLs too, or even mixtures of local files and URLs.

[caption id="attachment_513" align="alignnone"
width="594"]![The new file -> open dialog](http://jbrowse.org/wordpress/wp-content/uploads/2013/01/filedialog.png)](filedialog.png)
The new file -> open dialog[/caption]

There are also two new track types designed for even better display of BAM data:

First, there is the **new `Alignments2` track type, which is a faster,
`<canvas>`-based track for viewing alignments**, including base-level indels and
mismatches. It is much more performant when viewing very dense or deep sets of
alignments, and is meant to largely replace the HTML-based `Alignments` track
type that was introduced in JBrowse 1.7.0.

Second, there is a **new `SNPCoverage` track**, that draws the coverage of
alignment features along the genome, along with a graphical representation of
SNP distribution, and tables showing frequencies for each SNP. Thanks and great
job to Julien Smith-Roberge, a co-op student at the Ontario Institute for Cancer
Research for the initial implementation of this!

[caption id="attachment_515" align="alignnone"
width="790"]![SNPCoverage track](http://jbrowse.org/wordpress/wp-content/uploads/2013/01/snpcoverage.png)](snpcoverage.png)
SNPCoverage track[/caption]

The last headline feature, which will be of interest primarily for developers,
is the introduction of a **new plugin system for JBrowse**. It's still a work in
progress, the details of the plugin API will probably not be finalized for a
while, but the broad strokes of it are set out on the
[JBrowse Plugin API page on the GMOD wiki](http://gmod.org/wiki/JBrowse_Plugin_API 'JBrowse Plugin API').
If you are interested in living on the bleeding edge and developing a JBrowse
plugin, contact the gmod-ajax mailing list, or contact me directly.

And now for the full release notes:

- Added new "File -> Open" function that can display BAM, BigWig, and GFF3 files
  located on the user's machine, at remote URLs, or a mixture of both. When
  opening local files, everything is done locally, no data is transferred to the
  server.
- Added a new "SNPCoverage" track type, designed for use with BAM files (but
  which works with any features that have MD fields), that shows a coverage plot
  with a graphical representation of SNP distribution, and tables showing
  frequencies for each SNP.
- Added a new "Alignments2" track type, which is a much faster implementation of
  the "Alignments" track type. It is more suitable for very deep BAM alignments,
  but has a slightly different configuration scheme.
- Added a flexible plugin system whereby external code can be loaded as part of
  JBrowse. Plugin JavaScript has full access to customize nearly everything in
  JBrowse. The plugin system is quite new, but many hooks are available that
  plugins can use to safely modify JBrowse's behavior, and more are on the way.
  See the JBrowse wiki for details on how to write your own plugins. Thanks to
  Gregg Helt and the other members of the WebApollo project for helping to drive
  development of the new plugin system.
- JBrowse feature name indexing (`generate-names.pl`) now uses an all-new
  hash-based filesystem backend. Although `generate-names.pl` now takes longer
  to run, it can handle much larger numbers of names to index, and uses much
  less RAM to do it. As a side benefit, the JBrowse location box's
  autocompletion feature is now faster and more reliable. Thanks to Steffi
  Geisen and Volodymyr Zavidovych for pointing out the issues with name indexing
  scalability and reliability.
- Added support in "HTMLFeatures", "Alignments", and "Alignments2" tracks for a
  `style.featureScale` configuration variable, which, if set, specifies a
  minimum zoom scale (pixels per basepair) for displaying features. If zoomed
  out more than this (i.e. fewer pixels per bp), either histograms or a "too
  many features" message will be displayed.
- Changed binning algorithm of "FeatureCoverage" tracks when zoomed out. Now
  calculates the average base coverage in each bin, rather than the absolute
  number of features that overlap each bin.
- "HTMLFeatures" tracks now accept a comma-separated list of field names in
  their `description` configuration variable, allowing users to customize which
  attribute(s) of a feature hold the description.
- Added a timeout to HTMLFeatures and Alignments tracks to prevent data-heavy
  tracks (like BAM tracks with very deep coverage) from freezing or crashing a
  user's browser.
- Improved graphical look of canvas-based tracks during zoom operations. Thanks
  to Mitch Skinner for implementing this!
- Fixed a bug in which the Y-axis scale for feature density histograms in
  HTMLFeatures tracks was sometimes drawn incorrectly.
- Greatly improved speed and responsiveness of BAM data backend.
- Fixed yet another bug that prevented display of some types of BAM files.
