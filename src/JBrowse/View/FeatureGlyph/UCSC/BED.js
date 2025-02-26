define(['dojo/_base/declare', 'JBrowse/View/FeatureGlyph/Segments'], function (
  declare,
  SegmentsGlyph,
) {
  return declare(SegmentsGlyph, {
    _defaultConfig: function () {
      return this._mergeConfigs(this.inherited(arguments), {
        style: {
          connectorColor: '#333',
          connectorThickness: 1,
          borderColor: 'rgba( 0, 0, 0, 0.3 )',
        },
        itemRgb: true,
        height: 11,
        thinHeight: 5,
        subParts: () => false, // UCSC BED-like features don't have formal subparts
        subSubParts: () => false, // UCSC BED-like features don't have formal subparts
      })
    },

    parseItemRgb(itemRgb) {
      const stringEncoding = /(\d+),(\d+),(\d+)/.exec(itemRgb)
      const hex2 = num => num.toString(16).padStart(2, '0')
      if (stringEncoding) {
        const r = Number(stringEncoding[1])
        const g = Number(stringEncoding[2])
        const b = Number(stringEncoding[3])
        if (!isNaN(r) && !isNaN(g) && !isNaN(b) && (r || g || b))
          return `#${hex2(r)}${hex2(g)}${hex2(b)}`
      } else {
        const rgb = Number(itemRgb)
        if (rgb) return `#${rgb.toString(16).padStart(6, '0')}`
      }
    },

    renderSegments(context, fRect) {
      const styleFunc = (feature, stylename) => {
        if (stylename === 'height')
          return this._getFeatureHeight(fRect.viewInfo, feature)
        else if (
          stylename === 'color' &&
          this.getConf('itemRgb', [feature, this])
        ) {
          const itemRgb = this.parseItemRgb(
            feature.get('itemRgb') || feature.get('reserved'),
          )
          if (itemRgb) return itemRgb
        }

        return this.getStyle(feature, stylename)
      }

      const thickStart = Number(fRect.f.get('thick_start'))
      const thickEnd = Number(fRect.f.get('thick_end'))

      const blockCount = Number(fRect.f.get('block_count'))

      if (blockCount && fRect.f.get('end') - fRect.f.get('start') > 5) {
        let sizes = fRect.f.get('block_sizes')
        if (!Array.isArray(sizes))
          sizes = sizes.split(',').map(str => Number(str))

        let starts = fRect.f.get('chrom_starts')
        if (!Array.isArray(starts))
          starts = starts.split(',').map(str => Number(str))

        const blocksOffset = fRect.f.get('start')

        for (let b = 0; b < blockCount; b += 1) {
          const blockStart = (starts[b] | 0) + blocksOffset
          const blockEnd = blockStart + (sizes[b] | 0)

          // render the sub-block, either as a rect, or as a stroked path
          this.renderSegment(
            context,
            fRect.viewInfo,
            blockStart,
            blockEnd,
            thickStart,
            thickEnd,
            fRect.t,
            fRect.rect.h,
            fRect.f,
            styleFunc,
          )
        }
      } else {
        // render the whole thing as a single block
        this.renderSegment(
          context,
          fRect.viewInfo,
          fRect.f.get('start'),
          fRect.f.get('end'),
          thickStart,
          thickEnd,
          fRect.t,
          fRect.rect.h,
          fRect.f,
          styleFunc,
        )
      }
    },

    renderSegment(
      context,
      viewInfo,
      start,
      end,
      thickStart,
      thickEnd,
      top,
      overallHeight,
      parentFeature,
      style,
    ) {
      const left = viewInfo.block.bpToX(start)
      const width = viewInfo.block.bpToX(end) - left
      const right = left + width
      const height = this._getFeatureHeight(viewInfo, parentFeature)
      if (!height) return
      if (height !== overallHeight)
        top += Math.round((overallHeight - height) / 2)
      const bottom = top + height
      const thickStartPx = viewInfo.block.bpToX(thickStart)
      const thickEndPx = viewInfo.block.bpToX(thickEnd)

      const widthClamped = Math.max(1, width)
      const thinHeight = this.getConf('thinHeight', [parentFeature, this])
      const thinHeightDiff = (height - thinHeight) / 2

      const bgcolor = style(parentFeature, 'color')
      const borderColor = style(parentFeature, 'borderColor')
      const lineWidth = style(parentFeature, 'borderWidth')
      const halfLineWidth = lineWidth / 2

      if (width > 3) {
        let pathPoints
        let strokePoints
        if (thickStart <= start && thickEnd >= end) {
          // ===========
          pathPoints = [left, top, width, height]
          strokePoints = [
            left + halfLineWidth,
            top + halfLineWidth,
            width - lineWidth,
            height - lineWidth,
          ]
        } else if (thickStart >= end || thickEnd <= start) {
          // -----------
          pathPoints = [left, top + thinHeightDiff, width, thinHeight]
          strokePoints = [
            left + halfLineWidth,
            top + halfLineWidth + thinHeightDiff,
            width - lineWidth,
            thinHeight - lineWidth,
          ]
        } else if (thickStart <= start && thickEnd < end) {
          // ====-------
          pathPoints = [
            [left, top],
            [thickEndPx, top],
            [thickEndPx, top + thinHeightDiff],
            [right, top + thinHeightDiff],
            [right, bottom - thinHeightDiff],
            [thickEndPx, bottom - thinHeightDiff],
            [thickEndPx, bottom],
            [left, bottom],
          ]
          strokePoints = [
            [left + halfLineWidth, top + halfLineWidth],
            [thickEndPx - halfLineWidth, top + halfLineWidth],
            [thickEndPx - halfLineWidth, top + thinHeightDiff + halfLineWidth],
            [right - halfLineWidth, top + thinHeightDiff + halfLineWidth],
            [right - halfLineWidth, bottom - thinHeightDiff - halfLineWidth],
            [
              thickEndPx - halfLineWidth,
              bottom - thinHeightDiff - halfLineWidth,
            ],
            [thickEndPx - halfLineWidth, bottom - halfLineWidth],
            [left + halfLineWidth, bottom - halfLineWidth],
          ]
        } else if (thickStart > start && thickEnd >= end) {
          // -----======
          pathPoints = [
            [left, top + thinHeightDiff],
            [thickStartPx, top + thinHeightDiff],
            [thickStartPx, top],
            [right, top],
            [right, bottom],
            [thickStartPx, bottom],
            [thickStartPx, bottom - thinHeightDiff],
            [left, bottom - thinHeightDiff],
          ]
          strokePoints = [
            [left + halfLineWidth, top + thinHeightDiff + halfLineWidth],
            [
              thickStartPx + halfLineWidth,
              top + thinHeightDiff + halfLineWidth,
            ],
            [thickStartPx + halfLineWidth, top + halfLineWidth],
            [right - halfLineWidth, top + halfLineWidth],
            [right - halfLineWidth, bottom - halfLineWidth],
            [thickStartPx + halfLineWidth, bottom - halfLineWidth],
            [
              thickStartPx + halfLineWidth,
              bottom - thinHeightDiff - halfLineWidth,
            ],
            [left + halfLineWidth, bottom - thinHeightDiff - halfLineWidth],
          ]
        } else if (thickStart > start && thickEnd < end) {
          // ----====---
          pathPoints = [
            [left, top + thinHeightDiff],
            [thickStartPx, top + thinHeightDiff],
            [thickStartPx, top],
            [thickEndPx, top],
            [thickEndPx, top + thinHeightDiff],
            [right, top + thinHeightDiff],
            [right, bottom - thinHeightDiff],
            [thickEndPx, bottom - thinHeightDiff],
            [thickEndPx, bottom],
            [thickStartPx, bottom],
            [thickStartPx, bottom - thinHeightDiff],
            [left, bottom - thinHeightDiff],
          ]
          strokePoints = [
            [left + halfLineWidth, top + thinHeightDiff + halfLineWidth],
            [
              thickStartPx + halfLineWidth,
              top + thinHeightDiff + halfLineWidth,
            ],
            [thickStartPx + halfLineWidth, top + halfLineWidth],
            [thickEndPx - halfLineWidth, top + halfLineWidth],
            [thickEndPx - halfLineWidth, top + thinHeightDiff + halfLineWidth],
            [right - halfLineWidth, top + thinHeightDiff + halfLineWidth],
            [right - halfLineWidth, bottom - thinHeightDiff - halfLineWidth],
            [
              thickEndPx - halfLineWidth,
              bottom - thinHeightDiff - halfLineWidth,
            ],
            [thickEndPx - halfLineWidth, bottom - halfLineWidth],
            [thickStartPx + halfLineWidth, bottom - halfLineWidth],
            [
              thickStartPx + halfLineWidth,
              bottom - thinHeightDiff - halfLineWidth,
            ],
            [left + halfLineWidth, bottom - thinHeightDiff - halfLineWidth],
          ]
        }

        // background
        if (bgcolor) {
          context.fillStyle = bgcolor
          if (pathPoints[0].length) {
            context.beginPath()
            context.moveTo(...pathPoints[0])
            for (let i = 1; i < pathPoints.length; i += 1) {
              context.lineTo(...pathPoints[i])
            }
            context.fill()
          } else {
            context.fillRect(...pathPoints)
          }
        }

        // foreground border
        if (borderColor && lineWidth) {
          context.lineWidth = lineWidth
          context.strokeStyle = borderColor

          // need to stroke a smaller path to remain within
          // the bounds of the feature's overall height and
          // width, because of the way stroking is done in
          // canvas.  thus the +0.5 and -1 business.
          //context.strokeRect( left + lineWidth / 2, top + lineWidth / 2, width - lineWidth, height - lineWidth );
          if (strokePoints[0].length) {
            context.beginPath()
            context.moveTo(...strokePoints[0])
            for (let i = 1; i < strokePoints.length; i += 1) {
              context.lineTo(...strokePoints[i])
            }
            context.stroke()
          } else {
            context.strokeRect(...strokePoints)
          }
        }
      } else {
        // for very tiny features, just draw them as rectangles of blurry height, and shade them
        context.globalAlpha = 1
        context.fillStyle = bgcolor
        if (thickStart <= start && thickEnd >= end) {
          context.fillRect(left, top, widthClamped, height)
          context.globalAlpha = (lineWidth * 2) / width
          context.fillStyle = borderColor
          context.fillRect(left, top, widthClamped, height)
          context.globalAlpha = 1
        } else {
          context.fillRect(left, top + thinHeightDiff, widthClamped, thinHeight)
          context.globalAlpha = (lineWidth * 2) / width
          context.fillStyle = borderColor
          context.fillRect(left, top + thinHeightDiff, widthClamped, thinHeight)
          context.globalAlpha = 1
        }
      }
    },
  })
})
