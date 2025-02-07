define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/dom-construct',
  'dojo/dom-geometry',
  'dojo/on',
  'dojo/query',
  'JBrowse/has',
  'dijit/Dialog',
  'dijit/form/Select',
  'dijit/form/RadioButton',
  'dijit/form/Button',
  'JBrowse/View/Track/BlockBased',
  'JBrowse/View/Track/_YScaleMixin',
  'JBrowse/View/Track/_ExportMixin',
  'JBrowse/View/Track/_FeatureDetailMixin',
  'JBrowse/View/Track/_TrackDetailsStatsMixin',
  'JBrowse/Util',
  'JBrowse/View/GranularRectLayout',
  'JBrowse/Model/Location',
], function (
  declare,
  lang,
  array,
  dom,
  domGeom,
  on,
  query,
  has,
  dijitDialog,
  dijitSelect,
  dijitRadioButton,
  dijitButton,
  BlockBased,
  YScaleMixin,
  ExportMixin,
  FeatureDetailMixin,
  TrackDetailsStatsMixin,
  Util,
  Layout,
  Location,
) {
  var HTMLFeatures = declare(
    [
      BlockBased,
      YScaleMixin,
      ExportMixin,
      FeatureDetailMixin,
      TrackDetailsStatsMixin,
    ],
    {
      /**
       * A track that draws discrete features using `div` elements.
       * @constructs
       * @extends JBrowse.View.Track.BlockBased
       * @param args.config {Object} track configuration. Must include key, label
       * @param args.refSeq {Object} reference sequence object with name, start,
       *   and end members.
       * @param args.changeCallback {Function} optional callback for
       *   when the track's data is loaded and ready
       * @param args.trackPadding {Number} distance in px between tracks
       */
      constructor: function (args) {
        //number of histogram bins per block
        this.numBins =
          lang.getObject('histogram.binsPerBlock', false, this.config) || 25

        this.defaultPadding = 5
        this.padding = this.defaultPadding

        this.glyphHeightPad = 1
        this.levelHeightPad = 2
        this.labelPad = 1

        // if calculated feature % width would be less than minFeatWidth, then set width to minFeatWidth instead
        this.minFeatWidth = 1

        this.trackPadding = args.trackPadding

        this.heightCache = {} // cache for the heights of some
        // feature elements, indexed by the
        // complete cassName of the feature

        this.showLabels = this.config.style.showLabels

        this._setupEventHandlers()

        // hook point
        if (typeof this.extendedInit === 'function') {
          this.extendedInit()
        }
      },

      /**
       * Returns object holding the default configuration for HTML-based feature tracks.
       * @private
       */
      _defaultConfig: function () {
        return Util.deepUpdate(lang.clone(this.inherited(arguments)), {
          maxFeatureScreenDensity: 0.5,

          // maximum height of the track, in pixels
          maxHeight: 1000,

          style: {
            arrowheadClass: 'arrowhead',

            className: 'feature2',

            // not configured by users
            _defaultHistScale: 4,
            _defaultLabelScale: 30,
            _defaultDescriptionScale: 120,

            minSubfeatureWidth: 6,
            maxDescriptionLength: 70,
            showLabels: true,

            label: 'name,id',
            description: 'note, description',

            centerChildrenVertically: true, // by default use feature child centering
          },
          hooks: {
            create: function (track, feat) {
              return document.createElement('div')
            },
          },
          events: {},
          menuTemplate: [
            {
              label: 'View details',
              title: '{type} {name}',
              action: 'contentDialog',
              iconClass: 'dijitIconTask',
              content: dojo.hitch(this, 'defaultFeatureDetail'),
            },
            {
              label: function () {
                return `Highlight this ${
                  this.feature && this.feature.get('type')
                    ? this.feature.get('type')
                    : 'feature'
                }`
              },
              action: function () {
                var loc = new Location({
                  feature: this.feature,
                  tracks: [this.track],
                })
                this.track.browser.setHighlightAndRedraw(loc)
              },
              iconClass: 'dijitIconFilter',
            },
          ],
        })
      },

      /**
       * Make life easier for event handlers by handing them some things
       */
      wrapHandler: function (handler) {
        var track = this
        return function (event) {
          event = event || window.event
          if (event.shiftKey) {
            return
          }
          var elem = event.currentTarget || event.srcElement
          //depending on bubbling, we might get the subfeature here
          //instead of the parent feature
          if (!elem.feature) {
            elem = elem.parentElement
          }
          if (!elem.feature) {
            return
          } //shouldn't happen; just bail if it does
          handler(track, elem, elem.feature, event)
        }
      },

      fillHistograms: function (args) {
        var blockIndex = args.blockIndex
        var block = args.block
        var leftBase = args.leftBase
        var rightBase = args.rightBase
        var stripeWidth = args.stripeWidth

        var blockSizeBp = Math.abs(rightBase - leftBase)

        // bases in each histogram bin that we're currently rendering
        var basesPerBin = blockSizeBp / this.numBins

        var track = this
        this.store.getRegionFeatureDensities(
          {
            ref: this.refSeq.name,
            start: args.leftBase,
            end: args.rightBase,
            basesPerBin: basesPerBin,
          },
          function (histData) {
            if (track._fillType != 'histograms') {
              return
            } // we must have moved on

            var hist = histData.bins
            var maxBin = 0
            for (var bin = 0; bin < track.numBins; bin++) {
              if (typeof hist[bin] == 'number' && isFinite(hist[bin])) {
                maxBin = Math.max(maxBin, hist[bin])
              }
            }

            var logScale = histData.stats
              ? histData.stats.mean / histData.stats.max < 0.01
              : false
            var pxPerCount = histData.stats
              ? 100 /
                (logScale ? Math.log(histData.stats.max) : histData.stats.max)
              : 2
            var dims = {
              basesPerBin: basesPerBin,
              pxPerCount: pxPerCount,
              logScale: logScale,
              stats: histData.stats,
            }

            var binDiv
            for (bin = 0; bin < track.numBins; bin++) {
              if (!(typeof hist[bin] == 'number' && isFinite(hist[bin]))) {
                continue
              }
              binDiv = document.createElement('div')
              binDiv.className = `hist feature-hist ${track.config.style.className}-hist`
              binDiv.style.cssText =
                `left: ${(bin / track.numBins) * 100}%; ` +
                `height: ${
                  dims.pxPerCount *
                  (dims.logScale ? Math.log(hist[bin]) : hist[bin])
                }px;` +
                `bottom: ${track.trackPadding}px;` +
                `width: ${100 / track.numBins - 100 / stripeWidth}%;${
                  track.config.style.histCss ? track.config.style.histCss : ''
                }`
              binDiv.setAttribute('value', hist[bin])
              if (Util.is_ie6) {
                binDiv.appendChild(document.createComment())
              }
              block.domNode.appendChild(binDiv)
            }

            track.heightUpdate(
              dims.pxPerCount * (dims.logScale ? Math.log(maxBin) : maxBin),
              blockIndex,
            )
            track.makeHistogramYScale(blockSizeBp, dims, histData)
          },
          dojo.hitch(this, 'fillBlockError', blockIndex, block),
        )

        args.finishCallback()
      },

      endZoom: function (destScale, destBlockBases) {
        this.clear()
      },

      updateStaticElements: function (coords) {
        this.inherited(arguments)
        this.updateYScaleFromViewDimensions(coords)
        this.updateFeatureLabelPositions(coords)
        this.updateFeatureArrowPositions(coords)
      },

      updateFeatureArrowPositions: function (coords) {
        if (!('x' in coords)) {
          return
        }

        var viewmin = this.browser.view.minVisible()
        var viewmax = this.browser.view.maxVisible()

        var blocks = this.blocks

        for (var blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
          var block = blocks[blockIndex]
          if (!block) {
            continue
          }
          var childNodes = block.domNode.childNodes
          for (var i = 0; i < childNodes.length; i++) {
            var featDiv = childNodes[i]
            if (!featDiv.feature) {
              continue
            }
            var feature = featDiv.feature

            // Retrieve containerStart/End to resolve div truncation from renderFeature
            var containerStart = featDiv._containerStart
            var containerEnd = featDiv._containerEnd

            var strand = feature.get('strand')
            if (!strand) {
              continue
            }

            var fmin = feature.get('start')
            var fmax = feature.get('end')
            var arrowhead
            var featDivChildren
            //borrow displayStart,displayEnd for arrowhead calculations because of truncations in renderFeat
            var displayStart = Math.max(fmin, containerStart)
            var displayEnd = Math.min(fmax, containerEnd)

            // minus strand
            if (strand < 0 && fmax > viewmin) {
              var minusArrowClass = `minus-${this.config.style.arrowheadClass}`
              featDivChildren = featDiv.childNodes
              for (var j = 0; j < featDivChildren.length; j++) {
                arrowhead = featDivChildren[j]
                if (typeof arrowhead.className === 'string') {
                  if (
                    arrowhead &&
                    arrowhead.className &&
                    arrowhead.className.indexOf(minusArrowClass) >= 0
                  ) {
                    arrowhead.style.left = `${
                      fmin < viewmin
                        ? block.bpToX(viewmin) - block.bpToX(displayStart)
                        : -this.minusArrowWidth
                    }px`
                  }
                }
              }
            }
            // plus strand
            else if (strand > 0 && fmin < viewmax) {
              var plusArrowClass = `plus-${this.config.style.arrowheadClass}`
              featDivChildren = featDiv.childNodes
              for (var j = 0; j < featDivChildren.length; j++) {
                arrowhead = featDivChildren[j]
                if (typeof arrowhead.className === 'string') {
                  if (
                    arrowhead &&
                    arrowhead.className &&
                    arrowhead.className.indexOf(plusArrowClass) >= 0
                  ) {
                    arrowhead.style.right = `${
                      fmax > viewmax
                        ? block.bpToX(displayEnd) - block.bpToX(viewmax - 2)
                        : -this.plusArrowWidth
                    }px`
                  }
                }
              }
            }
          }
        }
      },

      updateFeatureLabelPositions: function (coords) {
        var showLabels = this.browser._showLabels
        if (!('x' in coords)) {
          return
        }

        array.forEach(
          this.blocks,
          function (block, blockIndex) {
            // calculate the view left coord relative to the
            // block left coord in units of pct of the block
            // width
            if (!block || !this.label) {
              return
            }
            var viewLeft =
              (100 *
                (this.label.offsetLeft +
                  (showLabels ? this.label.offsetWidth : 0) -
                  block.domNode.offsetLeft)) /
                block.domNode.offsetWidth +
              2

            // if the view start is unknown, or is to the
            // left of this block, we don't have to worry
            // about adjusting the feature labels
            if (!viewLeft) {
              return
            }

            var blockWidth = block.endBase - block.startBase

            array.forEach(
              block.domNode.childNodes,
              function (featDiv) {
                if (!featDiv.label) {
                  return
                }
                var labelDiv = featDiv.label
                var feature = featDiv.feature

                // get the feature start and end in terms of block width pct
                var minLeft = parseInt(feature.get('start'))
                minLeft = (100 * (minLeft - block.startBase)) / blockWidth
                var maxLeft = parseInt(feature.get('end'))
                maxLeft =
                  100 *
                  ((maxLeft - block.startBase) / blockWidth -
                    labelDiv.offsetWidth / block.domNode.offsetWidth)

                // move our label div to the view start if the start is between the feature start and end
                labelDiv.style.left = `${Math.max(minLeft, Math.min(viewLeft, maxLeft))}%`
              },
              this,
            )
          },
          this,
        )
      },

      fillBlock: function (args) {
        var blockIndex = args.blockIndex
        var block = args.block
        var leftBase = args.leftBase
        var rightBase = args.rightBase
        var scale = args.scale
        var containerStart = args.containerStart
        var containerEnd = args.containerEnd

        var region = {
          ref: this.refSeq.name,
          start: leftBase,
          end: rightBase,
        }

        this.store.getGlobalStats(
          dojo.hitch(this, function (stats) {
            var density = stats.featureDensity
            var histScale =
              this.config.style.histScale ||
              density * this.config.style._defaultHistScale
            var featureScale =
              this.config.style.featureScale ||
              density / this.config.maxFeatureScreenDensity // (feat/bp) / ( feat/px ) = px/bp )

            // only update the label once for each block size
            var blockBases = Math.abs(leftBase - rightBase)
            if (this._updatedLabelForBlockSize != blockBases) {
              if (this.store.getRegionFeatureDensities && scale < histScale) {
                this.setLabel(
                  `${
                    this.key
                  } <span class="feature-density">per ${Util.addCommas(
                    Math.round(blockBases / this.numBins),
                  )} bp</span>`,
                )
              } else {
                this.setLabel(this.key)
              }
              this._updatedLabelForBlockSize = blockBases
            }

            // if our store offers density histograms, and we are zoomed out far enough, draw them
            if (this.store.getRegionFeatureDensities && scale < histScale) {
              this._fillType = 'histograms'
              this.fillHistograms(args)
            }
            // if we have no histograms, check the predicted density of
            // features on the screen, and display a message if it's
            // bigger than maxFeatureScreenDensity
            else if (scale < featureScale) {
              this.fillTooManyFeaturesMessage(blockIndex, block, scale)
              args.finishCallback()
            } else {
              // if we have transitioned to viewing features, delete the
              // y-scale used for the histograms
              this.removeYScale()
              this._fillType = 'features'
              this.fillFeatures(dojo.mixin({ stats: stats }, args))
            }
          }),
          dojo.hitch(this, 'fillBlockError', blockIndex, block),
        )
      },

      /**
       * Creates a Y-axis scale for the feature histogram.  Must be run after
       * the histogram bars are drawn, because it sometimes must use the
       * track height to calculate the max value if there are no explicit
       * histogram stats.
       */
      makeHistogramYScale: function (blockSizeBp, dims, histData) {
        if (dims.logScale) {
          console.error('Log histogram scale axis labels not yet implemented.')
          return
        }
        var maxval = this.height / dims.pxPerCount
        maxval = dims.logScale ? Math.log(maxval) : maxval

        // if we have a scale, and it has the same characteristics
        // (including pixel height), don't redraw it.
        if (
          this.yscale &&
          this.yscale_params &&
          this.yscale_params.maxval == maxval &&
          this.yscale_params.height == this.height &&
          this.yscale_params.blockbp == blockSizeBp
        ) {
          return
        } else {
          this.removeYScale()
          this.makeYScale({ min: 0, max: maxval })
          this.yscale_params = {
            height: this.height,
            blockbp: blockSizeBp,
            maxval: maxval,
          }
        }
      },

      destroy: function () {
        this._clearLayout()
        this.inherited(arguments)
      },

      cleanupBlock: function (block) {
        if (block) {
          // discard the layout for this range
          if (this.layout) {
            this.layout.discardRange(block.startBase, block.endBase)
          }

          if (block.featureNodes) {
            for (var name in block.featureNodes) {
              var featDiv = block.featureNodes[name]
              array.forEach(
                'track,feature,callbackArgs,_labelScale,_descriptionScale'.split(
                  ',',
                ),
                function (a) {
                  Util.removeAttribute(featDiv, a)
                },
              )
              if ('label' in featDiv) {
                array.forEach(
                  'track,feature,callbackArgs'.split(','),
                  function (a) {
                    Util.removeAttribute(featDiv.label, a)
                  },
                )
                Util.removeAttribute(featDiv, 'label')
              }
            }
          }
        }

        this.inherited(arguments)
      },

      /**
       * Called when sourceBlock gets deleted.  Any child features of
       * sourceBlock that extend onto destBlock should get moved onto
       * destBlock.
       */
      transfer: function (
        sourceBlock,
        destBlock,
        scale,
        containerStart,
        containerEnd,
      ) {
        if (!(sourceBlock && destBlock)) {
          return
        }

        var destLeft = destBlock.startBase
        var destRight = destBlock.endBase
        var blockWidth = destRight - destLeft
        var sourceSlot

        var overlaps =
          sourceBlock.startBase < destBlock.startBase
            ? sourceBlock.rightOverlaps
            : sourceBlock.leftOverlaps
        overlaps = overlaps || []

        for (var i = 0; i < overlaps.length; i++) {
          //if the feature overlaps destBlock,
          //move to destBlock & re-position
          sourceSlot = sourceBlock.featureNodes[overlaps[i]]
          if (sourceSlot && sourceSlot.label && sourceSlot.label.parentNode) {
            sourceSlot.label.parentNode.removeChild(sourceSlot.label)
          }
          if (sourceSlot && sourceSlot.feature) {
            if (
              sourceSlot.layoutEnd > destLeft &&
              sourceSlot.feature.get('start') < destRight
            ) {
              sourceSlot.parentNode.removeChild(sourceSlot)

              delete sourceBlock.featureNodes[overlaps[i]]

              /* feature render, adding to block, centering refactored into addFeatureToBlock() */
              var featDiv = this.addFeatureToBlock(
                sourceSlot.feature,
                overlaps[i],
                destBlock,
                scale,
                sourceSlot._labelScale,
                sourceSlot._descriptionScale,
                containerStart,
                containerEnd,
              )
              // if there are boolean coverage divs, modify feature accordingly.
              if (sourceSlot.booleanCovs) {
                this._maskTransfer(
                  featDiv,
                  sourceSlot,
                  containerStart,
                  containerEnd,
                )
              }
            }
          }
        }
      },

      /**
       * Called by "tranfer" when sourceBlock gets deleted.  Ensures that any child features of
       * sourceBlock that extend onto destBlock will remain masked when moved onto
       * destBlock.
       */
      _maskTransfer: function (
        featDiv,
        sourceSlot,
        containerStart,
        containerEnd,
      ) {
        var subfeatures = []
        // remove subfeatures
        while (featDiv.firstChild) {
          subfeatures.push(featDiv.firstChild)
          featDiv.removeChild(featDiv.firstChild)
        }
        var s = featDiv.featureEdges.s
        var e = featDiv.featureEdges.e
        for (var key in sourceSlot.booleanCovs) {
          if (sourceSlot.booleanCovs.hasOwnProperty(key)) {
            // dynamically resize the coverage divs.
            var start = sourceSlot.booleanCovs[key].span.s
            var end = sourceSlot.booleanCovs[key].span.e
            if (end < containerStart || start > containerEnd) {
              continue
            }
            // note: we should also remove it from booleanCovs at some point.
            sourceSlot.booleanCovs[key].style.left =
              `${(100 * (start - s)) / (e - s)}%`
            sourceSlot.booleanCovs[key].style.width =
              `${(100 * (end - start)) / (e - s)}%`
            featDiv.appendChild(sourceSlot.booleanCovs[key])
          }
        }
        // add the processed subfeatures, if in frame.
        query('.basicSubfeature', sourceSlot).forEach(
          function (node, idx, arr) {
            var start = node.subfeatureEdges.s
            var end = node.subfeatureEdges.e
            if (end < containerStart || start > containerEnd) {
              return
            }
            node.style.left = `${(100 * (start - s)) / (e - s)}%`
            node.style.width = `${(100 * (end - start)) / (e - s)}%`
            featDiv.appendChild(node)
          },
        )
        if (this.config.style.arrowheadClass) {
          // add arrowheads
          var a = this.config.style.arrowheadClass
          query(`.minus-${a}, .plus-${a}`, sourceSlot).forEach(
            function (node, idx, arr) {
              featDiv.appendChild(node)
            },
          )
        }
        featDiv.className = 'basic'
        featDiv.oldClassName = sourceSlot.oldClassName
        featDiv.booleanCovs = sourceSlot.booleanCovs
      },

      /**
       * arguments:
       * @param args.block div to be filled with info
       * @param args.leftBlock div to the left of the block to be filled
       * @param args.rightBlock div to the right of the block to be filled
       * @param args.leftBase starting base of the block
       * @param args.rightBase ending base of the block
       * @param args.scale pixels per base at the current zoom level
       * @param args.containerStart don't make HTML elements extend further left than this
       * @param args.containerEnd don't make HTML elements extend further right than this. 0-based.
       */
      fillFeatures: function (args) {
        var blockIndex = args.blockIndex
        var block = args.block
        var leftBase = args.leftBase
        var rightBase = args.rightBase
        var scale = args.scale
        var stats = args.stats
        var containerStart = args.containerStart
        var containerEnd = args.containerEnd
        var finishCallback = args.finishCallback
        var browser = this.browser

        this.scale = scale

        block.featureNodes = {}

        //determine the glyph height, arrowhead width, label text dimensions, etc.
        if (!this.haveMeasurements) {
          this.measureStyles()
          this.haveMeasurements = true
        }

        var labelScale =
          this.config.style.labelScale ||
          stats.featureDensity * this.config.style._defaultLabelScale
        var descriptionScale =
          this.config.style.descriptionScale ||
          stats.featureDensity * this.config.style._defaultDescriptionScale

        var curTrack = this

        var featCallback = feature => {
          // feature rendering, adding to block, centering refactored into addFeatureToBlock()

          const uniqueId = feature.id()

          if (this._featureIsRendered(uniqueId)) {
            return
          }

          if (!this.filterFeature(feature)) {
            return
          }

          // deprecated Apollo hook point, need to schedule this block for removal
          if (typeof this.renderFilter === 'function') {
            // deprecation warning
            if (!this._warnedAboutRenderFilterDeprecation) {
              console.warn(
                'the HTMLFeatures.renderFilter is deprecated, please use the existing feature filtering functionality (addFeatureFilter)',
              )
              this._warnedAboutRenderFilterDeprecation = true
            }

            let render = this.renderFilter(feature)
            if (render === 1) {
              this.addFeatureToBlock(
                feature,
                uniqueId,
                block,
                scale,
                labelScale,
                descriptionScale,
                containerStart,
                containerEnd,
              )
            }
            return
          }

          // normal case
          this.addFeatureToBlock(
            feature,
            uniqueId,
            block,
            scale,
            labelScale,
            descriptionScale,
            containerStart,
            containerEnd,
          )
        }

        this.store.getFeatures(
          { ref: this.refSeq.name, start: leftBase, end: rightBase },
          featCallback,
          function (args) {
            curTrack.heightUpdate(
              curTrack._getLayout(scale).getTotalHeight(),
              blockIndex,
            )
            if (args && args.maskingSpans) {
              //note: spans have to be inverted
              var invSpan = []
              invSpan[0] = { start: leftBase }
              var i = 0
              for (var span in args.maskingSpans) {
                if (args.maskingSpans.hasOwnProperty(span)) {
                  span = args.maskingSpans[span]
                  invSpan[i].end = span.start
                  i++
                  invSpan[i] = { start: span.end }
                }
              }
              invSpan[i].end = rightBase
              if (invSpan[i].end <= invSpan[i].start) {
                invSpan.splice(i, 1)
              }
              if (invSpan[0].end <= invSpan[0].start) {
                invSpan.splice(0, 1)
              }
              curTrack.maskBySpans(invSpan, args.maskingSpans)
            }
            finishCallback()
          },
          function (error) {
            console.error(error, error.stack)
            curTrack.fillBlockError(blockIndex, block, error)
            finishCallback()
          },
        )
      },
      /**
       * template for renderFilter
       * This hook allows filtering of features to render.
       * @param {type} feature
       * @returns true if render feature, false if not
       */
      /*
             renderFilter: function(feature) {
             return 1;
             },
             */
      /**
       *  Creates feature div, adds to block, and centers subfeatures.
       *  Overridable by subclasses that need more control over the substructure.
       */
      addFeatureToBlock: function (
        feature,
        uniqueId,
        block,
        scale,
        labelScale,
        descriptionScale,
        containerStart,
        containerEnd,
      ) {
        var thisB = this

        if (
          (typeof this.browser.config.inferHTMLSubfeatures === 'undefined' ||
            this.browser.config.inferHTMLSubfeatures === true) &&
          feature.get('type') == 'gene' &&
          feature.get('subfeatures')
        ) {
          var d = dojo.create('div')
          var feats = feature.get('subfeatures')
          if (!feats) {
            return null
          }
          feats.forEach(function (feat) {
            if (!thisB._featureIsRendered(`${uniqueId}_${thisB.getId(feat)}`)) {
              featDiv = thisB.renderFeature(
                feat,
                `${uniqueId}_${thisB.getId(feat)}`,
                block,
                scale,
                labelScale,
                descriptionScale,
                containerStart,
                containerEnd,
              )
              if (featDiv) {
                // In case the feature was not rendered (too many)
                d.appendChild(featDiv)
              }
            }
          })
          block.domNode.appendChild(d)
          if (this.config.style.centerChildrenVertically) {
            d.childNodes.forEach(function (featDiv) {
              thisB._centerChildrenVertically(featDiv)
            })
          }
          return d
        } else {
          var featDiv = this.renderFeature(
            feature,
            uniqueId,
            block,
            scale,
            labelScale,
            descriptionScale,
            containerStart,
            containerEnd,
          )
          if (!featDiv) {
            return null
          }

          block.domNode.appendChild(featDiv)
          if (this.config.style.centerChildrenVertically) {
            this._centerChildrenVertically(featDiv)
          }
        }
        return featDiv
      },

      fillBlockTimeout: function (blockIndex, block) {
        this.inherited(arguments)
        block.featureNodes = {}
      },

      /**
       * Returns true if a feature is visible and rendered someplace in the blocks of this track.
       * @private
       */
      _featureIsRendered: function (uniqueId) {
        var blocks = this.blocks
        for (var i = 0; i < blocks.length; i++) {
          if (
            blocks[i] &&
            blocks[i].featureNodes &&
            blocks[i].featureNodes[uniqueId]
          ) {
            return true
          }
        }
        return false
      },

      /**
       * If spans are passed to the track (i.e. if it is a boolean track), mask features accordingly.
       */
      maskBySpans: function (invSpans, spans) {
        var blocks = this.blocks
        for (var i in blocks) {
          if (blocks.hasOwnProperty(i)) {
            // loop through all blocks
            if (!blocks[i]) {
              continue
            }
            var block = blocks[i]
            var bs = block.startBase
            var be = block.endBase

            var overlaps = function (featStart, featEnd, spanStart, spanEnd) {
              // outputs start and end points of overlap
              var s = Math.max(featStart, spanStart)
              var e = Math.min(featEnd, spanEnd)
              if (s < e) {
                return { s: s, e: e }
              }
              return false
            }

            var union = function (start1, end1, start2, end2) {
              // outputs the endpoints of the union
              if (overlaps(start1, end1, start2, end2)) {
                return {
                  s: Math.min(start1, start2),
                  e: Math.max(end1, end2),
                }
              } else {
                return false
              }
            }

            var makeDiv = function (start, end, parentDiv, masked, voidClass) {
              // make a coverage div
              var coverageNode = dojo.create('div')
              var s = parentDiv.featureEdges
                ? parentDiv.featureEdges.s
                : parentDiv.subfeatureEdges.s
              var e = parentDiv.featureEdges
                ? parentDiv.featureEdges.e
                : parentDiv.subfeatureEdges.e
              coverageNode.span = { s: start, e: end }
              coverageNode.className = masked
                ? feat.className == voidClass
                  ? `${feat.oldClassName} Boolean-transparent`
                  : `${feat.className} Boolean-transparent`
                : feat.className == voidClass
                  ? feat.oldClassName
                  : feat.className
              coverageNode.booleanDiv = true
              coverageNode.style.left = `${(100 * (start - s)) / (e - s)}%`
              coverageNode.style.top = '0px'
              coverageNode.style.width = `${(100 * (end - start)) / (e - s)}%`
              return coverageNode
            }

            var addDiv = function (
              start,
              end,
              parentDiv,
              masked,
              voidClass,
              isAdded,
            ) {
              // Loop through coverage Nodes, combining existing nodes so they don't overlap, and add new divs.
              isAdded = isAdded || false
              for (var key in parentDiv.childNodes) {
                if (
                  parentDiv.childNodes[key] &&
                  parentDiv.childNodes[key].booleanDiv
                ) {
                  var divStart = parentDiv.childNodes[key].span.s
                  var divEnd = parentDiv.childNodes[key].span.e
                  if (divStart <= start && divEnd >= end) {
                    isAdded = true
                    break
                  }
                  var u = union(start, end, divStart, divEnd)
                  if (u) {
                    var coverageNode = makeDiv(
                      u.s,
                      u.e,
                      parentDiv,
                      masked,
                      voidClass,
                    )
                    var tempIndex = parentDiv.booleanCovs.indexOf(
                      parentDiv.childNodes[key],
                    )
                    parentDiv.removeChild(parentDiv.childNodes[key])
                    parentDiv.booleanCovs.splice(tempIndex, 1)
                    parentDiv.appendChild(coverageNode)
                    parentDiv.booleanCovs.push(coverageNode)
                    isAdded = true
                    addDiv(u.s, u.e, parentDiv, masked, voidClass, true)
                    break
                  }
                }
              }
              if (!isAdded) {
                var coverageNode = makeDiv(
                  start,
                  end,
                  parentDiv,
                  masked,
                  voidClass,
                )
                parentDiv.appendChild(coverageNode)
                parentDiv.booleanCovs.push(coverageNode)
              }
            }

            var addOverlaps = function (
              s,
              e,
              feat,
              spans,
              invSpans,
              voidClass,
            ) {
              if (!feat.booleanCovs) {
                feat.booleanCovs = []
              }
              // add opaque divs
              for (var index in invSpans) {
                if (invSpans.hasOwnProperty(index)) {
                  var ov = overlaps(
                    s,
                    e,
                    invSpans[index].start,
                    invSpans[index].end,
                  )
                  if (ov) {
                    addDiv(ov.s, ov.e, feat, false, voidClass)
                  }
                }
              }
              // add masked divs
              for (var index in spans) {
                if (spans.hasOwnProperty(index)) {
                  var ov = overlaps(s, e, spans[index].start, spans[index].end)
                  if (ov) {
                    addDiv(ov.s, ov.e, feat, true, voidClass)
                  }
                }
              }

              feat.oldClassName =
                feat.className == voidClass ? feat.oldClassName : feat.className
              feat.className = voidClass
            }

            for (var key in block.featureNodes) {
              if (block.featureNodes.hasOwnProperty(key)) {
                var feat = block.featureNodes[key]
                if (!feat.feature) {
                  // If there is no feature property, than it is a subfeature
                  var s = feat.subfeatureEdges.s
                  var e = feat.subfeatureEdges.e
                  addOverlaps(s, e, feat, spans, invSpans, 'basicSubfeature')
                  continue
                }
                var s = feat.feature.get('start')
                var e = feat.feature.get('end')
                addOverlaps(s, e, feat, spans, invSpans, 'basic')
              }
            }
          }
        }
      },

      measureStyles: function () {
        let container = this.browser.container

        //determine dimensions of labels (height, per-character width)
        var heightTest = document.createElement('div')
        heightTest.className = 'feature-label'
        heightTest.style.height = 'auto'
        heightTest.style.visibility = 'hidden'
        heightTest.appendChild(document.createTextNode('1234567890'))
        container.appendChild(heightTest)
        this.labelHeight = heightTest.clientHeight
        this.labelWidth = heightTest.clientWidth / 10
        container.removeChild(heightTest)

        //measure the height of glyphs
        var glyphBox
        heightTest = document.createElement('div')
        //cover all the bases: stranded or not, phase or not
        heightTest.className = `feature ${this.config.style.className} plus-${
          this.config.style.className
        } plus-${this.config.style.className}1`
        if (this.config.style.featureCss) {
          heightTest.style.cssText = this.config.style.featureCss
        }
        heightTest.style.visibility = 'hidden'
        if (Util.is_ie6) {
          heightTest.appendChild(document.createComment('foo'))
        }
        container.appendChild(heightTest)
        glyphBox = domGeom.getMarginBox(heightTest)
        this.glyphHeight = Math.round(glyphBox.h)
        this.padding = this.defaultPadding + glyphBox.w
        container.removeChild(heightTest)

        //determine the width of the arrowhead, if any
        if (this.config.style.arrowheadClass) {
          var ah = document.createElement('div')
          ah.className = `plus-${this.config.style.arrowheadClass}`
          if (Util.is_ie6) {
            ah.appendChild(document.createComment('foo'))
          }
          container.appendChild(ah)
          glyphBox = domGeom.position(ah)
          this.plusArrowWidth = glyphBox.w
          this.plusArrowHeight = glyphBox.h
          ah.className = `minus-${this.config.style.arrowheadClass}`
          glyphBox = domGeom.position(ah)
          this.minusArrowWidth = glyphBox.w
          this.minusArrowHeight = glyphBox.h
          container.removeChild(ah)
        }
      },

      hideAll: function () {
        this._clearLayout()
        return this.inherited(arguments)
      },

      getFeatDiv: function (feature) {
        var id = this.getId(feature)
        var gene_id

        if (
          (typeof this.browser.config.inferHTMLSubfeatures === 'undefined' ||
            this.browser.config.inferHTMLSubfeatures === true) &&
          feature.parent() &&
          feature.parent().get('type') == 'gene'
        ) {
          gene_id = `${this.getId(feature.parent())}_${this.getId(feature)}`
        }

        if (!id && !gene_id) {
          return null
        }

        for (var i = 0; i < this.blocks.length; i++) {
          var b = this.blocks[i]
          if (b && b.featureNodes) {
            var f = b.featureNodes[id]
            if (f) {
              return f
            }
            f = b.featureNodes[gene_id]
            if (f) {
              return f
            }
          }
        }

        return null
      },

      getId: function (f) {
        return f.id()
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
        //featureStart and featureEnd indicate how far left or right
        //the feature extends in bp space, including labels
        //and arrowheads if applicable

        var featureEnd = feature.get('end')
        var featureStart = feature.get('start')
        if (typeof featureEnd == 'string') {
          featureEnd = parseInt(featureEnd)
        }
        if (typeof featureStart == 'string') {
          featureStart = parseInt(featureStart)
        }
        // layoutStart: start genome coord (at current scale) of horizontal space need to render feature,
        //       including decorations (arrowhead, label, etc) and padding
        var layoutStart = featureStart
        // layoutEnd: end genome coord (at current scale) of horizontal space need to render feature,
        //       including decorations (arrowhead, label, etc) and padding
        var layoutEnd = featureEnd

        //     JBrowse now draws arrowheads within feature genome coord bounds
        //     For WebApollo we're keeping arrow outside of feature genome coord bounds,
        //           because otherwise arrow can obscure edge-matching, CDS/UTR transitions, small inton/exons, etc.
        //     Would like to implement arrowhead change in WebApollo plugin, but would need to refactor HTMLFeature more to allow for that
        if (this.config.style.arrowheadClass) {
          switch (feature.get('strand')) {
            case 1:
            case '+':
              layoutEnd += this.plusArrowWidth / scale
              break
            case -1:
            case '-':
              layoutStart -= this.minusArrowWidth / scale
              break
          }
        }

        var levelHeight = this.glyphHeight + this.glyphHeightPad

        // if the label extends beyond the feature, use the
        // label end position as the end position for layout
        var name = this.getFeatureLabel(feature)
        var description =
          scale > descriptionScale && this.getFeatureDescription(feature)
        if (
          description &&
          description.length > this.config.style.maxDescriptionLength
        ) {
          description =
            description
              .substr(0, this.config.style.maxDescriptionLength + 1)
              .replace(/(\s+\S+|\s*)$/, '') + String.fromCharCode(8230)
        }

        // add the label div (which includes the description) to the
        // calculated height of the feature if it will be displayed
        if (this.showLabels && scale >= labelScale && name) {
          layoutEnd = Math.max(
            layoutEnd,
            layoutStart + (`${name}`.length * this.labelWidth) / scale,
          )
          levelHeight += this.labelHeight + this.labelPad
        }
        if (this.showLabels && description) {
          layoutEnd = Math.max(
            layoutEnd,
            layoutStart + (`${description}`.length * this.labelWidth) / scale,
          )
          levelHeight += this.labelHeight + this.labelPad
        }

        layoutEnd += Math.max(1, this.padding / scale)

        var top = this._getLayout(scale).addRect(
          uniqueId,
          layoutStart,
          layoutEnd,
          levelHeight,
        )

        if (top === null) {
          // could not lay out, would exceed our configured maxHeight
          // mark the block as exceeding the max height
          this.markBlockHeightOverflow(block)
          return null
        }

        var featDiv = this.config.hooks.create(this, feature)
        this._connectFeatDivHandlers(featDiv)
        // NOTE ANY DATA SET ON THE FEATDIV DOM NODE NEEDS TO BE
        // MANUALLY DELETED IN THE cleanupBlock METHOD BELOW
        featDiv.track = this
        featDiv.feature = feature
        featDiv.layoutEnd = layoutEnd

        // border values used in positioning boolean subfeatures, if any.
        featDiv.featureEdges = {
          s: Math.max(featDiv.feature.get('start'), containerStart),
          e: Math.min(featDiv.feature.get('end'), containerEnd),
        }

        // (callbackArgs are the args that will be passed to callbacks
        // in this feature's context menu or left-click handlers)
        featDiv.callbackArgs = [this, featDiv.feature, featDiv]

        // save the label scale and description scale in the featDiv
        // so that we can use them later
        featDiv._labelScale = labelScale
        featDiv._descriptionScale = descriptionScale

        block.featureNodes[uniqueId] = featDiv

        // hook point
        if (typeof this.featureHook1 === 'function') {
          this.featureHook1(feature, featDiv)
        }

        // record whether this feature protrudes beyond the left and/or right side of the block
        if (layoutStart < block.startBase) {
          if (!block.leftOverlaps) {
            block.leftOverlaps = []
          }
          block.leftOverlaps.push(uniqueId)
        }
        if (layoutEnd > block.endBase) {
          if (!block.rightOverlaps) {
            block.rightOverlaps = []
          }
          block.rightOverlaps.push(uniqueId)
        }

        dojo.addClass(featDiv, 'feature')
        var className = this.config.style.className
        if (className == '{type}') {
          className = feature.get('type')
        }
        var strand = feature.get('strand')
        switch (strand) {
          case 1:
          case '+':
            dojo.addClass(featDiv, `plus-${className}`)
            break
          case -1:
          case '-':
            dojo.addClass(featDiv, `minus-${className}`)
            break
          default:
            dojo.addClass(featDiv, className)
        }
        var phase = feature.get('phase')
        if (phase !== null && phase !== undefined) {
          //            featDiv.className = featDiv.className + " " + featDiv.className + "_phase" + phase;
          dojo.addClass(featDiv, `${className}_phase${phase}`)
        }

        // check if this feature is highlighted
        var highlighted = this.isFeatureHighlighted(feature, name)

        // add 'highlighted' to the feature's class if its name
        // matches the objectName of the global highlight and it's
        // within the highlighted region
        if (highlighted) {
          dojo.addClass(featDiv, 'highlighted')
        }

        // Since some browsers don't deal well with the situation where
        // the feature goes way, way offscreen, we truncate the feature
        // to exist betwen containerStart and containerEnd.
        // To make sure the truncated end of the feature never gets shown,
        // we'll destroy and re-create the feature (with updated truncated
        // boundaries) in the transfer method.
        var displayStart = Math.max(featureStart, containerStart)
        var displayEnd = Math.min(featureEnd, containerEnd)
        var blockWidth = block.endBase - block.startBase
        var featwidth = Math.max(
          this.minFeatWidth,
          100 * ((displayEnd - displayStart) / blockWidth),
        )
        featDiv.style.cssText =
          `left:${(100 * (displayStart - block.startBase)) / blockWidth}%;` +
          `top:${top}px;` +
          ` width:${featwidth}%;${
            this.config.style.featureCss ? this.config.style.featureCss : ''
          }`

        // Store the containerStart/End so we can resolve the truncation
        // when we are updating static elements
        featDiv._containerStart = containerStart
        featDiv._containerEnd = containerEnd

        if (this.config.style.arrowheadClass) {
          var ah = document.createElement('div')
          var featwidth_px = (featwidth / 100) * blockWidth * scale

          switch (strand) {
            case 1:
            case '+':
              ah.className = `plus-${this.config.style.arrowheadClass}`
              ah.style.cssText = `right: ${-this.plusArrowWidth}px`
              featDiv.appendChild(ah)
              break
            case -1:
            case '-':
              ah.className = `minus-${this.config.style.arrowheadClass}`
              ah.style.cssText = `left: ${-this.minusArrowWidth}px`
              featDiv.appendChild(ah)
              break
          }
        }

        // fill in the template parameters in the featDiv and also for the labelDiv (see below)
        var context = lang.mixin({
          track: this,
          feature: feature,
          callbackArgs: [this, feature],
        })
        if (featDiv.title) {
          featDiv.title = this.template(
            feature,
            this._evalConf(context, featDiv.title, 'label'),
          )
        }

        if ((name || description) && this.showLabels && scale >= labelScale) {
          var labelDiv = dojo.create(
            'div',
            {
              className: `feature-label${highlighted ? ' highlighted' : ''}`,
              innerHTML:
                (name
                  ? `<div class="feature-name">${
                      this.config.unsafeHTMLFeatures
                        ? name
                        : Util.escapeHTML(name)
                    }</div>`
                  : '') +
                (description
                  ? ` <div class="feature-description">${
                      this.config.unsafeHTMLFeatures
                        ? description
                        : Util.escapeHTML(description)
                    }</div>`
                  : ''),
              style: {
                top: `${top + this.glyphHeight + 2}px`,
                left: `${(100 * (layoutStart - block.startBase)) / blockWidth}%`,
              },
            },
            block.domNode,
          )

          this._connectFeatDivHandlers(labelDiv)

          if (featDiv.title) {
            labelDiv.title = featDiv.title
          }
          featDiv.label = labelDiv

          // NOTE: ANY DATA ADDED TO THE labelDiv MUST HAVE A
          // CORRESPONDING DELETE STATMENT IN cleanupBlock BELOW
          labelDiv.feature = feature
          labelDiv.track = this
          // (callbackArgs are the args that will be passed to callbacks
          // in this feature's context menu or left-click handlers)
          labelDiv.callbackArgs = [this, featDiv.feature, featDiv]
        }

        if (featwidth > this.config.style.minSubfeatureWidth) {
          this.handleSubFeatures(
            feature,
            featDiv,
            displayStart,
            displayEnd,
            block,
          )
        }

        // render the popup menu if configured
        if (this.config.menuTemplate) {
          window.setTimeout(
            dojo.hitch(this, '_connectMenus', featDiv),
            50 + Math.random() * 150,
          )
        }

        if (typeof this.config.hooks.modify == 'function') {
          this.config.hooks.modify(this, feature, featDiv)
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
        var subfeatures = feature.get('subfeatures')
        if (subfeatures) {
          for (var i = 0; i < subfeatures.length; i++) {
            this.renderSubfeature(
              feature,
              featDiv,
              subfeatures[i],
              displayStart,
              displayEnd,
              block,
            )
            var subfeature = subfeatures[i]
            var subtype = subfeature.get('type')
            if (subtype == 'mRNA') {
              this.handleSubFeatures(
                subfeature,
                featDiv,
                displayStart,
                displayEnd,
                block,
              )
            }
          }
        }
      },

      /**
       * Get the height of a div.  Caches div heights based on
       * classname.
       */
      _getHeight: function (theDiv) {
        if (this.config.disableHeightCache) {
          return theDiv.offsetHeight || 0
        } else {
          var c = this.heightCache[theDiv.className]
          if (c) {
            return c
          }
          c = theDiv.offsetHeight || 0
          this.heightCache[theDiv.className] = c
          return c
        }
      },

      /**
       * Vertically centers all the child elements of a feature div.
       * @private
       */
      _centerChildrenVertically: function (/**HTMLElement*/ featDiv) {
        if (featDiv.childNodes.length > 0) {
          var parentHeight = this._getHeight(featDiv)
          for (var i = 0; i < featDiv.childNodes.length; i++) {
            var child = featDiv.childNodes[i]
            // only operate on child nodes that can be styled,
            // i.e. HTML elements instead of text nodes or whatnot
            if (child.style) {
              // cache the height of elements, for speed.
              var h = this._getHeight(child)
              dojo.style(child, {
                marginTop: '0',
                top: `${(parentHeight - h) / 2}px`,
              })
              // recursively center any descendants
              if (child.childNodes.length > 0) {
                this._centerChildrenVertically(child)
              }
            }
          }
        }
      },

      /**
       * Connect our configured event handlers to a given html element,
       * usually a feature div or label div.
       */
      _connectFeatDivHandlers: function (/** HTMLElement */ div) {
        for (var event in this.eventHandlers) {
          this.own(on(div, event, this.eventHandlers[event]))
        }
        // if our click handler has a label, set that as a tooltip
        if (this.eventHandlers.click && this.eventHandlers.click.label) {
          div.setAttribute('title', this.eventHandlers.click.label)
        }
      },

      _connectMenus: function (featDiv) {
        // don't actually make the menu until the feature is
        // moused-over.  pre-generating menus for lots and lots of
        // features at load time is way too slow.
        var refreshMenu = lang.hitch(this, '_refreshMenu', featDiv)
        this.own(on(featDiv, 'mouseover', refreshMenu))
        if (featDiv.label) {
          this.own(on(featDiv.label, 'mouseover', refreshMenu))
        }
      },

      _refreshMenu: function (featDiv) {
        // if we already have a menu generated for this feature,
        // give it a new lease on life
        if (!featDiv.contextMenu) {
          featDiv.contextMenu = this._makeFeatureContextMenu(
            featDiv,
            this.config.menuTemplate,
          )
        }

        // give the menu a timeout so that it's cleaned up if it's not used within a certain time
        if (featDiv.contextMenuTimeout) {
          window.clearTimeout(featDiv.contextMenuTimeout)
        }
        var timeToLive = 30000 // clean menus up after 30 seconds
        featDiv.contextMenuTimeout = window.setTimeout(function () {
          if (featDiv.contextMenu) {
            featDiv.contextMenu.destroyRecursive()
            Util.removeAttribute(featDiv, 'contextMenu')
          }
          Util.removeAttribute(featDiv, 'contextMenuTimeout')
        }, timeToLive)
      },

      /**
       * Make the right-click dijit menu for a feature.
       */
      _makeFeatureContextMenu: function (featDiv, menuTemplate) {
        // interpolate template strings in the menuTemplate
        menuTemplate = this._processMenuSpec(dojo.clone(menuTemplate), featDiv)

        // render the menu, start it up, and bind it to right-clicks
        // both on the feature div and on the label div
        var menu = this._renderContextMenu(menuTemplate, featDiv)
        menu.startup()
        menu.bindDomNode(featDiv)
        if (featDiv.label) {
          menu.bindDomNode(featDiv.label)
        }

        return menu
      },

      renderSubfeature: function (
        feature,
        featDiv,
        subfeature,
        displayStart,
        displayEnd,
        block,
      ) {
        var subStart = subfeature.get('start')
        var subEnd = subfeature.get('end')
        var featLength = displayEnd - displayStart
        var type = subfeature.get('type')
        var className
        if (this.config.style.subfeatureClasses) {
          className = this.config.style.subfeatureClasses[type]
          // if no class mapping specified for type, default to subfeature.get('type')
          if (className === undefined) {
            className = type
          }
          // if subfeatureClasses specifies that subfeature type explicitly maps to null className
          //     then don't render the feature
          else if (className === null) {
            return null
          }
        } else {
          // if no config.style.subfeatureClasses to specify subfeature class mapping, default to subfeature.get('type')
          className = type
        }

        // a className of 'hidden' causes things to not even be rendered
        if (className == 'hidden') {
          return null
        }

        var subDiv = document.createElement('div')
        // used by boolean tracks to do positiocning
        subDiv.subfeatureEdges = { s: subStart, e: subEnd }

        dojo.addClass(subDiv, 'subfeature')
        // check for className to avoid adding "null", "plus-null", "minus-null"
        if (className) {
          switch (subfeature.get('strand')) {
            case 1:
            case '+':
              dojo.addClass(subDiv, `plus-${className}`)
              break
            case -1:
            case '-':
              dojo.addClass(subDiv, `minus-${className}`)
              break
            default:
              dojo.addClass(subDiv, className)
          }
        }

        // if the feature has been truncated to where it doesn't cover
        // this subfeature anymore, just skip this subfeature

        var truncate = false
        if (
          typeof this.config.truncateFeatures !== 'undefined' &&
          this.config.truncateFeatures === true
        ) {
          truncate = true
        }

        if (truncate && (subEnd <= displayStart || subStart >= displayEnd)) {
          return null
        }

        if (Util.is_ie6) {
          subDiv.appendChild(document.createComment())
        }

        subDiv.style.cssText =
          `left: ${100 * ((subStart - displayStart) / featLength)}%;` +
          `width: ${100 * ((subEnd - subStart) / featLength)}%;`
        featDiv.appendChild(subDiv)

        block.featureNodes[subfeature.id()] = subDiv

        return subDiv
      },

      _getLayout: function (scale) {
        //determine the glyph height, arrowhead width, label text dimensions, etc.
        if (!this.haveMeasurements) {
          this.measureStyles()
          this.haveMeasurements = true
        }

        // create the layout if we need to, and we can
        if ((!this.layout || this.layout.pitchX != 4 / scale) && scale) {
          this.layout = new Layout({
            pitchX: 4 / scale,
            pitchY:
              this.config.layoutPitchY ||
              this.glyphHeight + this.glyphHeightPad,
            maxHeight: this.getConf('maxHeight'),
          })
        }

        return this.layout
      },
      _clearLayout: function () {
        delete this.layout
      },

      clear: function () {
        delete this.layout
        this.inherited(arguments)
      },

      /**
       *   indicates a change to this track has happened that may require a re-layout
       *   clearing layout here, and relying on superclass BlockBased.changed() call and
       *   standard _changedCallback function passed in track constructor to trigger relayout
       */
      changed: function () {
        this._clearLayout()
        this.inherited(arguments)
      },

      _exportFormats: function () {
        return [
          { name: 'GFF3', label: 'GFF3', fileExt: 'gff3' },
          { name: 'BED', label: 'BED', fileExt: 'bed' },
          {
            name: 'SequinTable',
            label: 'Sequin Table',
            fileExt: 'sqn',
          },
        ]
      },

      _trackMenuOptions: function () {
        var o = this.inherited(arguments)
        var track = this

        o.push.apply(o, [
          { type: 'dijit/MenuSeparator' },
          {
            label: 'Show labels',
            type: 'dijit/CheckedMenuItem',
            checked: !!('showLabels' in this
              ? this.showLabels
              : this.config.style.showLabels),
            onClick: function (event) {
              track.showLabels = this.checked
              track.changed()
            },
          },
        ])

        return o
      },
    },
  )

  return HTMLFeatures
})

/*

 Copyright (c) 2007-2010 The Evolutionary Software Foundation

 Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

 This package and its accompanying libraries are free software; you can
 redistribute it and/or modify it under the terms of the LGPL (either
 version 2.1, or at your option, any later version) or the Artistic
 License 2.0.  Refer to LICENSE for the full license text.

 */
