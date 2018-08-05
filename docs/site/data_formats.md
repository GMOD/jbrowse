---
id: data_formats
title: Data formats
---

# Introduction

## Data Format Specification: JSON LazyNCList Feature Store

One data store type that JBrowse uses is a lazily-loaded nested containment list (LazyNCLists), which is an efficient format for storing feature data in pre-generated static JSON files. A nested containment list is a tree data structure in which the nodes of the tree are intervals themselves features, and edges connecting features that lie \`within the bounds of (but are not subfeatures of) another feature. It has some similarities to an R tree. For more on NClists, see [the Alekseyenko paper](http://bioinformatics.oxfordjournals.org/content/23/11/1386.abstract).

This data format is currently used in JBrowse 1.3 for tracks of type `FeatureTrack`, and the code that actually reads this format is in SeqFeatureStore/NCList.js and ArrayRepr.js.

The LazyNCList format can be broken down into two distinct subformats: the LazyNCList itself, and the array-based JSON representation of the features themselves.

### Array Representation (`ArrayRepr`)

For speed and memory efficiency, NCList JSON represents features as arrays instead of objects. This is because the JSON representation is much more compact (saving a lot of disk space), and many browsers significantly optimize JavaScript Array objects over more general objects.

Each feature is represented as an array of the form `[ class, data, data, ... ]`, where the `class` is an integer index into the store's `classes` array (more on that in the next section). Each of the elements in the `classes` array is an *array representation* that defines the meaning of each of the the elements in the feature array.

An **array representation** specification is encoded in JSON as (comments added):
```
{
  "attributes": [                   // array of attribute names for this representation
     "AttributeNameForIndex1",
     "AttributeNameForIndex2",
     ...
  ],
  "isArrayAttr": {                  // list of which attributes are themselves arrays
     "AttributeNameForIndexN": 1,
     ...
  }
}
```
### Lazy Nested-Containment Lists (`LazyNCList`)

A JBrowse LazyNCList is a nested containment list tree structure stored as one JSON file that contains the root node of the tree, plus zero or more "lazy" JSON files that contain subtrees of the main tree. These subtree files are lazily fetched: that is, they are only fetched by JBrowse when they are needed to display a certain genomic region.

On disk, the files in an LazyNCList feature store look like this:
```
 # stats, metadata, and nclist root node
 data/tracks/<track_label>/<refseq_name>/trackData.json
 # lazily-loaded nclist subtrees
 data/tracks/<track_label>/<refseq_name>/lf-<chunk_number>.json
 # precalculated feature densities
 data/tracks/<track_label>/<refseq_name>/hist-<bin_size>.json
 ...`
```
Where the `trackData.json` file is formatted as (comments added):
```
{
   "featureCount" : 4293,          // total number of features in this store
   "histograms" : {                // information about precalculated feature-frequency histograms
      "meta" : [
         {                         // description of each available bin-size for precalculated feature frequencies
            "basesPerBin" : "100000",
