define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  './BigWig',
  './BigWig/Window',
  'JBrowse/Model/SimpleFeature',
], function (declare, lang, array, BigWig, Window, SimpleFeature) {
  const predefinedFeatureTransforms = {}

  return declare(
    BigWig,

    /**
     * @lends JBrowse.Store.SeqFeature.BigBed
     */
    {
      constructor(args) {},

      _getFeatures(query, featureCallback, endCallback, errorCallback) {
        const chrName = this.browser.regularizeReferenceName(query.ref)
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
            this.applyFeatureTransforms(features || []).forEach(featureCallback)
            endCallback()
          },
          errorCallback,
        )
      },

      supportsFeatureTransforms: true,

      getView() {
        return this.getUnzoomedView()
      },

      getPredefinedFeatureTransform: function getPredefinedFeatureTransform(
        name,
      ) {
        return (
          predefinedFeatureTransforms[name] ||
          this.inherited(getPredefinedFeatureTransform, arguments)
        )
      },
    },
  )
})
