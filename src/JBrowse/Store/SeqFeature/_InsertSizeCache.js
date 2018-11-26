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
        this.insertMinSize = args.insertMinSize || 100
    },

    cleanFeatureCache(query) {
        Object.entries(this.featureCache).forEach(([k, v]) => {
            if(!Util.intersect(v._get('start'), v._get('end'), query.start, query.end)) {
                delete this.featureCache[k]
            }
        })
    },

    insertFeat(feat) {
        this.featureCache[feat.get('id')] = Math.abs(feat.get('template_length'))
    },

    getInsertSizeStats() {
        const len = Object.keys(this.featureCache).length
        if(len > this.insertStatsCacheMin) {
            var tlens = Object.entries(this.featureCache)
                .map(([k, v]) => Math.abs(v))
                .filter(tlen => tlen < this.insertMaxSize && tlen > this.insertMinSize)
                .sort((a, b) => a - b)
            var sum = tlens.reduce((a, b) => a + b, 0)
            var sum2 = tlens.map(a => a * a).reduce((a, b) => a + b, 0)
            var total = tlens.length
            var avg = sum / total
            var sd = Math.sqrt((total * sum2 - sum*sum) / (total * total))
            return {
                upper: avg + 3 * sd,
                lower: avg - 3 * sd
            }
        }
        return { upper: Infinity, lower: 0 }
    }
});
});
