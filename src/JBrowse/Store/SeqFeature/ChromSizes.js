const BlobFilehandleWrapper = cjsRequire('../../Model/BlobFilehandleWrapper')

define( [ 'dojo/_base/declare',
          'dojo/_base/lang',
          'dojo/Deferred',
          'JBrowse/Store/SeqFeature',
          'JBrowse/Model/XHRBlob',
          'JBrowse/Store/DeferredFeaturesMixin'
        ],
        function(
            declare,
            lang,
            Deferred,
            SeqFeatureStore,
            XHRBlob,
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
        if (args.blob)
            dataBlob = new BlobFilehandleWrapper(args.blob)
        else if (args.urlTemplate)
            dataBlob = new BlobFilehandleWrapper(new XHRBlob(this.resolveUrl(args.urlTemplate), { expectRanges: true }))

        this.source = dataBlob.toString()
        this.data = dataBlob
        this.refSeqs = {}

        this.init({
            success: () => this._deferred.features.resolve({success:true}),
            error: () => this._failAllDeferred()
        })
    },

    hasRefSeq: function( seqName, callback, errorCallback ) {
        this.getSequenceSize(seqName)
            .then(
                size => {
                    callback(size !== undefined)
                },
                errorCallback,
            )
    },
    getRefSeqs: function( callback, errorCallback ) {
        this.getSequenceSizes()
            .then(sizes => Object.entries(this.refSeqs).map(([name,length]) => {
                return {
                    name,
                    length,
                    end: length,
                    start: 0,
                }
            }))
            .then(callback, errorCallback)
    },
    getSequenceSize: function(refSeq) {
        return this._deferred.features.then(() => {
            return this.refSeqs[refSeq]
        })
    },
    getSequenceSizes: function() {
        return this._deferred.features.then(() => {
            return this.refSeqs
        })
    },
    init: function( args ) {
        var fasta = this.data;
        var successCallback = args.success || function() {};
        var failCallback = args.failure || function(e) { console.error(e, e.stack); };
        this.parseFile(fasta, data => {
            data.split('\n').forEach(line => {
                if(line.length) {
                    const [name, length] = line.split('\t')
                    this.refSeqs[name] = length
                }
            })
            successCallback();
        }, failCallback );
    },


    parseFile: function(fastaFile, successCallback, failCallback ) {
        fastaFile.readFile().then(text => {
            var chromSizes = "";
            var bytes = new Uint8Array(text);
            var length = bytes.length;
            for (var i = 0; i < length; i++) {
              chromSizes += String.fromCharCode(bytes[i]);
            }

            if (!(chromSizes && chromSizes.length))
                failCallback ("Could not read file: " + fastaFile.name);
            else {
                successCallback(chromSizes);
            }

        }, failCallback );
    },

    saveStore: function() {
        return {
            urlTemplate: (this.config.file||this.config.blob).url,
        };
    }

});
});
