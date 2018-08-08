---
id: faq_tips
title: Tips and tricks
---


## How can I get jbrowse to update the URL of a parent page when jbrowse is inside of an iframe

You can use code such as
this

```
<iframe id="jbrowse_iframe" src="/jbrowse/" scrolling="no" style="width:100%;height:800px;"></iframe>

<script>

//https://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
}
// subscribe to jbrowse movements inside of the iframe and update parent page url
var datadir = getQueryVariable('data');
var iframe = document.getElementById('jbrowse_iframe');
iframe.addEventListener('load', function() {
    var JBrowse = iframe.contentWindow.JBrowse;
    JBrowse.subscribe( '/jbrowse/v1/n/navigate',  function(obj) {
        var shareURL = JBrowse.makeCurrentViewURL();
        var parser = new URL(shareURL);
        window.history.replaceState( {}, "", parser.search );
    });
});
// pass the parameters from the parent page into the iframe
iframe.src = iframe.src + window.location.search;

</script>
```

With this setup, you can pass URL parameters from the URL of the parent
page e.g. <http://localhost/parent_page/?data=mydata&loc=chr1:1>..10000
and it will forward those URL params to the jbrowse instance (located at
<http://localhost/jbrowse>) and the URL will be autoupdated when you
change locations

## Can I use JBrowse with phantomJS?

Yes\! See
<http://gmod.org/wiki/JBrowse_Configuration_Guide#Rendering_high_resolution_screenshots_using_PhantomJS>
for an example

Puppeteer also works

## Can I run JBrowse on GitHub pages?

Yes\! Upload jbrowse to a gh-pages branch on a github repo, and also put
a .nojekyll file in the root directory.

This bypasses the normal jekyll parser of github and allows jbrowse to
load <https://github.com/blog/572-bypassing-jekyll-on-github-pages>

## What is the benefit of using biodb-to-json.pl?

  - You can store more advanced creation in the biodb-to-json.pl conf
    file, allowing for more advanced and reproducible builds of your
    data directory
  - You can load data from different sources like Chado, GFF, etc.

In general, using normal commands like flatfile-to-json,
prepare-refseqs, etc work fine though. See setup.sh for how the volvox
sample data combines using biodb-to-json and other techniques.


## Can I make an ultra-compact setting on my features?

Yes you can\!

The styles on "CanvasFeatures" include normal, compact, and collapse

By default, compact divides the height of glyphs by 4, so if you make
the height of your features smaller with style-\>height then when you
set compact it will be ultra compact.

## Can I disable the histograms on a track?

Yes\! Try setting style.featureScale to a very small number like
0.0000000001 (but greater than 0)

## Can I visualize junctions from RNA-seq data

Yes, try out the SashimiPlot plugin\!
<https://github.com/cmdcolin/sashimiplot>

It dynamically calculates the splicing coverage of a track or uses
junctions.bed files for junctions

## Can I view GCContent on my sequence data?

Yes, the GCContent plugin will calculate the GCContent from your
sequence data automatically. See <https://github.com/cmdcolin/gccontent>

It works fairly well on mid-size genomes. If you have very large
megabase scale assemblies, then you might consider pre-calculating the
GCContent.

## Can I view GWAS results in JBrowse?

Yes, the GWASViewer plugin does this.
<https://github.com/cmdcolin/gwasviewer/>

## What do the colors mean on the BAM files for JBrowse

  - Light red is a forward read that is paired
  - Super light red is a forward read that is badly paired
  - Dark red is a forward read that is missing a pair
  - Light blue is a reverse read that is paired
  - Super light blue is a reverse read that is badly paired
  - Dark blue is a reverse read that is missing a pair
  - Grey/black is a read whose pair is on another chromosome

## Can I use RNA-seq with JBrowse

Yep\! The regular alignments track types (e.g.
JBrowse/View/Track/Alignments2) supports RNA-seq and will show spliced
alignments.

Also, there are two special options for RNA-seq that can help decipher
the reads.

  - The "Use XS" option is a RNA-seq specific flag that aligners output
    which detects the strand that a read came from according to
    canonical splice site. Enable in config using useXS: true
  - The "Use reversed template" option is flag normally used for
    "stranded paired-end RNA-seq" data  and it will make both reads in a
    pair look like they are in the same direction, so for example, reads
    from a plus-strand gene will all appear red, even when one of the
    reads in the pair would normally be blue. Enable in config with
    useReverseTemplate: true

## Can I use long reads with JBrowse?

Long reads from platforms like nanopore and pacbio pose some challenges
but will work if it is in BAM format. The JBrowse 1.12.3 release also
includes an optimization, cacheMismatches, to enhance speed on long read
tracks. This must be enabled manually in the config at the moment.

## Can I have subtracks in JBrowse?

You can make a custom plugin to do this. The "multibigwig" plugin is an
example of this <https://github.com/cmdcolin/multibigwig>

## How do I get coverage for a BAM file?

1.  Use the SNPCoverage track
2.  Use the FeatureCoverage track type
3.  Make a bigwig for your BAM file (recommend: use "bedtools genomecov"
    to convert the BAM to bedgraph, and the convert bedgraph to bigwig
    with UCSC bedGraphToBigWig)

Also note: with the third option, you can make it so that your BAM track
has a bigwig when zoomed out, but then shows the reads when zoomed in.
Any CanvasFeatures track can use a bigwig for summary histograms. The
Alignments2 volvox-sorted.bam track is an example of this. See
<http://gmod.org/wiki/JBrowse_Configuration_Guide#Configuring_Summary_Histograms>

## Can I zoom even closer to the base level?

Yes. You can set the config variable view.maxPxPerBp to a higher value.
To increase, try setting this in jbrowse.conf

`view.maxPxPerBp=50`

Note sometimes the "translations" will appear wrong at high zoom levels,
so don't depend on this for the protein translations

By default, the max zoom level is 25, so setting it to 50 makes you able
to zoom in twice as much.

## How do I change the color of bigwig dynamically

The pos\_color and neg\_color config variables for BigWig tracks accept
callback functions. The phytozome browser has good examples of this with
the VISTA plot tool
