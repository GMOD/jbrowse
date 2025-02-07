---
layout: post
title: JBrowse 1.4.0 released, includes faceted track selection!
date: 2012-06-14
tags: ['Software releases']
---

JBrowse 1.4.0 has been released! There are two headline features in this
release: a new, extremely powerful **faceted track selector** that makes it easy
for users to search through hundreds or thousands of tracks based on their
metadata, and much better support for **large numbers of reference sequences**,
enabled by retiring the old reference sequence dropdown selector in favor of
adding a new find-as-you-type feature to the location box.

A
[demonstration of the faceted track selector](/code/JBrowse-1.4.0-full/index.html?data=sample_data/json/modencode 'view faceted track selector demo')
can be seen
[here](/code/JBrowse-1.4.0-full/index.html?data=sample_data/json/modencode).
This contains a snapshot of the modENCODE track metadata taken from
[http://data.modencode.org](http://data.modencode.org). Note that the track data
and reference sequences in this track selection demo are not real: the reference
sequences and wiggle data are all just copies of the volvox wiggle test track
from the JBrowse test suite.

As is becoming the norm, this release comes in two flavors: the "minimal"
release
([JBrowse-1.4.0-min.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=6 'download JBrowse-1.4.0-min.zip') -
2.6M) that includes only the software and documentation necessary to format your
own data and run the browser, and the "full" release
([JBrowse-1.4.0-full.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=5 'download JBrowse-1.4.0-full.zip') -
5.5M) that includes the developers' test suite, more sample data files, and
developer documentation.

There have been lots of improvements over the 1.3 series:

- Added a full-featured** faceted track selector** for users that have many
  (hundreds or thousands) of tracks. This can be turned on by setting the
  `trackSelectorType` config variable to "Faceted". See the JBrowse wiki for
  more documentation on how to use faceted track selection. (issue #95)
- Removed the dropdown selector for reference sequences in favor of making the
  **location box auto-complete reference sequence and** ** feature names**. This
  makes JBrowse much more **scalable to large** ** numbers of reference
  sequences**. (fixes issues #3, #60, and #101)
- Added a **vertical-scrolling marker** on the right side of the track pane,
  making it much easier to discern the vertical position of the track display.
  (issue #93).
- biodb-to-json.pl and flatfile-to-json.pl now **load all available** ** feature
  data**: all attributes of features are now encoded in the JSON and are
  available for use by feature callbacks. (issue #72)
- **Feature labels now do not scroll off screen** if any part of the feature is
  still visible (fixes issue #62).
- Added jbrowse_conf.json, a default JSON-format configuration file, to the
  JBrowse root directory. Makes it **easier to get started** ** with more
  advanced JBrowse configuration**.
- JBrowse instances now **report anonymous usage statistics** to the JBrowse
  developers. This data is very important to the JBrowse project, since it is
  used to make the case to grant agencies for continuing to fund JBrowse
  development. No research data is transmitted, the data collected is limited to
  standard Google Analytics, along with a count of how many tracks the JBrowse
  instance has, how many reference sequences are present, their average length,
  and what types of tracks (wiggle, feature, etc) are present. Users can disable
  usage statistics by setting "suppressUsageStatistics: true" in the JBrowse
  configuration.
