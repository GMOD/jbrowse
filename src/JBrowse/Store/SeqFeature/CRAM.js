const LRU = cjsRequire('quick-lru')
const { IndexedCramFile, CraiIndex } = cjsRequire('@gmod/cram')
const { CramSizeLimitError } = cjsRequire('@gmod/cram/errors')

const cramIndexedFilesCache = new LRU({ maxSize: 5 })

const BlobFilehandleWrapper = cjsRequire('../../Model/BlobFilehandleWrapper')

class CramSlightlyLazyFeature {
  _get_id() {
    return this.id()
  }
  _get_name() {
    return this.record.readName
  }
  _get_start() {
    return this.record.alignmentStart - 1
  }
  _get_end() {
    return this.record.alignmentStart + this.record.lengthOnRef - 1
  }
  _get_cram_read_features() {
    return this.record.readFeatures
  }
  _get_type() {
    return 'match'
  }
  _get_score() {
    return this.record.mappingQuality
  }
  _get_mapping_quality() {
    return this.record.mappingQuality
  }
  _get_flags() {
    return `0x${this.record.flags.toString(16)}`
  }
  _get_cramFlags() {
    return `0x${this.record.cramFlags.toString(16)}`
  }
  _get_strand() {
    return this.record.isReverseComplemented() ? -1 : 1
  }
  _get_read_group_id() {
    return this.record.readGroupId
  }
  _get_qual() {
    return (this.record.qualityScores || []).map(q => q + 33).join(' ')
  }
  _get_seq_id() {
    return this._store._refIdToName(this.record.sequenceId)
  }
  _get_qc_failed() {
    return this.record.isFailedQc()
  }
  _get_secondary_alignment() {
    return this.record.isSecondary()
  }
  _get_duplicate() {
    return this.record.isDuplicate()
  }
  _get_supplementary_alignment() {
    return this.record.isSupplementary()
  }
  _get_pair_orientation() {
    return this.record.getPairOrientation()
  }
  _get_multi_segment_template() {
    return this.record.isPaired()
  }
  _get_multi_segment_all_correctly_aligned() {
    return this.record.isProperlyPaired()
  }
  _get_multi_segment_all_aligned() {
    return this.record.isProperlyPaired()
  }
  _get_multi_segment_next_segment_unmapped() {
    return this.record.isMateUnmapped()
  }
  _get_multi_segment_first() {
    return this.record.isRead1()
  }
  _get_multi_segment_last() {
    return this.record.isRead2()
  }
  _get_multi_segment_next_segment_reversed() {
    return this.record.isMateReverseComplemented()
  }
  _get_is_paired() {
    return !!this.record.mate
  }
  _get_unmapped() {
    return this.record.isSegmentUnmapped()
  }
  _get_template_length() {
    return this.record.templateLength || this.record.templateSize
  }
  _get_next_seq_id() {
    return this.record.mate
      ? this._store._refIdToName(this.record.mate.sequenceId)
      : undefined
  }
  _get_next_pos() {
    return this.record.mate ? this.record.mate.alignmentStart : undefined
  }
  _get_next_segment_position() {
    return this.record.mate
      ? this._store._refIdToName(this.record.mate.sequenceId) +
          ':' +
          this.record.mate.alignmentStart
      : undefined
  }
  _get_tags() {
    return this.record.tags
  }
  _get_seq() {
    return this.record.getReadBases()
  }

  constructor(record, store) {
    this.record = record
    this._store = store
  }

  tags() {
    const properties = Object.getOwnPropertyNames(
      CramSlightlyLazyFeature.prototype,
    )
    return properties
      .filter(prop => /^_get_/.test(prop))
      .map(methodName => methodName.replace('_get_', ''))
  }

  id() {
    return this.record.uniqueId + 1
  }

  _get(field) {
    const methodName = `_get_${field}`
    if (this[methodName]) {
      return this[methodName]()
    }
    return undefined
  }
  get(field) {
    const methodName = `_get_${field.toLowerCase()}`
    if (this[methodName]) {
      return this[methodName]()
    }
    return undefined
  }

  parent() {}

  children() {}

  pairedFeature() {
    return false
  }
}

