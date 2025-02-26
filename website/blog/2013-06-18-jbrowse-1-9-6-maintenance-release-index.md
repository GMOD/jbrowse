---
layout: post
title: JBrowse 1.9.6 maintenance release
date: 2013-06-18
tags: ['Software releases']
---

JBrowse 1.9.6 has been released, with a few more bug fixes and a new `--workdir`
option for `generate-names.pl`.

Files for download:

- [JBrowse-1.9.6.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=55 'download JBrowse-1.9.6.zip') -
  5.1M file SHA1 2d09a47a57c314ed728ae49db9998a6780ad6609
- [JBrowse-1.9.6-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=56 'download JBrowse-1.9.6-dev.zip') -
  26M file SHA1 115abb36a78df4307c87d02b5093f88eb8f43f28 Changes in this
  release:

- Fixed a bug in which the reference sequence selection dropdown menu did not
  work for purely numeric reference sequence names. Thanks to Matt Bomhoff for
  pointing this out.

- Fixed a bug with some types of BAM files in which not all BAM features would
  be displayed. Thanks to Ignazio Carbone for pointing this out. (issue #276).

- Fixed bug in which File->Open failed to open GFF3 files with embedded
  sequences in a FASTA section.

- Added a `--workdir` option to `generate-names.pl` to allow name index building
  on a faster filesystem than the one that will ultimately store the name index.
  Thanks to Alexie Papanicolaou for suggesting this. (issue #273).
