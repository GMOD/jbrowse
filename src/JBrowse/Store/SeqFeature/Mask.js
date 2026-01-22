define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/Deferred',
  'dojo/when',
  'dojo/promise/all',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Model/SimpleFeature',
  'JBrowse/Model/BinaryTreeNode',
  'JBrowse/Util',
], function (
  declare,
  array,
  Deferred,
  when,
  all,
  SeqFeatureStore,
  SimpleFeature,
  TreeNode,
  Util,
) {
  return declare([SeqFeatureStore], {
    // A store that takes in two feature stores (one of them set-based e.g. NCList) and uses the data from one store as a mask
    // for the other.  Although the design resembles those of combinationStores, differences are substantial enough that
    // this class does not derive from CombinationBase.

    constructor: function (args) {
      this.isCombinationStore = true
      this.inverse = args.inverse || false
      this.stores = {}

      if (args.mask && args.display) {
        this.reload(args.mask, args.display)
      }
    },

    // Loads an opTree (optionally), and a mask and display store.  Ensure all stores exist,
    // and build an operation tree for the benefit of combination tracks.
    reload: function (opTree, mask, display) {
      var inverse

      this.gotAllStores = new Deferred()
      if (opTree) {
        this.opTree = opTree
        this.inverse = inverse === undefined ? opTree.get() == 'N' : inverse
        this.stores.mask =
          opTree.leftChild && !mask ? opTree.leftChild.get() : mask
        this.stores.display =
          opTree.rightChild && !display ? opTree.rightChild.get() : display
        this.gotAllStores.resolve(true)
      } else {
        if (inverse !== undefined) {
          this.inverse = inverse
        }
        this.opTree = new TreeNode({ Value: this.inverse ? 'N' : 'M' })
        this.stores.mask = mask
        this.stores.display = display
        var thisB = this

        var grabStore = function (store) {
          var haveStore = new Deferred()
          if (typeof store == 'string') {
            thisB.browser.getStore(store, function (result) {
              if (result) {
                haveStore.resolve(result, true)
              } else {
                haveStore.reject(`store ${store} not found`)
              }
            })
          } else {
            haveStore.resolve(store, true)
          }
          return haveStore.promise
        }

        var haveMaskStore = grabStore(this.stores.mask).then(function (store) {
          thisB.stores.mask = store
        })
        var haveDisplayStore = grabStore(this.stores.display).then(
          function (store) {
            thisB.stores.display = store
          },
        )
        this.gotAllStores = all([haveMaskStore, haveDisplayStore])
        this.gotAllStores.then(function () {
          thisB.opTree.leftChild = thisB.stores.mask.isCombinationStore
            ? thisB.stores.mask.opTree
            : new TreeNode({ Value: thisB.stores.mask })
          thisB.opTree.rightChild = thisB.stores.display.isCombinationStore
            ? thisB.stores.display.opTree
            : new TreeNode({ Value: thisB.stores.display })
        })
      }
    },

    // The global stats of this store should be the same as those for the display data.
    getGlobalStats: function (callback, errorCallback) {
      this.stores.display.getGlobalStats(callback, errorCallback)
    },

    // The regional stats of this store should be the same as those for the display data.
    getRegionStats: function (query, callback, errorCallback) {
      this.stores.display.getRegionStats(query, callback, errorCallback)
    },

    // Gets the features from the mask and display stores, and then returns the display store features with the mask store features
    // added as masks
    getFeatures: function (query, featCallback, doneCallback, errorCallback) {
      var thisB = this

      this.gotAllStores.then(function () {
        var featureArray = {}

        // Get features from one particular store
        var grabFeats = function (key) {
          var d = new Deferred()
          featureArray[key] = []

          thisB.stores[key].getFeatures(
            query,
            function (feature) {
              featureArray[key].push(feature)
            },
            function () {
              d.resolve(true)
            },
            function () {
              d.reject(`failed to load features for ${key} store`)
            },
          )
          return d.promise
        }

        when(
          all([grabFeats('mask'), grabFeats('display')]),
          function () {
            // Convert mask features into simplified spans
            var spans = thisB.toSpans(featureArray.mask, query)
            // invert masking spans if necessary
            spans = thisB.inverse ? thisB.notSpan(spans, query) : spans
            var features = featureArray.display

            thisB.maskFeatures(features, spans, featCallback, doneCallback)
          },
          errorCallback,
        )
      }, errorCallback)
    },

    // given a feature or pseudo-feature, returns true if the feature
    // overlaps the span. False otherwise.
    inSpan: function (feature, span) {
      if (!feature || !span) {
        console.error('invalid arguments to inSpan function')
      }
      return feature.get
        ? !(
            feature.get('start') >= span.end || feature.get('end') <= span.start
          )
        : !(feature.start >= span.end || feature.end <= span.start)
    },

    maskFeatures: function (features, spans, featCallback, doneCallback) {
      /* Pass features to the track's original featCallback, and pass spans to the doneCallback.
       * If the track has boolean support, the DoneCallback will use the spans to mask the features.
       * For glyph based tracks, the masks passed to each feature will be used to do masking.
       */
      for (var key in features) {
        if (features.hasOwnProperty(key)) {
          var feat = features[key]
          delete feat.masks
          for (var span in spans) {
            if (spans.hasOwnProperty(span) && this.inSpan(feat, spans[span])) {
              // add masks to the feature. Used by Glyphs to do masking.
              feat.masks = feat.masks
                ? feat.masks.concat([spans[span]])
                : [spans[span]]
            }
          }
          featCallback(features[key])
        }
      }
      doneCallback({ maskingSpans: spans })
    },

    notSpan: function (spans, query) {
      // creates the complement spans of the input spans
      var invSpan = []
      invSpan[0] = { start: query.start }
      var i = 0
      for (var span in spans) {
        if (spans.hasOwnProperty(span)) {
          span = spans[span]
          invSpan[i].end = span.start
          i++
          invSpan[i] = { start: span.end }
        }
      }
      invSpan[i].end = query.end
      if (invSpan[i].end <= invSpan[i].start) {
        invSpan.splice(i, 1)
      }
      if (invSpan[0].end <= invSpan[0].start) {
        invSpan.splice(0, 1)
      }
      return invSpan
    },

    toSpans: function (features, query) {
      // given a set of features, takes the "union" of them and outputs a single set of nonoverlapping spans
      var spans = []
      for (var feature in features) {
        if (features.hasOwnProperty(feature)) {
          spans.push({
            start: features[feature].get('start'), //Math.max( features[feature].get('start'), query.start ),
            end: features[feature].get('end'), //Math.min( features[feature].get('end'),   query.end   )
          })
        }
      }

      if (!spans.length) {
        return []
      }
      spans.sort(function (a, b) {
        return a.start - b.start
      })

      var retSpans = []
      var i = 0
      while (i < spans.length) {
        var start = spans[i].start
        var end = spans[i].end
        while (i < spans.length && spans[i].start <= end) {
          end = Math.max(end, spans[i].end)
          i++
        }
        retSpans.push({ start: start, end: end })
      }
      return retSpans
    },
  })
})
