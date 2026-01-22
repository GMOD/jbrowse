---
id: feature_coverage
title: Feature Coverage Tracks
---

# Feature Coverage Tracks

Introduced in JBrowse 1.7.0, feature coverage tracks show a dynamically-computed
XY-plot of the depth of coverage of features across a genome. One good use of
this track type is to provide a quick coverage plot directly from a BAM file.
However, since this track calculates coverage on the fly, it can be very slow
when used with large regions or very deep coverage. In this case, it is
recommended to generate a BigWig file containing the coverage data, and display
it with a `Wiggle/XYPlot` or `Wiggle/Density` track.

Feature coverage tracks are a special type of Wiggle/XYPlot tracks, so the same
configuration options apply. There is an additional caveat, however: this kind
of track requires the `min_score` and `max_score` variables in order to set the
Y-axis scaling, since these cannot be quickly determined from raw BAM or other
feature data.

Note: The SNPCoverage track and FeatureCoverage tracks are very similar, except
the SNPCoverage track (in addition to showing SNPs) also has the extra ability
to filter the supplementary/secondary reads, and other reads, so they may appear
to report different coverages by default.

## Example Feature Coverage Track Configuration for a BAM file

```{.javascript}
      {
         "storeClass"  :  "JBrowse/Store/SeqFeature/BAM",
         "urlTemplate" : "../../raw/volvox/volvox-sorted.bam",
         "label"       : "volvox-sorted.bam_coverage",
         "type"        : "JBrowse/View/Track/FeatureCoverage",
         "min_score"   : 0,
         "max_score"   : 35,
         "key"         : "volvox-sorted Coverage"
      }
```
