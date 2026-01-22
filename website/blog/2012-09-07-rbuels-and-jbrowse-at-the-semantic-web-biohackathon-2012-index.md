---
layout: post
title: @rbuels and JBrowse at the Semantic Web BioHackathon 2012
date: 2012-09-07
tags: ["Development"]
---

I had the great honor of being invited to the [BioHackathon 2012](BioHackathon
2012), held this past week in Toyama, Japan and funded by Japan's National
Bioscience Database Center ([NBDC](http://biosciencedbc.jp/?lng=en)) and
Database Center for Life Science ([DBCLS](http://dbcls.rois.ac.jp/en/)). It's
been an exhausting week of immersing myself in Semantic Web technologies: RDF,
[SPARQL](http://www.w3.org/TR/sparql11-query/),
[SADI](http://sadiframework.org), and lots and lots of ontologies. A lot of work
still needs to be done, but there really are revolutionary capabilities coming
to bioinformatics from this direction.

At the hackathon, I worked on a SPARQL-based data backend for JBrowse, which
will be released as part of the upcoming JBrowse 1.7.0. It is shaping up to be
surprisingly fluid, especially given the less-than-speedy reputation of today's
triple stores.

Until it is merged into master, work on the JBrowse triple store can be seen at
[https://github.com/GMOD/jbrowse/compare/master...triplestore](https://github.com/GMOD/jbrowse/compare/master...triplestore)
