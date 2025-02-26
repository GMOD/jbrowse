---
layout: post
title: JBrowse 1.9.5 maintenance release
date: 2013-06-12
tags: ['Software releases']
---

JBrowse 1.9.5 has been released, with some small new features, and fixes for
many small issues.

Files for download:

- [JBrowse-1.9.5.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=53 'download JBrowse-1.9.5.zip') -
  5.1M file SHA1 4972e99e345e0a31261dc0d14a15eb6a114aae7f
- [JBrowse-1.9.5-dev.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=54 'download JBrowse-1.9.5-dev.zip') -
  26M file SHA1 a388bb29210fea0deade3d8ea80985323f37c398 Changes in this
  release:

- Added a `trackSelector.initialSortColumn` configuration variable to the
  faceted track selector that can be used to set the initial sort order for the
  grid in the faceted track selector. Thanks to Alexie Papanicolaou for
  suggesting this.

- Made Wiggle density tracks indicate out-of-range values using separate clip
  markers at the top and bottom of the color field, rather than showing the
  out-of-range region as a third color (or black or white). Thanks to Gregg Helt
  for suggesting this.

- Added support for a `quickHelp` configuration variable that lets
  administrators customize the contents of the Help->General dialog. Thanks to
  Gregg Helt for suggesting this.

- Rewrote GFF3 direct-access backend to make it more standards-compliant and
  capable of parsing all attributes of a feature. Thanks to Jillian Rowe and
  Colin Davenport for pointing out the need for this.

- Fixed arrowheads on HTMLFeatures not always being visible when the viewing
  region is being panned back and forth. Thanks to Gregg Helt for pointing this
  out.

- Fixed a bug in which editing a track's configuration JSON through the track
  menu when the faceted track selector was enabled sometimes caused another
  track to be deactivated. Thanks to Steffi Geisen for pointing this out.

- Fixed a subtle bug in which not completing a track-dragging gesture from the
  Simple track selector into the genome view caused the track handle to not
  disappear from the track selector when the track is turned on later. Thanks to
  Gregg Helt for pointing this out.

- Fixed a bug in which `prepare-refseqs.pl` can crash when used with
  Bio::DB::Das::BioSQL. Thanks to Brian Osborne for contributing the fix.

- Fixed failures of setup.sh legacy BAM support installation caused by samtools
  taking down their old SourceForge subversion repository.

- Fixed a bug in which highlighted regions were not always drawn correctly at
  initial load time. Thanks to Steffi Geisen for pointing this out.

- Added support for a `plugins->[]->location` configuration attribute, making it
  possible for plugins to be loaded from outside the JBrowse plugins directory.

- Fixed a bug in which Wiggle track value displays behaved a bit oddly with some
  kinds of mouse movements. Thanks to Gwendoline Andres for pointing this out.

- Added a `logMessages` global configuration variable that, if set to true,
  records messages on the JBrowse message bus in the browser log.

- Added a workaround for problems with some types of nonstandard Perl
  installations. Thanks to Rebecca Boes for pointing this out.
