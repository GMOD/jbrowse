[![builds][builds]][builds-url]
[![coverage][cover]][cover-url]
[![licenses][licenses]][licenses-url]
[![Apache 2.0 License][apache2]][apache2-url]
[![npm][npm]][npm-url]

<div align="center">
  <a href="https://dojotoolkit.org">
  <img width="200" height="200" vspace="" hspace="25" alt="Dojo" title="Dojo"
      src="https://cdn.worldvectorlogo.com/logos/dojo.svg">
  </a>
  <a href="https://github.com/webpack/webpack">
  <img width="200" height="200" vspace="" hspace="25" alt="webpack" title="webpack"
      src="https://cdn.worldvectorlogo.com/logos/webpack-icon.svg">
  </a>
  <h1>dojo-webpack-plugin</h1>
  <p>Build Dojo 1.x applications with webpack<p>
</div>

<!-- TOC START min:1 max:3 link:true asterisk:false update:true -->
- [Introduction](#introduction)
- [The Dojo loader](#the-dojo-loader)
	- [CommonJS require vs. Dojo synchronous require](#commonjs-require-vs-dojo-synchronous-require)
- [The Dojo loader config](#the-dojo-loader-config)
- [Dojo loader extensions](#dojo-loader-extensions)
- [The dojo/has loader extension](#the-dojohas-loader-extension)
- [The dojo/loaderProxy loader extension](#the-dojoloaderproxy-loader-extension)
- [Options](#options)
	- [async](#async)
	- [loaderConfig](#loaderconfig)
	- [environment](#environment)
	- [buildEnvironment](#buildenvironment)
	- [globalContext](#globalcontext)
	- [loader](#loader)
	- [locales](#locales)
	- [cjsRequirePatterns](#cjsrequirepatterns)
	- [coerceUndefinedToFalse](#coerceundefinedtofalse)
	- [noConsole](#noconsole)
	- [runtimeFeatures](#runtimefeatures)
- [Building the Dojo loader](#building-the-dojo-loader)
- [The `dojo-config-api` feature](#the-dojo-config-api-feature)
- [The `dojo-undef-api` feature](#the-dojo-undef-api-feature)
- [ES6 Promise polyfill](#es6-promise-polyfill)
- [Order of Plugin Registration](#order-of-plugin-registration)
- [The global require function](#the-global-require-function)
- [Use of run-time identifiers and expressions in dependency arrays](#use-of-run-time-identifiers-and-expressions-in-dependency-arrays)
- [Use of Dojo's Auto-Require feature](#use-of-dojos-auto-require-feature)
- [Dependency requirements](#dependency-requirements)
- [Related plugins](#related-plugins)
- [Sample application](#sample-application)
- [Release Notes](#release-notes)
- [Known Issues](#known-issues)
- [Footnotes](#footnotes)
<!-- TOC END -->

# Introduction

**dojo-webpack-plugin** is a [Webpack](https://webpack.github.io/) plugin that supports using Webpack to build Dojo 1.x applications that use Asyncronous Module Definition (AMD).  This version supports Webpack 2 through Webpack 4 (Webpack 4 must be 4.2.0 or greater), and Dojo versions 1.10 and greater.  Features include:

* Support for Dojo loader config properties, including `baseUrl`, `paths`, `packages`, `map` and `aliases`
* Support for client-side synchronous and asynchronous `require()` calls for packed modules.
* Webpack loader implementations of standard Dojo loaders (e.g. `dojo/text`, `dojo/has`, `dojo/i18n`).
* Limited support for client side execution of some Dojo loader extensions.

See the [Release Notes](#release-notes) for important information about upgrading to from earlier versions of this plugin to 2.1+.

# The Dojo loader

**dojo-webpack-plugin** uses the Dojo loader (dojo.js) at build time to resolve modules based on the properties specified in the Dojo loader config.  In addition, a stripped-down build of the loader (~1.5KB after uglify and gzip)<sup>[<a href="#user-content-foot1">1</a>]</sup>, and optionally the loader config, are embedded in the packed application to support client-side execution of `require()` calls that have not been transformed by Webpack at build time (i.e. `require()` calls that reference non-stactic variables), as well as Dojo's `require.toAbsMid()` and `require.toUrl()` functions.

This package does not include the Dojo loader.  A custom build of the Dojo loader is built by Webpack based on the location of Dojo specified in the Dojo loader config.  Alternatively, the location of a previously built loader may be specified using the [loader](#loader) option.  See [Building the Dojo loader](#building-the-dojo-loader).

### CommonJS require vs. Dojo synchronous require

Dojo supports a form of `require` (known as synchronous `require`) that has the same signature as CommonJS `require`.  In Dojo, synchronous `require` returns a reference to an already loaded module, or else throws an exception if the module has not already been loaded and initialized.  With this plugin, `require` calls matching the CommonJS/synchronous `require` signature which appear followng the first `define` call in an AMD modules are treated as Dojo synchronous `require` calls.  If you wish to load a CommonJS module from within an AMD module, you may do so by calling `require` before the first `define` call, or else by using the `cjsRequire` function that is supported by the plugin.

<!-- eslint-disable no-undef, no-unused-vars -->
```javascript
var lodash = require("lodash");			// CommonJS require
define([], function() {
	var query = require("dojo/query");	// Dojo synchronous require
	var async = cjsRequire("async");	// CommonJS require
});
```

If CommonJS `require` calls are being injected into your module by third-party code (e.g. by [ProvidePlugin](https://webpack.js.org/plugins/provide-plugin/)), then you can use the [cjsRequirePatterns](#cjsrequirepatterns) option to specify regular expression patterns to match against module names that should be loaded using CommonJS `require`.

# The Dojo loader config

The loader config defines properties used in resolving module identifiers as described in [Configuring Dojo with dojoConfig](https://dojotoolkit.org/documentation/tutorials/1.7/dojo_config/).  Note that not all properties in the loader config are used by Webpack.  Only properties relating to module name/path resolution are used.  These include `baseUrl`, `packages`, `paths`, `map` and `aliases`.  The loader config may also specify a `has` map of feature-name/value pairs. The `has` features are used in resolving `dojo/has` loader conditionals at build time, and to provide the initial values for the run-time has.js feature detection functionality provided by `dojo/has`.  The loader config is specified by the `loaderConfig` options property:

<!-- eslint-disable no-undef, semi, comma-dangle-->
```javascript
const DojoWebpackPlugin = require('dojo-webpack-plugin');
//...
plugins: [
	new DojoWebpackPlugin({
		loaderConfig: require("./loaderConfig"),
		locales: ["en", "es", "fr"]
	})
	//...
]
```

The loader config may be specified as an object, a function that returns the config object, or as a string which represents the name of a CommonJS module that exports the config (object or function).  If specified as an object or a function, then the config expressions are evaluated at build time and the config object is serialized to the client and mixed with the `window.dojoConfig` property at application load time.

If the config is specified as a module name, then the config module will be evaluated both at build time (for the purpose of resolving modules for webpack), and then again at application run time when the config module is loaded on the client.  Note that if you want webpack to process the config module (i.e. perform build time variable substitution, etc.) then you must specify the config as a module name.   

If you want the config to specify different properties at build time vs. run time, then specify the config as a function that returns the config object and use the [environment](#environment) and [buildEnvironment](#buildenvironment) options to set the properties who's values change depending on the target environment.  This works both when the config is evaluated at build time (specified as a function) and when the config is evaluated at build time and runtime (specified as the name of a CommonJS module that exports a function).

This plugin does not support the dojoConfig `deps` and `callback` properties.  The same functionality can be provided by requiring your dependencies in the webpack entry module.  For example:

<!-- eslint-disable no-unused-vars -->
```javascript
// entry.js
require(/* dojoConfig.deps */ ['dep1', 'dep2'], function(dep1, dep2) {
	// dojoConfig.callback code here
});
```

See [js/loaderConfig.js](https://github.com/OpenNTF/dojo-webpack-plugin-sample/blob/master/js/loaderConfig.js) in the sample project for an example of a Dojo loader config that uses the [environment](#environment) and [buildEnvironment](#buildenvironment) options to specify different config paths for build time vs run time.  The config also supports running the sample app as a non-packed application with Dojo loaded from a CDN.

# Dojo loader extensions

Loader extensions are used to provide special processing when loading modules.  Loader extensions prefix the module being loaded, separated by the `!` character.  Both Dojo and Webpack have the concept of loader extensions and use similar syntax, but the implementation are very different, and they use conflicting terminology.  Dojo refers to them as plugins and Webpack refers to them as loaders.  To avoid confusion, we refer to them both in this document as loader extensions.

Dojo loader extensions generally cannot be used with Webpack.  There are several config only approaches to dealing with Dojo loader extensions that don't require changing your application's code.

* Use the NormalModuleReplacementPlugin to replace the Dojo loader extension with a compatible Webpack loader extension.  For example, the `dojo/text` loader extension can be replaced with the Webpack `raw` loader extension.  This can be done with code similar to the following in your `webpack.config.js`.

	<!-- eslint-disable no-undef, semi, comma-dangle -->
	```javascript
	const DojoWebpackPlugin = require('dojo-webpack-plugin');
	//...
	plugins: [
		new DojoWebpackPlugin({/*...*/}),
		new webpack.NormalModuleReplacementPlugin(/^dojo\/text!/, function(data) {
			data.request = data.request.replace(/^dojo\/text!/, "!!raw-loader!");
		}),
		//...
	]
	```

  This replacement (among others) is automatically configured for you, so you don't need to include this in your webpack.config.js.  It is provided here as an example of what you could do with other loader extensions.

* Use the NormalModuleReplacementPlugin to replace the entire module expression with the desired module.  Some Dojo loader extensions are used to dynamically load one module or another based on runtime conditions.  An example is the gfx loader, which loads the rendering engine supported by the client.  Since all modern browsers support the `canvas` rendering engine, you can replace the module expression that includes the loader with the module expression for the target module.

	<!-- eslint-disable no-undef, semi-->
	```javascript
	new NormalModuleReplacementPlugin(/^dojox\/gfx\/renderer!/, "dojox/gfx/canvas")
	```

* Implement the Dojo loader extension as a Webpack loader extension.  This is what has been done with the `dojo/text` and `dojo/i18n` loader extensions.

* Use the NormalModuleReplacementPlugin with the `dojo/loaderProxy` loader extension provided by this package to proxy Dojo loader extensions on the client.  More information on this is provided in [The dojo/loaderProxy loader extension](#the-dojoloaderproxy-loader-extension).

**dojo-webpack-plugin** defines the following loader extension replacements:

<!-- eslint-disable no-undef, semi-->
```javascript
new webpack.NormalModuleReplacementPlugin(/^dojo\/selector\/_loader!default$/, "dojo/selector/lite"),
new webpack.NormalModuleReplacementPlugin(/^dojo\/request\/default!$/, "dojo/request/xhr"),
new webpack.NormalModuleReplacementPlugin(/^dojo\/query!/, data => {
		var match = /^dojo\/query!(.*)$/.exec(data.request);
		data.request = "dojo/loaderProxy?loader=dojo/query&name=" + match[1] + "&absMid=dojo/query%21" + match[1] + "!";
})

```

# The dojo/has loader extension

Dojo supports conditionally depending on modules using the `dojo/has` loader extension.  **dojo-webpack-plugin** supports both build-time and run-time resolution of `dojo/has` loader expressions.  Consider the following example:

<!-- eslint-disable no-undef, semi, no-unused-vars -->
```javascript
define(['dojo/has!foo?js/foo:js/bar'], function(foobar) {
	//...
});
```

In the above example, if the feature `foo` is truthy in the static `has` features that are defined in the dojo loader config, then the expression will be replaced with the module name `js/foo` at build time.  If `foo` is falsy, but not undefined, then it will be replaced with the module name `js/bar`.  If, on the other hand, the feature `foo` is not defined, then resolution of the expression will be deferred to when the application is loaded in the browser and the run-time value of the feature `foo` will be used to determine which module reference is provided.  Note that for client-side resolution, both resources, `js/foo` and `js/bar`, along with their nested dependencies, will be included in the packed assets.  

For complex feature expressions that contain a mixture of defined and undefined feature names at build time, the runtime expression will be simplified so that it contains only the undefined feature names, and only the modules needed for resolution of the simplified expression on the client will be included in the packed resources.  Modules that are excluded by build time evaluation of the expression with the static `has` features will not be include in the packed resources, unless they are otherwise include by other dependencies.

This plugin defines the `webpack` feature with a value of true if it is not already defined by the app.

The [coerceUndefinedToFalse](#coerceundefinedtofalse) option can be used to cause undefined features to evaluate to false at build time.  If this options is true, then there will be no conditional load expressions in the generated code.

The [runtimeFeatures](#runtimeFeatures) option allows you to change the values of selected, statically defined, features at runtime for testing purposes.

You may use [webpack-hasjs-plugin](https://www.npmjs.com/package/webpack-hasjs-plugin) if you want to perform has.js filtering of source code at build time using statically defined features.  

#### namedModules

By default, webpack uses the resource path of the module as the module id in development builds.  In production builds, integer modules ids are used.  Using named module ids helps with debugging, but can trip up the parsing of dojo/has loader expressions when the module ids contains `?` and `:` characters.  For this reason, it is recommended to disable the use of named module ids with the following option in your webpack config:

<!-- eslint-disable semi-->
```javascript
optimization: {
	namedModules: false
}
```

# The dojo/loaderProxy loader extension

`dojo/loaderProxy` is a Webpack loader extension that enables Dojo loader extensions to run on the client.  Not all Dojo loader extensions may be used this way.  Webpack requires that loader extensions complete synchronously whereas Dojo uses an asynchronous architecture for loader extensions.  When using `dojo/loaderProcy` to proxy a Dojo loader extension in Webpack, the basic requirement is that the Dojo loader extension's `load` method invokes its callback in-line, before returning from the `load` method (see update below on use of the [`async`](#async) option to relax this requirement).  The most common use cases are loader extensions that delegate to `dojo/text` or another supported loader extension to load the resource before doing some processing on the result.  By ensuring that the delegated resources are included in the packed assets, `dojo/loaderProxy` is able to ensure that resolution of the delgated resources by the Dojo loader extension will occur synchronously.

Consider a simple svg loader extension that loads the specified svg file and fixes up the contents by removing the xml header in the content.  The implementation of the load method might look like this:

<!-- eslint-disable no-undef, no-unused-vars-->
```javascript
function load(name, req, callback) {
	req(["dojo/text!" + name], function(text) {
		callback(stripHeader(text).trim());
	});
}
```

Here, the load method delegates to a loader extension that is supported by Webpack to load the resource.  If the resource is included in the packed modules, then the `req` callback will be invoked in-line, and thus the `load` method's callback will be invoke in-line.  If the `load` method's callback is not invoked before the `load` method returns, then an exception will be thrown.

You can use `dojo/loaderProxy` with the Webpack NormalModuleReplacementPlugin as follows:

<!-- eslint-disable no-undef, semi, comma-dangle-->
```javascript
new webpack.NormalModuleReplacementPlugin(
	/^svg!/, function(data) {
		var match = /^svg!(.*)$/.exec(data.request);
		data.request = "dojo/loaderProxy?loader=svg&deps=dojo/text%21" + match[1] + "!" + match[1];
	}
)
```

The general syntax for the `dojo/loaderProxy` loader extension is `dojo/loaderProxy?loader=<loader>&deps=<dependencies>&name=<resource>!<resource>` where *loader* specifies the Dojo loader extension to run on the client and *dependencies* specifies a comma separated list of module dependencies to add to the packed resources.  In the example above, if the client code specifies the module as `svg!closeBtn.svg`, then the translated module will be `dojo/loaderProxy?loader=svg&deps=dojo/text%21closeBtn.svg!closeBtn.svg`.  Note the need to URL encode the `!` character so as not to trip up parsing.

Specifying `dojo/text!closeBtn.svg` as a dependency ensures that when it is required by the `svg` loader extension's load method on the client, then the dependency will be resolved in-line and the `load` method's callback will be invoked in-line as required.

The *name* query arg is optional and is provided for cases where the resource name (the text to the right of the "!") does not represent the name of a module that can be resolved at build time.  Since webpack requires the resource name to represent a valid module, you can use the *name* query arg to specify non-module resources or resources that are not available at build time (see notes on the [`async`](#async) option below).  For example, the loaderProxy URL for `dojo/query!css2` would be `dojo/loaderProxy?loader=dojo/query&name=css2!`.

**Update** - Version 2.8 of this plugin introduces the [`async`](#async) option.  When this option is specified, the requirement that the Dojo loader extension invoke its `load` callback synchronously is lifted.  Loader extensions can use `XMLHttpRequest`, `dojo/request`, `dojo/script`, etc. to asynchronously load resources from web sites at runtime.  Note, though, that `require` (the global instance as well as the function passed to the loader extension's load method) may **not** be used to asynchronously load external resources as it maps to webpack's implementation which can only be used to load packed resources.

# Options

The plugin is instantiated with a properties map specifying the following options:

### async

This property specifies that AMD modules should be defined asynchronously.  The default (false) is to define AMD modules synchronously.  This option is supported in version 2.8 or greater and requires webpack version 4.28.4 or greater.

Using async mode allows the [`dojo/loaderProxy`](#the-dojoloaderproxy-loader-extension) plugin to support Dojo loader extensions that resolve asynchronously.

One major caveat to using async mode is that if CommonJS `require` is used to load an AMD module, the returned value can be an un-resolved promise.  For this reason, you should always load AMD modules asynchronously from CommonJS modules unless you can be certain that the module is already defined.  For example:

```javascript
// From within a CommonJS module
Promise.resolve(require('myAmdModule')).then(function(myAmdModule) {
	myAmdModule.doSomething();
});
```

Because async mode depends on ES6 `Promise`, you need to provide a polyfill on platforms that don't support `Promise` natively (e.g. IE11).  You can use the [Dojo ES6 Promise](eS6-promise-polyfill) polyfill for this purpose.

##### Wrapped promises

This section is for the special (and hopefully rare) case of requiring, from CommonJS code, an AMD module that itself returns a promise as the module value.  It applies only when the `async` option is true.  If you're not doing this in your code, then you can ignore this section.

dojo-webpack-plugin wraps module value promises (actually, any thenable) in a non-promise object.  This is done in order to prevent promise chaining from replacing the promise with the resolved value before it is provided to the caller.  Promise wrapping and unwrapping happens transparently within AMD modules, so you don't need to be concerned with it.  When an AMD module is required from CommonJS code, however, then the promise wrapper can be exposed and you need to take steps to deal with it, as shown in the following example:

```javascript
// From within a CommonJS module
const unwrap = require('dojo-webpack-plugin/cjs/unwrapPromiseValue');

Promise.resolve(require("amdModuleThatHasPromiseValue"))
  .then(wrapped => unwrap(wrapped))
  .then(resolved => {
		resolved.doSomething();
	});

```

Note that it is safe to call `unwrap` for non-wrapped modules, and to call it with the value returned by previous calls to unwrap.  If the input module is not a wrapped promise, then the input value is returned.

### loaderConfig

This property is required and specifies the Dojo loader config.  See [The Dojo loader config](#the-dojo-loader-config) for details.

### environment

If the loader config evaluates to a function, then this property specifies the object that is passed to the function when it is called to get the config object.  This should be a JSON type object because it may get stringified for export to the client.

### buildEnvironment

Simialr to `environment`, but used exclusively at build time.  If both are specified, then `buildEnvironment` will be passed to the `loaderConfig` function when building, and `environment` will be passed to the `loaderConfig` function when the config is evaluated for use in the browser.  This facilitates specifying different `loaderConfig` paths (e.g. `baseUrl`) for build vs. run.  If only `environment` is specified, then it is used for both.

### globalContext

Specifies the path to use for resolving relative module ids passed to the [global require function](#the-global-require-function).  Dojo resolves these against the page URL.  If this option is specified as a relative path, then it is resolved against the webpack compiler context.  If not specified, it defaults to the webpack compiler context.

Note that the `globalContext` option is different than the Dojo loader config's `baseUrl` property in that it is used only for resolving relative path module identifiers (those that begin with a `.`) passed to the global require function.  In contrast, the `baseUrl` property is used for resolving non-relative module ids that don't map to a defined package or path.

### loader

This property is optional and specifies the module path of the built Dojo loader.  See [Building the Dojo loader](#building-the-dojo-loader) for details.  If not specified, then the loader will be built as part of the Webpack build.

### locales

This property optional and specifies which locale resources should be included in the build.  The property is specified as an array of strings.  If not specified, then all available locales resources will be included.  If specified as an empty array, then only the default (root) locale resources will be included.

### cjsRequirePatterns

This property is optional and specifies an array of regular expressions to use in identifying CommonJS module identifiers within AMD modules.

See [CommonJS require vs. Dojo synchronous require](#commonjs-require-vs-dojo-synchronous-require).  Some Webpack plugins (e.g. [ProvidePlugin](https://webpack.js.org/plugins/provide-plugin/)) can inject CommonJS calls directly into your AMD modules.  This property provides a mechanism for those modules to be loaded as CommonJS modules.  If any of the regular expressions specified match the module identifier in a candidate require call (within an AMD module), then the module will be loaded as a CommonJS module.  If none of the patterns match, then the require call will be processed as a Dojo synchronous require call.

If not specified, the default pattern `(imports-loader|exports-loader)[?!]` is used.  This pattern will match many of the common use cases for the ProvidePlugin.  Note that if you specify this property, the values you specify **replace** the default value.

### coerceUndefinedToFalse

This property is optional.  If the value is truthy, then undefined features will be treated as false for the purpose of dojo/has loader plugin feature evaluation at build time.  See [The dojo/has loader extension](#the-dojohas-loader-extension) for more information.

### noConsole

This property is optional.  If the value is truthy, then console output from building the Dojo loader will be suppressed.

### runtimeFeatures

This property is optional.  If specified, it is an array of strings which specifies the names of features (`has!` loader conditionals) that are to be evaluated at run time rather than at build time, even if the feature is assigned a value at build time.

You would typically want to specify this option when running unit tests and your tests use `require.undef()` to undefine modules and then load them again using `require()` with different values for the features.  Normally, if a feature is given a value at build time (e.g. in the loader config), then the `has!` loader conditional is fixed and cannot be changed at run time.  With this option, the initial values of the specified features will be those assigned by the build, but you'll be able to change the values of these features and the `has!` loader conditionals in the dependency array of the module that's being loaded or reloaded will work as expected.  

# Building the Dojo loader

This plugin embeds a custom build of the Dojo loader (dojo.js) in your packed application.  The built loader is packaged as a CommonJS module so that it may be more easily consumed by Webpack.  The loader build profile specifies has.js features which exclude unneeded code (e.g. for loading modules) so that the loader embedded into the client is as small as possible (~1.5KB after uglify and gzip)<sup>[<a href="#user-content-foot1">1</a>]</sup>.  The Dojo loader builder requires that the Dojo util directory is a sibling of the `dojo` directory and is named either `util` or `dojo-util`.

If you do not want to build the Dojo loader every time Webpack is run, then you can build it manually and specify the location of the built loader using the [loader](#loader) option.  You can produce a manual build of the loader by running the build script in the buildDojo directory.

        node node_modules/dojo-webpack-plugin/buildDojo/build.js node_modules/dojo/dojo.js ./release

You can also build the loader from a Node script as shown below.

```javascript
const buildLoader = require('dojo-webpack-loader').buildLoader;
buildLoader({
	dojoPath: "node_modules/dojo/dojo.js",
	releaseDir: "./release"
}).then(() => {
  console.log("loader built");
}).catch(err => {
  console.error(err);
});
```

The examples above will build the loader and place it in the `./release` directory, relative to the current directory.  

To have Webpack use the built loader, specify the location of the loader in the plugin options as follows:

<!-- eslint-disable no-undef, semi, comma-dangle-->
```javascript
plugins: [
	new require("dojo-webpack-plugin")({
		loaderConfig: require("./loaderConfig"),
		locales: ["en"],
		loader: path.join(__directory, "./release/dojo/dojo.js")
	}),
]
```

#### Overriding profile features

By default, the embedded loader is built using the static features defined [here](https://github.com/OpenNTF/dojo-webpack-plugin/blob/master/buildDojo/loaderDefaultFeatures.js).  You may override these features by providing an optional, third argument to the build script which specifies the features you want to override as a JSON string.  For example, if you specify the [loaderConfig](#loaderconfig) option as an object, or a function that returns an object (as opposed to specifying it as a module name), then you can make the embedded loader smaller by omitting the config api.  See [The `dojo-config-api` feature](#the-dojo-config-api-feature).  This would be done as follows:

      node node_modules/dojo-webpack-plugin/buildDojo/build.js node_modules/dojo/dojo.js ./release {\"dojo-config-api\":false}

Or, if calling the `buildLoader` function in Node, specify the `has` property as an object map of feature name/value pairs.

# The `dojo-config-api` feature

A modest reduction in the size of the bootstrap code can be realized by excluding the code needed for loading and parsing the Dojo loader config from the embedded Dojo loader.  This can only be done if the [loaderConfig](#loaderconfig) option is specified as an object or function.  It cannot be done if the [loaderConfig](#loaderconfig) option is specified as a module name because of the need for the embedded Dojo loader to process the loader config on the client.

When using an embedded Dojo loader that does not include the config API, post-processed config objects generated at build time are serialized to the application and used to initialize the embedded loader at application run-time. The pre-processed config objects (e.g. `paths`, `packages`, `aliases`, `maps`, etc.) are not serialized to the application because they are not needed by Dojo.  If your application uses `window.dojoConfig` to initialize Dojo properties at application load-time or requires access to `window.dojoConfig` or `require.rawConfig`, then don't use this feature.

This plugin detects at application build time whether or not the embedded Dojo loader includes the config API and emits the code for initializing the application as appropriate for the type of loader provided.

There are two ways to use the embedded Dojo loader without the config API.

1. If the plugin is building the loader automatically at application build time (i.e. you are not specifying the [loader](#loader) option), then you can specify the `dojo-config-api` feature with a value of 0 or false in the Dojo loader config `has` property.  Note that the `dojo-config-api` has feature is ignored if the [loaderConfig](#loaderconfig) option specifies a module name.
	<!-- eslint-disable no-undef, semi -->
	```javascript
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths: {/*...*/},
				packages: [/*...*/],
				has: {'dojo-config-api':false}
			}
			// ...
		})
	]
	```

1. If you are specifying a pre-built embedded loader using the [loader](#loader) option, then build the loader without the config API as described in [Overriding profile features](#overriding-profile-features).  Note that a build-time exception will be thrown if the [loaderConfig](#loaderconfig) option specifies a module name and the provided loader does not include the config API.

# The `dojo-undef-api` feature

This plugin supports the `dojo-undef-api` feature.  If this feature is enabled in the Dojo loader config's `has` property at build time, then `require.undef` may be called at runtime to remove a module from the list of defined modules.  This generally works only with AMD modules, not CommonJS modules. `require.undef` is primarily useful for test frameworks that need to load and unload modules without having to reload the entire application.

# ES6 Promise polyfill

Webpack 2.x and greater includes code in your packed application that uses ES6 `Promise`.  If you need to support browsers that lack ES6 `Promise` support (e.g. IE 11), then you will need to provide this capability in your application.  This plugin provides a tiny wrapper module named [dojoES6Promise](https://github.com/OpenNTF/dojo-webpack-plugin/blob/master/amd/dojoES6Promise.js) that implements ES6 `Promise` using `dojo/Deferred`.  All you need to do is include this module as an AMD dependency in your application.  See [bootstrap.js](https://github.com/OpenNTF/dojo-webpack-plugin-sample/blob/master/js/bootstrap.js) in the sample application for an example.

# Order of Plugin Registration

When using Webpack's NormalModuleReplacementPlugin, the order of the plugin registration relative to the **dojo-webpack-plugin** registration is significant.  **dojo-webpack-plugin** converts the module expressions to an absMid (relative paths resolved, maps and aliases applied), so if the NormalModuleReplacementPlugin is registered after **dojo-webpack-plugin**, then `data.request` will contain the absMid for the module and `data.originalRequest` will contain the original module expression before transformation by **dojo-webpack-plugin**.  If the NormalModuleReplacementPlugin is registered before **dojo-webpack-plugin** then the NormalModuleReplacementPlugin will get to modify the request before **dojo-webpack-plugin** applies its transformations.

# The global require function

Like Dojo, this plugin differentiates between the global require function and [context-sensitive require](https://dojotoolkit.org/reference-guide/1.10/loader/amd.html#context-sensitive-require).  This distinction affects how module identifiers with relative paths are resolved.  When using context-sensitive require, relative paths are resolved against the path of the containing module.  When using global require, Dojo resolves relative paths against the page URL, while this plugin resolves them against the path specified by the [globalContext](#globalcontext) option, or the webpack compiler context path.

Also like Dojo, this plugin defines `window.require` in global scope on the client.  The global require function implements Dojo's [synchronous require](#commonjs-require-vs-dojo-synchronous-require) capability.  This works great for Dojo applications but it can be a problem in some scenarios involving other (non-webpack) loaders or frameworks.  For those situations where it is not desirable to overwrite `window.require`, you can use the ScopedRequirePlugin plugin.  The ScopedRequirePlugin plugin leaves `window.require` untouched, and instead defines `require` in a scope that encloses each AMD module.  Note that this scoped `require` is similar to the global `require` in that it is not associated with any module's context and cannot be used to load modules with paths relative to the calling module.  For that you need to use a context-sensitive require defined within your module.

To use the `ScopedRequirePlugin` plugin, register the plugin after `dojo-webpack-plugin` in your `webpack.config.js` file.

<!-- eslint-disable no-undef, semi -->
```javascript
const DojoWebpackPlugin = require('dojo-webpack-plugin');
  // ...
  plugins: [
    new DojoWebpackPlugin({
      loaderConfig: {/*...*/},
      locales: [/*...*/]
    }),
    new DojoWebpackPlugin.ScopedRequirePlugin()
  ]
```

# Use of run-time identifiers and expressions in dependency arrays

The plugin supports the use of run-time identifiers and expressions in require/define dependency arrays with the caveat that the modules referenced by the identifiers or expressions must be available in chunks that have already been loaded on the client.  For example:

<!-- eslint-disable no-unused-vars -->
```javascript
var fooName = 'foo';
function getBarName() {
	return 'bar';
}
require([fooName, getBarName(), 'baz'], function(foo, bar, baz) {
	/* ... */
});
```

In order for the above code to execute successfully, the modules `foo` and `bar` must be available on the client when the callback is invoked, otherwise, an exception will be thrown.  This means that the modules must have been included in a previously loaded chunk, or they must be direct or indirect dependencies of `baz` so that they are included in the chunk(s) being loaded.  Since values of run-time identifiers or expressions, in general, cannot be known at build time, webpack cannot manage the loading of these modules or their dependencies.

Note that you can also specify the require dependency array as a run-time identifier, with the same restrictions applying to all the modules in the array.

# Use of Dojo's Auto-Require feature

Dojo's [Auto-Require](https://dojotoolkit.org/documentation/tutorials/1.10/declarative/#auto-require) feature allows the parser to automatically require the modules for widgets that are declared by templates.  This can be problematic with webpack for the reasons discussed [above](#use-of-run-time-identifiers-and-expressions-in-dependency-arrays), if your modules do not explicitly specify dependencies for the widgets that they contain.  Although useful for prototyping and demo purposes, Dojo itself recommends against using Auto-Require for production code because of it's negative performance consequences, and to instead be explicit about your application's dependencies.

# Dependency requirements

**dojo-webpack-plugin** has a peer dependency on webpack.  **dojo-webpack-plugin**'s webpack dependencies must resolve to the same modules as your application's webpack dependencies, otherwise you may encounter errors similar to the following when building.

```
Error: Cannot find module 'webpack-core/lib/ConcatSource'
```

The best way to ensure that the requirement is met is to make sure that both this plugin and webpack are installed in the same `node_modules` directory, and to use flat, rather than hierarchical, tree dependency resolution (the default for npm v3 and above) when using npm to install the packages.

# Related plugins

* [webpack-hasjs-plugin](https://www.npmjs.com/package/webpack-hasjs-plugin) - Performs has.js filtering of source code at build time based on statically defined features.

* [webpack-i18n-extractor-plugin](https://www.npmjs.com/package/webpack-i18n-extractor-plugin) - Extracts NLS resources from the application chunks and places them in language/chunk specific bundles that are automatically loaded as needed for the current locale.

# Sample application

See the sample application at https://github.com/OpenNTF/dojo-webpack-plugin-sample.

https://openntf.github.io/dojo-webpack-plugin-sample/test.html.

# Release Notes

The versions of Dojo listed below require version 2.1.0 or later of this plugin to work correctly.  Attempting to use earlier versions of this plugin with the listed versions of Dojo will result in the error "Dojo require not yet initialized" when building.  The newer versions of this plugin should continue to work with older patch releases of the listed versions of Dojo.

* 1.13.0 and later
* 1.12.3 and later
* 1.11.5 and later
* 1.10.9 and later

In addition, Dojo loaders built with earlier versions of the plugin will not work with 2.1.0 or later, even if you have not changed the version of Dojo you are building with.  If you are using a pre-built loader with the [loader](#loader) config option, then you will need to rebuild it when upgrading to 2.1.

# Known Issues

There is a known issue with incrementally upgrading some versions of webpack to newer versions when using this plugin.  If, after upgrading webpack, you encounter the error "No hook for resolver normal in object ResolverFactory", try deletig your `node_modules` directory **and** your `package-lock.json` file and running `npm install` again to resolve the issue.

# Footnotes

<a name="foot1">1.</a>&nbsp; Embedded loader sizes are determined using a stand-alone embedded loader that has been uglified and gzipped.  The loader was produced as described in [Building the Dojo loader](#building-the-dojo-loader), with [the Dojo config API excluded](#the-dojo-config-api-feature) and using the 2.2.2 version of this plugin and the 1.14 Dojo loader, both of which support the new [`foreign-loader`](https://github.com/dojo/dojo/pull/279) has.js feature conditional.  Embedded loader sizes for earlier versions vary depending on the version of this plugin and of Dojo, up to a max of about 4KB when the Dojo config API is included.

[npm]: https://img.shields.io/npm/v/dojo-webpack-plugin.svg
[npm-url]: https://npmjs.com/package/dojo-webpack-plugin
[builds-url]: https://travis-ci.org/OpenNTF/dojo-webpack-plugin
[builds]: https://travis-ci.org/OpenNTF/dojo-webpack-plugin.svg?branch=master
[cover-url]: https://coveralls.io/github/OpenNTF/dojo-webpack-plugin?branch=master
[cover]: https://coveralls.io/repos/github/OpenNTF/dojo-webpack-plugin/badge.svg?branch=master
[licenses-url]: https://app.fossa.io/api/projects/git%2Bgithub.com%2FOpenNTF%2Fdojo-webpack-plugin
[licenses]: https://app.fossa.io/api/projects/git%2Bgithub.com%2FOpenNTF%2Fdojo-webpack-plugin.svg?type=shield
[apache2]: https://img.shields.io/badge/license-Apache%202-blue.svg
[apache2-url]: https://www.apache.org/licenses/LICENSE-2.0.txt
