define(['dojo/_base/declare', 'JBrowse/Component'], function (
  declare,
  Component,
) {
  var uniqCounter = 0
  return declare(
    Component,

    /**
     * @lends JBrowse.Store.prototype
     */
    {
      namePrefix: 'store-',

      /**
       * Base class for all JBrowse data stores.
       * @constructs
       */
      constructor: function (args) {
        this.refSeq = dojo.clone(args.refSeq)
        this.name = args.name || this.namePrefix + ++uniqCounter
        this.changeCallback = args.changeCallback || function () {}
      },

      // not really utilized.  ignore for now
      notifyChanged: function (changeDescription) {
        if (this.changeCallback) this.changeCallback(changeDescription)
      },

      /**
       * If this store has any internal deferreds, resolves them all
       * with the given error.
       */
      _failAllDeferred: function (error) {
        var deferreds = this._deferred || {}
        for (var dname in deferreds) {
          if (deferreds.hasOwnProperty(dname)) {
            deferreds[dname].reject(error)
          }
        }
      },
    },
  )
})
