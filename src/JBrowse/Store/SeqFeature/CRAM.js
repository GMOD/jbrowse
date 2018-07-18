const LRU = cjsRequire('lru-cache')
const { IndexedCramFile, CraiIndex } = cjsRequire('@gmod/cram')
const { CramSizeLimitError } = cjsRequire('@gmod/cram/errors')

const { Buffer } = cjsRequire('buffer')

const cramIndexedFilesCache = LRU(5)

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


// wrapper class to make old JBrowse *Blob data access classes work with
// the new-style filehandle API expected by the cram code

class BlobWrapper {
    constructor(oldStyleBlob) {
        this.blob = oldStyleBlob
    }

    read(buffer, offset = 0, length, position) {
        return new Promise((resolve,reject) => {
            this.blob.read(
                position,
                length,
                dataArrayBuffer => {
                    const data = Buffer.from(dataArrayBuffer)
                    data.copy(buffer, offset)
                    resolve()
                },
                reject,
            )
        })
    }

    readFile() {
        return new Promise((resolve, reject) => {
            this.blob.fetch( dataArrayBuffer => {
                resolve(Buffer.from(dataArrayBuffer))
            }, reject)
        })
    }

    stat() {
        return new Promise((resolve, reject) => {
            this.blob.stat(resolve, reject)
        })
    }

