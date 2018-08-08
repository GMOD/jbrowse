---
id: faq_troubleshooting
title: Troubleshooting
---


## Setup.sh "Installing perl prerequisites" fails for me, why?

Inspect your setup.log

If for example it says

`version.c:30:16: fatal error: db.h: No such file or directory`

Then run

`sudo apt-get install libdb-dev`

Then re-run setup.sh

If you see errors for XML::Parser

`sudo apt-get install libexpat1-dev`

Then re-run setup.sh

Also make sure you use "./setup.sh" or "bash setup.sh", do not use "sh
setup.sh"

## Should I be worried about the error "Building and installing legacy wiggle format (superceded by BigWig tracks)...failed"?

This error is often due to some system issues about compiling libraries
like libpng, and for all intents and purposes can be ignored, as it is
only used in wig-to-json.pl and this is superceded by directly reading
BigWig files (no conversion step needed)

You can follow these instructions for how to setup a BigWig file if
needed
<http://gmod.org/wiki/JBrowse_FAQ#How_do_I_set_up_a_BigWig_file.3F>

## I see a message that says "Congratulations, JBrowse is on the web" but I don't see my genome

This message normally means that jbrowse is setup but a genome hasn't
been loaded or located correctly

You can continue by running

` bin/prepare-refseqs.pl --fasta yourfile.fa`

Then reload the page and your genome should be available.

Note: If the red box on the "Congratulations page" shows a different
message than just 404 on seq/refSeqs.json, then report the error to
github or the mailing list with as much detail about your setup as
possible.

## What is this error during setup.sh "No such file or directory at /loader/0x13517b30/App/cpanminus/script.pm line 224."

This can normally be fixed by deleting ~/.cpanm

It may be due to conflict between jbrowse's own cpanm and your system
cpanm, but it should not be too problematic.

Generally deleting ~/.cpanm is harmless, it is a "build" directory
(generally ~/perl5 is the local::lib directory, and in jbrowse's case,
it actually uses an alternate local::lib directory named extlib inside
the jbrowse directory to ensure ease-of-install)

## What is "Integer overflow error"?

From what we have seen, the "Integer overflow error" sometimes appears
on BigWig tracks when your webserver is not configured correctly. It
seems to be due to errors with a "reverse proxy" or something not
forwarding the data properly.

Therefore, it is most likely not due to corrupted bigwig files or
jbrowse bugs, but more probably, due to your server's configuration.

## Why do I get a popup saying "Error reading from name store"?

This error basically says the "search function" from generate-names.pl
isn't working. You can try a couple things to fix the error

1.  Refresh your browser (especially in Apollo, where session can
    expire)
2.  Re-run generate-names.pl
3.  Re-run generate-names.pl --hashBits 16 (manually specifying the
    hashBits can fix error sometimes)
4.  Re-run generate-names.pl with --completionLimit 0 which disables
    autocomplete and makes index smaller
5.  Make sure that the fields you are indexing (e.g. Name or ID) don't
    contain full text descriptions (they should be symbols or
    identifiers, the default hash search won't index keywords but rather
    match prefixes)

Note if there are continued troubles, you can try an alternative search
engine, such as jbrowse\_elasticsearch (an experimental plugin)
<https://github.com/cmdcolin/jbrowse_elasticsearch/>

## What is this error message "Argument isn't numeric in addition (+)" loading GFF3?

If you get an error similar to this:

```
_Argument "-" isn't numeric in addition (+) at
/Library/WebServer/Documents/scbrowse/JBrowse-1.12.0/bin/../src/perl5/Bio/JBrowse/FeatureStream/GFF3_LowLevel.pm
line 32, <$f> line 44611._
```

Make sure your GFF3 is tab delimited

## It keeps showing "too much data" on my track. How do I fix it and make my track display?

Increase maxFeatureScreenDensity to a higher value. This value is by
default 0.5 but if you allow a higher "density" of features, set it to 6
for example and the message should
disappear.

## I get the error "Too much data...chunk size xxxxx exceeds chunkSizeLimit"

Several things can happen to cause this (generally on VCF of BAM tracks)

1.  You actually have exceeded the chunkSize during regular loading of
    data. You might see one specific block/region out of your whole
    track is giving this error. In this case, simply increase it.
