const LRU = cjsRequire('quick-lru')
const { BgzipIndexedFasta } = cjsRequire('@gmod/indexedfasta')
const { Buffer } = cjsRequire('buffer')

const fastaIndexedFilesCache = new LRU({ maxSize: 5 })

const BlobFilehandleWrapper = cjsRequire('../../Model/BlobFilehandleWrapper')

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Store/SeqFeature/IndexedFasta',
], function (declare, lang, XHRBlob, IndexedFasta) {
  return declare(IndexedFasta, {
    /**
     * Storage backend for sequences in indexed fasta files
     * served as static text files.
     * @constructs
     */
    constructor: function (args) {
      let dataBlob
      if (args.bgzfa) dataBlob = new BlobFilehandleWrapper(args.bgzfa)
      else if (args.urlTemplate)
        dataBlob = new BlobFilehandleWrapper(
          new XHRBlob(this.resolveUrl(args.urlTemplate), {
            expectRanges: true,
          }),
        )
      else
        dataBlob = new BlobFilehandleWrapper(
          new XHRBlob('data.fa', { expectRanges: true }),
        )

      let indexBlob
      if (args.fai) indexBlob = new BlobFilehandleWrapper(args.fai)
      else if (args.faiUrlTemplate)
        indexBlob = new BlobFilehandleWrapper(
          new XHRBlob(this.resolveUrl(args.faiUrlTemplate)),
        )
      else if (args.urlTemplate)
        indexBlob = new BlobFilehandleWrapper(
          new XHRBlob(this.resolveUrl(args.urlTemplate + '.fai')),
        )
      else throw new Error('no index provided, must provide a FASTA index')

      let gziBlob
      if (args.gzi) gziBlob = new BlobFilehandleWrapper(args.gzi)
      else if (args.gziUrlTemplate)
        gziBlob = new BlobFilehandleWrapper(
          new XHRBlob(this.resolveUrl(args.gziUrlTemplate)),
        )
      else if (args.urlTemplate)
        gziBlob = new BlobFilehandleWrapper(
          new XHRBlob(this.resolveUrl(args.urlTemplate + '.gzi')),
        )
      else throw new Error('no gzi index provided, must provide a GZI index')

      this.source = dataBlob.toString()

      // LRU-cache the CRAM object so we don't have to re-download the
      // index when we switch chromosomes
      const cacheKey = `data: ${dataBlob}, index: ${indexBlob}, gzi: ${gziBlob}`
      this.fasta = fastaIndexedFilesCache.get(cacheKey)
      if (!this.fasta) {
        this.fasta = new BgzipIndexedFasta({
          fasta: dataBlob,
          fai: indexBlob,
          gzi: gziBlob,
          chunkSizeLimit: args.chunkSizeLimit || 1000000,
        })

        fastaIndexedFilesCache.set(cacheKey, this.fasta)
      }
      this.fasta.getSequenceList().then(
        () => this._deferred.features.resolve({ success: true }),
        () => this._failAllDeferred(),
      )
    },
    saveStore: function () {
      return {
        urlTemplate: (this.config.file || this.config.blob).url,
        faiUrlTemplate: this.config.fai.url,
        gziUrlTemplate: this.config.gzi.url,
      }
    },
  })
})
