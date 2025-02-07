const { TabixIndexedFile } = cjsRequire('@gmod/tabix')

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'JBrowse/Errors',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Store/DeferredStatsMixin',
  'JBrowse/Store/DeferredFeaturesMixin',
  'JBrowse/Store/SeqFeature/IndexedStatsEstimationMixin',
  'JBrowse/Store/SeqFeature/RegionStatsMixin',
  'JBrowse/Model/BlobFilehandleWrapper',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Model/SimpleFeature',
  './BED/Parser',
], function (
  declare,
  lang,
  Errors,
  SeqFeatureStore,
  DeferredStatsMixin,
  DeferredFeaturesMixin,
  IndexedStatsEstimationMixin,
  RegionStatsMixin,
  BlobFilehandleWrapper,
  XHRBlob,
  SimpleFeature,
  Parser,
) {
  return declare(
    [
      SeqFeatureStore,
      DeferredStatsMixin,
      DeferredFeaturesMixin,
      IndexedStatsEstimationMixin,
      RegionStatsMixin,
    ],
    {
      constructor: function (args) {
        var thisB = this
        var csiBlob, tbiBlob

        if (args.csi || this.config.csiUrlTemplate) {
          csiBlob =
            args.csi ||
            new XHRBlob(this.resolveUrl(this.getConf('csiUrlTemplate', [])))
        } else {
          tbiBlob =
            args.tbi ||
            new XHRBlob(
              this.resolveUrl(
                this.getConf('tbiUrlTemplate', []) ||
                  this.getConf('urlTemplate', []) + '.tbi',
              ),
            )
        }

        var fileBlob =
          args.file ||
          new XHRBlob(this.resolveUrl(this.getConf('urlTemplate', [])), {
            expectRanges: true,
          })

        this.indexedData = new TabixIndexedFile({
          filehandle: new BlobFilehandleWrapper(fileBlob),
          tbiFilehandle: tbiBlob && new BlobFilehandleWrapper(tbiBlob),
          csiFilehandle: csiBlob && new BlobFilehandleWrapper(csiBlob),
          chunkSizeLimit: args.chunkSizeLimit || 1000000,
          renameRefSeqs: n => this.browser.regularizeReferenceName(n),
        })

        this.parser = new Parser({
          commentCallback: this.config.commentCallback || function (i) {},
          store: this,
        })

        this.getHeader().then(
          function (header) {
            thisB._deferred.features.resolve({ success: true })
            thisB._estimateGlobalStats().then(
              function (stats) {
                thisB.globalStats = stats
                thisB._deferred.stats.resolve(stats)
              },
              lang.hitch(thisB, '_failAllDeferred'),
            )
          },
          lang.hitch(thisB, '_failAllDeferred'),
        )
      },

      /**fetch and parse the Header line */
      getHeader: function () {
        if (!this._parsedHeader) {
          this._parsedHeader = this.indexedData
            .lineCount('nonexistent')
            .then(() => this.indexedData.getHeader())
            .then(bytes => this.parser.parseHeader(bytes))
        }
        return this._parsedHeader
      },

      _getFeatures: function (
        query,
        featureCallback,
        finishCallback,
        errorCallback,
      ) {
        this.getHeader().then(() => {
          this.indexedData
            .getMetadata()
            .then(metadata => {
              const regularizedReferenceName =
                this.browser.regularizeReferenceName(query.ref)
              return this.indexedData.getLines(
                regularizedReferenceName || this.refSeq.name,
                query.start,
                query.end,
                line => {
                  this.applyFeatureTransforms([
                    this.lineToFeature(metadata.columnNumbers, line),
                  ]).forEach(f => {
                    if (this.config.featureCallback)
                      f = this.config.featureCallback(f)
                    featureCallback(f)
                  })
                },
              )
            })
            .then(finishCallback, error => {
              if (errorCallback) {
                if (
                  error.message &&
                  error.message.indexOf('Too much data') >= 0
                ) {
                  error = new Errors.DataOverflow(error.message)
                }
                errorCallback(error)
              } else console.error(error)
            })
        }, errorCallback)
      },

      supportsFeatureTransforms: true,

      _featureData: function (data) {
        var f = lang.mixin({}, data)
        for (var a in data.matrix) {
          f[a.toLowerCase()] = data.attributes[a].join(',')
        }

        return f
      },
      _formatFeature: function (data) {
        var f = new SimpleFeature({
          data: this._featureData(data),
          id: data.seq_id + '_' + data.start + '_' + data.end + '_' + data.name,
        })
        f._reg_seq_id = this.browser.regularizeReferenceName(data.seq_id)
        return f
      },
      //read the line
      lineToFeature: function (columnNumbers, line) {
        const fields = line.split('\t')

        for (var i = 0; i < fields.length; i++) {
          if (fields[i] == '.') {
            fields[i] = null
          }
        }

        var featureData = {
          start: parseInt(fields[columnNumbers.start - 1]),
          end: parseInt(fields[columnNumbers.end - 1]),
          seq_id: fields[columnNumbers.ref - 1],
          name: fields[3],
          score: fields[4] || null,
          strand: { '+': 1, '-': -1 }[fields[5]] || 0,
          thick_start: fields[6],
          thick_end: fields[7],
          itemrgb: fields[8],
          block_count: fields[9],
          block_sizes: fields[10],
          chrom_starts: fields[11],
        }

        var f = new SimpleFeature({
          id: fields.slice(0, 5).join('/'),
          data: featureData,
          fields: fields,
        })

        return f
      },

      /**
       * Interrogate whether a store has data for a given reference
       * sequence.  Calls the given callback with either true or false.
       *
       * Implemented as a binary interrogation because some stores are
       * smart enough to regularize reference sequence names, while
       * others are not.
       */
      hasRefSeq: function (seqName, callback, errorCallback) {
        return this.indexedData.index.hasRefSeq(
          seqName,
          callback,
          errorCallback,
        )
      },

      saveStore: function () {
        return {
          urlTemplate: this.config.file.url,
          tbiUrlTemplate: (this.config.tbi || {}).url,
          csiUrlTemplate: (this.config.csi || {}).url,
        }
      },
    },
  )
})
