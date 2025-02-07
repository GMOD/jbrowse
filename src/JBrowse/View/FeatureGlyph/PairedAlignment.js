define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'JBrowse/View/FeatureGlyph/Alignment',
  'JBrowse/View/FeatureGlyph/AlignmentColoring',
  'JBrowse/Util',
], function (declare, array, lang, Alignment, AlignmentColoring, Util) {
  return declare(Alignment, {
    clearFeat(context, fRect) {
      if (this.track.displayMode != 'collapsed') {
        context.clearRect(
          Math.floor(fRect.l),
          fRect.t,
          Math.ceil(fRect.w),
          fRect.h,
        )
      }
    },
    renderFeature(context, fRect) {
      const f = fRect.f
      this.clearFeat(context, fRect)

      if (f.pairedFeature()) {
        this.renderConnector(context, fRect)
        this.renderSegments(context, fRect)
        if (fRect.w > 2) {
          if (fRect.viewInfo.scale > 0.2) {
            this._drawMismatches(
              context,
              fRect,
              this._getMismatches(f.read1),
              f.read1,
            )
            this._drawMismatches(
              context,
              fRect,
              this._getMismatches(f.read2),
              f.read2,
            )
          } else {
            this._drawMismatches(
              context,
              fRect,
              this._getSkipsAndDeletions(f.read1),
              f.read1,
            )
            this._drawMismatches(
              context,
              fRect,
              this._getSkipsAndDeletions(f.read2),
              f.read2,
            )
          }
        }
        const x1 = f.read1.get('start')
        const x2 = f.read1.get('end')
        const y1 = f.read2.get('start')
        const y2 = f.read2.get('end')
        if (Util.intersect(x1, x2, y1, y2)) {
          const s1 = x2 > y2 ? x1 : y1
          const s2 = x1 > y1 ? y2 : x2
          const block = fRect.viewInfo.block
          const l = block.bpToX(s1)
          const r = block.bpToX(s2)
          // avoid drawing small overlaps
          if (r - l > 2) {
            context.fillStyle = this.getStyle(f, 'overlapColor')
            context.fillRect(
              l, // left
              fRect.rect.t,
              r - l, // width
              fRect.rect.h,
            )

            var s = this.getStyle(f, 'overlapStroke')
            if (s) {
              context.strokeStyle = s
              context.strokeRect(
                l, // left
                fRect.rect.t,
                r - l, // width
                fRect.rect.h,
              )
            }
            if (fRect.viewInfo.scale > 0.2) {
              var m1 = this._getMismatches(f.read1)
              var m2 = this._getMismatches(f.read2)
              if (!m1 && !m2) {
                return
              } else {
                var mismatches = []
                for (var i = 0; i < m1.length; i++) {
                  let foundMatching = false
                  for (var j = 0; j < m2.length; j++) {
                    if (
                      x1 + m1[i].start == y1 + m2[j].start &&
                      s1 <= x1 + m1[i].start &&
                      s2 >= x1 + m1[i].start
                    ) {
                      foundMatching = true
                      mismatches.push({
                        start: m1[i].start,
                        base1: m1[i].base,
                        base2: m2[j].base,
                        type: 'mismatch',
                        length: 1,
                      })
                    }
                  }
                  if (
                    m1[i].type == 'mismatch' &&
                    s1 <= x1 + m1[i].start &&
                    s2 >= x1 + m1[i].start &&
                    !foundMatching
                  ) {
                    mismatches.push({
                      start: m1[i].start,
                      base1: m1[i].base,
                      base2: '-',
                      type: 'mismatch',
                      length: 1,
                    })
                  }
                }
                if (mismatches.length !== 0) {
                  this._drawOverlappingMismatches(
                    context,
                    fRect,
                    mismatches,
                    x1,
                  )
                }
                mismatches = []
                for (var i = 0; i < m2.length; i++) {
                  let foundMatching = false
                  for (var j = 0; j < m1.length; j++) {
                    if (
                      x1 + m1[j].start == y1 + m2[i].start &&
                      s1 <= y1 + m2[i].start &&
                      s2 >= y1 + m2[i].start
                    ) {
                      //    mismatches.push({ start: m2[i].start, base1: m2[i].base, base2: m1[j].base, type: 'mismatch', length: 1 });
                      //    would have been found in above loop also previous iteration
                      foundMatching = true
                    }
                  }
                  if (
                    m2[i].type == 'mismatch' &&
                    s1 <= y1 + m2[i].start &&
                    s2 >= y1 + m2[i].start &&
                    !foundMatching
                  ) {
                    mismatches.push({
                      start: m2[i].start,
                      base1: m2[i].base,
                      base2: '-',
                      type: 'mismatch',
                      length: 1,
                    })
                  }
                }
                if (mismatches.length !== 0) {
                  this._drawOverlappingMismatches(
                    context,
                    fRect,
                    mismatches,
                    y1,
                  )
                }
              }
            }
          }
        }
      } else {
        this.inherited(arguments)
      }
    },

    renderSegments(context, fRect) {
      this.renderBox(
        context,
        fRect.viewInfo,
        fRect.f.read1,
        fRect.t,
        fRect.rect.h,
        fRect.f,
      )
      this.renderBox(
        context,
        fRect.viewInfo,
        fRect.f.read2,
        fRect.t,
        fRect.rect.h,
        fRect.f,
      )
    },

    renderConnector(context, fRect) {
      // connector
      var connectorColor = this.getStyle(fRect.f, 'connectorColor')
      if (connectorColor) {
        context.fillStyle = connectorColor
        var connectorThickness = this.getStyle(fRect.f, 'connectorThickness')
        context.fillRect(
          fRect.rect.l, // left
          Math.round(fRect.rect.t + (fRect.rect.h - connectorThickness) / 2), // top
          fRect.rect.w, // width
          connectorThickness,
        )
      }
    },

    // draw both gaps and mismatches
    _drawOverlappingMismatches(context, fRect, mismatches, fstart) {
      var block = fRect.viewInfo.block
      var scale = block.scale

      var charSize = this.getCharacterMeasurements(context)
      context.textBaseline = 'middle' // reset to alphabetic (the default) after loop

      array.forEach(
        mismatches,
        function (mismatch) {
          var start = fstart + mismatch.start
          var end = fstart + mismatch.start + mismatch.length

          var mRect = {
            h: (fRect.rect || {}).h || fRect.h,
            l: block.bpToX(start),
            t: fRect.rect.t,
          }
          mRect.w = Math.max(block.bpToX(end) - mRect.l, 1)

          if (mismatch.type == 'mismatch') {
            if (mismatch.base1 == mismatch.base2) {
              context.fillStyle = this.track.colorForBase(
                mismatch.type == 'deletion' ? 'deletion' : mismatch.base1,
              )
            } else {
              context.fillStyle = 'black'
            }
            context.fillRect(mRect.l, mRect.t, mRect.w, mRect.h)

            if (mRect.w >= charSize.w && mRect.h >= charSize.h - 3) {
              context.font = this.config.style.mismatchFont
              if (mismatch.base1 == mismatch.base2) {
                context.fillStyle = 'black'
                context.fillText(
                  mismatch.base1,
                  mRect.l + (mRect.w - charSize.w) / 2 + 1,
                  mRect.t + mRect.h / 2,
                )
              } else if (scale >= 10) {
                context.fillStyle = 'white'
                context.fillText(
                  mismatch.base1 + '/' + mismatch.base2,
                  mRect.l + (mRect.w - charSize.w * 2) / 2 + 1,
                  mRect.t + mRect.h / 2,
                )
              }
            }
          }
        },
        this,
      )

      context.textBaseline = 'alphabetic'
    },

    _defaultConfig() {
      return this._mergeConfigs(dojo.clone(this.inherited(arguments)), {
        style: {
          connectorColor: AlignmentColoring.connectorColor,
          connectorThickness: 1,
          overlapColor: 'lightgrey',
          overlapStroke: 'grey',
        },
      })
    },
  })
})
