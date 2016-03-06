NeatCanvasFeatures is a JBrowse plugin.

It applies intron hats and a gradient 'tubular' look to features and subfeatures of HTMLFeatures tracks.

What it does:
- draws intron hats and inverted hats for reverse direction features.
- it applies a gradient 'tubular' look to features and subfeatures, inheriting the feature colors and properties.
- modifies UTR to be a outlined box, inheriting the original color.
- generally functional in stand-alone JBrowse.

Install / Activate:

For JBrowse 1.11.6+, copy the NeatCanvasFeatures directory to the 'plugins' directory.
Add this to appropriate trackList.json under the plugins section (create one if it doesn't exist):

   "plugins": [ 
        'NeatCanvasFeatures'
    ],

For Apollo 2.x, copy the NeatCanvasFeatures directory to the web-apps/jbrowse/plugins directory.
Add this to web-apps/jbrowse/plugins/WebApollo/json/annot.json:

    "plugins" : [
        {
           "location" : "./plugins/WebApollo",
           "name" : "WebApollo"
        },
        {
               "location" : "./plugins/NeatCanvasFeatures",
               "name" : "NeatCanvasFeatures"
        }
   ],


Config Options:
Gradient Features are on for all HTML feature tracks by default.

They can be turned off globally in the config file by setting gradientFeatures = 0 in the plugin definition, for example:

   "plugins": [
        {
            "name": "NeatHTMLFeatures",
            "gradientFeatures": 0
        }
   ],

When gradientFeatures = 0 (globally off) in the plugins definition, gradient features can be enabled on per track basis with gradientFeatures = 1 in the track configuration, for example:
    "tracks": [
        {
            ...
            "type" : "FeatureTrack",
            "label" : "ReadingFrame",
            "gradientFeatures" : 1,
            ...
        }
    ]
