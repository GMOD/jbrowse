define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'JBrowse/View/Export/BED',
], function (declare, array, bedExport) {
  return declare(
    bedExport,
    /**
     * @lends JBrowse.View.Export.bedGraph.prototype
     */
    {
      /**
       * Data export driver for bedGraph format.
       * @constructs
       */
      constructor: function (args) {},

      _printHeader: function () {
        // print the track definition
        this.print('track type=bedGraph')
        if (this.track) {
          if (this.track.name) {
            this.print(' name="' + this.track.name + '"')
          }
          var metadata = this.track.getMetadata()
          if (metadata.key) {
            this.print(' description="' + metadata.key + '"')
          }
        }
        this.print('\n')
      },

      formatFeature: function (f) {
        return (
          [
            f.get('seq_id') || this.refSeq.name,
            f.get('start'),
            f.get('end'),
            f.get('score'),
          ].join('\t') + '\n'
        )
      },
    },
  )
})
