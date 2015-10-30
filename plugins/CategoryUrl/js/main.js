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
            
            var tracks = thisB.browser.config.tracks;
            
            var cat = thisB.getUrlParam("cat");
    
            // if "cat" is defined in URL, process categories
            if (cat) {
                // append category tracks to other specified tracks
                for(var i=0;i < tracks.length;i++) {
                    //console.log("track "+i+" "+tracks[i].category+" "+tracks[i].label);
                    if (tracks[i].category === cat)
                        tracksToShow.push(tracks[i].label);
                }
                // eliminate duplicate tracks
                tracksToShow = Util.uniq(tracksToShow);
            }
            console.log(tracksToShow);
            
            // call the original showTracks() function
            thisB.browser.oldShowTracks(tracksToShow);
        }

    },
    //value = getUrlParam('q', 'hxxp://example.com/?q=abc')
    getUrlParam: function( name, url ) {
      if (!url) url = window.location.href
      name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
      var regexS = "[\\?&]"+name+"=([^&#]*)";
      var regex = new RegExp( regexS );
      var results = regex.exec( url );
      return results == null ? null : results[1];
    }

});
});
