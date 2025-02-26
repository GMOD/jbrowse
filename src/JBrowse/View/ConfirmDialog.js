define([
  'dojo/_base/declare',
  'dijit/focus',
  'JBrowse/View/Dialog/WithActionBar',
  'dojo/on',
  'dijit/form/Button',
], function (declare, focus, ActionBarDialog, on, dijitButton) {
  return declare(
    ActionBarDialog,

    /**
     * Dijit Dialog subclass that pops up a yes/no confirmation
     * more pleasant for use as an information popup.
     * @lends JBrowse.View.ConfirmDialog
     */
    {
      autofocus: false,

      constructor: function (args) {
        this.message = args.message || 'Do you really want to do this?'
        this.confirmLabel = args.confirmLabel || 'Yes'
        this.denyLabel = args.denyLabel || 'No'
      },

      _fillActionBar: function (actionBar) {
        var thisB = this
        new dijitButton({
          className: 'yes',
          label: this.confirmLabel,
          onClick: function () {
            thisB.callback(true)
            thisB.hide()
          },
        }).placeAt(actionBar)
        new dijitButton({
          className: 'no',
          label: this.denyLabel,
          onClick: function () {
            thisB.callback(false)
            thisB.hide()
          },
        }).placeAt(actionBar)
      },

      show: function (callback) {
        this.callback = callback || function () {}

        this.set('content', this.message)

        this.inherited(arguments)

        focus.focus(this.closeButtonNode)
      },
    },
  )
})