2.  Your data is actually fairly sparse so when it first starts up, the
    "stats estimation routine", which "doubles" the region it searches
    in until it gets enough data, is failing. If it doubles too many
    times, then the chunk will become large and then hit the limit. In
    JBrowse 1.12.3 a "statsTimeout" configuration was introduced to
    avoid these doublings from consuming too much area.

## I set a value in my config file but it isn't working. Why not?

Some things to check:

  - Don't add quotes around numerical values in your JSON config files
    e.g. trackList.json. Numbers can remain unquoted. Booleans can too.
    Functions are included in quotes though, because those are evaluated
    at runtime.
  - Also don't add quotes around even the strings in the .conf config
    files e.g. jbrowse.conf or tracks.conf files. So use
    `defaultTracks=mytrack1,mytrack2` not
    `defaultTracks="mytrack1,mytrack2"`
  - Clear your cache. JSON is often cached pretty strongly. The .conf
    are cached even more. And, additionally, if there is a syntax issue
    with your JSON, it will try and use an older version oftentimes
    until you clear cache.

Also note: specifically with regards to the "defaultTracks" parameter,
defaultTracks is overridden by the users cookies and the \&tracks=
parameter in the URL, so to test whether defaultTracks works, clear you
cookies and visit without \&tracks in the url. Use alwaysOnTracks or
forceTracks if you want to have it turn on despite
cookies/URL.

## I get the error "Too many open files opening bucket log" with generate-names.pl

If you get the error such as
this

`Too many open files opening bucket log /path/to/your/data/names/00f/6.json.log at perl5/lib/perl5/Bio/JBrowse/HashStore.pm line 197, <$fh> line 85.`

Then try increasing number of files available

`ulimit -n 1000`

The default can sometimes be as low as 256 (view with ulimit -a)

## How do I fix the "Not a BAM file" issue?

