---
id: configuration_file_formats
title: Configuration File Formats
---

## Configuration Loading, Files, and Formats

JBrowse supports **two configuration formats**, a JSON-based format and a
GBrowse-like textual format that is easier to edit and maintain by hand than
JSON. Sites can use either format, or a mixture of both. The default shipped
configuration of JBrowse uses both: jbrowse.conf in the main JBrowse directory
for global settings, and trackList.json in each data directory for
dataset-specific configuration in JSON, and tracks.conf in the data directory
for dataset-specific configuration in .conf format.

### JavaScript Object Notation (JSON) Configuration Format (.json)

The JSON configuration format was the first format supported by JBrowse, and is
easy for software programs to read and modify. Before version 1.11.0, this was
the only format supported by JBrowse.

As an example, the trackList.json file might have something like this. Here is
an example of a BAM track

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

The specifics of this config are not essential, we are specifying an array of
tracks in a trackList.json style, and each track is an object that includes some
parameters like the urlTemplate to refer to the location of the BAM file on the
server relative to the data directory, the color of the features, etc.

#### Considerations for the JSON format

- Nested objects are specified using typical JSON format, using curly brackets
- Booleans and numbers should remain unquoted
- Functions do remain quoted however e.g. "style": { "color": "function() { /\*
  your code here \*/ }" }
- JSON strings should not contain line breaks (see Text .conf format for info on
  multiline callbacks)
- Configuration values can be stored in both jbrowse_conf.json or in
  trackList.json (or conf files) i.e. the trackList.json does not only have to
  contain tracks, can contain other config entries

### Text Configuration Format (.conf)

JBrowse 1.11.0 introduced support for a new text-based configuration format that
users of GBrowse will find very familiar, since its design borrows heavily from
GBrowse’s configuration syntax. It is fairly comfortable to hand-edit, but
rather inconvenient for automated tools to work with. To get the best of both
worlds, JBrowse supports both formats.

This text configuration format can be used to specify

- general configuration options (i.e. jbrowse.conf
  [1](#general-configuration-options))
- track-specific options (i.e. tracks.conf
  [2](#example-snpcoverage-configuration))
- standalone files with extra code (i.e. functions.conf
  [3](#including-external-files-and-functions-in-tracklistjson)).

The text format has several benefits, including the ability to specify
multi-line callbacks. Example:

```
# BAM track with a new callback
[tracks.mytrack]
storeClass  = JBrowse/Store/SeqFeature/BAM
type        = JBrowse/View/Track/Alignments2
urlTemplate = myfile.bam
key         = My BAM track
style.color = function(feature) {
   /* comment */
   return 'red';
 }
```

### Considerations for the text-based .conf format

- Comments should start with #
- The section labels, e.g. [tracks.testtrack] defines an identifier for the
  track named testtrack, so you should not have dots in your identifier, e.g.
  don't use something like this [tracks.test.track]
- Don't quote the values in the file, e.g key=My BAM track, not key="My BAM
  track"
- Nested values can specified using 'dot' notation, e.g. "style.color"
- A "section" can be specified with square brackets, e.g. [trackMetadata] will
  create the config variable trackMetadata and the values in the section are
  added to it.
- Extra JSON values can be specified in the conf file using the syntax
  json:{...} (see [4] for example)
- Very large .conf files (thousands of lines) files can take longer to parse
  than equivalent JSON
- An array of values can be built up over multiple lines. NOTE: A quirk of the
  format is that there cannot be more than 4 spaces before the + sign in each
  item. Example:

```
    [trackMetadata]
    sources =
       + data/mymeta.csv
       + data/more_meta.csv
```

### Callback-function specific considerations for the text-based .conf format

- Comments inside callbacks can use the /\* \*/ format but not the // format
- All lines of a multi-line callback should be spaced away from the left-most
  column, including the closing bracket (see the style.color example above)
- There should be no blank lines inside a multi-line callback
- Refer to [5] for more info on multi-line functions

## Configuration loading details

Configuration loading details When your web browser loads a page containing
JBrowse, and JBrowse starts, the following steps are done

- In index.html, read the URL params (e.g. query params like &data= and &tracks,
  &loc=, etc.)
- In index.html, create a JSON blob using URL params and pass them to the
  Browser.js constructor which you can see on index.html
- In Browser.js, the constructor is a JSON blob that becomes the "root
  configuration object"
- In Browser.js, mix the root config with the \_defaultConfig object
- In \_defaultConfig, the default is to include both jbrowse_conf.json and
  jbrowse.conf config files
- In jbrowse.conf, the default is to include {dataRoot}/trackList.json
  {dataRoot}/tracks.conf
- This is how you eventually get the trackList.json and tracks.conf files from
  your data directory loaded. Note that the &data=blah URL parameter becomes the
  dataRoot config parameter, so dataRoot would be "blah" in that case. h

The configuration system then merges all this information, e.g. from the URL
params, from the Browser constructors, the defaultConfigs, the jbrowse.conf, the
jbrowse_conf.json, the trackList.json, the tracks.conf, and any files that the
trackList.json or tracks.conf files themselves include, into a single config.

Generally this happens all seamlessly, and both the text-based .conf format and
.json config files can co-exist. That is because anything that can be written as
a .conf file can also be written as a .json, they are both parsed on the client
side into config objects.

## Including external files and functions in trackList.json

The trackList.json configuration format is limited when it comes to specifying
callbacks, because functions can only be specified on a single line. However,
you can create functions in an external .conf file that span multiple lines and
include them in the trackList.json configuration easily. The functions should
follow the guidelines specified in the sections
[above](configuration_file_formats.html#callback-function-specific-considerations-for-the-text-based-conf-format)

Example: say there is a complex coloring function, so it is stored in a file
called functions.conf in the data directory

    # functions.conf
    customColor = function(feature) {
        return feature.get("type")=="mRNA" ? "green" : "blue";
        /* note the closing bracket should be spaced away from the leftmost column */
      }

Then you can use this function in a particular track by referencing it with
curly brackets, or "variable interpolation".

    "style": {
       "color":"{customColor}"
    }

Make sure to also include your functions.conf in the "trackList.json" (e.g.
anywhere outside the "tracks": [ ... ] section of trackList.json), add

    "include": "functions.conf"

Note that include can also be an array of multiple files

    "include": ["functions1.conf","functions2.conf"]

In the above example, the callback parameters exactly match, so the interpolated
function can just be dropped in place. Alternatively, if the callback parameters
don't match, you can store the interpolated function in a variable and adjust
the callback parameters appropriately.

    "style": {
      "color": "function(feature) { var f={customColor}; return f(feature); }"
    }

or shorthand

    "style": {
      "color": "function(feature) { return ({customColor})(feature); }"
    }

See the general configuration section for details on the include command.
