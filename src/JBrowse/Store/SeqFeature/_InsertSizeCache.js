define( [
            'dojo/_base/declare',
            'JBrowse/Util',
        ],
        function(
            declare,
            Util,
        ) {

return declare(null, {
    constructor(args) {
        this.featureCache = {}
        this.insertStatsCacheMin = args.insertStatsCacheMin || 400
        this.insertMaxSize = args.insertMaxSize || 50000
        this.orientationType = args.orientationType || 'fr'
    },

    cleanFeatureCache(query) {
        Object.entries(this.featureCache).forEach(([k, v]) => {
            if((v._get('end') < query.start) || (v._get('start') > query.end)) {
                delete this.featureCache[k]
            }
        })
    },

    insertFeat(feat) {
        this.featureCache[feat.get('name')] = feat
    },

    getInsertSizeStats() {
        if(Object.keys(this.featureCache).length > this.insertStatsCacheMin) {
            var total = Object.keys(this.featureCache).length
            var tlens = Object.entries(this.featureCache)
                .map(([k, v]) => Math.abs(v.get('template_length')))
                .filter(tlen => tlen < this.insertMaxSize)
                .sort((a, b) => a - b)
            var sum = tlens.reduce((a, b) => a + b, 0)
            var sum2 = tlens.map(a => a*a).reduce((a, b) => a + b, 0)
            var avg = sum / total;
            var sd = Math.sqrt((total * sum2 - sum*sum) / (total * total));
            return {
                upper: avg + 3*sd,
                lower: avg - 3*sd
            }
        }
        return { upper: Infinity, lower: 0 }
    }
});
});
