/**
 * This is a new Dojo 1.7 style build profile. Look at util/build/buildControlDefault.js if you want to explore the
 * default Dojo build profile options.
 */

// This function is used to determine whether or not a resource should be tagged as copy-only. See the resourceTags
// property below for more information.
function copyOnly(mid) {
    return mid in {
        // There are no modules right now in dojo boilerplate that are copy-only. If you have some, though, just add
        // them here like this:
        // 'app/module': 1
    };
}

var profile = {
    // basePath is relative to the directory containing this profile file; in this case, it is being set to the
    // src/ directory, which is the same place as the baseUrl directory in the loader configuration. (If you change
    // this, you will also need to update run.js).
    basePath: '..',

    // This is the directory within the release directory where built packages will be placed. The release directory
    // itself is defined by build.sh. You really probably should not use this; it is a legacy option from very old
    // versions of Dojo (like, version 0.1). If you do use it, you will need to update build.sh, too.
    // releaseName: '',

    // Builds a new release.
    action: 'release',

    // Strips all comments from CSS files.
    cssOptimize: 'comments',

    // Excludes tests, demos, and original template files from being included in the built version.
    mini: true,

    // Uses Closure Compiler as the JavaScript minifier. This can also be set to "shrinksafe" to use ShrinkSafe.
    // Note that you will probably get some “errors” with CC; these are generally safe to ignore, and will be
    // fixed in a later version of Dojo. This defaults to "" (no compression) if not provided.
    //optimize: 'closure',

    // We’re building layers, so we need to set the minifier to use for those, too. This defaults to "shrinksafe" if
    // it is not provided.
    layerOptimize: 'closure',

    // Strips all calls to console functions within the code. You can also set this to "warn" to strip everything
    // but console.error, and any other truthy value to strip everything but console.warn and console.error.
    stripConsole: 'all',

    // The default selector engine is not included by default in a dojo.js build in order to make mobile builds
    // smaller. We add it back here to avoid that extra HTTP request. There is also a "lite" selector available; if
    // you use that, you’ll need to set selectorEngine in app/run.js too. (The "lite" engine is only suitable if you
    // are not supporting IE7 and earlier.)
    selectorEngine: 'acme',

    // Builds can be split into multiple different JavaScript files called “layers”. This allows applications to
    // defer loading large sections of code until they are actually required while still allowing multiple modules to
    // be compiled into a single file.
    layers: {
        // This is the main loader module. It is a little special because it is treated like an AMD module even though
        // it is actually just plain JavaScript. There is some extra magic in the build system specifically for this
        // module ID.
        'dojo/dojo': {
            // In addition to the loader (dojo/dojo) and the loader configuration file (app/run), we’re also including
            // the main application (app/main) and the dojo/i18n and dojo/domReady modules because they are one of the
            // conditional dependencies in app/main (the other being app/Dialog) but we don’t want to have to make
            // extra HTTP requests for such tiny files.
            include: [ 'dojo/dojo', 'dojo/i18n', 'dojo/domReady', 'JBrowse' ],

            // By default, the build system will try to include dojo/main in the built dojo/dojo layer, which adds a
            // bunch of stuff we don’t want or need. We want the initial script load to be as small and quick as
            // possible, so we configure it as a custom, bootable base.
            boot: true,
            customBase: true
        },

        // In the demo application, we conditionally require app/Dialog on the client-side, so we’re building a
        // separate layer containing just that client-side code. (Practically speaking, you’d probably just want
        // to roll everything into a single layer, but I wanted to make sure to illustrate multi-layer builds.)
        'JBrowse/View/TrackList/Faceted': {
            include: [ 'JBrowse/View/TrackList/Faceted', 'dojox/data/CsvStore' ],
            exclude: ['JBrowse']
        }
    },

    // Providing hints to the build system allows code to be conditionally removed on a more granular level than
    // simple module dependencies can allow. This is especially useful for creating tiny mobile builds.
    // Keep in mind that dead code removal only happens in minifiers that support it! Currently, ShrinkSafe does not
    // support dead code removal; Closure Compiler and UglifyJS do.
    staticHasFeatures: {
        // The trace & log APIs are used for debugging the loader, so we don’t need them in the build
        'dojo-trace-api':0,
        'dojo-log-api':0,

        // This causes normally private loader data to be exposed for debugging, so we don’t need that either
        'dojo-publish-privates':0,

        // We’re fully async, so get rid of the legacy loader
        'dojo-sync-loader':0,

        // dojo-xhr-factory relies on dojo-sync-loader
        'dojo-xhr-factory':0,

        // We aren’t loading tests in production
        'dojo-test-sniff':0
    },

    // Resource tags are functions that provide hints to the compiler about a given file. The first argument is the
    // filename of the file, and the second argument is the module ID for the file.
    resourceTags: {
        // Files that contain test code.
        test: function (filename, mid) {
            return false;
        },

        // Files that should be copied as-is without being modified by the build system.
        copyOnly: function (filename, mid) {
            return copyOnly(mid);
        },

        // Files that are AMD modules.
        amd: function (filename, mid) {
            return !copyOnly(mid) && /\.js$/.test(filename);
        },

        // Files that should not be copied when the “mini” compiler flag is set to true.
        miniExclude: function (filename, mid) {
            return mid in {
                'JBrowse/profile': 1
            };
        }
    }
};