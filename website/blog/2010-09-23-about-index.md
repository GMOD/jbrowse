---
layout: post
title: The JBrowse Genome Browser
date: 2010-09-23
---

JBrowse is a fast, scalable genome browser built completely with JavaScript and HTML5. It can run on your desktop, or be embedded in your website.

## Latest Release - [JBrowse 1.15.1](http://jbrowse.org/jbrowse-1-15-1/)

<div style="margin: -1em 0 1em 0;">

<iframe style="border: 1px solid #505050;" src="?loc=ctgA:9908..32518&tracks=DNA%2CTranscript%2Cvolvox_microarray_bw_density%2Cvolvox_microarray_bw_xyplot%2Cvolvox-sorted-vcf%2Cvolvox-sorted_bam_coverage%2Cvolvox-sorted_bam&data=sample_data%2Fjson%2Fvolvox&highlight=&tracklist=0&highres=2" width="620" height="450"></iframe>
<div style="margin-top: -3px; font-size: 80%;">Note: BAM, VCF, and BigWig tracks not available on Internet Explorer 9 and earlier.</div>
</div>

## Headline Features

*   Fast, smooth scrolling and zooming. Explore your genome with unparalleled speed.
*   Scales easily to multi-gigabase genomes and deep-coverage sequencing.
*   Quickly open and view data files on your computer without uploading them to any server.
*   Supports GFF3, BED, FASTA, Wiggle, BigWig, BAM, CRAM, VCF (with either .tbi or .idx index), REST, and more.  BAM, BigBed, BigWig, and VCF data are displayed directly from chunks of the compressed binary files, no conversion needed.
*   Includes an optional "faceted" track selector ([see demo](/code/latest-release/index.html?data=sample_data/json/modencode "faceted track selector demo - click ")) suitable for large installations with thousands of tracks.
*   Very light server resource requirements. In fact, JBrowse has no back-end server code, it just reads chunks of files directly over HTTP using [byte-range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests). You can serve huge datasets from a single low-cost cloud instance.
*   JBrowse Desktop runs as a stand-alone app on Windows, Mac OS, and Linux.
*   Highly extensible plugin architecture, with a [large registry of plugins](https://gmod.github.io/jbrowse-registry).

## Browser Compatibility

The latest release of JBrowse is tested to work with the following web browsers:

*   Mozilla Firefox (10 and later)
*   Google Chrome (17 and later)
*   Apple Safari (9 and later)
*   Microsoft Internet Explorer (11 and later)
Server-side code, which is used only to pre-generate static data files (no CGI), requires only BioPerl and a few other CPAN modules. The result is a cross-platform AJAX genome browser that is easy to install, embed and customize.

JBrowse is a [GMOD](http://gmod.org/) project.

## Funding

JBrowse development is funded by the [NHGRI](http://genome.gov).

## Citing JBrowse

If you use JBrowse in a project that you publish, please cite the most recent JBrowse paper, which is [here in Genome Research](http://genome.cshlp.org/content/19/9/1630.full "JBrowse: A next-generation genome browser").

### License

JBrowse is released under the GNU LGPL or the Artistic License, see [the JBrowse LICENSE file](/code/latest-release/LICENSE).