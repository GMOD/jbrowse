class SpanFeature {
  constructor(feat) {
    this.start = Math.min(feat._get('start'), feat._get('next_pos'))
    this.end = Math.max(feat._get('end'), feat._get('next_pos'))
    this.feat = feat
  }
  id() {
    return this.feat.id()
  }
  get(field) {
    return this._get(field.toLowerCase())
  }
  _get(field) {
    if (field === 'start') {
      return this.start
    } else if (field === 'end') {
      return this.end
    }

    return this.feat.get(field)
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
      for (let i = 0; i < records.length; i++) {
        let feat
        if (canBePaired(records[i])) {
          let name = records[i]._get('name')
          if (!this.featureCache[name]) {
            this.featureCache[name] = new SpanFeature(records[i])
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
      Object.entries(this.featureCache).forEach(([k, v]) => {
        if (
          Util.intersect(v._get('start'), v._get('end'), query.start, query.end)
        ) {
          featCallback(v)
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
