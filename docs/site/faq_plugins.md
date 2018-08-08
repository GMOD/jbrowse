---
id: faq_plugins
title: Plugins
---

## How do I install a plugin

### Important note

**After version 1.13 which introduced webpack to JBrowse, then you must
re-run "setup.sh" after adding or removing a plugin.**

**Also, you must use the JBrowse-1.x.x-dev.zip instead of just
JBrowse-1.x.x.zip**

### Configuration

To install a JBrowse plugin, generally the easiest thing to do is to put
the code in the plugins directory (e.g. clone the repo to
plugins/GCContent or plugins/SashimiPlot), and then just say this in
your jbrowse.conf (or tracks.conf

```
[GENERAL]
plugins += GCContent
plugins += SashimiPlot
```

Equivalently, in jbrowse\_conf.json (or trackList.json), that would mean
just having

`"plugins": ["GCContent", "SashimiPlot"]`

Essentially, you are just giving the configuration an array of folder
names to look for in the plugins directory

Alternatively, you can also add the "name" and "location" of the plugin
too.

```
"plugins": [{
    "name": "GCContent",
    "location": "plugins/gccontent"
}]
```

Here "plugins.GCContent" means that the "name" of your plugin is
"GCContent". This is slightly important, because the "name" is used for
the purposes of the "namespace" that the plugin has i.e., when you
specify a track with the "type": "GCContent/View/Track/GCContentXY" in
trackList.json, then that means the "name" of the plugin should be
GCContent, not lowercase gccontent.

Note that the above config would be equivalent to this in the
jbrowse.conf format

```
[ plugins.GCContent ]
location = plugins/gccontent
```

Again, you don't need to use this format if the name of the directory is
as expected e.g. plugins+=GCContent looks for a folder named GCContent

Note: "location" is a relative URL to the jbrowse root directory.
Normally when a plugin is successfully installed, you will get a
console.log message from the plugin saying that it has started up (that
depends on the plugin but most jbrowse plugins just do that by
convention)

Another note: you can add plugins declarations to trackList.json or
tracks.conf instead of jbrowse\_conf.json or jbrowse.conf too. In
tracks.conf just put it at the top of the file or underneath a line that
says \[GENERAL\]

Final note: it is best to only include plugins in one file, e.g. put all
the includes in jbrowse.conf or all configs in tracks.conf, not mix them
in different config files.

## Can I create an adaptor for an existing web service?

If your web service doesn't exactly match the requirements for the
JBrowse REST API tracks, then you can create your own "store class" as a
plugin. This basically just requires one thing:

    bin/new-plugin.pl MyPlugin

Then, simply make a dojo class (using "dojo declare") in your plugin
that implements a "getFeatures" function. The getFeatures function
receives a query object with query.start, query.end, query.ref e.g. chr1
along with 3 callbacks: featureCallback, finishCallback, and
errorCallback. If there is an error, than call the error callback
obviously. Otherwise, for each feature that you want to display, call
featureCallback with that (use JBrowse/Model/SimpleFeature to represent
the feature). When you are out of features for the query region, call
finishCallback.

Check out the genes store class from the myvariantviewer plugin for an
example of a simple custom adaptor
<https://github.com/cmdcolin/myvariantviewer/blob/master/js/Store/SeqFeature/Genes.js>

## What is a plugin useful for?

A JBrowse plugin can do a wide variety of things. Some common use-cases
would be

  - making a custom track type or visualization
  - making an adapter for a new file type or "store class"
  - adding new pieces to the user interface

Other things that are extensible include

  - accessing custom search backends (the so called "Names API")
  - accessing custom filter functions
    <https://github.com/cmdcolin/filterplugin>
  - making custom "Save track data" export formats

One cool thing is that when you create a plugin, you can simply
reference it textually in your config file e.g. trackList.json, and then
JBrowse will load the "class" from your plugin and initialize it

## What background should I have for creating a plugin

Make sure to review this link describing dojo declare, the way dojo
declares new object types
<http://dojotoolkit.org/reference-guide/1.10/dojo/_base/declare.html>

Also review
<http://dojotoolkit.org/documentation/tutorials/1.9/modules/>

Understanding "\*dojo declare\*" and \*asynchronous module definition
(AMD)\* will help you understand the “preamble” on the top of every file
that jbrowse uses, and which you can use in your plugin

In version 1.13 and forward, the plugin system also relies on
re-building JBrowse using webpack. This actually allows you to use ES6
javascript and node js modules in your browser code. Therefore, you
might want to review webpack, babel, and node js module systems

## How do I create a plugin?

Let's walk through a simple plugin with the goal of adding something to
the track menu (e.g. where the "About this track" and "Save track data"
options are)

To do this, we can use object- oriented principles to “inherit” from
some existing track type like CanvasFeatures and then extend its
functionality by overriding the functions in a new track type

We can inherit a new track type by using the “define” function to
include the dependencies needed in a file, and they are listed in an
array at the top of your file.

First initialize a new plugin using

`bin/new-plugin.pl MyPlugin`

Then edit a new file, say
plugins/MyPlugin/js/MyTrack.js

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

Code listing 1. an example custom track type,
plugin/MyPlugin/js/MyTrack.js, that adds an extra track menu item

After this, we will have the plugin directory structure like this

```
jbrowse/plugins/MyPlugin
jbrowse/plugins/MyPlugin/js
jbrowse/plugins/MyPlugin/js/main.js
jbrowse/plugins/MyPlugin/js/MyTrack.js
```

The bin/new-plugin.pl helps create the skeleton main.js

Then we can use our new plugin to a config file like jbrowse\_conf.json
as "plugins": \["MyPlugin"\]

Then edit the trackList.json for an existing track and change \`"type":
"CanvasFeatures"\` to \`"type": "MyPlugin/MyTrack"\`.

That will tell jbrowse to load the MyTrack class from your plugin
instead of the normal CanvasFeatures class.
