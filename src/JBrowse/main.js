// saves some loading time by loading most of the commonly-used
// JBrowse modules at the outset
require([
            'JBrowse/Browser',
            'JBrowse/ConfigAdaptor/JB_json_v1',
            'JBrowse/View/TrackList/Simple',

            'JBrowse/View/Track/Sequence',
            'JBrowse/Store/Sequence/StaticChunked',

            'JBrowse/View/Track/HTMLFeatures',
            'JBrowse/Store/SeqFeature/NCList',

            'JBrowse/View/TrackList/Simple',
            'JBrowse/Store/TrackMetaData',

            'dojox/gfx/svg'
        ]);
