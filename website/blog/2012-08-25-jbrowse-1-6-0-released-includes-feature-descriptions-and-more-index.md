---
layout: post
title: JBrowse 1.6.0 released, includes feature descriptions and more!
date: 2012-08-25
tags: ['Software releases']
---

I'm very pleased to announce the release of JBrowse 1.6.0! This release is not
quite as major as the previous two releases, but there are still some nice
things added.

As usual, this release comes in two flavors: the "minimal" release
([JBrowse-1.6.0-min.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=14) -
2.8M) that includes only the software and documentation necessary to format your
own data and run the browser, and the "full" release
([JBrowse-1.6.0-min.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=13)-
27.2M) that includes the developers' test suite, more sample data files, and
developer documentation. Here is the full list of new improvements in 1.6.0:

- Added `description` capabilities to HTML-based features, similar to GBrowse's
  descriptions. If zoomed in far enough (as defined by
  `style.descriptionScale`), adds a second line of text below the feature's
  label that shows the content's of the featur's `Note` or `description`
  attribute (issue #67).

- Give prepare-refseqs.pl the capability to load reference sequences from
  embedded FASTA sections in GFF3 files (issue #128).

- Configuration files can now recursively `include` eachother, and `tracks`
  sections are merged intelligently.

- Made sequence tracks not disappear when zoomed out too far to see base pairs.
  Instead, sequence tracks simply display lines suggesting that DNA would be
  visible at higher magnification. (issue #124).

- Double-clicking track labels in the simple track selector now turns the track
  on (issue #123).

- Fixed bug in BigWig tracks that use the "scale": "log" option: did not render
  properly when the wiggle data included 0's. This was due to the fact that the
  origin was being mapped to Infinity. Thanks to the
  [Mockler Lab](http://www.mocklerlab.org/) for the fix! (issue #127).

- Fixed bug in NCList binary search code in which zero-length features at node
  boundaries would not be found (fix by Ed Lee).

- Fixed bug in which dragging the scroll bar on the simple track selector can
  sometimes cause a drag-and-drop to erroneously begin (issue #89).

- Fixed some bugs in the layout of HTML-based features in which features in
  different blocks would overlap in some circumstances. Under the hood, replaced
  the contour-based layout engine with a simpler, not-much-slower implementation
  that is more correct in the general case (issue #122).

- Fixed a bug with vertical centering of strand arrows and other sub-elements of
  HTML-based features.
