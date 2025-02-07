---
id: data_formats
title: JBrowse REST API and Data APIs
---

## Writing JBrowse-compatible Web Services

Beginning in version 1.9.0, JBrowse ships with a REST data store adapter
(JBrowse/Store/SeqFeature/REST) that can provide feature, sequence, and
quantitative data for display by any of JBrowse's track types. To use it, a
developer can implement server-side web services that satisfy the REST API it
expects.

JBrowse version 1.11.0 added a REST adaptor that can look up names and name
prefixes (for type-ahead completion) from REST endpoints as well (see JBrowse
REST Names API below).

### JBrowse REST Feature Store API

The JBrowse REST feature store requires the following server resources.

#### `GET (base)/stats/global`

Required. Returns a JSON object containing global statistics about the features
served by this store.

Example:

       {

          "featureDensity": 0.02,

          "featureCount": 234235,

          "scoreMin": 87,
          "scoreMax": 87,
          "scoreMean": 42,
          "scoreStdDev": 2.1
       }

None of the attributes in the example above are required to be present. However,
if the store is primarily providing positional data (such as genes), it is
recommended to provide at least `featureDensity` (average number of features per
basepair), since JBrowse uses this metric to make many decisions about how to
display features. For stores that primarily provide quantitative data, it is
recommended to also provide score statistics.

#### `GET (base)/stats/region/(refseq_name)?start=123&end=456`

Optional, but recommended. Get statistics for a particular region. Returns the
same format as `stats/global` above, but with statistics that apply only to the
region specified.

The `refseq name` URL component, and the `start` and `end` query parameters
specify the region of interest. Statistics should be calculated for all features
that **overlap** the region in question. `start` and `end` are in interbase
coordinates.

NOTE: If this is not implemented, the statistics will be calculated as needed by
actually fetching feature data for the region in question. If your backend
\*does\* implement region stats, set `"region_stats": true` in the track or
store configuration to have JBrowse use them.

#### `GET (base)/stats/regionFeatureDensities/(refseq_name)?start=123&end=456&basesPerBin=20000`

Optional, added in JBrowse 1.10.7. Get binned feature counts for a certain
region, which are used only by HTMLFeatures tracks to draw density histograms at
certain zoom levels. If your backend implements this endpoint, set
`"region_feature_densities": true` in the track or store configuration to have
JBrowse use it.

The `refseq name` URL component, and the `start` and `end` query parameters
specify the region of interest. `start` and `end` are in interbase coordinates.

The `basesPerBin` is an integer which must be used to determine the number of
bins - the endpoint may not choose its own bin size. `max` should be the maximum
value for the density, the global maximum for the entire track.

Example returned JSON:

    {
      "bins":  [ 51, 50, 58, 63, 57, 57, 65, 66, 63, 61,
                 56, 49, 50, 47, 39, 38, 54, 41, 50, 71,
                 61, 44, 64, 60, 42
               ],
      "stats": {
        "basesPerBin": 200,
        "max": 88
      }
    }

Note that the `stats.max` attribute sets that Y-axis scale for the entire track,
so should probably be set according to the global (or nearly global) max count
for bins of that size.

#### `GET (base)/features/(refseq_name)?start=234&end=5678`

Required. Fetch feature data (including quantitative data) for the specified
region.

The `refseq name` URL component, and the `start` and `end` query parameters
specify the region of interest. All features that **overlap** the region in
question should be returned. `start` and `end` are in interbase coordinates.
Also, track types that display features as boxes laid out on the genome (such as
HTMLFeatures, CanvasFeatures, Alignments, and Alignments2 ) require all
top-level features to have a globally-unique ID, which should be set as
`uniqueID` in the JSON emitted by the service. `uniqueID` can be any string or
number that is guaranteed to be unique among the features being emitted by this
query. It is never shown to the user.

