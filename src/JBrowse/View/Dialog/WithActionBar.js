/**
 * A dialog with an action bar at the bottom for buttons.
 */
define(['dojo/_base/declare', 'dojo/dom-geometry', 'dijit/Dialog'], function (
  declare,
  domGeom,
  dijitDialog,
) {
  return declare(dijitDialog, {
    constructor: function () {
      dojo.connect(this, 'onLoad', this, '_addActionBar')
    },

    _addActionBar: function () {
      var that = this
      if (this.containerNode && !this.actionBar) {
        this.actionBar = dojo.create('div', {
          className: 'infoDialogActionBar dijitDialogPaneActionBar',
        })

        this._fillActionBar(this.actionBar)
        this.containerNode.appendChild(this.actionBar)
      }
    },

    _fillActionBar: function (actionBar) {},

    show: function (callback) {
      this._addActionBar()
      this.inherited(arguments)
      var titleDims = domGeom.position(this.titleBar)
      this.domNode.style.width = `${titleDims.w}px`
    },
  })
})
