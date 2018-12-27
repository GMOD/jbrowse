# NeatCanvasFeatures

It applies intron hats and a gradient 'tubular' look to features and subfeatures of CanvasFeatures tracks.

![](img/example.png?raw=true)


### Install / Activate:

Add the plugin declaration to the config file as follows

    "plugins": [
        "NeatCanvasFeatures"
    ],


See http://gmod.org/wiki/JBrowse_FAQ#How_do_I_install_a_plugin for more details


### Configuration

    {
        "label": "Genes",
        "type": "NeatCanvasFeatures/View/Track/NeatFeatures",
        "urlTemplate" : "tracks/ReadingFrame/{refseq}/trackData.json"
        "storeClass": "JBrowse/Store/SeqFeature/NCList"
    }

You can also add "gradient": true to the track definition to get gradients added

