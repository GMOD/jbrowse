define( [
    'JBrowse/Util'
],
function(Util) {

var c = {
    colorAlignment(feature, score, glyph, track) {
        var strand = feature.get('strand');
        if (Math.abs(strand) != 1 && strand != '+' && strand != '-') {
            return track.colorForBase('reference');
        } else if (track.config.colorByOrientationAndSize) {
            return c.colorByOrientationAndSize.apply(null, arguments)
        } else if (track.config.colorByOrientation) {
            return c.colorByOrientation.apply(null, arguments)
        } else if (track.config.colorBySize) {
            return c.colorByInsertSizePercentile.apply(null, arguments)
        } else if (track.config.useXS) {
            return c.colorByStrand(feature, feature.get('xs'), glyph, track)
        } else if (track.config.useTS) {
            return c.colorByStrand(feature, feature.get('ts'), glyph, track)
        }
        else if (feature.get('multi_segment_template')) {
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
    },

    colorByOrientation(feature, score, glyph, track)  {
        const type = Util.orientationTypes[track.config.orientationType]
        const orientation = type[feature.get('pair_orientation')]
        const map = {
            'LR': 'color_pair_lr',
            'RR': 'color_pair_rr',
            'RL': 'color_pair_rl',
            'LL': 'color_pair_ll'
        }
        return glyph.getStyle(feature, map[orientation] || 'color_nostrand')

    },

    colorByOrientationAndSize(feature, score, glyph, track)  {
        const p = c.getInsertDistancePercentile.apply(null, arguments)
        if(!p) {
            return c.colorByOrientation.apply(null, arguments)
        }
        return p
    },
    getInsertDistancePercentile(feature, score, glyph, track) {
        if (feature.get('is_paired')) {
            const len = Math.abs(feature.get('template_length'))
            if(feature.get('seq_id') != feature.get('next_seq_id')) {
                return glyph.getStyle(feature, 'color_interchrom')
            } else if (track.upperPercentile < len) {
                return glyph.getStyle(feature, 'color_longinsert')
            } else if (track.lowerPercentile > len) {
                return glyph.getStyle(feature, 'color_shortinsert')
            }
        }
        return null
    },
    colorByInsertDistancePercentile(feature, score, glyph, track) {
        return c.getInsertDistancePercentile.apply(null, arguments) || glyph.getStyle(feature, 'color_nostrand')
    },

    colorByInsertDistance(feature, score, glyph, track) {
        if (feature.get('is_paired') && feature.get('seq_id') != feature.get('next_seq_id')) {
            return glyph.getStyle(feature, 'color_interchrom')
        }

        return 'hsl(' + Math.abs(score / 10) + ',50%,50%)';
    },

    colorArcs(feature, score, glyph, track) {
        if (track.config.colorByOrientationAndSize) {
            return c.colorByOrientationAndSize.apply(null, arguments)
        } else if (track.config.colorBySizePercentile) {
            return c.colorByInsertDistancePercentile.apply(null, arguments)
        } else if (track.config.colorByOrientation) {
            return c.colorByOrientation.apply(null, arguments)
        } else {
            return c.colorByInsertDistance.apply(null, arguments)
        }
    },

    colorConnector(feature, score, glyph, track) {
        if (track.config.colorByOrientation) {
            return c.colorByOrientation(feature, score, glyph, track)
        } else {
            return 'black'
        }
    },

    colorByStrand(feature, strand, glyph, track) {
        var map = {
            '-': 'color_rev_strand',
            '+': 'color_fwd_strand'
        };
        return glyph.getStyle(feature, map[strand] || 'color_nostrand');
    }
};

return c;

});
