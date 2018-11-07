class PairedRead {
    id() {
        return Math.min(this.read1.id(), this.read2.id())
    }
    get(field) {
        return this._get(field.toLowerCase())
    }
    _get(field) {
        if(field === 'start') {
            return Math.min(this.read1._get('start'), this.read2._get('start'))
        } else if(field === 'end') {
            return Math.max(this.read1._get('end'), this.read2._get('end'))
        } else if(field === 'name') {
            return this.read1._get('name')
        } else if(field === 'pair_orientation') {
            return this.read1._get('pair_orientation')
        } else if(field === 'template_length') {
            return this.read1._get('template_length')
        }
    }
    pairedFeature() { return true }
    children() {}
}

function canBePaired(alignment) {
    return alignment.isPaired() &&
        !alignment.isMateUnmapped() &&
        alignment._refID === alignment._next_refid() &&
        (alignment.isRead1() || alignment.isRead2()) &&
        !(alignment.isSecondary() || alignment.isSupplementary());
}

define( [
            'dojo/_base/declare',
            'JBrowse/Util',
            'JBrowse/Model/SimpleFeature',
        ],
        function(
            declare,
            Util,
            SimpleFeature
        ) {

return declare(null, {
    constructor(args) {
        this.featureCache = {}
        this.insertUpperPercentile = args.insertUpperPercentile || 0.995
        this.insertLowerPercentile = args.insertLowerPercentile || 0.005
        this.insertStatsCacheMin = args.insertStatsCacheMin || 400
        this.insertMaxSize = args.insertMaxSize || 30000
    },


    // called by getFeatures from the DeferredFeaturesMixin
    pairFeatures(features, featCallback, endCallback, errorCallback, featTransform) {
        const pairCache = {};
        for(let i = 0; i < records.length; i++) {
            let feat
            if (canBePaired(records[i])) {
                let name = records[i]._get('name')
                feat = pairCache[name]
                if (feat) {
                    if(records[i].isRead1()) {
                        feat.read1 = records[i]
                    } else if(records[i].isRead2()) {
                        feat.read2 = records[i]
                    } else {
                        console.log('unable to pair read',records[i])
                    }
                    if(feat.read1 && feat.read2) {
                        delete pairCache[name]
                        this.featureCache[name] = feat
                    }
                }
                else {
                    feat = new PairedBamRead()
                    if(records[i].isRead1()) {
                        feat.read1 = records[i]
                    } else if(records[i].isRead2()) {
                        feat.read2 = records[i]
                    } else {
                        console.log('unable to pair read', records[i])
                    }
                    pairCache[name] = feat
                }
            }
            else if(!(records[i]._get('end') < query.start) && !(records[i]._get('start') > query.end)){
                let feat = records[i]
                featCallback(feat)
            }
        }
        Object.entries(this.featureCache).forEach(([k, v]) => {
            if(v._get('end') > query.start && v._get('start') < query.end) {
                featCallback(v)
            }
        })
    },


    cleanFeatureCache(query) {
        Object.entries(this.featureCache).forEach(([k, v]) => {
            if((v._get('end') < query.start) || (v._get('start') > query.end)) {
                delete this.featureCache[k]
            }
        })
    },

    getStatsForPairCache() {
        if(Object.keys(this.featureCache).length > this.insertStatsCacheMin) {
            var tlens = Object.entries(this.featureCache)
                .map(([k, v]) => Math.abs(v.get('template_length')))
                .filter(x => x < this.insertMaxSize)
                .sort((a, b) => a - b)
            return {
                upper: Util.percentile(tlens, this.insertUpperPercentile),
                lower:  Util.percentile(tlens, this.insertLowerPercentile)
            }
        }
        return { upper: Infinity, lower: 0 }
    }
});
});
