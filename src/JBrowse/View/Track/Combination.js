define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/Deferred',
  'dojo/promise/all',
  'dojo/when',
  './Combination/CombinationDialog',
  'dijit/Dialog',
  'JBrowse/View/Track/BlockBased',
  'JBrowse/Model/BinaryTreeNode',
  'dojo/dnd/move',
  'dojo/dnd/Source',
  'dojo/dnd/Manager',
  'JBrowse/Util',
  'JBrowse/View/TrackConfigEditor',
  'JBrowse/View/Track/_ExportMixin',
], function (
  declare,
  lang,
  on,
  dom,
  domClass,
  Deferred,
  all,
  when,
  CombinationDialog,
  Dialog,
  BlockBased,
  TreeNode,
  dndMove,
  dndSource,
  dndManager,
  Util,
  TrackConfigEditor,
  ExportMixin,
) {
  return declare([BlockBased, ExportMixin], {
    /**
     * Creates a track with a drag-and-drop interface allowing users to drag other tracks into it.
     * Users select (using a dialog) a way to combine these tracks, and they are combined.
     * Certain tracks (e.g. HTMLFeatures tracks) may be combined set-theoretically (union, intersection,etc ),
     * while others (e.g. BigWig tracks) may be combined quantitatively (add scores, subtract scores, etc...).
     * If one of the tracks is a set-based track and the other is not, track masking operations may be applied.
     * @constructs
     */
    constructor: function (args) {
      // The "default" track of each type is the one at
      // index 0 of the resultsTypes array.
      // Many different kinds of tracks can be added.
      // Each is supported by a different store, and
      // some can be rendered in several ways.
      // The trackClasses object stores information about what can be done with each of these types.
      this.trackClasses = {
        set: {
          resultsTypes: [
            {
              name: 'HTMLFeatures',
              path: 'JBrowse/View/Track/HTMLFeatures',
            },
          ],
          store: 'JBrowse/Store/SeqFeature/Combination',
          allowedOps: ['&', 'U', 'X', 'S'],
          defaultOp: '&',
        },
        quantitative: {
          resultsTypes: [
            {
              name: 'XYPlot',
              path: 'JBrowse/View/Track/Wiggle/XYPlot',
            },
            {
              name: 'Density',
              path: 'JBrowse/View/Track/Wiggle/Density',
            },
          ],
          store: 'JBrowse/Store/SeqFeature/QuantitativeCombination',
          allowedOps: ['+', '-', '*', '/'],
          defaultOp: '+',
        },
        mask: {
          resultsTypes: [
            {
              name: 'XYPlot',
              path: 'JBrowse/View/Track/Wiggle/XYPlot',
            },
            {
              name: 'Density',
              path: 'JBrowse/View/Track/Wiggle/Density',
            },
          ],
          store: 'JBrowse/Store/SeqFeature/Mask',
          allowedOps: ['M', 'N'],
          defaultOp: 'M',
        },
        BAM: {
          resultsTypes: [
            {
              name: 'Detail',
              path: 'JBrowse/View/Track/Alignments2',
            },
            {
              name: 'Summary',
              path: 'JBrowse/View/Track/SNPCoverage', //For now
            },
          ],
          store: 'JBrowse/Store/SeqFeature/BAMCombination',
          allowedOps: ['U'],
          defaultOp: 'U',
        },
      }

      this.errorCallback = dojo.hitch(this, function (error) {
        this._handleError(error, {})
      })

      // inWords just stores, in words, what each possible operation does.  This is helpful for dialogs and menus that
      // allow selection of different operations.
      this.inWords = {
        // These one-character codes symbolize operations between stores.
        '+': 'addition',
        '-': 'subtraction',
        '*': 'multiplication',
        '/': 'division',
        '&': 'intersection',
        U: 'union',
        X: 'XOR',
        S: 'set subtraction',
        M: 'regular mask',
        N: 'inverse mask',
        // These four-digit codes are used by the CombinationDialog object to differentiate different types of masking operations.
        '0000': 'combine without masking',
        '0020': 'use new track as mask',
        '0002': 'use old track as mask',
        1111: 'merge tracks',
        1001: "add new track to old track's displayed data",
        1010: "add new track to old track's mask",
        '0101': "add old track to new track's displayed data",
        '0110': "add old track to new track's mask",
      }

      // Each store becomes associated with the name of a track that uses that store, so that users can read more easily.
      if (!this.config.storeToKey) {
        this.config.storeToKey = {}
      }

      // Shows which track or store types qualify as set-based, quantitative, etc.
      this.supportedBy = {
        'JBrowse/View/Track/HTMLFeatures': 'set',
        'JBrowse/View/Track/HTMLVariants': 'set',
        'JBrowse/View/Track/CanvasFeatures': 'set',
        'JBrowse/View/Track/CanvasVariants': 'set',
        CanvasFeatures: 'set',
        HTMLFeatures: 'set',
        HTMLVariants: 'set',
        CanvasVariants: 'set',
        'NeatCanvasFeatures/View/Track/NeatFeatures': 'set',
        'NeatHTMLFeatures/View/Track/NeatFeatures': 'set',
        'JBrowse/View/Track/Alignments2': 'BAM',
        'JBrowse/View/Track/SNPCoverage': 'BAM',
        'JBrowse/Store/BigWig': 'quantitative',
        'JBrowse/Store/SeqFeature/BigWig': 'quantitative',
        'JBrowse/Store/SeqFeature/BAM': 'BAM',
        'JBrowse/Store/SeqFeature/BAMCombination': 'BAM',
        'JBrowse/Store/SeqFeature/Combination': 'set',
        'JBrowse/Store/SeqFeature/QuantitativeCombination': 'quantitative',
        'JBrowse/Store/SeqFeature/Mask': 'mask',
      }

      this.loaded = true

      // For CSS customization of the outer
      this.divClass = args.divClass || 'combination'

      // Sets a bunch of variables to their initial values
      this.reinitialize()

      // When other tracks are dragged onto the combination, they don't disappear from their respective sources
      // (in case the user wants to add the track separately, by itself).  These variables will be used in the DnD
      // methods to support this functionality
      this.currentDndSource = undefined
      this.sourceWasCopyOnly = undefined

      // This is used to avoid creating a feedback loop in the height-updating process.
      this.onlyRefreshOuter = false

      this.heightResults = 0

      this.height = args.height || 0

      // This variable (which will later be a deferred) ensures that when multiple tracks are added simultaneously,
      // The dialogs for each one don't render all at once.
      this.lastDialogDone = [true]
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
      this.inherited(arguments)
      domClass.add(this.div, 'combination_track empty')

      this.scale = scale

      // This track has a dnd source (to support dragging tracks into and out of it).
      this.dnd = new dndSource(this.div, {
        accept: ['track'], //Accepts only tracks
        isSource: false,
        withHandles: true,
        creator: dojo.hitch(this, function (trackConfig, hint) {
          // Renders the results track div (or avatar, depending).
          // Code for ensuring that we don't have several results tracks
          // is handled later in the file.
          var data = trackConfig
          if (trackConfig.resultsTrack) {
            data = trackConfig.resultsTrack
            data.storeToKey = trackConfig.storeToKey
          }
          return {
            data: data,
            type: ['track'],
            node: this.addTrack(data),
          }
        }),
      })

      // Attach dnd events
      this._attachDndEvents()

      // If config contains a config for the results track, use it. (This allows reloading when the track config is edited. )
      if (this.config.resultsTrack) {
        this.reloadStoreNames = true
        this.dnd.insertNodes(false, [this.config.resultsTrack])
      }
    },

    // This function ensure that the combination track's drag-and-drop interface works correctly.
    _attachDndEvents: function () {
      var thisB = this

      // What to do at the beginning of dnd process
      on(thisB.dnd, 'DndStart', function (source, nodes, copy) {
        // Stores the information about whether the source was copy-only, for future reference
        thisB.currentDndSource = source
        thisB.sourceWasCopyOnly = source.copyOnly
      })

      // When other tracks are dragged onto the combination, they don't disappear from their respective sources
      on(thisB.dnd, 'DraggingOver', function () {
        if (thisB.currentDndSource) {
          // Tracks being dragged onto this track are copied, not moved.
          thisB.currentDndSource.copyOnly = true
        }
        this.currentlyOver = true
      })

      var dragEndingEvents = ['DraggingOut', 'DndDrop', 'DndCancel']

      for (var eventName in dragEndingEvents) {
        on(thisB.dnd, dragEndingEvents[eventName], function () {
          if (thisB.currentDndSource) {
            // Makes sure that the dndSource isn't permanently set to CopyOnly
            thisB.currentDndSource.copyOnly = thisB.sourceWasCopyOnly
          }
          this.currentlyOver = false
        })
      }

      // Bug fixer
      dojo.subscribe(
        '/dnd/drop/before',
        function (source, nodes, copy, target) {
          if (target == thisB.dnd && nodes[0]) {
            thisB.dnd.current = null
          }
        },
      )

      on(thisB.dnd, 'OutEvent', function () {
        // Fixes a glitch wherein the trackContainer is disabled when the track we're dragging leaves the combination track
        dndManager.manager().overSource(thisB.genomeView.trackDndWidget)
      })

      on(thisB.dnd, 'DndSourceOver', function (source) {
        // Fixes a glitch wherein tracks dragged into the combination track sometimes go to the trackContainer instead.
        if (source != this && this.currentlyOver) {
          dndManager.manager().overSource(this)
        }
      })

      // Further restricts what categories of tracks may be added to this track
      // Should re-examine this

      var oldCheckAcceptance = this.dnd.checkAcceptance
      this.dnd.checkAcceptance = function (source, nodes) {
        // If the original acceptance checker fails, this one will too.
        var accept = oldCheckAcceptance.call(thisB.dnd, source, nodes)

        // Additional logic to disqualify bad tracks - if one node is unacceptable, the whole group is disqualified
        for (var i = 0; accept && nodes[i]; i++) {
          var trackConfig = source.getItem(nodes[i].id).data
          accept =
            accept &&
            (trackConfig.resultsTrack ||
              thisB.supportedBy[trackConfig.storeClass] ||
              thisB.supportedBy[trackConfig.type])
        }

        return accept
      }
    },

    // Reset a bunch of variables
    reinitialize: function () {
      if (this.dnd) {
        this.dnd.selectAll().deleteSelectedNodes()
      }

      // While there is no results track, we cannot export.
      this.config.noExport = true
      this.exportFormats = []

      this.resultsDiv = undefined
      this.resultsTrack = undefined
      this.storeType = undefined
      this.oldType = undefined
      this.classIndex = {}
      this.storeToShow = 0
      this.displayStore = undefined
      this.maskStore = undefined
      this.store = undefined
      this.opTree = undefined
    },

    // Modifies the results track when a new track is added
    addTrack: function (trackConfig) {
      // Connect the track's name to its store for easy reading by user
      if (trackConfig && trackConfig.key && trackConfig.store) {
        this.config.storeToKey[trackConfig.store] = trackConfig.key
      }

      if (trackConfig && trackConfig.storeToKey) {
        lang.mixin(this.config.storeToKey, trackConfig.storeToKey)
      }

      // Creates the results div, if it hasn't already been created
      if (!this.resultsDiv) {
        this.resultsDiv = dom.create('div')
        this.resultsDiv.className = 'track'
        this.resultsDiv.id = `${this.name}_resultsDiv`
        domClass.remove(this.div, 'empty')
      }

      // Carry on the process of adding the track
      this._addTrackStore(trackConfig)

      // Because _addTrackStore has deferreds, the dnd node must be returned before it is filled
      return this.resultsDiv
    },

    // Obtains the store of the track that was just added.
    _addTrackStore: function (trackConfig) {
      var storeName = trackConfig.store
      var thisB = this
      var haveStore = (function () {
        var d = new Deferred()
        thisB.browser.getStore(storeName, function (store) {
          if (store) {
            d.resolve(store, true)
          } else {
            d.reject(`store ${storeName} not found`, true)
          }
        })
        return d.promise
      })()
      // Once we have the store, it's time to open the dialog.
      haveStore.then(function (store) {
        thisB.runDialog(trackConfig, store)
      })
    },

    // Runs the dialog that asks the user how to combine the track.
    runDialog: function (trackConfig, store) {
      // If this is the first track being added, it's not being combined with anything, so we don't need to ask - just adds the track alone
      if (this.storeType === undefined) {
        // Figure out which type of track (set, quant, etc) the user is adding
        this.currType =
          this.supportedBy[trackConfig.storeClass] ||
          this.supportedBy[trackConfig.type]
        this.storeType = this.currType
        // What type of Combination store corresponds to the track just added
        this.storeClass = this.trackClasses[this.currType].store

        // opTree can be directly reloaded from track config.  This is important (e.g.) when changing reference sequences
        // to make sure that the right combinations of tracks are still included in this track.
        if (store.isCombinationStore && !store.opTree && this.config.opTree) {
          this.loadTree(this.config.opTree).then(
            dojo.hitch(this, function (tree) {
              this.opTree = tree
              this.displayType = this.config.displayType
              if (
                this.getClassIndex(this.displayType || this.storeType) ==
                undefined
              ) {
                this.setTrackClass(
                  trackConfig.type,
                  this.displayType || this.storeType,
                )
              }
              this._adjustStores(
                store,
                this.oldType,
                this.currType,
                this.config.store,
                this.config.maskStore,
                this.config.displayStore,
              )
            }),
          )
          return
        }
        var opTree = store.isCombinationStore
          ? store.opTree.clone()
          : new TreeNode({ Value: store, leaf: true })
        this.displayType =
          this.currType == 'mask'
            ? this.supportedBy[store.stores.display.config.type]
            : undefined
        if (
          this.getClassIndex(this.displayType || this.storeType) == undefined
        ) {
          this.setTrackClass(
            trackConfig.type,
            this.displayType || this.storeType,
          )
        }
        this.opTree = opTree
        if (this.reloadStoreNames) {
          this.reloadStoreNames = false
          this._adjustStores(
            store,
            this.oldType,
            this.currType,
            this.config.store,
            this.config.maskStore,
            this.config.displayStore,
          )
          return
        }
        this._adjustStores(store, this.oldType, this.currType)
        return
      }
      var d = new Deferred()

      this.lastDialogDone.push(d)
      // Once the last dialog has closed, opens a new one
      when(
        this.lastDialogDone.shift(),
        dojo.hitch(this, function () {
          if (this.preferencesDialog) {
            this.preferencesDialog.destroyRecursive()
          }
          // Figure out which type of track (set, quant, etc) the user is adding
          this.currType =
            this.supportedBy[trackConfig.storeClass] ||
            this.supportedBy[trackConfig.type]
          this.oldType = this.storeType
          // What type of Combination store corresponds to the track just added
          this.storeClass = this.trackClasses[this.currType].store
          this.preferencesDialog = new CombinationDialog({
            trackConfig: trackConfig,
            store: store,
            track: this,
          })
          // Once the results of the dialog are back, uses them to continue the process of rendering the results track
          this.preferencesDialog.run(
            dojo.hitch(this, function (opTree, newstore, displayType) {
              this.opTree = opTree
              this.displayType = displayType
              this.storeType =
                this.oldType == 'mask' ||
                this.opTree.get() == 'M' ||
                this.opTree.get() == 'N'
                  ? 'mask'
                  : this.currType
              if (
                this.getClassIndex(this.displayType || this.storeType) ==
                undefined
              ) {
                this.setTrackClass(
                  trackConfig.type,
                  this.displayType || this.storeType,
                )
              }
              this._adjustStores(newstore, this.oldType, this.currType)
              d.resolve(true)
            }),
            dojo.hitch(this, function () {
              d.resolve(true)
            }),
          )
        }),
      )
    },

    // If this track contains masked data, it uses three stores.  Otherwise, it uses one.
    // This function ensures that all secondary stores (one for the mask, one for the display) have been loaded.
    // If not, it loads them itself.  This function tries not to waste stores - if a store of a certain type already exists,
    // it uses it rather than creating a new one.
    _adjustStores: function (
      store,
      oldType,
      currType,
      storeName,
      maskStoreName,
      displayStoreName,
    ) {
      var d = new Deferred()
      if (oldType == 'mask') {
        this.maskStore.reload(this.opTree.leftChild)
        this.displayStore.reload(this.opTree.rightChild)
        this.store.reload(this.opTree, this.maskStore, this.displayStore)
        d.resolve(true)
      } else if (
        currType == 'mask' ||
        this.opTree.get() == 'M' ||
        this.opTree.get() == 'N'
      ) {
        var haveMaskStore = this._createStore('set', maskStoreName)
        haveMaskStore.then(
          dojo.hitch(this, function (newstore) {
            this.maskStore = newstore
            this.maskStore.reload(this.opTree.leftChild)
          }),
        )
        var haveDisplayStore = this._createStore(
          this.displayType,
          displayStoreName,
        )

        haveDisplayStore.then(
          dojo.hitch(this, function (newStore) {
            this.displayStore = newStore
            this.displayStore.reload(this.opTree.rightChild)
          }),
        )
        this.store = undefined
        d = all([haveMaskStore, haveDisplayStore])
      } else {
        d.resolve(true)
      }
      d.then(
        dojo.hitch(this, function () {
          this.createStore(storeName)
        }),
      )
    },

    // Checks if the primary store has been created yet.  If it hasn't, calls "_createStore" and makes it.
    createStore: function (storeName) {
      var d = new Deferred()
      var thisB = this

      if (!this.store) {
        d = this._createStore(undefined, storeName)
      } else {
        d.resolve(this.store, true)
      }
      d.then(function (store) {
        // All stores are now in place.  Make sure the operation tree of the store matches that of this track,
        // and then we can render the results track.
        thisB.store = store
        thisB.store.reload(thisB.opTree, thisB.maskStore, thisB.displayStore)
        thisB.renderResultsTrack()
      })
    },

    // Creates a store config and passes it to the browser, which creates the store and returns its name.
    _createStore: function (storeType, storeName) {
      var d = new Deferred()
      if (!storeName) {
        var storeConf = this._storeConfig(storeType)
        storeName = this.browser.addStoreConfig(undefined, storeConf)
        storeConf.name = storeName
      }

      this.browser.getStore(storeName, function (store) {
        d.resolve(store, true)
      })
      return d.promise
    },

    // Uses the current settings of the combination track to create a store
    _storeConfig: function (storeType) {
      if (!storeType) {
        storeType = this.storeType
      }
      var storeClass = this.trackClasses[storeType].store
      this.config.storeClass = storeClass

      var op = this.trackClasses[storeType].defaultOp
      return {
        browser: this.browser,
        refSeq: this.browser.refSeq.name,
        type: storeClass,
        op: op,
      }
    },

    // This method is particularly useful when masked data is being displayed, and returns data which depends on
    // which of (data, mask, masked data) is being currently displayed.
    _visible: function () {
      var which = [this.displayType || this.storeType, 'set', this.displayType]

      var allTypes = [
        { store: this.store, tree: this.opTree },
        {
          store: this.maskStore,
          tree: this.opTree ? this.opTree.leftChild : undefined,
        },
        {
          store: this.displayStore,
          tree: this.opTree ? this.opTree.rightChild : undefined,
        },
      ]
      for (var i in which) {
        allTypes[i].which = which[i]
        if (which[i]) {
          var storeType = i == 0 && this.storeType == 'mask' ? 'mask' : which[i]
          allTypes[i].allowedOps = this.trackClasses[storeType].allowedOps
          allTypes[i].trackType =
            this.trackClasses[which[i]].resultsTypes[
              this.getClassIndex(which[i]) || 0
            ].path
        }
      }
      if (this.storeType != 'mask') {
        return allTypes[0]
      }
      return allTypes[this.storeToShow]
    },

    // Time to actually render the results track.
    renderResultsTrack: function () {
      if (this.resultsTrack) {
        // Destroys the results track currently in place if it exists. We're going to create a new one.
        this.resultsTrack.clear()
        this.resultsTrack.destroy()
        while (this.resultsDiv.firstChild) {
          // Use dojo.empty instead?
          this.resultsDiv.removeChild(this.resultsDiv.firstChild)
        }
      }
      // Checks one last time to ensure we have a store before proceeding
      if (this._visible().store) {
        // Gets the path of the track to create
        var trackClassName = this._visible().trackType
        var trackClass

        var thisB = this
        var config = this._resultsTrackConfig(trackClassName)

        trackClassName = config.type

        // Once we have the object for the type of track we're creating, call this.
        var makeTrack = function () {
          // Construct a track with the relevant parameters
          thisB.resultsTrack = new trackClass({
            config: config,
            browser: thisB.browser,
            changeCallback: thisB._changedCallback,
            refSeq: thisB.refSeq,
            store: thisB._visible().store,
            trackPadding: 0,
          })

          // Removes all options from the results track's context menu.
          thisB.resultsTrackMenuOptions = thisB.resultsTrack._trackMenuOptions

          thisB.resultsTrack._trackMenuOptions = function () {
            return []
          }

          // This will be what happens when the results track updates its height - makes necessary changes to
          // outer track's height and then passes up to the heightUpdate callback specified as a parameter to this object
          var resultsHeightUpdate = function (height) {
            thisB.resultsDiv.style.height = `${height}px`
            thisB.heightResults = height
            thisB.height = height
            thisB.onlyRefreshOuter = true
            thisB.refresh()
            thisB.onlyRefreshOuter = false
            thisB.heightUpdate(thisB.height)
            thisB.div.style.height = `${thisB.height}px`
          }

          // setViewInfo on results track
          thisB.resultsTrack.setViewInfo(
            thisB.genomeView,
            resultsHeightUpdate,
            thisB.numBlocks,
            thisB.resultsDiv,
            thisB.widthPct,
            thisB.widthPx,
            thisB.scale,
          )

          // Only do this when the masked data is selected
          // (we don't want editing the config to suddenly remove the data or the mask)
          thisB.config.opTree = thisB.flatten(thisB.opTree)
          thisB.config.store = thisB.store.name
          thisB.config.maskStore = thisB.maskStore
            ? thisB.maskStore.name
            : undefined
          thisB.config.displayStore = thisB.displayStore
            ? thisB.displayStore.name
            : undefined

          if (thisB._visible().store == thisB.store) {
            // Refresh results track config, so that the track can be recreated when the config is edited
            thisB.config.resultsTrack = thisB.resultsTrack.config
            thisB.config.displayType = thisB.displayType

            thisB.browser.replaceTracks([thisB.config])

            if (typeof thisB.resultsTrack._exportFormats == 'function') {
              thisB.config.noExport = false
              thisB.exportFormats = thisB.resultsTrack._exportFormats()
            } else {
              thisB.config.noExport = true
            }
          }

          thisB.refresh()
        }

        // Loads the track class from the specified path
        dojo.global.require([trackClassName], function (tc) {
          trackClass = tc
          if (trackClass) {
            makeTrack()
          }
        })
      }
    },

    // Generate the config of the results track
    _resultsTrackConfig: function (trackClass) {
      var config = {
        store: this.store.name,
        storeClass: this.store.config.type,
        feature: ['match'],
        key: 'Results',
        label: `${this.name}_results`,
        metadata: {
          description: 'This track was created from a combination track.',
        },
        type: trackClass,
        autoscale: 'local',
      }

      if (this.config.resultsTrack) {
        if (
          (this.config.resultsTrack.storeClass == config.storeClass ||
            this.supportedBy[this.config.resultsTrack.storeClass] ==
              this.displayType) &&
          this._visible().store != this.maskStore
        ) {
          config = this.config.resultsTrack
          config.store = this.store.name
          config.storeClass = this.store.config.type
          return config
        }
        config.key = this.config.resultsTrack.key
        config.label = this.config.resultsTrack.label
        config.metadata = this.config.resultsTrack.metadata
      }
      return config
    },

    // Refresh what the user sees on the screen for this track
    refresh: function (track) {
      if (!track) {
        track = this
      }
      if (this._visible().store && !this.onlyRefreshOuter) {
        // Reload the store if it's not too much trouble
        this._visible().store.reload(
          this._visible().tree,
          this.maskStore,
          this.displayStore,
        )
      } else {
        if (!this.onlyRefreshOuter) {
          // Causes the resultsTrack to be removed from the config when it has been removed
          delete this.config.resultsTrack
          delete this.config.opTree
        }
      }

      // once the store is properly reloaded, make sure the track is showing data correctly
      if (this.range) {
        track.clear()
        track.showRange(
          this.range.f,
          this.range.l,
          this.range.st,
          this.range.b,
          this.range.sc,
          this.range.cs,
          this.range.ce,
        )
      }
      this.makeTrackMenu()
    },

    clear: function () {
      this.inherited(arguments)
      if (this.resultsTrack && !this.onlyRefreshOuter) {
        this.resultsTrack.clear()
      }
    },

    hideAll: function () {
      this.inherited(arguments)
      if (this.resultsTrack && !this.onlyRefreshOuter) {
        this.resultsTrack.hideAll()
      }
    },

    hideRegion: function (location) {
      this.inherited(arguments)
      if (this.resultsTrack && !this.onlyRefreshOuter) {
        this.resultsTrack.hideRegion(location)
      }
    },

    sizeInit: function (numBlocks, widthPct, blockDelta) {
      this.inherited(arguments)
      if (this.resultsTrack && !this.onlyRefreshOuter) {
        this.resultsTrack.sizeInit(numBlocks, widthPct, blockDelta)
      }
    },

    // Extends the BlockBased track's showRange function.
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
      this.range = {
        f: first,
        l: last,
        st: startBase,
        b: bpPerBlock,
        sc: scale,
        cs: containerStart,
        ce: containerEnd,
      }
      if (this.resultsTrack && !this.onlyRefreshOuter) {
        // This is a workaround to a glitch that causes an opaque white rectangle to appear sometimes when a quantitative
        // track is loaded.
        var needsDiv = !this.resultsDiv.parentNode
        if (needsDiv) {
          this.div.appendChild(this.resultsDiv)
        }

        var loadedRegions = []
        var stores = [this.store, this.maskStore, this.displayStore]
        for (var i in stores) {
          if (stores[i] && typeof stores[i].loadRegion == 'function') {
            var start = startBase
            var end = startBase + (last + 1 - first) * bpPerBlock
            var loadedRegion = stores[i].loadRegion({
              ref: this.refSeq.name,
              start: start,
              end: end,
            })
            loadedRegions.push(loadedRegion)
            loadedRegion.then(function () {}, this.errorCallback) // Add error callbacks to all deferred rejections
          }
        }
        when(
          all(loadedRegions),
          dojo.hitch(this, function (reloadedStores) {
            if (
              reloadedStores.length &&
              reloadedStores.indexOf(this._visible().store) != -1
            ) {
              this.resultsTrack.clear()
            }
            this.resultsTrack.showRange(
              first,
              last,
              startBase,
              bpPerBlock,
              scale,
              containerStart,
              containerEnd,
              finishCallback,
            )
          }),
          this.errorCallback,
        )

        if (needsDiv) {
          this.div.removeChild(this.resultsDiv)
        }
      }
      // Run the method from BlockBased.js
      this.inherited(arguments)
      // Make sure the height of this track is right
      this.heightUpdate(this.height)
      this.div.style.height = `${this.height}px`
    },

    // If moveBlocks is called on this track, should be called on the results track as well
    moveBlocks: function (delta) {
      this.inherited(arguments)
      if (this.resultsTrack) {
        this.resultsTrack.moveBlocks(delta)
      }
    },

    // fillBlock in this renders all the relevant borders etc that surround the results track and let the user know
    // that this is a combination track
    fillBlock: function (args) {
      var blockIndex = args.blockIndex
      var block = args.block
      var leftBase = args.leftBase

      if (!this.resultsTrack) {
        this.fillMessage(blockIndex, block, 'Drag tracks here to combine them.')
      } else {
        this.heightUpdate(this.heightResults, blockIndex)
      }
      args.finishCallback()
    },

    // endZoom is passed down to resultsTrack
    endZoom: function (destScale, destBlockBases) {
      this.clear() // Necessary?
      if (this.resultsTrack) {
        this.resultsTrack.endZoom()
      }
    },

    //  updateStaticElements passed down to resultsTrack
    updateStaticElements: function (args) {
      this.inherited(arguments)
      if (this.resultsTrack) {
        this.resultsTrack.updateStaticElements(args)
      }
    },

    // When the results track can be shown in multiple different classes
    // (e.g. XYPlot or Density), this allows users to choose between them
    setClassIndex: function (index, type) {
      if (!type) {
        type = this._visible().which
      }
      if (type == 'mask' && this.displayStore) {
        type = this.supportedBy[this.displayStore.config.type]
      }
      this.classIndex[type] = index
    },

    // Like the setClassIndex function, but accepts the actual file path of the track in question
    setTrackClass: function (tclass, type) {
      var allPaths = this.trackClasses[type].resultsTypes.map(function (item) {
        return item.path
      })
      var index = allPaths.indexOf(tclass)
      if (index >= 0) {
        this.setClassIndex(index, type)
      }
    },

    // When the results track can be shown in multiple different classes
    // (e.g. XYPlot or Density), this tells us which one is currently
    // chosen
    getClassIndex: function (type) {
      if (type == 'mask' && this.displayStore) {
        type = this.supportedBy[this.displayStore.config.type]
      }
      return this.classIndex[type]
    },

    // Adds options to the track context menu
    _trackMenuOptions: function () {
      // Allows the combination track to "mimic" the menu options of its results track
      var resultsTrackOptions = (
        this.resultsTrackMenuOptions ||
        function () {
          return undefined
        }
      ).call(this.resultsTrack)
      resultsTrackOptions = resultsTrackOptions || []

      var inheritedOptions = this.inherited(arguments)
      var inheritedLabels = inheritedOptions.map(function (menuItem) {
        return menuItem.label
      })

      for (var i = 0; i < resultsTrackOptions.length; i++) {
        if (
          resultsTrackOptions[i].label &&
          inheritedLabels.indexOf(resultsTrackOptions[i].label) != -1
        ) {
          resultsTrackOptions.splice(i--, 1)
        }
      }
      var o = inheritedOptions.concat(resultsTrackOptions)

      //var o = this.inherited(arguments);

      var combTrack = this

      // If no tracks are added, we don't need to add any more options
      if (!this.storeType) {
        return o
      }

      if (this.storeType == 'mask') {
        // If a masking track, enables users to toggle between viewing data, mask, and masked data
        var maskOrDisplay = ['masked data', 'mask', 'data only']
        var maskOrDisplayItems = Object.keys(maskOrDisplay).map(function (i) {
          return {
            type: 'dijit/CheckedMenuItem',
            checked: combTrack.storeToShow == i,
            label: maskOrDisplay[i],
            title: `View ${maskOrDisplay[i]}`,
            action: function () {
              combTrack.storeToShow = i
              combTrack.renderResultsTrack()
            },
          }
        })
        o.push.apply(o, [
          {
            type: 'dijit/MenuSeparator',
          },
          {
            children: maskOrDisplayItems,
            label: 'View',
            title:
              'switch between the mask, display data and masked data for this masking track',
          },
        ])
      }

      // User may choose which class to render results track (e.g. XYPlot or Density) if multiple options exist
      var classes = this.trackClasses[this._visible().which].resultsTypes

      var classItems = Object.keys(classes).map(function (i) {
        return {
          type: 'dijit/CheckedMenuItem',
          label: classes[i].name,
          checked: combTrack.classIndex[combTrack._visible().which] == i,
          title: `Display as ${classes[i].name} track`,
          action: function () {
            combTrack.setClassIndex(i)
            delete combTrack.config.resultsTrack
            combTrack.renderResultsTrack()
          },
        }
      })
      o.push.apply(o, [
        { type: 'dijit/MenuSeparator' },
        {
          children: classItems,
          label: 'Track display',
          title: 'Change what type of track is being displayed',
        },
      ])

      // Allow user to view the current track formula.
      if (this.opTree) {
        o.push.apply(o, [
          {
            label: 'View formula',
            title: 'View the formula specifying this combination track',
            action: function () {
              var formulaDialog = new Dialog({
                title: 'View Formula',
              })
              var content = []
              var formulaDiv = dom.create('div', {
                innerHTML: 'No operation formula defined',
                className: 'formulaPreview',
              })
              content.push(formulaDiv)
              if (combTrack.opTree) {
                formulaDiv.innerHTML = combTrack._generateTreeFormula(
                  combTrack.opTree,
                )
              }
              formulaDialog.set('content', content)
              formulaDialog.show()
            },
          },
        ])
      }

      // If the current view contains more than one track combined, user may change the last operation applied
      if (this._visible().tree && this._visible().tree.getLeaves().length > 1) {
        var operationItems = this._visible().allowedOps.map(function (op) {
          return {
            type: 'dijit/CheckedMenuItem',
            checked: combTrack._visible().tree.get() == op,
            label: combTrack.inWords[op],
            title: `change operation of last track to ${combTrack.inWords[op]}`,
            action: function () {
              if (combTrack.opTree) {
                combTrack._visible().tree.set(op)
                combTrack.refresh()
              }
            },
          }
        })
        o.push.apply(o, [
          {
            children: operationItems,
            label: 'Change last operation',
            title: 'change the operation applied to the last track added',
          },
        ])
      }

      return o
    },

    // Turns an opTree into a formula to be better understood by the user.
    _generateTreeFormula: function (tree) {
      if (!tree || tree === undefined) {
        return '<span class="null">NULL</span>'
      }
      if (tree.isLeaf()) {
        return `<span class="leaf${tree.highlighted ? ' highlighted' : ''}">${
          tree.get().name
            ? this.config.storeToKey[tree.get().name]
              ? this.config.storeToKey[tree.get().name]
              : tree.get().name
            : tree.get()
        }</span>`
      }
      return `<span class="tree">(${this._generateTreeFormula(
        tree.left(),
      )} <span class="op" title="${
        this.inWords[tree.get()]
      }">${tree.get()}</span> ${this._generateTreeFormula(
        tree.right(),
      )})</span>`
    },

    _exportFormats: function () {
      return this.exportFormats || []
    },

    // These methods are not currently in use, but they allow direct loading of the opTree into the config.

    flatten: function (tree) {
      var newTree = {
        leaf: tree.leaf,
      }
      if (tree.leftChild) {
        newTree.leftChild = this.flatten(tree.leftChild)
      }
      if (tree.rightChild) {
        newTree.rightChild = this.flatten(tree.rightChild)
      }
      if (tree.get().name) {
        newTree.store = tree.get().name
      } else {
        newTree.op = tree.get()
      }
      return newTree
    },

    loadTree: function (tree) {
      var d = new Deferred()
      var haveLeft
      var haveRight
      var thisB = this

      if (!tree) {
        d.resolve(undefined, true)
        return d.promise
      }

      if (tree.leftChild) {
        haveLeft = this.loadTree(tree.leftChild)
      }
      if (tree.rightChild) {
        haveRight = this.loadTree(tree.rightChild)
      }
      when(all([haveLeft, haveRight]), function (results) {
        var newTree = new TreeNode({
          leftChild: results[0],
          rightChild: results[1],
          leaf: tree.leaf,
        })
        if (tree.store) {
          thisB.browser.getStore(tree.store, function (store) {
            newTree.set(store)
          })
          d.resolve(newTree, true)
        } else {
          newTree.set(tree.op)
          d.resolve(newTree, true)
        }
      })
      return d.promise
    },
  })
})
