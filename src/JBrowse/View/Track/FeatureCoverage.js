define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'JBrowse/View/Track/Wiggle/XYPlot',
  'JBrowse/Util',
  'JBrowse/Store/SeqFeature/Coverage',
], function (declare, array, WiggleXYPlot, Util, CoverageStore) {
  return declare(WiggleXYPlot, {
    constructor: function (args) {
      this.store = new CoverageStore({
        store: this.store,
        browser: this.browser,
      })
    },

    _defaultConfig: function () {
      return Util.deepUpdate(dojo.clone(this.inherited(arguments)), {
        autoscale: 'local',
      })
    },
  })
})
