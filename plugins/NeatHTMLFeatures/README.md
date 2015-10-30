NeatHTMLFeatures is a JBrowse plugin.

It applies intron hats and a gradient 'tubular' look to features and subfeatures of HTMLFeatures tracks.
This is refactored from HTMLFeaturesEx.js implementation and the insertion/modification to DOM elements are done out-of-band.

What it does:
- draws intron hats and inverted hats for reverse direction features.
- it applies a gradient 'tubular' look to features and subfeatures, inheriting the feature colors and properties.
- modifies UTR to be a outlined box, inheriting the original color.
- generally functional in stand-alone JBrowse.
- special considerations have been made for the unique way Web Apollo renders it's subfeatures in nested way.


NOTE: This plugin requires an updated HTMLFeatures.js -- a small bug fixed (included as part of the first commit of NeatFeatures).


Install / Activate:

For JBrowse 1.11.6+, copy the NeatFeatures directory to the 'plugins' directory.
Add this to appropriate trackList.json under the plugins section (create one if it doesn't exist):

   "plugins": [ 
        'NeatFeatures'
    ],

For Apollo 2.0.0, copy the NeatFeatures directory to the web-apps/jbrowse/plugins directory.
Add this to web-apps/jbrowse/plugins/WebApollo/json/annot.json:

    "plugins" : [
      {
         "location" : "./plugins/WebApollo",
         "name" : "WebApollo"
      },
	  {
		 "location" : "./plugins/NeatFeatures",
		 "name" : "NeatFeatures"
	  }
   ],


