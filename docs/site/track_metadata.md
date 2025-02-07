---
id: track_metadata
title: Track Metadata
---

JBrowse supports two ways to add data that describes tracks (track metadata): it
can either be embedded directly in the track's configuration stanza, or it can
come from a separate file that JBrowse loads. Track metadata is shown both when
a user clicks "About this track" from a track's menu, and in the faceted track
selector if it is in use.

## Embedding Track Metadata in JBrowse Configuration

Each track configuration stanza can include a `metadata` item that contains
items of data that describe the track. For example, to describe a BAM track
containing alignments of RNA-seq reads from Volvox carteri under conditions of
caffeine starvation, a track configuration might contain:

```{.javascript}
      {
         "storeClass" : "JBrowse/Store/SeqFeature/BAM",
         "urlTemplate" : "../../raw/volvox/volvox-sorted.bam",
         "style" : {
            "className" : "alignment",
            "arrowheadClass" : "arrowhead",
            "labelScale" : 100
         },
         "label" : "volvox-sorted.bam",
         "type" : "JBrowse/View/Track/Alignments",
         "key" : "volvox-sorted.bam",
         "metadata": {
             "Description": "RNA-seq",
             "Conditions": "caffeine starvation",
             "Species": "Volvox carteri",
             "Data Provider": "Robert Buels Institute for Example Data"
         }
      }
```

### Loading Track Metadata from Files

To add track metadata from an external file to JBrowse, add a `trackMetadata`
section to the JBrowse configuration.

JBrowse currently supports track metadata that in Excel-compatible
comma-separated-value (CSV) format, but additional track metadata backends are
relatively easy to add. Write the JBrowse mailing list if you have a strong need
to use another format.

| Option                      | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trackMetadata.sources`     | Array of source definitions, each of which takes the form `{ type: 'csv', url: '/path/to/file' }`. The url is interpreted as relative to the url of the page containing JBrowse (index.html in default installations). Source definitions can also contain a `class` to explicitly specify the JavaScript backend used to handle this source. Note you can also specify relativeUrl instead of `url` in order to make the resolution relative to the data directory e.g. `{ type: 'csv': 'file_inside_data_directory.csv' }`. relativeUrl added in 1.16.7 |
| `trackMetadata.indexFacets` | Optional array of facet names that should be the only ones made searchable. This can be used improve the speed and memory footprint of JBrowse on the client by not indexing unused metadata facets.                                                                                                                                                                                                                                                                                                                                                      |
| `trackMetadata.sortFacets`  | Boolean value to sort the facet names. Can be set to false to disable sorting. Added in JBrowse 1.16.7                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

Hint: to convert JBrowse JSON files to a csv, try using jq
<https://stedolan.github.io/jq>

Example:

`cat trackList.json| jq -r '.tracks[] | [.label,.key] | @csv'`

Will produce a CSV with the label and key of each track in your trackList.json

Another for thing you can do with jq is add config variables directly to your
trackList, for example

`cat trackList.json| jq -r '.tracks[].maxExportSpan=50000'`

### Example

Configuration:

```
  "trackMetadata": {
      "indexFacets":  [ "category","organism","target","technique","principal_investigator",
                      "factor","developmental-stage","strain","cell-line","tissue","compound",
                      "temperature"
                    ],
      "sources": [
           { "type": "csv", "url":  "myTrackMetaData.csv" }
      ]
  }
```

Note: use lower case values for the facet names / column names in the CSV. Use
renameFacets to give them other names. See \#Faceted_track_selector for details.

Track metadata CSV:

| label                           | technique | factor  | target                          | principal_investigator | submission | category                      | type     | Developmental-Stage |
| ------------------------------- | --------- | ------- | ------------------------------- | ---------------------- | ---------- | ----------------------------- | -------- | ------------------- |
| fly/White_INSULATORS_WIG/BEAF32 | ChIP-chip | BEAF-32 | Non TF Chromatin binding factor | White, K.              | 21         | Other chromatin binding sites | data set | Embryos 0-12 hr     |
| fly/White_INSULATORS_WIG/CP190  | ChIP-chip | CP190   | Non TF Chromatin binding factor | White, K.              | 22         | Other chromatin binding sites | data set | Embryos 0-12 hr     |
| fly/White_INSULATORS_WIG/GAF    | ChIP-chip | GAF     | Non TF Chromatin binding factor | White, K.              | 23         | Other chromatin binding sites | data set | Embryos 0-12 hr     |
| ...                             | ...       | ...     | ...                             | ...                    | ...        | ...                           | ...      | ...                 |

Note that the **label** for each track metadata row must correspond to the
`label` in the track configuration for the track it describes.

Hint to set track key from metadata: if a track has no `key` set in its track
configuration, JBrowse will look for a `key` in its track metadata, and use that
if it is present.

### Track metadata options

trackMetadata.sources - array of metadata source objects

Each source can have

- url - a URL (relative to JBrowse root directory, or absolute URL)
- type - can be CSV, JSON or something else. inferred from the filename of the URL if none specified
- storeClass - can be any store class, defaults to 'dojox/data/CsvStore' for CSV type and 'dojox/data/JsonRestStore' for JSON type

Example:

```
 "trackMetadata": {
     "sources": [
          { "type": "csv", "url":  "data/myTrackMetaData.csv" }
     ]
 }
```

This would load data/myTrackMetaData.csv, e.g. from your data folder. Note
trackMetadata blocks can be specified in the trackList.json or a global config
file
