define(['dojo/_base/declare', 'dojo/_base/lang', 'dojo/Deferred'], function (
  declare,
  lang,
  Deferred,
) {
  return declare(null, {
    _trackDetailsContent: function () {
      var thisB = this
      var d = new Deferred()
      var args = arguments
      // this.store.getRegionStats(
      //     { ref: this.refSeq.name, start: this.refSeq.start, end: this.refSeq.end },
      this.store.getGlobalStats(
        function (stats) {
          d.resolve(
            thisB.inherited(args, [
              { 'Stats (current reference sequence)': stats },
            ]),
          )
        },
        lang.hitch(d, 'reject'),
      )
      return d
    },
  })
})
