define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'JBrowse/Util/FastPromise',
  'JBrowse/View/FeatureGlyph',
  './_FeatureLabelMixin',
  'JBrowse/Util',
], function (
  declare,
  lang,
  FastPromise,
  FeatureGlyph,
  FeatureLabelMixin,
  Util,
) {
  return declare([FeatureGlyph, FeatureLabelMixin], {
    constructor: function () {
      this._embeddedImagePromises = {}
    },

    _defaultConfig: function () {
      return this._mergeConfigs(this.inherited(arguments), {
        style: {
          maxDescriptionLength: 70,

          color: 'goldenrod',
          mouseovercolor: 'rgba(0,0,0,0.3)',
          borderColor: null,
          borderWidth: 0.5,
          height: 11,
          marginBottom: 2,

          strandArrow: true,

          label: 'name, id',
          textFont: 'normal 12px Univers,Helvetica,Arial,sans-serif',
          textColor: 'black',
          text2Color: 'blue',
          text2Font: 'normal 12px Univers,Helvetica,Arial,sans-serif',

          description: 'note, description',
        },
      })
    },

    _getFeatureHeight: function (viewArgs, feature) {
      var h = this.getStyle(feature, 'height')

      if (viewArgs.displayMode == 'compact') h = Math.round(0.45 * h)

      if (this.getStyle(feature, 'strandArrow')) {
        var strand = feature.get('strand')
        if (strand == 1) h = Math.max(this._embeddedImages.plusArrow.height, h)
        else if (strand == -1)
          h = Math.max(this._embeddedImages.minusArrow.height, h)
      }

      return h
    },

    _getFeatureRectangle: function (viewArgs, feature) {
      var block = viewArgs.block
      var fRect = {
        l: block.bpToX(feature.get('start')),
        h: this._getFeatureHeight(viewArgs, feature),
        viewInfo: viewArgs,
        f: feature,
        glyph: this,
      }

      fRect.w = block.bpToX(feature.get('end')) - fRect.l

      // save the original rect in `rect` as the dimensions
      // we'll use for the rectangle itself
      fRect.rect = {
        l: fRect.l,
        h: fRect.h,
        w: Math.max(fRect.w, 2),
        t: 0,
      }
      fRect.w = fRect.rect.w // in case it was increased
      if (viewArgs.displayMode != 'compact')
        fRect.h += this.getStyle(feature, 'marginBottom') || 0
      // if we are showing strand arrowheads, expand the frect a little
      if (this.getStyle(feature, 'strandArrow')) {
        var strand = (fRect.strandArrow = feature.get('strand'))

        if (strand == -1) {
          var i = this._embeddedImages.minusArrow
          fRect.w += i.width
          fRect.l -= i.width
        } else {
          var i = this._embeddedImages.plusArrow
          fRect.w += i.width
        }
      }

      // no labels or descriptions if displayMode is collapsed, so stop here
      if (viewArgs.displayMode == 'collapsed') return fRect

      this._expandRectangleWithLabels(viewArgs, feature, fRect)
      this._addMasksToRect(viewArgs, feature, fRect)

      return fRect
    },

    layoutFeature: function (viewArgs, layout, feature) {
      var rect = this.inherited(arguments)
      if (!rect) return rect

      // need to set the top of the inner rect
      rect.rect.t = rect.t

      return rect
    },

    // given an under-construction feature layout rectangle, expand it
    // to accomodate a label and/or a description
    _expandRectangleWithLabels: function (viewArgs, feature, fRect) {
      // maybe get the feature's name, and update the layout box
      // accordingly
      if (viewArgs.showLabels) {
        var label = this.makeFeatureLabel(feature, fRect)
        if (label) {
          fRect.h += label.h
          fRect.w = Math.max(label.w, fRect.w)
          fRect.label = label
          label.yOffset = fRect.rect.h + label.h
        }
      }

      // maybe get the feature's description if available, and
      // update the layout box accordingly
      if (viewArgs.showDescriptions) {
        var description = this.makeFeatureDescriptionLabel(feature, fRect)
        if (description) {
          fRect.description = description
          fRect.h += description.h
          fRect.w = Math.max(description.w, fRect.w)
          description.yOffset =
            fRect.h - (this.getStyle(feature, 'marginBottom') || 0)
        }
      }
    },

    _embeddedImages: {
      plusArrow: {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAFCAYAAACXU8ZrAAAATUlEQVQIW2NkwATGQKFYIG4A4g8gacb///+7AWlBmNq+vj6V4uLiJiD/FRBXA/F8xu7u7kcVFRWyMEVATQz//v0Dcf9CxaYRZxIxbgIARiAhmifVe8UAAAAASUVORK5CYII=',
        width: 9,
        height: 5,
      },

      minusArrow: {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAFCAYAAACXU8ZrAAAASklEQVQIW2NkQAABILMBiBcD8VkkcQZGIAeEE4G4FYjFent764qKiu4gKXoPUjAJiLOggsxMTEwMjIwgYQjo6Oh4TLRJME043QQA+W8UD/sdk9IAAAAASUVORK5CYII=',
        width: 9,
        height: 5,
      },
    },

    /**
     * Returns a promise for an Image object for the image with the
     * given name.  Image data comes from a data URL embedded in this
     * source code.
     */
    getEmbeddedImage: function (name) {
      return (
        this._embeddedImagePromises[name] ||
        function () {
          var p = new FastPromise()
          var imgRec = this._embeddedImages[name]
          if (!imgRec) {
            p.resolve(null)
          } else {
            var i = new Image()
            var thisB = this
            i.onload = function () {
              p.resolve(this)
            }
            i.src = imgRec.data
          }
          return (this._embeddedImagePromises[name] = p)
        }.call(this)
      )
    },

    renderFeature: function (context, fRect) {
      if (this.track.displayMode != 'collapsed')
        context.clearRect(
          Math.floor(fRect.l),
          fRect.t,
          Math.ceil(fRect.w - Math.floor(fRect.l) + fRect.l),
          fRect.h,
        )

      this.renderBox(
        context,
        fRect.viewInfo,
        fRect.f,
        fRect.t,
        fRect.rect.h,
        fRect.f,
      )
      this.renderLabel(context, fRect)
      this.renderDescription(context, fRect)
      this.renderArrowhead(context, fRect)
    },

    // top and height are in px
    renderBox: function (
      context,
      viewInfo,
      feature,
      top,
      overallHeight,
      parentFeature,
      style,
    ) {
      var left = viewInfo.block.bpToX(feature.get('start'))
      var width = viewInfo.block.bpToX(feature.get('end')) - left
      //left = Math.round( left );
      //width = Math.round( width );

      style = style || lang.hitch(this, 'getStyle')

      var height = this._getFeatureHeight(viewInfo, feature)
      if (!height) return
      if (height != overallHeight)
        top += Math.round((overallHeight - height) / 2)

      // background
      var bgcolor = style(feature, 'color')
      if (bgcolor) {
        context.fillStyle = bgcolor
        context.fillRect(left, top, Math.max(1, width), height)
      } else {
        context.clearRect(left, top, Math.max(1, width), height)
      }

      // foreground border
      var borderColor, lineWidth
      if (
        (borderColor = style(feature, 'borderColor')) &&
        (lineWidth = style(feature, 'borderWidth'))
      ) {
        if (width > 3) {
          context.lineWidth = lineWidth
          context.strokeStyle = borderColor

          // need to stroke a smaller rectangle to remain within
          // the bounds of the feature's overall height and
          // width, because of the way stroking is done in
          // canvas.  thus the +0.5 and -1 business.
          context.strokeRect(
            left + lineWidth / 2,
            top + lineWidth / 2,
            width - lineWidth,
            height - lineWidth,
          )
        } else {
          context.globalAlpha = (lineWidth * 2) / width
          context.fillStyle = borderColor
          context.fillRect(left, top, Math.max(1, width), height)
          context.globalAlpha = 1
        }
      }
    },

    // feature label is handled by updateStaticElements
    renderLabel: function (context, fRect) {},

    // feature description is handled by updateStaticElements
    renderDescription: function (context, fRect) {},

    // strand arrowhead is sometimes drawn normally, sometimes *also* as a static element
    renderArrowhead: function (context, fRect) {
      if (fRect.strandArrow) {
        if (
          fRect.strandArrow == 1 &&
          fRect.rect.l + fRect.rect.w <= context.canvas.width
        ) {
          this.getEmbeddedImage('plusArrow').then(function (img) {
            context.imageSmoothingEnabled = false
            context.drawImage(
              img,
              fRect.rect.l + fRect.rect.w,
              fRect.t + (fRect.rect.h - img.height) / 2,
            )
          })
        } else if (fRect.strandArrow == -1 && fRect.rect.l >= 0) {
          this.getEmbeddedImage('minusArrow').then(function (img) {
            context.imageSmoothingEnabled = false
            context.drawImage(
              img,
              fRect.rect.l - 9,
              fRect.t + (fRect.rect.h - img.height) / 2,
            )
          })
        }
      }
    },

    updateStaticElements(context, fRect, viewArgs) {
      const vMin = viewArgs.minVisible
      const vMax = viewArgs.maxVisible
      const block = fRect.viewInfo.block

      const bpToPx = viewArgs.bpToPx
      const feature = fRect.f

      const fMin = feature.get('start')
      const fMax = feature.get('end')
      const bMin = block.startBase
      const bMax = block.endBase

      if (fRect.strandArrow) {
        if (fRect.strandArrow == 1 && fMax >= vMax && fMin <= vMax) {
          this.getEmbeddedImage('plusArrow').then(function (img) {
            context.imageSmoothingEnabled = false
            context.drawImage(
              img,
              bpToPx(vMax) - bpToPx(vMin) - 9,
              fRect.t + (fRect.rect.h - img.height) / 2,
            )
          })
        } else if (fRect.strandArrow == -1 && fMin <= vMin && fMax >= vMin) {
          this.getEmbeddedImage('minusArrow').then(function (img) {
            context.imageSmoothingEnabled = false
            context.drawImage(img, 0, fRect.t + (fRect.rect.h - img.height) / 2)
          })
        }
      }

      // if the feature is within the view and within this block
      if (fMin < vMax && fMax > vMin && fMin < bMax && fMax > bMin) {
        let fRectLeft = fRect.l + bpToPx(block.startBase - vMin + 1)

        let clamp = (val, min, max) => Math.min(Math.max(val, min), max)
        let renderText = fLabelRecord => {
          let maxLabelLeft = fRectLeft + fRect.w - fLabelRecord.w
          let labelTop = fRect.t + (fLabelRecord.yOffset || 0)
          let labelLeft = fRectLeft + (fLabelRecord.xOffset || 0)
          labelLeft = clamp(labelLeft, 0, maxLabelLeft)

          context.font = fLabelRecord.font
          context.fillStyle = fLabelRecord.fill
          context.textBaseline = fLabelRecord.baseline

          let clearTop
          if (fLabelRecord.baseline === 'bottom') {
            clearTop = labelTop - fLabelRecord.h
          } else if (fLabelRecord.baseline === 'top') {
            clearTop = labelTop
          } else if (fLabelRecord.baseline === 'middle') {
            clearTop = labelTop - fLabelRecord.h / 2
          }
          if (clearTop)
            context.clearRect(
              labelLeft,
              clearTop,
              fLabelRecord.w,
              fLabelRecord.h,
            )

          context.fillText(fLabelRecord.text, labelLeft, labelTop)
        }

        if (fRect.label) {
          renderText(fRect.label)
        }
        if (fRect.description) {
          renderText(fRect.description)
        }
      }
    },
  })
})
