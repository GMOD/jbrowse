define([
  'dojo/_base/declare',
  'JBrowse/Store/TiledImage/Fixed',
  'JBrowse/Util',
], function (declare, Fixed, Util) {
  return declare(
    Fixed,
    /**
     * Subclass of TiledImageStore.Fixed to provide backward-compatibility
     * with image stores formatted with JBrowse 1.2.1.
     * @lends JBrowse.Store.TiledImage.Fixed_v0
     * @class
     * @extends JBrowse.Store.TiledImage.Fixed
     */
    {
      _imageSource: function (zoom, tileIndex) {
        return Util.resolveUrl(
          this.url,
          `../../${zoom.urlPrefix}${tileIndex}.png`,
        )
      },
    },
  )
})
