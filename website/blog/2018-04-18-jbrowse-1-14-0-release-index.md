---
layout: post
title: JBrowse 1.14.0 release - iframe-less embedding, BigBed support
date: 2018-04-18
tags: ['Development', 'News', 'Software releases']
---

JBrowse 1.14.0 has been released!

This release includes two major improvements, the first being that it's no
longer strictly necessary to run JBrowse inside an `<iframe>` when embedding it
in another site or webpage. Big thanks to Lacey Sanderson for championing this
feature, and we look forward to working with the Tripal team toward a better
JBrowse integration!

The second major improvement is in displaying data from BigBed files. Not only
can JBrowse can now open BigBed files both locally, and over the web, but it now
natively displays BED-type thick/thin features and feature blocks rather than
converting them to GFF3-style feature hierarchies. This makes both BigBed and
BED fast and responsive. The new BED glyph will also use each feature's RGB
color if it has one.

There are many more features coming that enhance JBrowse's compatibility with
UCSC-format data, stay tuned for future JBrowse releases!

As always, read on below the fold for the full release notes, including minor
improvements and bugfixes.

## Files for download

- [JBrowse-1.14.0.zip](https://github.com/GMOD/jbrowse/releases/download/1.14.0-release/JBrowse-1.14.0.zip) -
  2.8M file SHA1 4538cf147464b52b7edb9bd67a0aff76ba63b3a1
- [JBrowse-1.14.0-dev.zip](https://github.com/GMOD/jbrowse/releases/download/1.14.0-release/JBrowse-1.14.0-dev.zip) -
  7.1M file SHA1 2014b264733cf8cf377ec464eb751726384926df

## Major improvements

- JBrowse now behaves much better when embedded in a webpage without using an
  iframe. See tests/drupal.htm in the JBrowse code for an example of this usage.
  Thanks to [@laceysanderson](https://github.com/laceysanderson) for her
  patiently championing this feature all the way through the long road to
  completion! ([issue #777](https://github.com/gmod/jbrowse/issues/777),
  [issue #844](https://github.com/gmod/jbrowse/pull/844),
  [@cmdcolin](https://github.com/cmdcolin))
- There is a new BigBed store type, for opening BigBed files. An example BigBed
track configuration:
<pre>    [tracks.GENCODE]
    storeClass = JBrowse/Store/SeqFeature/BigBed
    type = CanvasFeatures
    urlTemplate = gencode.bb
    style.label = gene_name,name,id
    style.description = gene_bio_type
</pre>

- JBrowse now has much better support for UCSC-style BED and BigBed features,
  via the new BED glyph type for CanvasFeatures. Rather than rendering a complex
  feature hierarchy like many of the other CanvasFeatures glyphs, the BED glyph
  draws sub-blocks with thick and thin regions, for compatibility with the UCSC
  browser. CanvasFeatures will automatically use the
  `JBrowse/View/FeatureGlyph/UCSC/BED` glyph type if a feature has no
  subfeatures, but has `blockCount` or `thickStart` attributes. This means that,
  in practice, a BigBed file will display very well with just the default
  configuration. Also for compatibility with the UCSC browser, JBrowse will set
  a BED feature's background color if one is included in the feature data (turn
  this off by setting `itemRgb = false`).

## Minor improvements

- The current dataset name is now displayed in the top right portion of the menu
  bar. ([issue #767](https://github.com/gmod/jbrowse/issues/767),
  [@rbuels](https://github.com/rbuels))
- `prepare-refseqs.pl` now accepts a `--gff-sizes` option to allow defining
  reference sequence sizes from the `##sequence-region` directives in a GFF3
  file. [@rbuels](https://github.com/rbuels)
- Some store types now support a `topLevelFeatures` configuration variable,
  which allows tracks to treat certain types of features as 'top-level', even
  the actual track data has them as children of other features. One common use
  case for this would be if you have gene models in a GFF3 structured as
  gene→mRNA→exon/CDS/UTR, but you want to display the "mRNA" features as
  top-level, i.e. ignore the gene container that they are in. Now you can set
  `topLevelFeatures = mRNA` in the track configuration, and the track will
  display only "mRNA" features on the top level, ignoring any other existing
  top-level features, and ignoring the containing "gene" features. This helps
  address what seems to be a common pain point of having to "filter"
  tabix-formatted GFF3 before using it with Apollo. One important caveat is that
  users that configure tracks to use an "out of band" source of feature density
  or coverage data, like a separate wiggle file that shows feature density, will
  have to make sure that the density data is correct for this filter setting if
  they use it. Thanks to [@Yating-L](https://github.com/Yating-L),
  [@nathandunn](https://github.com/nathandunn), and
  [@cmdcolin](https://github.com/cmdcolin) for valuable discussions. Stores that
  support `topLevelFeatures` currently are: GFF3Tabix, GFF3, BED, BEDTabix, GTF,
  and REST ([issue #974](https://github.com/gmod/jbrowse/issues/974),
  [issue #969](https://github.com/gmod/jbrowse/issues/969),
  [@rbuels](https://github.com/rbuels))
- JBrowse can now accept additional configuration from a `data-config` attribute
  on its container element. This is useful for embedding JBrowse in other sites,
  particularly in cases where the JBrowse assets and configuration are stored or
  referenced from a different location from the page displaying the embedded
  JBrowse. For example:
  <pre>
  <div class="jbrowse"
          data-config='"baseUrl": "../jbrowse"'
          id="GenomeBrowser"
          style="height: 600px; width: 100%; padding: 0; border: 0;"
  >
  </div>
  </pre>
  would tell JBrowse to look for its configuration and assets at the relative
  base URL "../jbrowse". [@rbuels](https://github.com/rbuels)
- JBrowse now has a favicon!
  ([issue #973](https://github.com/gmod/jbrowse/issues/973),
  [@rbuels](https://github.com/rbuels))
- Added additional caching code to SequenceChunks and NCList stores, reducing
  duplicate network requests and increasing performance in some circumstances
  ([issue #855](https://github.com/gmod/jbrowse/pull/855),
  [@cmdcolin](https://github.com/cmdcolin))

## Bug fixes

- Fix a bug in which saving exported data to a file was nonfunctional for some
  export data types. [@rbuels](https://github.com/rbuels)
- Fix a bug in which subfeatures were not always fetched correctly when using
  the GFF3Tabix store ([issue #780](https://github.com/gmod/jbrowse/issues/780),
  [@rbuels](https://github.com/rbuels))
- Fixed several bugs with specific cases of relative URLs used in configuration.
  [@rbuels](https://github.com/rbuels)
