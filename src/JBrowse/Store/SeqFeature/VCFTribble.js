const { TribbleIndexedFile } = cjsRequire('@gmod/tribble-index')
const VCF = cjsRequire('@gmod/vcf')

define([
  'dojo/_base/declare',
  'JBrowse/Errors',
  'dojo/_base/lang',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Store/DeferredStatsMixin',
  'JBrowse/Store/DeferredFeaturesMixin',
  'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Model/BlobFilehandleWrapper',
  'JBrowse/Model/VCFFeature',
], function (
  declare,
  Errors,
  lang,
  SeqFeatureStore,
  DeferredStatsMixin,
  DeferredFeaturesMixin,
  GlobalStatsEstimationMixin,
  XHRBlob,
  BlobFilehandleWrapper,
  VCFFeature,
) {
  return declare(
    [
      SeqFeatureStore,
      DeferredStatsMixin,
      DeferredFeaturesMixin,
      GlobalStatsEstimationMixin,
    ],
    {
      constructor(args) {
        var thisB = this

        var idxBlob =
          args.idx ||
          new BlobFilehandleWrapper(
            new XHRBlob(
              this.resolveUrl(
                this.getConf('idxUrlTemplate', []) ||
                  this.getConf('urlTemplate', []) + '.idx',
              ),
            ),
          )

        var fileBlob =
          args.file ||
          new BlobFilehandleWrapper(
            new XHRBlob(this.resolveUrl(this.getConf('urlTemplate', [])), {
              expectRanges: true,
            }),
          )

        this.indexedData = new TribbleIndexedFile({
          filehandle: fileBlob,
          tribbleFilehandle: idxBlob,
          oneBasedClosed: true,
          chunkSizeLimit: args.chunkSizeLimit || 2000000,
          renameRefSeqs: n => this.browser.regularizeReferenceName(n),
        })

        this.getParser().then(
          function (parser) {
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

      getParser() {
        if (!this._parser) {
          this._parser = this.indexedData
            .getHeader()
            .then(header => new VCF({ header: header }))
        }
        return this._parser
      },

      _getFeatures(query, featureCallback, finishedCallback, errorCallback) {
        var thisB = this
        thisB
          .getParser()
          .then(parser => {
            const regularizedReferenceName =
              this.browser.regularizeReferenceName(query.ref)
            thisB.indexedData
              .getLines(
                regularizedReferenceName,
                query.start,
                query.end,
                line => {
                  const variant = parser.parseLine(line)
                  const feature = new VCFFeature({
                    variant: variant,
                    parser: parser,
                    id: variant.ID.length
                      ? variant.ID[0]
                      : `chr${variant.CHROM}_pos${variant.POS}_ref${variant.REF}_alt${variant.ALT}`,
                  })
                  featureCallback(feature)
                },
              )
              .then(finishedCallback, error => {
                if (errorCallback) {
                  if (
                    error.message &&
                    error.message.indexOf('Too much data') >= 0
                  ) {
                    error = new Errors.DataOverflow(error.message)
                  }
                  errorCallback(error)
                } else {
                  console.error(error)
                }
              })
          })
          .catch(errorCallback)
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
          idxUrlTemplate: this.config.idx.url,
        }
      },
    },
  )
})
