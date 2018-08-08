---
id: faq_customization
title: Customization
---

## How do I customize feature colors (with CanvasFeatures)

In CanvasFeatures, this is done with the style-\>color parameter. The
style-\>color parameter can be a function, so for example, if you have a
track like this in trackList.json

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

This will make your features red. You can also hardcode a color instead
of a callback

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

Note: if you get a very complex function, consider putting it in a
separate functions.conf file and include it, see config guide "Including
external functions in trackList.json"

Note: with HTMLFeatures, it is similar, but you have to use
hooks-\>modify instead of style-\>color.

Also note: you cannot create the functions via the UI in "Edit config".
You have to specify the callback functions via the config files
themselves.

## How do I add a legend to the track in the "About this track" dialog?

You can add custom info to the "About this track" dialog boxes by
specifying metadata for the track in trackList.json, e.g.

`"metadata": {"legend": "Red means this, green means that"}`

This will create a box called "legend" inside the "About this track"
box.

All the "metadata" fields are added to the "About this track" dialog
box, and it can also support HTML,
e.g

`"metadata": {"randominfo": "<p style='color:green'>Green text</p>", "otherrandominfo": "<p style='color:red'>Red text</p>"} `

You can also use the fmtDetailMeta and fmtFieldMeta callback functions
to change pre-existing values
<http://gmod.org/wiki/JBrowse_Configuration_Guide#Additional_customizations_to_the_pop-up_boxes>

## How do I customize the dialog boxes for the features?

There are many ways to do so.

1.  To customize the default 'View details' type popups, you can
    override fields by adding a function to your track config like
    fmtDetailValue\_Name: "function(value, feature) { return value + '
    is the original name'; }"
2.  To make a different custom action for a dialog, make
    onClick-\>action a javascript callback and make it popup your own
    custom dialog box, made using dijit or any other javascript type
    language. The function would have the format function(clickEvent)
    but you can access feature information from this.feature inside the
    callback
3.  Set action: "newWindow" and url:
    "[http://google.com/?q={name}](http://google.com/?q=%7Bname%7D)" can
    redirect to search google for the feature's name (note: the {name}
    is a template parameter that is automatically filled out when a
    feature is clicked)
4.  Set action: "iframeDialog" and url:
    "[http://google.com?q={name}](http://google.com?q=%7Bname%7D)"
5.  Set onClick-\>action to contentDialog and then set onClick-\>content
    to a string or a functioning returning a string or a "promise". A
    promise can come from calling dojo.xhrGet or similar so it can
    retrieve dynamic content. The function would have the parameters
    function(track, feature)

Those are just a couple examples

More straightforwardly, basically any field that exists for the feature
(e.g. all the things in column 9 for a GFF) will be added to the default
"View details" boxes, so it you add more details to the GFF3 column 9,
then your popups will have more information.

## How do I customize the main menu bar

Typically this is done using a plugin. You can make your plugin add new
menu items. See the RegexSequenceSearch plugin for an example
<https://github.com/GMOD/jbrowse/blob/master/plugins/RegexSequenceSearch/js/main.js#L23-L30>

You can also create a new "menu" i.e. (default says file, view, help)
and you can extend it to use (file, view, tools, help) or similar. The
GMOD/Apollo codebase does this
<https://github.com/GMOD/Apollo/blob/master/client/apollo/js/main.js#L368-L379>

## How do I customize the "track menu" on a track?

In general, you would want to make a new "track type", you can override
\_trackMenuOptions on your custom track type. See
<https://github.com/cmdcolin/gccontent/blob/master/js/View/Track/GCContentXY.js>
for example

## How do I customize the right-click menus on features

You can edit the menuTemplate parameters on the trackList.json.

