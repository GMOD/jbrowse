define(['dojo/_base/declare', 'JBrowse/Util'], function (declare, Util) {
  return declare(null, {
    constructor(args) {
      this.featureCache = {}
      this.insertStatsCacheMin = args.insertStatsCacheMin || 400
      this.insertStatsMaxSize = args.insertStatsMaxSize || 50000
      this.insertStatsMinSize = args.insertStatsMinSize || 100
    },

    cleanStatsCache() {
      this.featureCache = {}
    },

    insertFeat(feat) {
      this.featureCache[feat.id()] = Math.abs(feat.get('template_length'))
    },

    getInsertSizeStats() {
      const len = Object.keys(this.featureCache).length
      if (len > this.insertStatsCacheMin) {
        const insertSizes = Object.values(this.featureCache).map(v =>
          Math.abs(v),
        )
        const max = insertSizes.reduce((max, n) => (n > max ? n : max))
        const min = insertSizes.reduce((min, n) => (n < min ? n : min))
        const filteredInsertSizes = insertSizes.filter(
          tlen =>
            tlen < this.insertStatsMaxSize && tlen > this.insertStatsMinSize,
        )
        const sum = filteredInsertSizes.reduce((a, b) => a + b, 0)
        const sum2 = filteredInsertSizes
          .map(a => a * a)
          .reduce((a, b) => a + b, 0)
        const total = filteredInsertSizes.length
        const avg = sum / total
        const sd = Math.sqrt((total * sum2 - sum * sum) / (total * total))
        const upper = avg + 3 * sd
        const lower = avg - 3 * sd
        return { min, max, upper, lower }
      }
      return { upper: Infinity, lower: 0, min: 0, max: Infinity }
    },
  })
})
