---
layout: post
title: JBrowse 1.9.0: VCF support, dataset switching, wiggle track dynamic scaling, REST backend
date: 2013-04-16
tags: ["Software releases"]
---

JBrowse 1.9.0 is out today, with some great new features, and **lots** of
smaller improvements and bug fixes.

Download links:

- [JBrowse-1.9.0.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=43 'download JBrowse-1.9.0.zip') -
5.0M - Includes everything you need to display your data on the web with
JBrowse, optimized for fast loading speed.
<div>SHA1 file checksum: 98bc85d50827db05ad89863c723f0fab54af3dfe</div>
- [JBrowse-1.9.0-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=44 'download JBrowse-1.9.0-dev.zip') -
28M - Primarily for developers. Includes additional developer documentation,
developer test suites, and full copies of Dojo and Dijit.
<div>SHA1 file checksum: 83bd7c1d630dee7019662f60f0a0b13164e6aa93</div>
Headline features for this release:

- **VCF variants support:** we've added a new direct-access data backend for
  reading VCF files that have been compressed and indexed with bgzip and tabix,
  along with a new track type (HTMLVariants) optimized for viewing the
  sometimes-huge amounts of detail (particularly genotypes) associated with VCF
  variants.
- Wiggle track types now by default **choose a y-axis scale dynamically for the
  region being displayed** (set as `"autoscale": "local"` in JBrowse
  configuration JSON). This is a big win for usability! Thanks to Gregor Rot and
  Raymond Wan for pushing for this feature!
- If configured to do so, JBrowse can now display a dropdown **dataset selector
  **on the left side of the menu bar (similar to the one in GBrowse) that lets
  users switch between multiple datasets in the same JBrowse installation.
- The default "Simple" track selector now has a search input at the top that can
  quickly filter the list of displayed tracks to find the text you type.
