---
layout: post
title: JBrowse 1.13.0 release - now with webpack!
date: 2018-03-15
tags: ['News', 'Software releases']
---

I'm pleased to announce that JBrowse 1.13.0 has been released!

There are actually not a huge number of new features in this release, but there
has been a significant change in the way JBrowse is built behind the scenes, and
the introduction of a slight (slight! I hope it's slight!) backward
incompatibility with some existing plugins.

JBrowse now uses webpack to build and package its code for consumption by web
browsers, which opens up a lot of options for the development team, paving the
way for a much nicer road to all of the great things coming down the road in
JBrowse 2. Most importantly, it means that we can build JBrowse 2 with modern
technologies, while sharing code (particularly data stores) with JBrowse 1,
which should greatly accelerate JBrowse 2 development. Yeah, we're playing 4-D
chess here.

However, besides the big build system overhaul, there are also some nice new
improvements and bug fixes in this release, read below for the full release
notes.

## Files for download

- [JBrowse-1.13.0.zip](https://github.com/GMOD/jbrowse/releases/download/1.13.0-release/JBrowse-1.13.0.zip) -
  2.7M file SHA1 4f28b25cb1ec4038723d9afe00f30c7695bee4a1
- [JBrowse-1.13.0-dev.zip](https://github.com/GMOD/jbrowse/releases/download/1.13.0-release/JBrowse-1.13.0-dev.zip) -
  6.1M file SHA1 30688686d568f3ff95cd1f603ea1a060835f714b

## Major improvements

- JBrowse now uses a Webpack-based build system, which greatly speeds up
  JBrowse's initial loading time. More importantly, going forward, this change
  will also enable us to make much more effective use of the huge node.js
  ecosystem that has grown up in recent years, as well as to use newer versions
  of JavaScript itself while still maintaining compatibility with older web
  browsers.
- Behind the scenes, the way JBrowse plugins are discovered and loaded has also
  changed significantly. The most visible consequence of this change is that
  installations that use plugins must now use the JBrowse-1.13.0-dev.zip release
  (or check out the `master` branch from GitHub), and must re-run the webpack
  build (most easily by running `setup.sh`) every time a plugin is added or
  removed from JBrowse. Although we think that most users of plugins will not
  experience any problems, we recommend that installations that make use of
  plugins other than the standard built-in plugins (Neat\*Features, RegexSearch,
  etc) test the compatibility of their plugins thoroughly before deploying this
  release, and report any problems either to the JBrowse issue tracker on
  GitHub, or to the gmod-ajax mailing list.
- Again, concisely: if you use JBrowse plugins other than the "stock" ones that
  come with JBrowse, you must now use the `dev` release of JBrowse, and re-run
  either `setup.sh` or `npm run build` every time you add or remove a plugin.
  ([issue #981](https://github.com/gmod/jbrowse/issues/981),
  [@rbuels](https://github.com/rbuels))
- JBrowse plugins can now be published and installed with NPM. Simply publish
your plugin using the standard `npm publish` machinery, and make sure its
package name ends with "-jbrowse-plugin". For example, if you have a plugin
named "foo", publish it to npm as "foo-jbrowse-plugin". However, if your plugin
is named MyAwesomePlugin, which is not compatible with npmjs.org's naming
conventions, you will want to publish it as something like
"myawesome-jbrowse-plugin" and add a configuration stanza to its package.json
file telling JBrowse its real plugin name. Example:
<pre style="display: block;">{
  ...
  "jbrowsePlugin": {
    "name": "MyAwesomePlugin"
  },
  ...
}
</pre>

## Minor Improvements

- Added `disableCollapsedClick` and `enableCollapsedMouseover` track
  configuration options. The `enableCollapsedMouseover` option is useful when
  features do not overlap e.g. chromosome segmentation and
  `disableCollapsedClick` is useful when the collapsed features are very dense.
  Thanks to [@rdhayes](https://github.com/rdhayes) for tips
  ([issue #544](https://github.com/gmod/jbrowse/issues/544),
  [issue #870](https://github.com/gmod/jbrowse/pull/870),
  [@cmdcolin](https://github.com/cmdcolin))
- Removed JBrowse 1.2.1 compatibility. Please use JBrowse 1.12.5 or earlier if
  you still have old data formatted with JBrowse 1.2.1.
  ([@rbuels](https://github.com/rbuels))
- For `npm` installations of JBrowse, jb_run.js and jb_setup.js are now
  installed into the standard `node_modules/.bin` location.
  ([issue #1021](https://github.com/gmod/jbrowse/issues/1021),
  [@rbuels](https://github.com/rbuels))

## Bug fixes

- Fixed a bug in which adding setting `tracklabels=0` in the URL failed to hide
  track labels when `nav=0` was also set in the URL. Thanks to Vaneet Lotay for
  reporting the problem, and [@cmdcolin](https://github.com/cmdcolin) for the
  fix. ([issue #1017](https://github.com/gmod/jbrowse/issues/1017),
  [issue #1018](https://github.com/gmod/jbrowse/pull/1018),
  [@cmdcolin](https://github.com/cmdcolin))
