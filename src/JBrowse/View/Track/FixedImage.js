define([
  'dojo/_base/declare',
  'JBrowse/has',
  'JBrowse/View/Track/BlockBased',
], function (declare, has, BlockBased) {
  return declare(
    BlockBased,
    /**
     * @lends JBrowse.View.Track.FixedImage.prototype
     */
    {
      /**
       * A track that displays tiled images (PNGs, or other images) at fixed
       * intervals along the reference sequence.
       * @constructs
       * @extends JBrowse.View.Track.BlockBased
       */
      constructor: function (args) {
        this.trackPadding = args.trackPadding || 0
      },

      handleImageError: function (ev) {
        var img = ev.currentTarget || ev.srcElement
        img.style.display = 'none'
        dojo.stopEvent(ev)
      },

      /**
       * @private
       */
      makeImageLoadHandler: function (
        img,
        blockIndex,
        blockWidth,
        composeCallback,
      ) {
        var handler = dojo.hitch(this, function () {
          this.imageHeight = img.height
          img.style.height = img.height + 'px'
          img.style.width = 100 * (img.baseWidth / blockWidth) + '%'
          this.heightUpdate(img.height, blockIndex)
          if (composeCallback) {
            composeCallback()
          }
          return true
        })

        if (has('ie')) {
          // in IE, have to delay calling it for a (arbitrary) 1/4
          // second because the image's height is not always
          // available when the onload event fires.  >:-{
          return function () {
            window.setTimeout(handler, 250)
          }
        } else {
          return handler
        }
      },

      fillBlock: function (args) {
        var blockIndex = args.blockIndex
        var block = args.block
        var leftBase = args.leftBase
        var rightBase = args.rightBase
        var scale = args.scale
        var finishCallback = args.finishCallback || function () {}

        var blockWidth = rightBase - leftBase

        this.store.getImages(
          { scale: scale, start: leftBase, end: rightBase },
          dojo.hitch(this, function (images) {
            dojo.forEach(
              images,
              function (im) {
                im.className = 'image-track'
                if (!(im.parentNode && im.parentNode.parentNode)) {
                  im.style.position = 'absolute'
                  im.style.left =
                    100 * ((im.startBase - leftBase) / blockWidth) + '%'
                  switch (this.config.align) {
                    case 'top':
                      im.style.top = '0px'
                      break
                    case 'bottom':
                    /* fall through */
                    default:
                      im.style.bottom = this.trackPadding + 'px'
                      break
                  }
                  block.domNode.appendChild(im)
                }

                // make an onload handler for when the image is fetched that
                // will update the height and width of the track
                var loadhandler = this.makeImageLoadHandler(
                  im,
                  blockIndex,
                  blockWidth,
                )
                if (im.complete) {
                  // just call the handler ourselves if the image is already loaded
                  loadhandler()
                }
                // otherwise schedule it
                else {
                  im.onload = loadhandler
                }
              },
              this,
            )
            finishCallback()
          }),
          dojo.hitch(this, function (error) {
            if (error.status == 404) {
              finishCallback()
            } else {
              this.fillBlockError(blockIndex, block, error)
            }
            finishCallback()
          }),
        )
      },

      startZoom: function (destScale, destStart, destEnd) {
        if (this.empty) {
          return
        }
      },

      endZoom: function (destScale, destBlockBases) {
        this.clear()
      },

      clear: function () {
        this.inherited(arguments)
      },

      transfer: function (
        sourceBlock,
        destBlock,
        scale,
        containerStart,
        containerEnd,
      ) {
        if (!(sourceBlock && destBlock)) {
          return
        }

        var children = sourceBlock.domNode.childNodes
        var destLeft = destBlock.startBase
        var destRight = destBlock.endBase
        var im
        for (var i = 0; i < children.length; i++) {
          im = children[i]
          if ('startBase' in im) {
            //if sourceBlock contains an image that overlaps destBlock,
            if (
              im.startBase < destRight &&
              im.startBase + im.baseWidth > destLeft
            ) {
              //move image from sourceBlock to destBlock
              im.style.left =
                100 * ((im.startBase - destLeft) / (destRight - destLeft)) + '%'
              destBlock.domNode.appendChild(im)
            }
          }
        }
      },
    },
  )
})
