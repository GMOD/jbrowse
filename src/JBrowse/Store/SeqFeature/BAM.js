const LRU = cjsRequire('lru-cache')
const { BamFile } = cjsRequire('@gmod/bam')

const { Buffer } = cjsRequire('buffer')

const bamIndexedFilesCache = LRU(5)

const BlobFilehandleWrapper = cjsRequire('../../Model/BlobFilehandleWrapper')

class BamSlightlyLazyFeature {

    _get_name() { return this.record.readName }
    _get_start() { return this.record.alignmentStart-1 }
    _get_end() { return this.record.alignmentStart+this.record.lengthOnRef-1 }
    _get_type() { return 'match'}
    _get_mapping_quality() { return this.record.mappingQuality}
    _get_flags() { return `0x${this.record.flags.toString(16)}`}
    _get_strand() { return this.record.isReverseComplemented() ? -1 : 1 }
    _get_read_group_id() { return this.record.readGroupId }
    _get_qual() { return (this.record.qualityScores || []).map(q => q+33).join(' ')}
    _get_seq() { return this.record.readBases}
    _get_seq_id() { return this._store._refIdToName(this.record.sequenceId)}
    _get_qc_failed() { return this.record.isFailedQc()}
    _get_secondary_alignment() { return this.record.isSecondary()}
    _get_supplementary_alignment() { return this.record.isSupplementary()}
    _get_multi_segment_template() { return this.record.isPaired()}
    _get_multi_segment_all_correctly_aligned() { return this.record.isProperlyPaired()}
    _get_multi_segment_next_segment_unmapped() { return this.record.isMateUnmapped()}
    _get_multi_segment_first() { return this.record.isRead1()}
    _get_multi_segment_last() { return this.record.isRead2()}
    _get_multi_segment_next_segment_reversed() { return this.record.isMateReverseComplemented()}
    _get_unmapped() { return this.record.isSegmentUnmapped()}
    _get_next_seq_id() { return this.record.mate ? this._store._refIdToName(this.record.mate.sequenceId) : undefined }
    _get_next_segment_position() { return this.record.mate
        ? ( this._store._refIdToName(this.record.mate.sequenceId)+':'+this.record.mate.alignmentStart) : undefined}
    _get_tags() { return this.record.tags }
    _get_seq() { return this.record.getReadBases() }

    constructor(record, store) {
        this.record = record
        this._store = store
    }

    tags() {
        const properties = Object.getOwnPropertyNames(BamSlightlyLazyFeature.prototype)
        return properties
            .filter(prop => /^_get_/.test(prop))
            .map(methodName => methodName.replace('_get_',''))
    }

    id() {
        return this.record.uniqueId + 1
    }

    get(field) {
        const methodName = `_get_${field.toLowerCase()}`
        if (this[methodName]) return this[methodName]()
        return undefined
    }

    parent() {}

    children() {}
}

