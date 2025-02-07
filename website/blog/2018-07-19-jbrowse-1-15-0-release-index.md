---
layout: post
title: JBrowse 1.15.0 release - CRAM support, CSI indexes, and on the desktop!
date: 2018-07-19
tags: ['Development', 'News', 'Software releases']
---

JBrowse 1.15.0 has been released! This is a really big one.

At long last, JBrowse can open and view CRAM v2 and v3 files just like BAM. In
fact, viewing CRAM files can sometimes be even faster than viewing BAM files,
because there is less data to move around! Enjoy CRAM support, we all worked
really hard to bring it to you! Getting started with CRAM is easy, just use the
`JBrowse/Store/SeqFeature/CRAM` store and the `Alignments2` track type, just as
you probably are already with BAM files. It works with local files too, of
course!

Another big development, JBrowse Desktop has matured to the point where we can
recommend it without reservation to those looking for a fast, easy to use
desktop genome browser for local and remote files. From now on, we'll be
publishing builds of JBrowse Desktop for Windows, Mac OS, and Linux alongside
the regular JBrowse releases. Download it and give it a try, let us know what
you think! Huge congratulations to Colin Diesh (who is now a full-time JBrowse
developer!) for thinking of this, and seeing this amazing development through. I
think you will be quite pleased with how well JBrowse runs on the desktop!

Also, JBrowse now supports CSI format indexes for BAM fiels and Tabix-indexed
(VCF, GFF3, etc) files. Now your BAM files can be even bigger. As if they
weren't huge enough already. This continues our very serious commitment to make
JBrowse effortlessly usable on even the biggest datasets.

