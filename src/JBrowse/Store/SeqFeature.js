define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'JBrowse/Util',
  'JBrowse/Store',
  'JBrowse/Store/LRUCache',
], function (declare, lang, Util, Store, LRUCache) {
  /**
   * Base class for JBrowse data backends that hold sequences and
   * features.
   *
   * @class JBrowse.SeqFeatureStore
   * @extends JBrowse.Store
   * @constructor
   */

  return declare(Store, {
    constructor: function (args) {
      this.globalStats = {}
      this.storeTimeout = args.storeTimeout ? args.storeTimeout : 3000
      this._featureTransforms = args.featureTransforms || []

      // install general transform function if defined
      this._configureFeaturesTransforms()
    },

    _configureFeaturesTransforms: function () {
      let featureTransform = this.getConf('featureTransform')
      if (typeof featureTransform === 'string') {
        featureTransform = this.getPredefinedFeatureTransform(featureTransform)
      }

      if (featureTransform) {
        this.addFeatureTransform(featureTransform)
      }

      // install `config.topLevelFeatures` transform if necessary
      this._configureTopLevelFeaturesTransform()
    },

    /**
     * get a predefined feature transform function by name, or undef if no
     * transform by that name is defined
     * @param {string} name
     */
    getPredefinedFeatureTransform(name) {},

    /**
     * Get a metadata object, if one is available, for the
     * given feature tag name
     * @param {string} tagName
     * @returns {object} containing 'description' member, and optionally anything else
     */
    getTagMetadata(tagName) {},

    /**
     * If the `topLevelFeatures` configuration variable is set on this
     * store, creates and installs a feature transform function to
     * implement it.
     */
    _configureTopLevelFeaturesTransform: function () {
      const confVal = this.getConf('topLevelFeatures', [this])
      if (!confVal) return

      if (typeof confVal === 'function') {
        this._topLevelFeaturesTransform = confVal
      } else {
        let typesList
        if (Array.isArray(confVal)) {
          typesList = confVal
        } else if (typeof confVal === 'string') {
          typesList = confVal.trim().split(/\s*,\s*/)
        } else {
          throw new Error(
            'invalid topLevelFeatures configuration value',
            confVal,
          )
        }
        if (typesList.length) {
          this._topLevelFeatureTypes = typesList
          this._topLevelFeaturesTransform = features => {
            let resultFeatures = []
            features.forEach(feature => {
              resultFeatures.push(
                ...this._findSubfeaturesWithTypes(typesList, feature),
              )
            })
            return resultFeatures
          }
        }
      }

      if (this._topLevelFeaturesTransform) {
        try {
          this.addFeatureTransform(this._topLevelFeaturesTransform)
        } catch (e) {
          throw new Error(
            `store class ${this.getConf('type')} does not support topLevelFeatures configuration`,
          )
        }
      }
    },

    _isTopLevelFeatureType(featureType) {
      if (this._topLevelFeatureTypes) {
        return this._topLevelFeatureTypes.includes(featureType)
      } else if (this._topLevelFeaturesTransform) {
        throw new Error(
          'custom top-level feature transforms not supported in this use case',
        )
      }
      return true
    },

    _evalConf: function (confVal, confKey) {
      // evaluate callbacks as functions
      return typeof confVal == 'function' ? confVal.call(this, this) : confVal
    },

    /**
     * Fetch global statistics the features in this store.
     *
     * @param {Function} successCallback(stats) callback to receive the
     *   statistics.  called with one argument, an object containing
     *   attributes with various statistics.
     * @param {Function} errorCallback(error) in the event of an error, this
     *   callback will be called with one argument, which is anything
     *   that can stringify to an error message.
     */
    getGlobalStats: function (callback, errorCallback) {
      callback(this.globalStats || {})
    },

    /**
     * Fetch statistics about the features in a specific region.
     *
     * @param {String} query.ref    the name of the reference sequence
     * @param {Number} query.start  start of the region in interbase coordinates
     * @param {Number} query.end    end of the region in interbase coordinates
     * @param {Function} successCallback(stats) callback to receive the
     *   statistics.  called with one argument, an object containing
     *   attributes with various statistics.
     * @param {Function} errorCallback(error) in the event of an error, this
     *   callback will be called with one argument, which is anything
     *   that can stringify to an error message.
     */
    getRegionStats: function (query, successCallback, errorCallback) {
      return this._getRegionStats.apply(this, arguments)
    },

    _getRegionStats: function (query, successCallback, errorCallback) {
      var thisB = this
      var cache = (thisB._regionStatsCache =
        thisB._regionStatsCache ||
        new LRUCache({
          name: 'regionStatsCache',
          maxSize: 1000, // cache stats for up to 1000 different regions
          sizeFunction: function (stats) {
            return 1
          },
          fillCallback: function (query, callback) {
            //console.log( '_getRegionStats', query );
            var s = {
              scoreMax: -Infinity,
              scoreMin: Infinity,
              scoreSum: 0,
              scoreSumSquares: 0,
              basesCovered: query.end - query.start,
              featureCount: 0,
            }
            thisB.getFeatures(
              query,
              function (feature) {
                var score = feature.get('score') || 0
                s.scoreMax = Math.max(score, s.scoreMax)
                s.scoreMin = Math.min(score, s.scoreMin)
                s.scoreSum += score
                s.scoreSumSquares += score * score
                s.featureCount++
              },
              function () {
                s.scoreMean = s.featureCount ? s.scoreSum / s.featureCount : 0
                s.scoreStdDev = thisB._calcStdFromSums(
                  s.scoreSum,
                  s.scoreSumSquares,
                  s.featureCount,
                )
                s.featureDensity = s.featureCount / s.basesCovered
                //console.log( '_getRegionStats done', s );
                callback(s)
              },
              function (error) {
                callback(null, error)
              },
            )
          },
        }))

      cache.get(query, function (stats, error) {
        if (error) errorCallback(error)
        else successCallback(stats)
      })
    },

    // utility method that calculates standard deviation from sum and sum of squares
    _calcStdFromSums: function (sum, sumSquares, n) {
      if (n == 0) return 0

      var variance = sumSquares - (sum * sum) / n
      if (n > 1) {
        variance /= n - 1
      }
      return variance < 0 ? 0 : Math.sqrt(variance)
    },

    /**
     * Fetch feature data from this store.
     *
     * @param {String} query.ref    the name of the reference sequence
     * @param {Number} query.start  start of the region in interbase coordinates
     * @param {Number} query.end    end of the region in interbase coordinates
     * @param {Function} featureCallback(feature) callback that is called once
     *   for each feature in the region of interest, with a single
     *   argument; the feature.
     * @param {Function} endCallback() callback that is called once
     *   for each feature in the region of interest, with a single
     *   argument; the feature.
     * @param {Function} errorCallback(error) in the event of an error, this
     *   callback will be called with one argument, which is anything
     *   that can stringify to an error message.
     */
    getFeatures: function (query, featureCallback, endCallback, errorCallback) {
      endCallback()
    },

    /**
     * Add a transformation function to be applied to features read from the store.
     */
    addFeatureTransform: function (transformFunction) {
      if (!this.supportsFeatureTransforms)
        throw new Error(
          'store class ' +
            this.getConf('type') +
            ' does not support feature transforms',
        )
      this._featureTransforms.push(transformFunction)
    },

    /**
     * Apply all of this store's registered transform functions to the set of features
     * @param {Array[feature]} features
     */
    applyFeatureTransforms: function (features) {
      let resultFeatures = features
      this._featureTransforms.forEach(transformFunction => {
        resultFeatures = transformFunction.call(this, resultFeatures, this)
      })
      return resultFeatures
    },

    /**
     * Apply the topLevelFeatures configuration to possibly extract
     * subfeature from this feature, and run the given callback on
     * each of the new top-level features.
     *
     * @param {Array[SimpleFeature|LazyFeature|*]} features
     * @private
     */
    _applyTopLevelFeaturesTransform(features) {
      return Util.flattenOneLevel(
        features.map(feature => this._topLevelFeaturesTransform(feature)),
      )
    },

    /**
     * traverse the subfeature hierarchy of the given feature,
     * return an array of features whose types are in the given list
     * @param {Array[string]} types
     * @param {SimpleFeature|LazyFeature|*} feature
     * @private
     */
    _findSubfeaturesWithTypes(types, feature) {
      if (types.includes(feature.get('type'))) return [feature]
      else {
        let children = feature.children()
        if (children && children.length) {
          const matchingFeatures = []
          children.forEach(childFeature =>
            matchingFeatures.push(
              ...this._findSubfeaturesWithTypes(types, childFeature),
            ),
          )
          return matchingFeatures
        } else return []
      }
    },

    /**
     * Given a plain query object, call back with a single sequence
     * string that is the naively-assembled sequence for that region,
     * assembled from the 'residues' or 'seq' attributes of the
     * features that come back from the store.  Add
     * "reference_sequences_only: true" to the query it send to the
     * store.
     */
    getReferenceSequence: function (query, seqCallback, errorCallback) {
      // insert the `replacement` string into `str` at the given
      // `offset`, putting in `length` characters.
      function replaceAt(str, offset, replacement) {
        var rOffset = 0
        if (offset < 0) {
          rOffset = -offset
          offset = 0
        }

        var length = Math.min(str.length - offset, replacement.length - rOffset)

        return (
          str.substr(0, offset) +
          replacement.substr(rOffset, length) +
          str.substr(offset + length)
        )
      }

      // pad with spaces at the beginning of the string if necessary
      var len = query.end - query.start
      var sequence = ''
      while (sequence.length < len) sequence += ' '

      var thisB = this
      this.getFeatures(
        lang.mixin({ reference_sequences_only: true }, query),
        function (f) {
          var seq = f.get('residues') || f.get('seq')
          if (seq)
            sequence = replaceAt(sequence, f.get('start') - query.start, seq)
        },
        function () {
          seqCallback(sequence)
        },
        errorCallback,
      )
    },
    saveStore: function () {
      console.log('unimplemented')
    },
  })
})
