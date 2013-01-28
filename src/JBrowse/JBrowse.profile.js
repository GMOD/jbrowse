// This function is used to determine whether or not a resource should be tagged as copy-only. See the resourceTags
// property below for more information.
function copyOnly(mid) {
    return mid in {
        // There are no modules right now that are copy-only. If you have some, though, just add
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
    stripConsole: 'normal',

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
            include: [ 'dojo/dojo', 'JBrowse', 'dojox/data/CsvStore', 'jszlib' ],
            boot: true,
            customBase: true
        },

        'JBrowse/View/TrackList/Faceted': {
            include: [ 'JBrowse/View/TrackList/Faceted' ],
            exclude: ['JBrowse']
        },

        'JBrowse/Store/BigWig': {
            include: [ 'JBrowse/Store/BigWig' ],
            exclude: ['JBrowse']
        },

        'JBrowse/Store/SeqFeature/BAM': {
            include: [ 'JBrowse/Store/SeqFeature/BAM' ],
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