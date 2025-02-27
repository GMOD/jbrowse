const gff = cjsRequire('@gmod/gff').default
const { TabixIndexedFile } = cjsRequire('@gmod/tabix')

define([
  'dojo/_base/declare',
  'JBrowse/Util',
  'JBrowse/Errors',
  'JBrowse/Model/SimpleFeature',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Store/DeferredStatsMixin',
  'JBrowse/Store/DeferredFeaturesMixin',
  'JBrowse/Store/SeqFeature/IndexedStatsEstimationMixin',
  'JBrowse/Store/SeqFeature/RegionStatsMixin',
  'JBrowse/Model/BlobFilehandleWrapper',
  'JBrowse/Model/XHRBlob',
], function (
  declare,
  Util,
  Errors,
  SimpleFeature,
  SeqFeatureStore,
  DeferredStatsMixin,
  DeferredFeaturesMixin,
  IndexedStatsEstimationMixin,
  RegionStatsMixin,
  BlobFilehandleWrapper,
  XHRBlob,
) {
  return declare(
    [
      SeqFeatureStore,
      DeferredStatsMixin,
      DeferredFeaturesMixin,
      IndexedStatsEstimationMixin,
      RegionStatsMixin,
    ],
    {
      supportsFeatureTransforms: true,

      constructor(args) {
        this.dontRedispatch = (
          args.dontRedispatch || 'chromosome,region'
        ).split(/\s*,\s*/)
        var csiBlob, tbiBlob

        if (args.csi || this.config.csiUrlTemplate) {
          csiBlob =
            args.csi ||
            new XHRBlob(this.resolveUrl(this.getConf('csiUrlTemplate', [])))
        } else {
          tbiBlob =
            args.tbi ||
            new XHRBlob(
              this.resolveUrl(
                this.getConf('tbiUrlTemplate', []) ||
                  `${this.getConf('urlTemplate', [])}.tbi`,
              ),
            )
        }

        var fileBlob =
          args.file ||
          new XHRBlob(this.resolveUrl(this.getConf('urlTemplate', [])), {
            expectRanges: true,
          })

        this.indexedData = new TabixIndexedFile({
          filehandle: new BlobFilehandleWrapper(fileBlob),
          tbiFilehandle: tbiBlob && new BlobFilehandleWrapper(tbiBlob),
          csiFilehandle: csiBlob && new BlobFilehandleWrapper(csiBlob),
          chunkSizeLimit: args.chunkSizeLimit || 50000000,
          renameRefSeqs: n => this.browser.regularizeReferenceName(n),
        })

        // start our global stats estimation
        this.indexedData.lineCount('nonexistent').then(
          () => {
            this._deferred.features.resolve({ success: true })
            this._estimateGlobalStats().then(
              stats => {
                this.globalStats = stats
                this._deferred.stats.resolve(stats)
              },
              err => this._failAllDeferred(err),
            )
          },
          err => this._failAllDeferred(err),
        )
      },

      _parseLine(columnNumbers, line, fileOffset) {
        const fields = line.split('\t')

        return {
          // note: index column numbers are 1-based
          start: parseInt(fields[columnNumbers.start - 1]),
          end: parseInt(fields[columnNumbers.end - 1]),
          lineHash: fileOffset,
          fields,
        }
      },

      _getFeatures(
        query,
        featureCallback,
        finishedCallback,
        errorCallback,
        allowRedispatch = true,
      ) {
        this.indexedData.getMetadata().then(metadata => {
          const regularizedReferenceName = this.browser.regularizeReferenceName(
            query.ref,
          )
          const lines = []
          this.indexedData
            .getLines(
              regularizedReferenceName || this.refSeq.name,
              query.start,
              query.end,
              (line, fileOffset) => {
                lines.push(
                  this._parseLine(metadata.columnNumbers, line, fileOffset),
                )
              },
            )
            .then(
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
                  lines.forEach(line => {
                    const featureType = line.fields[2]
                    // only expand redispatch range if the feature is not in dontRedispatch,
                    // and is a top-level feature
                    if (
                      !this.dontRedispatch.includes(featureType) &&
                      this._isTopLevelFeatureType(featureType)
                    ) {
                      let start = line.start - 1 // gff is 1-based
                      if (start < minStart) {
                        minStart = start
                      }
                      if (line.end > maxEnd) {
                        maxEnd = line.end
                      }
                    }
                  })
                  if (maxEnd > query.end || minStart < query.start) {
                    // console.log(`redispatching ${query.start}-${query.end} => ${minStart}-${maxEnd}`)
                    let newQuery = Object.assign({}, query, {
                      start: minStart,
                      end: maxEnd,
                    })
                    // make a new feature callback to only return top-level features
                    // in the original query range
                    const newFeatureCallback = feature => {
                      if (
                        feature.get('start') < query.end &&
                        feature.get('end') > query.start
                      ) {
                        featureCallback(feature)
                      }
                    }
                    this._getFeatures(
                      newQuery,
                      newFeatureCallback,
                      finishedCallback,
                      errorCallback,
                      false,
                    )
                    return
                  }
                }

                // decorate each of the lines with a _lineHash attribute
                const gff3 = lines
                  .map(lineRecord => {
                    // add a lineHash attr to each gff3 line sayings its offset in
                    // the file, we can use this later to synthesize a unique ID for
                    // features that don't have one
                    if (lineRecord.fields[8] && lineRecord.fields[8] !== '.') {
                      if (!lineRecord.fields[8].includes('_lineHash')) {
                        lineRecord.fields[8] += `;_lineHash=${lineRecord.lineHash}`
                      }
                    } else {
                      lineRecord.fields[8] = `_lineHash=${lineRecord.lineHash}`
                    }
                    return lineRecord.fields.join('\t')
                  })
                  .join('\n')
                const features = gff.parseStringSync(gff3, {
                  parseFeatures: true,
                  parseComments: false,
                  parseDirectives: false,
                  parseSequences: false,
                })

                features.forEach(feature =>
                  this.applyFeatureTransforms(
                    this._formatFeatures(feature),
                  ).forEach(featureCallback),
                )
                finishedCallback()
              },
              error => {
                if (errorCallback) {
                  if (
                    error.message &&
                    error.message.indexOf('Too much data') >= 0
                  ) {
                    error = new Errors.DataOverflow(error.message)
                  }
                  errorCallback(error)
                } else {
                  console.error(error)
                }
              },
            )
            .catch(errorCallback)
        }, errorCallback)
      },

      _featureData(data) {
        const f = Object.assign({}, data)
        delete f.child_features
        delete f.data
        delete f.derived_features
        f.start -= 1 // convert to interbase
        f.strand = { '+': 1, '-': -1, '.': 0, '?': undefined }[f.strand] // convert strand
        const defaultFields = [
          'start',
          'end',
          'seq_id',
          'score',
          'type',
          'source',
          'phase',
          'strand',
        ]
        for (var a in data.attributes) {
          let b = a.toLowerCase()
          if (defaultFields.includes(b)) {
            b += '2'
          } //reproduce behavior of NCList
          f[b] = data.attributes[a]
          if (f[b].length == 1) {
            f[b] = f[b][0]
          }
        }
        f.uniqueID = `offset-${f._linehash}`

        delete f._linehash
        delete f.attributes
        // the SimpleFeature constructor takes care of recursively inflating subfeatures
        if (data.child_features && data.child_features.length) {
          f.subfeatures = Util.flattenOneLevel(
            data.child_features.map(childLocs =>
              childLocs.map(childLoc => this._featureData(childLoc)),
            ),
          )
        }

        return f
      },

      /**
       * A GFF3 feature is an arrayref of that feature's locations. Because a single feature could be
       * in multiple locations. To match that with the JBrowse feature model, we treat each of those
       * locations as a separate feature, and disambiguate them by appending an index to their ID
       */
      _formatFeatures(featureLocs) {
        const features = []
        featureLocs.forEach((featureLoc, locIndex) => {
          let ids = featureLoc.attributes.ID || [
            `offset-${featureLoc.attributes._lineHash[0]}`,
          ]
          ids.forEach((id, idIndex) => {
            var f = new SimpleFeature({
              data: this._featureData(featureLoc),
              id: idIndex === 0 ? id : `${id}-${idIndex + 1}`,
            })
            f._reg_seq_id = this.browser.regularizeReferenceName(
              featureLoc.seq_id,
            )
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
      hasRefSeq(seqName, callback, errorCallback) {
        return this.indexedData.hasRefSeq(seqName, callback, errorCallback)
      },

      saveStore() {
        return {
          urlTemplate: this.config.file.url,
          tbiUrlTemplate: (this.config.tbi || {}).url,
          csiUrlTemplate: (this.config.csi || {}).url,
        }
      },
    },
  )
})
