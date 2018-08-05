---
id: plugins
title: Plugin guide
---

## Writing JBrowse Plugins

The JBrowse plugin system allows users to write their own JavaScript classes and [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) modules to extend JBrowse in nearly any way imaginable. Just a few things that can be done by plugins:

-   Add new data store adapters to allow JBrowse to read data from existing web services.
-   Add new track classes for custom track displays and behavior ([WebApollo](http://gmod.org/wiki/WebApollo) is one well-known plugin that does this).
-   Add (or remove) options in the JBrowse dropdown menus.
-   Add new types of track selectors.

Also see this FAQ entry <http://gmod.org/wiki/JBrowse_FAQ#How_do_I_create_a_plugin.3F> and <http://gmod.org/wiki/JBrowse_FAQ#What_is_a_plugin_useful_for.3F>

### Plugin Components

For an example plugin named MyPlugin, all of its files should be located in `plugins/MyPlugin` in the main JBrowse directory. There are no restrictions on what a plugin directory may contain.

A plugin is required to have a `plugins/MyPlugin/js/main.js` file, which is an AMD module that returns a JavaScript "class" that inherits from the JBrowse/Plugin class. JBrowse will create one instance of this class, which will persist during the entire time JBrowse is running. This class's constructor function is the entry point for your plugin's JavaScript code.

If a plugin contains custom CSS rules, it can optionally have a `plugins/MyPlugin/css/main.css` file as well, which JBrowse will load asynchronously. If your plugin code needs to know when the CSS is finished loading, the `cssLoaded` property of the plugin object contains a [Dojo Deferred](http://dojotoolkit.org/api/1.8/dojo/Deferred) that is resolved when the CSS load is complete. Multiple CSS files can be loaded using `@import` statements in the `main.css`.

JBrowse also defines an AMD namespace that maps to your plugin's `js` directory, which your plugin code (and JBrowse itself) can use to load additional AMD modules and JavaScript classes. For example, our MyPlugin example could have a data-store adaptor in the file `plugins/MyPlugin/js/Store/SeqFeature/FooBaseServices.js`, which would be loaded with the module name `"MyPlugin/Store/SeqFeature/FooBaseServices"`.

#### Example `main.js`

Here is an example plugin `main.js`, implemented using the [Dojo declare](http://dojotoolkit.org/documentation/tutorials/1.8/declare/) class system.

~~~~ {.javascript}
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
~~~~

#### Example plugin directory contents
```
   plugins/MyPlugin/js
