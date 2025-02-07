define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/request/xhr',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Store/DeferredFeaturesMixin',
  'JBrowse/Store/DeferredStatsMixin',
  'JBrowse/Util',
  'JBrowse/Model/ArrayRepr',
  'JBrowse/Store/NCList',
  'JBrowse/Store/LazyArray',
], function (
  declare,
  lang,
  Deferred,
  xhr,
  SeqFeatureStore,
  DeferredFeaturesMixin,
  DeferredStatsMixin,
  Util,
  ArrayRepr,
  GenericNCList,
  LazyArray,
) {
  /**
   * Implementation of SeqFeatureStore using nested containment
   * lists held in static files that are lazily fetched from the web
   * server.
   *
   * @class JBrowse.Store.SeqFeature.NCList
   * @extends SeqFeatureStore
   */

  var idfunc = function () {
    return this._uniqueID
  }
  var parentfunc = function () {
    return this._parent
  }
  var childrenfunc = function () {
    return this.get('subfeatures')
  }

  return declare(SeqFeatureStore, {
    constructor: function (args) {
      this.args = args

      this.baseUrl = args.baseUrl
      this.urlTemplates = { root: args.urlTemplate }

      this._deferred = {}
    },

    makeNCList: function () {
      return new GenericNCList()
    },

    loadNCList: function (refData, trackInfo, url) {
      refData.nclist.importExisting(
        trackInfo.intervals.nclist,
        refData.attrs,
        url,
        trackInfo.intervals.urlTemplate,
        trackInfo.intervals.lazyClass,
      )
    },

    getDataRoot: function (refName) {
      if (!this._deferred.root || this.curRefName != refName) {
        var d = (this._deferred.root = new Deferred())
        this.curRefName = refName

        var refData = {
          nclist: this.makeNCList(),
        }

        var url = this.resolveUrl(this._evalConf(this.urlTemplates.root), {
          refseq: refName,
        })

        // fetch the trackdata
        var thisB = this
        xhr
          .get(url, {
            handleAs: 'json',
            failOk: true,
            headers: {
              'X-Requested-With': null,
            },
          })
          .then(
            function (trackInfo, request) {
              //trackInfo = JSON.parse( trackInfo );
              thisB._handleTrackInfo(refData, trackInfo, url)
            },
            function (error) {
              if (Util.isElectron() || error.response.status == 404) {
                thisB._handleTrackInfo(refData, {}, url)
              } else if (error.response.status != 200) {
                thisB._failAllDeferred(
                  `Server returned an HTTP ${error.response.status} error`,
                )
              } else {
                thisB._failAllDeferred(error)
              }
            },
          )
      }
      return this._deferred.root
    },

    _handleTrackInfo: function (refData, trackInfo, url) {
      refData.stats = {
        featureCount: trackInfo.featureCount || 0,
        featureDensity: (trackInfo.featureCount || 0) / this.refSeq.length,
      }

      this.empty = !trackInfo.featureCount

      if (trackInfo.intervals) {
        refData.attrs = new ArrayRepr(trackInfo.intervals.classes)
        this.loadNCList(refData, trackInfo, url)
      }

      var histograms = trackInfo.histograms
      if (histograms && histograms.meta) {
        for (var i = 0; i < histograms.meta.length; i++) {
          histograms.meta[i].lazyArray = new LazyArray(
            histograms.meta[i].arrayParams,
            url,
          )
        }
        refData._histograms = histograms
      }

      this._deferred.root.resolve(refData)
    },

    getGlobalStats: function (successCallback, errorCallback) {
      return (
        this._deferred.root || this.getDataRoot(this.browser.refSeq.name)
      ).then(function (data) {
        successCallback(data.stats)
      }, errorCallback)
    },

    getRegionStats: function (query, successCallback, errorCallback) {
      this.getDataRoot(query.ref).then(function (data) {
        successCallback(data.stats)
      }, errorCallback)
    },

    getRegionFeatureDensities: function (
      query,
      successCallback,
      errorCallback,
    ) {
      this.getDataRoot(query.ref)
        .then(function (data) {
          var numBins, basesPerBin
          if (query.numBins) {
            numBins = query.numBins
            basesPerBin = (query.end - query.start) / numBins
          } else if (query.basesPerBin) {
            basesPerBin = query.basesPerBin
            numBins = Math.ceil((query.end - query.start) / basesPerBin)
          } else {
            throw new Error(
              'numBins or basesPerBin arg required for getRegionFeatureDensities',
            )
          }

          // pick the relevant entry in our pre-calculated stats
          var statEntry = (function (basesPerBin, stats) {
            for (var i = 0; i < stats.length; i++) {
              if (stats[i].basesPerBin >= basesPerBin) {
                return stats[i]
              }
            }
            return undefined
          })(basesPerBin, data._histograms.stats || [])

          // The histogramMeta array describes multiple levels of histogram detail,
          // going from the finest (smallest number of bases per bin) to the
          // coarsest (largest number of bases per bin).
          // We want to use coarsest histogramMeta that's at least as fine as the
          // one we're currently rendering.
          // TODO: take into account that the histogramMeta chosen here might not
          // fit neatly into the current histogram (e.g., if the current histogram
          // is at 50,000 bases/bin, and we have server histograms at 20,000
          // and 2,000 bases/bin, then we should choose the 2,000 histogramMeta
          // rather than the 20,000)
          var histogramMeta = data._histograms.meta[0]
          for (var i = 0; i < data._histograms.meta.length; i++) {
            if (basesPerBin >= data._histograms.meta[i].basesPerBin) {
              histogramMeta = data._histograms.meta[i]
            }
          }

          // number of bins in the server-supplied histogram for each current bin
          var binRatio = basesPerBin / ((histogramMeta || {}).basesPerBin || 1)

          // if the server-supplied histogram fits neatly into our requested
          if (
            binRatio > 0.9 &&
            Math.abs(binRatio - Math.round(binRatio)) < 0.0001
          ) {
            //console.log('server-supplied',query);
            // we can use the server-supplied counts
            var firstServerBin = Math.floor(
              query.start / histogramMeta.basesPerBin,
            )
            binRatio = Math.round(binRatio)
            var histogram = []
            for (var bin = 0; bin < numBins; bin++) {
              histogram[bin] = 0
            }

            histogramMeta.lazyArray.range(
              firstServerBin,
              firstServerBin + binRatio * numBins,
              function (i, val) {
                // this will count features that span the boundaries of
                // the original histogram multiple times, so it's not
                // perfectly quantitative.  Hopefully it's still useful, though.
                histogram[Math.floor((i - firstServerBin) / binRatio)] += val
              },
              function () {
                successCallback({
                  bins: histogram,
                  stats: statEntry,
                })
              },
            )
          } else {
            //console.log('make own',query);
            // make our own counts
            data.nclist.histogram.call(
              data.nclist,
              query.start,
              query.end,
              numBins,
              function (hist) {
                successCallback({
                  bins: hist,
                  stats: statEntry,
                })
              },
            )
          }
        })
        .catch(errorCallback)
    },

    getFeatures: function (
      query,
      origFeatCallback,
      finishCallback,
      errorCallback,
    ) {
      if (this.empty) {
        finishCallback()
        return
      }

      var thisB = this
      this.getDataRoot(query.ref).then(function (data) {
        thisB._getFeatures(
          data,
          query,
          origFeatCallback,
          finishCallback,
          errorCallback,
        )
      }, errorCallback)
    },

    _getFeatures: function (
      data,
      query,
      origFeatCallback,
      finishCallback,
      errorCallback,
    ) {
      var thisB = this
      var startBase = query.start
      var endBase = query.end
      var accessors = data.attrs.accessors(),
        /** @inner */
        featCallBack = function (feature, path) {
          // the unique ID is a stringification of the path in the
          // NCList where the feature lives; it's unique across the
          // top-level NCList (the top-level NCList covers a
          // track/chromosome combination)

          // only need to decorate a feature once
          if (!feature.decorated) {
            var uniqueID = path.join(',')
            thisB._decorate_feature(accessors, feature, uniqueID)
          }
          return origFeatCallback(feature)
        }

      data.nclist.iterate.call(
        data.nclist,
        startBase,
        endBase,
        featCallBack,
        finishCallback,
        errorCallback,
      )
    },

    // helper method to recursively add .get and .tags methods to a feature and its
    // subfeatures
    _decorate_feature: function (accessors, feature, id, parent) {
      feature.get = accessors.get
      // possibly include set method in decorations? not currently
      //    feature.set = accessors.set;
      feature.tags = accessors.tags
      feature._uniqueID = id
      feature.id = idfunc
      feature._parent = parent
      feature.parent = parentfunc
      feature.children = childrenfunc
      dojo.forEach(
        feature.get('subfeatures'),
        function (f, i) {
          this._decorate_feature(accessors, f, `${id}-${i}`, feature)
        },
        this,
      )
      feature.decorated = true
    },
  })
})
