---
layout: post
title: JBrowse tarball for hg19 human genome data
date: 2010-11-11
tags: ['Data releases']
---

Something we get asked for a lot is **data releases:** tarballs of JBrowse JSON
pre-generated from widely-used datasets, ready for you to plonk on your
webserver, unzip, and serve to the world (perhaps after adding your own tracks,
or making other modifications).

Data releases are good because they make it even easier to deploy JBrowse on
your website, while illustrating what we consider best practices in using the
JBrowse setup scripts.

Doing this right takes time, but it didn't seem fair in the meantime to deprive
people of the JSON files we've generated to run our demos. Particularly the
[human genome demo](http://jbrowse.org/ucsc/hg19/) -- there have been several
requests for the data files underpinning that.

So, without further ado,
[here is a tarball of the UCSC hg19 annotation tracks](http://jbrowse.org/releases/jbrowse-1.2.1-hg19mini.tar.gz).
At least, some of them: we've tried to keep this tarball small. It's 62
megabytes compressed; 330 megabytes uncompressed; it has the smallest 27
annotation tracks, and in order to keep the size down, we didn't include actual
sequence (just the locations of features like genes).

This demo should not be considered a final-quality data release. Some things
aren't set up as nicely as we'd like; for example, the outgoing links from
features. However, if you're interested in exploring using JBrowse for human
applications (e.g. like [genomesunzipped](http://jbrowse.org/?p=108)), this
might help get you started.

(**Update 2010/11/23**: a bug in the tarball has been fixed; the link above now
points to the fixed version)

(**Update 2012/3/22**: updated again to point to hg19mini on JBrowse 1.2.1)
