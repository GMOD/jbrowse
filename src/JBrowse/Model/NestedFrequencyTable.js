define(['JBrowse/Util'], function (Util) {
  // A class that keeps a frequency table.  the categories in the
  // frequency table can be other frequency tables.
  // Note that the frequency table acts like a number (its total) when
  // used as a number or a string.  E.g.  0+table is like table.total()

  var NestedFrequencyTable = Util.fastDeclare({
    constructor: function (initialData) {
      this._categories = {}
      if (initialData) dojo.mixin(this._categories, initialData)
    },

    // get the sum of all the category counts
    total: function () {
      // calculate total if necessary
      var t = 0
      for (var k in this._categories) {
        var v = this._categories[k]
        t += v.total ? v.total() : v
      }
      return t
    },

    // decrement the count for the given category
    decrement: function (slotName, amount) {
      if (!amount) amount = 1

      if (!slotName) slotName = 'default'
      else slotName = slotName.toString()

      if (this._categories[slotName])
        return (this._categories[slotName] = Math.max(
          0,
          this._categories[slotName] - amount,
        ))
      else return 0
    },

    // increment the count for the given category
    increment: function (slotName, amount) {
      if (!amount) amount = 1

      if (!slotName) slotName = 'default'
      else slotName = slotName.toString()
      return (this._categories[slotName] =
        (this._categories[slotName] || 0) + amount)
    },

    // get the value of the given category.  may be a number or a
    // frequency table.
    get: function (slotName) {
      return this._categories[slotName] || 0
    },

    // get a given category as a frequency table
    getNested: function (path) {
      if (typeof path == 'string') path = path.split('/')

      if (!path.length) return this

      var slotName = path[0].toString()
      var slot = this._categories[slotName]
      if (!slot || !slot._categories)
        slot = this._categories[slotName] = new NestedFrequencyTable(
          slot ? { default: slot + 0 } : {},
        )

      if (path.length > 1) {
        return slot.getNested(path.slice(1))
      } else return slot
    },

    // returns array of category names that are present
    categories: function () {
      return Util.dojof.keys(this._categories)
    },

    toString: function () {
      return this.total()
        .toPrecision(6)
        .toString()
        .replace(/\.?0+$/, '')
    },

    valueOf: function () {
      return this.total()
    },

    // iterate through the categories and counts, call like:
    //
    //   tbl.forEach( function( count, categoryName ) {
    //      // do something
    //   }, this );
    //
    forEach: function (func, ctx) {
      var c = this._categories
      if (ctx) {
        for (var slotName in c) {
          func.call(ctx, c[slotName], slotName)
        }
      } else {
        for (var slotName in c) {
          func(c[slotName], slotName)
        }
      }
    },
  })

  return NestedFrequencyTable
})
