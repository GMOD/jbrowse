define([
  'dojo/_base/declare',
  'JBrowse/View/FeatureGlyph/PairedAlignment',
], function (declare, PairedAlignment) {
  return declare(PairedAlignment, {
    clearFeat(context, fRect) {
      /* do nothing since drawings overlap, overrides parent */
    },

    layoutFeature(viewArgs, layout, feature) {
      var rect = this.inherited(arguments)
      if (!rect) {
        return rect
      }

      if (feature.pairedFeature()) {
        const tlen = Math.abs(feature.read1.get('template_length'))

        let k
        if (this.track.config.readCloudLogScale) {
          // max is set to upper percentile because it can handle things above this value
          k =
            Math.log(tlen + 1) /
            Math.log(
              this.track.config.readCloudYScaleMax ||
                this.track.insertSizeStats.max + 1,
            )
          k /= 2 // squish by 2 means theres space above the maxHeight for things larger than the estimated insert size stats/readcloud max
        } else {
          // max set to literal max or a configurable readCloudYScaleMax
          k =
            tlen /
            (this.track.config.readCloudYScaleMax ||
              this.track.insertSizeStats.upper)
          k /= 3 // squish by 3 means theres space above the maxHeight for things larger than the estimated insert size stats, higher for linear
        }

        k *= this.track.config.maxHeight

        // use compact view for additional linear compression
        if (this.track.config.displayMode === 'compact') {
          k /= 4
        }

        rect.rect.t = k
        rect.t = k
      } else {
        rect.t = 0
        rect.rect.t = 0
      }

      return rect
    },
  })
})
