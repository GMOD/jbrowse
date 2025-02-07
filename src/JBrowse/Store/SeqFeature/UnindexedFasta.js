define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Store/DeferredFeaturesMixin',
  './UnindexedFasta/File',
], function (
  declare,
  lang,
  SeqFeatureStore,
  XHRBlob,
  DeferredFeaturesMixin,
  FASTAFile,
) {
  return declare([SeqFeatureStore, DeferredFeaturesMixin], {
    /**
     * Storage backend for sequences in UNINDEXED fasta files
     * served as static text files.
     * @constructs
     */
    constructor: function (args) {
      var fastaBlob =
        args.fasta ||
        args.blob ||
        new XHRBlob(this.resolveUrl(args.urlTemplate || 'data.fasta'))

      this.index = {}

      this.fasta = new FASTAFile({
        store: this,
        data: fastaBlob,
      })

      this.fasta.init({
        success: lang.hitch(this, function () {
          this._deferred.features.resolve({ success: true })
        }),
        failure: lang.hitch(this, '_failAllDeferred'),
      })
    },

    _getFeatures: function (query, featCallback, endCallback, errorCallback) {
      this.fasta.fetch(
        this.refSeq.name,
        query.start,
        query.end,
        featCallback,
        endCallback,
        errorCallback,
      )
    },

    getRefSeqs: function (featCallback, errorCallback) {
      var thisB = this
      this._deferred.features.then(function () {
        featCallback(thisB.fasta.refseqs)
      }, errorCallback)
    },

    saveStore: function () {
      return {
        urlTemplate: (this.config.file || this.config.blob).url,
      }
    },
  })
})
