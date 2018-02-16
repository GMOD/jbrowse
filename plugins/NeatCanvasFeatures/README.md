# NeatCanvasFeatures - a JBrowse plugin.

It applies intron hats and a gradient 'tubular' look to features and subfeatures of CanvasFeatures tracks.

![](img/example.png?raw=true)

### What it does:
- draws intron hats and inverted hats for reverse direction features.
- it applies a gradient 'tubular' look to features and subfeatures, inheriting the feature colors and properties.
- modifies UTR to be a outlined box, inheriting the original color.
- generally functional in stand-alone JBrowse.

### Install / Activate:
For JBrowse 1.11.6+, copy the `NeatCanvasFeatures` directory to the `plugins` directory.
Add this to appropriate **trackList.json** under the plugins section (create one if it doesn't exist):

    "plugins": [ 
         'NeatCanvasFeatures'
     ],

For Apollo 2.x, copy the NeatCanvasFeatures directory to the `web-apps/jbrowse/plugins` directory.
Add this to `web-apps/jbrowse/plugins/WebApollo/json/annot.json`:

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

### Config Options:
Gradient Features are ON for all Canvas tracks by default.
They can be turned off globally in trackList.json file by setting `gradient = 0` in the plugin definition, for example:

    "plugins": [
         {
             "name": "NeatCanvasFeatures",
             "gradient": 0
         }
    ],

