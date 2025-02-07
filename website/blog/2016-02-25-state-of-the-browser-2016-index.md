---
layout: post
title: State of the Browser, 2016
date: 2016-02-25
tags: ['Development', 'News', 'Roadmap']
---

It's been a while since we posted on here[\*](#asterisk), and while the
JBrowse-o-sphere has not been silent (there's been plenty of chatter on the
[gmod-ajax](https://lists.sourceforge.net/lists/listinfo/gmod-ajax) mailing list
and the GitHub [issues tracker,](https://github.com/gmod/jbrowse/issues) for
example) we think it's high time for an update on the main site.

In part, this update is triggered by the (near-)completion of a
state-of-the-JBrowse paper, which should be published soon. That paper describes
what's been happening in JBrowse over the past few years, code-wise. You can get
a sense of that from the
[release notes](https://github.com/GMOD/jbrowse/blob/master/release-notes.txt).
The (complementary) goal of this blog post is to give some idea of the direction
we're headed in.

### Kicking the Perl Habit

JBrowse was the spiritual child of [GBrowse](http://gmod.org/wiki/GBrowse), and
GBrowse was built on the good ship Perl. Sadly, those days belong to a glorious
past that has not yet been resurrected in the name of vintage kitsch. Speaking
as a hacker who still dreams in Perl (and sometimes talks to myself in Perl
while riding the train) I'm
<span style="text-decoration: underline;">proud</span> to be a national monument
and I'd be happy to share my memories of the 80's with you... but even I have to
admit that I teach Python to my undergrads these days. They need jobs.

The ancient Perl timbers that support JBrowse are showing their age; and that's
why we've been adding more and more features that allow the JBrowse client to
leave its BioPerl exoskeleton behind. Most of that exoskeleton is oriented
toward slurping data out of object relational databases like
[Chado](http://gmod.org/wiki/Chado_-_Getting_Started), or from flatfiles, so as
to generate JBrowse-specific JSON-based index files (using
[Nested Containment Lists](http://www.ncbi.nlm.nih.gov/pubmed/17234640)) that
allow the client to do fast range queries on feature sets.

Fans of Chado need not worry: the JBrowse distribution will keep that
functionality around, but the Perl part is less fundamental: the JavaScript
client can load many file formats natively now, and can make use of other (more
standard) indices, like [tabix](http://www.htslib.org/doc/tabix.html) and
[faidx](http://www.htslib.org/doc/samtools.html) in SAMTools.

A direct benefit of this is that it's possible to use JBrowse like a desktop
browser, opening local files directly; either by firing up a web browser and
pointing it at a JBrowse instance, or by using the new
[desktop version](http://jbrowse.org/jbrowse-1-12-0/) of JBrowse (built using
[Electron](http://electron.atom.io/)). The reduced dependency on
JBrowse-specific indexing scripts also makes it conceptually a little simpler to
feed data to a JBrowse instance from a server.

### Repos, Man

Several plugins have been developed for JBrowse and Apollo (indeed, Apollo
itself is also a plugin) and there are more on the way, both from our team and
from third parties. To help admins find cool plugins, we are developing a plugin
repository which will allow developers to register their plugins at jbrowse.org.

We are also close to publishing a registry of publicly accessible JBrowse
instances. Over the past year, our analytics suggest that there are at least
2,600 active JBrowse hosts out there. Keeping a central, accessible list of
active instances will help model organism databases and other small genome
projects become more "discoverable".

### Fresh Tracks

We're constantly adding new kinds of track, and there are several in the
pipeline. The latest release has
[NeatFeatures](http://jbrowse.org/jbrowse-1-12-0/), which finally brings intron
hat cartoons to JBrowse.

Mitch Skinner, the visionary and pragmatist who was the first full-time lead dev
of JBrowse, once said that _"HTML can draw any shape you want, as long as it's a
rectangle"_. Well, that may have been true back in the day, but
[97% of web users](http://www.w3counter.com/globalstats.php) now have Canvas
support (and 99.9% of JBrowse users), and we feel comfortable drawing some
diagonal lines.

We're also working on SVG-based tracks that remove some of the ancient legacy
limitations imposed on track classes, and can play nicely with
[d3](https://d3js.org/) for some truly cool viz. Watch for new SVG-based tracks
for visualizing population-level variation in the near future.

### Tips for the Server

JBrowse can be described as a
[static site generator](https://davidwalsh.name/introduction-static-site-generators):
after running the indexing tools, you don't need to execute any code on the
server. Just serve up the indices to the client as static files, and you're set.
This has some important benefits, notably for performance (it relieves the
processing burden on the server and makes distributed servers much easier) and
security (e.g. you can in principle use a super-secure webserver like
[publicfile](https://cr.yp.to/publicfile.html)). However, it's also limiting for
some applications.

There's nothing stopping admins from setting up JBrowse as part of a larger
dynamic web application, and there are plenty of hooks in the JavaScript code
that allow developers to interface to dynamic code. However, up until this
point, a systematic "recommended" way to write dynamic JBrowse apps has been
lacking.

That's going to change soon: JBrowse is finally growing a server-side. Although,
in keeping with our general philosophy about how to do things on the
bioinformatics web, our approach to this will be minimal -- and compatible with
a wide range of different back-ends.

We're going to begin with basic infrastructure that most server applications
will need: specifically,
[pub-sub](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern)
messaging for notifying the client of updates. We then want to build some
analysis capabilities into JBrowse -- or, more precisely, hook JBrowse up to
existing analysis engines. Everyone's favorite workflow manager
[Galaxy](https://usegalaxy.org/) will be top of the list. As usual (and this is
something we view as a good sign), the community has gotten there before us:
[Eric Rasche](https://github.com/erasche), who also built an excellent Docker
image for JBrowse, has developed a
[JBrowse Galaxy tool](https://github.com/galaxyproject/tools-iuc/pull/507),
which we will certainly be hoping to build on.

We recognize that there are other web-based job control shells apart from
Galaxy, and some (e.g. [iPlant](http://www.iplantcollaborative.org/)) are
already working with JBrowse. Our current plan is to write a (thin) abstraction
layer that allows JBrowse to talk to Galaxy or other web shells for job control.

### Dashes and Mashes

We think a big part of the future of JBrowse is in building rich, integrated
bioinformatics web apps of which the genome browser is just one component. The
kind of thing that used to be called a
[mashup](https://en.wikipedia.org/wiki/Mashup_%28web_application_hybrid%29) but
now (rather more professionally and stylishly) is known as a
[dashboard.](https://www.pinterest.com/explore/dashboard-design/)

OK, technically mashups and dashboards are different: a mashup combines
visualizations of multiple data sources, while a dashboard combines multiple
controls in a single interface. Bioinformatics web apps, though, typically do
both.

Some examples of what one might do with this sort of hybrid:

- a phylogeography dashboard, combining genome/popgen views with geographical
  views (e.g. Google Maps)
- a systems biology dashboard, combining genome view with gene network/ontology
  browsers, allowing visualization of RNA-seq experiments at pathway level (e.g.
  using [Cytoscape](http://js.cytoscape.org/)) as well as the reference-aligned
  reads
- a molecular evolution dashboard, with integrated browsing of phylogenetic gene
  trees and multiple sequence alignments (e.g. using [BioJS](https://biojs.net)
  components), alongside species trees and syntenic relationships between
  genomes And so on... now, to be clear, lots of people are dreaming about, or
  doing,
  [things](http://bmcgenomics.biomedcentral.com/articles/10.1186/1471-2164-14-397)
  [like](http://www.nature.com/nmeth/journal/v11/n9/abs/nmeth.3038.html)
  [this](https://biojsnet.herokuapp.com/). We want to make JBrowse play well
  with those efforts, and with future dashboards/mashups in the same vein. Some
  critical steps are required.

First, on the UI side, JBrowse must play nicely inside a DIV or inside a jQuery
element (this is in process), and must be 100% programmatically controllable via
the JavaScript API (this is mostly true already).

Second, on the server side, some aspects of the basic infrastructure need to be
fleshed out; for example, notifications of changes to the sequence and/or track
sets. As noted above, this is very much a part of our plans.

### Social, Personal

Like Mark Zuckerberg, we really just want to connect people. Some of the coolest
applications that has been built with JBrowse are the collaborative ones for
distributed and/or crowdsourced curation of genome features, like
[Apollo](http://genomearchitect.org/) and
[Afra](https://github.com/wurmlab/afra). We're also very excited to make JBrowse
work better with personal genomics sites like
[myvariant.info](http://myvariant.info/).

We want to enable more stuff like this, and are offering several
[Google Summer of Code projects](http://gmod.org/wiki/GSOC_Project_Ideas_2016)
this year. At least one of these is social in nature (developing a chat plugin
for JBrowse) and another, offered by François Moreews and Thomas Darde, uses
Docker to deploy personal JBrowse instances.

### That's All For Now

Watch this space for more updates!

~Ian

**Updated 2/25:** There are a lot of issues still on the GitHub tracker that we
plan to get to but I haven't mentioned here. James Gilbert on Twitter
[asked](https://twitter.com/jgrgilbert/status/702766473605988352) about flipping
the view to the reverse strand, which is issue
[#170](https://github.com/GMOD/jbrowse/issues/170) on GitHub. Rest assured that
just because I didn't necessarily mention every last one of them here, that
doesn't mean we've forgotten about them. We do still plan to get to those issues
and to keep upgrading and refining the UI.

<a name="asterisk"></a>\* OK, there was the
[1.12 release](http://jbrowse.org/jbrowse-1-12-0/ 'JBrowse-1.12.0: Open new genome from FASTA, in-line refseqs, NeatFeatures, Desktop'),
but you know. A while since we just pontificated for the hell of it.
