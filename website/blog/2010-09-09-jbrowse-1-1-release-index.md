---
layout: post
title: JBrowse 1.1 release
date: 2010-09-09
tags: ['Release 1.1', 'Software releases']
---

JBrowse version 1.1 is released! You can find the code here:

[http://jbrowse.org/releases/jbrowse-1.1.zip](http://jbrowse.org/releases/jbrowse-1.1.zip)

Release notes and screenshots below the fold.

<span id="more-56"></span>**JBrowse release notes, version 1.1,
September 2010.**

These notes document JBrowse developments in the period from July 2009 (online
publication of the first JBrowse paper in Genome Research, the de facto "version
1.0") up to September 2010 (the first in a planned series of quarterly
releases).

New features in this release:

- [![](http://jbrowse.org/wordpress/wp-content/uploads/2010/09/bam-screenshot.png) ](bam-screenshot.png)Scalability.
  JBrowse can now handle very large data tracks, including human EST/SNP tracks,
  or tracks of next-gen sequence reads. Large datasets are broken into smaller
  chunks, so there is no loading delay for big tracks.
- [![](http://jbrowse.org/wordpress/wp-content/uploads/2010/09/arc-screenshot.png)](arc-screenshot.png)Extensibility.
  A Perl module (ImageTrackRenderer.pm) for creating user-drawn image tracks is
  now available, based on the CPAN GD.pm module. An example program is provided,
  draw-basepair-track.pl, that uses this module to draw arcs over a sequence
  representing the base-pairing interactions of RNA secondary structure.
- Bug fixes. Numerous display glitches have been fixed, including issues with
  wide-screen monitors and long mostly-offscreen features.

Known issues/limitations with this release:

- No JSON-level backward compatibility. If you are upgrading from an older
  version of JBrowse, you will have to regenerate all the JSON files on your
  server. This means wiping your jbrowse/data directory and re-running all
  server scripts (flatfile-to-json, biodb-to-json, wig-to-json, etc.) to
  regenerate your data from the original FASTA/GFF/BED/WIG files.
- Next-gen sequence display is currently restricted to the co-ordinates of the
  outermost region to which a single read is mapped. There is no support (yet)
  for displaying pairing between reads, sequences of reads, alignment of read to
  reference sequence (e.g. splicing), or mismatches between read and reference.
- Processing SAM/BAM next-gen sequence files takes a lot of memory (about 500
  megabytes per million features).
- Numerical (as opposed to comparative) readout of the data in Wiggle tracks,
  e.g. via a y-axis label or mouseover popup, is still unsupported.
