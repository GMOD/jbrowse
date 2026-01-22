---
id: flatfile-to-json.pl
title: flatfile-to-json.pl
---

### flatfile-to-json.pl

Each run of this script formats a single track for JBrowse. A _flat file_ is a
data set that exists entirely in a single file. For this script, the file must
be a [GFF3](http://gmod.org/wiki/GFF3),
[BED](http://www.ensembl.org/info/website/upload/bed.html), or GenBank text
file.

Basic usage:

`bin/flatfile-to-json.pl --[gff|gbk|bed] <flat file> --tracklabel <track name> [options]`

For a full list of the options supported by flatfile-to-json.pl, run it with the
--help option

`bin/flatfile-to-json.pl --help`

Example

```
         flatfile-to-json.pl \
             ( --gff <GFF3 file> | --bed <BED file> | --gbk <GenBank file> ) \
             --trackLabel <track identifier>                                 \
             [ --trackType <JS Class> ]                                      \
             [ --out <output directory> ]                                    \
             [ --key <human-readable track name> ]                           \
             [ --className <CSS class name for displaying features> ]        \
             [ --urltemplate "http://example.com/idlookup?id={id}" ]         \
             [ --arrowheadClass <CSS class> ]                                \
             [ --noSubfeatures ]                                             \
             [ --subfeatureClasses '{ JSON-format subfeature class map }' ]  \
             [ --clientConfig '{ JSON-format style configuration for this track }' ] \
             [ --config '{ JSON-format extra configuration for this track }' ] \
             [ --thinType <BAM -thin_type> ]                                 \
             [ --thicktype <BAM -thick_type>]                                \
             [ --type <feature types to process> ]                           \
             [ --nclChunk <chunk size for generated NCLs> ]                  \
             [ --compress ]                                                  \
             [ --sortMem <memory in bytes to use for sorting> ]              \
             [ --maxLookback <maximum number of features to buffer in gff3 files> ]  \
             [ --nameAttributes "name,alias,id" ]                            \
```

The --trackLabel parameter is the only required parameter, and is the "id" to
refer to your track by. The displayed name is also whatever --trackLabel is
unless --key is specified, in which case, whatever --key is will be used as the
displayed name.

By default the output is in a folder called data in your current working
directory, or whatever is specified by --out

Using --trackType CanvasFeatures is generally useful since CanvasFeatures are
newer than the default HTMLFeatures (aka FeatureTrack)
