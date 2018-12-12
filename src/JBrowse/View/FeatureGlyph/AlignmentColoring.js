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


    colorByInsertSize(feature, score, glyph, track) {
        if (feature.get('is_paired') && feature.get('seq_id') != feature.get('next_seq_id')) {
            return glyph.getStyle(feature, 'color_interchrom')
        }
        const s = Math.abs(score/10)
        return `hsl(${s},50%,50%)`;
    },

    colorArcs(feature, score, glyph, track) {
        if (track.config.colorByOrientationAndSize) {
            return c.colorByOrientationAndSize.apply(null, arguments)
        } else if (track.config.colorBySize) {
            return c.colorByInsertSizePercentile.apply(null, arguments)
        } else if (track.config.colorByOrientation) {
            return c.colorByOrientation.apply(null, arguments)
        } else if (track.config.colorByMAPQ) {
            return c.colorByMAPQ.apply(null, arguments)
        } else {
            return c.colorByInsertSize.apply(null, arguments)
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
