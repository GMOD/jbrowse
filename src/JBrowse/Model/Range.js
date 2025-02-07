define(['dojo/_base/declare'], function (declare) {
  var Range = declare(
    null,
    /**
     * @lends JBrowse.Model.Range.prototype
     */
    {
      /**
       * Adapted from a combination of Range and _Compound in the
       * Dalliance Genome Explorer, (c) Thomas Down 2006-2010.
       */
      constructor: function () {
        this._ranges =
          arguments.length == 2
            ? [{ min: arguments[0], max: arguments[1] }]
            : 0 in arguments[0]
              ? dojo.clone(arguments[0])
              : [arguments[0]]
      },

      min: function () {
        return this._ranges[0].min
      },

      max: function () {
        return this._ranges[this._ranges.length - 1].max
      },

      contains: function (pos) {
        for (var s = 0; s < this._ranges.length; ++s) {
          var r = this._ranges[s]
          if (r.min <= pos && r.max >= pos) {
            return true
          }
        }
        return false
      },

      isContiguous: function () {
        return this._ranges.length > 1
      },

      ranges: function () {
        return this._ranges.map(function (r) {
          return new Range(r.min, r.max)
        })
      },

      toString: function () {
        return this._ranges
          .map(function (r) {
            return `[${r.min}-${r.max}]`
          })
          .join(',')
      },

      union: function (s1) {
        var s0 = this
        var ranges = s0.ranges().concat(s1.ranges()).sort(this.rangeOrder)
        var oranges = []
        var current = ranges[0]

        for (var i = 1; i < ranges.length; ++i) {
          var nxt = ranges[i]
          if (nxt.min() > current.max() + 1) {
            oranges.push(current)
            current = nxt
          } else {
            if (nxt.max() > current.max()) {
              current = new Range(current.min(), nxt.max())
            }
          }
        }
        oranges.push(current)

        if (oranges.length == 1) {
          return oranges[0]
        } else {
          return new Range(oranges)
        }
      },

      intersection: function (s1) {
        var s0 = this
        var r0 = s0.ranges()
        var r1 = s1.ranges()
        var l0 = r0.length,
          l1 = r1.length
        var i0 = 0,
          i1 = 0
        var or = []

        while (i0 < l0 && i1 < l1) {
          var s0 = r0[i0],
            s1 = r1[i1]
          var lapMin = Math.max(s0.min(), s1.min())
          var lapMax = Math.min(s0.max(), s1.max())
          if (lapMax >= lapMin) {
            or.push(new Range(lapMin, lapMax))
          }
          if (s0.max() > s1.max()) {
            ++i1
          } else {
            ++i0
          }
        }

        if (or.length == 0) {
          return null // FIXME
        } else if (or.length == 1) {
          return or[0]
        } else {
          return new Range(or)
        }
      },

      coverage: function () {
        var tot = 0
        var rl = this.ranges()
        for (var ri = 0; ri < rl.length; ++ri) {
          var r = rl[ri]
          tot += r.max() - r.min() + 1
        }
        return tot
      },

      rangeOrder: function (a, b) {
        if (arguments.length < 2) {
          b = a
          a = this
        }

        if (a.min() < b.min()) {
          return -1
        } else if (a.min() > b.min()) {
          return 1
        } else if (a.max() < b.max()) {
          return -1
        } else if (b.max() > a.max()) {
          return 1
        } else {
          return 0
        }
      },
    },
  )

  return Range
})
