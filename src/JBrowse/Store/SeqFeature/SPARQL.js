define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/request/xhr',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Store/DeferredStatsMixin',
  'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
  'JBrowse/Util',
  'JBrowse/Model/SimpleFeature',
  'dojo/io-query',
], function (
  declare,
  lang,
  array,
  xhr,
  SeqFeatureStore,
  DeferredStatsMixin,
  GlobalStatsEstimationMixin,
  Util,
  SimpleFeature,
  ioQuery,
) {
  return declare(
    [SeqFeatureStore, DeferredStatsMixin, GlobalStatsEstimationMixin],

    /**
     * @lends JBrowse.Store.SeqFeature.SPARQL
     */
    {
      /**
       * JBrowse feature backend to retrieve features from a SPARQL endpoint.
       * @constructs
       */
      constructor: function (args) {
        this.url = this.urlTemplate
        this.refSeq = args.refSeq
        this.baseUrl = args.baseUrl
        this.density = 0
        this.url = Util.resolveUrl(
          this.baseUrl,
          Util.fillTemplate(args.urlTemplate, {
            refseq: this.refSeq.name,
          }),
        )
        this.queryTemplate = args.queryTemplate
        if (!this.queryTemplate) {
          console.error(
            'No queryTemplate set for SPARQL backend, no data will be displayed',
          )
        }

        var thisB = this
        this._estimateGlobalStats().then(
          function (stats) {
            thisB.globalStats = stats
            thisB._deferred.stats.resolve(stats)
          },
          lang.hitch(this, '_failAllDeferred'),
        )
      },

      // load: function() {
      //     // ping the endpoint to see if it's there
      //     dojo.xhrGet({ url: this.url+'?'+ioQuery.objectToQuery({ query: 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1' }),
      //                   handleAs: "text",
      //                   failOk: false,
      //                   load:  Util.debugHandler( this, function(o) { this.loadSuccess(o); }),
      //                   error: dojo.hitch( this, function(error) { this.loadFail(error, this.url); } )
      //     });
      // },

      _makeQuery: function (query) {
        if (this.config.variables)
          query = dojo.mixin(dojo.mixin({}, this.config.variables), query)

        return Util.fillTemplate(this.queryTemplate, query)
      },

      _getFeatures: function () {
        this.getFeatures.apply(this, arguments)
      },

      getFeatures: function (
        query,
        featCallback,
        finishCallback,
        errorCallback,
      ) {
        if (this.queryTemplate) {
          var thisB = this
          var headers = { Accept: 'application/json' }
          if (this.config.disablePreflight) {
            // https://www.sitepen.com/blog/2014/01/15/faq-cors-with-dojo/
            headers['X-Requested-With'] = null
          }

          xhr
            .get(
              this.url +
                '?' +
                ioQuery.objectToQuery({
                  query: this._makeQuery(query),
                }),
              {
                headers: headers,
                handleAs: 'json',
                failOk: true,
              },
            )
            .then(
              function (o) {
                thisB._resultsToFeatures(o, featCallback)
                finishCallback()
              },
              lang.hitch(this, '_failAllDeferred'),
            )
        } else {
          finishCallback()
        }
      },

      _resultsToFeatures: function (results, featCallback) {
        var rows = ((results || {}).results || {}).bindings || []
        if (!rows.length) return
        var fields = results.head.vars
        var requiredFields = ['start', 'end', 'strand', 'uniqueID']
        for (var i = 0; i < requiredFields.length; i++) {
          if (fields.indexOf(requiredFields[i]) == -1) {
            console.error(
              'Required field ' +
                requiredFields[i] +
                ' missing from feature data',
            )
            return
          }
        }
        var seenFeatures = {}
        array.forEach(
          rows,
          function (row) {
            var f = { data: { subfeatures: [] } }

            var data = f.data
            array.forEach(fields, function (field) {
              if (field in row) data[field] = row[field].value
            })
            data.start = parseInt(data.start)
            data.end = parseInt(data.end)
            data.strand = parseInt(data.strand)

            var id = data.uniqueID
            delete data.uniqueID
            f.id = id
            seenFeatures[id] = f
          },
          this,
        )

        // resolve subfeatures, keeping only top-level features in seenFeatures
        for (var id in seenFeatures) {
          var f = seenFeatures[id]
          var pid = f.data.parentUniqueID
          delete f.data.parentUniqueID
          if (pid) {
            var p = seenFeatures[pid]
            if (p) {
              p.data.subfeatures.push(f.data)
              delete seenFeatures[id]
            }
          }
        }

        for (var id in seenFeatures) {
          featCallback(new SimpleFeature(seenFeatures[id]))
        }
      },
    },
  )
})
