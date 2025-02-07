define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/_base/event',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/mouse',
  'JBrowse/View/Track/BlockBased',
  'JBrowse/View/Track/_ExportMixin',
  'JBrowse/View/Track/_TrackDetailsStatsMixin',
  'JBrowse/View/Dialog/SetTrackHeight',
  'JBrowse/Util',
  'JBrowse/has',
  './Wiggle/_Scale',
], function (
  declare,
  array,
  lang,
  domEvent,
  dom,
  on,
  mouse,
  BlockBasedTrack,
  ExportMixin,
  DetailStatsMixin,
  TrackHeightDialog,
  Util,
  has,
  Scale,
) {
  return declare([BlockBasedTrack, ExportMixin, DetailStatsMixin], {
    constructor: function (args) {
      this.trackPadding = args.trackPadding || 0

      if (!('style' in this.config)) {
        this.config.style = {}
      }

      this.store = args.store

      this._setupEventHandlers()
    },

    _defaultConfig: function () {
      return {
        maxExportSpan: 500000,
        autoscale: 'global',
        logScaleOption: true,
      }
    },

    _setupEventHandlers: function () {
      // make a default click event handler
      var eventConf = dojo.clone(this.config.events || {})
      if (!eventConf.click) {
        // unlike CanvasFeatures, linkTemplate or nothing here... no default contentDialog since no equivalent to defaultFeatureDetail
        if ((this.config.style || {}).linkTemplate) {
          eventConf.click = {
            action: 'newWindow',
            url: this.config.style.linkTemplate,
          }
        }
      }

      // process the configuration to set up our event handlers
      this.eventHandlers = function () {
        var handlers = dojo.clone(eventConf)
        // find conf vars that set events, like `onClick`
        for (var key in this.config) {
          var handlerName = key.replace(/^on(?=[A-Z])/, '')
          if (handlerName != key) {
            handlers[handlerName.toLowerCase()] = this.config[key]
          }
        }
        // interpret handlers that are just strings to be URLs that should be opened
        for (key in handlers) {
          if (typeof handlers[key] == 'string') {
            handlers[key] = { url: handlers[key] }
          }
        }
        return handlers
      }.call(this)
      // only call _makeClickHandler() if we have related settings in config
      if (this.eventHandlers.click) {
        this.eventHandlers.click = this._makeClickHandler(
          this.eventHandlers.click,
        )
      }
    },

    _getScaling: function (viewArgs, successCallback, errorCallback) {
      this._getScalingStats(
        viewArgs,
        dojo.hitch(this, function (stats) {
          //calculate the scaling if necessary
          if (!this.lastScaling || !this.lastScaling.sameStats(stats)) {
            try {
              this.lastScaling = new Scale(this.config, stats)
              successCallback(this.lastScaling)
            } catch (e) {
              errorCallback(e)
            }
          } else {
            successCallback(this.lastScaling)
          }
        }),
        errorCallback,
      )
    },

    // get the statistics to use for scaling, if necessary, either
    // from the global stats for the store, or from the local region
    // if config.autoscale is 'local'
    _getScalingStats: function (viewArgs, callback, errorCallback) {
      if (!Scale.prototype.needStats(this.config)) {
        callback(null)
        return null
      } else if (this.config.autoscale == 'local') {
        var region = lang.mixin(
          { scale: viewArgs.scale },
          this.browser.view.visibleRegion(),
        )
        region.start = Math.ceil(region.start)
        region.end = Math.floor(region.end)
        return this.getRegionStats.call(this, region, callback, errorCallback)
      } else {
        return this.getGlobalStats.call(this, callback, errorCallback)
      }
    },

    getFeatures: function (query, callback, errorCallback) {
      this.store.getFeatures.apply(this.store, arguments)
    },

    getGlobalStats: function (successCallback, errorCallback) {
      this.store.getGlobalStats(successCallback, errorCallback)
    },

    getRegionStats: function (region, successCallback, errorCallback) {
      this.store.getRegionStats(region, successCallback, errorCallback)
    },

    // the canvas width in pixels for a block
    _canvasWidth: function (block) {
      return Math.ceil((block.endBase - block.startBase) * block.scale)
    },

    // the canvas height in pixels for a block
    _canvasHeight: function () {
      return parseInt((this.config.style || {}).height) || 100
    },

    _getBlockFeatures: function (args) {
      var thisB = this
      var blockIndex = args.blockIndex
      var block = args.block

      var leftBase = args.leftBase
      var rightBase = args.rightBase

      var scale = args.scale
      var finishCallback = args.finishCallback || function () {}

      var canvasWidth = this._canvasWidth(args.block)

      var features = []
      this.getFeatures(
        {
          ref: this.refSeq.name,
          basesPerSpan: 1 / scale,
          scale: scale,
          start: leftBase,
          end: rightBase + 1,
        },

        function (f) {
          if (thisB.filterFeature(f)) {
            features.push(f)
          }
        },
        dojo.hitch(this, function (args) {
          // if the block has been freed in the meantime,
          // don't try to render
          if (!(block.domNode && block.domNode.parentNode)) {
            return
          }

          var featureRects = array.map(
            features,
            function (f) {
              return this._featureRect(scale, leftBase, canvasWidth, f)
            },
            this,
          )

          block.features = features //< TODO: remove this
          block.featureRects = featureRects
          block.pixelScores = this._calculatePixelScores(
            this._canvasWidth(block),
            features,
            featureRects,
          )

          if (args && args.maskingSpans) {
            block.maskingSpans = args.maskingSpans
          } // used for masking

          finishCallback()
        }),
        dojo.hitch(this, function (e) {
          console.error(e.stack || `${e}`, e)
          this._handleError(e, args)
        }),
      )
    },

    // render the actual graph display for the block.  should be called only after a scaling
    // has been decided upon and stored in this.scaling
    renderBlock: function (args) {
      var block = args.block

      // don't render this block again if we have already rendered
      // it with this scaling scheme
      if (!this.scaling.compare(block.scaling) || !block.pixelScores) {
        return
      }

      block.scaling = this.scaling

      dom.empty(block.domNode)

      try {
        dojo.create('canvas').getContext('2d').fillStyle = 'red'
      } catch (e) {
        this.fatalError = 'This browser does not support HTML canvas elements.'
        this.fillBlockError(args.blockIndex, block, this.fatalError)
        return
      }

      var features = block.features
      var featureRects = block.featureRects
      var dataScale = this.scaling
      var canvasHeight = this._canvasHeight()

      var c = dojo.create(
        'canvas',
        {
          height: canvasHeight,
          width: this._canvasWidth(block),
          style: {
            cursor: 'default',
            height: `${canvasHeight}px`,
            width: has('inaccurate-html-width') ? '' : '100%',
            'min-width': has('inaccurate-html-width') ? '100%' : '',
            'max-width': has('inaccurate-html-width') ? '102%' : '',
          },
          innerHTML: 'Your web browser cannot display this type of track.',
          className: 'canvas-track',
        },
        block.domNode,
      )

      var ctx = c.getContext('2d')
      var ratio = Util.getResolution(
        ctx,
        this.browser.config.highResolutionMode,
      )

      // upscale canvas if the two ratios don't match
      if (this.browser.config.highResolutionMode != 'disabled' && ratio >= 1) {
        var oldWidth = c.width
        var oldHeight = c.height

        c.width = Math.round(oldWidth * ratio)
        c.height = Math.round(oldHeight * ratio)

        //c.style.width = oldWidth + 'px';
        c.style.height = `${oldHeight}px`

        // now scale the context to counter
        // the fact that we've manually scaled
        // our canvas element
        ctx.scale(ratio, ratio)
      }

      c.startBase = block.startBase
      block.canvas = c

      //Calculate the score for each pixel in the block
      var pixels = this._calculatePixelScores(c.width, features, featureRects)

      this._draw(
        block.scale,
        block.startBase,
        block.endBase,
        block,
        c,
        features,
        featureRects,
        dataScale,
        pixels,
        block.maskingSpans,
      ) // note: spans may be undefined.

      this.heightUpdate(c.height / ratio, args.blockIndex)
      if (!(c.parentNode && c.parentNode.parentNode)) {
        var blockWidth = block.endBase - block.startBase

        c.style.position = 'absolute'
        c.style.left = `${100 * ((c.startBase - block.startBase) / blockWidth)}%`
        switch (this.config.align) {
          case 'top':
            c.style.top = '0px'
            break
          case 'bottom':
          /* fall through */
          default:
            c.style.bottom = `${this.trackPadding}px`
            break
        }
      }
    },

    fillBlock: function (args) {
      var thisB = this
      this.heightUpdate(this._canvasHeight(), args.blockIndex)

      // hook updateGraphs onto the end of the block feature fetch
      var oldFinish = args.finishCallback || function () {}
      args.finishCallback = function () {
        thisB.updateGraphs(args, oldFinish)
      }

      // get the features for this block, and then set in motion the
      // updating of the graphs
      this._getBlockFeatures(args)
    },

    updateGraphs: function (viewArgs, callback) {
      var thisB = this

      // update the global scaling
      this._getScaling(
        viewArgs,
        function (scaling) {
          thisB.scaling = scaling
          // render all of the blocks that need it
          array.forEach(thisB.blocks, function (block, blockIndex) {
            if (block && block.domNode.parentNode) {
              thisB.renderBlock({
                block: block,
                blockIndex: blockIndex,
              })
            }
          })
          callback()
        },
        function (e) {
          thisB._handleError(e, viewArgs)
        },
      )
    },

    // Draw features
    _draw: function (
      scale,
      leftBase,
      rightBase,
      block,
      canvas,
      features,
      featureRects,
      dataScale,
      pixels,
      spans,
    ) {
      this._preDraw(
        scale,
        leftBase,
        rightBase,
        block,
        canvas,
        features,
        featureRects,
        dataScale,
      )
      this._drawFeatures(
        scale,
        leftBase,
        rightBase,
        block,
        canvas,
        pixels,
        dataScale,
      )
      if (spans) {
        this._maskBySpans(
          scale,
          leftBase,
          rightBase,
          block,
          canvas,
          pixels,
          dataScale,
          spans,
        )
      }
      this._postDraw(
        scale,
        leftBase,
        rightBase,
        block,
        canvas,
        features,
        featureRects,
        dataScale,
      )
    },

    startZoom: function (destScale, destStart, destEnd) {},

    endZoom: function (destScale, destBlockBases) {
      this.clear()
    },

    /**
     * Calculate the left and width, in pixels, of where this feature
     * will be drawn on the canvas.
     * @private
     * @returns {Object} with l, r, and w
     */
    _featureRect: function (scale, leftBase, canvasWidth, feature) {
      var fRect = {
        w: Math.ceil((feature.get('end') - feature.get('start')) * scale),
        l: Math.round((feature.get('start') - leftBase) * scale),
      }

      // if fRect.l is negative (off the left
      // side of the canvas), clip off the
      // (possibly large!) non-visible
      // portion
      if (fRect.l < 0) {
        fRect.w += fRect.l
        fRect.l = 0
      }

      // also don't let fRect.w get overly big
      fRect.w = Math.min(canvasWidth - fRect.l, fRect.w)
      fRect.r = fRect.w + fRect.l

      return fRect
    },

    _preDraw: function (canvas) {},

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
      features,
      featureRects,
    ) {},

    // If we are making a boolean track, this will be called. Overwrite.
    _maskBySpans: function (scale, leftBase, canvas, spans, pixels) {},

    _postDraw: function () {},

    _calculatePixelScores: function (canvasWidth, features, featureRects) {
      var scoreType = this.config.scoreType || 'maxScore'
      var pixelValues = new Array(canvasWidth)
      if (scoreType == 'maxScore' || scoreType == 'score') {
        // make an array of the max score at each pixel on the canvas
        dojo.forEach(
          features,
          function (f, i) {
            var store = f.source
            var fRect = featureRects[i]
            var jEnd = fRect.r
            var score = f.get(scoreType)

            if (score === undefined) {
              score = f.get('score') // we are not in a summary block and have no maxScore so use regular score
            }
            for (var j = Math.round(fRect.l); j < jEnd; j++) {
              if (pixelValues[j] && pixelValues[j]['lastUsedStore'] == store) {
                /* Note: if the feature is from a different store, the condition should fail,
                 *       and we will add to the value, rather than adjusting for overlap */
                pixelValues[j]['score'] = Math.max(
                  pixelValues[j]['score'],
                  score,
                )
              } else if (pixelValues[j]) {
                pixelValues[j]['score'] = pixelValues[j]['score'] + score
                pixelValues[j]['lastUsedStore'] = store
              } else {
                pixelValues[j] = {
                  score: score,
                  lastUsedStore: store,
                  feat: f,
                }
              }
            }
          },
          this,
        )
        // when done looping through features, forget the store information.
        for (var i = 0; i < pixelValues.length; i++) {
          if (pixelValues[i]) {
            delete pixelValues[i]['lastUsedStore']
          }
        }
      } else if (scoreType == 'avgScore') {
        // make an array of the average score at each pixel on the canvas
        dojo.forEach(
          features,
          function (f, i) {
            var store = f.source
            var fRect = featureRects[i]
            var jEnd = fRect.r
            var score = f.get('score')
            for (var j = Math.round(fRect.l); j < jEnd; j++) {
              // bin scores according to store
              if (pixelValues[j] && store in pixelValues[j]['scores']) {
                pixelValues[j]['scores'][store].push(score)
              } else if (pixelValues[j]) {
                pixelValues[j]['scores'][store] = [score]
              } else {
                pixelValues[j] = { scores: {}, feat: f }
                pixelValues[j]['scores'][store] = [score]
              }
            }
          },
          this,
        )
        // when done looping through features, average the scores in the same store then add them all together as the final score
        for (var i = 0; i < pixelValues.length; i++) {
          if (pixelValues[i]) {
            pixelValues[i]['score'] = 0
            for (var store in pixelValues[i]['scores']) {
              var j,
                sum = 0,
                len = pixelValues[i]['scores'][store].length
              for (j = 0; j < len; j++) {
                sum += pixelValues[i]['scores'][store][j]
              }
              pixelValues[i]['score'] += sum / len
            }
            delete pixelValues[i]['scores']
          }
        }
      }
      return pixelValues
    },

    setViewInfo: function () {
      this.inherited(arguments)
      this._makeScoreDisplay()
    },

    _makeScoreDisplay: function () {
      var gv = this.browser.view
      var thisB = this

      if (!this._mouseoverEvent) {
        this._mouseoverEvent = this.own(
          on(this.div, 'mousemove', function (evt) {
            evt = domEvent.fix(evt)
            var bpX = gv.absXtoBp(evt.clientX)
            thisB.mouseover(bpX, evt)
          }),
        )[0]
      }
      if (!this._mouseoutEvent) {
        this._mouseoutEvent = this.own(
          on(this.div, mouse.leave, function (evt) {
            thisB.mouseover(undefined)
          }),
        )[0]
      }

      // only add if we have config setting a click eventHandler for this track
      if (thisB.eventHandlers.click && !this._mouseClickEvent) {
        this._mouseClickEvent = this.own(
          on(this.div, 'click', thisB.eventHandlers.click),
        )[0]
      }

      // make elements and events to display it
      if (!this.scoreDisplay) {
        this.scoreDisplay = {
          flag: dojo.create(
            'div',
            {
              className: 'wiggleValueDisplay',
              style: {
                position: 'fixed',
                display: 'none',
                zIndex: 15,
              },
            },
            this.div,
          ),
          pole: dojo.create(
            'div',
            {
              className: 'wigglePositionIndicator',
              style: {
                position: 'fixed',
                display: 'none',
                zIndex: 15,
              },
            },
            this.div,
          ),
        }
      }
    },

    mouseover: function (bpX, evt) {
      // if( this._scoreDisplayHideTimeout )
      //     window.clearTimeout( this._scoreDisplayHideTimeout );
      if (bpX === undefined) {
        var thisB = this
        //this._scoreDisplayHideTimeout = window.setTimeout( function() {
        thisB.scoreDisplay.flag.style.display = 'none'
        thisB.scoreDisplay.pole.style.display = 'none'
        //}, 1000 );
      } else {
        var block
        array.some(this.blocks, function (b) {
          if (b && b.startBase <= bpX && b.endBase >= bpX) {
            block = b
            return true
          }
          return false
        })

        if (!(block && block.canvas && block.pixelScores && evt)) {
          return
        }

        var pixelValues = block.pixelScores
        var canvas = block.canvas
        var cPos = dojo.position(canvas)
        var x = evt.pageX
        var cx = evt.pageX - cPos.x

        if (
          this._showPixelValue(
            this.scoreDisplay.flag,
            pixelValues[Math.round(cx)],
          )
        ) {
          this.scoreDisplay.flag.style.display = 'block'
          this.scoreDisplay.pole.style.display = 'block'

          this.scoreDisplay.flag.style.left = `${evt.clientX}px`
          this.scoreDisplay.flag.style.top = `${cPos.y}px`
          this.scoreDisplay.pole.style.left = `${evt.clientX}px`
          this.scoreDisplay.pole.style.height = `${cPos.h}px`
          this.scoreDisplay.pole.style.top = `${cPos.y}px`
        }
      }
    },

    _showPixelValue: function (scoreDisplay, score) {
      if (typeof score == 'number') {
        // display the score with only 6
        // significant digits, avoiding
        // most confusion about the
        // approximative properties of
        // IEEE floating point numbers
        // parsed out of BigWig files
        scoreDisplay.innerHTML = parseFloat(score.toPrecision(6))
        return true
      } else if (score && typeof score['score'] == 'number') {
        // "score" may be an object.
        scoreDisplay.innerHTML = parseFloat(score['score'].toPrecision(6))
        return true
      } else {
        return false
      }
    },

    _exportFormats: function () {
      return [
        { name: 'bedGraph', label: 'bedGraph', fileExt: 'bedgraph' },
        { name: 'Wiggle', label: 'Wiggle', fileExt: 'wig' },
        { name: 'GFF3', label: 'GFF3', fileExt: 'gff3' },
      ]
    },

    _trackMenuOptions: function () {
      var track = this
      var options = this.inherited(arguments) || []

      options.push({
        label: 'Change height',
        iconClass: 'jbrowseIconVerticalResize',
        action: function () {
          new TrackHeightDialog({
            height: track._canvasHeight(),
            setCallback: function (newHeight) {
              track.trackHeightChanged = true
              track.updateUserStyles({ height: newHeight })
            },
          }).show()
        },
      })
      if (this.config.logScaleOption) {
        options.push({
          label: 'Log scale',
          type: 'dijit/CheckedMenuItem',
          checked: !!(this.config.scale == 'log'),
          onClick: function (event) {
            if (this.checked) {
              track.config.scale = 'log'
            } else {
              track.config.scale = 'linear'
            }
            track.browser.publish('/jbrowse/v1/v/tracks/replace', [
              track.config,
            ])
          },
        })
      }

      return options
    },

    // this draws either one or two width pixels based on whether there is a fractional devicePixelRatio
    _fillRectMod: function (ctx, left, top, width, height) {
      var devicePixelRatio = window.devicePixelRatio || 1
      var drawWidth = width
      // check for fractional devicePixelRatio, and if so, draw wider pixels to avoid subpixel rendering
      if (
        this.browser.config.highResolutionMode != 'disabled' &&
        devicePixelRatio - Math.floor(devicePixelRatio) > 0
      ) {
        drawWidth = width + 0.3 // Minimal for subpixel gap, heuristic
      }
      ctx.fillRect(left, top, drawWidth, height)
    },
  })
})
