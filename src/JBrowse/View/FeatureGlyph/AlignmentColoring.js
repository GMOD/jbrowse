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
        var strand = feature.get('strand');
        if (Math.abs(strand) != 1 && strand != '+' && strand != '-') {
            return track.colorForBase('reference');
        } else if (track.config.defaultColor||track.config.useReverseTemplate) {
            if(feature.get('multi_segment_template')) {
                var revflag = feature.get('multi_segment_first');
                if (feature.get('multi_segment_all_correctly_aligned')) {
                    if (revflag || !track.config.useReverseTemplate) {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_strand' )
                              : glyph.getStyle( feature, 'color_rev_strand' );
                    } else {
                        return strand == 1 || strand == '+'
                            ? glyph.getStyle( feature, 'color_rev_strand' )
                            : glyph.getStyle( feature, 'color_fwd_strand' );
                    }
                }
                if (feature.get('multi_segment_next_segment_unmapped')) {
                    if (revflag || !track.config.useReverseTemplate) {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_missing_mate' )
                              : glyph.getStyle( feature, 'color_rev_missing_mate' );
                    } else{
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_rev_missing_mate' )
                              : glyph.getStyle( feature, 'color_fwd_missing_mate' );
                    }
                }
                if (feature.get('seq_id') == feature.get('next_seq_id')) {
                    if (revflag || !track.config.useReverseTemplate) {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_strand_not_proper' )
                              : glyph.getStyle( feature, 'color_rev_strand_not_proper' );
                    } else {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_rev_strand_not_proper' )
                              : glyph.getStyle( feature, 'color_fwd_strand_not_proper' );
                    }
                }
                // should only leave aberrant chr
                return strand == 1 || strand == '+'
                        ? glyph.getStyle( feature, 'color_fwd_diff_chr' )
                        : glyph.getStyle( feature, 'color_rev_diff_chr' );
            }
            return strand == 1 || strand == '+'
                  ? glyph.getStyle( feature, 'color_fwd_strand' )
                  : glyph.getStyle( feature, 'color_rev_strand' );
        }
        else return glyph.getStyle( feature, 'color_nostrand' )
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
