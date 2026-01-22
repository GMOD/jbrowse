/**
 * Standard filtering subroutines that operate on feature objects.
 */
define([], function () {
  return {
    plusStrand: function (feature) {
      var strand = feature.get('strand')
      if (strand == 1 || strand == '+') {
        return true
      } else {
        return false
      }
    },
    minusStrand: function (feature) {
      var strand = feature.get('strand')
      if (strand == -1 || strand == '-') {
        return true
      } else {
        return false
      }
    },
    all: function (feature) {
      return true
    },
    none: function (feature) {
      return false
    },
  }
})
