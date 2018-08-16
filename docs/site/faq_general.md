---
id: faq_general
title: General
---


# General information

## What webserver is needed for JBrowse

Most established HTTP servers such as Apache or nginx can work. You can
just unpack JBrowse into your http web directory (/var/www/html, or
htdocs, or similar) and follow the setup instructions
<http://jbrowse.org/code/JBrowse-1.12.1/docs/tutorial/>.

Other configuration about your server will depend on your needs, but
generally no special setup is needed for the http server, and there is
no "server side" code used by JBrowse (cgi, php, etc).

Note: servers like "SimpleHTTPServer" from Python or "http-server" from
NPM are generally not full featured enough to run all JBrowse features
correctly (SimpleHTTPServer does not support Range queries, and
http-server interprets tabix files incorrectly). RangeHTTPServer does
pass the test suite for jbrowse though, so it should work for tests
<https://github.com/danvk/RangeHTTPServer> (but not for compressed json
files).

Also note: sometimes, people will download JBrowse and double click the
html file and open up <file:///c/myfolder/jbrowse/index.html> in the
webbrowser, however, running JBrowse like this is not recommended. This
may appear to work for some limited cases but will fail on many others.
You can use JBrowse Desktop if you want to use jbrowse locally without a
webserver.

Since 1.12.4: The JBrowse "jb\_run" script in 1.12.4 can be used to run
JBrowse. It uses a custom express.js server tailored to serve all
content headers
directly.

## What is the difference between JBrowse-1.12.1.zip and JBrowse-1.12.1-dev.zip?

Ignoring version numbers here, the difference is that one is a "release"
version and one is a "development" version. If you are going to be
modifying source code of JBrowse's codebase, you probably want the
development version.

