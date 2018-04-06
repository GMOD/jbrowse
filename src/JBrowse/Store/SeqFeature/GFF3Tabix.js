import gff from '@gmod/gff'

define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/Deferred',
           'JBrowse/Model/SimpleFeature',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/TabixIndexedFile',
           'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
           'JBrowse/Model/XHRBlob',
       ],
       function(
           declare,
           lang,
           array,
           Deferred,
           SimpleFeature,
           SeqFeatureStore,
           DeferredStatsMixin,
           DeferredFeaturesMixin,
           TabixIndexedFile,
           GlobalStatsEstimationMixin,
           XHRBlob,
           Parser,
       ) {

return declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, GlobalStatsEstimationMixin ],
{

    constructor( args ) {
        var tbiBlob = args.tbi ||
            new XHRBlob(
                this.resolveUrl(
                    this.getConf('tbiUrlTemplate',[]) || this.getConf('urlTemplate',[])+'.tbi'
                )
            )

        var fileBlob = args.file ||
            new XHRBlob(
                this.resolveUrl( this.getConf('urlTemplate',[]) )
            )

        this.indexedData = new TabixIndexedFile(
            {
                tbi: tbiBlob,
                file: fileBlob,
                browser: this.browser,
                chunkSizeLimit: args.chunkSizeLimit || 1000000
            })

        // start our global stats estimation
        this.getHeader()
            .then(
                header => {
                    this._deferred.features.resolve({ success: true })
                    this._estimateGlobalStats()
                        .then(
                            stats => {
                                this.globalStats = stats;
                                this._deferred.stats.resolve( stats )
                            },
                            err => this._failAllDeferred(err)
                        )
                },
                err => this._failAllDeferred(err)
            )
    },

    getHeader() {
        if (this._parsedHeader) return this._parsedHeader

        this._parsedHeader = new Deferred()
        const reject = this._parsedHeader.reject.bind(this._parsedHeader)

        this.indexedData.indexLoaded
            .then( () => {
                const maxFetch = this.indexedData.index.firstDataLine
                    ? this.indexedData.index.firstDataLine.block + this.indexedData.data.blockSize - 1
                    : null

                this.indexedData.data.read(
                    0,
                    maxFetch,
                    bytes => this._parsedHeader.resolve( this.header ),
                    reject
                );
            },
            reject
        )

        return this._parsedHeader
    },

    _getFeatures(query, featureCallback, finishedCallback, errorCallback,allowRedispatch=true) {
        this.getHeader().then(
            () => {
                const lines = []
                this.indexedData.getLines(
                    query.ref || this.refSeq.name,
                    query.start,
                    query.end,
                    line => lines.push(line),
                    () => {
                        // decorate each of the lines with a _fileOffset attribute
                        const gff3 = lines
                            .map(lineRecord => {
                                // add a fileOffset attr to each gff3 line sayings its offset in
                                // the file, we can use this later to synthesize a unique ID for
                                // features that don't have one
                                if (lineRecord.fields[8])
                                    lineRecord.fields[8] += `;fileOffset=${lineRecord.fileOffset}`
                                else
                                    lineRecord.fields[8] = `fileOffset=${lineRecord.fileOffset}`
                                return lineRecord.fields.join('\t')
                            })
                            .join('\n')
                        const features = gff.parseStringSync(
                            gff3,
                            {
                                parseFeatures: true,
                                parseComments: false,
                                parseDirectives: false,
                                parseSequences: false,
                            })

                        // If this is the first fetch, check whether
                        // any of the features protrude out of the queried range.
                        // If it is, redo the fetch to fetch the max span of the features, so
                        // that we will get all of the child features of the top-level features.
                        // This assumes that child features will always fall within the span
                        // of the parent feature, which isn't true in the general case, but
                        // this should work for most use cases
                        if (allowRedispatch && features.length) {
                            let minStart = Infinity
                            let maxEnd = -Infinity
                            features.forEach( featureLocs => featureLocs.forEach( featureLoc => {
                                if (featureLoc.start < minStart) minStart = featureLoc.start
                                if (featureLoc.end > maxEnd) maxEnd = featureLoc.end
                            }))
                            if (maxEnd > query.end || minStart < query.start) {
                                let newQuery = Object.assign({},query,{ start: minStart, end: maxEnd })
                                // make a new feature callback to only return top-level features
                                // in the original query range
                                let newFeatureCallback = feature => {
                                    if (feature.get('start') < query.end && feature.get('end') > query.start)
                                        featureCallback(feature)
                                }
                                this._getFeatures(newQuery,newFeatureCallback,finishedCallback,errorCallback,false)
                                return
                            }
                        }

                        features.forEach( feature =>
                            this._formatFeatures(feature).forEach(featureCallback)
                        )
                        finishedCallback()
                    },
                    errorCallback
                )
            },
            errorCallback
        )
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

        this.getHeader().then(
            () => {
                this.indexedData.getLines(
                    query.ref || this.refSeq.name,
                    query.start,
                    query.end,
                    line => {
                        // var feat = this.lineToFeature(line);
                        // if(!feat.attributes.parent) // only count if has NO parent
                        const start = line.start ;
                        let binValue = Math.round( (start - query.start )* binRatio)

                        // in case it extends over the end, just push it on the end
                        binValue = binValue >= 0 ? binValue : 0 ;
                        binValue = binValue < histogram.length ? binValue : histogram.length -1

                        histogram[binValue] += 1
                        if (histogram[binValue] > stats.max) {
                            stats.max = histogram[binValue]
                        }
                    },
                    () => {
                        successCallback({ bins: histogram, stats: stats})
                    },
                    errorCallback
                );
            },
            errorCallback
        )
    },

       // flatten array like [ [1,2], [3,4] ] to [ 1,2,3,4 ]
    _flattenOneLevel( ar ) {
        const r = [];
        for (let i = 0; i < ar.length; i +=1) {
            r.push(...ar[i])
        }
        return r;
    },

    _featureData(data) {
        const f = Object.assign({}, data )
        delete f.child_features
        delete f.data
        delete f.derived_features
        f.start -= 1 // convert to interbase
        f.strand = {'+': 1, '-': -1, '.': 0, '?': undefined}[f.strand] // convert strand
        for (var a in data.attributes) {
            f[a.toLowerCase()] = data.attributes[a].join(',')
        }
        delete f.fileoffset
        delete f.attributes
        var sub = this._flattenOneLevel(
            data.child_features
            .map( child => this._formatFeatures(child) )
        )
        if (sub.length) {
            f.subfeatures = sub
        }

        return f;
    },

    /**
     * A GFF3 feature is an arrayref of that feature's locations. Because a single feature could be
     * in multiple locations. To match that with the JBrowse feature model, we treat each of those
     * locations as a separate feature, and disambiguate them by appending an index to their ID
     */
    _formatFeatures( featureLocs ) {
        const features = []
        featureLocs.forEach((featureLoc, locIndex) => {
            let ids = featureLoc.attributes.ID || [`offset-${featureLoc.attributes.fileOffset[0]}`]
            ids.forEach((id,idIndex) => {
                var f = new SimpleFeature({
                    data: this._featureData( featureLoc ),
                    id: idIndex === 0 ? id : `${id}-${idIndex+1}`
                });
                f._reg_seq_id = this.browser.regularizeReferenceName(featureLoc.seq_id)
                features.push(f)
            })
        })
        return features
    },

    /**
     * Interrogate whether a store has data for a given reference
     * sequence.  Calls the given callback with either true or false.
     *
     * Implemented as a binary interrogation because some stores are
     * smart enough to regularize reference sequence names, while
     * others are not.
     */
    hasRefSeq( seqName, callback, errorCallback ) {
        return this.indexedData.index.hasRefSeq( seqName, callback, errorCallback );
    },

    saveStore() {
        return {
            urlTemplate: this.config.file.url,
            tbiUrlTemplate: this.config.tbi.url
        };
    }


});
});
