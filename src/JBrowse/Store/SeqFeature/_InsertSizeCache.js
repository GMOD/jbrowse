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
            const insertSizes = Object.values(this.featureCache).map(v => Math.abs(v))
            const max = insertSizes.reduce((max, n) => n > max ? n : max)
            const min = insertSizes.reduce((min, n) => n < min ? n : min)
            const filteredInsertSizes = insertSizes.filter(tlen => tlen < this.insertMaxSize && tlen > this.insertMinSize)
            const sum = filteredInsertSizes.reduce((a, b) => a + b, 0)
            const sum2 = filteredInsertSizes.map(a => a * a).reduce((a, b) => a + b, 0)
            const total = filteredInsertSizes.length
            const avg = sum / total
            const sd = Math.sqrt((total * sum2 - sum * sum) / (total * total))
            const upper = avg + 3 * sd
            const lower = avg - 3 * sd
            return { min, max, upper, lower }
        }
        return { upper: Infinity, lower: 0, min: 0, max: Infinity }
    }
});
});
