const BlobFilehandleWrapper = cjsRequire('../../Model/BlobFilehandleWrapper')

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Deferred',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Store/DeferredFeaturesMixin',
], function (
  declare,
  lang,
  Deferred,
  SeqFeatureStore,
  XHRBlob,
  DeferredFeaturesMixin,
) {
  return declare([SeqFeatureStore, DeferredFeaturesMixin], {
    /**
     * Storage backend for sequences in chrom.sizes files
     * served as static text files.
     * @constructs
     */
    constructor: function (args) {
      let dataBlob
      if (args.blob) dataBlob = new BlobFilehandleWrapper(args.blob)
      else if (args.urlTemplate)
        dataBlob = new BlobFilehandleWrapper(
          new XHRBlob(this.resolveUrl(args.urlTemplate)),
        )

      this.source = dataBlob.toString()
      this.data = dataBlob
      this.refSeqs = {}

      this.init({
        success: () => this._deferred.features.resolve({ success: true }),
        failure: this._failAllDeferred.bind(this),
      })
    },

    hasRefSeq: function (seqName, callback, errorCallback) {
      this.getSequenceSize(seqName).then(size => {
        callback(size !== undefined)
      }, errorCallback)
    },
    getRefSeqs: function (callback, errorCallback) {
      this.getSequenceSizes()
        .then(sizes =>
          Object.entries(this.refSeqs).map(([name, length]) => {
            return {
              name,
              length,
              end: length,
              start: 0,
            }
          }),
        )
        .then(callback, errorCallback)
    },
    getSequenceSize: function (refSeq) {
      return this._deferred.features.then(() => {
        return this.refSeqs[refSeq]
      })
    },
    getSequenceSizes: function () {
      return this._deferred.features.then(() => {
        return this.refSeqs
      })
    },
    init: function (args) {
      var fasta = this.data
      var successCallback = args.success || function () {}
      var failCallback =
        args.failure ||
        function (e) {
          console.error(e, e.stack)
        }
      this.data.readFile().then(data => {
        if (!data.length) {
          failCallback('Could not read file ' + this.source)
        }
        const chroms = data.toString('utf8')
        chroms.split('\n').forEach(line => {
          if (line.length) {
            const [name, length] = line.split('\t')
            this.refSeqs[name] = length
          }
        })
        successCallback()
      }, failCallback)
    },

    saveStore: function () {
      return {
        urlTemplate: (this.config.file || this.config.blob).url,
      }
    },
  })
})
