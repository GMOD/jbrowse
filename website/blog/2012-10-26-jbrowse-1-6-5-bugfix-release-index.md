---
layout: post
title: JBrowse 1.6.5 bugfix release
date: 2012-10-26
tags: ['Software releases']
---

I'm pleased to announce the release of JBrowse 1.6.5, containing some small new
features, plus fixes for some issues in the
[1.6.4 release](http://jbrowse.org/jbrowse-1-6-4-bugfix-release/ 'JBrowse 1.6.4 bugfix is also coming along very soon, with a (we hope!) very impressive set of new features.  Stay tuned.release').

Files for download:

- [JBrowse-1.6.5-min.zip](/wordpress/wp-content/plugins/download-monitor/download.php?id=23 'download JBrowse-1.6.5-min.zip') -
  2.8M
- [JBrowse-1.6.5-full.zip](http://jbrowse.org/wordpress/wp-content/plugins/download-monitor/download.php?id=24 'download JBrowse-1.6.5-full.zip') -
  27.3M Changes in this release:

- The location box now shows the **length of the currently visible** ** region**
  in parentheses. For example: `ctgB:1244..3566 (2.32 Kb)`. Thanks to Karsten
  Hokamp for the suggestion!
- The **arrow keys** on the keyboard can now be used to pan and scroll around
  the genome view.
- Wiggle track mouseover cursors now display the score with only 6 significant
  digits, avoiding confusion over approximations introduced by scores being
  converted to IEEE floating-point numbers (as for BigWig files) and back to
  text.
- The faceted track selector now renders any HTML that may be present in the
  track metadata by default. To turn this off, it now accepts an
  `escapeHTMLInData` option that, if set to `true` or `1`, will not render the
  HTML, but will instead display the raw code (issue #145).
- Upgraded to a more recent version of jszlib, which contains some important
  bugfixes (issue #157).
- Fixed bug dealing with very large regions with the same value in canvas-based
  Wiggle tracks (also issue #157).
- `prepare-refseqs.pl` now by default uses a **more scalable directory** **
  structure for storing sequences**. This fixes problems some users were
  experiencing with large numbers of reference sequences (issue #139).
- `ucsc-to-json.pl` now supports a `--primaryName` option allowing the users to
  **alter which UCSC data field is displayed by JBrowse as** ** the primary
  name** of the features in a track. Also, `ucsc-to-json.pl` now treats as
  indexable names all UCSC data columns called "name", "alias", or "id" followed
  by zero or more digits. Thanks to Steffi Geisen for this suggestion.
- Fixed "Duplicate specification" warnings coming from `flatfile-to-json.pl` and
  `remove-track.pl`.
- Fixed bugs in which both the first few and the last few bases of a reference
  sequence were not displaying correctly in a DNA track.
