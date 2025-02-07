import dompurify from 'dompurify'

/**
 * Mixin to provide a `defaultFeatureDetail` method that is optimized for
 * displaying variant data from VCF files.
 */

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/promise/all',
  'JBrowse/Util',
  'JBrowse/View/Track/_FeatureDetailMixin',
  'JBrowse/View/Track/_NamedFeatureFiltersMixin',
  'JBrowse/Model/NestedFrequencyTable',
], function (
  declare,
  array,
  lang,
  domConstruct,
  all,
  Util,
  FeatureDetailMixin,
  NamedFeatureFiltersMixin,
  NestedFrequencyTable,
) {
  return declare([FeatureDetailMixin, NamedFeatureFiltersMixin], {
    defaultFeatureDetail: function (
      /** JBrowse.Track */ track,
      /** Object */ f,
      /** HTMLElement */ featDiv,
      /** HTMLElement */ container,
    ) {
      container =
        container ||
        domConstruct.create('div', {
          className: `detail feature-detail feature-detail-${track.name}`,
          innerHTML: '',
        })

      this._renderCoreDetails(track, f, featDiv, container)

      this._renderAdditionalTagsDetail(track, f, featDiv, container)

      // genotypes in a separate section
      this._renderGenotypes(container, track, f, featDiv)

      return container
    },
    renderDetailValue: function (parent, title, val, f, class_) {
      if (title == 'alternative_alleles') {
        val = val.join(',')
      }
      return this.inherited(arguments, [parent, title, val, f, class_])
    },
    _isReservedTag: function (t) {
      return this.inherited(arguments) || { genotypes: 1 }[t.toLowerCase()]
    },

    _renderGenotypes: function (parentElement, track, f) {
      var thisB = this
      var genotypes = f.get('genotypes')
      if (!genotypes) {
        return
      }

      var keys = Util.dojof.keys(genotypes).sort()
      var gCount = keys.length
      if (!gCount) {
        return
      }

      var alt = (f.get('alternative_alleles') || {}).values

      var gContainer = domConstruct.create(
        'div',
        {
          className: 'genotypes',
          innerHTML: `<h2 class="sectiontitle">Genotypes (${gCount})</h2>`,
        },
        parentElement,
      )

      function render(underlyingRefSeq) {
        thisB._renderGenotypeSummary(gContainer, genotypes, alt)

        var valueContainer = domConstruct.create(
          'div',
          { className: 'value_container genotypes' },
          gContainer,
        )

        thisB.renderDetailValueGrid(
          valueContainer,
          'Genotypes',
          f,
          // iterator
          function () {
            if (!keys.length) {
              return null
            }
            var k = keys.shift()
            var value = genotypes[k]
            var item = { id: k }
            for (var field in value) {
              item[field] =
                field === 'GT'
                  ? thisB._mungeGenotypeVal(
                      value[field].values,
                      alt,
                      underlyingRefSeq,
                    )
                  : genotypes[k][field]
            }
            return item
          },
          {
            descriptions: (function () {
              if (!keys.length) {
                return {}
              }

              var subValue = genotypes[keys[0]]
              var descriptions = {}
              for (var k in subValue) {
                descriptions[k] =
                  f.parser.getMetadata('FORMAT', k, 'Description') || null
              }
              return descriptions
            })(),
            renderCell: {
              GT: function (field, value, node, options) {
                thisB.renderDetailValue(node, '', value, f, '')
              },
            },
          },
        )
      }

      track.browser.getStore('refseqs', function (refSeqStore) {
        if (refSeqStore) {
          refSeqStore.getReferenceSequence(
            {
              ref: track.refSeq.name,
              start: f.get('start'),
              end: f.get('end'),
            },
            render,
            function () {
              render()
            },
          )
        } else {
          render()
        }
      })
    },

    _mungeGenotypeVal: function (values, alt, underlyingRefSeq) {
      // handle the GT field specially, translating the genotype indexes into the actual ALT strings
      let value_parse
      if (values == null) {
        value_parse = '.'
      } else {
        value_parse = values[0]
      }

      var splitter = (value_parse.match(/[\|\/]/g) || [])[0] // only accept | and / splitters since . can mean no call
      var refseq = underlyingRefSeq ? `ref (${underlyingRefSeq})` : 'ref'
      values = array
        .map(
          splitter ? value_parse.split(splitter) : value_parse,
          function (gtIndex) {
            gtIndex = parseInt(gtIndex) || gtIndex
            if (gtIndex == '.') {
              return 'no-call'
            } else if (gtIndex == 0) {
              return refseq
            } else {
              return alt ? alt[gtIndex - 1] : gtIndex
            }
          },
        )
        .join(` ${splitter} `)
      return values
    },

    _renderGenotypeSummary: function (parentElement, genotypes, alt) {
      if (!genotypes) {
        return
      }

      var counts = new NestedFrequencyTable()
      for (var gname in genotypes) {
        if (genotypes.hasOwnProperty(gname)) {
          // increment the appropriate count
          var gtVals = (genotypes[gname].GT || {}).values
          if (gtVals == null) {
            gtVals = ['.']
          }
          var gt = gtVals[0].split(/\||\//)
          if (lang.isArray(gt)) {
            // if all zero, non-variant/hom-ref
            if (
              array.every(gt, function (g) {
                return parseInt(g) == 0
              })
            ) {
              counts
                .getNested('non-variant')
                .increment('homozygous for reference')
            } else if (
              array.every(gt, function (g) {
                return g == '.'
              })
            ) {
              counts.getNested('non-variant').increment('no call')
            } else if (
              array.every(gt, function (g) {
                return g == gt[0]
              })
            ) {
              if (alt) {
                counts
                  .getNested('variant/homozygous')
                  .increment(`${alt[parseInt(gt[0]) - 1]} variant`)
              } else {
                counts.getNested('variant').increment('homozygous')
              }
            } else {
              counts.getNested('variant').increment('heterozygous')
            }
          }
        }
      }

      var total = counts.total()
      if (!total) {
        return
      }

      var valueContainer = domConstruct.create(
        'div',
        { className: 'value_container big genotype_summary' },
        parentElement,
      )
      //domConstruct.create('h3', { innerHTML: 'Summary' }, valueContainer);

      var tableElement = domConstruct.create('table', {}, valueContainer)

      function renderFreqTable(table, level) {
        table.forEach(function (count, categoryName) {
          var tr = domConstruct.create('tr', {}, tableElement)
          domConstruct.create(
            'td',
            {
              className: `category level_${level}`,
              // eslint-disable-next-line xss/no-mixed-html
              innerHTML: dompurify.sanitize(categoryName),
            },
            tr,
          )
          if (typeof count == 'object') {
            var thisTotal = count.total()
            domConstruct.create(
              'td',
              {
                className: `count level_${level}`,
                // eslint-disable-next-line xss/no-mixed-html
                innerHTML: dompurify.sanitize(thisTotal),
              },
              tr,
            )
            domConstruct.create(
              'td',
              {
                className: `pct level_${level}`,
                innerHTML: `${Math.round((thisTotal / total) * 10000) / 100}%`,
              },
              tr,
            )
            renderFreqTable(count, level + 1)
          } else {
            domConstruct.create(
              'td',
              {
                className: `count level_${level}`,

                // eslint-disable-next-line xss/no-mixed-html
                innerHTML: dompurify.sanitize(count),
              },
              tr,
            )
            domConstruct.create(
              'td',
              {
                className: `pct level_${level}`,
                innerHTML: `${Math.round((count / total) * 10000) / 100}%`,
              },
              tr,
            )
          }
        })
      }

      renderFreqTable(counts, 0)

      var totalTR = domConstruct.create('tr', {}, tableElement)
      domConstruct.create(
        'td',
        { className: 'category total', innerHTML: 'Total' },
        totalTR,
      )
      domConstruct.create(
        'td',
        {
          className: 'count total',

          // eslint-disable-next-line xss/no-mixed-html
          innerHTML: dompurify.sanitize(total),
        },
        totalTR,
      )
      domConstruct.create(
        'td',
        { className: 'pct total', innerHTML: '100%' },
        totalTR,
      )
    },

    // filters for VCF sites
    _getNamedFeatureFilters: function () {
      var thisB = this
      return all([
        this.store.getParser().then(parser => parser.getMetadata()),
        this.inherited(arguments),
      ]).then(function (results) {
        if (results[0]) {
          return thisB._makeVCFFilters.apply(thisB, results)
        } else {
          return results[1]
        }
      })
    },

    // given VCF metadata, make some appropriate named feature
    // filters to filter its data
    _makeVCFFilters: function (vcfMetadata, inheritedFilters) {
      // wraps the callback to return true if there
      // is no filter attr
      function makeFilterFilter(condition) {
        return function (f) {
          f = f.get('filter')
          return !f || condition(f)
        }
      }
      var filters = lang.mixin({}, inheritedFilters, {
        hideFilterPass: {
          desc: 'Hide sites passing all filters',
          func: makeFilterFilter(function (filter) {
            try {
              return filter.values.join('').toUpperCase() != 'PASS'
            } catch (e) {
              return filter.toUpperCase() != 'PASS'
            }
          }),
        },
        hideNotFilterPass: {
          desc: 'Hide sites not passing all filters',
          func: makeFilterFilter(function (f) {
            try {
              return f.values.join('').toUpperCase() == 'PASS'
            } catch (e) {
              return f.toUpperCase() != 'PASS'
            }
          }),
        },
      })
      if (vcfMetadata.FILTER) {
        for (var filterName in vcfMetadata.FILTER) {
          filters[`${filterName}_hide`] = function (filterName, filterSpec) {
            return {
              desc: `Hide sites passing filter "${filterName}"`,
              title: `${filterName}: ${filterSpec.description}`,
              func: makeFilterFilter(function (f) {
                var fs = f.values || f
                if (!fs[0]) {
                  return true
                }

                return !array.some(fs, function (fname) {
                  return fname == filterName
                })
              }),
            }
          }.call(this, filterName, vcfMetadata.FILTER[filterName])
        }
        for (var filterName in vcfMetadata.FILTER) {
          filters[`${filterName}_include`] = function (filterName, filterSpec) {
            return {
              desc: `Include sites passing filter "${filterName}"`,
              title: `${filterName}: ${filterSpec.description}`,
              func: makeFilterFilter(function (f) {
                var fs = f.values || f
                if (!fs[0]) {
                  return true
                }

                return array.some(fs, function (fname) {
                  return fname == filterName
                })
              }),
            }
          }.call(this, filterName, vcfMetadata.FILTER[filterName])
        }
      }
      return filters
    },

    _variantsFilterTrackMenuOptions: function () {
      // add toggles for feature filters
      var track = this
      return this._getNamedFeatureFilters().then(function (filters) {
        // merge our builtin filters with additional ones
        // that might have been generated in
        // _getNamedFeatureFilters() based on e.g. the VCF
        // header
        var menuItems = ['hideFilterPass', 'hideNotFilterPass', 'SEPARATOR']
        var withAdditional = Util.uniq(
          menuItems.concat(Util.dojof.keys(filters)),
        )
        if (withAdditional.length > menuItems.length) {
          menuItems = withAdditional
        } else {
          menuItems.pop()
        } //< pop off the separator since we have no additional ones

        return track._makeFeatureFilterTrackMenuItems(menuItems, filters)
      })
    },
  })
})
