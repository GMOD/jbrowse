const { IndexedCramFile, CraiIndex } = require('@gmod/cram/src')
const { Buffer } = require('buffer')

define( [
            'dojo/_base/declare',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredStatsMixin',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Model/SimpleFeature',
        ],
        function(
            declare,
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
        const cramArgs = {}

        let dataBlob
        if (args.cram)
            dataBlob = args.cram
        else if (args.urlTemplate)
            dataBlob = new XHRBlob(this.resolveUrl(args.urlTemplate || 'data.cram'))
        else throw new Error('must provide either `cram` or `urlTemplate`')
        cramArgs.cramFilehandle = new BlobWrapper(dataBlob)

        if (args.crai)
            cramArgs.index = new CraiIndex({ filehandle: new BlobWrapper(args.crai)})
        else if (args.craiUrlTemplate)
            cramArgs.index = new CraiIndex({filehandle: new BlobWrapper(new XHRBlob(this.resolveUrl(args.craiUrlTemplate)))})
        else throw new Error('no index provided, must provide a CRAM index')
        // TODO: need to add .csi index support

        this.cram = new IndexedCramFile(cramArgs)

        this.source = ( dataBlob.url  ? dataBlob.url.match( /\/([^/\#\?]+)($|[\#\?])/ )[1] :
                        dataBlob.blob ? dataBlob.blob.name : undefined ) || undefined;


        this.cram.hasDataForReferenceSequence(0)
            .then( () => {
                this._deferred.features.resolve({success:true});
            })
            .then( () => this._estimateGlobalStats())
            .then( stats => {
                this.globalStats = stats;
                this._deferred.stats.resolve({success:true});
            })

        this.storeTimeout = args.storeTimeout || 3000;
    },

    _refNameToId(refName) {
        return this.browser.getRefSeqNumber(refName)
    },

    /**
     * Interrogate whether a store has data for a given reference
     * sequence.  Calls the given callback with either true or false.
     *
     * Implemented as a binary interrogation because some stores are
     * smart enough to regularize reference sequence names, while
     * others are not.
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

        this.cram.getFeaturesForRange(refSeqNumber, query.start, query.end)
            .then(records => {
                records.forEach( record => {
                    featCallback( this._cramRecordToFeature(record))
                })

                endCallback()
            })
            .catch(errorCallback)
    },

    _cramRecordToFeature(feature) {
        const data = {
            name: feature.readName,
            start: feature.alignmentStart-1,
            end: feature.alignmentStart+feature.readLength-1,
            read_features: feature.readFeatures,
            type: 'match',
            MQ: feature.mappingQuality,
            flags: feature.flags,
            cramFlags: feature.compressionFlags,
            strand: feature.isReverseComplemented() ? -1 : 1,

            qc_failed: feature.isFailedQc(),
            secondary_alignment: feature.isSecondary(),
            supplementary_alignment: feature.isSupplementary(),
            multi_segment_template: feature.isPaired(),
            multi_segment_all_aligned: feature.isProperlyPaired(),
            unmapped: feature.isSegmentUnmapped(),
        }
        Object.assign(data,feature.tags || {})
        return new SimpleFeature({
            data,
            id: feature.uniqueId
        })
    },

    saveStore: function() {
        return {
            urlTemplate: this.config.bam.url,
            baiUrlTemplate: this.config.bai.url
        };
    }

});
});
