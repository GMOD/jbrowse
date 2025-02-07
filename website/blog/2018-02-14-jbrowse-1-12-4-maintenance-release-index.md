---
layout: post
title: JBrowse 1.12.4 maintenance release
date: 2018-02-14
tags: ['News', 'Software releases']
---

JBrowse 1.12.4 has been released, with a great many improvements and bugfixes!
Apologies for the long delay since the last release.

One highlight of this release is that we have fixed a severe incompatibility
that prevented many of the JBrowse formatting scripts from running correctly on
Perl 5.18 and above.

However, there have been a HUGE number of smaller improvements and bugfixes,
have a look at the release notes below!

## Files for download

- [JBrowse-1.12.4.zip](https://github.com/GMOD/jbrowse/releases/download/1.12.4-release/JBrowse-1.12.4.zip) -
  5.7M file SHA1 9c3b88d982ceb86de9999e49ddde631d6b41a28f
- [JBrowse-1.12.4-dev.zip](https://github.com/GMOD/jbrowse/releases/download/1.12.4-release/JBrowse-1.12.4-dev.zip) -
  30M file SHA1 bb3fa872cbc57055712114e3e01cdcad6776a3b6

## Minor improvements

- Fixed SEVERE performance regression that basically made flatfile-to-json.pl
  unusable on Perl 5.18 and higher. Huge thanks to Colin Diesh for tracking this
  down. ([issue #470](https://github.com/gmod/jbrowse/issues/470),
  [issue #912](https://github.com/gmod/jbrowse/pull/912),
  [@cmdcolin](https://github.com/cmdcolin))
- Added code to calculate feature density histograms for Tabix-indexed GFF3
  (`GFF3Tabix`) data sources. Thanks to
  [@nathandunn](https://github.com/nathandunn) for noticing and fixing this!
  ([issue #956](https://github.com/gmod/jbrowse/pull/956),
  [@nathandunn](https://github.com/nathandunn))
- Added a new "Hide unspliced reads" menu item to Alignments and Alignments2
  tracks that filter out reads that have no `N`s in their CIGAR strings. Thanks
  to Deepak Kunni and Nathan Dunn for their work on this.
  ([issue #921](https://github.com/gmod/jbrowse/pull/921),
  [@deepakunni3](https://github.com/deepakunni3))
- setup.sh now uses npm instead of Bower (which is deprecated) to install
  dependencies. [@enuggetry](https://github.com/enuggetry)
- Removed legacy `wig-to-json.pl` and `bam-to-json.pl` scripts.
  [@rbuels](https://github.com/rbuels)
- Added a `--trackConfig` option to `prepare-refseqs.pl` to allow injecting
  refseq configuration variables at format time.
  ([issue #884](https://github.com/gmod/jbrowse/pull/884),
  [@erasche](https://github.com/erasche))
- Added trackLabels: "no-block" config feature. Moves track labels/menus above
  the features so as not to obscure the features.
  ([issue #901](https://github.com/gmod/jbrowse/issues/901), #490)
- Added a `--category` option to `add-bw-track.pl` and `add-bam-track.pl` to set
  the new track's category. Thanks to
  [@loraine](https://github.com/loraine)-gueguen for the implementation!
  ([issue #911](https://github.com/gmod/jbrowse/pull/911),
  [@loraine](https://github.com/loraine)-gueguen)
- Made jbrowse installable using `npm`. [@cmdcolin](https://github.com/cmdcolin)
  and [@enuggetry](https://github.com/enuggetry).
- Implemented a built-in node.js Express server `jb_run.js` for quick JBrowse
  launching. [@enuggetry](https://github.com/enuggetry)
- Added an `--unsorted` option to `prepare-refseqs.pl` that formats reference
  sequences in the same order in which they appear in the input sequence file.
  Thanks to [@dsenalik](https://github.com/dsenalik) for the suggestion and
  implementation! ([issue #924](https://github.com/gmod/jbrowse/pull/924),
  [@dsenalik](https://github.com/dsenalik))
- Allows for dot-notation instead of JSON
  ([issue #952](https://github.com/gmod/jbrowse/pull/952)) for addTracks,
  addBookmarks, and addStores. https://github.com/GMOD/jbrowse/pull/952. Address
  security concerns adding JSON to GET
  (https://nvd.nist.gov/vuln/detail/CVE-2016-6816)
  [@nathandunn](https://github.com/nathandunn).
- If a track has no `key` set in its track configuration, JBrowse will now look
  for a `key` in its track metadata, and use that if it is present. Thanks to
  Loraine Guéguen for the idea
  ([issue #957](https://github.com/gmod/jbrowse/issues/957),
  [issue #958](https://github.com/gmod/jbrowse/pull/958)).
  [@rbuels](https://github.com/rbuels)
- Fixed bug in `maker2jbrowse` script that allows `maker2jbrowse` to be
  installed in system executable directories, and adds a `--sortMem` option.
  ([issue #877](https://github.com/gmod/jbrowse/pull/877),
  [@cmdcolin](https://github.com/cmdcolin))
- Fixed a cosmetic/styling bug with malformed DOM structure in feature detail
  popup dialogs. Thanks to Erik Rasche for noticing and fixing this!
  ([issue #882](https://github.com/gmod/jbrowse/pull/882),
  [@erasche](https://github.com/erasche))
- Added a configuration option that can disable JBrowse's behavior of updating
  the browser's title text as the view changes. Thanks to Luka Jeran, Primož
  Hadalin, and Nathan Dunn for this!
  ([issue #904](https://github.com/gmod/jbrowse/pull/904),
  [@lukaw3d](https://github.com/lukaw3d))
- Suppress execution of biodb-to-json.pl on sample data while running setup.sh
  on MacOS High Sierra with stock Perl due to an issue with the stock Perl
  having broken BerkeleyDB integration, which is needed by
  Bio::DB::SeqFeature::Store, the main storage engine used by biodb-to-json.pl.
  Bug was manifesting as the script running indefinitely and taking all
  available disk space. ([issue #945](https://github.com/gmod/jbrowse/pull/945),
  [issue #946](https://github.com/gmod/jbrowse/issues/946),
  [@deepakunni3](https://github.com/deepakunni3) and
  [@rbuels](https://github.com/rbuels))
- Mitigate race condition that could sometimes cause duplicate tracks to be
  shown when the browser is started with the `loc` query parameeter set to the
  name of a feature. Thanks to Colin Diesh for the fix.
  ([issue #567](https://github.com/gmod/jbrowse/issues/567),
  [@cmdcolin](https://github.com/cmdcolin))
- Fixed issue in which JBrowse crashed when negative numbers were supplied for
  highlight coordinates in the URL. Thanks to
  [@h2akim](https://github.com/h2akim) for reporting, and
  [@cmdcolin](https://github.com/cmdcolin) for debugging help.
  ([issue #769](https://github.com/gmod/jbrowse/issues/769),
  [@rbuels](https://github.com/rbuels))
- Add `--config` command-line option to `add-bw-track.pl` and `add-bam-track.pl`
  scripts. Thanks to Chris Childers for suggesting this!
  ([issue #620](https://github.com/gmod/jbrowse/issues/620),
  [@rbuels](https://github.com/rbuels))
- Fixed a "cannot read property 'offsetLeft'" error when using touch screens
  without the old simple track selector active.
  ([issue #893](https://github.com/gmod/jbrowse/issues/893),
  [@rbuels](https://github.com/rbuels))
- Upgraded to use new Google Analytics API for usage reporting.
  ([@rdhayes](https://github.com/rdhayes))
- Fixed bug in which start/stop codons were sometimes not displayed in the
  sequence track at certain zoom levels
  ([issue #858](https://github.com/gmod/jbrowse/issues/858), pull req #859,
  [@cmdcolin](https://github.com/cmdcolin))
- Fixed a regression in which the `defaultTracks` configuration variable was no
  longer respected when set to a comma-separated list.
  ([issue #892](https://github.com/gmod/jbrowse/issues/892),
  [issue #896](https://github.com/gmod/jbrowse/pull/896),
  [@rdhayes](https://github.com/rdhayes))
- Made a cosmetic change to Alignments track detail popups, changing "Length on
  ref" to be displayed as "Seq length on ref", so that it is displayed more
  usefully next to "Seq length". Thanks to
  [@colindaven](https://github.com/colindaven) for the suggestion and
  implementation! ([issue #939](https://github.com/gmod/jbrowse/pull/939),
  [@colindaven](https://github.com/colindaven))
- Improved the error messages displayed when a JBrowse glyph class fails to
  load. Thanks to [@scottcain](https://github.com/scottcain) and
  [@cmdcolin](https://github.com/cmdcolin) for tracking down the issue and
  improving the error handling!
  ([issue #968](https://github.com/gmod/jbrowse/issues/968),
  [@cmdcolin](https://github.com/cmdcolin))
- Added support for an `addFeatures` URL query parameter that can inject
  features from the URL query string.
  ([issue #976](https://github.com/gmod/jbrowse/issues/976),
  [@nathandunn](https://github.com/nathandunn))
- Changed the project's `git` workflow to utilize a `dev` branch that is
  separate from `master`, with `master` only being updated when a new release of
  JBrowse is published.
  ([issue #975](https://github.com/gmod/jbrowse/issues/975),
  [@enuggetry](https://github.com/enuggetry))
- Implemented automated deployment of JBrowse releases to GitHub releases and
  `npm`. Thanks to [@abretaud](https://github.com/abretaud),
  [@nathandunn](https://github.com/nathandunn),
  [@erasche](https://github.com/erasche), and
  [@cmdcolin](https://github.com/cmdcolin) for valuable discussions.
  ([issue #822](https://github.com/gmod/jbrowse/issues/822),
  [issue #979](https://github.com/gmod/jbrowse/pull/979),
  [issue #984](https://github.com/gmod/jbrowse/pull/984),
  [@rbuels](https://github.com/rbuels))
- Added a `--bigwigCoverage` option to `add-bam-track.pl` to support configuring
  pregenerated coverage histograms from the command line. Thanks to
  [@loraine](https://github.com/loraine)-gueguen for the suggestion and
  implementation! ([issue #972](https://github.com/gmod/jbrowse/pull/972),
  [@loraine](https://github.com/loraine)-gueguen)
- Improved documentation of the `CategoryURL` plugin.
  ([issue #985](https://github.com/gmod/jbrowse/pull/985),
  [@enuggetry](https://github.com/enuggetry))
