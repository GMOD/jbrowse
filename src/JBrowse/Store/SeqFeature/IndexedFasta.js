const LRU = cjsRequire('quick-lru')
const { IndexedFasta } = cjsRequire('@gmod/indexedfasta')
const { Buffer } = cjsRequire('buffer')

const fastaIndexedFilesCache = new LRU({ maxSize: 5 })

const BlobFilehandleWrapper = cjsRequire('../../Model/BlobFilehandleWrapper')

define([
  'dojo/_base/declare',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Model/SimpleFeature',
  'JBrowse/Store/DeferredFeaturesMixin',
], function (
  declare,
  SeqFeatureStore,
  XHRBlob,
  SimpleFeature,
  DeferredFeaturesMixin,
) {
  return declare([SeqFeatureStore, DeferredFeaturesMixin], {
    /**
     * Storage backend for sequences in indexed fasta files
     * served as static text files.
     * @constructs
     */
    constructor: function (args) {
      let dataBlob
      if (args.fasta) {
        dataBlob = new BlobFilehandleWrapper(args.fasta)
      } else if (args.urlTemplate) {
        dataBlob = new BlobFilehandleWrapper(
          new XHRBlob(this.resolveUrl(args.urlTemplate), {
            expectRanges: true,
          }),
        )
      } else {
        dataBlob = new BlobFilehandleWrapper(
          new XHRBlob('data.fa', { expectRanges: true }),
        )
      }

      let indexBlob
      if (args.fai) {
        indexBlob = new BlobFilehandleWrapper(args.fai)
      } else if (args.faiUrlTemplate) {
        indexBlob = new BlobFilehandleWrapper(
          new XHRBlob(this.resolveUrl(args.faiUrlTemplate)),
        )
      } else if (args.urlTemplate) {
        indexBlob = new BlobFilehandleWrapper(
          new XHRBlob(this.resolveUrl(args.urlTemplate + '.fai')),
        )
      } else {
        throw new Error('no index provided, must provide a FASTA index')
      }

      this.source = dataBlob.toString()

      // LRU-cache the FASTA object so we don't have to re-download the
      // index when we switch chromosomes
      const cacheKey = `data: ${dataBlob}, index: ${indexBlob}`
      this.fasta = fastaIndexedFilesCache.get(cacheKey)
      if (!this.fasta) {
        this.fasta = new IndexedFasta({
          fasta: dataBlob,
          fai: indexBlob,
          chunkSizeLimit: args.chunkSizeLimit || 1000000,
        })

        fastaIndexedFilesCache.set(cacheKey, this.fasta)
      }
      this.fasta.getSequenceList().then(() => {
        this._deferred.features.resolve({ success: true })
      }, this._failAllDeferred.bind(this))
    },

    _getFeatures: function (query, featCallback, endCallback, errorCallback) {
      if (query.start < 0) {
        query.start = 0
      }
      var refname = query.ref
      // if they both regularize to the same thing, use this.refSeq.name since that is guaranteed to be from refseq store
      if (!this.browser.compareReferenceNames(this.refSeq.name, refname)) {
        refname = this.refSeq.name
      }

      this.fasta
        .getResiduesByName(refname, query.start, query.end)
        .then(seq => {
          featCallback(
            new SimpleFeature({
              data: { seq, start: query.start, end: query.end },
            }),
          )
          endCallback()
        }, errorCallback)
    },
    hasRefSeq: function (seqName, callback, errorCallback) {
      this.fasta.getSequenceSize(seqName).then(size => {
        callback(size !== undefined)
      }, errorCallback)
    },
    getRefSeqs: function (callback, errorCallback) {
      this.fasta
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

    saveStore: function () {
      return {
        urlTemplate: (this.config.file || this.config.blob).url,
        faiUrlTemplate: this.config.fai.url,
      }
    },
  })
})
