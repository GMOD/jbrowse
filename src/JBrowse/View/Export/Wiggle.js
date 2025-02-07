define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'JBrowse/View/Export',
], function (declare, array, ExportBase) {
  return declare(
    ExportBase,
    /**
     * @lends JBrowse.View.Export.Wiggle.prototype
     */
    {
      /**
       * Data export driver for Wiggle format.
       * @constructs
       */
      constructor: function (args) {
        // print the track definition
        this.print('track type=wiggle_0')
        if (this.track) {
          if (this.track.name) this.print(' name="' + this.track.name + '"')
          var metadata = this.track.getMetadata()
          if (metadata.key) this.print(' description="' + metadata.key + '"')
        }
        this.print('\n')
      },

      /**
       * print the Wiggle step
       * @private
       */
      _printStep: function (span, ref) {
        this.print(
          'variableStep' +
            (ref ? ' chrom=' + ref : '') +
            ' span=' +
            span +
            '\n',
        )
      },

      exportRegion: function (region, callback) {
        var curspan
        var curref
        this.store.getFeatures(
          region,
          dojo.hitch(this, function (f) {
            var span = f.get('end') - f.get('start')
            var ref = f.get('seq_id') || this.refSeq.name
            if (!(curspan == span && ref == curref)) {
              this._printStep(span, ref == curref ? null : ref)
              curref = ref
              curspan = span
            }
            this.print(f.get('start') + 1 + '\t' + f.get('score') + '\n')
          }),
          dojo.hitch(this, function () {
            callback(this.output)
          }),
        )
      },
    },
  )
})
