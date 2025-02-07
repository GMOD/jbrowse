const LRU = cjsRequire('quick-lru')
const { BamFile } = cjsRequire('@gmod/bam')

const bamIndexedFilesCache = new LRU({ maxSize: 5 })

const BlobFilehandleWrapper = cjsRequire('../../Model/BlobFilehandleWrapper')

export function parseCigar(cigar) {
  return (cigar || '').split(/([MIDNSHPX=])/)
}
// adapted from minimap2 code static void write_MD_core function
export function generateMD(target, query, cigar) {
  let queryOffset = 0
  let targetOffset = 0
  let lengthMD = 0
  if (!target) {
    console.warn('no ref supplied to generateMD')
    return ''
  }
  const cigarOps = parseCigar(cigar)
  let str = ''
  for (let i = 0; i < cigarOps.length; i += 2) {
    const len = +cigarOps[i]
    const op = cigarOps[i + 1]
    if (op === 'M' || op === 'X' || op === '=') {
      for (let j = 0; j < len; j++) {
        if (
          query[queryOffset + j].toLowerCase() !==
          target[targetOffset + j].toLowerCase()
        ) {
          str += `${lengthMD}${target[targetOffset + j].toUpperCase()}`
          lengthMD = 0
        } else {
          lengthMD++
        }
      }
      queryOffset += len
      targetOffset += len
    } else if (op === 'I') {
      queryOffset += len
    } else if (op === 'D') {
      let tmp = ''
      for (let j = 0; j < len; j++) {
        tmp += target[targetOffset + j].toUpperCase()
      }
      str += `${lengthMD}^${tmp}`
      lengthMD = 0
      targetOffset += len
    } else if (op === 'N') {
      targetOffset += len
    } else if (op === 'S') {
      queryOffset += len
    }
  }
  if (lengthMD > 0) {
    str += lengthMD
  }
  return str
}
class BamSlightlyLazyFeature {
  _get_id() {
    this.record.id()
  }
  _get_type() {
    return 'match'
  }
  _get_score() {
    return this.record.get('mq')
  }
  _get_mapping_quality() {
    return this.record.mappingQuality
  }
  _get_flags() {
    return `0x${this.record.flags.toString(16)}`
  }
  _get_md() {
    const md = this.record.get('md')
    const seq = this.get('seq')
    if (!md && seq && this.ref) {
      return generateMD(this.ref, this.record.getReadBases(), this.get('cigar'))
    }
    return md
  }
  _get_strand() {
    return this.record.isReverseComplemented() ? -1 : 1
  }
  _get_read_group_id() {
    return this.record.readGroupId
  }
  _get_seq_id() {
    return this._store._refIdToName(this.record._refID)
  }
  _get_qc_failed() {
    return this.record.isFailedQc()
  }
  _get_duplicate() {
    return this.record.isDuplicate()
  }
  _get_secondary_alignment() {
    return this.record.isSecondary()
  }
  _get_supplementary_alignment() {
    return this.record.isSupplementary()
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
  _get_pair_orientation() {
    return this.record.getPairOrientation()
  }
  _get_unmapped() {
    return this.record.isSegmentUnmapped()
  }
  _get_next_seq_id() {
    return this.record.isPaired()
      ? this._store._refIdToName(this.record._next_refid())
      : undefined
  }
  _get_is_paired() {
    return this.record.isPaired()
  }
  _get_next_pos() {
    return this.record.isPaired() ? this.record._next_pos() : undefined
  }
  _get_next_segment_position() {
    return this.record.isPaired()
      ? this._store._refIdToName(this.record._next_refid()) +
          ':' +
          (this.record._next_pos() + 1)
      : undefined
  }
  _get_tags() {
    return this.record._tags()
  }
  _get_seq() {
    return this.record.getReadBases()
  }

  constructor(record, store, ref) {
    this.record = record
    this._store = store
    this.ref = ref
  }

  tags() {
    return this._get_tags()
  }

  id() {
    return this.record.id()
  }

  _get(field) {
    const methodName = `_get_${field}`
    if (this[methodName]) return this[methodName]()
    else return this.record.get(field)
  }
  get(field) {
    const methodName = `_get_${field.toLowerCase()}`
    if (this[methodName]) return this[methodName]()
    else return this.record.get(field)
  }

  getCaseSensitive(field) {
    const methodName = `_get_${field}`
    if (this[methodName]) return this[methodName]()
    else return this.record._get(field)
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
  'JBrowse/Store/SeqFeature/IndexedStatsEstimationMixin',
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
  IndexedStatsEstimationMixin,
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
      IndexedStatsEstimationMixin,
    ],
    {
      constructor(args) {
        let dataBlob
        if (args.bam) dataBlob = new BlobFilehandleWrapper(args.bam)
        else if (args.urlTemplate)
          dataBlob = new BlobFilehandleWrapper(
            new XHRBlob(this.resolveUrl(args.urlTemplate || 'data.bam'), {
              expectRanges: true,
            }),
          )
        else throw new Error('must provide either `bam` or `urlTemplate`')

        let baiBlob, csiBlob
        if (args.bai) baiBlob = new BlobFilehandleWrapper(args.bai)
        else if (args.csi) csiBlob = new BlobFilehandleWrapper(args.csi)
        else if (args.baiUrlTemplate)
          baiBlob = new BlobFilehandleWrapper(
            new XHRBlob(this.resolveUrl(args.baiUrlTemplate)),
          )
        else if (args.csiUrlTemplate)
          csiBlob = new BlobFilehandleWrapper(
            new XHRBlob(this.resolveUrl(args.csiUrlTemplate)),
          )
        else if (args.urlTemplate)
          baiBlob = new BlobFilehandleWrapper(
            new XHRBlob(this.resolveUrl(args.urlTemplate + '.bai')),
          )
        else
          throw new Error('no index provided, must provide a BAI or CSI index')

        this.source = dataBlob.toString()

        // LRU-cache the BAM object so we don't have to re-download the
        // index when we switch chromosomes
        const cacheKey = `data: ${dataBlob}, index: ${csiBlob || baiBlob}`
        this.bam = bamIndexedFilesCache.get(cacheKey)
        if (!this.bam) {
          this.bam = new BamFile({
            bamFilehandle: dataBlob,
            baiFilehandle: baiBlob,
            csiFilehandle: csiBlob,
            renameRefSeqs: n => this.browser.regularizeReferenceName(n),
            fetchSizeLimit: args.fetchSizeLimit || 100000000,
            chunkSizeLimit: args.chunkSizeLimit || 20000000,
          })

          bamIndexedFilesCache.set(cacheKey, this.bam)
        }

        // pre-download the index before running the statistics estimation so that the stats
        // estimation doesn't time out
        this.bam
          .hasRefSeq(0)
          .then(() => this.bam.getHeader())
          .then(header => this._setSamHeader(header))
          .then(res => {
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

      _getRefSeqStore() {
        return new Promise((resolve, reject) => {
          this.browser.getStore('refseqs', resolve, reject)
        })
      },

      // used by the CRAM backend to fetch a region of the underlying reference
      // sequence.  needed for some of its calculations
      async seqFetch(refName, start, end) {
        const refSeqStore = await this._getRefSeqStore()
        if (!refSeqStore) return undefined

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
        if (sequence.length !== end - start)
          throw new Error(
            `sequence fetch failed: fetching ${(
              start - 1
            ).toLocaleString()}-${end.toLocaleString()} only returned ${sequence.length.toLocaleString()} bases, but should have returned ${(
              end - start
            ).toLocaleString()}`,
          )
        return sequence
      },

      // process the parsed SAM header from the bam file
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
              const seqName = item.value
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
        if (this._samHeader.refSeqNameToId)
          return this._samHeader.refSeqNameToId[refName]
        else return this.browser.getRefSeqNumber(refName)
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

      /**
       * Interrogate whether a store has data for a given reference
       * sequence.  Calls the given callback with either true or false.
       */
      hasRefSeq(seqName, callback, errorCallback) {
        seqName = this.browser.regularizeReferenceName(seqName)

        this._deferred.stats
          .then(() => this.bam.hasRefSeq(this._refNameToId(seqName)))
          .then(callback, errorCallback)
      },

      // called by getFeatures from the DeferredFeaturesMixin
      _getFeatures(query, featCallback, endCallback, errorCallback) {
        let seqName = query.ref || this.refSeq.name
        seqName = this.browser.regularizeReferenceName(seqName)
        const pairCache = {}
        query.maxInsertSize = query.maxInsertSize || 50000

        this.bam
          .getRecordsForRange(seqName, query.start, query.end, {
            viewAsPairs: query.viewAsPairs,
            viewAsSpans: query.viewAsSpans,
            maxInsertSize: query.maxInsertSize,
          })
          .then(async records => {
            if (query.viewAsPairs) {
              let recs = []
              for (const record of records) {
                recs.push(await this._bamRecordToFeature(record, seqName))
              }
              recs.forEach(r => this.insertSizeCache.insertFeat(r))
              this.pairCache.pairFeatures(
                query,
                recs,
                featCallback,
                endCallback,
                errorCallback,
              )
            } else if (query.viewAsSpans) {
              let recs = []
              for (const record of records) {
                recs.push(await this._bamRecordToFeature(record, seqName))
              }
              recs.forEach(r => this.insertSizeCache.insertFeat(r))
              this.spanCache.pairFeatures(
                query,
                recs,
                featCallback,
                endCallback,
                errorCallback,
              )
            } else {
              let recs = []
              for (const record of records) {
                recs.push(await this._bamRecordToFeature(record, seqName))
              }
              for (let i = 0; i < recs.length; i++) {
                this.insertSizeCache.insertFeat(recs[i])
                featCallback(recs[i])
              }
            }
            endCallback()
          })
          .catch(errorCallback)
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
      async _bamRecordToFeature(record, refName) {
        let ref
        if (!record.get('md')) {
          ref = await this.seqFetch(
            refName,
            record.get('start'),
            record.get('end'),
          )
        }
        return new BamSlightlyLazyFeature(record, this, ref)
      },

      saveStore() {
        return {
          urlTemplate: this.config.bam.url,
          baiUrlTemplate: (this.config.bai || {}).url,
          csiUrlTemplate: (this.config.csi || {}).url,
        }
      },
    },
  )
})
