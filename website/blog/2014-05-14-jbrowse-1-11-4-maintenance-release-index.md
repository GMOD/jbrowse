---
layout: post
title: JBrowse-1.11.4 maintenance release
date: 2014-05-14
tags: ['News', 'Software releases']
---

I am happy to announce the release of JBrowse 1.11.4. This is the first release
after Rob's leave, and it represents the great community effort to keep things
going. There are some exciting new developments in this version, including
high-resolution rendering of canvas-based tracks and a basic GTF file parser.
There are also several important bug fixes, including an update to the setup.sh
script in order to maintain compatibility with the latest BioPerl.

- [JBrowse-1.11.4.zip](http://jbrowse.org/releases/JBrowse-1.11.4.zip) - 4.9M
  file SHA1 08834c1fd3a947971459ddc4482128cdaf80a668
- [JBrowse-1.11.4-dev.zip](http://jbrowse.org/releases/JBrowse-1.11.4-dev.zip) -
  26M file SHA1 4f6ac7aa339e20e9be3e717fd88bd27a62f40f27

## Minor improvements

- Added high-resolution rendering for CanvasFeatures, SNPCoverage, BigWig
  tracks, and histograms. This allows rendering for canvas- based tracks to look
  much sharper on high-resolution displays and can even look sharper when
  zooming. The high-resolution rendering is disabled by default to avoid
  conflicts with existing instances, but feel free to test it out by setting
  "highResolutionMode" in jbrowse.conf. Thanks to Colin Diesh for the idea and
  implementation ([issue #456](https://github.com/gmod/jbrowse/issues/456))
- Added the ability to run jbrowse scripts outside of the JBrowse root
  directory. Thanks to Chien-Chi Lo for the patch
  ([issue #465](https://github.com/gmod/jbrowse/issues/465)).
- Added basic GTF parser that can open files from the File->Open menu or by
  using the in-memory adaptor. Big thanks to Andrew Warren for the contribution
  ([issue #453](https://github.com/gmod/jbrowse/issues/453)).
- Added a change to the highlight button to allow the user to more easily clear
  highlights. Thanks to Paul Hale for the suggestion and Colin Diesh for the fix
  ([issue #445](https://github.com/gmod/jbrowse/issues/445)).

## Bug fixes

- Fixed help page icons not loading since JBrowse 1.11.2. Thanks to Colin Diesh
  for catching the bug and fixing it
  ([issue #460](https://github.com/gmod/jbrowse/issues/460)).
- Fixed updating of the y-axis scale when using the resize quantitative tracks
  feature. Thanks again to Evan Briones for the original implementation and
  Colin Diesh for the fix
  ([issue #461](https://github.com/gmod/jbrowse/issues/461)).
- Changed the CanvasFeatures 'View details' pages to display the name and
  description of features in the dialog box. Thanks to Colin Diesh for the fix
  ([issue #463](https://github.com/gmod/jbrowse/issues/463)).
- Added a bugfix for non-compliant servers that add a trailing slash to the URL.
  Thanks to Colin Diesh for the fix
  ([issue #462](https://github.com/gmod/jbrowse/issues/462)).
- Fixed a broken link in the documentation for biodb-to-json.
- Updated setup.sh to maintain compatibility with the latest BioPerl. Thanks to
  Thomas Sibley and Scott Cain for helping with this issue
  ([issue #468](https://github.com/gmod/jbrowse/issues/468)).
- Fixed a long standing bug with the coloring of nucleotides on the
  SNPCoverage/Alignments2 track. Thanks to Long Le for reporting this on the
  mailing list.
- Fixed a long standing bug with the scrollbar in the dialog box on Chrome and
  Safari browsers. Thanks to the #dojo irc channel and and Colin Diesh for
  helping fix this problem
  ([issue #386](https://github.com/gmod/jbrowse/issues/386)).
- Fix a small rendering problem that causes one pixel gap to appear on Safari
  due to subpixel rendering issues. Thanks to Colin Diesh for the preliminary
  fix ([issue #341](https://github.com/gmod/jbrowse/issues/341)).
- Fix a bug with CanvasFeatures based tracks loading huge amounts of data to
  generate histograms instead of using pre-generated histograms. Thanks to
  Daniel Troesser for reporting this on the mailing list and Colin Diesh for the
  fix ([issue #475](https://github.com/gmod/jbrowse/issues/475)). &nbsp;