define( [
            'dojo/_base/declare',
            'JBrowse/Errors',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredStatsMixin',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Model/SimpleFeature',
        ],
        function(
            declare,
            Errors,
            SeqFeatureStore,
            DeferredStatsMixin,
            DeferredFeaturesMixin,
            GlobalStatsEstimationMixin,
            XHRBlob,
            SimpleFeature,
        ) {

return declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, GlobalStatsEstimationMixin ],

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
    constructor: function( args ) {

        let dataBlob
        if (args.bam)
            dataBlob = new BlobFilehandleWrapper(args.bam)
        else if (args.urlTemplate)
            dataBlob = new BlobFilehandleWrapper(new XHRBlob(this.resolveUrl(args.urlTemplate || 'data.bam'), { expectRanges: true }))
        else throw new Error('must provide either `bam` or `urlTemplate`')

        let baiBlob, csiBlob
        if (args.bai)
            baiBlob = new BlobFilehandleWrapper(args.bai)
        else if (args.csi)
            csiBlob = new BlobFilehandleWrapper(args.csi)
        else if (args.baiUrlTemplate)
            baiBlob = new BlobFilehandleWrapper(new XHRBlob(this.resolveUrl(args.baiUrlTemplate)))
        else if (args.csiUrlTemplate)
            csiBlob = new BlobFilehandleWrapper(new XHRBlob(this.resolveUrl(args.csiUrlTemplate)))
        else if (args.urlTemplate)
            baiBlob = new BlobFilehandleWrapper(new XHRBlob(this.resolveUrl(args.urlTemplate+'.bai')))
        else throw new Error('no index provided, must provide a BAI or CSI index')

        this.source = dataBlob.toString()

        // LRU-cache the CRAM object so we don't have to re-download the
        // index when we switch chromosomes
        const cacheKey = `data: ${dataBlob}, index: ${csiBlob||baiBlob}`
        this.bam = bamIndexedFilesCache.get(cacheKey)
        if (!this.bam) {
            this.bam = new BamFile({
                bamFilehandle: dataBlob,
                baiFilehandle: baiBlob,
                csiFilehandle: csiBlob
            })

            bamIndexedFilesCache.set(cacheKey, this.bam)
        }

        // pre-download the index before running the statistics estimation so that the stats
        // estimation doesn't time out
        this.bam.hasDataForReferenceSequence(0)
            .then(() => this.bam.getHeader())
            .then(() => {
                this._deferred.features.resolve({success:true});
            })
            .then(() => this._estimateGlobalStats())
            .then(stats => {
                this.globalStats = stats;
                this._deferred.stats.resolve({success:true});
            })
            .catch(err => {
                this._deferred.features.reject(err)
                this._deferred.stats.reject(err)
            })

        this.storeTimeout = args.storeTimeout || 3000;
    },

//     // process the parsed SAM header from the cram file
//     _setSamHeader(samHeader) {
//         this._samHeader = {}

//         // use the @SQ lines in the header to figure out the
//         // mapping between ref seq ID numbers and names
//         const refSeqIdToName = []
//         const refSeqNameToId = {}
//         const sqLines = samHeader.filter(l => l.tag === 'SQ')
//         sqLines.forEach((sqLine, seqId) => {
//             sqLine.data.forEach(item => {
//                 if (item.tag === 'SN') {
//                     // this is the seq name
//                     const seqName = item.value
//                     refSeqNameToId[seqName] = seqId
//                     refSeqIdToName[seqId] = seqName
//                 }
//             })
//         })
//         if (refSeqIdToName.length) {
//             this._samHeader.refSeqIdToName = refSeqIdToName
//             this._samHeader.refSeqNameToId = refSeqNameToId
//         }
//     },

//     _refNameToId(refName) {
//         // use info from the SAM header if possible, but fall back to using
//         // the ref seq order from when the browser's refseqs were loaded
//         if (this._samHeader.refSeqNameToId)
//             return this._samHeader.refSeqNameToId[refName]
//         else
//             return this.browser.getRefSeqNumber(refName)
//     },

//     _refIdToName(refId) {
//         // use info from the SAM header if possible, but fall back to using
//         // the ref seq order from when the browser's refseqs were loaded
//         if (this._samHeader.refSeqIdToName) {
//             return this._samHeader.refSeqIdToName[refId]
//         } else {
//             let ref = this.browser.getRefSeqById(refId)
//             return ref ? ref.name : undefined
//         }
//     },

//     _getRefSeqStore() {
//         return new Promise((resolve,reject) => {
//             this.browser.getStore('refseqs',resolve,reject)
//         })
//     },

    // used by the CRAM backend to fetch a region of the underlying reference
    // sequence.  needed for some of its calculations
    // async _seqFetch(seqId, start, end) {
    //     start -= 1 // convert from 1-based closed to interbase

    //     const refSeqStore = await this._getRefSeqStore()
    //     if (!refSeqStore) return undefined
    //     const refName = this._refIdToName(seqId)
    //     if (!refName) return undefined

    //     const seqChunks = await new Promise((resolve,reject) => {
    //         let features = []
    //         refSeqStore.getFeatures(
    //             {ref: refName, start: start-1, end},
    //             f => features.push(f),
    //             () => resolve(features),
    //             reject
    //         )
    //     })

    //     const trimmed = []
    //     seqChunks
    //     .sort((a,b) => a.get('start') - b.get('start'))
    //     .forEach( (chunk,i) => {
    //         let chunkStart = chunk.get('start')
    //         let chunkEnd = chunk.get('end')
    //         let trimStart = Math.max(start - chunkStart, 0)
    //         let trimEnd = Math.min(end - chunkStart, chunkEnd-chunkStart)
    //         let trimLength = trimEnd - trimStart
    //         let chunkSeq = chunk.get('seq') || chunk.get('residues')
    //         trimmed.push(chunkSeq.substr(trimStart,trimLength))
    //     })

    //     const sequence = trimmed.join('')
    //     if (sequence.length !== (end-start))
    //         throw new Error(`sequence fetch failed: fetching ${
    //             (start-1).toLocaleString()}-${end.toLocaleString()
    //             } only returned ${
    //                 sequence.length.toLocaleString()
    //             } bases, but should have returned ${
    //                 (end-start).toLocaleString()
    //             }`)
    //     return sequence
    // },

    /**
     * Interrogate whether a store has data for a given reference
     * sequence.  Calls the given callback with either true or false.
     */
    hasRefSeq: function( seqName, callback, errorCallback ) {
        seqName = this.browser.regularizeReferenceName( seqName );

        this._deferred.stats
        .then(() => this.bam.hasDataForReferenceSequence(seqName))
        .then(callback, errorCallback)
    },

    // called by getFeatures from the DeferredFeaturesMixin
    _getFeatures: function( query, featCallback, endCallback, errorCallback ) {
        const seqName = query.ref || this.refSeq.name

        this.bam.getRecordsForRange(seqName, query.start + 1, query.end)
            .then(records => {
                for (let i = 0; i < records.length; i+= 1) {
                    featCallback(this._bamRecordToFeature(records[i]))
                }

                endCallback()
            })
            .catch(err => {
                // map the BamSizeLimitError to JBrowse Errors.DataOverflow
                if (err instanceof BamSizeLimitError) {
                    err = new Errors.DataOverflow(err)
                }

                errorCallback(err)
            })
    },

    _bamRecordToFeature(record) {
        return new BamSlightlyLazyFeature(record, this)
    },

    saveStore: function() {
        return {
            urlTemplate: this.config.cram.url,
            baiUrlTemplate: this.config.bai.url,
            csiUrlTemplate: this.config.csi.url
        };
    }

});
});
