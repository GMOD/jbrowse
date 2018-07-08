// const data = {
//     name: feature.readName,
//     start: feature.alignmentStart-1,
//     end: feature.alignmentStart-1+lengthOnRef,
//     cram_read_features: feature.readFeatures,
//     type: 'match',
//     MQ: feature.mappingQuality,
//     flags: `0x${feature.flags.toString(16)}`,
//     cram_flags: `0x${feature.cramFlags.toString(16)}`,
//     strand: feature.isReverseComplemented() ? -1 : 1,

//     qual: (feature.qualityScores || []).map(q => q+33).join(' '),
//     seq: feature.readBases,

//     read_features_string: JSON.stringify(feature.readFeatures,null,' '),

//     qc_failed: feature.isFailedQc(),

//     secondary_alignment: feature.isSecondary(),
//     supplementary_alignment: feature.isSupplementary(),
//     multi_segment_template: feature.isPaired(),
//     multi_segment_all_aligned: feature.isProperlyPaired(),
//     unmapped: feature.isSegmentUnmapped(),
//     next_seq_id: feature.mate ? this._refIdToName(feature.mate.sequenceID) : undefined,
//     next_segment_position: feature.mate
//         ? ( this._refIdToName(feature.mate.sequenceID)+':'+feature.mate.alignmentStart) : undefined,
// }
// Object.assign(data,feature.tags || {})


const fixedTags = [
    'name',
    'start',
    'end',
    'cram_read_features',
    'type',
    'MQ',
    'flags',
    'cram_flags',
    'strand',
    'qual',
    'seq',
    'qc_failed',
    'secondary_alignment',
    'supplementary_alignment',
    'multi_segment_template',
    'multi_segment_all_aligned',
    'unmapped',
    'next_seq_id',
    'next_segment_position',
]

const fieldRemap = {
    name: 'readName',
    cram_read_features: 'readFeatures',
    MQ: 'mappingQuality',
    seq: 'readBases',
}

class LazyCramFeature {
    constructor(store, cramRecord) {
        this.store = store
        this.rec = cramRecord

        this.calculated = {
            type: 'match'
        }
    }

    get(fieldName) {
        // already calculated or fetched
        if (fieldName in this.calculated) return this.calculated[fieldName]

        // custom calculations
        if (this[`_get_${fieldName}`]) {
            const val = this[`_get_${fieldName}`].call(this)
            this.calculated[fieldName] = val
            return val
        }

        // straightforward remapping of field names
        const remapped = fieldRemap[fieldName]
        if (remapped) {
            this.calculated[fieldName] = this.rec.get(remapped)
            return this.calculated[fieldName]
        }

        return this.rec.get(fieldName)
    }

    id() {
        return this.rec.get('uniqueId')
    }

    parent() {
        return undefined
    }

    children() {
        return []
    }

    tags() {
        if (!this.tagList) {
            this.tagList = new Set(
                fixedTags
                .concat(this.rec.fields())
            ).values()
        }
        return this.tagList
    }

    _get_flags() {
        return `0x${this.rec.get('flags').toString(16)}`
    }
    _get_cram_flags() {
        return `0x${this.rec.get('cramFlags').toString(16)}`
    }

    _get_strand() {
        return this.rec.isReverseComplemented() ? -1 : 1
    }

    _get_qual() {
        return (this.rec.get('qualityScores') || []).map(q => q+33).join(' ')
    }

    _get_start() {
        return this.rec.get('alignmentStart') - 1
    }

    _get_qc_failed() {
        return this.rec.isFailedQc()
    }



    // TODO: calculate from read features and cache
    _get_end() {
        // calculate the overall span on the ref,
        // based on the read features
        let lengthOnRef = this.rec.get('readLength')
        const readFeatures = this.rec.get('readFeatures')
        if (readFeatures)
            readFeatures.forEach(({code, data}) => {
                if( code === 'D' || code === 'N') lengthOnRef += data
                else if (code === 'H' || code === 'S')
                    lengthOnRef -= data
                else if (code === 'I' || code === 'i')
                    lengthOnRef -= data.length
                else if (code === 'P') throw new Error('"P" read features not yet supported')
            })

        return this.get('start') + lengthOnRef
    }


    _get_secondary_alignment() {
        return this.rec.isSecondary()
    }

    _get_supplementary_alignment() {
        return this.rec.isSupplementary()
    }

    _get_multi_segment_template() {
        return this.rec.isPaired()
    }

    _get_multi_segment_all_aligned() {
        return this.rec.isProperlyPaired()
    }

    _get_unmapped() {
        return this.rec.isSegmentUnmapped()
    }

    _get_next_seq_id() {
        return this.rec.get('mate.sequenceID')
    }

    _get_next_segment_position() {
        const seqId = this.rec.get('mate.sequenceID')
        if (seqId >= 0) {
            return `${
                this.store._refIdToName(this.rec.get('mate.sequenceID'))
            }:${
                this.rec.get('mate.alignmentStart')
            }`
        }
        return undefined
    }

    set() {
        throw new Error('set not supported')
    }
}

module.exports = LazyCramFeature
