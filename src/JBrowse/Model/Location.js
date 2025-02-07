define(['dojo/_base/array', 'JBrowse/Util'], function (array, Util) {
  return Util.fastDeclare({
    constructor: function (args) {
      if (args) {
        if (typeof args == 'string') {
          args = Util.parseLocString(args)
        }

        if (args.location) {
          this._populate(args.location)
        }
        if (args.feature) {
          var f = args.feature
          this._populate({
            start: f.get('start'),
            end: f.get('end'),
            ref:
              f.get('seq_id') ||
              (args.tracks ? args.tracks[0].browser.refSeq.name : undefined),
            strand: f.get('strand'),
            objectName: f.get('name') || f.get('id'),
          })
        }

        this._populate(args)
      }
    },
    _populate: function (args) {
      array.forEach(
        'ref,start,end,strand,tracks,objectName'.split(','),
        function (p) {
          if (p in args) {
            this[p] = args[p]
          }
        },
        this,
      )
    },

    toString: function () {
      var locstring = Util.assembleLocString(this)
      if (this.objectName) {
        return `${locstring} (${this.objectName})`
      } else {
        return locstring
      }
    },

    fromString: function (str) {
      var p = Util.parseLocString(str)
      p.objectName = p.extra
      delete p.extra
      this._populate(p)
    },

    localeCompare: function (b) {
      var as = this.toString()
      var bs = b.toString()
      return as.localeCompare(bs)
    },
  })
})
