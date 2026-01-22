---
layout: post
title: JBrowse 1.12.5 maintenance release
date: 2018-02-28
tags: ['News', 'Software releases']
---

JBrowse 1.12.5 has been released!

## Files for download

- [JBrowse-1.12.5.zip](https://github.com/GMOD/jbrowse/releases/download/1.12.5-release/JBrowse-1.12.5.zip 'download JBrowse-1.12.4.zip') -
  5.7M file SHA19c98ff3939459253011fc3f1922a4de7fd48feda
- [JBrowse-1.12.5-dev.zip](https://github.com/GMOD/jbrowse/releases/download/1.12.5-release/JBrowse-1.12.5-dev.zip 'download JBrowse-1.12.4-dev.zip') -
  30M file SHA1 97ab15f5ad5f3d29b2789e8cff077bf3a9684b86

## Minor improvements

- Safari versions 10 and 11 will now see buttons for downloading feature FASTA
  sequences, as well as other sequences. These were turned off for all Safari
  browsers back when no version of Safari could download a client-generated
  file, but Safari 10 and 11 support it now. Thanks to
  [@kkara](https://github.com/kkara) for noticing the button was missing and
  prodding us to look into it.
  ([issue #714](https://github.com/gmod/jbrowse/issues/714),
  [@rbuels](https://github.com/rbuels))
- Changed the default color for HTMLFeatures features to be a darker gray that
  is easier to see. Many thanks to [@colindaven](https://github.com/colindaven)
  for the fix! ([issue #980](https://github.com/gmod/jbrowse/pull/980),
  [@colindaven](https://github.com/colindaven))
- Added the ability to manually specify a reference sequence ordering in the
  configuration. Users can now set `refSeqOrder: "by_list"` and then set
  `refSeqOrderList: "ctgX,ctgY,ctgZ"` to manually specify an ordering. Thanks to
  [@dsenalik](https://github.com/dsenalik),
  [@liub1993](https://github.com/liub1993),
  [@wkpalan](https://github.com/wkpalan), and
  [@cmdcolin](https://github.com/cmdcolin) for valuable discussions about this,
  and [@rdhayes](https://github.com/rdhayes) for the prototype implementation.
  ([issue #867](https://github.com/gmod/jbrowse/issues/867),
  [issue #919](https://github.com/gmod/jbrowse/issues/919),
  [issue #1007](https://github.com/gmod/jbrowse/pull/1007),
  [@rdhayes](https://github.com/rdhayes))
- Added a `--noSort` option to `prepare-refseqs.pl` that preserves the reference
  sequence ordering in the input file, instead of sorting the reference
  sequences alphabetically in the JSON. Thanks to
  [@dsenalik](https://github.com/dsenalik) for the prototype implementation of
  this, and [@cmdcolin](https://github.com/cmdcolin) and
  [@rdhayes](https://github.com/rdhayes) for valuable discussions.
  ([issue #925](https://github.com/gmod/jbrowse/issues/925),
  [issue #924](https://github.com/gmod/jbrowse/pull/924),
  [issue #1007](https://github.com/gmod/jbrowse/pull/1007),
  [@dsenalik](https://github.com/dsenalik))
- Feature tracks now support a `showNoteInAttributes` flag that force the
  feature's `Notes` attribute to be displayed as a regular attribute in the
  feature detail popup. This is to support the case in which users want the blue
  description text on a feature to be different from the feature's `Notes`
  attribute, but still display the `Notes` attribute in the detail dialog.
  Thanks to [@loraine-gueguen](https://github.com/loraine-gueguen) and
  [@cmdcolin](https://github.com/cmdcolin) for the idea and the implementation.
  ([issue #885](https://github.com/gmod/jbrowse/pull/885),
  [@cmdcolin](https://github.com/cmdcolin))
- When users click on an item in the dropdown autocompletion for the browser
  search box, the browser will go directly to that item immediately, eliminating
  the extra step of the user having to click "Go". Many thanks to
  [@enuggetry](https://github.com/enuggetry) for noticing the opportunity for
  this nice usability enhancement!
  ([issue #616](https://github.com/gmod/jbrowse/issues/616),
  [issue #1001](https://github.com/gmod/jbrowse/pull/1001),
  [@rbuels](https://github.com/rbuels))
- The global `highResolutionMode` configuration is now set to `auto`, meaning
  that JBrowse by default will now auto-detect high-DPI displays (Apple Retina
  displays and similar) and draw canvas-based tracks more clearly on them. This
  capability has been present in the JBrowse code for a long time, but has been
  turned off by default. ([@rbuels](https://github.com/rbuels))
- Added support for two new configuration variables for SNPCoverage tracks:
  `indicatorProp` and `indicatorDepth`, which set the minimum proportion
  (indicatorProp) and minimum depth (indicatorDepth) of alternative alleles
  required to render the SNP indicator below a SNPCoverage track. Big thanks to
  Nathan Haigh for the idea and implementation!
  ([issue #951](https://github.com/gmod/jbrowse/pull/951),
  [@nathanhaigh](https://github.com/nathanhaigh))
- Added a basic loading screen for when the page is initially loading
  ([issue #1008](https://github.com/gmod/jbrowse/pull/1008),
  [@cmdcolin](https://github.com/cmdcolin))
- The `subfeatureDetailLevel` configuration variable for tracks now defaults to
  a value of 2, meaning that the builtin JBrowse default feature detail popup
  dialogs will only show one level of subfeatures by default. Most feature
  tracks have only one level of subfeatures anyway, but for very complex data
  (like gene models with many transcripts, each with many introns and exons),
  this new default will prevent a rather confusing problem some users were
  seeing in which JBrowse would seem to 'hang' when clicking a gene model to see
  its details. Thanks to [@cmdcolin](https://github.com/cmdcolin) for the
  original implementation of the `subfeatureDetailLevel` configuration variable,
  [@kshefchek](https://github.com/kshefchek) for a good bug report that shows
  it, and [@nathandunn](https://github.com/nathandunn) and
  [@selewis](https://github.com/selewis) for valuable discussions.
  ([issue #559](https://github.com/gmod/jbrowse/issues/559),
  [issue #1010](https://github.com/gmod/jbrowse/pull/1010),
  [@rbuels](https://github.com/rbuels))

## Bug fixes

- Fixed a security issue with JBrowse error messages. Thanks to
  [@GrainGenes](https://github.com/GrainGenes) for noticing and reporting it!
  ([issue #602](https://github.com/gmod/jbrowse/issues/602),
  [@rbuels](https://github.com/rbuels))
- Fixed an off-by-one error in the "Next segment position" field of BAM
  features. Thanks to [@keiranmraine](https://github.com/keiranmraine) for
  reporting it, and [@rdhayes](https://github.com/rdhayes) for tracking down the
  fix! ([issue #907](https://github.com/gmod/jbrowse/issues/907),
  [issue #986](https://github.com/gmod/jbrowse/pull/986),
  [@rdhayes](https://github.com/rdhayes))
- Fixed the broken demo track data source in the modENCODE sample data. Thanks
  to [@cmdcolin](https://github.com/cmdcolin) for the fix!
  ([issue #999](https://github.com/gmod/jbrowse/pull/999),
  [@cmdcolin](https://github.com/cmdcolin))
- Fixed bug in which dragging an Alignments or Alignments2 track into a
  combination track caused the combination track to crash.
  ([issue #771](https://github.com/gmod/jbrowse/issues/771),
  [@cmdcolin](https://github.com/cmdcolin))
- Feature detail dialogs for variant tracks now correctly display "no-call" in
  the genotype details table for "./." alleles. Thanks to
  [@carrere](https://github.com/carrere) for reporting it, and
  [@cmdcolin](https://github.com/cmdcolin) for the fix.
  ([issue #980](https://github.com/gmod/jbrowse/issues/980),
  [issue #990](https://github.com/gmod/jbrowse/pull/990),
  [@cmdcolin](https://github.com/cmdcolin))
- Fix parsing of the END field in VCF tracks, enabling things like CNV and
  deletion variants to be visualized from variant tracks.
  ([issue #847](https://github.com/gmod/jbrowse/pull/847),
  [@cmdcolin](https://github.com/cmdcolin))
- Fixed a long-standing bug in JBrowse configuration template parsing that
  prevented use of dot-notation nested variable names, e.g. `{foo.bar}`, in
  JBrowse configuration, as well as whitespace inside the braces. Big thanks to
  [@wuroger](https://github.com/wuroger) for finding this bug.
  ([issue #1012](https://github.com/gmod/jbrowse/issues/1012),
  [@rbuels](https://github.com/rbuels))
