define(['dojo/_base/declare', 'dojo/_base/lang'], function (declare, lang) {
  return declare(null, {
    _refreshContextMenu: function (fRect) {
      // if we already have a menu generated for this feature,
      // give it a new lease on life
      if (!fRect.contextMenu) {
        fRect.contextMenu = this._makeFeatureContextMenu(
          fRect,
          this.getConfForFeature('menuTemplate', fRect.f),
        )
      }

      // give the menu a timeout so that it's cleaned up if it's not used within a certain time
      if (fRect.contextMenuTimeout) {
        window.clearTimeout(fRect.contextMenuTimeout)
      }
      var timeToLive = 30000 // clean menus up after 30 seconds
      fRect.contextMenuTimeout = window.setTimeout(function () {
        if (fRect.contextMenu) {
          fRect.contextMenu.destroyRecursive()
          delete fRect.contextMenu
        }
        delete fRect.contextMenuTimeout
      }, timeToLive)
    },

    /**
     * Make the right-click dijit menu for a feature.
     */
    _makeFeatureContextMenu: function (fRect, menuTemplate) {
      var context = lang.mixin(
        {
          track: this,
          feature: fRect.f,
          callbackArgs: [this, fRect.f, fRect],
        },
        fRect,
      )
      // interpolate template strings in the menuTemplate
      menuTemplate = this._processMenuSpec(dojo.clone(menuTemplate), context)

      // render the menu, start it up, and bind it to right-clicks
      // both on the feature div and on the label div
      var menu = this._renderContextMenu(menuTemplate, context)
      menu.startup()
      return menu
    },
  })
})
