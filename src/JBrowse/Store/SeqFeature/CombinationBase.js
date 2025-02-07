define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/Deferred',
  'dojo/when',
  'dojo/promise/all',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Store/DeferredStatsMixin',
  'JBrowse/Store/DeferredFeaturesMixin',
  'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
  'JBrowse/Util',
  'JBrowse/Model/BinaryTreeNode',
], function (
  declare,
  array,
  Deferred,
  when,
  all,
  SeqFeatureStore,
  DeferredStatsMixin,
  DeferredFeaturesMixin,
  GlobalStatsEstimationMixin,
  Util,
  TreeNode,
) {
  // Helper object that wraps a feature and which store it comes from
  var featureWrapper = Util.fastDeclare({
    get: function (arg) {
      return this.feature.get(arg)
    },

    id: function () {
      return this.feature.id() + this.storeName
    },

    parent: function () {
      return this.feature.parent()
    },

    children: function () {
      return this.feature.children()
    },

    tags: function () {
      return this.feature.tags()
    },

    constructor: function (feat, storeName) {
      this.feature = feat
      this.storeName = storeName
      this.source = feat ? feat.source : undefined
    },
  })

  return declare(
    [
      SeqFeatureStore,
      DeferredFeaturesMixin,
      DeferredStatsMixin,
      GlobalStatsEstimationMixin,
    ],
    {
      // The base class for combination stores.  A combination store is one that pulls feature data from other stores
      // and combines it according to a binary tree of operations in order to produce new features.

      constructor: function (args) {
        // Objects can access this to know if a given store is a combination store of some kind
        this.isCombinationStore = true

        this.defaultOp = args.op

        // If constructed with an opTree already included, might as well try to get all the store info from that opTree.
        if (args.opTree) {
          this.reload(args.opTree)
        }
      },

      // Loads an operation tree (opTree).

      reload: function (optree) {
        this._deferred.features = new Deferred()
        this._deferred.stats = new Deferred()
        var refSeq

        // Load in opTree
        if (!optree) {
          optree = new TreeNode({ Value: this.defaultOp })
        }
        this.opTree = optree
        this.stores = optree.getLeaves() || []

        // If any of the stores doesn't have a name, then something weird is happening...
        for (var store in this.stores) {
          if (!this.stores[store].name) {
            this.stores = []
          }
        }
        var thisB = this

        this._deferred.features.resolve(true)
        delete this._regionStatsCache
        this._estimateGlobalStats().then(
          dojo.hitch(this, function (stats) {
            this.globalStats = stats
            this._deferred.stats.resolve({ success: true })
          }),
          dojo.hitch(this, '_failAllDeferred'),
        )
      },

      // Filters the featureArrays to return the list of features for the query, and then calls finish() to pass to the callback
      _getFeatures: function (
        query,
        featCallback,
        doneCallback,
        errorCallback,
      ) {
        var thisB = this
        if (this.stores.length == 1) {
          this.stores[0].getFeatures(
            query,
            featCallback,
            doneCallback,
            errorCallback,
          )
          return
        }

        if (this.regionLoaded) {
          var spans = array.filter(this.regionLoaded.spans, function (span) {
            return span.start <= query.end && span.end >= query.start
          })
          var features = this.createFeatures(spans)
          this.finish(features, spans, featCallback, doneCallback)
          return
        }

        // featureArrays will be a map from the names of the stores to an array of each store's features
        var featureArrays = {}

        // Generate map
        var fetchAllFeatures = thisB.stores.map(function (store) {
          var d = new Deferred()
          if (!featureArrays[store.name]) {
            featureArrays[store.name] = []
            store.getFeatures(
              query,
              dojo.hitch(this, function (feature) {
                var feat = new featureWrapper(feature, store.name)
                featureArrays[store.name].push(feat)
              }),
              function () {
                d.resolve(featureArrays[store.name])
              },
              function () {
                d.reject(`Error fetching features for store ${store.name}`)
              },
            )
          } else {
            d.resolve(featureArrays[store.name], true)
          }
          d.then(function () {}, errorCallback) // Makes sure that none of the rejected deferred promises keep propagating
          return d.promise
        })

        // Once we have all features, combine them according to the operation tree and create new features based on them.
        when(
          all(fetchAllFeatures),
          function () {
            // Create a set of spans based on the evaluation of the operation tree
            var spans = thisB.evalTree(featureArrays, thisB.opTree, query)
            var features = thisB.createFeatures(spans)
            thisB.finish(features, spans, featCallback, doneCallback)
          },
          errorCallback,
        )
      },

      // Evaluate (recursively) an operation tree to create a list of spans (essentially pseudo-features)
      evalTree: function (featureArrays, tree, query) {
        if (!tree) {
          return false
        } else if (tree.isLeaf()) {
          return this.toSpan(featureArrays[tree.get().name], query)
        } else if (!tree.hasLeft()) {
          return this.toSpan(featureArrays[tree.right().get().name], query)
        } else if (!tree.hasRight()) {
          return this.toSpan(featureArrays[tree.left().get().name], query)
        }
        return this.opSpan(
          tree.get(),
          this.evalTree(featureArrays, tree.left(), query),
          this.evalTree(featureArrays, tree.right(), query),
          query,
        )
      },

      // Passes the list of combined features to the getFeatures() callbacks
      finish: function (features, spans, featCallback, doneCallback) {
        /* Pass features to the track's original featCallback, and pass spans to the doneCallback.
         */
        for (var key in features) {
          if (features.hasOwnProperty(key)) {
            featCallback(features[key])
          }
        }
        doneCallback({ spans: spans })
      },

      // These last four functions are stubbed out because each derived class should have its own implementation of them.

      // Converts a list of spans into a list of features.
      createFeatures: function (spans) {},

      // Transforms a set of features into a set of spans
      toSpan: function (features, query) {},

      // Defines the various operations that may occur and assigns each to a span-making function.
      opSpan: function (op, span1, span2, query) {},
    },
  )
})
