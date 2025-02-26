---
layout: post
title: JBrowse 1.5.0 released, includes direct BigWig access!
date: 2012-08-13
tags: ['Software releases']
---

I'm very pleased to announce the release of JBrowse 1.5.0! There are three
headline features in this release. First, we've integrated a **direct-access
BigWig data backend**, adapted from the
[Dalliance Genome Explorer](http://www.biodalliance.org/) that can read wiggle
data directly from compressed
[BigWig files](http://genome.ucsc.edu/goldenPath/help/bigWig.html) stored on
your web server. Second, there is now a beautiful, full-featured canvas-based
**`Wiggle` track type**. Third, we have a very powerful new click system that
allows JBrowse administrators complete flexibility in configuring what happens
when a user left- or right-clicks a feature in an HTML-based feature track,
including **right-click context menus**.

A demonstration of JBrowse 1.5.0 showing a test BigWig-based wiggle track
(alongside an old-style image-based wiggle track for comparison) can be seen
[here](http://jbrowse.org/code/JBrowse-1.5.0-full/index.html?loc=ctgA%3A6481..27220&tracks=DNA%2Cvolvox_microarray.bw%2Cvolvox_microarray.wig&data=sample_data%2Fjson%2Fvolvox),
and a whole-genome RNA-seq profile of tomato, with corresponding gene models,
can be seen [here](/genomes/tomato/).

As usual, this release comes in two flavors: the "minimal" release
([JBrowse-1.5.0-min.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=12) -
2.8M) that includes only the software and documentation necessary to format your
own data and run the browser, and the "full" release
([JBrowse-1.5.0-min.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=11) -
27.2M) that includes the developers' test suite, more sample data files, and
developer documentation.

Here is the full list of new improvements in 1.5.0:

- Added a direct-access storage driver for BigWig data files, based on code from
  the Dalliance Genome Explorer by Thomas Down. BigWig file access is supported
  now by the current versions of all major browsers except Internet Explorer
  (which is expected to work when version 10 is released along with Windows 8).

- Added a `canvas`-based wiggle track implementation for quantitative data that,
  when used with the new BigWig storage backend, removes the need to
  pre-generate rendered images of wiggle data. Its display is also highly
  configurable, with configuration options modeled on the GBrowse
  `wiggle_xyplot` glyph type (i.e. `Bio::Graphics::Glyph::wiggle_xyplot`).

- Added highly configurable behavior for left-clicking and right-clicking
  features in HTML-based feature tracks. If a `menuTemplate` option is specified
  in the track configuration, right-clicking a feature brings up a context menu,
  the items in which can be configured to do nearly anything, but that are easy
  to configure for the very common use case of wanting to display content from a
  certain URL. Feature left-clicks are also configurable using the same
  mechanism. Thanks to Alexie Papanicolaou and Temi Varghese for the initial
  implementation of context menus.

- Improved the default HTML feature left-click dialog box. It is now both
  prettier, and more comprehensive, displaying all available data for the
  feature.

- Added a small helper script, `add-track-json.pl` that developers and advanced
  users can use to programmatically add a block of track configuration JSON to
  an existing JBrowse configuration file.

- Improved / fixed vertical alignment of sub-elements of HTML features,
  including subfeatures and the arrowheads that show strand. All elements in a
  feature are now vertically centered by default.
