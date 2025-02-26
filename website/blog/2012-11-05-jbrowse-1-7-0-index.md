---
layout: post
title: JBrowse 1.7.0, now with data export, direct BAM display, and much more
date: 2012-11-05
tags: ['Software releases']
---

I am pleased to announce the release of JBrowse 1.7.0, which includes a great
many enhancements both large and small. Very exciting!

First, the download links:

- [JBrowse-1.7.0.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=25 'download JBrowse-1.7.0.zip') -
  2.9M - Includes everything you need to display your data on the web with
  JBrowse, optimized for loading speed.
- [JBrowse-1.7.0-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=26 'download JBrowse-1.7.0-dev.zip') -
  27.4M - Primarily for developers. Includes additional developer documentation,
  developer tests suites, and full copies of Dojo and Dijit. Now for the big new
  features.

Firstly, JBrowse can now **quickly and efficiently display alignment data
directly from BAM files** over the web, with no need for any intermediate
formatting steps. Just put your `.bam` and `.bai` files on your web server, add
a few lines of configuration to point JBrowse at them, and go! Moreover, JBrowse
has **two new track types optimized for displaying alignment data**: new**
"Alignments" track type**, showing basepair differences and insertions between
aligned reads and the reference (using a BAM alignment's MD field), and a new
**FeatureCoverage** track type that generates a **depth-of-coverage plot from a
BAM file** (or from any other source of feature data). Many thanks to Thomas
Down and his Dalliance Genome Browser project, from which the JBrowse BAM data
backend was derived.

The second headline feature of this release is long-awaited support for
**exporting and **<span style="color: #000000;">**saving sequence and annotation
data** in FASTA, GFF3, bed, bedGraph, and Wiggle formats. Just turn on the track
of interest and click on its track label to bring up a new menu of things you
can do with that track, one of which is "Save track data". This has been one of
the top features users have been requesting for a long time, and now it's
finally here!</span>

Third, we have two important enhancements to JBrowse's already-excellent support
for **BigWig\*\*** quantitative data**: a new **Wiggle/Density** track type,
analogous to GBrowse's popular `wiggle_density` track type, that shows
quantitative data using varying intensity of color. Additionally, the existing
**Wiggle/XYPlot** supports a new `bg_color` option that, if set, provides a
background color for all data points in the track, making it easy to
**distinguish between regions with no data, and regions with 0-valued data\*\*.
Many thanks to Steffi Geisen at the University of Granada for her continued help
driving progress on this and many other issues.

Read on for the exhaustive list of changes in this release, including bug fixes,
more keyboard navigation enhancements, colored DNA basepairs, more configuration
options, and speed enhancements.

1.7.0 2012-11-05 19:22:17 America/New_York

- Added a new direct-access storage driver for BAM files, removing the need for
  `bam-to-json.pl`. This new method of BAM access is far superior to the old
  `bam-to-json.pl` in nearly every way, except in browser compatibility. Like
  the BigWig direct access backend added in JBrowse 1.5.0, it is based on code
  from Thomas Down's Dalliance Genome Explorer, and works in all major browsers
  _except_ Internet Explorer, because IE lacks support for the necessary web
  standards. It may work with Internet Explorer 10, but this has not been tested
  yet.
- Added a new `Alignments` track type designed to work seamlessly with BAM
  files. This track type shows basepair differences and insertions between
  aligned reads and the reference, and highlights reads with missing mate-pairs
  in red.
- Added the ability to export track data in FASTA, GFF3, bed, bedGraph, and
  Wiggle formats (issue #104). To export data, turn on the track of interest,
  then click on its track label to bring up the track menu, and select "Save
  track data".
- Added a new `Wiggle/Density` track type, analagous to the GBrowse
  `wiggle_density` glyph type. Shows the Wiggle information using varying
  intensity of color (issue #66). Renamed the `Wiggle` track to `Wiggle/XYPlot`,
  and made the old `Wiggle` track type an alias to `Wiggle/XYPlot`.
- Both `Wiggle/XYPlot` and `Wiggle/Density` now support a `style -> bg_color`
  option. Color-density plots blend the `pos_color` or `neg_color` into the
  `bg_color` in amounts that vary with the wiggle data, and xyplots fill the
  background color behind all points that have data present, regardless of
  value. `bg_color` defaults to off for xy xplots, and semi-transparent gray for
  density plots. Setting this makes it easier for users to distinguish at a
  glance between regions with no data, and regions with a value of 0.
- Added a new `FeatureCoverage` track type, which shows a dynamically-computed
  XY-plot of the depth of coverage of features across a genome. One good use of
  this track type is to provide a quick coverage plot directly from a BAM file.
  However, since this track calculates coverage on the fly, it can be slow when
  used with large regions or very deep coverage. In this case, it is recommended
  to generate a BigWig file containing the coverage data, and display it with a
  `Wiggle/XYPlot` or `Wiggle/Density` track.
- DNA bases are now displayed with color-coded backgrounds, allowing basepair
  information to be discerned when zoomed somewhat further out, when base letter
  cannot be drawn. Colors are also designed to match the base-mismatch colors
  used in `Alignment` tracks, enabling clearer SNP visualization.
- Added a vertical line cursor and labels showing the current basepair position
  of the mouse when hovering over the scale bar, or when doing a rubber-band
  zoom (Erik Derohanian) (issue #32).
- Added an animation to make it easier to see where in the track selection list
  a closed track has gone, when using the simple track selector (issue #151).
- Information dialog boxes are now easier to dismiss: clicking anywhere outside
  of them, or pressing any key, will make them go away.
- Improvements to feature track configuration:

      *   Feature tracks no longer use the `style.subfeatureScale`

  configuration variable to determine whether to show subfeatures. Instead,
  subfeatures are shown if the parent feature, when shown on the screen, is
  wider than `style.minSubfeatureWidth`, which defaults to 6 pixels. \* Make
  explicitly-configured track `labelScale`, `histScale`, and `descriptionScale`
  not be modulated by the feature density: only use the feature density to pick
  the scale defaults

- The default feature-detail dialog box now shows more information, adding:

  - the feature's exact length
  - full details of its subfeatures

- Added a `locationBoxLength` configuration variable that controls the width of
  the location box. In addition, the default width of the location box is now
  also smarter. Instead of a fixed 25 characters, it is calculated to fit the
  largest location string that is likely to be produced, based on the length of
  the reference sequences and the length of their names.
- Pressing SHIFT+-up/down arrow keys now cause the genome view to zoom in and
  out. If ALT is added, it zooms further. Thanks to Karsten Hokamp for the
  excellent suggestion.
- Holding SHIFT while scrolling left and right with the arrow keys causes the
  view to scroll further.
- Added a `theme` configuration variable to allow changing the graphical theme
  to something different from the default "tundra". However, no other themes are
  implemented yet.
- Greatly sped up rendering of HTML subfeatures by caching the heights of
  subfeature HTML elements.
- Fixed bug in which the genome view executed a double-click zoom when users
  rapidly clicked on multiple track 'close' buttons.
- Fixed bug with the genome view scrolling in response to arrow keys being
  pressed when typing in the location box.
- Fixed bug in which the score display in Wiggle tracks would sometimes flicker
  when moving the mouse.
