/**
 * Store that shows features defined in its `features` configuration
 * key, like:
 *   "features": [ { "seq_id": "ctgA", "start":1, "end":20 },
 *                 ...
 *               ]
 */

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Model/SimpleFeature',
], function (declare, array, SeqFeatureStore, SimpleFeature) {
  return declare(SeqFeatureStore, {
    constructor: function (args) {
      this.features = this._makeFeatures(this.config.features || [])
    },

    _makeFeatures: function (fdata) {
      var features = {}
      for (var i = 0; i < fdata.length; i++) {
        if (fdata[i]) {
          var f = this._makeFeature(fdata[i])
          var refName = this.browser.regularizeReferenceName(f.get('seq_id'))
          var refFeatures =
            features[refName] ||
            function () {
              return (features[refName] = [])
            }.call()
          refFeatures.push(f)
        }
      }
      return features
    },

    _parseInt: function (data) {
      array.forEach(['start', 'end', 'strand'], function (field) {
        if (field in data) data[field] = parseInt(data[field])
      })
      if ('score' in data) data.score = parseFloat(data.score)
      if ('subfeatures' in data)
        for (var i = 0; i < data.subfeatures.length; i++)
          this._parseInt(data.subfeatures[i])
    },

    _makeFeature: function (data, parent) {
      this._parseInt(data)
      return new SimpleFeature({ data: data, parent: parent })
    },

    getGlobalStats: function (cb, errorCb) {
      this.getRegionStats(
        {
          ref: this.refSeq.name,
          start: this.refSeq.start,
          end: this.refSeq.end,
        },
        cb,
        errorCb,
      )
    },

    getFeatures: function (query, featCallback, endCallback, errorCallback) {
      var start = query.start
      var end = query.end
      var features =
        this.features[this.browser.regularizeReferenceName(query.ref)] || {}
      for (var id in features) {
        var f = features[id]
        if (!(f.get('end') < start || f.get('start') > end)) {
          featCallback(f)
        }
      }
      endCallback()
    },
  })
})
