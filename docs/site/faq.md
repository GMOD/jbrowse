---
id: faq
title: JBrowse FAQ
---

## General

### How do I get started with JBrowse quickly

    git clone https://github.com/gmod/jbrowse
    ./setup.sh
    npm run start

See https://github.com/gmod/jbrowse#install-jbrowse-from-github-for-developers
for details

Using `npm run start` launches an express.js server on port 8082

You can also just copy and paste your entire jbrowse directory that you cloned
into your webserver folder if you have an existing apache or nginx server

### How do I use plugins with JBrowse

In JBrowse 1.13.0 and later, you must rebuild JBrowse

- download the "-dev" version of JBrowse (or use a git clone, this is
  equivalent)
- put the plugin(s) in the plugins folder
- run ./setup.sh (you can add a "-f" to this command to make it go faster if
  you've run setup before)

This will build the plugins properly. The ./setup.sh automatically downloads the
npm modules needed for building the codebase.

Reason: JBrowse switched to a webpack based build system in 1.13.0 which bundles
all dependencies at build time so there is no notion of run-time module
resolution

### How do I modify JBrowse source code

In modify JBrowse source code you must use `npm run watch` (equivalently
`yarn watch`) to watch for changes to the codebase

This uses `webpack -w` in the background to dynamically include your changes as
you are developing.

When you are done modifying the source code, use ./setup.sh to create a minified
final build.

Note: this applies to JBrowse core and for plugins, as plugins will also be
watched by this process.

Also note: if you add or remove files, you should kill the watch process and
restart

### What webserver is needed for JBrowse

Most established HTTP servers such as Apache or nginx can work. You can just
unpack JBrowse into your http web directory (/var/www/html, or htdocs, or
similar) and follow the setup instructions
<http://jbrowse.org/code/JBrowse-1.12.1/docs/tutorial/>.

JBrowse also comes bundled with an express.js server that works for most
purposes. You can use `npm run start` to start the server on port 8082.

Other configuration about your server will depend on your needs, but generally
no special setup is needed for the http server, and there is no "server side"
code used by JBrowse (cgi, php, etc).

Note: servers like "SimpleHTTPServer" from Python are not full featured enough
to run all JBrowse features correctly (SimpleHTTPServer does not support Range
queries). RangeHTTPServer does pass the test suite for jbrowse though, so it
should work for tests <https://github.com/danvk/RangeHTTPServer> (but not for
compressed json files).

http-server from npm is another option

```
npm install -g http-server
http-server
# visit http://localhost:8080/ in the browser
```

That will quickly get you setup with a webserver for looking at jbrowse

Also note: sometimes, people will download JBrowse and double click the html
file and open up <file:///c/myfolder/jbrowse/index.html> in the webbrowser,
however, running JBrowse like this is not recommended. This may appear to work
for some limited cases but will fail on many others. You can use JBrowse Desktop
if you want to use jbrowse locally without a webserver.

### How do I run the code using the github clone

Running code off github is fairly straightforward, and you can actually run it
on your webserver without any build steps

```
 git clone <https://github.com/gmod/jbrowse>
 cd jbrowse
 ./setup.sh
```

Then move that directory into your web server root and you are ready to go.

Note: If you want to make your own custom build you can use

`make -f build/Makefile release`

Also also note: post 1.13.0 releases of JBrowse will automatically create a
minified custom build when you run ./setup.sh if you have a -dev release or a
github clone.

### What are the different config file formats?

JBrowse uses both json and ".conf" files for configuration (the .conf is a
custom format that is parsed on the client side), and both file types can
contain the same types of information

Examples of JSON format

- trackList.json
- jbrowse_conf.json

Examples of conf format

- tracks.conf
- jbrowse.conf

