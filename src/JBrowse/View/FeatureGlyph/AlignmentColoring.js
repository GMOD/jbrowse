define( [
    'JBrowse/Util'
],
function(Util) {

var c = {
    colorAlignment(feature, score, glyph, track) {
        for(var i = 0; i < track.config.style.colorSchemes.length; i++) {
            if(track.config.style.colorSchemes[i].selected) {
                return track.config.style.colorSchemes[i].callback(feature, score, glyph, track)
            }
        }
    },




    colorArcs(feature, score, glyph, track) {
        for(var i = 0; i < track.config.style.colorSchemes.length; i++) {
            if(track.config.style.colorSchemes[i].selected) {
                return track.config.style.colorSchemes[i].callback(feature, score, glyph, track)
            }
        }
    },

    connectorColor(feature, score, glyph, track) {
        for(var i = 0; i < track.config.style.colorSchemes.length; i++) {
            if(track.config.style.colorSchemes[i].selected) {
                return track.config.style.colorSchemes[i].callback(feature, score, glyph, track)
            }
        }
        return 'black'
    }
};

return c;

});
