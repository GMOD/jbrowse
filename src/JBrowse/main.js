// saves some loading time by loading most of the commonly-used
// JBrowse modules at the outset
require([
            'JBrowse/Browser',
            'JBrowse/ConfigAdaptor/JB_json_v1',
            'JBrowse/View/TrackList/Simple',

            // common stores
            'JBrowse/Store/Sequence/StaticChunked',
            'JBrowse/Store/SeqFeature/NCList',
            'JBrowse/Store/TiledImage/Fixed',

            // common track views
            'JBrowse/View/Track/Sequence',
            'JBrowse/View/Track/HTMLFeatures',
            'JBrowse/View/Track/FixedImage/Wiggle',

            'JBrowse/View/TrackList/Simple',
            'JBrowse/Store/TrackMetaData',

            'dojox/gfx/svg'
        ]);
