define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'JBrowse/View/FeatureGlyph/Box',
  'JBrowse/View/FeatureGlyph/UnprocessedTranscript',
  'JBrowse/View/FeatureGlyph/ProcessedTranscript',
], function (
  declare,
  lang,
  array,
  BoxGlyph,
  UnprocessedTranscript,
  ProcessedTranscriptGlyph,
) {
  return declare(BoxGlyph, {
    _defaultConfig: function () {
      return this._mergeConfigs(this.inherited(arguments), {
        transcriptType: 'mRNA',
        noncodingType: ['ncRNA', 'lnc_RNA', 'lncRNA', 'miRNA'],
        style: {
          transcriptLabelFont: 'normal 10px Univers,Helvetica,Arial,sans-serif',
          transcriptLabelColor: 'black',
          textFont: 'bold 12px Univers,Helvetica,Arial,sans-serif',
        },
        labelTranscripts: true,
        marginBottom: 0,
      })
    },

    _boxGlyph: function () {
      return (
        this.__boxGlyph ||
        (this.__boxGlyph = new BoxGlyph({
          track: this.track,
          browser: this.browser,
          config: this.config,
        }))
      )
    },
    _ntGlyph: function () {
      return (
        this.__ntGlyph ||
        (this.__ntGlyph = new UnprocessedTranscript({
          track: this.track,
          browser: this.browser,
          config: this.config,
        }))
      )
    },
    _ptGlyph: function () {
      return (
        this.__ptGlyph ||
        (this.__ptGlyph = new ProcessedTranscriptGlyph({
          track: this.track,
          browser: this.browser,
          config: this.config,
        }))
      )
    },

    _getFeatureRectangle(viewArgs, feature) {
      // we need to lay out rects for each of the subfeatures
      var subArgs = lang.mixin({}, viewArgs)
      subArgs.showDescriptions = subArgs.showLabels = false
      var subfeatures = feature.children()

      // if this gene weirdly has no subfeatures, just render as a box
      if (!subfeatures || !subfeatures.length) {
        return this.inherited(arguments)
      }

      // get the rects for the children
      var padding = 1
      var fRect = {
        l: 0,
        h: 0,
        r: 0,
        w: 0,
        subRects: [],
        viewInfo: viewArgs,
        f: feature,
        glyph: this,
      }
      if (subfeatures && subfeatures.length) {
        // sort the children by name
        subfeatures.sort(function (a, b) {
          return (a.get('name') || a.get('id') || '').localeCompare(
            b.get('name') || b.get('id') || '',
          )
        })

        fRect.l = Infinity
        fRect.r = -Infinity

        var transcriptType = this.getConfForFeature('transcriptType', feature)
        var noncodingType = this.getConfForFeature('noncodingType', feature)
        for (var i = 0; i < subfeatures.length; i++) {
          var subRect = (
            subfeatures[i].get('type') == transcriptType
              ? this._ptGlyph()
              : noncodingType.includes(subfeatures[i].get('type'))
                ? this._ntGlyph()
                : this._boxGlyph()
          )._getFeatureRectangle(subArgs, subfeatures[i])

          padding = i == subfeatures.length - 1 ? 0 : 1
          subRect.t = subRect.rect.t =
            fRect.h && viewArgs.displayMode != 'collapsed'
              ? fRect.h + padding
              : 0

          if (
            viewArgs.showLabels &&
            this.getConfForFeature('labelTranscripts', subfeatures[i])
          ) {
            var transcriptLabel = this.makeSideLabel(
              this.getFeatureLabel(subfeatures[i]),
              this.getStyle(subfeatures[i], 'transcriptLabelFont'),
              subRect,
            )
            if (transcriptLabel) {
              transcriptLabel.fill = this.getStyle(
                subfeatures[i],
                'transcriptLabelColor',
              )
              subRect.label = transcriptLabel
              subRect.l -= transcriptLabel.w
              subRect.w += transcriptLabel.w
              if (transcriptLabel.h > subRect.h) {
                subRect.h = transcriptLabel.h
              }
              transcriptLabel.yOffset = Math.floor(subRect.h / 2)
              transcriptLabel.xOffset = 0
            }
          }

          fRect.subRects.push(subRect)
          fRect.r = Math.max(fRect.r, subRect.l + subRect.w - 1)
          fRect.l = Math.min(fRect.l, subRect.l)
          fRect.h = subRect.t + subRect.h + padding
        }
      }

      // calculate the width
      fRect.w = Math.max(fRect.r - fRect.l + 1, 2)
      delete fRect.r
      fRect.rect = { l: fRect.l, h: fRect.h, w: fRect.w }
      if (viewArgs.displayMode != 'compact') {
        fRect.h += this.getStyle(feature, 'marginBottom') || 0
      }

      // no labels or descriptions if displayMode is collapsed, so stop here
      if (viewArgs.displayMode == 'collapsed') {
        return fRect
      }

      // expand the fRect to accommodate labels if necessary
      this._expandRectangleWithLabels(viewArgs, feature, fRect)
      this._addMasksToRect(viewArgs, feature, fRect)

      return fRect
    },

    layoutFeature: function (viewInfo, layout, feature) {
      var fRect = this.inherited(arguments)
      if (fRect) {
        array.forEach(fRect.subRects, function (subrect) {
          subrect.t += fRect.t
          subrect.rect.t += fRect.t
        })
      }
      return fRect
    },

    renderFeature(context, fRect) {
      const subRects = fRect.subRects
      if (!subRects || subRects.length === 0) {
        return this.inherited(arguments)
      }

      if (fRect.viewInfo.displayMode != 'collapsed') {
        context.clearRect(
          Math.floor(fRect.l),
          fRect.t,
          Math.ceil(fRect.w - Math.floor(fRect.l) + fRect.l),
          fRect.h,
        )
      }

      for (var i = 0; i < subRects.length; i++) {
        subRects[i].glyph.renderFeature(context, subRects[i])
      }

      this.renderLabel(context, fRect)
      this.renderDescription(context, fRect)
    },

    updateStaticElements: function (context, fRect, viewArgs) {
      this.inherited(arguments)

      var subRects = fRect.subRects || []
      for (var i = 0; i < subRects.length; i++) {
        subRects[i].glyph.updateStaticElements(context, subRects[i], viewArgs)
      }
    },
  })
})
