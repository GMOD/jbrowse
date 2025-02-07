/**
 * Mixin that dynamically defines and redefines a filterFeature()
 * method, and supports a filtering hierarchy, and filter chaining at
 * each level of the hierarchy.  Designed to be really fast, because
 * filterFeature() is going to be called many, many times.
 */
define(['dojo/_base/declare', 'dojo/_base/array'], function (declare, array) {
  var serialNumber = 0

  return declare(null, {
    filterFeature: function (feature) {
      return true
    },

    _featureFilterChain: [],

    addFeatureFilter: function (filter, uniqName) {
      uniqName = this._getFeatureFilterName(uniqName)
      this._featureFilterChain.push({ name: uniqName, filter: filter })
      this._buildFeatureFilter()
      return uniqName
    },

    // need to have a unique name for every function we're passed so
    // that we can tell them apart.  stringification and strict
    // equality don't always work.
    _getFeatureFilterName: function (uniqName) {
      if (uniqName === undefined) {
        return `featureFilter_${++serialNumber}`
      }
      return uniqName
    },

    removeFeatureFilter: function (uniqName) {
      var newchain = []
      for (var i = 0; i < this._featureFilterChain.length; i++) {
        if (this._featureFilterChain[i].name !== uniqName) {
          newchain.push(this._featureFilterChain[i])
        }
      }
      this._featureFilterChain = newchain
      this._buildFeatureFilter()
    },

    _buildFeatureFilter: function () {
      var filterChain = this._featureFilterChain.slice()

      if (!filterChain.length) {
        this.filterFeature = function (feat) {
          return this.featureFilterParentComponent.filterFeature(feat)
        }
      } else if (filterChain.length == 1) {
        var single = filterChain[0].filter
        this.filterFeature = function (feat) {
          return (
            single.call(this, feat) &&
            this.featureFilterParentComponent.filterFeature(feat)
          )
        }
      } else {
        this.filterFeature = function (feat) {
          for (var i = 0; i < filterChain.length; i++) {
            if (!filterChain[i].filter.call(this, feat)) {
              return false
            }
          }

          if (!this.featureFilterParentComponent.filterFeature(feat)) {
            return false
          }

          return true
        }
      }
    },

    featureFilterParentComponent: {
      filterFeature: function () {
        return true
      },
    },

    setFeatureFilter: function (filter, uniqName) {
      this._featureFilterChain = []
      this.addFeatureFilter(filter, uniqName)
    },

    clearFeatureFilter: function () {
      this._featureFilterChain = []
      this._buildFeatureFilter()
    },

    setFeatureFilterParentComponent: function (parent) {
      this.featureFilterParentComponent = parent
      this._buildFeatureFilter()
    },
  })
})
