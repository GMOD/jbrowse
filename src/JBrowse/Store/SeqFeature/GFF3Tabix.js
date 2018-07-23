import gff from '@gmod/gff'

define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/Deferred',
           'JBrowse/Util',
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
           Util,
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
    supportsFeatureTransforms: true,

    constructor( args ) {
        this.dontRedispatch = (args.dontRedispatch||"").split( /\s*,\s*/ );
        var csiBlob, tbiBlob;

        if(args.csi || this.config.csiUrlTemplate) {
            csiBlob = args.csi ||
                new XHRBlob(
                    this.resolveUrl(
                        this.getConf('csiUrlTemplate',[])
                    )
                );
        } else {
            tbiBlob = args.tbi ||
                new XHRBlob(
                    this.resolveUrl(
                        this.getConf('tbiUrlTemplate',[]) || this.getConf('urlTemplate',[])+'.tbi'
                    )
                );
        }

        var fileBlob = args.file ||
            new XHRBlob(
                this.resolveUrl( this.getConf('urlTemplate',[]) ),
                { expectRanges: true }
            )

        this.indexedData = new TabixIndexedFile(
            {
                tbi: tbiBlob,
                csi: csiBlob,
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

    _getFeatures(query, featureCallback, finishedCallback, errorCallback, allowRedispatch = true) {
        this.getHeader().then(
            () => {
                const lines = []
                this.indexedData.getLines(
                    query.ref || this.refSeq.name,
                    query.start,
                    query.end,
                    line => lines.push(line),
                    () => {
                        // If this is the first fetch (allowRedispatch is true), check whether
                        // any of the features protrude out of the queried range.
                        // If it is, redo the fetch to fetch the max span of the features, so
                        // that we will get all of the child features of the top-level features.
                        // This assumes that child features will always fall within the span
                        // of the parent feature, which isn't true in the general case, but
                        // this should work for most use cases
                        if (allowRedispatch && lines.length) {
                            let minStart = Infinity
                            let maxEnd = -Infinity
                            lines.forEach( line => {
                                if(!this.dontRedispatch.includes(line.fields[2])) {
                                    let start = line.start-1 // tabix indexes are 1-based
                                    if (start < minStart) minStart = start
                                    if (line.end > maxEnd) maxEnd = line.end
                                }
                            })
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

                        // decorate each of the lines with a _fileOffset attribute
                        const gff3 = lines
                            .map(lineRecord => {
                                // add a fileOffset attr to each gff3 line sayings its offset in
                                // the file, we can use this later to synthesize a unique ID for
                                // features that don't have one
                                if (lineRecord.fields[8] &&  lineRecord.fields[8] !== '.') {
                                     if (!lineRecord.fields[8].includes('_tabixFileOffset'))
                                        lineRecord.fields[8] += `;_tabixFileOffset=${lineRecord.fileOffset}`
                                } else {
                                    lineRecord.fields[8] = `_tabixFileOffset=${lineRecord.fileOffset}`
                                }
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

                        features.forEach( feature =>
                            this.applyFeatureTransforms(
                                this._formatFeatures(feature)
                            )
                            .forEach(featureCallback)
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

        this._getFeatures(query,
            feature => {
                let binValue = Math.round( (feature.get('start') - query.start )* binRatio)
                let binValueEnd = Math.round( (feature.get('end')- query.start )* binRatio)

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



    _featureData(data) {
        const f = Object.assign({}, data )
        delete f.child_features
        delete f.data
        delete f.derived_features
        f.start -= 1 // convert to interbase
        f.strand = {'+': 1, '-': -1, '.': 0, '?': undefined}[f.strand] // convert strand
        for (var a in data.attributes) {
            let b = a.toLowerCase();
            f[b] = data.attributes[a]
            if(f[b].length == 1) f[b] = f[b][0]
        }
        f.uniqueID = `offset-${f._tabixfileoffset}`

        delete f._tabixfileoffset
        delete f.attributes
        // the SimpleFeature constructor takes care of recursively inflating subfeatures
        if (data.child_features && data.child_features.length) {
            f.subfeatures = Util.flattenOneLevel(
                data.child_features
                .map( childLocs =>
                    childLocs.map(childLoc =>
                        this._featureData(childLoc)
                    )
                )
            )
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
            let ids = featureLoc.attributes.ID || [`offset-${featureLoc.attributes._tabixFileOffset[0]}`]
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
            tbiUrlTemplate: ((this.config.tbi)||{}).url,
            csiUrlTemplate: ((this.config.csi)||{}).url
        };
    }


});
});
