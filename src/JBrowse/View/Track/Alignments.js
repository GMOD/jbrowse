import dompurify from 'dompurify'

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/promise/all',
  'JBrowse/Util',
  'JBrowse/View/Track/HTMLFeatures',
  'JBrowse/View/Track/_AlignmentsMixin',
], function (declare, array, all, Util, HTMLFeatures, AlignmentsMixin) {
  // false positive
  // eslint-disable-next-line xss/no-mixed-html
  return declare(
    // false positive
    // eslint-disable-next-line xss/no-mixed-html
    [HTMLFeatures, AlignmentsMixin],
    /**
     * @lends JBrowse.View.Track.Alignments
     */
    {
      _defaultConfig: function () {
        return Util.deepUpdate(dojo.clone(this.inherited(arguments)), {
          maxFeatureScreenDensity: 1.5,
          layoutPitchY: 4,

          hideDuplicateReads: true,
          hideQCFailingReads: true,
          hideSecondary: true,
          hideSupplementary: true,
          hideMissingMatepairs: false,
          hideImproperPairs: false,
          hideUnmapped: true,
          hideUnsplicedReads: false,
          hideForwardStrand: false,
          hideReverseStrand: false,

          style: {
            _defaultLabelScale: 50,
            className: 'alignment',
            arrowheadClass: 'arrowhead',
            centerChildrenVertically: true,
            showMismatches: true,
            showSubfeatures: false,
            showLabels: false,
          },
        })
      },

      renderFeature: function (
        feature,
        uniqueId,
        block,
        scale,
        labelScale,
        descriptionScale,
        containerStart,
        containerEnd,
      ) {
        var featDiv = this.inherited(arguments)
        if (!featDiv) {
          return null
        }

        var displayStart = Math.max(feature.get('start'), containerStart)
        var displayEnd = Math.min(feature.get('end'), containerEnd)
        if (this.config.style.showMismatches) {
          this._drawMismatches(
            feature,
            featDiv,
            scale,
            displayStart,
            displayEnd,
          )
        }

        // if this feature is part of a multi-segment read, and not
        // all of its segments are aligned, add missing_mate to its
        // class
        if (
          feature.get('multi_segment_template') &&
          !feature.get('multi_segment_all_aligned')
        ) {
          featDiv.className += ' missing_mate'
        }

        return featDiv
      },

      handleSubFeatures: function (
        feature,
        featDiv,
        displayStart,
        displayEnd,
        block,
      ) {
        if (this.config.style.showSubfeatures) {
          this.inherited(arguments)
        }
      },

      /**
       * draw base-mismatches on the feature
       */
      _drawMismatches: function (
        feature,
        featDiv,
        scale,
        displayStart,
        displayEnd,
      ) {
        var featLength = displayEnd - displayStart
        // recall: scale is pixels/basepair
        if (featLength * scale > 1) {
          var mismatches = this._getMismatches(feature)
          var charSize = this.getCharacterMeasurements()
          var drawChars = scale >= charSize.w
          array.forEach(
            mismatches,
            function (mismatch) {
              var start = feature.get('start') + mismatch.start
              var end = start + mismatch.length

              // if the feature has been truncated to where it doesn't cover
              // this mismatch anymore, just skip this mismatch
              if (end <= displayStart || start >= displayEnd) {
                return
              }

              var base = mismatch.base
              var mDisplayStart = Math.max(start, displayStart)
              var mDisplayEnd = Math.min(end, displayEnd)
              var mDisplayWidth = mDisplayEnd - mDisplayStart
              var overall = dojo.create(
                'span',
                {
                  className: `${mismatch.type} base_${base.toLowerCase()}`,
                  style: {
                    position: 'absolute',
                    left: `${(100 * (mDisplayStart - displayStart)) / featLength}%`,
                    width:
                      scale * mDisplayWidth > 1
                        ? `${(100 * mDisplayWidth) / featLength}%`
                        : '1px',
                  },
                },
                featDiv,
              )

              // give the mismatch a mouseover if not drawing a character with the mismatch base
              if (!drawChars) {
                overall.title = base
              }

              if (drawChars && mismatch.length <= 20) {
                for (var i = 0; i < mismatch.length; i++) {
                  var basePosition = start + i
                  if (
                    basePosition >= mDisplayStart &&
                    basePosition <= mDisplayEnd
                  ) {
                    dojo.create(
                      'span',
                      {
                        className: `base base_${base.toLowerCase()}`,
                        style: {
                          position: 'absolute',
                          width: `${scale}px`,
                          left: `${
                            ((basePosition - mDisplayStart) / mDisplayWidth) *
                            100
                          }%`,
                        },
                        // eslint-disable-next-line xss/no-mixed-html
                        innerHTML: dompurify.sanitize(base),
                      },
                      overall,
                    )
                  }
                }
              }
            },
            this,
          )
        }
      },

      /**
       * @returns {Object} containing <code>h</code> and <code>w</code>,
       *      in pixels, of the characters being used for sequences
       */
      getCharacterMeasurements: function () {
        if (!this._measurements) {
          this._measurements = this._measureSequenceCharacterSize(this.div)
        }
        return this._measurements
      },

      /**
       * Conducts a test with DOM elements to measure sequence text width
       * and height.
       */
      _measureSequenceCharacterSize: function (containerElement) {
        var widthTest = dojo.create(
          'div',
          {
            innerHTML:
              '<span class="base mismatch">A</span>' +
              '<span class="base mismatch">C</span>' +
              '<span class="base mismatch">T</span>' +
              '<span class="base mismatch">G</span>' +
              '<span class="base mismatch">N</span>',
            style: {
              visibility: 'hidden',
              position: 'absolute',
              left: '0px',
            },
          },
          containerElement,
        )
        var result = {
          w: widthTest.clientWidth / 5,
          h: widthTest.clientHeight,
        }
        containerElement.removeChild(widthTest)
        return result
      },

      _trackMenuOptions: function () {
        return all([
          this.inherited(arguments),
          this._alignmentsFilterTrackMenuOptions(),
        ]).then(function (options) {
          var o = options.shift()
          options.unshift({ type: 'dijit/MenuSeparator' })
          return o.concat.apply(o, options)
        })
      },
    },
  )
})