Example return JSON:

    {
      "features": [

        /* minimal required data */
        { "start": 123, "end": 456 },

        /* typical quantitative data */
        { "start": 123, "end": 456, "score": 42 },

        /* Expected format of the single feature expected when the track is a sequence data track. */
        {"seq": "gattacagattaca", "start": 0, "end": 14},

        /* typical processed transcript with subfeatures */
        { "type": "mRNA", "start": 5975, "end": 9744, "score": 0.84, "strand": 1,
          "name": "au9.g1002.t1", "uniqueID": "globallyUniqueString3",
          "subfeatures": [
             { "type": "five_prime_UTR", "start": 5975, "end": 6109, "score": 0.98, "strand": 1 },
             { "type": "start_codon", "start": 6110, "end": 6112, "strand": 1, "phase": 0 },
             { "type": "CDS",         "start": 6110, "end": 6148, "score": 1, "strand": 1, "phase": 0 },
             { "type": "CDS",         "start": 6615, "end": 6683, "score": 1, "strand": 1, "phase": 0 },
             { "type": "CDS",         "start": 6758, "end": 7040, "score": 1, "strand": 1, "phase": 0 },
             { "type": "CDS",         "start": 7142, "end": 7319, "score": 1, "strand": 1, "phase": 2 },
             { "type": "CDS",         "start": 7411, "end": 7687, "score": 1, "strand": 1, "phase": 1 },
             { "type": "CDS",         "start": 7748, "end": 7850, "score": 1, "strand": 1, "phase": 0 },
             { "type": "CDS",         "start": 7953, "end": 8098, "score": 1, "strand": 1, "phase": 2 },
             { "type": "CDS",         "start": 8166, "end": 8320, "score": 1, "strand": 1, "phase": 0 },
             { "type": "CDS",         "start": 8419, "end": 8614, "score": 1, "strand": 1, "phase": 1 },
             { "type": "CDS",         "start": 8708, "end": 8811, "score": 1, "strand": 1, "phase": 0 },
             { "type": "CDS",         "start": 8927, "end": 9239, "score": 1, "strand": 1, "phase": 1 },
             { "type": "CDS",         "start": 9414, "end": 9494, "score": 1, "strand": 1, "phase": 0 },
             { "type": "stop_codon",  "start": 9492, "end": 9494,             "strand": 1, "phase": 0 },
             { "type": "three_prime_UTR", "start": 9495, "end": 9744, "score": 0.86, "strand": 1 }
          ]
        }
      ]
    }

### Configuring Tracks to Use a REST Feature Store

Example configuration for an HTMLFeatures track showing features from a REST
feature store with URLs based at http://my.site.com/rest/api/base, and also
adding "organism=tyrannosaurus" in the query string of all HTTP requests.

    {
        "label":      "my_rest_track",
        "key":        "REST Test Track",
        "type":       "JBrowse/View/Track/HTMLFeatures",
        "storeClass": "JBrowse/Store/SeqFeature/REST",
        "baseUrl":    "http://my.site.com/rest/api/base",
        "query": {
            "organism": "tyrannosaurus"
        }
    }

### Other Dynamically-Servable Formats

#### trackList.json format

    {
        "tracks": [
            {
              "label":      "my_gene_track", /* Unique, machine readable name */
              "key":        "Genes", /* Descriptive, meat readable name */
              "type":       "JBrowse/View/Track/HTMLFeatures",
              "storeClass": "JBrowse/Store/SeqFeature/REST",
              "baseUrl":    "http://my.site.com/rest/api/base",
              "query": { /* Your arbitrary set of query parameters, always sent with every request */
                 "organism": "tyrannosaurus", "soType": "gene"
               }
            },
            {
              "label":      "my_sequence_track", /* Unique, machine readable name */
              "key":        "DNA", /* Descriptive, meat readable name */
              "type":       "JBrowse/View/Track/Sequence",
              "storeClass": "JBrowse/Store/SeqFeature/REST",
              "baseUrl":    "http://my.site.com/rest/api/base",
              "query": { /* Your arbitrary set of query parameters, always sent with every request */
                 "organism": "tyrannosaurus", "sequence": true
               }
            }
         ]
    }

#### refSeqs.json format

This will be fetched from the url configured in the config.json file, such that
if the config.json file specifies "?data=X/Y/Z" and is itself at
"SCHEME://HOST:PORT/PATH", then JBrowse will request the url
"SCHEME://HOST:PORT/PATH/X/Y/Z/seq/refSeqs.json".

    [
      {"name": "chr1", "start": 0, "end": 12345678},
      {...}
    ]

#### Sequence data format

Retrieved from "{BASE}/features/{seqid}".

