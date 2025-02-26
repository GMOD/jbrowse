---
layout: post
title: JBrowse 1.2 released
date: 2011-02-17
tags: ['Software releases']
---

New JBrowse release! This is version 1.2, which makes the server-side scripts
much more scalable, includes a script for importing UCSC database dumps into
JBrowse, and integrates Juan Aguilar's touch code for the iPad/iPhone. Code is
here:

[http://jbrowse.org/releases/jbrowse-1.2.zip](http://jbrowse.org/releases/jbrowse-1.2.zip)

### Release Notes:

**version 1.2**, Febrary 2011

These notes document changes since release 1.1 in September 2010. (Release Notes
for 1.1 are [here](http://jbrowse.org/?p=56).)

Most of the work in this release went into making JBrowse handle **large amounts
of feature data** better. Before, the amount of memory used when processing BAM
files was more than 10 times the size of the file; now, the amount of memory
required is fixed.

Other new features in this release:

- **Import of UCSC database dumps.** A ucsc-to-json.pl script is now provided
  for taking database dumps from UCSC and creating a JBrowse instance using
  them. The "genePred" and "bed" track types are currently supported; "psl"
  tracks are not yet supported.
- **Touch.** Juan Aguilar's code for using JBrowse on an iOS device (iPhone,
  iPod touch, iPad) is now integrated. As of the current release, users wanting
  to use JBrowse on those devices have to navigate to a separate HTML page
  (touch.html) rather than the default index.html; i.e. the code does not
  currently detect touchscreen devices automatically.
- **Bug fixes.** A number of bugs have also been fixed, including one that
  restricted the placement of the "data" directory, and a bug in wiggle
  rendering that caused spurious peaks or troughs at tile boundaries. Known
  issues/limitations with this release:

- Some additional CPAN modules are now required:

PerlIO::gzip Heap::Simple Devel::Size

- No JSON-level backward compatibility. If you are upgrading from an older
  version of JBrowse, you will have to regenerate all the JSON files on your
  server. This means wiping your jbrowse/data directory and re-running all
  server scripts (flatfile-to-json, biodb-to-json, wig-to-json, etc.) to
  regenerate your data from the original FASTA/GFF/BED/WIG files. We apologize
  for the inconvenience of this, but it is inevitable sometimes; we do aim to
  minimize the number of releases which are backwardly-incompatible in this way.