This is normally due to a module called mime\_magic being enabled on
your Apache server. Two options for fixing this are 1. disable
mime\_magic or 2. configuring custom file types with AddType in your
apache configuration. See
[JBrowse\_Configuration\_Guide\#Apache\_Configuration\_Note](JBrowse_Configuration_Guide#Apache_Configuration_Note "wikilink")
for recommended fixes.

## What is the error "invalid BGZF header" on my VCF files?

Your server is misconfigured for VCF.GZ files, and this can be due to it
thinking that it should set "Content-Encoding: gzip" on the your .vcf.gz
files. Your webserver should actually NOT put "Content-Encoding: gzip"
on your VCF.GZ files. If you think you have this problem, can try using
"curl -I" to view the headers that your server is putting on your VCF.GZ
file.

Note: this issue can be confusing to research about, especially the
"Content-Encoding: gzip" issue, because most information on the web
typically says that it should put "Content-Encoding: gzip" on gzip data,
and this header implies that the client should decompress the content
itself, however JBrowse does not want this to happen because VCF.gz
files are a special type of gzip, specifically, bgzip, so it is manually
decompressed by JBrowse javascript
code.

## My track doesn't display the gene names, but I expected it to. Why not?

If you have a very dense track with many features, JBrowse might decide
to hide the labels to save space, but you can force them to display
again by adding this to your trackList.json

`"style":{"labelScale": 0.01}`

This says that the label will be displayed when the zoom level is
greater than 0.01 regardless of how many features are there. The value
0.01 is measured in pixels per base pair, at max zoom level, there are
25 pixels per base pair for example, and when zoomed out farther, each
base takes up less space, hence 0.01 will display the feature names
always if you are reasonably zoomed in.

You can also change maxHeight to a larger value to make the track taller
and see more features.

## Why does my track keep saying "Loading"?

This normally means some javascript code for handling the track has
crashed. Check your javascript console for clues on how to fix it. Add a
github issue if it represents a real bug\!

Note: you should use the "-dev" packages for debugging, i.e.
JBrowse-1.11.6-dev.zip as opposed to for example JBrowse-1.11.6.zip,
because the -dev package contains "un-minified" source code and more
readable javascript console messages

## My CanvasFeatures don't show up with subfeatures, why not?

If your GFF does not follow this structure

`gene->mRNA->exon+CDS`

Then you need to add extra configuration

Specifically, if it is "transcript" instead of "mRNA" (which is common
for Ensembl GFF for example), then you must set

`"transcriptType": "transcript"`

Also, if you only have "exon" and no "CDS", then you need to set the
subParts config (the default settings assumes that both exons and CDS
exist, so if there are only exons, like in a cufflinks output file, then
you need this)

`"subParts": "exon"`

If your GFF does not include UTR, but the UTR can be "implied" from the
difference between the exon and CDS boundaries, then you can use this on
your track type to enable them

`"impliedUTRs": true`

If your GFF file has features with this structure

`match -> match_part`

This only has two levels, you might consider just setting the "Segments"
glyph

`"glyph": "JBrowse/View/FeatureGlyph/Segments"`

The segments glyph accepts all subfeatures, so match and match\_part
structure is fine.

Note: the tips above only apply for CanvasFeatures tracks

## My HTMLFeatures don't show up with subfeatures, why not?

HTMLFeatures generally load data at the "transcript" level. This means
that they should be loaded with something similar to --type mRNA when
using flatfile-to-json.pl in order to see the transcript
subfeatures

`flatfile-to-json.pl --type mRNA --gff your_genes.gff --trackLabel MyTrack`

This means that it loads the features where mRNA would be in column 3 of
your GFF. If it was an Ensembl GFF, you might use instead --type
transcript

Note that this also loses the information about the "parent" gene
feature however, so it might be worth loading an additional track at the
gene level like

`flatfile-to-json.pl --type gene --gff your_genes.gff`

This track will not display the transcript and exon subfeatures, but
instead just show a box where the gene is, so this is commonly called a
"gene spans" track

Note: If you would like a track that displays with the transcript
subfeatures, you can use the CanvasFeatures type track (i.e. load with
flatfile-to-json.pl --type gene --trackType CanvasFeatures ...)

## Why are my subfeatures being displayed as separate features?

Your GFF should use proper ID and Parent relations. Your subfeatures do
not need to themselves have IDs if they have no further subfeatures, but
they must have a Parent pointing to the Parent's ID

Note that it should be spelled Parent, not
PARENT

## I get the error "Building and installing legacy bam-to-json.pl support (superseded by direct BAM tracks) ... failed"

If you get the error "Building and installing legacy bam-to-json.pl
support (superseded by direct BAM tracks) ... failed. See setup.log file
for error messages. If you really need bam-to-json.pl (most users
don't), try reading the Bio-SamTools troubleshooting guide at
<https://metacpan.org/source/LDS/Bio-SamTools-1.33/README> for help
getting Bio::DB::Sam installed."

Then note:

  - This error message can be ignored. It refers only to not being able
    to run a small outdated feature of jbrowse.
  - If you want to fix it, the issue might refer to a conflict with the
    system version of samtools. Uninstall your system samtools and then
    re-run setup.sh (notably homebrew samtools causes this step to fail)
  - Again, this only refers to bam-to-json.pl, which converts entire BAM
    files to json. It is better to use the add-bam-track.pl which simply
    can read BAM files directly from the server with no
conversion.

## After I load my track it appears in the tracklist, but the track appears empty

This can happen if the chromosome names from your track don't match the
names from your reference genome.

Try and make sure the chromosome names from your evidence tracks match
the chromosome names from the reference genome fasta.

## My BigWig file is producing an error related to DataView or jDataView

Examples of error messages

  - RangeError: Offset is outside the bounds of the DataView (Chrome)
  - Error: jDataView length or (byteOffset+length) value is out of
    bounds (Firefox)
  - RangeError: Out of bounds access (Safari)
  - RangeError: Argument 1 accesses an index that is out of range
    (Firefox)

Check that

  - The file that you are using is actually the right filetype (i.e.
    maybe it is a textfile, but you are giving it a bigwig file
    extension)
  - The webserver you are using allows Range HTTP headers (apache,
    nginx, etc should allow this by default)
  - That you aren't simply opening up your index.html without a
    webserver i.e. using <file:///> protocol (which will not allow
    accessing byte-range Range HTTP requests and cause this
error)