    toString() {
        return ( this.blob.url  ? this.blob.url :
                 this.blob.blob ? this.blob.blob.name : undefined ) || undefined;
    }
}


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
        if (args.cram)
            dataBlob = new BlobWrapper(args.cram)
        else if (args.urlTemplate)
            dataBlob = new BlobWrapper(new XHRBlob(this.resolveUrl(args.urlTemplate || 'data.cram')))
        else throw new Error('must provide either `cram` or `urlTemplate`')

        let indexBlob
        if (args.crai)
            indexBlob = new BlobWrapper(args.crai)
        else if (args.craiUrlTemplate)
            indexBlob = new BlobWrapper(new XHRBlob(this.resolveUrl(args.craiUrlTemplate)))
        else if (args.urlTemplate)
            indexBlob = new BlobWrapper(new XHRBlob(this.resolveUrl(args.urlTemplate+'.crai')))
        else throw new Error('no index provided, must provide a CRAM index')

        this.source = dataBlob.toString()

        // LRU-cache the CRAM object so we don't have to re-download the
        // index when we switch chromosomes
        const cacheKey = `data: ${dataBlob}, index: ${indexBlob}`
        this.cram = cramIndexedFilesCache.get(cacheKey)
        if (!this.cram) {
            this.cram = new IndexedCramFile({
                cramFilehandle: dataBlob,
                index: new CraiIndex({filehandle: indexBlob}),
                seqFetch: this._seqFetch.bind(this),
                checkSequenceMD5: false,
            })

            cramIndexedFilesCache.set(cacheKey, this.cram)
        }

        // pre-download the index before running the statistics estimation so that the stats
        // estimation doesn't time out
        this.cram.hasDataForReferenceSequence(0)
            .then(() => this.cram.cram.getSamHeader())
            .then(samHeader => {
                this._setSamHeader(samHeader)
            })
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
        else
            return this.browser.getRefSeqNumber(refName)
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
        return new Promise((resolve,reject) => {
            this.browser.getStore('refseqs',resolve,reject)
        })
    },

    // used by the CRAM backend to fetch a region of the underlying reference
    // sequence.  needed for some of its calculations
    async _seqFetch(seqId, start, end) {
        start -= 1 // convert from 1-based closed to interbase

        const refSeqStore = await this._getRefSeqStore()
        if (!refSeqStore) return undefined
        const refName = this._refIdToName(seqId)
        if (!refName) return undefined

        const seqChunks = await new Promise((resolve,reject) => {
            let features = []
            refSeqStore.getFeatures(
                {ref: refName, start: start-1, end},
                f => features.push(f),
                () => resolve(features),
                reject
            )
        })

        const trimmed = []
        seqChunks
        .sort((a,b) => a.get('start') - b.get('start'))
        .forEach( (chunk,i) => {
            let chunkStart = chunk.get('start')
            let chunkEnd = chunk.get('end')
            let trimStart = Math.max(start - chunkStart, 0)
            let trimEnd = Math.min(end - chunkStart, chunkEnd-chunkStart)
            let trimLength = trimEnd - trimStart
            let chunkSeq = chunk.get('seq') || chunk.get('residues')
            trimmed.push(chunkSeq.substr(trimStart,trimLength))
        })

        const sequence = trimmed.join('')
        if (sequence.length !== (end-start))
            throw new Error(`sequence fetch failed: fetching ${
                (start-1).toLocaleString()}-${end.toLocaleString()
                } only returned ${
                    sequence.length.toLocaleString()
                } bases, but should have returned ${
                    (end-start).toLocaleString()
                }`)
        return sequence
    },

    /**
     * Interrogate whether a store has data for a given reference
     * sequence.  Calls the given callback with either true or false.
     */
    hasRefSeq: function( seqName, callback, errorCallback ) {
        seqName = this.browser.regularizeReferenceName( seqName );
        const refSeqNumber = this._refNameToId(seqName)
        if (refSeqNumber === undefined) callback(false)

        this._deferred.stats
        .then(() => this.cram.hasDataForReferenceSequence(refSeqNumber))
        .then(callback, errorCallback)
    },

    // called by getFeatures from the DeferredFeaturesMixin
    _getFeatures: function( query, featCallback, endCallback, errorCallback ) {
        //this.bam.fetch( query.ref ? query.ref : this.refSeq.name, query.start, query.end, featCallback, endCallback, errorCallback );
        const seqName = query.ref || this.refSeq.name
        const refSeqNumber = this._refNameToId(seqName)
        if (refSeqNumber === undefined) {
            endCallback()
            return
        }

        this.cram.getRecordsForRange(refSeqNumber, query.start + 1, query.end)
            .then(records => {
                for (let i = 0; i < records.length; i+= 1) {
                    featCallback(this._cramRecordToFeature(records[i]))
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

    _cramRecordToFeature(record) {
        const data = {
            name: record.readName,
            start: record.alignmentStart-1,
            end: record.alignmentStart+record.lengthOnRef-1,
            cram_read_features: record.readFeatures,
            type: 'match',
            mapping_quality: record.mappingQuality,
            flags: `0x${record.flags.toString(16)}`,
            cramFlags: `0x${record.cramFlags.toString(16)}`,
            strand: record.isReverseComplemented() ? -1 : 1,
            qual: (record.qualityScores || []).map(q => q+33).join(' '),
            seq: record.readBases,
            seq_id: this._refIdToName(record.sequenceId),

            qc_failed: record.isFailedQc(),
            secondary_alignment: record.isSecondary(),
            supplementary_alignment: record.isSupplementary(),
            multi_segment_template: record.isPaired(),
            multi_segment_all_correctly_aligned: record.isProperlyPaired(),
            multi_segment_next_segment_unmapped: record.isMateUnmapped(),
            multi_segment_first: record.isRead1(),
            multi_segment_last: record.isRead2(),
            multi_segment_next_segment_reversed: record.isMateReverseComplemented(),
            unmapped: record.isSegmentUnmapped(),
            next_seq_id: record.mate ? this._refIdToName(record.mate.sequenceId) : undefined,
            next_segment_position: record.mate
                ? ( this._refIdToName(record.mate.sequenceId)+':'+record.mate.alignmentStart) : undefined,
            tags: record.tags,
        }
        return new SimpleFeature({
            data,
            id: (record.uniqueId + 1).toString(),
        })
    },

    saveStore: function() {
        return {
            urlTemplate: this.config.cram.url,
            craiUrlTemplate: this.config.crai.url
        };
    }

});
});
