define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dijit/focus',
  'JBrowse/View/Dialog/WithActionBar',
  'dojo/on',
  'dijit/form/Button',
], function (declare, array, focus, ActionBarDialog, on, dijitButton) {
  return declare(
    ActionBarDialog,

    /**
     * JBrowse ActionDialog subclass with a few customizations that make it
     * more pleasant for use as an information popup.
     * @lends JBrowse.View.InfoDialog
     */
    {
      refocus: false,
      autofocus: false,

      _fillActionBar: function (actionBar) {
        new dijitButton({
          className: 'OK',
          label: 'OK',
          onClick: dojo.hitch(this, 'hide'),
        }).placeAt(actionBar)
      },

      show: function () {
        this.inherited(arguments)

        var thisB = this

        // holds the handles for the extra events we are registering
        // so we can clean them up in the hide() method
        this._extraEvents = []

        // make it so that clicking outside the dialog (on the underlay) will close it
        var underlay = ((dijit || {})._underlay || {}).domNode
        if (underlay) {
          this._extraEvents.push(
            on(underlay, 'click', dojo.hitch(this, 'hideIfVisible')),
          )
        }

        // also make ESCAPE or ENTER close the dialog box
        this._extraEvents.push(
          on(document.body, 'keydown', function (evt) {
            if ([dojo.keys.ESCAPE, dojo.keys.ENTER].indexOf(evt.keyCode) >= 0)
              thisB.hideIfVisible()
          }),
        )

        focus.focus(this.closeButtonNode)
      },

      hideIfVisible: function () {
        if (this.get('open')) this.hide()
      },

      hide: function () {
        this.inherited(arguments)

        array.forEach(this._extraEvents, function (e) {
          e.remove()
        })
      },
    },
  )
})
