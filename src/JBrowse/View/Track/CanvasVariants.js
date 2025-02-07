/**
 * Just an HTMLFeatures track that uses the VariantDetailsMixin to
 * provide a variant-specific feature detail dialog.
 */

define([
  'dojo/_base/declare',
  'dojo/promise/all',
  'JBrowse/Util',
  'JBrowse/View/Track/CanvasFeatures',
  'JBrowse/View/Track/_VariantDetailMixin',
], function (declare, all, Util, CanvasFeatures, VariantDetailsMixin) {
  return declare([CanvasFeatures, VariantDetailsMixin], {
    _defaultConfig: function () {
      return Util.deepUpdate(dojo.clone(this.inherited(arguments)), {
        style: { color: 'green' },
      })
    },

    _trackMenuOptions: function () {
      return all([
        this.inherited(arguments),
        this._variantsFilterTrackMenuOptions(),
      ]).then(function (options) {
        var o = options.shift()
        options.unshift({ type: 'dijit/MenuSeparator' })
        return o.concat.apply(o, options)
      })
    },
  })
})
