define( [
    'JBrowse/Util'
],
function(Util) {

var PairUtils = {
    colorAlignment( feature, path, glyph, track ) {
        var strand = feature.get('strand');
        if (Math.abs(strand) != 1 && strand != '+' && strand != '-') {
            return track.colorForBase('reference');
        }
        else if (track.config.colorByOrientation) {
            if (track.upperPercentile < Math.abs(feature.get('template_length'))) {
                return 'red'
            } else if (track.lowerPercentile > Math.abs(feature.get('template_length'))) {
                return 'pink'
            }
            const type = Util.orientationTypes[track.config.orientationType]
            const orientation = type[feature.get('pair_orientation')]
            const map = {
                'LR': 'color_pair_lr',
                'RR': 'color_pair_rr',
                'RL': 'color_pair_rl',
                'LL': 'color_pair_ll'
            };
            return glyph.getStyle(feature, map[orientation] || 'color_nostrand');
        }
        else if (track.config.useXS) {
            var xs = feature.get('xs')
            var strand = {
                '-':'color_rev_strand',
                '+':'color_fwd_strand'
            };
            if (!strand[xs]) {
                strand = 'color_nostrand';
            }
            return glyph.getStyle(feature, strand[xs]);
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
    colorAlignmentArc( feature, score, glyph, track ) {
         if (track.config.colorByOrientation) {
            if (track.upperPercentile < Math.abs(feature.get('template_length'))) {
                return 'red'
            } else if (track.lowerPercentile > Math.abs(feature.get('template_length'))) {
                return 'pink'
            }
            const type = Util.orientationTypes[track.config.orientationType]
            const orientation = type[feature.get('pair_orientation')]
            const map = {
                'LR': 'color_pair_lr',
                'RR': 'color_pair_rr',
                'RL': 'color_pair_rl',
                'LL': 'color_pair_ll'
            };
            return glyph.getStyle(feature, map[orientation] || 'color_nostrand');
        }

        return 'hsl(' + Math.abs(score / 10) + ',50%,50%)';
    }
};

return PairUtils;

});
