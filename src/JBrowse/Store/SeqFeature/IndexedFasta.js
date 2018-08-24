const LRU = cjsRequire('lru-cache')
const { IndexedFasta } = cjsRequire('@gmod/indexedfasta')
const { Buffer } = cjsRequire('buffer')

const fastaIndexedFilesCache = LRU(5)

const BlobFilehandleWrapper = cjsRequire('../../Model/BlobFilehandleWrapper')

define( [ 'dojo/_base/declare',
          'dojo/_base/lang',
          'dojo/request',
          'dojo/promise/all',
          'dojo/Deferred',
          'JBrowse/Store/SeqFeature',
          'JBrowse/Util',
          'JBrowse/Digest/Crc32',
          'JBrowse/Model/XHRBlob',
          'JBrowse/Model/SimpleFeature',
          'JBrowse/Store/DeferredFeaturesMixin'
        ],
        function(
            declare,
            lang,
            request,
            all,
            Deferred,
            SeqFeatureStore,
            Util,
            Crc32,
            XHRBlob,
            SimpleFeature,
            DeferredFeaturesMixin
        ) {

return declare( [ SeqFeatureStore, DeferredFeaturesMixin ],
{

    /**
     * Storage backend for sequences in indexed fasta files
     * served as static text files.
     * @constructs
     */
    constructor: function(args) {
        let dataBlob
        if (args.fasta)
            dataBlob = new BlobFilehandleWrapper(args.fasta)
        else if (args.urlTemplate)
            dataBlob = new BlobFilehandleWrapper(new XHRBlob(this.resolveUrl(args.urlTemplate), { expectRanges: true }))
        else
            dataBlob = new BlobFilehandleWrapper(new XHRBlob('data.fa', { expectRanges: true }))

        let indexBlob
        if (args.fai)
            indexBlob = new BlobFilehandleWrapper(args.fai)
        else if (args.faiUrlTemplate)
            indexBlob = new BlobFilehandleWrapper(new XHRBlob(this.resolveUrl(args.faiUrlTemplate)))
        else if (args.urlTemplate)
            indexBlob = new BlobFilehandleWrapper(new XHRBlob(this.resolveUrl(args.urlTemplate+'.fai')))
        else throw new Error('no index provided, must provide a FASTA index')

        this.source = dataBlob.toString()

        // LRU-cache the CRAM object so we don't have to re-download the
        // index when we switch chromosomes
        const cacheKey = `data: ${dataBlob}, index: ${indexBlob}`
        this.fasta = fastaIndexedFilesCache.get(cacheKey)
        if (!this.fasta) {
            this.fasta = new IndexedFasta({
                fasta: dataBlob,
                fai: indexBlob
            })

            fastaIndexedFilesCache.set(cacheKey, this.fasta)
        }
        this.fasta.getSequenceList().then(
            () => this._deferred.features.resolve({success:true}),
            () => this._failAllDeferred()
        )
    },

    _getFeatures: function( query, featCallback, endCallback, errorCallback ) {
        this.fasta.getResiduesByName( this.refSeq.name, query.start, query.end ).then((seq) => {
            featCallback(new SimpleFeature({data: {seq, start: query.start, end: query.end}}))
            endCallback()
        },
        errorCallback );
    },

    getRefSeqs: function( featCallback, errorCallback ) {
        this.fasta.getSequenceSizes().then((seqs) => {
            featCallback(seqs);
        }, errorCallback);
    },
    saveStore: function() {
        return {
            urlTemplate: (this.config.file||this.config.blob).url,
            faiUrlTemplate: this.config.fai.url
        };
    }

});
});
