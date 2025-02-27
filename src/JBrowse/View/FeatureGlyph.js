define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/aspect',
  'JBrowse/Component',
], function (declare, array, aspect, Component) {
  return declare(Component, {
    constructor: function (args) {
      this.track = args.track
      this.booleanAlpha = 0.17

      // This allows any features that are completely masked to have their transparency set before being rendered,
      // saving the hassle of clearing and rerendering later on.
      aspect.before(
        this,
        'renderFeature',
        function (context, fRect) {
          if (fRect.m) {
            var l = Math.floor(fRect.l)
            var w = Math.ceil(fRect.w + fRect.l) - l
            fRect.m.sort(function (a, b) {
              return a.l - b.l
            })
            var m = fRect.m[0]
            if (m.l <= l) {
              // Determine whether the feature is entirely masked.
              var end = fRect.m[0].l
              for (var i in fRect.m) {
                var m = fRect.m[i]
                if (m.l > end) {
                  break
                }
                end = m.l + m.w
              }
              if (end >= l + w) {
                context.globalAlpha = this.booleanAlpha
                fRect.noMask = true
              }
            }
          }
        },
        true,
      )

      // after rendering the features, do masking if required
      aspect.after(
        this,
        'renderFeature',
        function (context, fRect) {
          if (fRect.m && !fRect.noMask) {
            this.maskBySpans(context, fRect)
          } else if (fRect.noMask) {
            delete fRect.noMask
            context.globalAlpha = 1
          }
        },
        true,
      )
    },

    getStyle: function (feature, name) {
      return this.getConfForFeature(`style.${name}`, feature)
    },

    /**
     * Like getConf, but get a conf value that explicitly can vary
     * feature by feature.  Provides a uniform function signature for
     * user-defined callbacks.
     */
    getConfForFeature: function (path, feature) {
      return this.getConf(path, [feature, path, this, this.track])
    },

    mouseoverFeature: function (context, fRect) {
      this.renderFeature(context, fRect)

      // highlight the feature rectangle if we're moused over
      context.fillStyle = this.getStyle(fRect.f, 'mouseovercolor')
      context.fillRect(fRect.rect.l, fRect.t, fRect.rect.w, fRect.rect.h)
    },

    /**
     * Get the dimensions of the rendered feature in pixels.
     */
    _getFeatureRectangle: function (viewInfo, feature) {
      var block = viewInfo.block
      var fRect = {
        l: block.bpToX(feature.get('start')),
        h: this._getFeatureHeight(viewInfo, feature),
        viewInfo: viewInfo,
        f: feature,
        glyph: this,
      }

      fRect.w = block.bpToX(feature.get('end')) - fRect.l

      this._addMasksToRect(viewInfo, feature, fRect)
    },

    _addMasksToRect: function (viewArgs, feature, fRect) {
      // if the feature has masks, add them to the fRect.
      var block = viewArgs.block

      if (feature.masks) {
        fRect.m = []
        array.forEach(feature.masks, function (m) {
          var tempM = { l: block.bpToX(m.start) }
          tempM.w = block.bpToX(m.end) - tempM.l
          fRect.m.push(tempM)
        })
      }

      return fRect
    },

    layoutFeature: function (viewArgs, layout, feature) {
      var fRect = this._getFeatureRectangle(viewArgs, feature)

      var scale = viewArgs.scale
      var leftBase = viewArgs.leftBase
      var startbp = fRect.l / scale + leftBase
      var endbp = (fRect.l + fRect.w) / scale + leftBase
      fRect.t = layout.addRect(feature.id(), startbp, endbp, fRect.h, feature)
      if (fRect.t === null) {
        return null
      }

      fRect.f = feature

      return fRect
    },

    //stub
    renderFeature: function (context, fRect) {},

    /* If it's a boolean track, mask accordingly */
    maskBySpans: function (context, fRect) {
      var canvasHeight = context.canvas.height

      var thisB = this

      // make a temporary canvas to store image data
      var tempCan = dojo.create('canvas', {
        height: canvasHeight,
        width: context.canvas.width,
      })
      var ctx2 = tempCan.getContext('2d')
      var l = Math.floor(fRect.l)
      var w = Math.ceil(fRect.w + fRect.l) - l

      /* note on the above: the rightmost pixel is determined
           by l+w. If either of these is a float, then canvas
           methods will not behave as desired (i.e. clear and
           draw will not treat borders in the same way).*/
      array.forEach(fRect.m, function (m) {
        try {
          if (m.l < l) {
            m.w += m.l - l
            m.l = l
          }
          if (m.w > w) {
            m.w = w
          }
          if (m.l < 0) {
            m.w += m.l
            m.l = 0
          }
          if (m.l + m.w > l + w) {
            m.w = w + l - m.l
          }
          if (m.l + m.w > context.canvas.width) {
            m.w = context.canvas.width - m.l
          }
          ctx2.drawImage(
            context.canvas,
            m.l,
            fRect.t,
            m.w,
            fRect.h,
            m.l,
            fRect.t,
            m.w,
            fRect.h,
          )
          context.globalAlpha = thisB.booleanAlpha
          // clear masked region and redraw at lower opacity.
          context.clearRect(m.l, fRect.t, m.w, fRect.h)
          context.drawImage(
            tempCan,
            m.l,
            fRect.t,
            m.w,
            fRect.h,
            m.l,
            fRect.t,
            m.w,
            fRect.h,
          )
          context.globalAlpha = 1
        } catch (e) {}
      })
    },

    _getFeatureHeight: function (viewArgs, feature) {
      return this.getStyle(feature, 'height')
    },

    updateStaticElements: function (context, fRect, viewArgs) {},
  })
})
