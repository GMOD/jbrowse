import dompurify from 'dompurify'

define([
  'dojo/_base/declare',
  'dojo/dom-construct',
  'dijit/form/NumberSpinner',
  'JBrowse/View/Dialog/WithActionBar',
  'dijit/form/Button',
], function (declare, dom, NumberSpinner, ActionBarDialog, Button) {
  return declare(ActionBarDialog, {
    /**
     * Dijit Dialog subclass that pops up prompt for the user to
     * manually set a new track height.
     * @lends JBrowse.View.InfoDialog
     */
    title: 'Set new track height',

    constructor: function (args) {
      this.height = args.height || 100
      this.browser = args.browser
      this.setCallback = args.setCallback || function () {}
      this.cancelCallback = args.cancelCallback || function () {}
      this.heightConstraints = { min: 10, max: args.maxHeight || 750 }
      this.msg = args.msg
    },

    _fillActionBar: function (actionBar) {
      var ok_button = new Button({
        label: 'OK',
        onClick: dojo.hitch(this, function () {
          var height = parseInt(this.heightSpinner.getValue())
          if (
            isNaN(height) ||
            height < this.heightConstraints.min ||
            height > this.heightConstraints.max
          ) {
            return
          }
          this.setCallback && this.setCallback(height)
          this.hide()
        }),
      }).placeAt(actionBar)

      var cancel_button = new Button({
        label: 'Cancel',
        onClick: dojo.hitch(this, function () {
          this.cancelCallback && this.cancelCallback()
          this.hide()
        }),
      }).placeAt(actionBar)
    },

    show: function (callback) {
      dojo.addClass(this.domNode, 'setTrackHeightDialog')

      this.heightSpinner = new NumberSpinner({
        value: this.height,
        smallDelta: 10,
        constraints: this.heightConstraints,
      })

      this.set('content', [
        dom.create('label', {
          for: 'newhighlight_locstring',
          innerHTML: '',
        }),
        this.heightSpinner.domNode,
        dom.create('span', {
          // eslint-disable-next-line xss/no-mixed-html
          innerHTML: dompurify.sanitize(this.msg || ' pixels'),
        }),
      ])

      this.inherited(arguments)
    },

    hide: function () {
      this.inherited(arguments)
      window.setTimeout(dojo.hitch(this, 'destroyRecursive'), 500)
    },
  })
})
