define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            './BigWig',
            './BigWig/Window',
            'JBrowse/Model/SimpleFeature'
        ],
        function(
            declare,
            lang,
            array,
            BigWig,
            Window,
            SimpleFeature
        ) {

const predefinedFeatureTransforms = {
    // transform a transcript with blocks and thickStart and thickEnd into CDS and UTR features
    ucsc_processed_transcript(features) {
        return features.map( feature => {
            const children = feature.children()
            // split the blocks into UTR, CDS, and exons
            const thickStart = feature.get('thick_start')
            const thickEnd = feature.get('thick_end')

            if (!thickStart && !thickEnd) return feature

            const blocks = children
                .filter(child => child.get('type') === 'block')
                .sort((a,b) => a.get('start') - b.get('start'))
            const newChildren = []
            blocks.forEach( block => {
                const start = block.get('start')
                const end = block.get('end')
                if( thickStart >= end ) {
                    // left-side UTR
                    let prime = feature.get('strand') > 0 ? 'five' : 'three'
                    newChildren.push({
                        type: `${prime}_prime_UTR`,
                        start,
                        end
                    })
                } else if(thickStart > start && thickStart < end && thickEnd >= end) {
                    // UTR | CDS
                    let prime = feature.get('strand') > 0 ? 'five' : 'three'
                    newChildren.push(
                        {
                            type: `${prime}_prime_UTR`,
                            start,
                            end: thickStart,
                        },
                        {
                            type: `CDS`,
                            start: thickStart,
                            end,
                        }
                    )
                } else if(thickStart <= start && thickEnd >= end) {
                    // CDS
                    newChildren.push({
                        type: 'CDS',
                        start,
                        end,
                    })
                } else if(thickStart > start && thickStart < end && thickEnd < end) {
                    // UTR | CDS | UTR
                    let leftPrime = feature.get('strand') > 0 ? 'five' : 'three'
                    let rightPrime = feature.get('strand') > 0 ? 'three' : 'five'
                    newChildren.push(
                        {
                            type: `${leftPrime}_prime_UTR`,
                            start,
                            end: thickStart,
                        },
                        {
                            type: `CDS`,
                            start: thickStart,
                            end: thickEnd,
                        },
                        {
                            type: `${rightPrime}_prime_UTR`,
                            start: thickEnd,
                            end,
                        }
                    )
                } else if(thickStart <= start && thickEnd > start && thickEnd < end) {
                    // CDS | UTR
                    let prime = feature.get('strand') > 0 ? 'three' : 'five'
                    newChildren.push(
                        {
                            type: `CDS`,
                            start,
                            end: thickEnd,
                        },
                        {
                            type: `${prime}_prime_UTR`,
                            start: thickEnd,
                            end,
                        }
                    )
                } else if(thickEnd <= start) {
                    // right-side UTR
                    let prime = feature.get('strand') > 0 ? 'three' : 'five'
                    newChildren.push({
                        type: `${prime}_prime_UTR`,
                        start,
                        end,
                    })
                }
            })
            const newData = {}
            feature.tags().forEach(tag => {
                newData[tag] = feature.get(tag)
            })
            newData.subfeatures = newChildren
            newData.type = 'mRNA'
            const newFeature = new SimpleFeature({
                data: newData,
                id: feature.id()
            })
            return newFeature
        })
    }
}

return declare(BigWig,

 /**
  * @lends JBrowse.Store.SeqFeature.BigBed
  */
{
    constructor(args) {
    },

    _getFeatures( query, featureCallback, endCallback, errorCallback ) {

        const chrName = this.browser.regularizeReferenceName( query.ref );
        const view = this.getUnzoomedView()

        if (!view) {
            endCallback()
            return
        }

        view.readWigData(
            chrName,
            query.start,
            query.end,
            features => {
                this.applyFeatureTransforms(features || [])
                    .forEach(featureCallback)
                endCallback()
            },
            errorCallback
        )
    },

    supportsFeatureTransforms: true,

    getView() {
        return this.getUnzoomedView()
    },

    getPredefinedFeatureTransform: function getPredefinedFeatureTransform(name) {
        return predefinedFeatureTransforms[name] || this.inherited(getPredefinedFeatureTransform,arguments)
    }

});

});
