class PairedRead {
  id() {
    return Math.min(this.read1.id(), this.read2.id())
  }
  get(field) {
    return this._get(field.toLowerCase())
  }
  _get(field) {
    if (field === 'start') {
      return Math.min(this.read1._get('start'), this.read2._get('start'))
    } else if (field === 'end') {
      return Math.max(this.read1._get('end'), this.read2._get('end'))
    } else if (field === 'name') {
      return this.read1._get('name')
    } else if (field === 'pair_orientation') {
      return this.read1._get('pair_orientation')
    } else if (field === 'template_length') {
      return this.read1._get('template_length')
    } else if (field === 'is_paired') {
      return true // simply comes from paired end reads
    } else if (field === 'paired_feature') {
      return true // it is a combination of two reads
    }
  }
  pairedFeature() {
    return true
  }
  children() {}
}

function canBePaired(alignment) {
  return (
    alignment._get('multi_segment_template') &&
    !alignment._get('multi_segment_next_segment_unmapped') &&
    alignment._get('seq_id') === alignment._get('next_seq_id') &&
    (alignment._get('multi_segment_first') ||
      alignment._get('multi_segment_last')) &&
    !(
      alignment._get('secondary_alignment') ||
      alignment._get('supplementary_alignment')
    )
  )
}

define(['dojo/_base/declare', 'JBrowse/Util'], function (declare, Util) {
  return declare(null, {
    constructor(args) {
      this.featureCache = {}
    },

    pairFeatures(query, records, featCallback, errorCallback) {
      const pairCache = {}
      for (let i = 0; i < records.length; i++) {
        let feat
        if (
          canBePaired(records[i]) &&
          Math.abs(records[i]._get('template_length')) < query.maxInsertSize
        ) {
          let name = records[i]._get('name')
          feat = pairCache[name]
          if (feat) {
            if (records[i]._get('multi_segment_first')) {
              feat.read1 = records[i]
            } else if (records[i]._get('multi_segment_last')) {
              feat.read2 = records[i]
            } else {
              console.log('unable to pair read', records[i])
            }
            if (feat.read1 && feat.read2) {
              delete pairCache[name]
              this.featureCache[name] = feat
            }
          } else {
            feat = new PairedRead()
            if (records[i]._get('multi_segment_first')) {
              feat.read1 = records[i]
            } else if (records[i]._get('multi_segment_last')) {
              feat.read2 = records[i]
            } else {
              console.log('unable to pair read', records[i])
            }
            pairCache[name] = feat
          }
        } else if (
          Util.intersect(
            records[i]._get('start'),
            records[i]._get('end'),
            query.start,
            query.end,
          )
        ) {
          let feat = records[i]
          featCallback(feat)
        }
      }
      // dump paired features
      Object.entries(this.featureCache).forEach(([k, v]) => {
        if (
          Util.intersect(v._get('start'), v._get('end'), query.start, query.end)
        ) {
          featCallback(v)
        }
      })
      // dump unpaired features from the paircache
      Object.entries(pairCache).forEach(([k, v]) => {
        if (v.read1) {
          if (
            Util.intersect(
              v.read1._get('start'),
              v.read1._get('end'),
              query.start,
              query.end,
            )
          ) {
            featCallback(v.read1)
          }
        } else if (v.read2) {
          if (
            Util.intersect(
              v.read2._get('start'),
              v.read2._get('end'),
              query.start,
              query.end,
            )
          ) {
            featCallback(v.read2)
          }
        }
      })
    },

    cleanFeatureCache(query) {
      Object.entries(this.featureCache).forEach(([k, v]) => {
        if (
          !Util.intersect(
            v._get('start'),
            v._get('end'),
            query.start,
            query.end,
          )
        ) {
          delete this.featureCache[k]
        }
      })
    },
  })
})
