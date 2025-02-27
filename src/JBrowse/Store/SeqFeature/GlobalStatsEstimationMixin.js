/**
 * Mixin that adds _estimateGlobalStats method to a store, which
 * samples a section of the features in the store and uses those to
 * esimate the statistics of the whole data set.
 */

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/Deferred',
  'JBrowse/Errors',
], function (declare, array, Deferred, Errors) {
  return declare(null, {
    /**
     * Fetch a region of the current reference sequence and use it to
     * estimate the feature density of the store.
     * @private
     */
    _estimateGlobalStats: function (refseq) {
      var deferred = new Deferred()

      refseq = refseq || this.refSeq
      var timeout = this.storeTimeout || 3000
      if (this.storeTimeout == 0) {
        deferred.resolve({
          featureDensity: 0,
          error: 'global stats estimation timed out',
        })
        return
      }

      var startTime = new Date()

      var statsFromInterval = function (length, callback) {
        var thisB = this
        var sampleCenter = refseq.start * 0.75 + refseq.end * 0.25
        var start = Math.max(0, Math.round(sampleCenter - length / 2))
        var end = Math.min(Math.round(sampleCenter + length / 2), refseq.end)
        var features = []
        //console.log(`${this.source} stats fetching ${refseq.name}:${start}..${end}`)
        this._getFeatures(
          { ref: refseq.name, start: start, end: end },
          function (f) {
            features.push(f)
          },
          function (error) {
            features = array.filter(features, function (f) {
              return f.get('start') >= start && f.get('end') <= end
            })
            const correctionFactor =
              (thisB.getConf('topLevelFeaturesPercent') || 100) / 100
            callback.call(thisB, length, {
              featureDensity: (features.length / length) * correctionFactor,
              _correctionFactor: correctionFactor,
              _statsSampleFeatures: features.length,
              _statsSampleInterval: {
                ref: refseq.name,
                start: start,
                end: end,
                length: length,
              },
            })
          },
          function (error) {
            callback.call(thisB, length, null, error)
          },
        )
      }

      var maybeRecordStats = function (interval, stats, error) {
        if (error) {
          if (error.isInstanceOf && error.isInstanceOf(Errors.DataOverflow)) {
            console.log(
              `Store statistics found chunkSizeLimit error, using empty: ${
                this.source || this.name
              }`,
            )
            deferred.resolve({
              featureDensity: 0,
              error: 'global stats estimation found chunkSizeError',
            })
          } else {
            deferred.reject(error)
          }
        } else {
          var refLen = refseq.end - refseq.start
          if (
            stats._statsSampleFeatures >= 300 ||
            interval * 2 > refLen ||
            error
          ) {
            console.log(`Store statistics: ${this.source || this.name}`, stats)
            deferred.resolve(stats)
          } else if (new Date() - startTime < timeout) {
            statsFromInterval.call(this, interval * 2, maybeRecordStats)
          } else {
            console.log(
              `Store statistics timed out: ${this.source || this.name}`,
            )
            deferred.resolve({
              featureDensity: 0,
              error: 'global stats estimation timed out',
            })
          }
        }
      }

      statsFromInterval.call(this, 100, maybeRecordStats)
      return deferred
    },
  })
})
