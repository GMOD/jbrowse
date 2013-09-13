var profile = {
    basePath: 'src',
    action: 'release',
    cssOptimize: 'comments',
    mini: true,
    layerOptimize: 'closure',
    stripConsole: 'normal',
    selectorEngine: 'acme',
    layers: {
        'RegexSequenceSearch/main': {
            include: [ 'RegexSequenceSearch' ],
            exclude: ['JBrowse'],
            customBase: true
        }
    },
    staticHasFeatures: {
        'dojo-trace-api':0,
        'dojo-log-api':0,
        'dojo-publish-privates':0,
        'dojo-sync-loader':0,
        'dojo-xhr-factory':0,
        'dojo-test-sniff':0
    },
    resourceTags: {
        test: function (filename, mid) {
            return false;
        },
        copyOnly: function (filename, mid) {
            return copyOnly(mid);
        },
        amd: function (filename, mid) {
            return !copyOnly(mid) && /\.js$/.test(filename);
        },
        miniExclude: function (filename, mid) {
            return mid in {
                'RegexSequenceSearch/profile': 1
            };
        }
    }
};