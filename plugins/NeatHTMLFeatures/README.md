# NeatHTMLFeatures

This plugin is designed to draw intron hats to features and subfeatures of HTMLFeatures tracks.

![](img/example.png?raw=true)



### Install / Activate:

Add the plugin declaration to the config file as follows

    "plugins": [
        "NeatHTMLFeatures"
    ],


See http://gmod.org/wiki/JBrowse_FAQ#How_do_I_install_a_plugin for more details


### Configuration

    {
        "label": "Genes",
        "type": "NeatHTMLFeatures/View/Track/NeatFeatures",
        "urlTemplate" : "tracks/ReadingFrame/{refseq}/trackData.json"
        "storeClass": "JBrowse/Store/SeqFeature/NCList"
    }


### Note

Gradients are not enabled currently just due to a refactoring
