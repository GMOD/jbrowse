/**
 * The scaling used for drawing a Wiggle track, which is the data's
 * origin.
 *
 * Has numeric attributes range, min, max, origin, and offset.
 */

define(['dojo/_base/lang', 'JBrowse/Util', 'JBrowse/Digest/Crc32'], function (
  lang,
  Util,
  Digest,
) {
  return Util.fastDeclare({
    // Returns a boolean value saying whether a stats object is needed
    // to calculate the scale for the given configuration.
    //
    // This is invokable either on the class (prototype) or on
    // the object itself, so does not use `this` in its implementation.
    needStats: function (config) {
      return !(
        'min_score' in config &&
        'max_score' in config &&
        config.bicolor_pivot != 'z_score' &&
        config.bicolor_pivot != 'mean' &&
        config.scale != 'z_score'
      )
    },

    constructor: function (config, stats) {
      var needStats = this.needStats(config)
      if (needStats && !stats) {
        throw 'No stats object provided, cannot calculate scale'
      }

      if (needStats && stats.scoreMin == stats.scoreMax) {
        stats = lang.mixin({}, stats)
        if (stats.scoreMin < 0) {
          stats.scoreMax = 0
        } else {
          stats.scoreMin = 0
        }
      }

      // if either autoscale or scale is set to z_score, the other one should default to z_score
      if (
        (config.autoscale == 'z_score' && !config.scale) ||
        (config.scale == 'z_score' && !config.autoscale)
      ) {
        config.scale = 'z_score'
        config.autoscale = 'z_score'
      }

      var z_score_bound = parseFloat(config.z_score_bound) || 4
      var min =
        'min_score' in config
          ? parseFloat(config.min_score)
          : (function () {
              switch (config.autoscale) {
                case 'z_score':
                  return Math.max(
                    -z_score_bound,
                    (stats.scoreMin - stats.scoreMean) / stats.scoreStdDev,
                  )
                case 'global':
                case 'local':
                  return stats.scoreMin
                case 'clipped_global':
                /* fall through */
                default:
                  return Math.max(
                    stats.scoreMin,
                    stats.scoreMean - z_score_bound * stats.scoreStdDev,
                  )
              }
            })()
      var max =
        'max_score' in config
          ? parseFloat(config.max_score)
          : (function () {
              switch (config.autoscale) {
                case 'z_score':
                  return Math.min(
                    z_score_bound,
                    (stats.scoreMax - stats.scoreMean) / stats.scoreStdDev,
                  )
                case 'global':
                case 'local':
                  return stats.scoreMax
                case 'clipped_global':
                /* fall through */
                default:
                  return Math.min(
                    stats.scoreMax,
                    stats.scoreMean + z_score_bound * stats.scoreStdDev,
                  )
              }
            })()

      if (typeof min != 'number' || isNaN(min)) {
        min = 0
      }
      if (typeof max != 'number' || isNaN(max)) {
        max = min + 10
      }

      var offset = parseFloat(config.data_offset) || 0

      if (config.scale == 'log') {
        max = this.log(max + offset)
        min = this.log(min + offset)
      } else {
        max += offset
        min += offset
      }

      var origin = (function () {
        if ('bicolor_pivot' in config) {
          if (config.bicolor_pivot == 'mean') {
            return stats.scoreMean || 0
          } else if (config.bicolor_pivot == 'zero') {
            return 0
          } else {
            return parseFloat(config.bicolor_pivot)
          }
        } else if (config.scale == 'z_score') {
          return stats.scoreMean || 0
        } else if (config.scale == 'log') {
          return 1
        } else {
          return 0
        }
      })()

      lang.mixin(this, {
        offset: offset,
        min: min,
        max: max,
        range: max - min,
        origin: origin,
        _statsFingerprint: Digest.objectFingerprint(stats),
      })
      if (needStats) {
        this.scoreMean = stats.scoreMean
        this.scoreStdDev = stats.scoreStdDev
      }

      // make this.normalize a func that converts wiggle values to a
      // range between 0 and 1, depending on what kind of scale we
      // are using
      this.normalize = (function (config) {
        switch (config.scale) {
          case 'z_score':
            return function (value) {
              return (
                (value + this.offset - this.scoreMean) / this.scoreStdDev -
                this.min / this.range
              )
            }
          case 'log':
            return function (value) {
              return (this.log(value + this.offset) - this.min) / this.range
            }
          case 'linear':
          /* fall through */
          default:
            return function (value) {
              return (value + this.offset - this.min) / this.range
            }
        }
      })(config)
    },

    log: function (value) {
      return value ? Math.log(Math.abs(value)) * (value < 0 ? -1 : 1) : 0
    },

    /**
     * Standard comparison function, compare this scale to another one.
     */
    compare: function (b) {
      if (!b) {
        return 1
      }

      var a = this
      return (
        a.offset - b.offset ||
        a.min - b.min ||
        a.max - b.max ||
        a.range - b.range ||
        a.origin - b.origin
      )
    },

    /**
     * Return true if this scaling was generated from the same set of stats.
     */
    sameStats: function (stats) {
      return this._statsFingerprint == Digest.objectFingerprint(stats)
    },
  })
})
