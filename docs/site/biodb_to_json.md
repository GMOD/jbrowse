---
id: biodb-to-json.pl
title: biodb-to-json.pl
---

### biodb-to-json.pl

This script uses a
[config file](/JBrowseDev/Current/Usage/ConfigFiles 'wikilink') to produce a set
of feature tracks in JBrowse. It can be used to obtain information from any
database with appropriate [schema](/Glossary#Database_Schema 'wikilink'), or
from flat files. Because it can produce several feature tracks in a single
execution, it is useful for large-scale feature data entry into JBrowse.

Basic usage:

`bin/biodb-to-json.pl --conf <config file> [options]`

For a full list of the options supported by biodb-to-json.pl, run it with the
--help option, like:

`bin/biodb-to-json.pl --help`

The `biodb-to-json.pl` and `prepare-refseqs.pl` can use a configuration file to
connect to an existing `Bio::DB::*` database and batch-format its data for use
by JBrowse

## Important note

You should know that biodb-to-json.pl is not necessary for most common JBrowse
use cases. The reasons that biodb-to-json.pl would be used is if:

- you have an actual `BioDB::*` format like Chado
- you have plain flatfile formats like GFF but also want advanced pre-configured
  JSON

Note that the volvox sample data uses the second case. It loads from a GFF using
`biodb-to-json.pl` but since there are many sort of advanced configurations,
having those configuration pre-made in the `biodb-to-json.pl` config format
helps

## Alternative to biodb-to-json.pl

See [here](perl_config) for an example of a simple shell script that uses
`prepare-refseqs.pl` and `flatfile-to-json.pl` to to create a complete genome
browser for Tomato.

The basic syntax of the configuration file is JSON. Many of the configuration
keys are quite similar to those used by [GBrowse](http://gmod.org/wiki/GBrowse).

## Database configuration

The root level of the config file contains settings for the BioDB that is being
used

| key            | value                                                                                                              | type                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| description    | Brief description of the data source                                                                               | string                               |
| db_adaptor     | Perl class that implements Bio::DasI.Common ones include Bio::DB::SeqFeature::StoreBio::DB::GFFBio::DB::Das::Chado | string                               |
| db_args        | arguments to the constructor for the specified db_adaptor                                                          | dictionary of key-value pairs        |
| TRACK DEFAULTS | default track settings                                                                                             | track settings dictionary            |
| tracks         | settings for all the tracks                                                                                        | array of track settings dictionaries |

## Track settings

The main part of the configuration file consists of the **per-track settings:**

| key               | value                                                                                                                                                                                                                     | type                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| track             | track identifier used by the software.It's more convenient if this doesn't have any weird characters or spaces in it                                                                                                      | string                           |
| key               | Human-readable label for the track                                                                                                                                                                                        | string                           |
| feature           | List of feature types to put into the track                                                                                                                                                                               | array of strings                 |
| autocomplete      | If you want to be able to search for the features in this track, set this to one of the following strings:labelto search on the feature labelaliasto search on the feature aliasesallto search on both labels and aliases | string                           |
| class             | The CSS class for the feature. Look in the feature glyph list for the available options.                                                                                                                                  | string                           |
| category          | The category this track is in, for grouping the tracks together                                                                                                                                                           | string                           |
| urlTemplate       | Template for a URL to visit if the user clicks on a feature in this track                                                                                                                                                 | string                           |
| extraData         | Extra per-feature information to send to the client; useful in the urlTemplate                                                                                                                                            | dictionary of header -> perl sub |
| subfeatureClasses | Specifies what CSS class to apply to what type of subfeature                                                                                                                                                              | dictionary of type -> CSS class  |
| arrowheadClass    | CSS class for arrowheads                                                                                                                                                                                                  | string                           |
| clientConfig      | settings to control the behavior of the client for this track, mainly zoom thresholds for when to display more information                                                                                                | dictionary                       |

## Example biodb-to-json.pl config for volvox sample data

```
         {
   "tracks" : [
      {
         "feature" : [
            "remark"
         ],
         "autocomplete" : "all",
         "track" : "ExampleFeatures",
         "class" : "feature2",
         "category": "Miscellaneous",
         "key" : "HTMLFeatures - Example Features"
      },
      {
         "feature" : [
            "protein_coding_primary_transcript",
            "polypeptide"
         ],
         "track" : "NameTest",
         "class" : "feature2",
         "category": "Miscellaneous",
         "key" : "HTMLFeatures - Name test track has a really long track label"
      },
      {
         "feature" : [
            "SNP"
         ],
         "track" : "snps",
         "class" : "triangle hgred",
         "category": "Miscellaneous",
         "key" : "HTMLFeatures - SNPs"
      },
      {
         "feature" : [
            "polypeptide_domain"
         ],
         "track" : "Motifs",
         "class" : "feature3",
         "description" : 1,
         "key" : "HTMLFeatures - Example motifs",
         "category": "Miscellaneous",
         "style": {
           "label": "function(feature) { return feature.get('Name')+' (via JS callback)' }",
           "description": "function(feature) { return feature.get('Name')+': '+feature.get('Note'); }"
         }
      },
      {
         "feature" : [
            "match"
         ],
         "track" : "malformed_alignments",
         "class" : "feature4",
         "key" : "HTMLFeatures - Features with right-click menus",
         "shortDescription": "Features with customized right-click menus",
         "metadata": {
             "category": "Miscellaneous",
             "Description": "Features with extensively customized right-click menus, and with their colors set at random by a JavaScript callback."
         },
         "hooks": {
             "modify": "function( track, feature, div ) { div.style.backgroundColor = ['green','blue','red','orange','purple'][Math.round(Math.random()*5)];}"
         },
         "menuTemplate" : [
             {
               "label" : "Item with submenu",
               # hello this is a comment
               "children" : [
               {
                 "label" : "Check gene on databases",
                 "children" : [
                 {
                   "label" : "Query trin for {name}",
                   "iconClass" : "dijitIconBookmark",
                   "action": "newWindow",
                   "url" : "http://wiki.trin.org.au/{name}-{start}-{end}"
                 },
                 {
                 "label" : "Query example.com for {name}",
                 "iconClass" : "dijitIconSearch",
                 "url" : "http://example.com/{name}-{start}-{end}"
                 }
                 ]
               },
               { "label" : "2nd child of demo" },
               { "label" : "3rd child: this is a track" }
             ]
             },
             {
               "label" : "Open example.com in an iframe popup",
               "title" : "The magnificent example.com (feature {name})",
               "iconClass" : "dijitIconDatabase",
               "action": "iframeDialog",
               "url" : "http://www.example.com?featurename={name}"
             },
             {
               "label" : "Open popup with XHR HTML snippet (btw this is feature {name})",
               "title": "function(track,feature,div) { return 'Random XHR HTML '+Math.random()+' title!'; }",
               "iconClass" : "dijitIconDatabase",
               "action": "xhrDialog",
               "url" : "sample_data/test_snippet.html?featurename={name}:{start}-{end}"
             },
             {
               "label" : "Popup with content snippet from a function (feature {name})",
               "title": "function(track,feature,div) { return 'Random content snippet '+Math.random()+' title!'; }",
               "iconClass" : "dijitIconDatabase",
               "action": "contentDialog",
               "content" : "function(track,feature,div) { return '<h2>'+feature.get('name')+'</h2><p>This is some test content!</p><p>This message brought to you by the number <span style=\"font-size: 300%\">'+Math.round(Math.random()*100)+'</span>.</p>';} "
             },
             {
               "label" : "Popup with content snippet from string (feature {name})",
               "title": "{randomNumberTitle}",
               "iconClass" : "dijitIconDatabase",
               "action": "contentDialog",
               "content" : "<h2>{name}</h2><p>This is some test content about {name}, which goes from {start} to {end} on the {strand} strand.</p>"
             },
             {
               "label" : "{randomNumberLabel}",
               "iconClass" : "dijitIconDatabase",
               "action": "{exampleFeatureClick}"
             }
         ]
      },
      {
         "feature" : [
            "gene"
         ],
         "track" : "Genes",
         "class" : "feature5",
         "category": "Transcripts",
         "key" : "CanvasFeatures - Protein-coding genes",
         "metadata" : {
            "ncbi_submission_model" : "Generic",
            "insdc_first_public" : "2018-05-15T00:00:00Z",
            "Link: ENA study page" : "http://www.ebi.ac.uk/ena/",
            "library_total_amount_of_reads" : "3349981",
            "insdc_secondary_accession" : "SRS12345678",
            "insdc_center_name" : "INSDC Sample",
            "ncbi_submission_package" : "Generic.1.0",
            "sample_name" : "GSM12345678",
            "ENA first public" : "2018-05-16",
            "organism" : "Volvox",
            "study" : "SRP12345678 a study of volvox",
            "Link: RNASeq-er analysis results" : "ftp://ftp.ebi.ac.uk/pub/databases/arrayexpress/",
            "library_size_approx" : "1-5mln",
            "insdc_last_update" : "2018-05-15T01:18:23.110Z",
            "insdc_status" : "live",
            "developmental_stage" : "stage 6- 330 min",
            "tissue" : "embryo",
            "mapping_quality_approx" : "under 50%",
            "source_name" : "Volvox 6- 330 min",
            "mapping_fraction_of_uniquely_mapped_reads" : "0.429",
            "ENA last update" : "2018-05-16",
            "description_title" : "Volvox_mRNA_rep_2_6"
         },
         "trackType": "NeatCanvasFeatures/View/Track/NeatFeatures",
         "onClick" : {
            "action" : "defaultDialog",
            "label" : "<div style='font:normal 12px Univers,Helvetica,Arial,sans-serif'><div style='font-weight:bold'>Custom tooltip</div><div style='color:blue;'>Feature name: {name}<br />Feature start: {start}<br />Feature end: {end}</div></div>",
            "title": "{type} {name}"
         },
         "menuTemplate": [  {
               "label" : "View details",
             },
             {
               "label" : "Zoom this gene",
             },
             {
               "label" : "Highlight this gene",
             },
             {
               "label" : "Popup with content snippet from string (feature {name})",
               "title": "{randomNumberTitle}",
               "iconClass" : "dijitIconDatabase",
               "action": "contentDialog",
               "content" : "<h2>{name}</h2>This is some test content about {type} {name}, which goes from {start} to {end} on the {strand} strand."
             }],
         "fmtDetailValue_Name": "function(name,feature) { if(feature.get('type')=='gene') { return name + ' <a href=http://www.ncbi.nlm.nih.gov/gquery/?term='+name+'>[NCBI custom link]</a>'; } else { return name; } }",
         "fmtDetailField_Name": "function(name,feature) { if(feature.get('type')=='gene') { return 'Gene Name'; } else { return name; } }",
         "fmtDetailField_Load_id": "function(name,feature) { /* remove field from dialog box */ return null; }",
         "fmtMetaValue_Name": "function(name) { return name+' [Track with custom callbacks for About track popup]'; }",
         "fmtMetaField_Name": "function(name) { return 'Track Name'; }",
         "fmtMetaDescription_Name": "function(name) { return '[Custom description]'; }"
      },
      {
         "feature" : [
            "mRNA"
         ],
         "track" : "ReadingFrame",
         "trackType": "NeatHTMLFeatures/View/Track/NeatFeatures",
         "category" : "Transcripts",
         "class" : "cds",
         "phase": 1,
         "key" : "HTMLFeatures - mRNAs",
         "onClick": {
            "url": "http://www.ncbi.nlm.nih.gov/gquery/?term={name}",
            "label": "Search for {name} at NCBI\nFeature start {start}\nFeature end {end}",
            "title": "NCBI search box"
         }
      },
      {
         "feature" : [
            "CDS:bare_predicted",
            "mRNA:exonerate",
            "mRNA:predicted"
         ],
         "urlTemplate" : "http://www.ncbi.nlm.nih.gov/gquery/?term={name}-{start}-{end}",
         "track" : "CDS",
         "category" : "Transcripts",
         "class" : "cds",
         "key" : "CanvasFeatures - mixed mRNAs and CDSs",
         "trackType": "CanvasFeatures"
      },
      {
         "track" : "Transcript",
         "description" : 1,
         "style": { "color": "#E32A3A", "description": "customdescription" },
         "key" : "CanvasFeatures - transcripts",
         "trackType": "JBrowse/View/Track/CanvasFeatures",
         "feature" : [
            "mRNA:exonerate"
         ],
         "category" : "Transcripts",
         "subfeatures" : true,
         "showNoteInAttributes": true,
         "onClick": "{exampleFeatureClick}"
      },
      {
         "feature" : [
            "BAC"
         ],
         "track" : "Clones",
         "class" : "exon",
         "description" : 1,
         "key" : "HTMLFeatures - Fingerprinted BACs",
         "category": "Miscellaneous"
      },
      {
         "feature" : [
            "EST_match:est"
         ],
         "track" : "EST",
         "class" : "est",
         "key" : "HTMLFeatures - ESTs",
         "category": "Miscellaneous"
      }
   ],
   "TRACK DEFAULTS" : {
      "autocomplete" : "all",
      "class" : "feature"
   },
   "db_args" : {
      "-adaptor" : "memory",
      "-dir" : "docs/tutorial/data_files/volvox.gff3"
   },
   "description" : "Volvox Example Database",
   "db_adaptor" : "Bio::DB::SeqFeature::Store"
}

```

This is the config file that is loaded for the volvox sample data. Note that
additional tracks are also loaded via text files containing snippets in
tracks.conf that are not included here. The pre-prepared snippets of tracks.conf
configs and the biodb config represent contrasting ways of representing a
pre-formatted instance configuration

## Using JBrowse with Existing Databases

### Extract data and reformat

The JBrowse formatting tools `biodb-to-json.pl` and `prepare-refseq.pl` can
extract data from existing databases that are supported by BioPerl `Bio::DB::*`
adapters, such as GBrowse databases created by bp_seqfeature_load.pl, or Chado
databases. Both tools accepts a configuration file in JSON format that contains
the details about how to connect to a given database, and which data to extract
from it, and which JBrowse feature tracks to create to display the data.

For example, to extract data from a [Chado](http://gmod.org/wiki/Chado) schema
in PostgreSQL, one might start with a configuration like:

     {
       "description": "D. melanogaster (release 5.37)",
       "db_adaptor": "Bio::DB::Das::Chado",
       "db_args": { "-dsn": "dbi:Pg:dbname=fruitfly;host=localhost;port=5432",
                    "-user": "yourusername",
                    "-pass": "yourpassword"
                  },
       ...
     }

In the database source name (dsn) argument, 'dbi:Pg' indicates that you are
using PostgreSQL, and the dbname, host, and port were specified when the
database was created with PostgreSQL's createdb command. The user and pass
arguments were specified when the PostgreSQL user account was created with the
createuser command. Collectively, these arguments identify the database and give
the Bio::DB::Das::Chado object access to it. Other adaptors
(Bio::DB::SeqFeature::Store, Bio:DB::GFF, etc.) will require similar
information.

#### Example Configuration

Here is a sample configuration file, usable with `biodb-to-json.pl` and
`prepare-refseqs.pl`, with each line explained. Note that, in order for this
config file to work, it would be necessary to remove the grey comments (since
JSON does not support them). Also, notice that the config file is divided into
two parts, a header section that contains information about the database, and a
body section that contains information about the feature tracks.

```javascript
{
  //This is the header. It contains information about the database.

  // description: a brief textual description of the data source.
  "description": "D. melanogaster (release 5.37)",

  //db_adaptor: a perl module with methods for opening databases and extracting
  //information. This will normally be either Bio::DB::SeqFeature::Store,
  //Bio::DB::Das::Chado, or Bio::DB::GFF, but it can also be the name of any
  //other perl module that implements the Bio::SeqFeatureI interface.
  "db_adaptor": "Bio::DB::SeqFeature::Store",

  //db_args: arguments required to produce an instance of the db_adaptor. The
  //required arguments can be found by searching for the db_adaptor on the CPAN
  //website.
  "db_args": {
              //adaptor: With Bio::DB::SeqFeature::Store, a value of "memory"
              //for the adaptor indicates that the data is stored somewhere in
              //the file system. Alternatively, it might have been stored in a
              //database such as MySQL or BerkeleyDB.
              "-adaptor": "memory",

              //dir: given the "memory" argument for the adaptor, this is the
              //file system path to the location in memory where the data is
              //stored. Data will automatically be extracted from any *.gff
              //or *.gff3 files in this directory.
              "-dir": "/Users/stephen/Downloads/dmel_r5.37"
            }, 
   //This is the body. It contains information about the feature tracks.
   //TRACK DEFAULTS: The default options for every track.
  "TRACK DEFAULTS": {

    //class: same as 'cssClass' in flatfile-to-json.pl.
    "class": "feature"
  },
  //tracks: information about each individual track.
  "tracks": [
    //Information about the first track.
    {
      //track: same as 'tracklabel' in flatfile-to-json.pl.
      "track": "gene",

      //key: same meaning as in flatfile-to-json.pl.
      "key": "Gene Span",

      //feature: an array of the feature types that will be used for the track.
      //Similar to 'type' in flatfile-to-json.pl.
      "feature": ["gene"],
      "class": "feature2",

      //urlTemplate: same meaning as in flatfile-to-json.pl. Note how 
      //urlTemplate is being used with a variable called "feature_id" defined
      //in extraData. In this way, different features in the same track can
      //be linked to different pages on FlyBase.
      "urlTemplate": "http://flybase.org/cgi-bin/fbidq.html?{feature_id}",

      //extraData: same as in flatfile-to-json.pl.
      "extraData": {"feature_id": "sub {shift->attributes(\"load_id\");}"}
    },

    //Information about the second track.
    {
      "track": "mRNA",
      "feature": ["mRNA"],

      //subfeatures: similar to 'getSubs' in flatfile-to-json.pl.
      "subfeatures": true,
      "key": "mRNA",
      "class": "transcript",

      //subfeature_classes: same as 'subfeatureClasses' in flatfile-to-json.pl.
      "subfeature_classes": {
        "CDS": "transcript-CDS",
        "five_prime_UTR": "transcript-five_prime_UTR",
        "three_prime_UTR": "transcript-three_prime_UTR"
      },

      //arrowheadClass: same meaning as in flatfile-to-json.pl.
      "arrowheadClass": "transcript-arrowhead",

      //clientConfig: same meaning as in flatfile-to-json.pl.
      "clientConfig": {
        "histScale":5
      },
      "urlTemplate": "http://flybase.org/cgi-bin/fbidq.html?{feature_id}",
      "extraData": {"feature_id": "sub {shift->attributes(\"load_id\");}"}
    }
  ]
}
```
