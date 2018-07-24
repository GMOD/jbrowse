import gff from '@gmod/gff'

define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/Deferred',
            'JBrowse/Util',
            'JBrowse/Model/SimpleFeature',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Store/DeferredStatsMixin',
            'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
            'JBrowse/Model/XHRBlob'
        ],
        function(
            declare,
            lang,
            array,
            Deferred,
            Util,
            SimpleFeature,
            SeqFeatureStore,
            DeferredFeatures,
            DeferredStats,
            GlobalStatsEstimationMixin,
            XHRBlob,
        ) {

return declare([ SeqFeatureStore, DeferredFeatures, DeferredStats, GlobalStatsEstimationMixin ],

 /**
  * @lends JBrowse.Store.SeqFeature.GFF3
  */
{
    constructor: function( args ) {
        this.data = args.blob ||
            new XHRBlob( this.resolveUrl(
                this._evalConf(args.urlTemplate)
              )
            );
        this.features = [];
        this._loadFeatures();
    },

    _loadFeatures() {
        const features = this.bareFeatures = [];

        let featuresSorted = true;
        const seenRefs = this.refSeqs = {};

        let addFeature = fs => {
            fs.forEach( feature => {
                var prevFeature = features[ features.length-1 ];
                var regRefName = this.browser.regularizeReferenceName( feature.seq_id );
                if( regRefName in seenRefs && prevFeature && prevFeature.seq_id != feature.seq_id )
                    featuresSorted = false;
                if( prevFeature && prevFeature.seq_id == feature.seq_id && feature.start < prevFeature.start )
                    featuresSorted = false;

                if( !( regRefName in seenRefs ))
                    seenRefs[ regRefName ] = features.length;

                features.push( feature );
            });
        }

        let endFeatures = () => {
            if( ! featuresSorted ) {
                features.sort( this._compareFeatureData );
                // need to rebuild the refseq index if changing the sort order
                this._rebuildRefSeqs( features );
            }

            this._estimateGlobalStats()
                 .then( stats => {
                    this.globalStats = stats;
                    this._deferred.stats.resolve();
                 })

            this._deferred.features.resolve( features );
        }

        const fail = this._failAllDeferred.bind(this)

        const parseStream = gff.parseStream({
                parseFeatures: true,
                parseSequences: false,
            })
            .on('data', addFeature)
            .on('end', endFeatures)
            .on('error', fail)

        // parse the whole file and store it
        this.data.fetchLines(
            line => parseStream.write(line),
            () => parseStream.end(),
            fail
        )
    },

    _rebuildRefSeqs: function( features ) {
        var refs = {};
        for( var i = 0; i<features.length; i++ ) {
            var regRefName = this.browser.regularizeReferenceName( features[i].seq_id );

            if( !( regRefName in refs ) )
                refs[regRefName] = i;
        }
        this.refSeqs = refs;
    },

    _compareFeatureData: function( a, b ) {
        if( a.seq_id < b.seq_id )
            return -1;
        else if( a.seq_id > b.seq_id )
            return 1;

        return a.start - b.start;
    },

    _getFeatures: function( query, featureCallback, finishedCallback, errorCallback ) {
        var thisB = this;
        thisB._deferred.features.then( function() {
            thisB._search( query, featureCallback, finishedCallback, errorCallback );
        });
    },

    _search: function( query, featureCallback, finishCallback, errorCallback ) {
        // search in this.features, which are sorted
        // by ref and start coordinate, to find the beginning of the
        // relevant range
        var bare = this.bareFeatures;
        var converted = this.features;

        var refName = this.browser.regularizeReferenceName( query.ref );

        var i = this.refSeqs[ refName ];
        if( !( i >= 0 )) {
            finishCallback();
            return;
        }

        var checkEnd = 'start' in query
            ? function(f) { return f.get('end') >= query.start; }
            : function() { return true; };

        for( ; i<bare.length; i++ ) {
            // lazily convert the bare feature data to JBrowse features
            var f = converted[i] ||
                ( converted[i] = function(b,i) {
                      bare[i] = false;
                      return this._formatFeature( b );
                  }.call( this, bare[i], i )
                );
            // features are sorted by ref seq and start coord, so we
            // can stop if we are past the ref seq or the end of the
            // query region
            if( f._reg_seq_id != refName || f.get('start') > query.end )
                break;

            if( checkEnd( f ) ) {
                this.applyFeatureTransforms([f]).forEach(featureCallback)
            }
        }

        finishCallback();
    },

    supportsFeatureTransforms: true,

    _formatFeature: function( data ) {
        var f = new SimpleFeature({
            data: this._featureData( data ),
            id: (data.attributes.ID||[])[0]
        });
        f._reg_seq_id = this.browser.regularizeReferenceName( data.seq_id );
        return f;
    },

    _featureData: function( data ) {
        const f = lang.mixin( {}, data );
        delete f.child_features;
        delete f.derived_features;
        delete f.attributes;
        f.start -= 1; // convert to interbase
        f.strand = {'+': 1, '-': -1, '.': 0, '?': undefined }[data.strand];
        for (var a in data.attributes) {
            let b = a.toLowerCase();
            f[b] = data.attributes[a]
            if(f[b].length == 1) f[b] = f[b][0]
        }
        var sub = array.map( Util.flattenOneLevel( data.child_features ), this._featureData, this );
        if( sub.length )
            f.subfeatures = sub;

        return f;
    },


    getRegionFeatureDensities(query, successCallback, errorCallback) {
        let numBins
        let basesPerBin

        if (query.numBins) {
            numBins = query.numBins;
            basesPerBin = (query.end - query.start)/numBins
        } else if (query.basesPerBin) {
            basesPerBin = query.basesPerBin || query.ref.basesPerBin
            numBins = Math.ceil((query.end-query.start)/basesPerBin)
        } else {
            throw new Error('numBins or basesPerBin arg required for getRegionFeatureDensities')
        }

        const statEntry = (function (basesPerBin, stats) {
            for (var i = 0; i < stats.length; i++) {
                if (stats[i].basesPerBin >= basesPerBin) {
                    return stats[i]
                }
            }
            return undefined
        })(basesPerBin, [])

        const stats = {}
        stats.basesPerBin = basesPerBin

        stats.scoreMax = 0
        stats.max = 0
        const firstServerBin = Math.floor( query.start / basesPerBin)
        const histogram = []
        const binRatio = 1 / basesPerBin

        let binStart
        let binEnd

        for (var bin = 0 ; bin < numBins ; bin++) {
            histogram[bin] = 0
        }

        this._getFeatures(query,
            feat => {
                let binValue = Math.round( (feat.get('start') - query.start )* binRatio)
                let binValueEnd = Math.round( (feat.get('end') - query.start )* binRatio)

                for(let bin = binValue; bin <= binValueEnd; bin++) {
                    histogram[bin] += 1
                    if (histogram[bin] > stats.max) {
                        stats.max = histogram[bin]
                    }
                }
            },
            () => {
                successCallback({ bins: histogram, stats: stats})
            },
            errorCallback
        );

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
        this._deferred.features.then( function() {
            callback( thisB.browser.regularizeReferenceName( seqName ) in thisB.refSeqs );
        });
    },

    saveStore: function() {
        return {
            urlTemplate: this.config.blob.url
        };
    }

});
});
