/**
 * Mixin that adds getRegionFeatureDensities method to a store
 */

define(['dojo/_base/declare'], function (declare) {
  return declare(null, {
    getRegionFeatureDensities(query, successCallback, errorCallback) {
      let numBins
      let basesPerBin

      this.scoreMax = this.scoreMax || 0

      if (query.numBins) {
        numBins = query.numBins
        basesPerBin = (query.end - query.start) / numBins
      } else if (query.basesPerBin) {
        basesPerBin = query.basesPerBin || query.ref.basesPerBin
        numBins = Math.ceil((query.end - query.start) / basesPerBin)
      } else {
        throw new Error(
          'numBins or basesPerBin arg required for getRegionFeatureDensities',
        )
      }

      const statEntry = (function (basesPerBin, stats) {
        for (var i = 0; i < stats.length; i++) {
          if (stats[i].basesPerBin >= basesPerBin) {
            return stats[i]
          }
        }
        return undefined
      })(basesPerBin, [])

      const stats = {}
      stats.basesPerBin = basesPerBin

      stats.max = 0
      const firstServerBin = Math.floor(query.start / basesPerBin)
      const histogram = []
      const binRatio = 1 / basesPerBin

      let binStart
      let binEnd

      for (var bin = 0; bin < numBins; bin++) {
        histogram[bin] = 0
      }
      this._getFeatures(
        query,
        feature => {
          let binValue = Math.round(
            (feature.get('start') - query.start) * binRatio,
          )
          let binValueEnd = Math.round(
            (feature.get('end') - query.start) * binRatio,
          )
          for (let bin = binValue; bin <= binValueEnd; bin++) {
            if (bin >= 0 && bin < numBins) {
              histogram[bin] = (histogram[bin] || 0) + 1
              if (histogram[bin] > stats.max) {
                stats.max = histogram[bin]
                if (stats.max > this.scoreMax) {
                  this.scoreMax = stats.max
                }
              }
            }
          }
        },
        () => {
          stats.max = this.scoreMax
          successCallback({ bins: histogram, stats: stats })
        },
        errorCallback,
      )
    },
  })
})
