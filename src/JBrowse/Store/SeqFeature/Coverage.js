/**
 * Store class that encapsulates another store, and synthesizes
 * quantitative features that give the depth of coverage for the
 * features in it.
 */

define([
  'dojo/_base/declare',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Util',
  'JBrowse/Model/CoverageFeature',
], function (declare, SeqFeatureStore, Util, CoverageFeature) {
  return declare(SeqFeatureStore, {
    constructor: function (args) {
      this.store = args.store
    },

    getGlobalStats: function (callback, errorCallback) {
      callback({})
    },

    getFeatures: function (
      query,
      featureCallback,
      finishCallback,
      errorCallback,
    ) {
      var leftBase = query.start
      var rightBase = query.end
      var scale =
        query.scale || ('basesPerSpan' in query ? 1 / query.basesPerSpan : 10) // px/bp
      var widthBp = rightBase - leftBase
      var widthPx = widthBp * scale

      var binWidth = Math.ceil(1 / scale) // in bp

      var coverageBins = new Array(Math.ceil(widthBp / binWidth))
      var binOverlap = function (bp, isRightEnd) {
        var binCoord = (bp - leftBase - 1) / binWidth
        var binNumber = Math.floor(binCoord)
        var overlap = isRightEnd
          ? 1 - (binCoord - binNumber)
          : binCoord - binNumber
        return {
          bin: binNumber,
          overlap: overlap, // between 0 and 1: proportion of this bin that the feature overlaps
        }
      }

      this.store.getFeatures(
        query,
        function (feature) {
          var startBO = binOverlap(feature.get('start'), false)
          var endBO = binOverlap(feature.get('end'), true)

          // increment start and end partial-overlap bins by proportion of overlap
          if (startBO.bin == endBO.bin) {
            coverageBins[startBO.bin] =
              (coverageBins[startBO.bin] || 0) +
              endBO.overlap +
              startBO.overlap -
              1
          } else {
            coverageBins[startBO.bin] =
              (coverageBins[startBO.bin] || 0) + startBO.overlap
            coverageBins[endBO.bin] =
              (coverageBins[endBO.bin] || 0) + endBO.overlap
          }

          // increment completely overlapped interior bins by 1
          for (var i = startBO.bin + 1; i <= endBO.bin - 1; i++) {
            coverageBins[i] = (coverageBins[i] || 0) + 1
          }
        },
        function () {
          // make fake features from the coverage
          for (var i = 0; i < coverageBins.length; i++) {
            var score = coverageBins[i] || 0
            var bpOffset = leftBase + binWidth * i
            featureCallback(
              new CoverageFeature({
                start: bpOffset,
                end: bpOffset + binWidth,
                score: score,
              }),
            )
          }
          finishCallback()
        },
        errorCallback,
      )
    },
  })
})