If you wonder why you would use the .conf format, some benefits include: easy to
edit, easy to append to with text file tools, can define multi-line functions
(JSON doesn't allow newlines, so callbacks are specified on a single line).

All the config files are combined using a system of "includes" at runtime. The
"order" behind loading all the config files is something like this:

1.  The index.html initializes a global Browser object, and the paramaters to
    the constructor are used as the start of the config
2.  The Browser class "includes"  both jbrowse_config.json and jbrowse.conf
    using defaultConfig
3.  The jbrowse.conf by default includes both {dataRoot}/trackList.json and
    {dataRoot}/tracks.conf, which resolves to whatever data directory is
    currently being used
4.  The trackList.json or tracks.conf files can themselves include other files,
    such as a "functions.conf" file. See
    [here](configuration_file_formats.html#including-external-files-and-functions-in-tracklistjson)
    for details

### What type of coordinate system does JBrowse use

Internally it uses 0-based coordinates

When you view the data (like in the view details popups, and in their position
on the browser) it is 1-based.

The functions like feature.get('start') would return 0-based.

### What is the difference between CanvasFeatures and HTMLFeatures?

There are a lot of differences\!

- CanvasFeatures are newer.
- CanvasFeatures can support Gene glyphs, i.e., a gene with multiple transcripts
  are grouped together on the screen. In HTMLFeatures, you have to load at the
  "transcript" level, so this loses the gene level info (if you do try to load
  the --type gene, it will just load "gene spans", but then it doesn't display
  the transcript subfeatures. not terrible, but not as cool as CanvasFeatures).
- CanvasFeatures are faster if your have a lot of data.
- They can support more dynamic shapes (See the SashimiPlot plugin
  <https://github.com/cmdcolin/sashimiplot> for example of Arc track, or
  NeatCanvasFeatures for example of "intron hats")
- They have different configuration functions. All the "style" methods on
  CanvasFeatures can be callback functions, so you can have a dynamic callback
  for the feature color, label, etc. The "glyph" can also be a callback, so you
  can make a function to change to a box or diamond glyph depending on feature
  attributes.
- CanvasFeatures have better mouseovers. The HTMLFeatures mouseovers use the
  HTML title attribute which can only display plain text. On CanvasFeatures
  tracks, the mouseover it is a real tooltip that you can embed arbitrary HTML
  inside of.

### What is a glyph?

Glyphs are a "unit" of drawing in a CanvasFeatures track. The glyph is just code
that is responsible for drawing a feature on the screen.

### What does generate-names.pl do?

Generate-names.pl will create a "search index" on, by default, the "names, IDs,
and Alias" fields for tracks loaded with flatfile-to-json.pl or
biodb-to-json.pl. It will not try to index ids from BAM files or bigwigs, but it
does index names from VCF files too.

You can select specific tracks that you want to index with --tracks arguments to
generate-names.pl. You can disable "autocomplete" by setting --completetionLimit
0 on generate-names.pl. You can "update" your search index by using
--incremental

Also note: you can index additional fields of a GFF file with generate-names.pl
by specifying the --nameAttributes flag to flatfile-to-json.pl. E.g.
flatfile-to-json.pl --nameAttributes "my_custom_field,name,id". The default
value for this flag is "name,alias,id". Note that the flag is passed to
flatfile-to-json.pl and then these values are automatically indexed by
generate-names.pl later.

### What is the "label" in trackList.json and what is the key?

The track "label" is more like the track "identifier", it should be unique\! The
key is actually more like the name that is displayed for the track. It might
sound counter intuitive to have label and key this way. Key is not a required
attribute, but label is. The label can be specified by --trackLabel on command
line tools. The key can be specified by --key.

### How do I search for a feature in JBrowse

Some people don't know this, but the box that shows your current location, e.g.
"chr10:1..1000 (1.0 Kb)" is also a search box\! You can search for things that
generate-names.pl indexed here.

Also, the search index can be used to "link" to features, for example, if you
construct a link such as <http://localhost/jbrowse/?loc=GENE1234>

Then the search index will resolve the location of that gene and jump to it
automatically.

### How do I get full text descriptions to be searched?

Try out
[jbrowse_elasticsearch](https://github.com/cmdcolin/jbrowse_elasticsearch), it
is still experimental but it allows this. Or, implement your own JBrowse REST
names API. The default generate-names.pl is not built for searching full text
descriptions.

### How do I set up multiple genomes in a single jbrowse instance?

By default, the scripts will output to a subdirectory called "data" in the
jbrowse folder

You can control that output with most scripts using the --out parameter. This
enables you to have "multiple data directories".

Once the data directories are ready then use the URL bar to select which data
directory to use with ?data=my_data_dir e.g.

<http://mysite.org/jbrowse/?data=data1> <http://mysite.org/jbrowse/?data=data2>

Note that with [Apollo](http://genomearchitect.org), you can output the data
directories to some given directory and add the directories via the user
interface.

You can also setup the "dataset selector" see
[dataset selector](dataset_selector.html) and
[below](#what-is-the-dataset-selector)

### What is the dataset selector

The dataset selector is a dropdown that can list all the genomes that are in
your jbrowse instance

To configure the dataset selector, set a dataset_id inside your trackList.json
or tracks.conf on your data directory, and then in jbrowse.conf, add a list of
all your datasets with the dataset_ids that you listed in the genome's data
directory.

See [dataset selector](dataset_selector.html)

### How do I change the name that is displayed on my features

If you don't like the names in the "Name" or "ID" column of your GFF, and you
instead want to use some other field as the name to be displayed, then you can
add this to your trackList.json

`"style": {"label": "my_custom_field"}`

Note: you can also index "my_custom_field" with generate-names.pl too by
supplying my_custom_field to the --nameAttributes argument from
flatfile-to-json.pl. After loading it from flatfile-to-json.pl in that manner,
it will be indexed by generate-names.pl.

Also note: you can make the description a custom field too in a similar way

`"style": {"description": "my_custom_description_field"}`

### Can I speed up JBrowse load time with VCF and BAM files

If the BAM and VCF files you have are large, the BAM index or TABIX index files
can become large as well. Since the indexes must be fully downloaded before any
of the data can be displayed, you can break your files up by chromosomes, and
use {refseq} in a urlTemplate to break it up into manageable chunks.

E.g.

`"urlTemplate": "myfile_{refseq}.bam"`

That would search for myfile_chr1.bam and myfile_chr1.bam.bai when you open that
track while browsing chr1

### Can I speed up generate-names.pl?

Try using --completionLimit 0 with the command. It will disable autocompletion
but still allow you to search exact matches.

Note that you can use generate-names with --completionLimit 20 on some tracks
and then generate-names with both --incremental and --completionLimit 0 flags on
very information dense tracks.

## Customization

### How do I customize feature colors (with CanvasFeatures)

In CanvasFeatures, this is done with the style-\>color parameter. The
style-\>color parameter can be a function, so for example, if you have a track
like this in trackList.json

```
    {
       "label": "test",
       "type": "CanvasFeatures",
       "storeClass": "JBrowse/Store/SeqFeature/NCList",
       "style" : {
          "className" : "feature"
       }
    }
```

Then you can add a color like this

```
    {
       "label": "test",
       "type": "CanvasFeatures",
       "storeClass": "JBrowse/Store/SeqFeature/NCList",
       "style": {
           "color": "function(feature) { return 'red'; }",
           "className": "feature"
        }
    }
```

This will make your features red. You can also hardcode a color instead of a
callback

```
    "style": {
       "color": "red"
    }
```

It can be dynamic too though

```
    "style": {
       "color": "function(feature) { return feature.get('score')>50 ?'blue':'red'; }"
    }
```

The color can be a name or rgb(...) or hsl(...). rgba works too

Note: if you get a very complex function, consider putting it in a separate
functions.conf file and include it, see config guide
["Including external functions in trackList.json"](configuration_file_formats.html#including-external-files-and-functions-in-tracklistjson)

Note: with HTMLFeatures, it is similar, but you have to use hooks-\>modify
instead of style-\>color.

Also note: you cannot create the functions via the UI in "Edit config". You have
to specify the callback functions via the config files themselves.

### How do I add a legend to the track in the "About this track" dialog?

You can add custom info to the "About this track" dialog boxes by specifying
metadata for the track in trackList.json, e.g.

`"metadata": {"legend": "Red means this, green means that"}`

This will create a box called "legend" inside the "About this track" box.

All the "metadata" fields are added to the "About this track" dialog box, and it
can also support HTML, e.g

`"metadata": {"randominfo": "<p style='color:green'>Green text</p>", "otherrandominfo": "<p style='color:red'>Red text</p>"}`

**NOTE: in JBrowse 1.16.0 and later you also have to add unsafePopup to your
track that has this for the HTML rendering to work in the about dialog**

You can also use the fmtDetailMeta and fmtFieldMeta callback functions to change
pre-existing values
<http://gmod.org/wiki/JBrowse_Configuration_Guide#Additional_customizations_to_the_pop-up_boxes>

### How do I customize the dialog boxes for the features?

There are many ways to do so.

1.  To customize the default 'View details' type popups, you can override fields
    by adding a function to your track config like fmtDetailValue_Name:
    "function(value, feature) { return value + ' is the original name'; }"
2.  To make a different custom action for a dialog, make onClick-\>action a
    javascript callback and make it popup your own custom dialog box, made using
    dijit or any other javascript type language. The function would have the
    format function(clickEvent) but you can access feature information from
    this.feature inside the callback
3.  Set action: "newWindow" and url:
    "[http://google.com/?q={name}](http://google.com/?q=%7Bname%7D)" can
    redirect to search google for the feature's name (note: the {name} is a
    template parameter that is automatically filled out when a feature is
    clicked)
4.  Set action: "iframeDialog" and url:
    "[http://google.com?q={name}](http://google.com?q=%7Bname%7D)"
5.  Set onClick-\>action to contentDialog and then set onClick-\>content to a
    string or a functioning returning a string or a "promise". A promise can
    come from calling dojo.xhrGet or similar so it can retrieve dynamic content.
    The function would have the parameters function(track, feature)

Those are just a couple examples

More straightforwardly, basically any field that exists for the feature (e.g.
all the things in column 9 for a GFF) will be added to the default "View
details" boxes, so it you add more details to the GFF3 column 9, then your
popups will have more information.

### How do I customize the main menu bar

Typically this is done using a plugin. You can make your plugin add new menu
items. See the RegexSequenceSearch plugin for an example
<https://github.com/GMOD/jbrowse/blob/master/plugins/RegexSequenceSearch/js/main.js#L23-L30>

You can also create a new "menu" i.e. (default says file, view, help) and you
can extend it to use (file, view, tools, help) or similar. The GMOD/Apollo
codebase does this
<https://github.com/GMOD/Apollo/blob/master/client/apollo/js/main.js#L368-L379>

### How do I customize the "track menu" on a track?

In general, you would want to make a new "track type", you can override
\_trackMenuOptions on your custom track type. See
<https://github.com/cmdcolin/gccontent/blob/master/js/View/Track/GCContentXY.js>
for example

### How do I customize the right-click menus on features

You can edit the menuTemplate parameters on the trackList.json.

Note: when you add 1 method to menuTemplate, it overwrites 1 of the default
elements in the default right-click menu. This is sort of a bug. If you want to
"add" your method to the list, then create a "blank" menuTemplate items for the
View details, etc. See
[customizing right click context menus](mouse_configs.html#customizing-right-click-context-menus)
for more details.

### How do I access data about my features in my callback or plugin

Each feature is based on what is called a feature Model. The
JBrowse/Model/SimpleFeature is an example of this, and it allows you to call
feature.get('variable_of_interest') on many different variables

Common types of requests

- feature.get('subfeatures') - to get all subfeatures of a feature.
- feature.get('parent') - for the parent of a feature
- feature.get('id') - for the ID
- feature.get('name') - for the name
- feature.get('my_gff_field') - to get any given field from your GFF3 column 9
- feature.get('genotypes') - to get the genotypes of a VCF feature, it returns a
  complex object that you can inspect. See "variantIsHeterozygous" in the
  jbrowse configuration guide for an example of parsing the genotype
- feature.get('start') - to get start position
- feature.get('end') - to get end position
- feature.get('seq_id') - to get the chromosome name
- feature.get('seq') - to get the sequence, only works on BAM data since it
  includes sequence data in data file. In general, you must use
  getReferenceSequence over a region to get a feature's sequence

Note that if you have multiple values for a value in column 9 (specified by
comma separated values), then feature.get('your_value') will return an array
(except for for Note which turns into Note, Note2, Note3, etc)

For reference JBrowse/Model/SimpleFeature is a widely used feature class. The
BAM features for example use a different model because they must be smaller and
quicker to operate at speed (they are called Lazy features, so not all their
info is evaluated unless it is needed on-demand). BAM features also have things
like feature.get('seq'), to get the sequence of the alignments, but normal
features like genes do not have feature.get('seq')

### How to get default tracks to display every time a user opens the browser?

There are several config variables which you can define in any of your config
files (trackList.json for example can have config items like this, just put it
outside of the track section of tracklist.json, or under a \[general\] section
of tracks.conf) as a comma separated list of track labels

- alwaysOnTracks: Track always come up
- forceTracks: Overridden by URL bar
- defaultTracks: Overridden by URL bar and cookies

### How can I embed JBrowse on a page

The easiest way to "embed jbrowse" on another page would be to use an iframe to
link to the jbrowse instance of choice e.g.
<http://gmod.org/wiki/JBrowse_Configuration_Guide#Embedded_mode>

Note that it is also possible in theory (and sometimes in practice) to embed
JBrowse without an iframe. For example, you can take the index.html of JBrowse
and customize it for your purposes. You can for example change the GenomeBrowser
div to not have 100% width and height, and instead make it have width 1000px and
height 800px for example and put it in a specific part of your webpage.

The problem with embedding without iframe is typically that you can easily run
into issues with "CSS collisions" where the CSS from your specific page collides
with jbrowse elements, of CSS from jbrowse elements collides with your outside
page.

### Can I change the color of bases in the Sequence/Alignments2/SNPCoverage tracks?

Yes. It is sort of a "hidden setting", but you can actually change colors on the
Sequence/Alignments2/SNPCoverage track using CSS

See css/sequence.css:

```
/* colors for bases must be specified as hex or rgb/hsl strings, no named colors such as 'red' */
.base_n {
    background-color: #C6C6C6;
}
.base_a {
    background-color: #00BF00;
}
.base_c {
    background-color: #4747ff;
}
.base_t {
    background-color: #f00;
}
.base_g {
    background-color: #d5bb04;
}
.base_reference {
    background-color: #a33;
}
.base_deletion {
    background-color: #999;
}
```

If you change those, it will be reflected in your
Sequence/Alignments2/SNPCoverage track.

The .base_reference is the background grey of the SNPCoverage plot, and if you
actually add to the list and make .base_skip you can make the intron grey change
color SNPCoverage.

### How can I link BLAST results to JBrowse

If you use sequenceserver, you create a custom JBrowse link by creating a
links.rb file and running

`sequenceserver -D database_dir -r links.rb`

The links.rb is then a file that gets included by sequenceserver to generate new
links to external resources automatically. In our case, we parse all the HSPs
(high scoring pairs) from the hits from BLAST and string them together into a
single feature (e.g. by taking the min and max of all hsps)

Note: The links.rb passes us the accession and hsps variables implicitely. The
notation for the query start/end and subject start/end are shortened as qend,
send, sstart, and qstart

We use the addFeatures URL parameter of JBrowse to make the features appear. For
reference, see
<http://gmod.org/wiki/JBrowse_Configuration_Guide#Controlling_JBrowse_with_the_URL_Query_String>

```
require 'json'
module SequenceServer
   module Links
       def jbrowse
           qstart = hsps.map(&:qstart).min
           sstart = hsps.map(&:sstart).min
           qend = hsps.map(&:qend).max
           send = hsps.map(&:send).max
           first_hit_start = hsps.map(&:sstart).at(0)
           first_hit_end = hsps.map(&:send).at(0)
           my_features = ERB::Util.url_encode(JSON.generate([{
               :seq_id => accession,
               :start => sstart,
               :end => send,
               :type => "match",
               :subfeatures =>  hsps.map {
                 |hsp| {
                   :start => hsp.send < hsp.sstart ? hsp.send : hsp.sstart,
                   :end => hsp.send < hsp.sstart ? hsp.sstart : hsp.send,
                   :type => "match_part"
                 } 
               }
           }]))
           my_track = ERB::Util.url_encode(JSON.generate([
                {
                   :label => "BLAST",
                   :key => "BLAST hits",
                   :type => "JBrowse/View/Track/CanvasFeatures",
                   :store => "url",
                   :glyph => "JBrowse/View/FeatureGlyph/Segments"
                }
           ]))
           url = "<http://yourwebsite.com/jbrowse/>" \
                        "?loc=#{accession}:#{first_hit_start-500}..#{first_hit_start+500}" \
                        "&addFeatures=#{my_features}" \
                        "&addTracks=#{my_track}" \
                        "&tracks=BLAST" \
                        "&highlight=#{accession}:#{first_hit_start}..#{first_hit_end}"
           {
             :order => 2,
             :title => 'JBrowse',
             :url   => url,
             :icon  => 'fa-external-link'
           }
       end
   end
end
```

Important note: if you have multiple organisms, then you should encode your
FASTA files to contain the organism name, e.g.

`>Human-chr1` `ACCGAATCAGCTATCGA...`

This is because BLAST does not tell you which database your hits come from.

Then you must modify your links.rb use this information by parsing the
"accession" variable.

```
require 'json'
module SequenceServer
   module Links
       def jbrowse
           qstart = hsps.map(&:qstart).min
           sstart = hsps.map(&:sstart).min
           qend = hsps.map(&:qend).max
           send = hsps.map(&:send).max
           first_hit_start = hsps.map(&:sstart).at(0)
           first_hit_end = hsps.map(&:send).at(0)
           organism = accession.partition('-').first
           sequence_id = accession.partition('-').last
           my_features = ERB::Util.url_encode(JSON.generate([{
               :seq_id => sequence_id,
               :start => sstart,
               :end => send,
               :type => "match",
               :subfeatures =>  hsps.map {
                 |hsp| {
                   :start => hsp.send < hsp.sstart ? hsp.send : hsp.sstart,
                   :end => hsp.send < hsp.sstart ? hsp.sstart : hsp.send,
                   :type => "match_part"
                 } 
               }
           }]))
           my_track = ERB::Util.url_encode(JSON.generate([
                {
                   :label => "BLAST",
                   :key => "BLAST hits",
                   :type => "JBrowse/View/Track/CanvasFeatures",
                   :store => "url",
                   :glyph => "JBrowse/View/FeatureGlyph/Segments"
                }
           ]))
           url = "<http://yourwebsite.com/jbrowse/>" \
                        "?data=#{organism}" \
                        "&loc=#{sequence_id}:#{first_hit_start-500}..#{first_hit_start+500}" \
                        "&addFeatures=#{my_features}" \
                        "&addTracks=#{my_track}" \
                        "&tracks=BLAST" \
                        "&highlight=#{accession}:#{first_hit_start}..#{first_hit_end}"
           {
             :order => 2,
             :title => 'JBrowse',
             :url   => url,
             :icon  => 'fa-external-link'
           }
       end
   end
end
```

Another important note: you should BLAST the actual genome sequence if you are
linking to genomic coordinates of JBrowse. If you BLAST a CDS database, you may
need to load CDS sequences into JBrowse, or translate the CDS coordinates into
genomic coordinates

Also also note: if you are running sequenceserver through apache e.g. with
Passenger Phusion, then you can modify the config.ru to have a "require
'./links.rb'" line and keep the links.rb in that same directory as config.ru
e.g.

```
require 'sequenceserver'
require './links.rb'
SequenceServer.init(:config_file => ".sequenceserver.conf")
run SequenceServer
```

## Data loading tips

### How can I only load a specific type of feature from my GFF file?

You can use the --type argument for flatfile-to-json.pl

E.g.

`flatfile-to-json.pl --type mRNA —gff mygff.gff`

This will only load mRNAs from the GFF. Additionally, if you want to filter on
the source column of the GFF, you can augment the --type argument with an extra
formatted parameter for source --type mRNA:augustus

The --type argument can also be a commas separated list of filters like this.

### What if I dont want to load the sequence data for the genome, but I want to display the features?

prepare-refseqs.pl accepts a --sizes parameter, which takes a "chrom.sizes" file
which is just a tab separated file with two columns, refseq names and their
lengths

This let's you view the genome and the features on the genome without loading
the sequence data.

### How do I convert GTF to GFF

Since flatfile-to-json.pl does not accept GTF, you can convert your GTF to GFF3.
Tools like gffread or gtf2gff3.pl are available

The gffread tool is packaged with cufflinks so simply install cufflinks, then
you can run

`gffread -E merged.gtf -o- > merged.gff3`

## Other

### Can I get started with JBrowse without all the fuss of setup.sh and what-not

Yes\! Try the jbrowse desktop versions, built with electron\!

The Windows and OSX versions are easy to use, and all you need is to open your
fasta file (ideally: indexed fasta).

You can also open BAM tracks, BigWig, VCF.gz, GFF3, BED, BigBed, and more\!

### Can I install the perl packages using cpanm?

Yes\! The packages are not hosted on cpan, but you can install them from github
using cpanm

`cpanm git://github.com/GMOD/jbrowse.git`

This will install jbrowse scripts such as prepare-refseqs.pl and
flatfile-to-json.pl to, commonly, a folder like ~/perl5/bin if you are using
local::lib, or simply a system folder like /usr/local/bin if using sudo.

There are a couple scripts that don't work with this such as maker2jbrowse, but
it is otherwise fine to install the perl scripts this way.

Note: you might also use --notest option to avoid testing all dependencies

### Why does my trackList.json contain "className" (even on CanvasFeatures?)

className refers to a CSS class for your features.

If you are using CanvasFeatures, this is an unused artifact.

If you are using HTMLFeatures, then you can add custom CSS to make your feature
have a custom class. Note that the "subfeatureClasses" is a related variable: it
is a CSS class for subfeatures.

By default, it would just use the "exon" class for exons or whatnot, but
subfeatureClasses allows you to create a map e.g.

`"subfeatureClasses": {"exon": "myCustomExonCSSClass"}`

### How do I create a Tabix indexed GFF

The most reliable way to do this is to use gff3sort from
<https://github.com/billzt/gff3sort>

See <http://biorxiv.org/content/early/2017/06/04/145938> for a description of
their algorithm

Note that you can try and use GNU sort (sort -k1,1 -k4,4n) or genometools (gt
gff3 -sortlines) but these both have problems where it will place child features
behind the parent features in the GFF

In JBrowse 1.14, the problem of child features being behind their parents was
fixed so the full GFF3Sort algorithm from @billzt is now not necessary and a
simple GNU sort does work.

### How do I create a Indexed FASTA?

JBrowse 1.12+ allow opening FASTA files directly in the browser or via JBrowse
Desktop. Indexed FASTA is however much more efficient as it does not require
being read into memory.

To create an Indexed FASTA, install samtools and run

`samtools faidx yourfile.fa`

This will create a file called yourfile.fa.fai. When you want to open up your
own sequence file in JBrowse, you can then use the "Open sequence file" option,
and drag and drop both the .fa and the .fai in the file area. JBrowse will
understand that these are to be used together, and will open it.

Note: you can also open unindexed FASTA, but it requires parsing the whole FASTA
up front, so this is slow and memory intensive with the current setup. Indexed
FASTA is quite efficient though.

### How do I install a plugin

#### Important note

**After version 1.13 which introduced webpack to JBrowse, then you must re-run
"setup.sh" after adding or removing a plugin.**

**Also, you must use the JBrowse-1.x.x-dev.zip instead of just
JBrowse-1.x.x.zip**

#### Configuration

To install a JBrowse plugin, generally the easiest thing to do is to put the
code in the plugins directory (e.g. clone the repo to plugins/GCContent or
plugins/SashimiPlot), and then just say this in your jbrowse.conf (or
tracks.conf

```
[GENERAL]
plugins += GCContent
plugins += SashimiPlot
```

Equivalently, in jbrowse_conf.json (or trackList.json), that would mean just
having

`"plugins": ["GCContent", "SashimiPlot"]`

Essentially, you are just giving the configuration an array of folder names to
look for in the plugins directory

Alternatively, you can also add the "name" and "location" of the plugin too.

```
"plugins": [{
    "name": "GCContent",
    "location": "plugins/gccontent"
}]
```

Here "plugins.GCContent" means that the "name" of your plugin is "GCContent".
This is slightly important, because the "name" is used for the purposes of the
"namespace" that the plugin has i.e., when you specify a track with the "type":
"GCContent/View/Track/GCContentXY" in trackList.json, then that means the "name"
of the plugin should be GCContent, not lowercase gccontent.

Note that the above config would be equivalent to this in the jbrowse.conf
format

```
[ plugins.GCContent ]
location = plugins/gccontent
```

Again, you don't need to use this format if the name of the directory is as
expected e.g. plugins+=GCContent looks for a folder named GCContent

Note: "location" is a relative URL to the jbrowse root directory. Normally when
a plugin is successfully installed, you will get a console.log message from the
plugin saying that it has started up (that depends on the plugin but most
jbrowse plugins just do that by convention)

Another note: you can add plugins declarations to trackList.json or tracks.conf
instead of jbrowse_conf.json or jbrowse.conf too. In tracks.conf just put it at
the top of the file or underneath a line that says \[GENERAL\]

Final note: it is best to only include plugins in one file, e.g. put all the
includes in jbrowse.conf or all configs in tracks.conf, not mix them in
different config files.

### Can I create an adaptor for an existing web service?

If your web service doesn't exactly match the requirements for the JBrowse REST
API tracks, then you can create your own "store class" as a plugin. This
basically just requires one thing:

    bin/new-plugin.pl MyPlugin

Then, simply make a dojo class (using "dojo declare") in your plugin that
implements a "getFeatures" function. The getFeatures function receives a query
object with query.start, query.end, query.ref e.g. chr1 along with 3 callbacks:
featureCallback, finishCallback, and errorCallback. If there is an error, than
call the error callback obviously. Otherwise, for each feature that you want to
display, call featureCallback with that (use JBrowse/Model/SimpleFeature to
represent the feature). When you are out of features for the query region, call
finishCallback.

Check out the genes store class from the myvariantviewer plugin for an example
of a simple custom adaptor
<https://github.com/cmdcolin/myvariantviewer/blob/master/js/Store/SeqFeature/Genes.js>

### What is a plugin useful for?

A JBrowse plugin can do a wide variety of things. Some common use-cases would be

- making a custom track type or visualization
- making an adapter for a new file type or "store class"
- adding new pieces to the user interface

Other things that are extensible include

- accessing custom search backends (the so called "Names API")
- accessing custom filter functions <https://github.com/cmdcolin/filterplugin>
- making custom "Save track data" export formats

One cool thing is that when you create a plugin, you can simply reference it
textually in your config file e.g. trackList.json, and then JBrowse will load
the "class" from your plugin and initialize it

### What background should I have for creating a plugin

Make sure to review this link describing dojo declare, the way dojo declares new
object types
<http://dojotoolkit.org/reference-guide/1.10/dojo/_base/declare.html>

Also review <http://dojotoolkit.org/documentation/tutorials/1.9/modules/>

Understanding "\*dojo declare\*" and \*asynchronous module definition (AMD)\*
will help you understand the “preamble” on the top of every file that jbrowse
uses, and which you can use in your plugin

In version 1.13 and forward, the plugin system also relies on re-building
JBrowse using webpack. This actually allows you to use ES6 javascript and node
js modules in your browser code. Therefore, you might want to review webpack,
babel, and node js module systems

### How do I create a plugin?

Let's walk through a simple plugin with the goal of adding something to the
track menu (e.g. where the "About this track" and "Save track data" options are)

To do this, we can use object- oriented principles to “inherit” from some
existing track type like CanvasFeatures and then extend its functionality by
overriding the functions in a new track type

We can inherit a new track type by using the “define” function to include the
dependencies needed in a file, and they are listed in an array at the top of
your file.

First initialize a new plugin using

`bin/new-plugin.pl MyPlugin`

Then edit a new file, say plugins/MyPlugin/js/MyTrack.js

```
define( ["dojo/_base/declare", "JBrowse/View/Track/CanvasFeatures"],
   function(declare,CanvasFeatures) {
   return declare(CanvasFeatures, {
       _trackMenuOptions: function() {
           var opts=this.inherited(arguments); //call the parent classes function
           opts.push( // add an extra menu item to the array returned from parent class function
               {        
                   label: "Custom item",
                   type: 'dijit/CheckedMenuItem',
                   onClick: function(event) {
                       console.log('Clicked');
                   },  
                   iconClass: "dijitIconPackage"
               }   
           );  
           return opts;
       }   
   }); 
   }   
);
```

Code listing 1. an example custom track type, plugin/MyPlugin/js/MyTrack.js,
that adds an extra track menu item

After this, we will have the plugin directory structure like this

```
jbrowse/plugins/MyPlugin
jbrowse/plugins/MyPlugin/js
jbrowse/plugins/MyPlugin/js/main.js
jbrowse/plugins/MyPlugin/js/MyTrack.js
```

The bin/new-plugin.pl helps create the skeleton main.js

Then we can use our new plugin to a config file like jbrowse_conf.json as
"plugins": \["MyPlugin"\]

Then edit the trackList.json for an existing track and change \`"type":
"CanvasFeatures"\` to \`"type": "MyPlugin/MyTrack"\`.

That will tell jbrowse to load the MyTrack class from your plugin instead of the
normal CanvasFeatures class.

## Setup

### How do I get started with installing JBrowse?

Check out the quick start guide [indexed file formats](tutorial.md) or the
[classic quick start guide](tutorial_classic.md)

### How do I load my genome as a FASTA file?

If you have JBrowse installed to your web folder and have run setup.sh, then you
can download a FASTA file for your genome and run

`bin/prepare-refseqs.pl --fasta yourfile.fasta`

If you want to use it as a Indexed FASTA instead, please see the
[indexed file formats](tutorial.md) tutorial.

### How do I setup a GFF track?

The most common feature track to use is a GFF file

Using flatfile-to-json.pl is the easiest and most optimal way to load a GFF file
for jbrowse

You can run

`bin/flatfile-to-json.pl --gff myfile.gff --trackLabel trackLabel --trackType CanvasFeatures`

Alternatively, you can use GNU sort and Tabix to create a GFF3Tabix track

sort -k1,1 -k4,4n myfile.gff > myfile.sorted.gff bgzip myfile.sorted.gff tabix
-p gff myfile.sorted.gff.gz

See [indexed file formats](tutorial.md) tutorial for more details.

Note: the CanvasFeatures track type is recommended even though it is not
currently the default as it is more flexible and easy to configure

### How do I set up a BAM file?

You will want to

- Put the BAM and BAI (or CSI) index in the JBrowse data directory
- Add a section to your tracks.conf

  [tracks.mytrack] storeClass=JBrowse/Store/SeqFeature/BAM
  urlTemplate=myfile.bam type=Alignments2 key=My BAM experiment

If this does not work feel free to ask gmod-ajax@lists.sourceforge.net

Other notes

- Don't use bam-to-json.pl, it is old and you do not need to convert BAM to JSON
- Your BAI should be the same as the BAM with .bai on the end, otherwise use the
  baiUrlTemplate paramter to point to it's location

### How do I set up a BigWig file?

When you set up a BigWig file in jbrowse, the best way to do it is as follows

- Put the BigWig file in your data directory
- Add a section to your tracks.conf

  [tracks.mybigwig] urlTemplate=file.bw type=JBrowse/View/Track/Wiggle/XYPlot
  storeClass=JBrowse/Store/SeqFeature/BigWig key=My BigWig experiment

### How do I set up a VCF file?

First bgzip and tabix your vcf file

    bgzip myfile.vcf
    tabix -p vcf myfile.vcf.gz

If your VCF isn't sorted for any reason and these steps give you an error, just
use the GNU sort utility to sort it by chromosome and coordinate or get vcf-sort
from vcftools

GNU sort command from https://www.biostars.org/p/133487/

    grep '^#' in.vcf > out.vcf && grep -v '^#' in.vcf | LC_ALL=C sort -t $'\t' -k1,1 -k2,2n >> out.vcf

Now that your VCF is indexed, follow these steps

- Put the myfile.vcf.gz and myfile.vcf.gz.tbi in your data directory
- Edit data/trackList.json
- Put the following in there:

  [tracks.myvcf] urlTemplate=myfile.vcf.gz
  storeClass=JBrowse/Store/SeqFeature/VCFTabix type=CanvasVariants

### How do I get IndexedFasta track to work in JBrowse

You can manually edit the config to use IndexedFasta as a reference sequence
like this

    [tracks.refseqs]
    key= Reference sequence
    storeClass=JBrowse/Store/SeqFeature/IndexedFasta
    urlTemplate=SOAPdenovo-genome.fa
    useAsRefSeqStore=true
    type=Sequence
    [GENERAL]
    refSeqs=SOAPdenovo-genome.fa.fai

The equivalent thing can also be in trackList.json as

    {
       "tracks" : [
          {
             "label" : "refseqs",
             "key": "Reference sequence",
             "storeClass" : "JBrowse/Store/SeqFeature/IndexedFasta",
             "urlTemplate" : "SOAPdenovo-genome.fa",
             "useAsRefSeqStore" : true,
             "type" : "Sequence"
          }
       ],
       "refSeqs" : "SOAPdenovo-genome.fa.fai"
    }

Note that prepare-refseqs.pl also can use --indexed_fasta as an argument, but is
not required for indexed FASTA

You can see from this that a couple things are needed

- useAsRefSeqStore set to true
- making label: refseqs is important when the storeClass is not the normal
  SequenceChunks class
- the refSeqs attribute refers to the FASTA index file (normally it points to
  the refSeqs.json file)

With this setup, you do not need to have run prepare-refseqs.pl on a FASTA file.
Instead you can simply use the "samtools faidx" program to index your fasta file
in a data directory, and set trackList.json up in this format.

## Tips and tricks

### How can I get jbrowse to update the URL of a parent page when jbrowse is inside of an iframe

You can use code such as this

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

With this setup, you can pass URL parameters from the URL of the parent page
e.g. <http://localhost/parent_page/?data=mydata&loc=chr1:1>..10000 and it will
forward those URL params to the jbrowse instance (located at
<http://localhost/jbrowse>) and the URL will be autoupdated when you change
locations

### Can I use JBrowse with phantomJS?

Yes\! See
<http://gmod.org/wiki/JBrowse_Configuration_Guide#Rendering_high_resolution_screenshots_using_PhantomJS>
for an example

Puppeteer also works

### Can I run JBrowse on GitHub pages?

Yes\! Upload jbrowse to a gh-pages branch on a github repo, and also put a
.nojekyll file in the root directory.

This bypasses the normal jekyll parser of github and allows jbrowse to load
<https://github.com/blog/572-bypassing-jekyll-on-github-pages>

### What is the benefit of using biodb-to-json.pl?

- You can store more advanced creation in the biodb-to-json.pl conf file,
  allowing for more advanced and reproducible builds of your data directory
- You can load data from different sources like Chado, GFF, etc.

In general, using normal commands like flatfile-to-json, prepare-refseqs, etc
work fine though. See setup.sh for how the volvox sample data combines using
biodb-to-json and other techniques.

### Can I make an ultra-compact setting on my features?

Yes you can\!

The styles on "CanvasFeatures" include normal, compact, and collapse

By default, compact divides the height of glyphs by 4, so if you make the height
of your features smaller with style-\>height then when you set compact it will
be ultra compact.

### Can I disable the histograms on a track?

Yes\! Try setting style.featureScale to a very small number like 0.0000000001
(but greater than 0)

### Can I visualize junctions from RNA-seq data

Yes, try out the SashimiPlot plugin\! <https://github.com/cmdcolin/sashimiplot>

It dynamically calculates the splicing coverage of a track or uses junctions.bed
files for junctions

### Can I view GCContent on my sequence data?

Yes, the GCContent plugin will calculate the GCContent from your sequence data
automatically. See <https://github.com/cmdcolin/gccontent>

It works fairly well on mid-size genomes. If you have very large megabase scale
assemblies, then you might consider pre-calculating the GCContent.

### Can I view GWAS results in JBrowse?

Yes, the GWASViewer plugin does this. <https://github.com/cmdcolin/gwasviewer/>

### What do the colors mean on the BAM files for JBrowse

- Light red is a forward read that is paired
- Super light red is a forward read that is badly paired
- Dark red is a forward read that is missing a pair
- Light blue is a reverse read that is paired
- Super light blue is a reverse read that is badly paired
- Dark blue is a reverse read that is missing a pair
- Grey/black is a read whose pair is on another chromosome

### Can I use RNA-seq with JBrowse

Yep\! The regular alignments track types (e.g. JBrowse/View/Track/Alignments2)
supports RNA-seq and will show spliced alignments.

Also, there are two special options for RNA-seq that can help decipher the
reads.

- The "Use XS" option is a RNA-seq specific flag that aligners output which
  detects the strand that a read came from according to canonical splice site.
  Enable in config using useXS: true. Note also since 1.16.9 this works with
  standard TS tag. The useTS tag applies to the lower case `ts` tag from
  minimap2
- The "Use reversed template" option is flag normally used for "stranded
  paired-end RNA-seq" data  and it will make both reads in a pair look like they
  are in the same direction, so for example, reads from a plus-strand gene will
  all appear red, even when one of the reads in the pair would normally be blue.
  Enable in config with useReverseTemplate: true

### Can I use long reads with JBrowse?

Long reads from platforms like nanopore and pacbio pose some challenges but will
work if it is in BAM format. The JBrowse 1.12.3 release also includes an
optimization, cacheMismatches, to enhance speed on long read tracks. This must
be enabled manually in the config at the moment.

### Can I have subtracks in JBrowse?

You can make a custom plugin to do this. The "multibigwig" plugin is an example
of this <https://github.com/cmdcolin/multibigwig>

### How do I get coverage for a BAM file?

1.  Use the SNPCoverage track
2.  Use the FeatureCoverage track type
3.  Make a bigwig for your BAM file (recommend: use "bedtools genomecov" to
    convert the BAM to bedgraph, and the convert bedgraph to bigwig with UCSC
    bedGraphToBigWig)

Also note: with the third option, you can make it so that your BAM track has a
bigwig when zoomed out, but then shows the reads when zoomed in. Any
CanvasFeatures track can use a bigwig for summary histograms. The Alignments2
volvox-sorted.bam track is an example of this. See
<http://gmod.org/wiki/JBrowse_Configuration_Guide#Configuring_Summary_Histograms>

### Can I zoom even closer to the base level?

Yes. You can set the config variable view.maxPxPerBp to a higher value. To
increase, try setting this in jbrowse.conf

`view.maxPxPerBp=50`

Note sometimes the "translations" will appear wrong at high zoom levels, so
don't depend on this for the protein translations

By default, the max zoom level is 25, so setting it to 50 makes you able to zoom
in twice as much.

### How do I change the color of bigwig dynamically

The pos_color and neg_color config variables for BigWig tracks accept callback
functions. The phytozome browser has good examples of this with the VISTA plot
tool

## Track selector

### How do I add categories to the Hierarchical data selector?

The hierarchical data selector can support multiple levels of drop down
categories. To use this, set the "category" variable on your track, and use a
"/" to represent a subcategory. Use multiple / for multiple subcategories.

Example

```
    {
     "category": "ParentCatgory / DiseaseBAM",
     "label": "myTrack",
     "storeClass": "JBrowse/Store/SeqFeature/BAM",
     "type": "Alignments2";
    },
    {
     "category": "ParentCatgory / NonDiseaseBAM",
     "label": "myTrack2",
     "storeClass": "JBrowse/Store/SeqFeature/BAM",
     "type": "Alignments2";
    }
```

In tracks.conf form

```
[tracks.myTrack]
category=ParentCategory / DiseaseBAM
type=Alignments2
storeClass=JBrowse/Store/SeqFeature/BAM
```

### How do I collapse categories in the Hierarchical data selector by default?

You can set the following config

`collapsedCategories=ParentCategory1/ChildCategory,ParentCategory2/ChildCategory`

etc. to your jbrowse.conf. This is a comma separated list (don't include spaces
around the slashes though). Remember, don't quote the values in the jbrowse.conf
file :)

## Troubleshooting

### Setup.sh "Installing perl prerequisites" fails for me, why?

Inspect your setup.log

If for example it says

`version.c:30:16: fatal error: db.h: No such file or directory`

Then run

`sudo apt-get install libdb-dev`

Then re-run setup.sh

If you see errors for XML::Parser

`sudo apt-get install libexpat1-dev`

Then re-run setup.sh

Also make sure you use "./setup.sh" or "bash setup.sh", do not use "sh setup.sh"

### Should I be worried about the error "Building and installing legacy wiggle format (superceded by BigWig tracks)...failed"?

This error is often due to some system issues about compiling libraries like
libpng, and for all intents and purposes can be ignored, as it is only used in
wig-to-json.pl and this is superceded by directly reading BigWig files (no
conversion step needed)

You can follow these instructions for how to setup a BigWig file if needed
<http://gmod.org/wiki/JBrowse_FAQ#How_do_I_set_up_a_BigWig_file.3F>

### I see a message that says "Congratulations, JBrowse is on the web" but I don't see my genome

This message normally means that jbrowse is setup but a genome hasn't been
loaded or located correctly

You can continue by running

`bin/prepare-refseqs.pl --fasta yourfile.fa`

Then reload the page and your genome should be available.

Note: If the red box on the "Congratulations page" shows a different message
than just 404 on seq/refSeqs.json, then report the error to github or the
mailing list with as much detail about your setup as possible.

### What is this error during setup.sh "No such file or directory at /loader/0x13517b30/App/cpanminus/script.pm line 224."

This can normally be fixed by deleting ~/.cpanm

It may be due to conflict between jbrowse's own cpanm and your system cpanm, but
it should not be too problematic.

Generally deleting ~/.cpanm is harmless, it is a "build" directory (generally
~/perl5 is the local::lib directory, and in jbrowse's case, it actually uses an
alternate local::lib directory named extlib inside the jbrowse directory to
ensure ease-of-install)

### What is "Integer overflow error"?

From what we have seen, the "Integer overflow error" sometimes appears on BigWig
tracks when your webserver is not configured correctly. It seems to be due to
errors with a "reverse proxy" or something not forwarding the data properly.

Therefore, it is most likely not due to corrupted bigwig files or jbrowse bugs,
but more probably, due to your server's configuration.

### Why do I get a popup saying "Error reading from name store"?

This error basically says the "search function" from generate-names.pl isn't
working. You can try a couple things to fix the error

1.  Refresh your browser (especially in Apollo, where session can expire)
2.  Re-run generate-names.pl
3.  Re-run generate-names.pl --hashBits 16 (manually specifying the hashBits can
    fix error sometimes)
4.  Re-run generate-names.pl with --completionLimit 0 which disables
    autocomplete and makes index smaller
5.  Make sure that the fields you are indexing (e.g. Name or ID) don't contain
    full text descriptions (they should be symbols or identifiers, the default
    hash search won't index keywords but rather match prefixes)

Note if there are continued troubles, you can try an alternative search engine,
such as jbrowse_elasticsearch (an experimental plugin)
<https://github.com/cmdcolin/jbrowse_elasticsearch/>

### What is this error message "Argument isn't numeric in addition (+)" loading GFF3?

If you get an error similar to this:

```
_Argument "-" isn't numeric in addition (+) at
/Library/WebServer/Documents/scbrowse/JBrowse-1.12.0/bin/../src/perl5/Bio/JBrowse/FeatureStream/GFF3_LowLevel.pm
line 32, <$f> line 44611._
```

Make sure your GFF3 is tab delimited

### It keeps showing "too much data" on my track. How do I fix it and make my track display?

Increase maxFeatureScreenDensity to a higher value. This value is by default 0.5
but if you allow a higher "density" of features, set it to 6 for example and the
message should disappear.

### I get the error "Too much data...chunk size xxxxx exceeds chunkSizeLimit"

Several things can happen to cause this (generally on VCF of BAM tracks)

1.  You actually have exceeded the chunkSize during regular loading of data. You
    might see one specific block/region out of your whole track is giving this
    error. In this case, simply increase it.
2.  Your data is actually fairly sparse so when it first starts up, the "stats
    estimation routine", which "doubles" the region it searches in until it gets
    enough data, is failing. If it doubles too many times, then the chunk will
    become large and then hit the limit. In JBrowse 1.12.3 a "statsTimeout"
    configuration was introduced to avoid these doublings from consuming too
    much area.

### I set a value in my config file but it isn't working. Why not?

Some things to check:

- Don't add quotes around numerical values in your JSON config files e.g.
  trackList.json. Numbers can remain unquoted. Booleans can too. Functions are
  included in quotes though, because those are evaluated at runtime.
- Also don't add quotes around even the strings in the .conf config files e.g.
  jbrowse.conf or tracks.conf files. So use `defaultTracks=mytrack1,mytrack2`
  not `defaultTracks="mytrack1,mytrack2"`
- Clear your cache. JSON is often cached pretty strongly. The .conf are cached
  even more. And, additionally, if there is a syntax issue with your JSON, it
  will try and use an older version oftentimes until you clear cache.

Also note: specifically with regards to the "defaultTracks" parameter,
defaultTracks is overridden by the users cookies and the \&tracks= parameter in
the URL, so to test whether defaultTracks works, clear you cookies and visit
without \&tracks in the url. Use alwaysOnTracks or forceTracks if you want to
have it turn on despite cookies/URL.

### I get the error "Too many open files opening bucket log" with generate-names.pl

If you get the error such as this

`Too many open files opening bucket log /path/to/your/data/names/00f/6.json.log at perl5/lib/perl5/Bio/JBrowse/HashStore.pm line 197, <$fh> line 85.`

Then try increasing number of files available

`ulimit -n 1000`

The default can sometimes be as low as 256 (view with ulimit -a)

### How do I fix the "Not a BAM file" issue?

This is normally due to a module called mime_magic being enabled on your Apache
server. Two options for fixing this are 1. disable mime_magic or 2. configuring
custom file types with AddType in your apache configuration. See
[this Apache configuration note](alignments.html#apache-configuration-note) for
recommended fixes.

### What is the error "invalid BGZF header" on my VCF files?

Your server is misconfigured for VCF.GZ files, and this can be due to it
thinking that it should set "Content-Encoding: gzip" on the your .vcf.gz files.
Your webserver should actually NOT put "Content-Encoding: gzip" on your VCF.GZ
files. If you think you have this problem, can try using "curl -I" to view the
headers that your server is putting on your VCF.GZ file.

Note: this issue can be confusing to research about, especially the
"Content-Encoding: gzip" issue, because most information on the web typically
says that it should put "Content-Encoding: gzip" on gzip data, and this header
implies that the client should decompress the content itself, however JBrowse
does not want this to happen because VCF.gz files are a special type of gzip,
specifically, bgzip, so it is manually decompressed by JBrowse javascript code.

### My track doesn't display the gene names, but I expected it to. Why not?

If you have a very dense track with many features, JBrowse might decide to hide
the labels to save space, but you can force them to display again by adding this
to your trackList.json

`"style":{"labelScale": 0.01}`

This says that the label will be displayed when the zoom level is greater than
0.01 regardless of how many features are there. The value 0.01 is measured in
pixels per base pair, at max zoom level, there are 25 pixels per base pair for
example, and when zoomed out farther, each base takes up less space, hence 0.01
will display the feature names always if you are reasonably zoomed in.

You can also change maxHeight to a larger value to make the track taller and see
more features.

### Why does my track keep saying "Loading"?

This normally means some javascript code for handling the track has crashed.
Check your javascript console for clues on how to fix it. Add a github issue if
it represents a real bug\!

Note: you should use the "-dev" packages for debugging, i.e.
JBrowse-1.11.6-dev.zip as opposed to for example JBrowse-1.11.6.zip, because the
-dev package contains "un-minified" source code and more readable javascript
console messages

### My CanvasFeatures don't show up with subfeatures, why not?

If your GFF does not follow this structure

`gene->mRNA->exon+CDS`

Then you need to add extra configuration

Specifically, if it is "transcript" instead of "mRNA" (which is common for
Ensembl GFF for example), then you must set

`"transcriptType": "transcript"`

Also, if you only have "exon" and no "CDS", then you need to set the subParts
config (the default settings assumes that both exons and CDS exist, so if there
are only exons, like in a cufflinks output file, then you need this)

`"subParts": "exon"`

If your GFF does not include UTR, but the UTR can be "implied" from the
difference between the exon and CDS boundaries, then you can use this on your
track type to enable them

`"impliedUTRs": true`

If your GFF file has features with this structure

`match -> match_part`

This only has two levels, you might consider just setting the "Segments" glyph

`"glyph": "JBrowse/View/FeatureGlyph/Segments"`

The segments glyph accepts all subfeatures, so match and match_part structure is
fine.

Note: the tips above only apply for CanvasFeatures tracks

### My HTMLFeatures don't show up with subfeatures, why not?

HTMLFeatures generally load data at the "transcript" level. This means that they
should be loaded with something similar to --type mRNA when using
flatfile-to-json.pl in order to see the transcript subfeatures

`flatfile-to-json.pl --type mRNA --gff your_genes.gff --trackLabel MyTrack`

This means that it loads the features where mRNA would be in column 3 of your
GFF. If it was an Ensembl GFF, you might use instead --type transcript

Note that this also loses the information about the "parent" gene feature
however, so it might be worth loading an additional track at the gene level like

`flatfile-to-json.pl --type gene --gff your_genes.gff`

This track will not display the transcript and exon subfeatures, but instead
just show a box where the gene is, so this is commonly called a "gene spans"
track

Note: If you would like a track that displays with the transcript subfeatures,
you can use the CanvasFeatures type track (i.e. load with flatfile-to-json.pl
--type gene --trackType CanvasFeatures ...)

### Why are my subfeatures being displayed as separate features?

Your GFF should use proper ID and Parent relations. Your subfeatures do not need
to themselves have IDs if they have no further subfeatures, but they must have a
Parent pointing to the Parent's ID

Note that it should be spelled Parent, not PARENT

### I get the error "Building and installing legacy bam-to-json.pl support (superseded by direct BAM tracks) ... failed"

If you get the error "Building and installing legacy bam-to-json.pl support
(superseded by direct BAM tracks) ... failed. See setup.log file for error
messages. If you really need bam-to-json.pl (most users don't), try reading the
Bio-SamTools troubleshooting guide at
<https://metacpan.org/source/LDS/Bio-SamTools-1.33/README> for help getting
Bio::DB::Sam installed."

Then note:

- This error message can be ignored. It refers only to not being able to run a
  small outdated feature of jbrowse.
- If you want to fix it, the issue might refer to a conflict with the system
  version of samtools. Uninstall your system samtools and then re-run setup.sh
  (notably homebrew samtools causes this step to fail)
- Again, this only refers to bam-to-json.pl, which converts entire BAM files to
  json. It is better to use the add-bam-track.pl which simply can read BAM files
  directly from the server with no conversion.

### After I load my track it appears in the tracklist, but the track appears empty

This can happen if the chromosome names from your track don't match the names
from your reference genome.

Try and make sure the chromosome names from your evidence tracks match the
chromosome names from the reference genome fasta.

### Uncaught (in promise) Error: problem decompressing block: incorrect gzip header check

This message is commonly caused by a tabix file being out of sync with the
index. Regenerating the index file may help.

### My BigWig file is producing an error related to DataView or jDataView

Examples of error messages

- RangeError: Offset is outside the bounds of the DataView (Chrome)
- Error: jDataView length or (byteOffset+length) value is out of bounds
  (Firefox)
- RangeError: Out of bounds access (Safari)
- RangeError: Argument 1 accesses an index that is out of range (Firefox)

Check that

- The file that you are using is actually the right filetype (i.e. maybe it is a
  textfile, but you are giving it a bigwig file extension)
- The webserver you are using allows Range HTTP headers (apache, nginx, etc
  should allow this by default)
- That you aren't simply opening up your index.html without a webserver i.e.
  using <file:///> protocol (which will not allow accessing byte-range Range
  HTTP requests and cause this error)
