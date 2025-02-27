define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/request',
  'dojo/promise/all',
  'dojo/Deferred',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Store/LRUCache',
  'JBrowse/Util',
  'JBrowse/Model/SimpleFeature',
  'JBrowse/Digest/Crc32',
], function (
  declare,
  lang,
  array,
  request,
  all,
  Deferred,
  SeqFeatureStore,
  LRUCache,
  Util,
  SimpleFeature,
  Crc32,
) {
  return declare(SeqFeatureStore, {
    /**
     * Storage backend for sequences broken up into chunks, stored and
     * served as static text files.
     * @constructs
     */
    constructor: function (args) {
      this.compress = args.compress
      this.urlTemplate = this.getConf('urlTemplate', [])
      if (!this.urlTemplate) {
        throw 'no urlTemplate provided, cannot open sequence store'
      }

      this.baseUrl = args.baseUrl
      this.seqChunkSize = args.seqChunkSize
    },

    getFeatures: function (query, featureCallback, endCallback, errorCallback) {
      errorCallback =
        errorCallback ||
        function (e) {
          console.error(e)
        }

      var refname = query.ref
      // if they both regularize to the same thing, use this.refSeq.name since that is guaranteed to be from refseq store
      if (!this.browser.compareReferenceNames(this.refSeq.name, refname)) {
        refname = this.refSeq.name
      }

      var chunkSize =
        (refname == this.refSeq.name && this.refSeq.seqChunkSize) ||
        this.seqChunkSize ||
        (this.compress ? 80000 : 20000)

      var chunksProcessed = 0

      var cache = (this.chunkCache =
        this.chunkCache ||
        new LRUCache({
          name: 'SequenceCache',
          fillCallback: dojo.hitch(this, '_readChunkItems'),
          sizeFunction: function (chunkItems) {
            return chunkItems.length
          },
          maxSize: 100, // cache up to 100 seqchunks
        }))
      var firstChunk = Math.floor(Math.max(0, query.start) / chunkSize)
      var lastChunk = Math.floor((query.end - 1) / chunkSize)

      var chunks = []
      for (var i = firstChunk; i <= lastChunk; i++) {
        chunks.push({
          refname: refname,
          chunkNum: i,
          chunkSize: chunkSize,
        })
      }

      var haveError
      array.forEach(chunks, function (c) {
        cache.get(c, function (item, e) {
          if (e && !haveError) {
            errorCallback(e)
          }
          if ((haveError = haveError || e)) {
            return
          }

          featureCallback(item)
          if (++chunksProcessed == chunks.length) {
            endCallback()
          }
        })
      })
    },
    _readChunkItems: function (chunk, callback) {
      var thisB = this
      var d = new Deferred() // need to have our own deferred that is resolved to '' on 404

      var sequrl = this.resolveUrl(this.urlTemplate, {
        refseq: chunk.refname,
        refseq_dirpath: function () {
          var hex = Crc32.crc32(chunk.refname)
            .toString(16)
            .toLowerCase()
            .replace('-', 'n')
          // zero-pad the hex string to be 8 chars if necessary
          while (hex.length < 8) {
            hex = `0${hex}`
          }
          var dirpath = []
          for (var i = 0; i < hex.length; i += 3) {
            dirpath.push(hex.substring(i, i + 3))
          }
          return dirpath.join('/')
        },
      })
      this._fetchChunk(sequrl, chunk.chunkNum).then(
        lang.hitch(d, 'resolve'),
        function (e) {
          if (e.response.status == 404) {
            d.resolve('')
          } else {
            d.reject(e)
          }
        },
      )
      d.then(
        function (sequenceString) {
          callback(
            thisB._makeFeature(
              chunk.refname,
              chunk.chunkNum,
              chunk.chunkSize,
              sequenceString,
            ),
          )
        },
        function (e) {
          callback(null, e)
        },
      )
    },

    _fetchChunk: function (sequrl, chunkNum) {
      return request.get(
        `${sequrl + chunkNum}.txt${this.compress ? 'z' : ''}`,
        { handleAs: 'text', headers: { 'X-Requested-With': null } },
      )
    },

    _makeFeature: function (refname, chunkNum, chunkSize, sequenceString) {
      return new SimpleFeature({
        data: {
          start: chunkNum * chunkSize,
          end: chunkNum * chunkSize + sequenceString.length,
          residues: sequenceString,
          seq_id: refname,
          name: refname,
        },
      })
    },
  })
})
