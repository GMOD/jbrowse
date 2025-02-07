define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/Color',
  'dojo/on',
  'JBrowse/View/Track/WiggleBase',
  'JBrowse/View/Track/_YScaleMixin',
  'JBrowse/Util',
  './_Scale',
], function (declare, array, Color, on, WiggleBase, YScaleMixin, Util, Scale) {
  var XYPlot = declare(
    [WiggleBase, YScaleMixin],

    /**
     * Wiggle track that shows data with an X-Y plot along the reference.
     *
     * @lends JBrowse.View.Track.Wiggle.XYPlot
     * @extends JBrowse.View.Track.WiggleBase
     */
    {
      _defaultConfig: function () {
        return Util.deepUpdate(dojo.clone(this.inherited(arguments)), {
          style: {
            pos_color: 'blue',
            neg_color: 'red',
            origin_color: '#888',
            variance_band_color: 'rgba(0,0,0,0.3)',
          },
        })
      },

      _trackMenuOptions: function () {
        var track = this
        var options = this.inherited(arguments) || []

        options.push({
          label: 'No fill',
          type: 'dijit/CheckedMenuItem',
          checked: !!(this.config.noFill == true),
          onClick: function (event) {
            if (this.checked) {
              track.config.noFill = true
            } else {
              track.config.noFill = false
            }
            track.browser.publish('/jbrowse/v1/v/tracks/replace', [
              track.config,
            ])
          },
        })

        return options
      },

      _getScaling: function (viewArgs, successCallback, errorCallback) {
        this._getScalingStats(
          viewArgs,
          dojo.hitch(this, function (stats) {
            //calculate the scaling if necessary
            if (
              !this.lastScaling ||
              !this.lastScaling.sameStats(stats) ||
              this.trackHeightChanged
            ) {
              var scaling = new Scale(this.config, stats)

              // bump minDisplayed to 0 if it is within 0.5% of it
              if (Math.abs(scaling.min / scaling.max) < 0.005) {
                scaling.min = 0
              }

              // update our track y-scale to reflect it
              this.makeYScale({
                fixBounds:
                  'fixBounds' in this.config ? this.config.fixBounds : true,
                min: scaling.min,
                max: scaling.max,
              })

              // and finally adjust the scaling to match the ruler's scale rounding
              scaling.min = this.ruler.scaler.bounds.lower
              scaling.max = this.ruler.scaler.bounds.upper
              scaling.range = scaling.max - scaling.min

              this.lastScaling = scaling
              this.trackHeightChanged = false //reset flag
            }

            successCallback(this.lastScaling)
          }),
          errorCallback,
        )
      },

      updateStaticElements: function (coords) {
        this.inherited(arguments)
        this.updateYScaleFromViewDimensions(coords)
      },

      /**
       * Draw a set of features on the canvas.
       * @private
       */
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

        var ratio = Util.getResolution(
          context,
          this.browser.config.highResolutionMode,
        )
        var toY = dojo.hitch(this, function (val) {
          return (canvasHeight * (1 - dataScale.normalize(val))) / ratio
        })
        var originY = toY(dataScale.origin)

        var disableClipMarkers = this.config.disable_clip_markers

        dojo.forEach(
          pixels,
          function (p, i) {
            if (!p) {
              return
            }
            var score = toY(p['score'])
            var f = p['feat']

            // draw the background color if we are configured to do so
            if (score >= 0) {
              var bgColor = this.getConfForFeature('style.bg_color', f)
              if (bgColor) {
                context.fillStyle = bgColor
                thisB._fillRectMod(context, i, 0, 1, canvasHeight)
              }
            }

            if (score <= canvasHeight || score > originY) {
              // if the rectangle is visible at all
              if (score <= originY) {
                // bar goes upward
                context.fillStyle = this.getConfForFeature('style.pos_color', f)
                var height = originY - score + 1
                if (this.getConfForFeature('noFill', f) == true) {
                  height = 1
                }
                thisB._fillRectMod(context, i, score, 1, height)
                if (!disableClipMarkers && score < 0) {
                  // draw clip marker if necessary
                  context.fillStyle =
                    this.getConfForFeature('style.clip_marker_color', f) ||
                    this.getConfForFeature('style.neg_color', f)
                  thisB._fillRectMod(context, i, 0, 1, 3)
                }
              } else {
                // bar goes downward
                context.fillStyle = this.getConfForFeature('style.neg_color', f)
                var top = originY
                var height = score - originY
                if (this.getConfForFeature('noFill', f) == true) {
                  top = score - 1
                  height = 1
                }
                thisB._fillRectMod(context, i, top, 1, height)
                if (!disableClipMarkers && score >= canvasHeight) {
                  // draw clip marker if necessary
                  context.fillStyle =
                    this.getConfForFeature('style.clip_marker_color', f) ||
                    this.getConfForFeature('style.pos_color', f)
                  thisB._fillRectMod(context, i, canvasHeight - 3, 1, 3)
                }
              }
            }
          },
          this,
        )
      },

      /* If it's a boolean track, mask accordingly */
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

        for (var index in spans) {
          if (spans.hasOwnProperty(index)) {
            var w = Math.ceil((spans[index].end - spans[index].start) * scale)
            var l = Math.round((spans[index].start - leftBase) * scale)
            context.clearRect(l, 0, w, canvasHeight)
          }
        }
        context.globalAlpha = this.config.style.masked_transparancy || 0.2
        this.config.style.masked_transparancy = context.globalAlpha
        this._drawFeatures(
          scale,
          leftBase,
          rightBase,
          block,
          canvas,
          pixels,
          dataScale,
        )
      },

      /**
       * Draw anything needed after the features are drawn.
       */
      _postDraw: function (
        scale,
        leftBase,
        rightBase,
        block,
        canvas,
        features,
        featureRects,
        dataScale,
      ) {
        var context = canvas.getContext('2d')
        var canvasHeight = canvas.height

        var ratio = Util.getResolution(
          context,
          this.browser.config.highResolutionMode,
        )
        var toY = dojo.hitch(this, function (val) {
          return (canvasHeight * (1 - dataScale.normalize(val))) / ratio
        })
        var thisB = this

        // draw the variance_band if requested
        if (this.config.variance_band) {
          var bandPositions =
            typeof this.config.variance_band == 'object'
              ? array
                  .map(this.config.variance_band, function (v) {
                    return parseFloat(v)
                  })
                  .sort()
                  .reverse()
              : [2, 1]
          this.getGlobalStats(
            dojo.hitch(this, function (stats) {
              if ('scoreMean' in stats && 'scoreStdDev' in stats) {
                var drawVarianceBand = function (plusminus, fill, label) {
                  context.fillStyle = fill
                  var varTop = toY(stats.scoreMean + plusminus)
                  var varHeight = toY(stats.scoreMean - plusminus) - varTop
                  varHeight = Math.max(1, varHeight)
                  thisB._fillRectMod(
                    context,
                    0,
                    varTop,
                    canvas.width,
                    varHeight,
                  )
                  context.font = '12px sans-serif'
                  if (plusminus > 0) {
                    context.fillText('+' + label, 2, varTop)
                    context.fillText('-' + label, 2, varTop + varHeight)
                  } else {
                    context.fillText(label, 2, varTop)
                  }
                }

                var maxColor = new Color(this.config.style.variance_band_color)
                var minColor = new Color(this.config.style.variance_band_color)
                minColor.a /= bandPositions.length

                var bandOpacityStep = 1 / bandPositions.length
                var minOpacity = bandOpacityStep

                array.forEach(bandPositions, function (pos, i) {
                  drawVarianceBand(
                    pos * stats.scoreStdDev,
                    Color.blendColors(
                      minColor,
                      maxColor,
                      (i + 1) / bandPositions.length,
                    ).toCss(true),
                    pos + 'σ',
                  )
                })
                drawVarianceBand(0, 'rgba(255,255,0,0.7)', 'mean')
              }
            }),
          )
        }

        // draw the origin line if it is not disabled
        var originColor = this.config.style.origin_color
        if (
          typeof originColor == 'string' &&
          !{ none: 1, off: 1, no: 1, zero: 1 }[originColor]
        ) {
          var originY = toY(dataScale.origin)
          context.fillStyle = originColor
          context.fillRect(0, originY, canvas.width, 1)
        }
      },
    },
  )

  return XYPlot
})
