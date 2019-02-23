const LRU = cjsRequire('quick-lru')
const { BigWig } = cjsRequire('@gmod/bbi')

const BlobFilehandleWrapper = cjsRequire('../../Model/BlobFilehandleWrapper')

define( [
            'dojo/_base/declare',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredStatsMixin',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Util',
            'JBrowse/Model/XHRBlob'
        ],
        function(
            declare,
            SeqFeatureStore,
            DeferredFeaturesMixin,
            DeferredStatsMixin,
            Util,
            XHRBlob
        ) {
return declare([ SeqFeatureStore, DeferredFeaturesMixin, DeferredStatsMixin ], {
    constructor: function( args ) {

        let dataBlob
        if (args.blob)
            dataBlob = new BlobFilehandleWrapper(args.blob)
        else if (args.urlTemplate)
            dataBlob = new BlobFilehandleWrapper(new XHRBlob(this.resolveUrl(args.urlTemplate || 'data.bw'), { expectRanges: true }))
        else throw new Error('must provide either `blob` or `urlTemplate`')

        this.bigwig = new BigWig({
            filehandle: dataBlob
        })


        this.source = dataBlob.toString()

        this.bigwig.getHeader(0)
            .then(() => {
                this._deferred.features.resolve({success:true});
            })
            .then(() => this._estimateGlobalStats())
            .then(stats => {
                this.globalStats = stats;
                this._deferred.stats.resolve({success:true});
            })
    },

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                chunkSizeLimit: 30000000 // 30mb
            });
    },

    _getGlobalStats: function( successCallback, errorCallback ) {
        var s = this._globalStats || {};

        // calc mean and standard deviation if necessary
        if( !( 'scoreMean' in s ))
            s.scoreMean = s.basesCovered ? s.scoreSum / s.basesCovered : 0;
        if( !( 'scoreStdDev' in s ))
            s.scoreStdDev = this._calcStdFromSums( s.scoreSum, s.scoreSumSquares, s.basesCovered );

        successCallback( s );
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
        var thisB = this;
        seqName = thisB.browser.regularizeReferenceName( seqName );
        this._deferred.features.then(function() {
            callback( seqName in thisB.refsByName );
        }, errorCallback );
    },

    _getFeatures: function( query, featureCallback, endCallback, errorCallback ) {
        var chrName = this.browser.regularizeReferenceName( query.ref );
        var min = query.start;
        var max = query.end;
        this.bigwig.getFeatures(chrName, min, max, query).then(
            features => {
                features.forEach(featureCallback)
                endCallback()
            },
            errorCallback
        )
    },


    saveStore: function() {
        return {
            urlTemplate: this.config.blob.url
        };
    }

});

});
