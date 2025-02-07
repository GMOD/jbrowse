import dompurify from 'dompurify'

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/json',
  'dojo/aspect',
  'dojo/dom-construct',
  'dojo/dom-geometry',
  'dojo/dom-class',
  'dojo/dom-style',
  'dojo/query',
  'dojo/on',
  'dojo/when',
  'dijit/Destroyable',
  'JBrowse/View/InfoDialog',
  'dijit/Dialog',
  'dijit/Menu',
  'dijit/PopupMenuItem',
  'dijit/MenuItem',
  'dijit/CheckedMenuItem',
  'dijit/MenuSeparator',
  'dijit/RadioMenuItem',
  'JBrowse/Util',
  'JBrowse/Component',
  'JBrowse/FeatureFiltererMixin',
  'JBrowse/Errors',
  'JBrowse/Model/Location',
  'JBrowse/View/TrackConfigEditor',
  'JBrowse/View/ConfirmDialog',
  'JBrowse/View/Track/BlockBased/Block',
  'JBrowse/View/DetailsMixin',
], function (
  declare,
  lang,
  array,
  JSON,
  aspect,
  domConstruct,
  domGeom,
  domClass,
  domStyle,
  query,
  on,
  when,
  Destroyable,
  InfoDialog,
  Dialog,
  dijitMenu,
  dijitPopupMenuItem,
  dijitMenuItem,
  dijitCheckedMenuItem,
  dijitMenuSeparator,
  dijitRadioMenuItem,
  Util,
  Component,
  FeatureFiltererMixin,
  Errors,
  Location,
  TrackConfigEditor,
  ConfirmDialog,
  Block,
  DetailsMixin,
) {
  // we get `own` and `destroy` from Destroyable, see dijit/Destroyable docs

  return declare(
    [Component, DetailsMixin, FeatureFiltererMixin, Destroyable],
    /**
     * @lends JBrowse.View.Track.BlockBased.prototype
     */
    {
      /**
       * Base class for all JBrowse tracks.
       * @constructs
       */
      constructor: function (args) {
        args = args || {}

        this.refSeq = args.refSeq
        this.name = args.label || this.config.label
        this.key = args.key || this.config.key || this.name

        this._changedCallback = args.changeCallback || function () {}
        this.height = 0
        this.shown = true
        this.empty = false
        this.browser = args.browser

        this.setFeatureFilterParentComponent(this.browser.view)

        this.store = args.store

        // retrieve any user-set style info
        lang.mixin(this.config.style, this.getUserStyles())
      },

      // get/set persistent per-user style information for this track
      updateUserStyles: function (settings) {
        // set in this object
        lang.mixin(this.config.style, settings)
        // set in the saved style
        var saved = JSON.parse(
          this.browser.cookie(`track-style-${this.name}`) || '{}',
        )
        lang.mixin(saved, settings)
        this.browser.cookie(`track-style-${this.name}`, saved)
        // redraw this track
        this.redraw()
      },
      getUserStyles: function () {
        return JSON.parse(
          this.browser.cookie(`track-style-${this.name}`) || '{}',
        )
      },

      /**
       * Returns object holding the default configuration for this track
       * type.  Might want to override in subclasses.
       * @private
       */
      _defaultConfig: function () {
        return {
          maxFeatureSizeForUnderlyingRefSeq: 250000,
          subfeatureDetailLevel: 2,
        }
      },

      heightUpdate: function (height, blockIndex) {
        if (!this.shown) {
          this.heightUpdateCallback(0)
          return
        }

        if (blockIndex !== undefined) {
          this.blockHeights[blockIndex] = height
        }

        this.height = Math.max(this.height, height)

        if (!this.inShowRange) {
          this.heightUpdateCallback(Math.max(this.labelHeight, this.height))

          // reposition any height-overflow markers in our blocks
          query('.height_overflow_message', this.div).style(
            'top',
            `${this.height - 16}px`,
          )
        }
      },

      setViewInfo: function (
        genomeView,
        heightUpdate,
        numBlocks,
        trackDiv,
        widthPct,
        widthPx,
        scale,
      ) {
        this.genomeView = genomeView
        this.heightUpdateCallback = heightUpdate
        this.div = trackDiv
        this.widthPct = widthPct
        this.widthPx = widthPx

        this.leftBlank = document.createElement('div')
        this.leftBlank.className = 'blank-block'
        this.rightBlank = document.createElement('div')
        this.rightBlank.className = 'blank-block'
        this.div.appendChild(this.rightBlank)
        this.div.appendChild(this.leftBlank)

        this.sizeInit(numBlocks, widthPct)
        this.labelHTML = ''
        this.labelHeight = 0

        if (this.config.pinned) {
          this.setPinned(true)
        }

        if (!this.label) {
          this.makeTrackLabel()
        }
        this.setLabel(this.key)
      },

      makeTrackLabel: function () {
        var params = {
          className: 'track-label dojoDndHandle',
          id: `label_${this.name}`,
          style: {
            position: 'absolute',
          },
        }

        if (
          typeof this.browser.config.trackLabels !== 'undefined' &&
          this.browser.config.trackLabels === 'no-block'
        ) {
          params.style.top = '-30px'
        }

        var labelDiv = dojo.create('div', params, this.div)

        this.label = labelDiv

        if ((this.config.style || {}).trackLabelCss) {
          labelDiv.style.cssText += `;${this.config.style.trackLabelCss}`
        }

        var closeButton = dojo.create(
          'div',
          {
            className: 'track-close-button',
          },
          labelDiv,
        )
        this.own(
          on(
            closeButton,
            'click',
            dojo.hitch(this, function (evt) {
              this.browser.view.suppressDoubleClick(100)
              this.browser.publish('/jbrowse/v1/v/tracks/hide', [this.config])
              evt.stopPropagation()
            }),
          ),
        )

        var labelText = dojo.create(
          'span',
          { className: 'track-label-text' },
          labelDiv,
        )
        var menuButton = dojo.create(
          'div',
          {
            className: 'track-menu-button',
          },
          labelDiv,
        )
        dojo.create('div', {}, menuButton) // will be styled with an icon by CSS
        this.labelMenuButton = menuButton

        // make the track menu with things like 'save as'
        this.makeTrackMenu()
      },

      hide: function () {
        if (this.shown) {
          this.div.style.display = 'none'
          this.shown = false
        }
      },

      show: function () {
        if (!this.shown) {
          this.div.style.display = 'block'
          this.shown = true
        }
      },

      initBlocks: function () {
        this.blocks = new Array(this.numBlocks)
        this.blockHeights = new Array(this.numBlocks)
        for (var i = 0; i < this.numBlocks; i++) {
          this.blockHeights[i] = 0
        }
        this.firstAttached = null
        this.lastAttached = null
        this._adjustBlanks()
      },

      clear: function () {
        if (this.blocks) {
          for (var i = 0; i < this.numBlocks; i++) {
            this._hideBlock(i)
          }
        }
        this.initBlocks()
        this.makeTrackMenu()
      },

      setLabel: function (newHTML) {
        if (this.label === undefined || this.labelHTML == newHTML) {
          return
        }

        this.labelHTML = newHTML
        query('.track-label-text', this.label).forEach(function (n) {
          n.innerHTML = dompurify.sanitize(newHTML)
        })
        this.labelHeight = this.label.offsetHeight
      },

      /**
       * Stub.
       */
      transfer: function () {},

      /**
       *  Stub.
       */
      startZoom: function (destScale, destStart, destEnd) {},

      /**
       * Stub.
       */
      endZoom: function (destScale, destBlockBases) {},

      showRange: function (
        first,
        last,
        startBase,
        bpPerBlock,
        scale,
        containerStart,
        containerEnd,
        finishCallback,
      ) {
        if (this.fatalError) {
          this.showFatalError(this.fatalError)
          return
        }

        if (this.blocks === undefined || !this.blocks.length) {
          return
        }

        // this might make more sense in setViewInfo, but the label element
        // isn't in the DOM tree yet at that point
        if (this.labelHeight == 0 && this.label) {
          this.labelHeight = this.label.offsetHeight
        }

        this.inShowRange = true
        this.height = this.labelHeight

        var firstAttached =
          null == this.firstAttached ? last + 1 : this.firstAttached
        var lastAttached =
          null == this.lastAttached ? first - 1 : this.lastAttached

        var i, leftBase
        var maxHeight = 0
        var blockShowingPromises = []
        //fill left, including existing blocks (to get their heights)
        for (i = lastAttached; i >= first; i--) {
          leftBase = startBase + bpPerBlock * (i - first)
          blockShowingPromises.push(
            new Promise((resolve, reject) => {
              this._showBlock(
                i,
                leftBase,
                leftBase + bpPerBlock,
                scale,
                containerStart,
                containerEnd,
                resolve,
              )
            }),
          )
        }
        //fill right
        for (i = lastAttached + 1; i <= last; i++) {
          leftBase = startBase + bpPerBlock * (i - first)
          blockShowingPromises.push(
            new Promise((resolve, reject) => {
              this._showBlock(
                i,
                leftBase,
                leftBase + bpPerBlock,
                scale,
                containerStart,
                containerEnd,
                resolve,
              )
            }),
          )
        }
        // if we have a finishing callback, call it when we have finished all our _showBlock calls
        if (finishCallback) {
          Promise.all(blockShowingPromises).then(finishCallback, finishCallback)
        }

        //detach left blocks
        var destBlock = this.blocks[first]
        for (i = firstAttached; i < first; i++) {
          this.transfer(
            this.blocks[i],
            destBlock,
            scale,
            containerStart,
            containerEnd,
          )
          this.cleanupBlock(this.blocks[i])
          this._hideBlock(i)
        }
        //detach right blocks
        destBlock = this.blocks[last]
        for (i = lastAttached; i > last; i--) {
          this.transfer(
            this.blocks[i],
            destBlock,
            scale,
            containerStart,
            containerEnd,
          )
          this.cleanupBlock(this.blocks[i])
          this._hideBlock(i)
        }

        this.firstAttached = first
        this.lastAttached = last
        this._adjustBlanks()
        this.inShowRange = false

        this.heightUpdate(this.height)
        this.updateStaticElements(this.genomeView.getPosition())
      },

      cleanupBlock: function (block) {
        if (block) {
          block.destroy()
        }
      },

      /**
       * Called when this track object is destroyed.  Cleans up things
       * to avoid memory leaks.
       */
      destroy: function () {
        array.forEach(
          this.blocks || [],
          function (block) {
            this.cleanupBlock(block)
          },
          this,
        )
        delete this.blocks
        delete this.div

        this.inherited(arguments)
      },

      _hideBlock: function (blockIndex) {
        if (this.blocks[blockIndex]) {
          this.div.removeChild(this.blocks[blockIndex].domNode)
          this.cleanupBlock(this.blocks[blockIndex])
          this.blocks[blockIndex] = undefined
          this.blockHeights[blockIndex] = 0
        }
      },

      _adjustBlanks: function () {
        if (this.firstAttached === null || this.lastAttached === null) {
          this.leftBlank.style.left = '0px'
          this.leftBlank.style.width = '50%'
          this.rightBlank.style.left = '50%'
          this.rightBlank.style.width = '50%'
        } else {
          this.leftBlank.style.width = `${this.firstAttached * this.widthPct}%`
          this.rightBlank.style.left = `${(this.lastAttached + 1) * this.widthPct}%`
          this.rightBlank.style.width = `${(this.numBlocks - this.lastAttached - 1) * this.widthPct}%`
        }
      },

      hideAll: function () {
        if (null == this.firstAttached) {
          return
        }
        for (var i = this.firstAttached; i <= this.lastAttached; i++) {
          this._hideBlock(i)
        }

        this.firstAttached = null
        this.lastAttached = null
        this._adjustBlanks()
      },

      // hides all blocks that overlap the given region/location
      hideRegion: function (location) {
        if (null == this.firstAttached) {
          return
        }
        // hide all blocks that overlap the given region
        for (var i = this.firstAttached; i <= this.lastAttached; i++) {
          if (
            this.blocks[i] &&
            location.ref == this.refSeq.name &&
            !(
              this.blocks[i].leftBase > location.end ||
              this.blocks[i].rightBase < location.start
            )
          ) {
            this._hideBlock(i)
          }
        }

        this._adjustBlanks()
      },

      /**
       *   _changeCallback invoked here is passed in constructor,
       *         and typically is GenomeView.showVisibleBlocks()
       */
      changed: function () {
        this.hideAll()
        if (this._changedCallback) {
          this._changedCallback()
        }
      },

      _makeLoadingMessage: function () {
        var msgDiv = dojo.create('div', {
          className: 'loading',
          innerHTML: '<div class="text">Loading</span>',
          title: 'Loading data...',
          style: {
            visibility: 'hidden',
          },
        })
        window.setTimeout(function () {
          msgDiv.style.visibility = 'visible'
        }, 200)
        return msgDiv
      },

      showFatalError: function (error) {
        query('.block', this.div)
          .concat(query('.blank-block', this.div))
          .concat(query('.error', this.div))
          .orphan()
        this.blocks = []
        this.blockHeights = []

        this.fatalErrorMessageElement = this._renderErrorMessage(
          error || this.fatalError,
          this.div,
        )
        this.heightUpdate(domGeom.position(this.fatalErrorMessageElement).h)
        this.updateStaticElements(this.genomeView.getPosition())
      },

      // generic handler for all types of errors
      _handleError: function (error, viewArgs) {
        var errorContext = dojo.mixin({}, error)
        dojo.mixin(errorContext, viewArgs)

        var isObject = typeof error == 'object'

        if (isObject && error instanceof Errors.TimeOut && errorContext.block) {
          this.fillBlockTimeout(
            errorContext.blockIndex,
            errorContext.block,
            error,
          )
        } else if (isObject && error instanceof Errors.DataOverflow) {
          if (errorContext.block) {
            this.fillTooManyFeaturesMessage(
              errorContext.blockIndex,
              errorContext.block,
              viewArgs.scale,
              error,
            )
          } else {
            array.forEach(
              this.blocks,
              function (block, blockIndex) {
                if (block) {
                  this.fillTooManyFeaturesMessage(
                    blockIndex,
                    block,
                    viewArgs.scale,
                    error,
                  )
                }
              },
              this,
            )
          }
        } else {
          console.error(error.stack || `${error}`, error)
          this.fatalError = error
          this.showFatalError(error)
        }
      },

      fillBlockError: function (blockIndex, block, error) {
        error = error || this.fatalError || this.error

        domConstruct.empty(block.domNode)
        var msgDiv = this._renderErrorMessage(error, block.domNode)
        this.heightUpdate(dojo.position(msgDiv).h, blockIndex)
      },

      _renderErrorMessage: function (message, parent) {
        return domConstruct.create(
          'div',
          {
            className: 'error',
            innerHTML: dompurify.sanitize(
              `<h2>Error</h2><div class="text">An error was encountered when displaying this track.</div>${
                message
                  ? `<div class="codecaption">Diagnostic message</div><code>${
                      message
                    }</code>`
                  : ''
              }`,
            ),
            title: 'An error occurred',
          },
          parent,
        )
      },

      fillTooManyFeaturesMessage: function (blockIndex, block, scale, error) {
        var message = (
          (error && error.message) ||
          'Too much data to show'
        ).replace(/\.$/, '')

        this.fillMessage(
          blockIndex,
          block,
          `${
            message +
            (scale >= this.browser.view.maxPxPerBp
              ? ''
              : '; zoom in to see detail')
          }.`,
        )
      },

      redraw: function () {
        this.clear()
        this.genomeView.showVisibleBlocks(true)
      },

      markBlockHeightOverflow: function (block) {
        if (block.heightOverflowed) {
          return
        }

        block.heightOverflowed = true
        domClass.add(block.domNode, 'height_overflow')
        domConstruct.create(
          'div',
          {
            className: 'height_overflow_message',
            innerHTML: 'Max height reached',
            style: {
              top: `${this.height - 16}px`,
              height: '16px',
            },
          },
          block.domNode,
        )
      },

      _showBlock: function (
        blockIndex,
        startBase,
        endBase,
        scale,
        containerStart,
        containerEnd,
        finishCallback,
      ) {
        if (this.empty || this.fatalError) {
          this.heightUpdate(this.labelHeight)
          if (finishCallback) {
            finishCallback()
          }
          return
        }

        if (this.blocks[blockIndex]) {
          this.heightUpdate(this.blockHeights[blockIndex], blockIndex)
          if (finishCallback) {
            finishCallback()
          }
          return
        }

        var block = new Block({
          startBase: startBase,
          endBase: endBase,
          scale: scale,
          node: {
            className: 'block',
            style: {
              left: `${blockIndex * this.widthPct}%`,
              width: `${this.widthPct}%`,
            },
          },
        })
        this.blocks[blockIndex] = block
        this.div.appendChild(block.domNode)

        var args = [
          blockIndex,
          block,
          this.blocks[blockIndex - 1],
          this.blocks[blockIndex + 1],
          startBase,
          endBase,
          scale,
          this.widthPx,
          containerStart,
          containerEnd,
        ]

        if (this.fatalError) {
          this.fillBlockError(blockIndex, block)
          if (finishCallback) {
            finishCallback()
          }
          return
        }

        // loadMessage is an opaque mask div that we place over the
        // block until the fillBlock finishes
        var loadMessage = this._makeLoadingMessage()
        block.domNode.appendChild(loadMessage)

        var finish = function () {
          if (block && loadMessage.parentNode) {
            block.domNode.removeChild(loadMessage)
          }
          if (finishCallback) {
            finishCallback()
          }
        }

        var viewargs = {
          blockIndex: blockIndex,
          block: block,
          leftBlock: this.blocks[blockIndex - 1],
          rightBlock: this.blocks[blockIndex + 1],
          leftBase: startBase,
          rightBase: endBase,
          scale: scale,
          stripeWidth: this.widthPx,
          containerStart: containerStart,
          containerEnd: containerEnd,
          finishCallback: finish,
        }
        try {
          this.fillBlock(viewargs)
        } catch (e) {
          this._handleError(e, viewargs)
          finish()
        }
      },

      moveBlocks: function (delta) {
        var newBlocks = new Array(this.numBlocks)
        var newHeights = new Array(this.numBlocks)
        var i
        for (i = 0; i < this.numBlocks; i++) {
          newHeights[i] = 0
        }

        var destBlock
        if (
          this.lastAttached + delta < 0 ||
          this.firstAttached + delta >= this.numBlocks
        ) {
          this.firstAttached = null
          this.lastAttached = null
        } else {
          this.firstAttached = Math.max(
            0,
            Math.min(this.numBlocks - 1, this.firstAttached + delta),
          )
          this.lastAttached = Math.max(
            0,
            Math.min(this.numBlocks - 1, this.lastAttached + delta),
          )
          if (delta < 0) {
            destBlock = this.blocks[this.firstAttached - delta]
          } else {
            destBlock = this.blocks[this.lastAttached - delta]
          }
        }

        for (i = 0; i < this.blocks.length; i++) {
          var newIndex = i + delta
          if (newIndex < 0 || newIndex >= this.numBlocks) {
            //We're not keeping this block around, so delete
            //the old one.
            if (destBlock && this.blocks[i]) {
              this.transfer(this.blocks[i], destBlock)
            }
            this._hideBlock(i)
          } else {
            //move block
            newBlocks[newIndex] = this.blocks[i]
            if (newBlocks[newIndex]) {
              newBlocks[newIndex].domNode.style.left =
                `${newIndex * this.widthPct}%`
            }

            newHeights[newIndex] = this.blockHeights[i]
          }
        }
        this.blocks = newBlocks
        this.blockHeights = newHeights
        this._adjustBlanks()
      },

      sizeInit: function (numBlocks, widthPct, blockDelta) {
        var i, oldLast
        this.numBlocks = numBlocks
        this.widthPct = widthPct
        if (blockDelta) {
          this.moveBlocks(-blockDelta)
        }
        if (this.blocks && this.blocks.length > 0) {
          //if we're shrinking, clear out the end blocks
          var destBlock = this.blocks[numBlocks - 1]
          for (i = numBlocks; i < this.blocks.length; i++) {
            if (destBlock && this.blocks[i]) {
              this.transfer(this.blocks[i], destBlock)
            }
            this._hideBlock(i)
          }
          oldLast = this.blocks.length
          this.blocks.length = numBlocks
          this.blockHeights.length = numBlocks
          //if we're expanding, set new blocks to be not there
          for (i = oldLast; i < numBlocks; i++) {
            this.blocks[i] = undefined
            this.blockHeights[i] = 0
          }
          this.lastAttached = Math.min(this.lastAttached, numBlocks - 1)
          if (this.firstAttached > this.lastAttached) {
            //not sure if this can happen
            this.firstAttached = null
            this.lastAttached = null
          }

          if (this.blocks.length != numBlocks) {
            throw new Error(
              `block number mismatch: should be ${numBlocks}; blocks.length: ${
                this.blocks.length
              }`,
            )
          }

          for (i = 0; i < numBlocks; i++) {
            if (this.blocks[i]) {
              this.blocks[i].domNode.style.left = `${i * widthPct}%`
              this.blocks[i].domNode.style.width = `${widthPct}%`
            }
          }
        } else {
          this.initBlocks()
        }

        this.makeTrackMenu()
      },

      fillMessage: function (blockIndex, block, message, class_) {
        domConstruct.empty(block.domNode)
        var msgDiv = dojo.create(
          'div',
          {
            className: class_ || 'message',
            // eslint-disable-next-line xss/no-mixed-html
            innerHTML: Util.escapeHTML(message),
          },
          block.domNode,
        )
        this.heightUpdate(
          domGeom.getMarginBox(msgDiv, domStyle.getComputedStyle(msgDiv)).h,
          blockIndex,
        )
      },

      /**
       * Called by GenomeView when the view is scrolled: communicates the
       * new x, y, width, and height of the view.  This is needed by tracks
       * for positioning stationary things like axis labels.
       */
      updateStaticElements: function (/**Object*/ coords) {
        this.window_info = dojo.mixin(this.window_info || {}, coords)
        if (this.fatalErrorMessageElement) {
          this.fatalErrorMessageElement.style.width = `${this.window_info.width * 0.6}px`
          if ('x' in coords) {
            this.fatalErrorMessageElement.style.left = `${coords.x + this.window_info.width * 0.2}px`
          }
        }

        if (this.label && 'x' in coords) {
          this.label.style.left = `${coords.x}px`
        }
      },

      /**
       * Render a dijit menu from a specification object.
       *
       * @param menuTemplate definition of the menu's structure
       * @param context {Object} optional object containing the context
       *   in which any click handlers defined in the menu should be
       *   invoked, containing thing like what feature is being operated
       *   upon, the track object that is involved, etc.
       * @param parent {dijit.Menu|...} parent menu, if this is a submenu
       */
      _renderContextMenu: function (
        /**Object*/ menuStructure,
        /** Object */ context,
        /** dijit.Menu */ parent,
      ) {
        if (!parent) {
          parent = new dijitMenu()
          this.own(parent)
        }

        for (var key in menuStructure) {
          var spec = menuStructure[key]
          try {
            if (spec.children) {
              var child = new dijitMenu()
              parent.addChild(child)
              parent.addChild(
                new dijitPopupMenuItem({
                  popup: child,
                  label: spec.label,
                }),
              )
              this._renderContextMenu(spec.children, context, child)
            } else {
              var menuConf = dojo.clone(spec)
              if (menuConf.action || menuConf.url || menuConf.href) {
                menuConf.onClick = this._makeClickHandler(spec, context)
              }
              // only draw other menu items if they do something when clicked.
              // drawing menu items that do nothing when clicked
              // would frustrate users.
              if (menuConf.label && !menuConf.onClick) {
                menuConf.disabled = true
              }

              // currently can only use preloaded types
              var class_ =
                {
                  'dijit/MenuItem': dijitMenuItem,
                  'dijit/CheckedMenuItem': dijitCheckedMenuItem,
                  'dijit/RadioMenuItem': dijitRadioMenuItem,
                  'dijit/MenuSeparator': dijitMenuSeparator,
                }[spec.type] || dijitMenuItem

              parent.addChild(new class_(menuConf))
            }
          } catch (e) {
            console.error(`failed to render menu item ${key}`, e)
          }
        }
        return parent
      },

      _makeClickHandler: function (inputSpec, context) {
        var track = this

        if (typeof inputSpec == 'function') {
          inputSpec = { action: inputSpec }
        } else if (typeof inputSpec == 'undefined') {
          console.error(
            'Undefined click specification, cannot make click handler',
          )
          return function () {}
        } else if (inputSpec.action == 'defaultDialog') {
          inputSpec.action = 'contentDialog'
          inputSpec.content = dojo.hitch(this, 'defaultFeatureDetail')
        }

        var handler = function (evt) {
          if (track.genomeView.dragging) {
            return
          }

          var ctx = context || this
          var spec = track._processMenuSpec(dojo.clone(inputSpec), ctx)
          var url = spec.url || spec.href
          spec.url = url

          // try to understand the `action` setting
          spec.action =
            spec.action ||
            (url ? 'iframeDialog' : spec.content ? 'contentDialog' : false)
          spec.title = spec.title || spec.label

          if (typeof spec.action == 'string') {
            // treat `action` case-insensitively
            spec.action = {
              iframedialog: 'iframeDialog',
              iframe: 'iframeDialog',
              contentdialog: 'contentDialog',
              content: 'contentDialog',
              baredialog: 'bareDialog',
              bare: 'bareDialog',
              xhrdialog: 'xhrDialog',
              xhr: 'xhrDialog',
              newwindow: 'newWindow',
              _blank: 'newWindow',
              thiswindow: 'navigateTo',
              navigateto: 'navigateTo',
            }[`${spec.action}`.toLowerCase()]

            if (spec.action == 'newWindow') {
              window.open(url, '_blank')
            } else if (spec.action == 'navigateTo') {
              window.location = url
            } else if (
              spec.action in
              {
                iframeDialog: 1,
                contentDialog: 1,
                xhrDialog: 1,
                bareDialog: 1,
              }
            ) {
              track._openDialog(spec, evt, ctx)
            }
          } else if (typeof spec.action == 'function') {
            spec.action.call(ctx, evt)
          } else {
            return
          }
        }

        // if there is a label, set it on the handler so that it's
        // accessible for tooltips or whatever.
        if (inputSpec.label) {
          handler.label = inputSpec.label
        }

        return handler
      },

      /**
       * @returns {Object} DOM element containing a rendering of the
       *                   detailed metadata about this track
       */
      _trackDetailsContent: function (additional) {
        var details = domConstruct.create('div', {
          className: 'detail',
        })
        var fmt = lang.hitch(this, 'renderDetailField', details)
        fmt('Name', this.key || this.name)
        var metadata = lang.clone(this.getMetadata())
        delete metadata.key
        delete metadata.label
        if (typeof metadata.conf == 'object') {
          delete metadata.conf
        }
        if (
          this.browser &&
          this.browser.config &&
          this.browser.config.trackSelector &&
          this.browser.config.trackSelector.renameFacets
        ) {
          var metadataCopy = {}
          for (var k in metadata) {
            var key = this.browser.config.trackSelector.renameFacets[k] || k
            metadataCopy[key] = metadata[k]
          }
          metadata = metadataCopy
        }
        var md_keys = []
        for (var k in metadata) {
          md_keys.push(k)
        }
        md_keys.sort(function (a, b) {
          return a.toLowerCase().localeCompare(b.toLowerCase())
        })
        for (var i = 0; i < md_keys.length; i++) {
          var k = md_keys[i]
          fmt(this.camelToTitleCase(k), metadata[k])
        }
        for (var k in additional) {
          fmt(k, additional[k])
        }
        return details
      },

      camelToTitleCase: function (str) {
        if (str === str.toLowerCase()) {
          return Util.ucFirst(str.replace(/_/g, ' '))
        } else {
          return str
        }
      },

      getMetadata: function () {
        return (
          this.config.metadata ||
          (this.browser &&
            this.browser.trackMetaDataStore &&
            this.browser.trackMetaDataStore.getItem(this.name)) ||
          {}
        )
      },

      setPinned: function (p) {
        this.config.pinned = !!p

        if (this.config.pinned) {
          domClass.add(this.div, 'pinned')
        } else {
          domClass.remove(this.div, 'pinned')
        }

        return this.config.pinned
      },
      isPinned: function () {
        return !!this.config.pinned
      },

      /**
       * @returns {Array} menu options for this track's menu (usually contains save as, etc)
       */
      _trackMenuOptions: function () {
        var that = this
        return [
          {
            label: 'About this track',
            title: `About track: ${this.key || this.name}`,
            iconClass: 'jbrowseIconHelp',
            action: 'contentDialog',
            content: dojo.hitch(this, '_trackDetailsContent'),
          },
          {
            label: 'Pin to top',
            type: 'dijit/CheckedMenuItem',
            title: 'make this track always visible at the top of the view',
            checked: that.isPinned(),
            //iconClass: 'dijitIconDelete',
            onClick: function () {
              that.browser.publish(
                `/jbrowse/v1/v/tracks/${this.checked ? 'pin' : 'unpin'}`,
                [that.name],
              )
            },
          },
          {
            label: 'Edit config',
            title: "edit this track's configuration",
            iconClass: 'dijitIconConfigure',
            action: function () {
              new TrackConfigEditor(that.config).show(function (result) {
                // replace this track's configuration
                that.browser.publish('/jbrowse/v1/v/tracks/replace', [
                  result.conf,
                ])
              })
            },
          },
          {
            label: 'Delete track',
            title: 'delete this track',
            iconClass: 'dijitIconDelete',
            action: function () {
              new ConfirmDialog({
                title: 'Delete track?',
                message: 'Really delete this track?',
              }).show(function (confirmed) {
                if (confirmed) {
                  that.browser.publish('/jbrowse/v1/v/tracks/delete', [
                    that.config,
                  ])
                }
              })
            },
          },
        ]
      },

      _processMenuSpec: function (spec, context) {
        for (var x in spec) {
          if (spec.hasOwnProperty(x)) {
            if (typeof spec[x] == 'object') {
              spec[x] = this._processMenuSpec(spec[x], context)
            } else {
              spec[x] = this.template(
                context.feature,
                this._evalConf(context, spec[x], x),
              )
            }
          }
        }
        return spec
      },

      /**
       * Get the value of a conf variable, evaluating it if it is a
       * function.  Note: does not template it, that is a separate step.
       *
       * @private
       */
      _evalConf: function (context, confVal, confKey) {
        // list of conf vals that should not be run immediately on the
        // feature data if they are functions
        var dontRunImmediately = {
          action: 1,
          click: 1,
          content: 1,
        }

        return typeof confVal == 'function' && !dontRunImmediately[confKey]
          ? confVal.apply(context, context.callbackArgs || [])
          : confVal
      },

      /**
       * Like getConf, but get a conf value that explicitly can vary
       * feature by feature.  Provides a uniform function signature for
       * user-defined callbacks.
       */
      getConfForFeature: function (path, feature) {
        return this.getConf(path, [feature, path, null, null, this])
      },

      isFeatureHighlighted: function (feature, name) {
        var highlight = this.browser.getHighlight()
        return (
          highlight &&
          highlight.objectName &&
          highlight.objectName == name &&
          highlight.ref == this.refSeq.name &&
          !(
            feature.get('start') > highlight.end ||
            feature.get('end') < highlight.start
          )
        )
      },

      _openDialog: function (spec, evt, context) {
        context = context || {}
        var type = spec.action
        type = type.replace(/Dialog/, '')
        var featureName =
          context.feature &&
          (context.feature.get('name') || context.feature.get('id'))
        var dialogOpts = {
          class: `popup-dialog popup-dialog-${type}`,
          title:
            spec.title ||
            spec.label ||
            (featureName ? `${featureName} details` : 'Details'),
          style: dojo.clone(spec.style || {}),
        }
        if (spec.dialog) {
          declare.safeMixin(dialogOpts, spec.dialog)
        }

        var dialog

        function setContent(dialog, content) {
          if (typeof content.then == 'function') {
            content.then(function (c) {
              dialog.set('content', dompurify.sanitize(c))
            })
          } else {
            dialog.set('content', dompurify.sanitize(content))
          }
        }

        // if dialog == xhr, open the link in a dialog
        // with the html from the URL just shoved in it
        if (type == 'xhr' || type == 'content') {
          if (type == 'xhr') {
            dialogOpts.href = spec.url
          }

          dialog = new InfoDialog(dialogOpts)
          context.dialog = dialog

          if (type == 'content') {
            setContent(dialog, this._evalConf(context, spec.content, null))
          }

          Util.removeAttribute(context, 'dialog')
        } else if (type == 'bare') {
          dialog = new Dialog(dialogOpts)
          context.dialog = dialog

          setContent(dialog, this._evalConf(context, spec.content, null))

          Util.removeAttribute(context, 'dialog')
        }
        // open the link in a dialog with an iframe
        else if (type == 'iframe') {
          var iframeDims = function () {
            var d = domGeom.position(this.browser.container)
            return {
              h: Math.round(d.h * 0.8),
              w: Math.round(d.w * 0.8),
            }
          }.call(this)

          dialog = new Dialog(dialogOpts)

          var iframe = dojo.create('iframe', {
            tabindex: '0',
            width: iframeDims.w,
            height: iframeDims.h,
            style: { border: 'none' },
            src: spec.url,
          })

          dialog.set('content', iframe)
          if (!spec.hideIframeDialogUrl) {
            dojo.create(
              'a',
              {
                href: spec.url,
                target: '_blank',
                className: 'dialog-new-window',
                title: 'open in new window',
                onclick: dojo.hitch(dialog, 'hide'),

                // eslint-disable-next-line xss/no-mixed-html
                innerHTML: dompurify.sanitize(spec.url),
              },
              dialog.titleBar,
            )
          }
          var updateIframeSize = function () {
            // hitch a ride on the dialog box's
            // layout function, which is called on
            // initial display, and when the window
            // is resized, to keep the iframe
            // sized to fit exactly in it.
            var cDims = domGeom.position(dialog.containerNode)
            var width = cDims.w
            var height = cDims.h - domGeom.position(dialog.titleBar).h
            iframe.width = width
            iframe.height = height
          }
          aspect.after(dialog, 'layout', updateIframeSize)
          aspect.after(dialog, 'show', updateIframeSize)
        }

        // destroy the dialog after it is hidden
        aspect.after(dialog, 'hide', function () {
          setTimeout(function () {
            dialog.destroyRecursive()
          }, 500)
        })

        // show the dialog
        dialog.show()
      },

      /**
       * Given a string with template callouts, interpolate them with
       * data from the given object.  For example, "{foo}" is replaced
       * with whatever is returned by obj.get('foo')
       */
      template: function (/** Object */ obj, /** String */ template) {
        if (typeof template != 'string' || !obj) {
          return template
        }

        var valid = true
        if (template) {
          return template.replace(/\{([^}]+)\}/g, function (match, group) {
            var val = obj ? obj.get(group.toLowerCase()) : undefined
            if (val !== undefined) {
              return val
            } else {
              return ''
            }
          })
        }
        return undefined
      },

      /**
       * Makes and installs the dropdown menu showing operations available for this track.
       * @private
       */
      makeTrackMenu: function () {
        var thisB = this
        when(this._trackMenuOptions()).then(function (options) {
          if (
            options &&
            options.length &&
            thisB.label &&
            thisB.labelMenuButton
          ) {
            // remove our old track menu if we have one
            if (thisB.trackMenu) {
              thisB.trackMenu.destroyRecursive()
            }

            // render and bind our track menu
            var menu = thisB._renderContextMenu(options, {
              menuButton: thisB.labelMenuButton,
              track: thisB,
              browser: thisB.browser,
              refSeq: thisB.refSeq,
            })
            menu.startup()
            menu.set('leftClickToOpen', true)
            menu.bindDomNode(thisB.labelMenuButton)
            menu.set('leftClickToOpen', false)
            menu.bindDomNode(thisB.label)
            thisB.trackMenu = menu
            thisB.own(thisB.trackMenu)
          }
        })
      },

      // display a rendering-timeout message
      fillBlockTimeout: function (blockIndex, block) {
        domConstruct.empty(block.domNode)
        domClass.add(block.domNode, 'timed_out')
        this.fillMessage(
          blockIndex,
          block,
          'This region took too long' +
            ' to display, possibly because' +
            ' it contains too much data.' +
            ' Try zooming in to show a smaller region.',
        )
      },

      renderRegionBookmark: function (args, bookmarks, renderLabels) {
        var thisB = this
        if (bookmarks.then) {
          bookmarks.then(
            function (books) {
              array.forEach(
                books.features,
                function (bookmark) {
                  if (bookmark.ref != this.refSeq.name) {
                    return
                  }
                  var loc = new Location(
                    `${bookmark.refseq}:${bookmark.start}..${bookmark.end}`,
                  )
                  this.renderRegionHighlight(
                    args,
                    loc,
                    bookmark.color,
                    renderLabels ? bookmark.label : null,
                    renderLabels ? bookmark.rlabel : null,
                  )
                },
                thisB,
              )
            },
            function (error) {
              console.log("Couldn't get bookmarks")
            },
          )
        } else {
          array.forEach(
            bookmarks.features,
            function (bookmark) {
              if (bookmark.ref != this.refSeq.name) {
                return
              }
              var loc = new Location(
                `${bookmark.refseq}:${bookmark.start}..${bookmark.end}`,
              )
              this.renderRegionHighlight(
                args,
                loc,
                bookmark.color,
                renderLabels ? bookmark.label : null,
                renderLabels ? bookmark.rlabel : null,
              )
            },
            this,
          )
        }
      },

      renderRegionHighlight: function (args, highlight, color, label, rlabel) {
        // do nothing if the highlight does not overlap this region
        if (highlight.start > args.rightBase || highlight.end < args.leftBase) {
          return
        }

        var block_span = args.rightBase - args.leftBase

        var left = highlight.start
        var right = highlight.end

        // trim left and right to avoid making a huge element that can cause problems
        var trimLeft = args.leftBase - left
        if (trimLeft > 0) {
          left += trimLeft
        }
        var trimRight = right - args.rightBase
        if (trimRight > 0) {
          right -= trimRight
        }

        var width = ((right - left) * 100) / block_span
        left = ((left - args.leftBase) * 100) / block_span
        var highlight = domConstruct.create(
          'div',
          {
            className:
              (color ? 'global_highlight_mod' : 'global_highlight') +
              (trimLeft <= 0 ? ' left' : '') +
              (trimRight <= 0 ? ' right' : ''),
            style: {
              left: `${left}%`,
              width: `${width}%`,
              height: '100%',
              background: color,
            },
          },
          args.block.domNode,
        )

        this.postRenderHighlight(highlight)

        if (label) {
          if (trimLeft <= 0) {
            var d1 = domConstruct.create(
              'div',
              {
                className: 'horizontaltext',
                style: {
                  background: 'white',
                  zIndex: 1000,
                  left: `${left}%`,
                },
                // eslint-disable-next-line xss/no-mixed-html
                innerHTML: dompurify.sanitize(label),
              },
              args.block.domNode,
            )
          }
          if (trimRight <= 0) {
            domConstruct.create(
              'div',
              {
                className: 'horizontaltext',
                style: {
                  background: 'white',
                  zIndex: 1000,
                  left: `${left + width}%`,
                },

                // eslint-disable-next-line xss/no-mixed-html
                innerHTML: dompurify.sanitize(rlabel),
              },
              args.block.domNode,
            )
          }

          var textWidth = `${d1.clientWidth + 1}px`
          d1.style.left = `calc(${left}% - ${textWidth})`
        }
      },
      postRenderHighlight: function (node) {},
    },
  )
})

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
