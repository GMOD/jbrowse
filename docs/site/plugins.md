---
id: plugins
title: Installing and writing plugins
---

# Plugins

More than 40 third-party plugins are available that extend or change JBrowse's
functionality. For a list of them, see
<https://gmod.github.io/jbrowse-registry/>.

## Installing Plugins

Plugins can be manually copied into the JBrowse \`plugins\` directory. For
example, if you had a plugin called MyAwesomePlugin, you would install it by
copying it into the JBrowse-1.x.x/plugins/MyAwesomePlugin directory.

**Note:** Beginning in JBrowse 1.13.0, you need to use the \`\*-dev.zip\` build
of JBrowse if you use any plugins beyond the default ones, and any time you add
or change a plugin, you must re-run `setup.sh` to build the plugin's code into
JBrowse.

Also note that plugins that are installed are not necessarily activated for
every configuration in a JBrowse installation, they are just available.

## Activating Plugins

To activate a plugin, add a `plugins` configuration variable in your
`jbrowse_conf.json` file in the top-level JBrowse directory, and add an entry
telling JBrowse the names of the plugins to load.

Example:

      // array of strings (will look in JBrowse-1.x.x/plugins/MyAwesomePlugin)
      "plugins": [ 'MyAwesomePlugin' ]

or in the text .conf format:

    plugins =
        + MyAwesomePlugin
        + PubAnnotation

## Writing JBrowse Plugins

The JBrowse plugin system allows users to write their own JavaScript classes and
[AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) modules to extend JBrowse in
nearly any way imaginable. Just a few things that can be done by plugins:

- Add new data store adapters to allow JBrowse to read data from existing web
  services.
- Add new track classes for custom track displays and behavior
  ([WebApollo](http://gmod.org/wiki/WebApollo) is one well-known plugin that
  does this).
- Add (or remove) options in the JBrowse dropdown menus.
- Add new types of track selectors.

Also see this FAQ entry
<http://gmod.org/wiki/JBrowse_FAQ#How_do_I_create_a_plugin.3F> and
<http://gmod.org/wiki/JBrowse_FAQ#What_is_a_plugin_useful_for.3F>

### Plugin Components

For an example plugin named MyPlugin, all of its files should be located in
`plugins/MyPlugin` in the main JBrowse directory. There are no restrictions on
what a plugin directory may contain.

A plugin is required to have a `plugins/MyPlugin/js/main.js` file, which is an
AMD module that returns a JavaScript "class" that inherits from the
JBrowse/Plugin class. JBrowse will create one instance of this class, which will
persist during the entire time JBrowse is running. This class's constructor
function is the entry point for your plugin's JavaScript code.

If a plugin contains custom CSS rules, it can optionally have a
`plugins/MyPlugin/css/main.css` file as well, which JBrowse will load
asynchronously. If your plugin code needs to know when the CSS is finished
loading, the `cssLoaded` property of the plugin object contains a
[Dojo Deferred](http://dojotoolkit.org/api/1.8/dojo/Deferred) that is resolved
when the CSS load is complete. Multiple CSS files can be loaded using `@import`
statements in the `main.css`.

JBrowse also defines an AMD namespace that maps to your plugin's `js` directory,
which your plugin code (and JBrowse itself) can use to load additional AMD
modules and JavaScript classes. For example, our MyPlugin example could have a
data-store adaptor in the file
`plugins/MyPlugin/js/Store/SeqFeature/FooBaseServices.js`, which would be loaded
with the module name `"MyPlugin/Store/SeqFeature/FooBaseServices"`.

#### Example `main.js`

Here is an example plugin `main.js`, implemented using the
[Dojo declare](http://dojotoolkit.org/documentation/tutorials/1.8/declare/)
class system.

```{.javascript}
define([
           'dojo/_base/declare',
           'JBrowse/Plugin'
       ],
       function(
           declare,
           JBrowsePlugin
       ) {

return declare( JBrowsePlugin,
{
    constructor: function( args ) {
        var browser = this.browser;

        /* do anything you need to initialize your plugin here */
    }
});

});
```

#### Example plugin directory contents

- plugins/MyPlugin/js
  - plugins/MyPlugin/js/main.js
  - plugins/MyPlugin/js/MyPlugin.profile.js
- plugins/MyPlugin/css
  - plugins/MyPlugin/css/main.css
- plugins/MyPlugin/img
  - plugins/MyPlugin/img/myimage.png

The bin/new-plugin.pl will initialize a directory structure for you, e.g. run

    bin/new-plugin.pl MyPlugin

### Distributing plugins via npm

Distributing a plugin via npm JBrowse 1.13.0 and higher can also use plugins
that are distributed via npm. To distribute your plugin on npmjs.org, you just
need to add a package.json file to the top-level directory of your plugin, and
your plugin's npm package name must end in '-jbrowse-plugin'. Note that the
plugin is named "my-jbrowse-plugin" on npm, and includes a "jbrowsePlugin"

Here is an example package.json file for MyPlugin:

    {
      "name": "my-jbrowse-plugin",
      "version": "1.0.0",
      "description": "JBrowse client plugin for adding amazing things",
      "main": "js/main.js",
      "author": "Josephina Example",
      "license": "SEE LICENSE FILE IN LICENSE.md",
      "dependencies": {
      },
      "devDependencies": {
      },
      "repository": {
    	"type": "git",
    	"url": "git+https://github.com/josephina/myplugin.git"
      },
      "keywords": [
    	"genome",
    	"jbrowse"
      ],
      "bugs": {
    	"url": "https://github.com/josephina/myplugin/issues"
      },
      "homepage": "https://github.com/josephina/myplugin#readme",
      "jbrowsePlugin": {
    	"name": "MyPlugin"
      }
    }

### Other useful classes

Implementers of plugins can extend different parts of JBrowse. Three track lists
are currently implemented: `JBrowse/View/TrackList/Simple`,
`JBrowse/View/TrackList/Hierarchical`, and `JBrowse/View/TrackList/Faceted`.

The Hierarchical and Faceted track lists use the track metadata store
(`JBrowse/Store/TrackMetaData`), which is instantiated and kept by the Browser
object, for access to track metadata (defined as specified in the “Data Sources”
section). In particular, the category used by the hierarchical track selector is
a piece of track metadata called “category”.

The `JBrowse/GenomeView` class manages the main genome view, where the tracks
are displayed (see Figure 1). It manages showing and hiding tracks, reordering
them, scrolling and zooming, and so forth.

Track objects query data from a feature store, and draw it in the GenomeView
pane. The implementations are in `JBrowse/View/Track/` for which the base class
is `JBrowse/View/Track/BlockBased`.

CanvasFeatures tracks use various glyph subclasses, locatable in the
`JBrowse/View/FeatureGlyph/` directory and inheriting from the base class
`JBrowse/View/FeatureGlyph`.