define([
  'dojo/_base/declare',
  'JBrowse/Util',
  'JBrowse/Errors',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Store/DeferredStatsMixin',
  'JBrowse/Store/DeferredFeaturesMixin',
  'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
  'JBrowse/Store/SeqFeature/_PairCache',
  'JBrowse/Store/SeqFeature/_SpanCache',
  'JBrowse/Store/SeqFeature/_InsertSizeCache',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Model/SimpleFeature',
], function (
  declare,
  Util,
  Errors,
  SeqFeatureStore,
  DeferredStatsMixin,
  DeferredFeaturesMixin,
  GlobalStatsEstimationMixin,
  PairCache,
  SpanCache,
  InsertSizeCache,
  XHRBlob,
  SimpleFeature,
) {
  return declare(
    [
      SeqFeatureStore,
      DeferredStatsMixin,
      DeferredFeaturesMixin,
      GlobalStatsEstimationMixin,
    ],

    /**
     * @lends JBrowse.Store.SeqFeature.CRAM
     */
    {
      /**
       * Data backend for reading feature data directly from a
       * web-accessible CRAM file.
       *
       * @constructs
       */
      constructor: function (args) {
        let dataBlob
        if (args.cram) {
          dataBlob = new BlobFilehandleWrapper(args.cram)
        } else if (args.urlTemplate) {
          dataBlob = new BlobFilehandleWrapper(
            new XHRBlob(this.resolveUrl(args.urlTemplate || 'data.cram'), {
              expectRanges: true,
            }),
          )
        } else {
          throw new Error('must provide either `cram` or `urlTemplate`')
        }

        let indexBlob
        if (args.crai) {
          indexBlob = new BlobFilehandleWrapper(args.crai)
        } else if (args.craiUrlTemplate) {
          indexBlob = new BlobFilehandleWrapper(
            new XHRBlob(this.resolveUrl(args.craiUrlTemplate)),
          )
        } else if (args.urlTemplate) {
          indexBlob = new BlobFilehandleWrapper(
            new XHRBlob(this.resolveUrl(args.urlTemplate + '.crai')),
          )
        } else {
          throw new Error('no index provided, must provide a CRAM index')
        }

        this.source = dataBlob.toString()

        // LRU-cache the CRAM object so we don't have to re-download the
        // index when we switch chromosomes
        const cacheKey = `data: ${dataBlob}, index: ${indexBlob}`
        this.cram = cramIndexedFilesCache.get(cacheKey)
        if (!this.cram) {
          this.cram = new IndexedCramFile({
            cramFilehandle: dataBlob,
            index: new CraiIndex({ filehandle: indexBlob }),
            seqFetch: this._seqFetch.bind(this),
            checkSequenceMD5: false,
            fetchSizeLimit: args.fetchSizeLimit || 60000000,
          })

          cramIndexedFilesCache.set(cacheKey, this.cram)
        }

        // pre-download the index before running the statistics estimation so that the stats
        // estimation doesn't time out
        this.cram
          .hasDataForReferenceSequence(0)
          .then(() => this.cram.cram.getSamHeader())
          .then(samHeader => {
            this._setSamHeader(samHeader)
          })
          .then(() => {
            this._deferred.features.resolve({ success: true })
          })
          .then(() => this._estimateGlobalStats())
          .then(stats => {
            this.globalStats = stats
            this._deferred.stats.resolve({ success: true })
          })
          .catch(err => {
            this._deferred.features.reject(err)
            this._deferred.stats.reject(err)
          })

        this.insertSizeCache = new InsertSizeCache(args)
        this.pairCache = new PairCache(args)
        this.spanCache = new SpanCache(args)
      },

      // process the parsed SAM header from the cram file
      _setSamHeader(samHeader) {
        this._samHeader = {}

        // use the @SQ lines in the header to figure out the
        // mapping between ref seq ID numbers and names
        const refSeqIdToName = []
        const refSeqNameToId = {}
        const sqLines = samHeader.filter(l => l.tag === 'SQ')
        sqLines.forEach((sqLine, seqId) => {
          sqLine.data.forEach(item => {
            if (item.tag === 'SN') {
              // this is the seq name
              const seqName = this.browser.regularizeReferenceName(item.value)
              refSeqNameToId[seqName] = seqId
              refSeqIdToName[seqId] = seqName
            }
          })
        })
        if (refSeqIdToName.length) {
          this._samHeader.refSeqIdToName = refSeqIdToName
          this._samHeader.refSeqNameToId = refSeqNameToId
        }
      },

      _refNameToId(refName) {
        // use info from the SAM header if possible, but fall back to using
        // the ref seq order from when the browser's refseqs were loaded
        if (this._samHeader.refSeqNameToId) {
          return this._samHeader.refSeqNameToId[refName]
        } else {
          return this.browser.getRefSeqNumber(refName)
        }
      },

      _refIdToName(refId) {
        // use info from the SAM header if possible, but fall back to using
        // the ref seq order from when the browser's refseqs were loaded
        if (this._samHeader.refSeqIdToName) {
          return this._samHeader.refSeqIdToName[refId]
        } else {
          let ref = this.browser.getRefSeqById(refId)
          return ref ? ref.name : undefined
        }
      },

      _getRefSeqStore() {
        return new Promise((resolve, reject) => {
          this.browser.getStore('refseqs', resolve, reject)
        })
      },

      // used by the CRAM backend to fetch a region of the underlying reference
      // sequence.  needed for some of its calculations
      async _seqFetch(seqId, start, end) {
        start -= 1 // convert from 1-based closed to interbase

        const refSeqStore = await this._getRefSeqStore()
        if (!refSeqStore) {
          return undefined
        }
        const refName = this._refIdToName(seqId)
        if (!refName) {
          return undefined
        }

        const seqChunks = await new Promise((resolve, reject) => {
          let features = []
          refSeqStore.getFeatures(
            { ref: refName, start: start - 1, end },
            f => features.push(f),
            () => resolve(features),
            reject,
          )
        })

        const trimmed = []
        seqChunks
          .sort((a, b) => a.get('start') - b.get('start'))
          .forEach((chunk, i) => {
            let chunkStart = chunk.get('start')
            let chunkEnd = chunk.get('end')
            let trimStart = Math.max(start - chunkStart, 0)
            let trimEnd = Math.min(end - chunkStart, chunkEnd - chunkStart)
            let trimLength = trimEnd - trimStart
            let chunkSeq = chunk.get('seq') || chunk.get('residues')
            trimmed.push(chunkSeq.substr(trimStart, trimLength))
          })

        const sequence = trimmed.join('')
        if (sequence.length !== end - start) {
          throw new Error(
            `sequence fetch failed: fetching ${(
              start - 1
            ).toLocaleString()}-${end.toLocaleString()} only returned ${sequence.length.toLocaleString()} bases, but should have returned ${(
              end - start
            ).toLocaleString()}`,
          )
        }
        return sequence
      },

      /**
       * Interrogate whether a store has data for a given reference
       * sequence.  Calls the given callback with either true or false.
       */
      hasRefSeq: function (seqName, callback, errorCallback) {
        seqName = this.browser.regularizeReferenceName(seqName)
        const refSeqNumber = this._refNameToId(seqName)
        if (refSeqNumber === undefined) {
          callback(false)
        }

        this._deferred.stats
          .then(() => this.cram.hasDataForReferenceSequence(refSeqNumber))
          .then(callback, errorCallback)
      },

      // called by getFeatures from the DeferredFeaturesMixin
      _getFeatures: function (query, featCallback, endCallback, errorCallback) {
        const pairCache = {}
        const seqName = query.ref || this.refSeq.name
        const refSeqNumber = this._refNameToId(
          this.browser.regularizeReferenceName(seqName),
        )
        query.maxInsertSize = query.maxInsertSize || 50000
        if (refSeqNumber === undefined) {
          endCallback()
          return
        }
        this.cram
          .getRecordsForRange(refSeqNumber, query.start + 1, query.end, {
            viewAsPairs: query.viewAsPairs,
            viewAsSpans: query.viewAsSpans,
            maxInsertSize: query.maxInsertSize,
          })
          .then(records => {
            if (query.viewAsPairs) {
              const recs = records.map(f => this._cramRecordToFeature(f))
              recs.forEach(r => this.insertSizeCache.insertFeat(r))
              this.pairCache.pairFeatures(
                query,
                recs,
                featCallback,
                endCallback,
                errorCallback,
              )
            } else if (query.viewAsSpans) {
              const recs = records.map(f => this._cramRecordToFeature(f))
              recs.forEach(r => this.insertSizeCache.insertFeat(r))
              this.spanCache.pairFeatures(
                query,
                recs,
                featCallback,
                endCallback,
                errorCallback,
              )
            } else {
              for (let i = 0; i < records.length; i++) {
                let feat = this._cramRecordToFeature(records[i])
                this.insertSizeCache.insertFeat(feat)
                featCallback(feat)
              }
            }
            endCallback()
          })
          .catch(err => {
            // map the CramSizeLimitError to JBrowse Errors.DataOverflow
            if (err instanceof CramSizeLimitError) {
              err = new Errors.DataOverflow(err)
            }

            errorCallback(err)
          })
      },

      getInsertSizeStats() {
        return this.insertSizeCache.getInsertSizeStats()
      },

      cleanFeatureCache(query) {
        this.pairCache.cleanFeatureCache(query)
        this.spanCache.cleanFeatureCache(query)
      },

      cleanStatsCache() {
        this.insertSizeCache.cleanStatsCache()
      },

      _cramRecordToFeature(record) {
        return new CramSlightlyLazyFeature(record, this)
      },

      saveStore() {
        return {
          urlTemplate: this.config.cram.url,
          craiUrlTemplate: this.config.crai.url,
        }
      },
    },
  )
})
