/**
 * Just an HTMLFeatures track that uses the VariantDetailsMixin to
 * provide a variant-specific feature detail dialog.
 */

define([
  'dojo/_base/declare',
  'dojo/promise/all',
  'JBrowse/View/Track/HTMLFeatures',
  'JBrowse/View/Track/_VariantDetailMixin',
], function (declare, all, HTMLFeatures, VariantDetailsMixin) {
  return declare([HTMLFeatures, VariantDetailsMixin], {
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
