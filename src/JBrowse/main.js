// saves some loading time by loading most of the commonly-used
// JBrowse modules at the outset
require([
            'JBrowse/Browser',
            'JBrowse/ConfigAdaptor/JB_json_v1',

            // default tracklist view
            'JBrowse/View/TrackList/Hierarchical',

            // common stores
            'JBrowse/Store/Sequence/StaticChunked',
            'JBrowse/Store/SeqFeature/NCList',
            'JBrowse/Store/TiledImage/Fixed',
            'JBrowse/Store/Names/Hash',
            'JBrowse/Store/Names/REST',

            // common track views
            'JBrowse/View/Track/Sequence',
            'JBrowse/View/Track/HTMLFeatures',
            'JBrowse/View/Track/FixedImage/Wiggle',
            'JBrowse/View/Track/Wiggle',
            'JBrowse/View/Track/Wiggle/XYPlot',
            'JBrowse/View/Track/Wiggle/Density',
            'JBrowse/View/Track/Alignments',
            'JBrowse/View/Track/Alignments2',
            'JBrowse/View/Track/FeatureCoverage',
            'JBrowse/View/Track/SNPCoverage',

            // track lists
            'JBrowse/Store/TrackMetaData',

            'xstyle/load-css',
            'dojox/gfx/svg'
        ]);
