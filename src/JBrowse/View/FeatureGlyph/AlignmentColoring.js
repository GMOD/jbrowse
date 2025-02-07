define(['JBrowse/Util'], function (Util) {
  var c = {
    colorAlignment(feature, score, glyph, track) {
      var strand = feature.get('strand')
      if (Math.abs(strand) != 1 && strand != '+' && strand != '-') {
        return track.colorForBase('reference')
      } else if (track.config.colorByOrientationAndSize) {
        return c.colorByOrientationAndSize.apply(null, arguments)
      } else if (track.config.colorByOrientation) {
        return c.colorByOrientation.apply(null, arguments)
      } else if (track.config.colorBySize) {
        return c.colorByInsertSizePercentile.apply(null, arguments)
      } else if (track.config.useXS) {
        return c.colorByXS.apply(null, arguments)
      } else if (track.config.useTS) {
        return c.colorByTS.apply(null, arguments)
      } else if (track.config.colorByMAPQ) {
        return c.colorByMAPQ.apply(null, arguments)
      } else if (track.config.defaultColor || track.config.useReverseTemplate) {
        if (feature.get('multi_segment_template')) {
          var revflag = feature.get('multi_segment_first')
          if (feature.get('multi_segment_all_correctly_aligned')) {
            if (revflag || !track.config.useReverseTemplate) {
              return strand == 1 || strand == '+'
                ? glyph.getStyle(feature, 'color_fwd_strand')
                : glyph.getStyle(feature, 'color_rev_strand')
            } else {
              return strand == 1 || strand == '+'
                ? glyph.getStyle(feature, 'color_rev_strand')
                : glyph.getStyle(feature, 'color_fwd_strand')
            }
          }
          if (feature.get('multi_segment_next_segment_unmapped')) {
            if (revflag || !track.config.useReverseTemplate) {
              return strand == 1 || strand == '+'
                ? glyph.getStyle(feature, 'color_fwd_missing_mate')
                : glyph.getStyle(feature, 'color_rev_missing_mate')
            } else {
              return strand == 1 || strand == '+'
                ? glyph.getStyle(feature, 'color_rev_missing_mate')
                : glyph.getStyle(feature, 'color_fwd_missing_mate')
            }
          }
          if (feature.get('seq_id') == feature.get('next_seq_id')) {
            if (revflag || !track.config.useReverseTemplate) {
              return strand == 1 || strand == '+'
                ? glyph.getStyle(feature, 'color_fwd_strand_not_proper')
                : glyph.getStyle(feature, 'color_rev_strand_not_proper')
            } else {
              return strand == 1 || strand == '+'
                ? glyph.getStyle(feature, 'color_rev_strand_not_proper')
                : glyph.getStyle(feature, 'color_fwd_strand_not_proper')
            }
          }
          // should only leave aberrant chr
          return strand == 1 || strand == '+'
            ? glyph.getStyle(feature, 'color_fwd_diff_chr')
            : glyph.getStyle(feature, 'color_rev_diff_chr')
        }
        return strand == 1 || strand == '+'
          ? glyph.getStyle(feature, 'color_fwd_strand')
          : glyph.getStyle(feature, 'color_rev_strand')
      } else {
        return glyph.getStyle(feature, 'color_nostrand')
      }
    },

    getOrientation(feature, score, glyph, track) {
      const type = Util.orientationTypes[track.config.orientationType]
      const orientation = type[feature.get('pair_orientation')]
      const map = {
        LR: 'color_pair_lr',
        RR: 'color_pair_rr',
        RL: 'color_pair_rl',
        LL: 'color_pair_ll',
      }
      return map[orientation]
    },

    colorByOrientation(feature, score, glyph, track) {
      const p = c.getOrientation.apply(null, arguments)
      return glyph.getStyle(feature, p || 'color_nostrand')
    },

    colorByOrientationAndSize(feature, score, glyph, track) {
      const p = c.getInsertSizePercentile.apply(null, arguments)
      if (!p) {
        return c.colorByOrientation.apply(null, arguments)
      }
      return glyph.getStyle(feature, p)
    },
    getInsertSizePercentile(feature, score, glyph, track) {
      if (feature.get('is_paired')) {
        const len = Math.abs(feature.get('template_length'))
        if (feature.get('seq_id') != feature.get('next_seq_id')) {
          return 'color_interchrom'
        } else if (track.insertSizeStats.upper < len) {
          return 'color_longinsert'
        } else if (track.insertSizeStats.lower > len) {
          return 'color_shortinsert'
        }
      }
      return null
    },
    colorByInsertSizePercentile(feature, score, glyph, track) {
      const p = c.getInsertSizePercentile.apply(null, arguments)
      return glyph.getStyle(feature, p || 'color_nostrand')
    },

    colorByInsertSize(feature, score, glyph, track) {
      if (
        feature.get('is_paired') &&
        feature.get('seq_id') != feature.get('next_seq_id')
      ) {
        return glyph.getStyle(feature, 'color_interchrom')
      }
      const s = Math.abs(score / 10)
      return `hsl(${s},50%,50%)`
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
      if (track.config.colorByOrientation) {
        return c.colorByOrientation.apply(null, arguments)
      } else if (track.config.colorByOrientationAndSize) {
        return c.colorByOrientationAndSize.apply(null, arguments)
      } else {
        return 'black'
      }
    },

    colorByXS(feature, score, glyph, track) {
      const map = {
        '-': 'color_rev_strand',
        '+': 'color_fwd_strand',
      }
      return glyph.getStyle(
        feature,
        map[
          feature.get('xs') ||
            feature.get('ts') ||
            feature.get('tags').XS ||
            feature.get('tags').TS
        ] || 'color_nostrand',
      )
    },

    // TS is flipped from XS
    colorByTS(feature, score, glyph, track) {
      const map = {
        '-':
          feature.get('strand') === -1
            ? 'color_fwd_strand'
            : 'color_rev_strand',
        '+':
          feature.get('strand') === -1
            ? 'color_rev_strand'
            : 'color_fwd_strand',
      }
      return glyph.getStyle(
        feature,
        map[feature.get('ts') || feature.get('tags').TS] || 'color_nostrand',
      )
    },

    // assumes score cap at 60, which is used by bwa-mem and other tools. some cap at 37
    colorByMAPQ(feature, score, glyph, track) {
      const c = Math.min(feature.get('score') * 4, 200)
      return `rgb(${c},${c},${c})`
    },
  }

  return c
})
