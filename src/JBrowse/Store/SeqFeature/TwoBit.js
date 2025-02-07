const { TwoBitFile } = cjsRequire('@gmod/twobit')

const BlobFilehandleWrapper = cjsRequire('../../Model/BlobFilehandleWrapper')

define([
  'dojo/_base/declare',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Store/DeferredFeaturesMixin',
  'JBrowse/Model/SimpleFeature',
], function (
  declare,
  XHRBlob,
  SeqFeatureStore,
  DeferredFeaturesMixin,
  SimpleFeature,
) {
  return declare([SeqFeatureStore, DeferredFeaturesMixin], {
    /**
     * Data backend for reading feature data directly from a
     * web-accessible .2bit file.
     *
     * @constructs
     */
    constructor: function (args) {
      var blob =
        args.blob ||
        new XHRBlob(this.resolveUrl(args.urlTemplate || 'data.2bit'), {
          expectRanges: true,
        })

      this.twoBit = new TwoBitFile({
        filehandle: new BlobFilehandleWrapper(blob),
      })

      this.twoBit.getIndex().then(() => {
        this._deferred.features.resolve({ success: true })
      }, this._failAllDeferred.bind(this))
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
      this.twoBit.getSequenceSize(seqName).then(size => {
        callback(size !== undefined)
      }, errorCallback)
    },
    getRefSeqs: function (callback, errorCallback) {
      this.twoBit
        .getSequenceSizes()
        .then(sizes =>
          Object.entries(sizes).map(([name, length]) => {
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

    // called by getFeatures from the DeferredFeaturesMixin
    _getFeatures: function (query, featCallback, endCallback, errorCallback) {
      let start = query.start
      if (start < 0) {
        start = 0
      }
      var refname = query.ref
      // if they both regularize to the same thing, use this.refSeq.name since that is guaranteed to be from refseq store
      if (!this.browser.compareReferenceNames(this.refSeq.name, refname))
        refname = this.refSeq.name

      this.twoBit.getSequence(refname, start, query.end).then(seq => {
        if (seq !== undefined) {
          featCallback(
            new SimpleFeature({
              data: {
                seq_id: query.ref,
                start: start,
                end: query.end,
                seq,
              },
            }),
          )
        }
        endCallback()
      }, errorCallback)
    },

    saveStore: function () {
      return {
        urlTemplate: (this.config.file || this.config.blob).url,
      }
    },
  })
})
