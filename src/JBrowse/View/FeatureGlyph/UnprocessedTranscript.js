define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'JBrowse/View/FeatureGlyph/Segments',
], function (declare, lang, Segments) {
  return declare(Segments, {
    _defaultConfig: function () {
      return this._mergeConfigs(this.inherited(arguments), {
        style: {
          unprocessedTranscriptColor: 'red',
        },
      })
    },
    renderBox: function (
      context,
      viewInfo,
      feature,
      top,
      overallHeight,
      parentFeature,
      style,
    ) {
      style = style || lang.hitch(this, 'getStyle')
      return this.inherited(arguments, [
        context,
        viewInfo,
        feature,
        top,
        overallHeight,
        parentFeature,
        function (feat, attr) {
          if (attr == 'color') {
            return style(parentFeature, 'unprocessedTranscriptColor')
          }
          return style(feat, attr)
        },
      ])
    },
  })
})
