/* 
 * CategoryURL - JBrowse plugin
 * 
 * Add URL parameter "cat" to specifiy a category of tracks to display.
 * All tracks with the given category will be displayed.
 * 
 * Usage: http://myurl.org....&cat=abc
 * Result: all tracts with category "abc" will be displayed.
 * 
 */

define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'JBrowse/Plugin',
           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           Deferred,
           JBrowsePlugin,
           Util        
       ) {
return declare( JBrowsePlugin,
{
    constructor: function( args ) {
        console.log("plugin: CategoryUrl");

        var thisB = this;
        
        // intercept browser.showTracks
        this.browser.oldShowTracks = this.browser.showTracks;

        this.browser.showTracks = function (tracksToShow) {
            //console.log("showTracks() intercepted!");
            //console.log(tracksToShow);
            var catCount = 0;
            var tracks = thisB.browser.config.tracks;
            
            var cat = thisB.getUrlParam("cat");
            if (cat != null) {
                //console.log("has cat=");
                //console.dir (cat);
                var catlist = cat.split("/");
                for (var i = 0; i < catlist.length; i++) 
                    catlist[i] = catlist[i].replace(/^[ ]+|[ ]+$/g,''); //trim leading/trailing spaces
                //console.dir(catlist);
                catCount = catlist.length;
            }
            // if catCount > 1, it means that cat= was define in url
            if (catCount) {
                // traverse all tracks and display the ones that match
                for(var i=0;i < tracks.length;i++) {
                    //console.log("track "+i+" ("+tracks[i].category+") "+tracks[i].label);

                    var t_catlist = [];
                    var t_catCount = 0;

                    // handle track.metadata.category
                    if (typeof(tracks[i].metadata) !== 'undefined' && typeof(tracks[i].metadata.category) !== 'undefined') {
                        // separate the category / sub categories 
                        t_catlist = tracks[i].metadata.category.split("/");
                        t_catCount = t_catlist.length;
                    }

                    // handle track.category
                    if (typeof(tracks[i].category) !== 'undefined') {
                        // separate the category / sub categories 
                        t_catlist = tracks[i].category.split("/");
                        t_catCount = t_catlist.length;
                    }
                    
                    if (catCount <= t_catCount) {
                        
                        for (var j = 0; j < t_catlist.length; j++)
                            t_catlist[j] = t_catlist[j].replace(/^[ ]+|[ ]+$/g,''); //trim leading/trailing spaces
                        
                        // if any of the category or subcategories do not match, set the match flag to false
                        var match = true;
                        
                        for (var j = 0; j < catCount; j++) {
                            if (catlist[j] != t_catlist[j]) match = false;
                        }
                        
                        // if there's a match, show the track
                        if (match==true) {
                            //console.log("match!")
                            tracksToShow.push(tracks[i].label);
                        }
                    }
                }
                // eliminate duplicate tracks
                tracksToShow = Util.uniq(tracksToShow);
            }
            //console.log(tracksToShow);
            
            // call the original showTracks() function
            thisB.browser.oldShowTracks(tracksToShow);
        }

    },
    
    //value = getUrlParam('q', 'hxxp://example.com/?q=abc')
    // returns null if not found
    getUrlParam: function( name, url ) {
      if (!url) url = window.location.href
      name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
      var regexS = "[\\?&]"+name+"=([^&#]*)";
      var regex = new RegExp( regexS );
      var results = regex.exec( url );
      return results == null ? null : decodeURIComponent(results[1]);
    }

});
});