The "release" version goes through a build step with
[minification](https://en.wikipedia.org/wiki/Minification_\(programming\))
so that loading the page takes less bandwidth. Different parts of the
code go into different "layers", but the main layer that includes most
JBrowse source code and JBrowse libraries goes into src/dojo/dojo.js

The "development" version does not go through minification, and so it is
amenable to editing the source code. You can also use a github clone for
developing source code modifications. See the next section for running
from a github clone
[\#How\_do\_I\_run\_the\_code\_using\_the\_github\_clone](#How_do_I_run_the_code_using_the_github_clone "wikilink")

## How do I run the code using the github clone

Running code off github is fairly straightforward, and you can actually
run it on your webserver without any build steps

```
 git clone <https://github.com/gmod/jbrowse>
 cd jbrowse
 ./setup.sh
```

Then move that directory into your web server root and you are ready to
go.

Note: If you want to make your own custom build you can use

`make -f build/Makefile release`

Also also note: post 1.13.0 releases of JBrowse will automatically
create a minified custom build when you run ./setup.sh if you have a
-dev release or a github clone.

## What are the different config file formats?

JBrowse uses both json and ".conf" files for configuration (the .conf is
a custom format that is parsed on the client side), and both file types
can contain the same types of information

Examples of JSON format

  - trackList.json
  - jbrowse\_conf.json

Examples of conf format

  - tracks.conf
  - jbrowse.conf

If you wonder why you would use the .conf format, some benefits include:
easy to edit, easy to append to with text file tools, can define
multi-line functions (JSON doesn't allow newlines, so callbacks are
specified on a single line).

All the config files are combined using a system of "includes" at
runtime. The "order" behind loading all the config files is something
like this:

1.  The index.html initializes a global Browser object, and the
    paramaters to the constructor are used as the start of the config
2.  The Browser class "includes"  both jbrowse\_config.json and
    jbrowse.conf using defaultConfig
3.  The jbrowse.conf by default includes both {dataRoot}/trackList.json
    and {dataRoot}/tracks.conf, which resolves to whatever data
    directory is currently being used
4.  The trackList.json or tracks.conf files can themselves include other
    files, such as a "functions.conf" file

## What type of coordinate system does JBrowse use

Internally it uses 0-based coordinates

When you view the data (like in the view details popups, and in their
position on the browser) it is 1-based.

The functions like feature.get('start') would return 0-based.

## What is the difference between CanvasFeatures and HTMLFeatures?

There are a lot of differences\!

  - CanvasFeatures are newer.
  - CanvasFeatures can support Gene glyphs, i.e., a gene with multiple
    transcripts are grouped together on the screen. In HTMLFeatures, you
    have to load at the "transcript" level, so this loses the gene level
    info (if you do try to load the --type gene, it will just load "gene
    spans", but then it doesn't display the transcript subfeatures. not
    terrible, but not as cool as CanvasFeatures).
  - CanvasFeatures are faster if your have a lot of data.
  - They can support more dynamic shapes (See the SashimiPlot plugin
    <https://github.com/cmdcolin/sashimiplot> for example of Arc track,
    or NeatCanvasFeatures for example of "intron hats")
  - They have different configuration functions. All the "style" methods
    on CanvasFeatures can be callback functions, so you can have a
    dynamic callback for the feature color, label, etc. The "glyph" can
    also be a callback, so you can make a function to change to a box or
    diamond glyph depending on feature attributes.
  - CanvasFeatures have better mouseovers. The HTMLFeatures mouseovers
    use the HTML title attribute which can only display plain text. On
    CanvasFeatures tracks, the mouseover it is a real tooltip that you
    can embed arbitrary HTML inside of.

## What is a glyph?

Glyphs are a "unit" of drawing in a CanvasFeatures track. The glyph is
just code that is responsible for drawing a feature on the screen.

## What does generate-names.pl do?

Generate-names.pl will create a "search index" on, by default, the
"names, IDs, and Alias" fields for tracks loaded with
flatfile-to-json.pl or biodb-to-json.pl. It will not try to index ids
from BAM files or bigwigs, but it does index names from VCF files too.

You can select specific tracks that you want to index with --tracks
arguments to generate-names.pl. You can disable "autocomplete" by
setting --completetionLimit 0 on generate-names.pl. You can "update"
your search index by using --incremental

Also note: you can index additional fields of a GFF file with
generate-names.pl by specifying the --nameAttributes flag to
flatfile-to-json.pl. E.g. flatfile-to-json.pl --nameAttributes
"my\_custom\_field,name,id". The default value for this flag is
"name,alias,id". Note that the flag is passed to flatfile-to-json.pl and
then these values are automatically indexed by generate-names.pl later.

## What is the "label" in trackList.json and what is the key?

The track "label" is more like the track "identifier", it should be
unique\! The key is actually more like the name that is displayed for
the track. It might sound counter intuitive to have label and key this
way. Key is not a required attribute, but label is. The label can be
specified by --trackLabel on command line tools. The key can be
specified by --key.

## How do I search for a feature in JBrowse

Some people don't know this, but the box that shows your current
location, e.g. "chr10:1..1000 (1.0 Kb)" is also a search box\! You can
search for things that generate-names.pl indexed here.

Also, the search index can be used to "link" to features, for example,
if you construct a link such as <http://localhost/jbrowse/?loc=GENE1234>

Then the search index will resolve the location of that gene and jump to
it automatically.

## How do I get full text descriptions to be searched?

Try out
[jbrowse\_elasticsearch](https://github.com/cmdcolin/jbrowse_elasticsearch),
it is still experimental but it allows this. Or, implement your own
JBrowse REST names API. The default generate-names.pl is not built for
searching full text descriptions.

## How do I set up multiple genomes in a single jbrowse instance?

By default, the scripts will output to a subdirectory called "data" in
the jbrowse folder

You can control that output with most scripts using the --out parameter.
This enables you to have "multiple data directories".

Once the data directories are ready then use the URL bar to select which
data directory to use with ?data=my\_data\_dir e.g.

<http://mysite.org/jbrowse/?data=data1>
<http://mysite.org/jbrowse/?data=data2>

Note that with [Apollo](http://genomearchitect.org), you can output the
data directories to some given directory and add the directories via the
user interface.

You can also setup the "dataset selector" see [\#What is the dataset
selector](dataset_selector.md) and
[JBrowse\_Configuration\_Guide\#Dataset\_Selector](JBrowse_Configuration_Guide#Dataset_Selector "wikilink")

## What is the dataset selector

The dataset selector is a dropdown that can list all the genomes that
are in your jbrowse instance

To configure the dataset selector, set a dataset\_id inside your
trackList.json or tracks.conf on your data directory, and then in
jbrowse.conf, add a list of all your datasets with the dataset\_ids that
you listed in the genome's data directory.

See <http://gmod.org/wiki/JBrowse_Configuration_Guide#Dataset_Selector>

## How do I change the name that is displayed on my features

If you don't like the names in the "Name" or "ID" column of your GFF,
and you instead want to use some other field as the name to be
displayed, then you can add this to your trackList.json

`"style": {"label": "my_custom_field"}`

Note: you can also index "my\_custom\_field" with generate-names.pl too
by supplying my\_custom\_field to the --nameAttributes argument from
flatfile-to-json.pl. After loading it from flatfile-to-json.pl in that
manner, it will be indexed by generate-names.pl.

Also note: you can make the description a custom field too in a similar
way

`"style": {"description": "my_custom_description_field"}`