This is the REST feature store data format, but it expects just a single
feature, and that feature should have sequence.

    {"features": [
      {"seq": "gattacagattaca" "start": 0, "end": 14}
    ]

### JBrowse REST Names API

Starting in version 1.11.0, JBrowse can use REST web services for looking up
features by name, and for type-ahead autocompletion.

#### `GET (url)?equals=Apple1`

Required. Returns JSON list of genomic locations with names that exactly match
the given string.

The JSON format returned is the same as for `startswith` above.

#### `GET (url)?startswith=Ap`

Required. Returns JSON list of genomic locations that have names that start with
the given string.

Example returned JSON:

    [
       {
          "name" : "Apple1",    // Name associated with the record. May be a secondary name of the object.
          "location" : {        // location information for the match
             "ref" : "ctgA",    // name of the reference sequence
             "start" : 9999,    // genomic start (interbase coords)
             "end" : 11500,     // genomic end (interbase coords)
             "tracks" : [       // list of track labels that contain this object
                "CDS"
             ],
             "objectName" : "Apple1"  // canonical/primary name of the object
          }
       },
       ...
    ]

### Configuring JBrowse to Use REST Name Lookup

Add something like the following to `jbrowse.conf`:

`[names]` `type = REST` `url = /path/to/names/rest/service`

## Publishing and Subscribing to JBrowse Events

JBrowse client events are implemented using the dojo/topic message bus from the
Dojo library. Extensions can subscribe to particular events in order to be
notified when certain UI changes happen (for example, highlighting a region
generates an event, which can be latched onto with a callback that triggers a
request for the server to BLAST that region against a database). In select
cases, extensions can also publish events, as a way of forcing the UI into
certain states or transitions (for example, events can be used in this way to
force the browser to load a new track, in response to some other circumstance or
notification).

## JSON LazyNCList Feature Store

One data store type that JBrowse uses is a lazily-loaded nested containment list
(LazyNCLists), which is an efficient format for storing feature data in
pre-generated static JSON files. A nested containment list is a tree data
structure in which the nodes of the tree are intervals themselves features, and
edges connecting features that lie \`within the bounds of (but are not
subfeatures of) another feature. It has some similarities to an R tree. For more
on NClists, see
[the Alekseyenko paper](http://bioinformatics.oxfordjournals.org/content/23/11/1386.abstract).

This data format is currently used in JBrowse 1.3 for tracks of type
`FeatureTrack`, and the code that actually reads this format is in
SeqFeatureStore/NCList.js and ArrayRepr.js.

The LazyNCList format can be broken down into two distinct subformats: the
LazyNCList itself, and the array-based JSON representation of the features
themselves.

### Array Representation (`ArrayRepr`)

For speed and memory efficiency, NCList JSON represents features as arrays
instead of objects. This is because the JSON representation is much more compact
(saving a lot of disk space), and many browsers significantly optimize
JavaScript Array objects over more general objects.

Each feature is represented as an array of the form
`[ class, data, data, ... ]`, where the `class` is an integer index into the
store's `classes` array (more on that in the next section). Each of the elements
in the `classes` array is an _array representation_ that defines the meaning of
each of the the elements in the feature array.

An **array representation** specification is encoded in JSON as (comments
added):

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

A JBrowse LazyNCList is a nested containment list tree structure stored as one
JSON file that contains the root node of the tree, plus zero or more "lazy" JSON
files that contain subtrees of the main tree. These subtree files are lazily
fetched: that is, they are only fetched by JBrowse when they are needed to
display a certain genomic region.

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
   "featureCount" : 4293,          // total number of features in this store
   "histograms" : {                // information about precalculated feature-frequency histograms
      "meta" : [
         {                         // description of each available bin-size for precalculated feature frequencies
            "basesPerBin" : "100000",
            "arrayParams" : {
               "length" : 904,
               "chunkSize" : 10000,
               "urlTemplate" : "hist-100000-{Chunk}.json"
            }
         },
         ...                       // and so on for each bin size
      ],
      "stats" : [
         {                           // stats about each precalculated set of binned feature frequencies
           "basesPerBin" : "100000", // bin size in bp
           "max" : 51,               // max features per bin
           "mean" : 4.93030973451327 // mean features per bin
         },
         ...
      ]
   },
   "intervals" : {
      "classes" : [                // classes: array representations used in this feature data (see ArrayRepr section above)
         {
            "isArrayAttr" : {
               "Subfeatures" : 1
            },
            "attributes" : [
               "Start",
               "End",
               "Strand",
               "Source",
               "Phase",
               "Type",
               "Id",
               "Name",
               "Subfeatures"
            ]
         },
         ...
         {                        // the last arrayrepr class is the "lazyClass": fake features that point to other files
            "isArrayAttr" : {
               "Sublist" : 1
            },
            "attributes" : [
               "Start",
               "End",
               "Chunk"
            ]
         }
      ],
      "nclist" : [
         [
            2,                    // arrayrepr class 2
            12962,                // "Start" minimum coord of features in this subtree
            221730,               // "End"   maximum coord of features in this subtree
            1                     // "Chunk" (indicates this subtree is in lf-1.json)
         ],
         [
            2,                    // arrayrepr class 2
            220579,               // "Start" minimum coord of features in this subtree
            454457,               // "End"   maximum coord of features in this subtree
            2                     // "Chunk" (indicates this subtree is in lf-2.json)
         ],
         ...
      ],
      "lazyClass" : 2,            // index of arrayrepr class that points to a subtree
      "maxEnd" : 90303842,               // maximum coordinate of features in this store
      "urlTemplate" : "lf-{Chunk}.json", // format for lazily-fetched subtree files
      "minStart" : 12962                 // minimum coordinate of features in this store
   },
   "formatVersion" : 1
}
```

## Feature API and Feature Store API

Classes modeling individual sequence features conform to the <b>Feature API</b>
(exemplified by and documented in the source for the class
`JBrowse/Model/SimpleFeature`) by providing accessor methods for various feature
attributes (start and endpoint, ID field, tags, score, parent and child
relationships for modeling super- and sub-features) some of which are mandatory
for the various different types of track. Specifically: “`start`” and “`end`”
attributes are always required (representing 1-based closed-interval
coordinates), a unique “`id`” attribute is required by non-quantitative tracks
(`CanvasFeatures`, `HTMLFeatures`, `Alignments*`, etc) and a “`score`” attribute
is used by quantitative tracks (`Wiggle/*`) to represent the score for the
interval spanned by the feature.

By contrast, classes modeling sources of sequences and sequence features
generally inherit from `JBrowse/Store/SeqFeature` and implement the <b>Feature
Store API</b> including methods `getGlobalStats` (for global statistics about
the features in the store), `getRegionStats` (for statistics about a particular
interval), `getFeatures` (to query the store for features) and
`getReferenceSequence` (to query the store for sequence data).

Typically, different Feature Stores will provide their own custom
implementations of the Feature API.

## Using JBrowse with Existing Web Services

Users can extend JBrowse's functionality to with their own JavaScript code using
the JBrowse plugin system. For an overview of plugins and their structure, see
[Writing JBrowse Plugins](#writing-jbrowse-plugins 'wikilink').

To use JBrowse with an existing set of web services, users will want to
implement a JBrowse Store module in JavaScript that can fetch data from them and
convert it into the internal JavaScript object representations that JBrowse
expects. In general terms, the steps to follow to do this would be:

1.  Create a new plugin using `bin/new-plugin.pl` or manually.
2.  Enable the plugin by adding its name to `plugins` in the JBrowse
    configuration (in jbrowse_conf.json, trackList.json, in the constructor
    arguments in index.html, or elsewhere).
3.  Create a new data store class in the plugin's JS directory that inherits
    from JBrowse/Store/SeqFeature and overrides its methods.

### Example custom JBrowse store class

In `plugins/MyPlugin/js/Store/SeqFeature/FooBaseWebServices.js`, usable in store
or track configurations as `MyPlugin/Store/SeqFeature/FooBaseWebServices`.

Note that the most basic class could simply have a "getFeatures" function that
grabs the feature data.

```
    /**
     * Example store class that uses Dojo's XHR libraries to fetch data
     * from backend web services.  In the case of feature data, converts
     * the data into JBrowse SimpleFeature objects (see
     * JBrowse/Model/SimpleFeature.js) but any objects that support the
     * same methods as SimpleFeature are fine.
     */

    define([
               'dojo/_base/declare',
               'dojo/_base/array',
               'dojo/request/xhr',
               'JBrowse/Store/SeqFeature',
               'JBrowse/Model/SimpleFeature'
           ],
           function( declare, array, xhr, SeqFeatureStore, SimpleFeature ) {

    return declare( SeqFeatureStore, {

        constructor: function( args ) {
            // perform any steps to initialize your new store.  
        },

        getFeatures: function( query, featureCallback, finishCallback, errorCallback ) {
            var thisB = this;
            xhr.get( this.config.baseUrl+'my/features/webservice/url',
                     { handleAs: 'json', query: query }
                   ).then(

                       function( featuredata ) {

                           // transform the feature data into feature
                           // objects and call featureCallback for each
                           // one. for example, the default REST
                           // store does something like:
                           array.forEach( featuredata || [],
                               function( featureKeyValue ) {
                                   var feature = new SimpleFeature({
                                           data: featureKeyValue
                                       });
                                   featureCallback( feature );
                               });

                           // call the endCallback when all the features
                           // have been processed
                           finishCallback();
                       },

                       errorCallback
                   );

        }
    });
    });
```

Note: other feature stores can be "derived from" or extended in different ways.
The FeatureCoverage store class is a good example of a store class that uses the
BAM store, but instead overrides the functionality to calculate coverage.