- JBrowse now ships with a **REST datastore backend** that lets developers serve
  data to JBrowse from custom back-end systems. See the
  [JBrowse REST feature store API documentation on the GMOD wiki](http://gmod.org/wiki/JBrowse_Configuration_Guide#JBrowse_REST_Feature_Store_API).
  And the full release notes:

- Added a direct-access data backend for reading variation data directly from
  VCF files that have been compressed with `bgzip` and indexed with `tabix`. See
  the JBrowse Configuration Guide on the GMOD wiki for details about how to add
  directly-displayed VCF files (issue #211).
- Added a new `HTMLVariants` track type based on HTMLFeatures with a
  feature-details popup optimized for displaying variant details.
- Added a text box at the top of the simple (i.e. the default) track selector
  that finds tracks in the track list matching the typed text (issue #210).
- Added support for `autoscale: "local"` in Wiggle, FeatureCoverage, and
  SNPCoverage tracks, which automatically sets the scale of the y-axis based on
  the range of the data being displayed in the current view. Thanks to Gregor
  Rot and Raymond Wan for championing the need for this (issue #203).
- Added an optional dropdown selector in the menu bar that allows switching
  between multiple datasets. To enable it, add a `datasets` array in your
  JBrowse configuration, and set a `dataset_id` in each of the `trackList.json`
  (or other) files that are optionally loaded by the dataset selector. See the
  JBrowse Configuration Guide on the GMOD wiki for details (issue #134).
- Added a new datastore class, `JBrowse/Store/SeqFeature/REST` that fetches data
  from any back end system that implements the simple REST API it uses. See the
  JBrowse Configuration Guide for details on how to implement its REST API.
  Thanks to Brett Thomas, Daniel Troesser, and Brad Chapman for pointing out the
  need for this (issue #227).
- By default, JBrowse now continuously updates the browser's URL bar to contain
  a URL that will show the current JBrowse view directly. This is enabled by
  default only if JBrowse is running from the default index.html included in the
  JBrowse distribution.
- HTMLFeatures, Alignments, and Alignments2 tracks now accept a `maxHeight`
  configuration variable specifying the maximum displayed height of a track in
  pixels. Features that would cause the track to grow beyond its maximum height
  will not be drawn (issue #222).
- The `refSeqDropdown` configuration variable; the reference sequence selector
  is now shown for any number of reference sequences, with its length limited by
  the `refSeqSelectorMaxSize` variable (see next item).
- Added support for optional `refSeqSelectorMaxSize` and `refSeqOrder` global
  configuration variables that set the maximum length of the reference sequence
  dropdown selector, and specify the sort order of the reference sequences in
  that selector, respectively. One instance in which this is particularly useful
  is in displaying annotations on early-stage, incomplete genomic assemblies: to
  display the N biggest contigs in the assembly in the reference sequence
  selector dropdown, one can set `refSeqOrder` to `length descending`, and set
  `refSeqSelectorMaxSize` to N. Thanks to Ignazio Carbone for pointing out the
  need for this. (issues #234 and #235).
- Fixed some bugs causing memory leaks when scrolling and zooming, especially on
  tracks with a lot of data like BAM tracks. Thanks to Gustavo Cerquiera for
  pointing this out (issue #220).
- HTMLFeatures tracks now accept `style->label` and `style->description`
  configuration variables variable that can be set to a function callback that
  returns a string with the feature's label or long description, respectively
  (issue #9).
- Wiggle/XYPlot, Wiggle/Density, and FeatureCoverage tracks now accept function
  callbacks in their `style->pos_color`, `style->neg_color`, `style->bg_color`,
  and `style->clip_marker_color` configuration variables. Function callbacks are
  passed two arguments: the feature object (with start bp, end bp, and score of
  the quanititative region being shown, and the track object (which can be used
  to access track configuration data, along with many other things). (issue
  #133).
- Wiggle/XYPlot tracks now accept an array for their `variance_band` argument,
  allowing users to set the position of the variance bands to show (issue #133).
- Wiggle/XYPlot tracks now accept a `style->variance_band_color` configuration
  variable, allowing users to set the colors of the variance bands. The variance
  band color should usually be specified with a partial opacity. Default is
  'rgba(0,0,0,0.3)', which is black with 30% opacity (issue #133).
- Added an "About JBrowse" popup dialog, which supports an `aboutThisBrowser`
  configuration stanza containing a title for the main browser window, and a
  description to be shown in a pop-up dialog when the title is clicked (issue
  #206).
- Where possible (i.e. supported by the data store), JBrowse will now pop up a
  warning if a local data file is opened that contains no data for the current
  reference sequence (issue #178).
- Fixed bug in which hard- and soft-clipped regions were erroneously counted
  toward the overall length of a BAM alignment (issue #229).
- Fixed bug in which dragging the vertical scroll bar marker on the right side
  of the track pane did not behave correctly. (Julien Smith-Roberge, issue
  #223).
- Fixed bug in which the navigation location for some reference sequences can
  get messed up when ref.start != 0, or ref.end != ref.length (issue #215).
- Fixed bug in which navigating via sequence dropdown selection ignores previous
  location on selected sequence, whereas with navigation text box entering just
  a sequence name navigates to previous location on that sequence (if visited
  previously). Thanks to Gregg Helt for implementing this fix (issue #216).
- Fixed bug in which the initial default view of a previously unviewed reference
  sequencestarts at 80% centered view, but any use of reference sequence
  selection pulldown takes it to 100%. Big thanks to Gregg Helt for implementing
  this fix (issue #217).
- Fixed bug in which iframe popups did not display correctly in Internet
  Explorer 9. Thanks to Steffi Geisen for pointing this out (issue #233).
- Improved JSON syntax error messages in server-side scripts (issue #214).
- Increased the default display timeout (`blockDisplayTimeout`) on HTML-based
  features tracks from 5 seconds to 20 seconds.
- Added a `new-plugin.pl` helper script that makes the skeleton of a new JBrowse
  plugin.
- Added an `add-json.pl` helper script that advanced users can use to set
  arbitrary value in JSON files from the command line.
- Fixed a bug in which the `--conf` option to `prepare-refseqs.pl` did not
  support comments in JSON conf files (issue #213). Thanks to Keiran Raine for
  pointing this out.
- Fixed some missing dojo/dijit nls directories in the non-dev release zipfile.
- Fixed a bug with handling of timeout events in HTMLFeatures tracks. Thanks to
  Matt Henderson of KBase for pointing this out.
