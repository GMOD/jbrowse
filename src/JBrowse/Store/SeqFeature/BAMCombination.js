define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'JBrowse/Store/SeqFeature/CombinationBase',
], function (declare, array, CombinationBaseStore) {
  return declare([CombinationBaseStore], {
    // An implementation of the CombinationBaseStore which works with BAM features.  Currently, the only supported option is
    // a straight concatenation of the features of two stores.

    // This combination store doesn't need to convert between spans and features, so these two functions are essentially irrelevant.
    createFeatures: function (spans) {
      return spans
    },

    toSpan: function (features, query) {
      return features.map(function (feat) {
        return Object.assign(Object.create(feat), feat)
      })
    },

    // Only one supported operation - array concatenation
    opSpan: function (op, span1, span2, query) {
      if (op == 'U') {
        this._appendStringToID(span1, 'L')
        this._appendStringToID(span2, 'R')
        return span1.concat(span2)
      }
      console.error('invalid operation')
      return undefined
    },

    _appendStringToID: function (objArray, string) {
      array.forEach(objArray, function (object) {
        var oldID = object.id
        if (typeof oldID == 'function') {
          object.id = function () {
            return oldID.call(object) + string
          }
        } else {
          object.id = oldID + string
        }
      })
      return objArray
    },
  })
})
