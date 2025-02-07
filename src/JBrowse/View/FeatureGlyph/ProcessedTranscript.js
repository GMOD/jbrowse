define([
  'dojo/_base/declare',
  'dojo/_base/array',

  'dojox/color/Palette',

  'JBrowse/Model/SimpleFeature',
  'JBrowse/View/FeatureGlyph/Segments',
], function (
  declare,
  array,

  Palette,

  SimpleFeature,
  SegmentsGlyph,
) {
  return declare(SegmentsGlyph, {
    _defaultConfig: function () {
      return this._mergeConfigs(this.inherited(arguments), {
        style: {
          utrColor: function (feature, variable, glyph, track) {
            return glyph
              ._utrColor(glyph.getStyle(feature.parent(), 'color'))
              .toString()
          },

          utrHeightPercent: 65,
        },

        subParts: 'CDS, UTR, five_prime_UTR, three_prime_UTR',

        impliedUTRs: false,

        inferCdsParts: false,
        subSubParts: () => true, // render sub-subparts by default
      })
    },

    _getSubparts: function (f) {
      var c = f.children()
      if (!c) {
        return []
      }

      if (c && this.config.inferCdsParts) {
        c = this._makeCDSs(f, c)
      }

      if (c && this.config.impliedUTRs) {
        c = this._makeUTRs(f, c)
      }

      var filtered = []
      for (var i = 0; i < c.length; i++) {
        if (this._filterSubpart(c[i])) {
          filtered.push(c[i])
        }
      }

      return filtered
    },

    _makeCDSs: function (parent, subparts) {
      // infer CDS parts from exon coordinates

      var codeStart = Infinity,
        codeEnd = -Infinity

      var i

      // gather exons, find coding start and end
      var type,
        codeIndices = [],
        exons = []
      for (i = 0; i < subparts.length; i++) {
        type = subparts[i].get('type')
        if (/^cds/i.test(type)) {
          // if any CDSs parts are present already,
          // bail and return all subparts as-is
          if (/:CDS:/i.test(subparts[i].get('name'))) {
            return subparts
          }

          codeIndices.push(i)
          if (codeStart > subparts[i].get('start')) {
            codeStart = subparts[i].get('start')
          }
          if (codeEnd < subparts[i].get('end')) {
            codeEnd = subparts[i].get('end')
          }
        } else {
          if (/exon/i.test(type)) {
            exons.push(subparts[i])
          }
        }
      }

      // splice out unspliced cds parts
      codeIndices.sort(function (a, b) {
        return b - a
      })
      for (i = codeIndices.length - 1; i >= 0; i--) {
        subparts.splice(codeIndices[i], 1)
      }

      // bail if we don't have exons and cds
      if (!(exons.length && codeStart < Infinity && codeEnd > -Infinity)) {
        return subparts
      }

      // make sure the exons are sorted by coord
      exons.sort(function (a, b) {
        return a.get('start') - b.get('start')
      })

      // iterate thru exons again, and calculate cds parts
      var strand = parent.get('strand')
      var codePartStart = Infinity,
        codePartEnd = -Infinity
      for (i = 0; i < exons.length; i++) {
        var start = exons[i].get('start')
        var end = exons[i].get('end')

        // CDS containing exon
        if (codeStart >= start && codeEnd <= end) {
          codePartStart = codeStart
          codePartEnd = codeEnd
        }
        // 5' terminal CDS part
        else if (codeStart >= start && codeStart < end) {
          codePartStart = codeStart
          codePartEnd = end
        }
        // 3' terminal CDS part
        else if (codeEnd > start && codeEnd <= end) {
          codePartStart = start
          codePartEnd = codeEnd
        }
        // internal CDS part
        else if (start < codeEnd && end > codeStart) {
          codePartStart = start
          codePartEnd = end
        }

        // "splice in" the calculated cds part into subparts
        // at beginning of _makeCDSs() method, bail if cds subparts are encountered
        subparts.splice(
          i,
          0,
          new SimpleFeature({
            parent: parent,
            data: {
              start: codePartStart,
              end: codePartEnd,
              strand: strand,
              type: 'CDS',
              name: parent.get('uniqueID') + ':CDS:' + i,
            },
          }),
        )
      }

      // make sure the subparts are sorted by coord
      subparts.sort(function (a, b) {
        return a.get('start') - b.get('start')
      })

      return subparts
    },

    _makeUTRs: function (parent, subparts) {
      // based on Lincoln's UTR-making code in Bio::Graphics::Glyph::processed_transcript

      var codeStart = Infinity,
        codeEnd = -Infinity

      var i

      var haveLeftUTR, haveRightUTR

      // gather exons, find coding start and end, and look for UTRs
      var type,
        exons = []
      for (i = 0; i < subparts.length; i++) {
        type = subparts[i].get('type')
        if (/^cds/i.test(type)) {
          if (codeStart > subparts[i].get('start')) {
            codeStart = subparts[i].get('start')
          }
          if (codeEnd < subparts[i].get('end')) {
            codeEnd = subparts[i].get('end')
          }
        } else if (/exon/i.test(type)) {
          exons.push(subparts[i])
        } else if (this._isUTR(subparts[i])) {
          haveLeftUTR = subparts[i].get('start') == parent.get('start')
          haveRightUTR = subparts[i].get('end') == parent.get('end')
        }
      }

      // bail if we don't have exons and CDS
      if (!(exons.length && codeStart < Infinity && codeEnd > -Infinity)) {
        return subparts
      }

      // make sure the exons are sorted by coord
      exons.sort(function (a, b) {
        return a.get('start') - b.get('start')
      })

      var strand = parent.get('strand')

      // make the left-hand UTRs
      var start, end
      if (!haveLeftUTR) {
        for (i = 0; i < exons.length; i++) {
          start = exons[i].get('start')
          if (start >= codeStart) {
            break
          }
          end =
            codeStart > exons[i].get('end') ? exons[i].get('end') : codeStart

          subparts.unshift(
            new SimpleFeature({
              parent: parent,
              data: {
                start: start,
                end: end,
                strand: strand,
                type: strand >= 0 ? 'five_prime_UTR' : 'three_prime_UTR',
              },
            }),
          )
        }
      }

      // make the right-hand UTRs
      if (!haveRightUTR) {
        for (i = exons.length - 1; i >= 0; i--) {
          end = exons[i].get('end')
          if (end <= codeEnd) {
            break
          }

          start =
            codeEnd < exons[i].get('start') ? exons[i].get('start') : codeEnd
          subparts.push(
            new SimpleFeature({
              parent: parent,
              data: {
                start: start,
                end: end,
                strand: strand,
                type: strand >= 0 ? 'three_prime_UTR' : 'five_prime_UTR',
              },
            }),
          )
        }
      }

      return subparts
    },

    _utrColor: function (baseColor) {
      return (
        this._palette ||
        (this._palette = Palette.generate(baseColor, 'splitComplementary'))
      ).colors[1]
    },

    _isUTR: function (feature) {
      return /(\bUTR|_UTR|untranslated[_\s]region)\b/.test(
        feature.get('type') || '',
      )
    },

    getStyle: function (feature, name) {
      if (name == 'color') {
        if (this._isUTR(feature)) {
          return this.getStyle(feature, 'utrColor')
        }
      }

      return this.inherited(arguments)
    },

    _getFeatureHeight: function (viewInfo, feature) {
      var height = this.inherited(arguments)

      if (this._isUTR(feature)) {
        return (height * this.getStyle(feature, 'utrHeightPercent')) / 100
      }

      return height
    },
  })
})
