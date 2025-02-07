define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/Deferred',
  'JBrowse/Model/SimpleFeature',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Store/DeferredFeaturesMixin',
  'JBrowse/Store/DeferredStatsMixin',
  'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
  'JBrowse/Store/SeqFeature/RegionStatsMixin',
  'JBrowse/Model/XHRBlob',
  './BED/Parser',
], function (
  declare,
  lang,
  array,
  Deferred,
  SimpleFeature,
  SeqFeatureStore,
  DeferredFeatures,
  DeferredStats,
  GlobalStatsEstimationMixin,
  RegionStatsMixin,
  XHRBlob,
  Parser,
) {
  return declare(
    [
      SeqFeatureStore,
      DeferredFeatures,
      DeferredStats,
      GlobalStatsEstimationMixin,
      RegionStatsMixin,
    ],

    /**
     * @lends JBrowse.Store.SeqFeature.BED
     */
    {
      constructor: function (args) {
        this.data =
          args.blob ||
          new XHRBlob(this.resolveUrl(this._evalConf(args.urlTemplate)))
        this.features = []
        this._loadFeatures()
      },

      _loadFeatures: function () {
        var thisB = this
        var features = (this.bareFeatures = [])

        var featuresSorted = true
        var seenRefs = (this.refSeqs = {})
        var parser = new Parser({
          featureCallback: function (fs) {
            array.forEach(fs, function (feature) {
              var prevFeature = features[features.length - 1]
              var regRefName = thisB.browser.regularizeReferenceName(
                feature.seq_id,
              )
              if (
                regRefName in seenRefs &&
                prevFeature &&
                prevFeature.seq_id != feature.seq_id
              ) {
                featuresSorted = false
              }
              if (
                prevFeature &&
                prevFeature.seq_id == feature.seq_id &&
                feature.start < prevFeature.start
              ) {
                featuresSorted = false
              }

              if (!(regRefName in seenRefs)) {
                seenRefs[regRefName] = features.length
              }

              if (thisB.config.featureCallback) {
                features.push(thisB.config.featureCallback(feature, thisB))
              } else {
                features.push(feature)
              }
            })
          },
          endCallback: function () {
            if (!featuresSorted) {
              features.sort(thisB._compareFeatureData)
              // need to rebuild the refseq index if changing the sort order
              thisB._rebuildRefSeqs(features)
            }

            thisB._estimateGlobalStats().then(function (stats) {
              thisB.globalStats = stats
              thisB._deferred.stats.resolve()
            })

            thisB._deferred.features.resolve(features)
          },
          commentCallback: this.config.commentCallback || function (i) {},
          store: this,
        })

        var fail = lang.hitch(this, '_failAllDeferred')
        // parse the whole file and store it
        this.data.fetchLines(
          function (line) {
            try {
              parser.addLine(line)
            } catch (e) {
              fail('Error parsing BED.')
              throw e
            }
          },
          lang.hitch(parser, 'finish'),
          fail,
        )
      },

      _rebuildRefSeqs: function (features) {
        var refs = {}
        for (var i = 0; i < features.length; i++) {
          var regRefName = this.browser.regularizeReferenceName(
            features[i].seq_id,
          )

          if (!(regRefName in refs)) {
            refs[regRefName] = i
          }
        }
        this.refSeqs = refs
      },

      _compareFeatureData: function (a, b) {
        if (a.seq_id < b.seq_id) {
          return -1
        } else if (a.seq_id > b.seq_id) {
          return 1
        }

        return a.start - b.start
      },

      _getFeatures: function (
        query,
        featureCallback,
        finishedCallback,
        errorCallback,
      ) {
        var thisB = this
        thisB._deferred.features.then(function () {
          thisB._search(query, featureCallback, finishedCallback, errorCallback)
        })
      },

      _search: function (
        query,
        featureCallback,
        finishCallback,
        errorCallback,
      ) {
        // search in this.features, which are sorted
        // by ref and start coordinate, to find the beginning of the
        // relevant range
        var bare = this.bareFeatures
        var converted = this.features

        var refName = this.browser.regularizeReferenceName(query.ref)

        var i = this.refSeqs[refName]
        if (!(i >= 0)) {
          finishCallback()
          return
        }

        var checkEnd =
          'start' in query
            ? function (f) {
                return f.get('end') >= query.start
              }
            : function () {
                return true
              }

        for (; i < bare.length; i++) {
          // lazily convert the bare feature data to JBrowse features
          var f =
            converted[i] ||
            (converted[i] = function (b, i) {
              bare[i] = false
              return this._formatFeature(b, i)
            }.call(this, bare[i], i))
          // features are sorted by ref seq and start coord, so we
          // can stop if we are past the ref seq or the end of the
          // query region
          if (f._reg_seq_id != refName || f.get('start') > query.end) {
            break
          }

          if (checkEnd(f)) {
            this.applyFeatureTransforms([f]).forEach(featureCallback)
          }
        }

        finishCallback()
      },

      supportsFeatureTransforms: true,

      _formatFeature: function (data, i) {
        var f = new SimpleFeature({
          data: data,
          id:
            data.seq_id +
            '_' +
            data.start +
            '_' +
            data.end +
            '_' +
            data.name +
            '_' +
            i,
        })
        f._reg_seq_id = this.browser.regularizeReferenceName(data.seq_id)
        return f
      },

      saveStore: function () {
        return {
          urlTemplate: this.config.blob.url,
        }
      },
    },
  )
})
