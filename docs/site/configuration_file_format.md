---
id: configuration_file_formats
title: Configuration File Formats
---

## Configuration Loading, Files, and Formats

JBrowse supports **two configuration formats**, a JSON-based format and a GBrowse-like textual format that is easier to edit and maintain by hand than JSON. Sites can use either format, or a mixture of both. The default shipped configuration of JBrowse uses both: jbrowse.conf in the main JBrowse directory for global settings, and trackList.json in each data directory for dataset-specific configuration in JSON, and tracks.conf in the data directory for dataset-specific configuration in .conf format.

### JavaScript Object Notation (JSON) Configuration Format (.json)

The JSON configuration format was the first format supported by JBrowse, and is easy for software programs to read and modify. Before version 1.11.0, this was the only format supported by JBrowse.

As an example, the trackList.json file might have something like this. Here is an example of a BAM track

```
{
 "tracks": [
   {
     "urlTemplate" : "volvox-sorted.bam",
     "storeClass"  : "JBrowse/Store/SeqFeature/BAM",
     "type"        : "JBrowse/View/Track/Alignments2",
     "label"       : "BAM_track",
     "key"         : "My BAM track"
     "style": { "color": "red" }
   }
 ]
}
```

The specifics of this config are not essential, we are specifying an array of tracks in a trackList.json style, and each track is an object that includes some parameters like the urlTemplate to refer to the location of the BAM file on the server relative to the data directory, the color of the features, etc.

#### Considerations for the JSON format

-   Nested objects are specified using typical JSON format, using curly brackets
-   Booleans and numbers should remain unquoted
-   Functions do remain quoted however e.g. "style": { "color": "function() { /\* your code here \*/ }" }
-   JSON strings should not contain line breaks (see Text .conf format for info on multiline callbacks)
-   Configuration values can be stored in both jbrowse_conf.json or in trackList.json (or conf files) i.e. the trackList.json does not only have to contain tracks, can contain other config entries

### Text Configuration Format (.conf)

JBrowse 1.11.0 introduced support for a new text-based configuration format that users of GBrowse will find very familiar, since its design borrows heavily from GBrowse’s configuration syntax. It is fairly comfortable to hand-edit, but rather inconvenient for automated tools to work with. To get the best of both worlds, JBrowse supports both formats.

This text configuration format can be used to specify

-   general configuration options (i.e. jbrowse.conf [1](#general-configuration-options))
-   track-specific options (i.e. tracks.conf [2](#example-snpcoverage-configuration))
-   standalone files with extra code (i.e. functions.conf [3](#including-external-files-and-functions-in-tracklistjson)).

The text format has several benefits, including the ability to specify multi-line callbacks. Example:

```
## BAM track with a new callback
[tracks.mytrack]
