define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/Color',
  'JBrowse/View/Track/WiggleBase',
  'JBrowse/Util',
], function (declare, array, Color, WiggleBase, Util) {
  return declare(
    WiggleBase,

    /**
     * Wiggle track that shows data with variations in color.
     *
     * @lends JBrowse.View.Track.Wiggle.Density
     * @extends JBrowse.View.Track.WiggleBase
     */

    {
      _defaultConfig: function () {
        return Util.deepUpdate(dojo.clone(this.inherited(arguments)), {
          maxExportSpan: 500000,
          style: {
            height: 31,
            pos_color: '#00f',
            neg_color: '#f00',
            bg_color: 'rgba(230,230,230,0.6)',
            clip_marker_color: 'black',
          },
        })
      },

      _drawFeatures: function (
        scale,
        leftBase,
        rightBase,
        block,
        canvas,
        pixels,
        dataScale,
      ) {
        var thisB = this
        var context = canvas.getContext('2d')
        var canvasHeight = canvas.height
        var normalize = dataScale.normalize

        var featureColor =
          typeof this.config.style.color == 'function'
            ? this.config.style.color
            : (function () {
                // default color function uses conf variables
                var disableClipMarkers = thisB.config.disable_clip_markers
                var normOrigin = dataScale.normalize(dataScale.origin)

                return function (p, n) {
                  var feature = p['feat']
                  return disableClipMarkers || (n <= 1 && n >= 0)
                    ? // not clipped
                      Color.blendColors(
                        new Color(
                          thisB.getConfForFeature('style.bg_color', feature),
                        ),
                        new Color(
                          thisB.getConfForFeature(
                            n >= normOrigin
                              ? 'style.pos_color'
                              : 'style.neg_color',
                            feature,
                          ),
                        ),
                        Math.abs(n - normOrigin),
                      ).toString()
                    : // clipped
                      n > 1
                      ? thisB.getConfForFeature('style.pos_color', feature)
                      : thisB.getConfForFeature('style.neg_color', feature)
                }
              })()

        dojo.forEach(pixels, function (p, i) {
          if (p) {
            var score = p['score']
            var f = p['feat']

            var n = dataScale.normalize(score)
            context.fillStyle = `${featureColor(p, n)}`
            thisB._fillRectMod(context, i, 0, 1, canvasHeight)
            if (n > 1) {
              // pos clipped
              context.fillStyle =
                thisB.getConfForFeature('style.clip_marker_color', f) || 'red'
              thisB._fillRectMod(context, i, 0, 1, 3)
            } else if (n < 0) {
              // neg clipped
              context.fillStyle =
                thisB.getConfForFeature('style.clip_marker_color', f) || 'red'
              thisB._fillRectMod(context, i, canvasHeight - 3, 1, 3)
            }
          }
        })
      },

      /* If boolean track, mask accordingly */
      _maskBySpans: function (
        scale,
        leftBase,
        rightBase,
        block,
        canvas,
        pixels,
        dataScale,
        spans,
      ) {
        var context = canvas.getContext('2d')
        var canvasHeight = canvas.height
        context.fillStyle =
          this.config.style.mask_color || 'rgba(128,128,128,0.6)'
        this.config.style.mask_color = context.fillStyle

        for (var index in spans) {
          if (spans.hasOwnProperty(index)) {
            var w = Math.ceil((spans[index].end - spans[index].start) * scale)
            var l = Math.round((spans[index].start - leftBase) * scale)
            context.fillRect(l, 0, w, canvasHeight)
            context.clearRect(l, 0, w, canvasHeight / 3)
            context.clearRect(l, (2 / 3) * canvasHeight, w, canvasHeight / 3)
          }
        }
        dojo.forEach(pixels, function (p, i) {
          if (!p) {
            // if there is no data at a point, erase the mask.
            context.clearRect(i, 0, 1, canvasHeight)
          }
        })
      },

      _postDraw: function () {},
    },
  )
})
