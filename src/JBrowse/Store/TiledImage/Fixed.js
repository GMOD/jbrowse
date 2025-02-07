define([
  'dojo/_base/declare',
  'dojo/_base/Deferred',
  'JBrowse/Store',
  'JBrowse/Store/DeferredStatsMixin',
  'JBrowse/Util',
], function (declare, Deferred, Store, DeferredStatsMixin, Util) {
  return declare(
    [Store, DeferredStatsMixin],

    /**
     * Implements a store for image tiles that are only available at a
     * fixed set of sizes and zoom levels.  Most often used with
     * pre-generated image tiles served statically.
     * @lends JBrowse.Store.TiledImage.Fixed
     * @class
     * @extends Store
     */
    {
      constructor: function (args) {
        this.tileToImage = {}
        this.zoomCache = {}

        this.baseUrl = args.baseUrl

        this.url = this.resolveUrl(args.urlTemplate)

        this._deferred.images = new Deferred()

        dojo.xhrGet({
          url: this.url,
          handleAs: 'json',
          failOk: true,
          load: dojo.hitch(this, function (o) {
            this.loadSuccess(o)
          }),
          error: dojo.hitch(this, '_failAllDeferred'),
        })
      },

      loadSuccess: function (o) {
        this.globalStats = o.stats || {}
        //backcompat
        if (!('scoreMin' in this.globalStats)) {
          this.globalStats.scoreMin = this.globalStats.global_min
        }
        if (!('scoreMax' in this.globalStats)) {
          this.globalStats.scoreMax = this.globalStats.global_max
        }

        //tileWidth: width, in pixels, of the tiles
        this.tileWidth = o.tileWidth
        this.align = o.align
        //zoomLevels: array of {basesPerTile, urlPrefix} hashes
        this.zoomLevels = o.zoomLevels

        this._deferred.stats.resolve({ success: true })
        this._deferred.images.resolve({ success: true })
      },

      /**
       * @private
       */
      _getZoom: function (scale) {
        var result = this.zoomCache[scale]
        if (result) {
          return result
        }

        result = this.zoomLevels[0]
        var desiredBases = this.tileWidth / scale
        for (var i = 1; i < this.zoomLevels.length; i++) {
          if (
            Math.abs(this.zoomLevels[i].basesPerTile - desiredBases) <
            Math.abs(result.basesPerTile - desiredBases)
          ) {
            result = this.zoomLevels[i]
          }
        }

        this.zoomCache[scale] = result
        return result
      },

      getImages: function (query, callback, errorCallback) {
        var thisB = this
        this._deferred.images.then(function (result) {
          if (result.success) {
            thisB._getImages(query, callback, errorCallback)
          } else {
            thisB.error = result.error
            errorCallback(result.error || result)
          }
        }, errorCallback)
      },

      /**
       * Fetch an array of <code>&lt;img&gt;</code> elements for the image
       * tiles that should be displayed for a certain magnification scale
       * and section of the reference.
       */
      _getImages: function (query, callback, errorCallback) {
        var scale = query.scale || 1
        var startBase = query.start
        var endBase = query.end

        var zoom = this._getZoom(scale)

        var startTile = Math.max(startBase / zoom.basesPerTile, 0) | 0
        var endTile = (endBase / zoom.basesPerTile) | 0

        var result = []
        var im
        for (var i = startTile; i <= endTile; i++) {
          im = document.createElement('img')
          dojo.connect(im, 'onerror', this.handleImageError)
          im.src = this._imageSource(zoom, i)
          //TODO: need image coord systems that don't start at 0?
          im.startBase = i * zoom.basesPerTile // + this.refSeq.start;
          im.baseWidth = zoom.basesPerTile
          im.tileNum = i

          result.push(im)
        }
        callback(result)
      },

      /**
       * Gives the image source for a given zoom (as returned by _getZoom())
       * and tileIndex.
       * @private
       */
      _imageSource: function (zoom, tileIndex) {
        return Util.resolveUrl(this.url, zoom.urlPrefix + tileIndex + '.png')
      },
    },
  )
})