Lastly, JBrowse now sports a nice new text-searching interface accessible from
the View → Search menu item in the top bar. This was a cool idea that came out
of discussions last month at the
[GCCBOSC 2018 CollaborationFest](https://galaxyproject.org/events/gccbosc2018/collaboration/),
and was executed with alacrity by Colin!

As always, read on below the fold for the full release notes, including minor
improvements and bugfixes. And thanks for using JBrowse. &#x1f601;

## Files for download

- [JBrowse-1.15.0.zip](https://github.com/GMOD/jbrowse/releases/download/1.15.0-release/JBrowse-1.15.0.zip) -
  3.1M file SHA1 1899fb9fd83738e5c2985517222d80667fec840f
- [JBrowse-1.15.0-dev.zip](https://github.com/GMOD/jbrowse/releases/download/1.15.0-release/JBrowse-1.15.0-dev.zip) -
  8.5M file SHA1 e3cc637b1e90c641a8ca1caf8878a8d3ba9c50ab
- [JBrowse-1.15.0-desktop-win32-x64.zip](https://github.com/GMOD/jbrowse/releases/download/1.15.0-release/JBrowse-1.15.0-desktop-win32-x64.zip) -
  68M file SHA1 1e088e3cbf94194bcf73ebbc8c03e6f2e59e0829
- [JBrowse-1.15.0-desktop-linux-x64.zip](https://github.com/GMOD/jbrowse/releases/download/1.15.0-release/JBrowse-1.15.0-desktop-linux-x64.zip) -
  66M file SHA1 4cdb1a6c65cff0831b982b34e1113fde8c5cb649
- [JBrowse-1.15.0-desktop-darwin-x64.zip](https://github.com/GMOD/jbrowse/releases/download/1.15.0-release/JBrowse-1.15.0-desktop-darwin-x64.zip) -
  66M file SHA1 06c22218d8d37355a0d8ea2084c3dea847bc249c

## Major improvements

- Added support for displaying alignments from CRAM files, using the new npm
  module [@gmod](https://www.npmjs.com/package/<a
  href=)/cram">[@gmod](https://github.com/gmod)/cram. Thanks to
  [@keiranmraine](https://github.com/keiranmraine),
  [@cmdcolin](https://github.com/cmdcolin),
  [@nathanhaigh](https://github.com/nathanhaigh), and the authors of `htslib`
  and `htsjdk` for invaluable test data and suggestions during this major
  effort. ([issue #546](https://github.com/gmod/jbrowse/issues/546),
  [issue #1120](https://github.com/gmod/jbrowse/pull/1120),
  [@rbuels](https://github.com/rbuels))
- Added support for the CSI index format for tabix VCF/BED/GFF and BAM files!
  This allows individual chromosomes longer than ~537MB (2<sup>29</sup> bases)
  to be used in JBrowse. To enable, use the `csiUrlTemplate` config to point to
  the file. The "Open track" dialog also allows CSI to be used. Thanks to Keiran
  Raine for initial report and Nathan S Watson-Haigh for catching a bug in the
  initial implementation!
  ([issue #926](https://github.com/gmod/jbrowse/issues/926),
  [issue #1086](https://github.com/gmod/jbrowse/pull/1086),
  [@cmdcolin](https://github.com/cmdcolin))
- Added a new search dialog box via the View->Search features menubar. It will
  search the currently configured store for features. You can also configure the
  dialog class in the configuration with `names.dialog` entry, or disable search
  dialog with `disableSearch`. Thanks to the #GCCBOSC hackathon for the idea and
  feedback ([issue #1101](https://github.com/gmod/jbrowse/pull/1101),
  [@cmdcolin](https://github.com/cmdcolin)).

## Minor improvements

- Re-enabled JBrowse Desktop builds for releases! The Windows, Mac, and Linux
  binaries for JBrowse Desktop are uploaded automatically to GitHub releases
  page. JBrowse Desktop is a standalone app that can be used without a web
  server, similar to IGV or IGB ([@cmdcolin](https://github.com/cmdcolin))
- Added a `dontRedispatch` option for GFF3Tabix stores. Example: set
  `dontRedispatch=region` if there are very large `region` biotype features in
  the GFF that do not have subfeatures which will speed up loading times
  significantly ([issue #1076](https://github.com/gmod/jbrowse/issues/1076),
  [issue #1084](https://github.com/gmod/jbrowse/pull/1084),
  [@cmdcolin](https://github.com/cmdcolin))
- Add auto-lower-casing to the feature.get('...') function, commonly used for
  callback customizations. Now, for example, feature.get('ID') works as well as
  feature.get('id'). Thanks to [@nvteja](https://github.com/nvteja) for
  motivating this! ([issue #1068](https://github.com/gmod/jbrowse/issues/1068),
  [issue #1074](https://github.com/gmod/jbrowse/pull/1074),
  [@cmdcolin](https://github.com/cmdcolin))
- Added cache-busting for track config files which actively prevents stale
  configuration files from being loaded
  ([issue #1080](https://github.com/gmod/jbrowse/pull/1080),
  [@cmdcolin](https://github.com/cmdcolin))
- Added indexing of both Name and ID from GFF3Tabix files from
  generate-names.pl. Thanks to [@billzt](https://github.com/billzt) for the
  implementation! ([issue #1069](https://github.com/gmod/jbrowse/issues/1069))
- Made the color of the guanine (G) residue more orangey than yellow to help
  visibility. Thanks to Keiran Raine for the implementation!
  ([issue #1079](https://github.com/gmod/jbrowse/issues/1079))
- Refactored NeatCanvasFeatures and NeatHTMLFeatures as track types. You can
  enable the track style on specific tracks instead of globally this way by
  modifying the track type to be `NeatCanvasFeatures/View/Track/NeatFeatures` or
  `NeatHTMLFeatures/View/Track/NeatFeatures`.
  ([issue #889](https://github.com/gmod/jbrowse/pull/889),
  [@cmdcolin](https://github.com/cmdcolin)).
- In the location box, allow strings with format ctgA:1-100 e.g. with a hyphen
  instead of `..`. Big thanks to Nathan S Watson-Haigh for the idea and
  implementation! The default display remains `..` but `-` is allowed.
  ([issue #1100](https://github.com/gmod/jbrowse/issues/1100),
  [issue #1102](https://github.com/gmod/jbrowse/pull/1102),
  [@nathanhaigh](https://github.com/nathanhaigh))
- Allow sequences with a colon in their name to be used in the location box.
  This includes the HLA reference sequences in hg38. Thanks again to Nathan S
  Watson-Haigh for the implementation of this feature.
  ([issue #1119](https://github.com/gmod/jbrowse/pull/1119),
  [@nathanhaigh](https://github.com/nathanhaigh))
- Fix sensitivity to .gff.gz vs .gff3.gz in GFF3Tabix tracks opened via the
  "Open track" dialog for GFF3Tabix.
  ([issue #1125](https://github.com/gmod/jbrowse/issues/1125),
  [@cmdcolin](https://github.com/cmdcolin))
- Feature detail dialog boxes now display subfeatures of features on the reverse
  strand in upstream-to-downstream order, instead of in genomic coordinate
  order. Thanks to [@nathanhaigh](https://github.com/nathanhaigh) for suggesting
  this and contributing the fix!
  ([issue #1071](https://github.com/gmod/jbrowse/issues/1071),
  [issue #1114](https://github.com/gmod/jbrowse/pull/1114),
  [@nathanhaigh](https://github.com/nathanhaigh))

## Bug fixes

- Fixed a potential cross-site-scripting (XSS) vulnerability by disallowing
  `dataRoot` config values or `?data=` URL parameters that point to a different
  server from the one serving JBrowse. Users can disable this security check by
  setting `allowCrossOriginDataRoot = true` in their configuration.
  ([@cmdcolin](https://github.com/cmdcolin),
  [@rbuels](https://github.com/rbuels))
- Fixed a memory leak that was introduced in JBrowse 1.13.1 in
  generate-names.pl. Thanks to [@scottcain](https://github.com/scottcain) for
  reporting ([issue #1058](https://github.com/gmod/jbrowse/issues/1058),
  [@cmdcolin](https://github.com/cmdcolin))
- Fix the error checking in setup.sh if no node is installed at all
  ([issue #1083](https://github.com/gmod/jbrowse/pull/1083),
  [@cmdcolin](https://github.com/cmdcolin))
- Fix calculation of histograms on GFF3 and GFF3Tabix stores. Thanks to
  [@thomasvangurp](https://github.com/thomasvangurp) for the bug report and
  sample data! ([issue #1103](https://github.com/gmod/jbrowse/issues/1103),
  [@cmdcolin](https://github.com/cmdcolin))
- Fix the representation of array-valued attributes in column 9 for GFF3Tabix.
  Thanks to [@loraine-gueguen](https://github.com/loraine-gueguen) for the bug
  report! ([issue #1122](https://github.com/gmod/jbrowse/issues/1122),
  [@cmdcolin](https://github.com/cmdcolin))
- Fixed a bug in which visibleRegion() in GenomeView.js sometimes returned a
  non-integer value for `end`, which interfered with some scripts and plugins.
  Thanks to [@rdhayes](https://github.com/rdhayes) for noticing and contributing
  the fix! ([issue #491](https://github.com/gmod/jbrowse/issues/491),
  [@rdhayes](https://github.com/rdhayes))
- Fixed bug where reference sequences with names containing the `:` character
  could not be switched to by typing their name in the search box.
  ([issue #1118](https://github.com/gmod/jbrowse/issues/1118),
  [issue #1119](https://github.com/gmod/jbrowse/pull/1119),
  [@nathanhaigh](https://github.com/nathanhaigh))
- Fixed `setup.sh` behavior when `node` is not installed, printing a decent
  error message. ([issue #1082](https://github.com/gmod/jbrowse/issues/1082),
  [issue #1083](https://github.com/gmod/jbrowse/pull/1083),
  [@cmdcolin](https://github.com/cmdcolin))