Note: when you add 1 method to menuTemplate, it overwrites 1 of the
default elements in the default right-click menu. This is sort of a bug.
If you want to "add" your method to the list, then create a "blank"
menuTemplate items for the View details, etc. See
[JBrowse\_Configuration\_Guide\#Customizing\_Right-click\_Context\_Menus](JBrowse_Configuration_Guide#Customizing_Right-click_Context_Menus "wikilink")
for more details.

## How do I access data about my features in my callback or plugin

Each feature is based on what is called a feature Model. The
JBrowse/Model/SimpleFeature is an example of this, and it allows you to
call feature.get('variable\_of\_interest') on many different variables

Common types of requests

  - feature.get('subfeatures') - to get all subfeatures of a feature.
  - feature.get('parent') - for the parent of a feature
  - feature.get('id') - for the ID
  - feature.get('name') - for the name
  - feature.get('my\_gff\_field') - to get any given field from your
    GFF3 column 9
  - feature.get('genotypes') - to get the genotypes of a VCF feature, it
    returns a complex object that you can inspect. See
    "variantIsHeterozygous" in the jbrowse configuration guide for an
    example of parsing the genotype
  - feature.get('start') - to get start position
  - feature.get('end') - to get end position
  - feature.get('seq\_id') - to get the chromosome name
  - feature.get('seq') - to get the sequence, only works on BAM data
    since it includes sequence data in data file. In general, you must
    use getReferenceSequence over a region to get a feature's sequence

Note that if you have multiple values for a value in column 9 (specified
by comma separated values), then feature.get('your\_value') will return
an array (except for for Note which turns into Note, Note2, Note3, etc)

For reference JBrowse/Model/SimpleFeature is a widely used feature
class. The BAM features for example use a different model because they
must be smaller and quicker to operate at speed (they are called Lazy
features, so not all their info is evaluated unless it is needed
on-demand). BAM features also have things like feature.get('seq'), to
get the sequence of the alignments, but normal features like genes do
not have
feature.get('seq')

## How to get default tracks to display every time a user opens the browser?

There are several config variables which you can define in any of your
config files (trackList.json for example can have config items like
this, just put it outside of the track section of tracklist.json, or
under a \[general\] section of tracks.conf) as a comma separated list of
track labels

  - alwaysOnTracks: Track always come up
  - forceTracks: Overridden by URL bar
  - defaultTracks: Overridden by URL bar and cookies

## How can I embed JBrowse on a page

The easiest way to "embed jbrowse" on another page would be to use an
iframe to link to the jbrowse instance of choice e.g.
<http://gmod.org/wiki/JBrowse_Configuration_Guide#Embedded_mode>

Note that it is also possible in theory (and sometimes in practice) to
embed JBrowse without an iframe. For example, you can take the
index.html of JBrowse and customize it for your purposes. You can for
example change the GenomeBrowser div to not have 100% width and height,
and instead make it have width 1000px and height 800px for example and
put it in a specific part of your webpage.

The problem with embedding without iframe is typically that you can
easily run into issues with "CSS collisions" where the CSS from your
specific page collides with jbrowse elements, of CSS from jbrowse
elements collides with your outside
page.

## Can I change the color of bases in the Sequence/Alignments2/SNPCoverage tracks?

Yes. It is sort of a "hidden setting", but you can actually change
colors on the Sequence/Alignments2/SNPCoverage track using CSS

See
css/sequence.css:

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

The .base\_reference is the background grey of the SNPCoverage plot, and
if you actually add to the list and make .base\_skip you can make the
intron grey change color SNPCoverage.

## How can I link BLAST results to JBrowse

If you use sequenceserver, you create a custom JBrowse link by creating
a links.rb file and running

`sequenceserver -D database_dir -r links.rb`

The links.rb is then a file that gets included by sequenceserver to
generate new links to external resources automatically. In our case, we
parse all the HSPs (high scoring pairs) from the hits from BLAST and
string them together into a single feature (e.g. by taking the min and
max of all hsps)

Note: The links.rb passes us the accession and hsps variables
implicitely. The notation for the query start/end and subject start/end
are shortened as qend, send, sstart, and qstart

We use the addFeatures URL parameter of JBrowse to make the features
appear. For reference, see
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

Important note: if you have multiple organisms, then you should encode
your FASTA files to contain the organism name, e.g.

`>Human-chr1`
`ACCGAATCAGCTATCGA...`

This is because BLAST does not tell you which database your hits come
from.

Then you must modify your links.rb use this information by parsing the
"accession"
variable.

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

Another important note: you should BLAST the actual genome sequence if
you are linking to genomic coordinates of JBrowse. If you BLAST a CDS
database, you may need to load CDS sequences into JBrowse, or translate
the CDS coordinates into genomic coordinates

Also also note: if you are running sequenceserver through apache e.g.
with Passenger Phusion, then you can modify the config.ru to have a
"require './links.rb'" line and keep the links.rb in that same directory
as config.ru
e.g.

```
require 'sequenceserver'
require './links.rb'
SequenceServer.init(:config_file => ".sequenceserver.conf")
run SequenceServer
```

