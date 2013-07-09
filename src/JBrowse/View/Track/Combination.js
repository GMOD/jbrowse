define([
			'dojo/_base/declare',
			'dojo/on',
			'dojo/dom-construct',
			'dojo/dom-class',
			'dojo/Deferred',
				'dojo/promise/all',
				'dojo/when',
				'./Combination/CombinationDialog',
				'dijit/Dialog',
			'JBrowse/View/Track/BlockBased',
			'JBrowse/Store/SeqFeature/Combination/TreeNode',
			'dojo/dnd/move',
			'dojo/dnd/Source',
			'dojo/dnd/Manager',
			'JBrowse/Util',
			'JBrowse/View/TrackConfigEditor'
		 ],
		 function(
				 declare,
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
				 TrackConfigEditor
		 ) {
return declare(BlockBased,
 /**
	* @lends JBrowse.View.Track.Combination.prototype
	*/
{

		/**
		 * Creates a track with a drag-and-drop interface allowing users to drag other tracks into it.
		 * Users select (using a dialog) a way to combine these tracks, and they are combined.
		 * Certain tracks (e.g. HTMLFeatures tracks) may be combined set-theoretically (union, intersection,etc ),
		 * while others (e.g. BigWig tracks) may be combined quantitatively (add scores, subtract scores, etc...).
		 * If one of the tracks is a set-based track and the other is not, track masking operations may be applied.
		 * @constructs
		 */


		constructor: function( args ) {
		// The "default" track of each type is the one at index 0 of the innerTypes array.

			// Many different kinds of tracks can be added.  Each is supported by a different store, and some can be rendered in several ways.
			// The trackClasses object stores information about what can be done with each of these types.
			this.trackClasses =
			{
				"set":  { 
							innerTypes:   [{
												name: "HTMLFeatures",
												path: "JBrowse/View/Track/HTMLFeatures"
											  },
											{
												name: "CanvasFeatures",
												path: "JBrowse/View/Track/CanvasFeatures"
											}],
							store:        "JBrowse/Store/SeqFeature/Combination",
							allowedOps:   ["&", "U", "X", "S"],
							defaultOp :   "&"
						},
				"quant": 	{
							innerTypes:   [{
											name: "XYPlot",
											path: "JBrowse/View/Track/Wiggle/XYPlot"
										  },
										  {
											name: "Density",
											path: "JBrowse/View/Track/Wiggle/Density"
										  }],
							store:        "JBrowse/Store/SeqFeature/QCombination",
							allowedOps:   ["+", "-", "*", "/"], 
							defaultOp:    "+"
						},
				"mask": {
							innerTypes: [{
											name: "XYPlot",
											path: "JBrowse/View/Track/Wiggle/XYPlot"
										},
										{
											name: "Density",
											path: "JBrowse/View/Track/Wiggle/Density"
										}],
							store: 		"JBrowse/Store/SeqFeature/Mask",
							allowedOps: ["M", "N"],
							defaultOp: 	"M"
						},
				"BAM": {
							innerTypes: [{
											name: "Alignments2",
											path: "JBrowse/View/Track/Alignments2"
										},
										{
											name: "SNP/Coverage",
											path: "JBrowse/View/Track/SNPCoverage" //For now
										}],
							store: 		"JBrowse/Store/SeqFeature/BAMCombination",
							allowedOps: ["U"],
							defaultOp: 	"U"
						}
			};

			// inWords just stores, in words, what each possible operation does.  This is helpful for dialogs and menus that
			// allow selection of different operations.
			this.inWords =
			{
				"+": "addition",
				"-": "subtraction",
				"*": "multiplication",
				"/": "division",
				"&": "intersection",
				"U": "union",
				"X": "XOR",
				"S": "set subtraction",
				"M": "regular mask",
				"N": "inverse mask",
				// These four-digit codes are used by the CombinationDialog object to differentiate different types of masking operations.
				"0000": "normal operation",
				"0020": "use new track as mask",
				"0002": "use old track as mask",
				"1111": "merge tracks",
				"1001": "add new track to old track's displayed data",
				"1010": "add new track to old track's mask",
				"0101": "add old track to new track's displayed data",
				"0110": "add old track to new track's mask"
			};

			// Each store becomes associated with the name of a track that uses that store, so that users can read more easily.
			this.keyToStore = {};
			this.storeToKey = {};

			// Shows which track or store types qualify as set-based, quantitative, etc.
			this.supportedBy = 
			{
			  "JBrowse/View/Track/HTMLFeatures": "set",
			  "JBrowse/View/Track/HTMLVariants": "set",
			  "JBrowse/View/Track/CanvasFeatures": "set",
			  "JBrowse/Store/BigWig": "quant",
  			  "JBrowse/Store/SeqFeature/BAM": "BAM",
  			  "JBrowse/Store/SeqFeature/BAMCombination": "BAM",
			  "JBrowse/Store/SeqFeature/Combination": "set",
			  "JBrowse/Store/SeqFeature/QCombination": "quant",
			  "JBrowse/Store/SeqFeature/Mask": "mask" 
			};

			this.loaded = true;

			// For CSS customization of the outer
			this.divClass = args.divClass || "combination";

			// Sets a bunch of variables to their initial values
			this.reinitialize();


			// When other tracks are dragged onto the combination, they don't disappear from their respective sources
			// (in case the user wants to add the track separately, by itself).  These variables will be used in the DnD
			// methods to support this functionality
			this.currentDndSource = undefined;
			this.sourceWasCopyOnly = undefined;

			// This is used to avoid creating a feedback loop in the height-updating process.
			this.onlyRefreshOuter = false;

			// Height of the top and bottom divs (when there is an inner track)
			this.topHeight = 20;
			this.bottomHeight = 20;
			this.heightInner = 0;

			// Height of the track (when there is no inner track)
			this.heightNoInner = 50;

			this.height = args.height || this.heightNoInner;

			// This variable (which will later be a deferred) ensures that when multiple tracks are added simultaneously,
			// The dialogs for each one don't render all at once.
			this.lastDialogDone = true;

		},


		setViewInfo: function(genomeView, heightUpdate, numBlocks,
												 trackDiv,
												 widthPct, widthPx, scale) {
			this.inherited( arguments );
			this.scale = scale;

			// This track has a dnd source (to support dragging tracks into and out of it).
			this.dnd = new dndSource( this.div,
			{
				accept: ["track"], //Accepts only tracks
				withHandles: true,
				creator: dojo.hitch( this, function( trackConfig, hint ) {
						// Renders the inner track div (or avatar, depending).  Code for ensuring that we don't have several inner tracks
						// is handled later in the file.
						return {
								data: trackConfig,
								type: ["track"],
								node: hint == 'avatar'
									? dojo.create('div', { innerHTML: "Inner Track", className: 'track-label dragging' })
									: this.addTrack(trackConfig)
						};
				})
			});

			// Attach dnd events
			this._attachDndEvents();

			// If config contains a config for the inner track, use it. (This allows reloading when the track config is edited. )
			if(this.config.innerTrack) {
				this.dnd.insertNodes(false, [this.config.innerTrack]);
			}
		},


		// This function ensure that the combination track's drag-and-drop interface works correctly.
		_attachDndEvents: function() {
			var thisB = this;

			// What to do at the beginning of dnd process
			on(thisB.dnd, "DndStart", function(source, nodes, copy) {
					if(source == thisB.dnd && nodes[0] && thisB.innerTrack) {
						// Dragging the inner track out of the outer track - need to use the config of the combined track rather than
						// the initial config.
						source.getItem(nodes[0].id).data = thisB.innerTrack.config;
						source.getItem(nodes[0].id).data.label = "combination_inner_track" + thisB.browser.innerTrackCount;
						
						// Ensures that when innerTrack is a masked track and either the mask or the unmasked data are being viewed
						// (not together) that the correct store will be loaded by wherever receives the track.
						var store = thisB._visible().store;
						source.getItem(nodes[0].id).data.store = store.name;
						source.getItem(nodes[0].id).data.storeClass = store.config.type;
						// Doesn't remove the data from the inner track when either the mask alone or the data alone is removed - only copies.
						// Lincoln wanted it this way
						if(store != thisB.store) {
							thisB.dnd.copyOnly = true;
						}
						// Prevents the store and inner track from being reloaded too often
						thisB.onlyRefreshOuter = true;
					}
					// Stores the information about whether the source was copy-only, for future reference
					thisB.currentDndSource = source;
					thisB.sourceWasCopyOnly = source.copyOnly;
			});

			// When other tracks are dragged onto the combination, they don't disappear from their respective sources
			on(thisB.dnd, "DraggingOver", function() {        
					if(thisB.currentDndSource) {
						// Tracks being dragged onto this track are copied, not moved.
						thisB.currentDndSource.copyOnly = true;
					}
					this.currentlyOver = true;
			});
			var dragEndingEvents = ["DraggingOut", "DndDrop", "DndCancel"];
							
			for(var eventName in dragEndingEvents)
				on(thisB.dnd, dragEndingEvents[eventName], function() {
						if(thisB.currentDndSource) {
							// Makes sure that the dndSource isn't permanently set to CopyOnly
							thisB.currentDndSource.copyOnly = thisB.sourceWasCopyOnly;
						}
						this.currentlyOver = false;
				});

			on(thisB.dnd, "DndDrop", function(source, nodes, copy, target) {
				// Ensures that all inner tracks are given unique IDs to prevent crashing
				if(source == thisB.dnd && nodes[0]) {
					thisB.browser.innerTrackCount++;
					thisB.onlyRefreshOuter = false;
				}
				if(!copy && nodes[0] && source == thisB.dnd && target != thisB.dnd) {
					// Refresh the view when the inner track is dragged out
					thisB.reinitialize();
					thisB.refresh();
				}
				thisB.dnd.copyOnly = false;
			});
			// Bug fixer
			dojo.subscribe("/dnd/drop/before", function(source, nodes, copy, target) {
					if(target == thisB.dnd && nodes[0]) {
						thisB.dnd.current = null;
					}
			});
			on(thisB.dnd, "DndCancel", function() {
					thisB.onlyRefreshOuter = false;
					thisB.dnd.copyOnly = false;
			});
			on(thisB.dnd, "OutEvent", function() {
					// Fixes a glitch wherein the trackContainer is disabled when the track we're dragging leaves the combination track
					dndManager.manager().overSource(thisB.genomeView.trackDndWidget);
			});

			on(thisB.dnd, "DndSourceOver", function(source) {
					// Fixes a glitch wherein tracks dragged into the combination track sometimes go to the trackContainer instead.
					if(source != this && this.currentlyOver) {
							dndManager.manager().overSource(this);
					}
			});

			// Further restricts what categories of tracks may be added to this track
			// Should re-examine this
			var oldCheckAcceptance = this.dnd.checkAcceptance;
			this.dnd.checkAcceptance = function(source, nodes) {
				// If the original acceptance checker fails, this one will too.
				var accept = oldCheckAcceptance.call(thisB.dnd, source, nodes);

				// Additional logic to disqualify bad tracks - if one node is unacceptable, the whole group is disqualified
				for(var i = 0; accept && nodes[i]; i++) {
					var trackConfig = source.getItem(nodes[i].id).data;
					accept = accept && (thisB.supportedBy[trackConfig.storeClass] || thisB.supportedBy[trackConfig.type]);
				}
				
				return accept;
			};
		},

		// Reset a bunch of variables
		reinitialize: function() {
			if(this.dnd) {
				this.dnd.selectAll().deleteSelectedNodes();
			}
			this.innerDiv = undefined;
			this.innerTrack = undefined;
			this.storeType = undefined;
			this.oldType = undefined;
			this.classIndex = {"set" : 0, "quant": 0, "BAM": 0};
			this.storeToShow = 0;
			this.displayStore = undefined;
			this.maskStore = undefined;
			this.store = undefined;
			this.opTree = undefined;
		},

		// Modifies the inner track when a new track is added
		addTrack: function(trackConfig) {
			// Connect the track's name to its store for easy reading by user
			if(trackConfig && trackConfig.key && trackConfig.store) {
				this.storeToKey[trackConfig.store] = trackConfig.key;
				this.keyToStore[trackConfig.key] = trackConfig.store;
			}

			// Figure out which type of track (set, quant, etc) the user is adding
			this.currType = this.supportedBy[trackConfig.storeClass] || this.supportedBy[trackConfig.type];

			// What type of Combination store corresponds to the track just added
			this.storeClass = this.trackClasses[this.currType].store;

			// Creates the inner div, if it hasn't already been created
			if(!this.innerDiv) {
				this.innerDiv = dom.create("div");
				this.innerDiv.className = "track";
				this.innerDiv.id = this.name + "_innerDiv";
				this.innerDiv.style.top = this.topHeight + "px"; //Alter this.
			}
			
			// Carry on the process of adding the track
			this._addTrackStore(trackConfig);
			// Because _addTrackStore has deferreds, the dnd node must be returned before it is filled
			return this.innerDiv;
		},

		// Obtains the store of the track that was just added.
		_addTrackStore: function(trackConfig) {
			var storeName = trackConfig.store;
			var thisB = this;
			var haveStore = (function() {
				var d = new Deferred();
				thisB.browser.getStore(storeName, function(store) {
					if(store) {
						d.resolve(store,true);
					} else {
						d.reject("store " + storeName + " not found", true);
					}
				});
				return d.promise;
			})();
			// Once we have the store, it's time to open the dialog.
			haveStore.then(function(store){
				thisB.runDialog(trackConfig, store);
			});
		},

		// Runs the dialog that asks the user how to combine the track.
		runDialog: function(trackConfig, store) {
			// If this is the first track being added, it's not being combined with anything, so we don't need to ask - just adds the track alone
			if(this.oldType === undefined) {
				var opTree = store.isCombinationStore ? store.opTree : new TreeNode({Value: store, leaf: true});
				this.displayType = (this.currType == "mask") ? this.supportedBy[store.stores.display.config.type] : undefined;
				this.opTree = opTree;
				this._adjustStores(store);
				return;
			}
			// Once the last dialog has closed, opens a new one
			when(this.lastDialogDone, dojo.hitch(this, function() {
				if(this.preferencesDialog)
					this.preferencesDialog.destroyRecursive();
				this.lastDialogDone = new Deferred();
				this.preferencesDialog = new CombinationDialog({
					key: trackConfig.key,
					store: store,
					track: this
				});
				// Once the results of the dialog are back, uses them to continue the process of rendering the inner track
				this.preferencesDialog.run(dojo.hitch(this, function(opTree, newstore, displayType) {
					this.opTree = opTree;
					this.displayType = displayType;
					this.lastDialogDone.resolve(true);
					console.log(this._generateTreeFormula(opTree));
					this._adjustStores(newstore);
				}), dojo.hitch(this, function() {
					this.lastDialogDone.resolve(true);
				}));
			}))

		},

		// If this track contains masked data, it uses three stores.  Otherwise, it uses one.
		// This function ensures that all secondary stores (one for the mask, one for the display) have been loaded.
		// If not, it loads them itself.  This function tries not to waste stores - if a store of a certain type already exists,
		// it uses it rather than creating a new one.
		_adjustStores: function (store) {
			var d = new Deferred();

			this.storeType = "mask";
			if(this.oldType == "mask") {
				var haveMaskStore = this.maskStore.reload(this.opTree.leftChild);
				var haveDisplayStore = this.displayStore.reload(this.opTree.rightChild);
				all([haveMaskStore, haveDisplayStore]).then(dojo.hitch(this, function() {
					this.store.reload(this.opTree, this.maskStore, this.displayStore);
					d.resolve(true);
				}));
			} else if(this.currType == "mask") {
				this.maskStore = store.stores.mask;
				this.displayStore = store.stores.display;
				this.store = store;
				var haveMaskStore = this.maskStore.reload(this.opTree.leftChild);
				var haveDisplayStore = this.displayStore.reload(this.opTree.rightChild);
				all([haveMaskStore, haveDisplayStore]).then(dojo.hitch(this, function() {
					this.store.reload(this.opTree, this.maskStore, this.displayStore);
					d.resolve(true);
				}));
			} else if(this.opTree.get() == "M" || this.opTree.get() == "N") { // We may want to not hard-code this in.  Means the final store will be a masked store.
				var haveMaskStore = this._createStore("set").then(dojo.hitch(this, function(newstore) {
					this.maskStore = newstore;
					return this.maskStore.reload(this.opTree.leftChild);
				}));
				var haveDisplayStore = this._createStore(this.displayType).then(dojo.hitch(this, function(newStore){
					this.displayStore = newStore;
					return this.displayStore.reload(this.opTree.rightChild);
				}));
				this.storeType = "mask";
				this.store = undefined;
				d = all([haveMaskStore, haveDisplayStore]);
			} else {
				this.storeType = this.currType;
				d.resolve(true);
			}
			this.oldType = this.storeType;
			d.then(dojo.hitch(this, function() {
				this.createStore();
			}));
		},

		// Checks if the primary store has been created yet.  If it hasn't, calls "_createStore" and makes it.
		createStore: function() {
			var d = new Deferred();
			var thisB = this;

			if(!this.store) {
				d = this._createStore();
			} else {
				d.resolve(this.store, true);
			}
			d.then(function(store) { 
				// All stores are now in place.  Make sure the operation tree of the store matches that of this track,
				// and then we can render the inner track.
				thisB.store = store;
				thisB.store.reload(thisB.opTree, thisB.maskStore, thisB.displayStore);
				thisB.renderInnerTrack();
			})
		},

		// Creates a store config and passes it to the browser, which creates the store and returns its name.
		_createStore: function(storeType) {
			var d = new Deferred();

			var storeConf = this._storeConfig(storeType);
			var storeName = this.browser._addStoreConfig(undefined, storeConf);
			storeConf.name = storeName;
			this.browser.getStore(storeName, function(store) {
				d.resolve(store, true);
			});
			return d.promise;
		},

		// Uses the current settings of the combination track to create a store
		_storeConfig: function(storeType) {
			if(!storeType)
				storeType = this.storeType;
			var storeClass = this.trackClasses[storeType].store;

			var op = this.trackClasses[storeType].defaultOp;
			return 	{
						browser: this.browser,
						refSeq: this.browser.refSeq.name,
						type: storeClass,
						op: op
					};
		},

		// This method is particularly useful when masked data is being displayed, and returns data which depends on
		// which of (data, mask, masked data) is being currently displayed.
		_visible: function() {
			var which = [this.displayType || this.storeType, "set", this.displayType];
			
			var allTypes = [{ 	store: this.store,
								tree: this.opTree },
							{ 	store: this.maskStore,
								tree: this.opTree ? this.opTree.leftChild : undefined },
							{ 	store: this.displayStore,
								tree: this.opTree ? this.opTree.rightChild : undefined }];
			for(var i in which) {
				allTypes[i].which = which[i];
				if(which[i]) {
					var storeType = (i == 0 && this.storeType == "mask") ? "mask" : which[i];
					allTypes[i].allowedOps = this.trackClasses[storeType].allowedOps;
					allTypes[i].trackType = this.trackClasses[which[i]].innerTypes[this.getClassIndex(which[i])].path;
				}
			}
			if(this.storeType != "mask") return allTypes[0];
			return allTypes[this.storeToShow];
		},

		// Time to actually render the inner track.
		renderInnerTrack: function() {

			if(this.innerTrack) {
				// Destroys the inner track currently in place if it exists. We're going to create a new one.
				this.innerTrack.clear();
				this.innerTrack.destroy();
				while(this.innerDiv.firstChild) { // Use dojo.empty instead?
					this.innerDiv.removeChild(this.innerDiv.firstChild);
				}
			}
			// Checks one last time to ensure we have a store before proceeding
			if(this._visible().store) {
				// Gets the path of the track to create
				var trackClassName = this._visible().trackType;
				var trackClass;

				var thisB = this;
				// Once we have the object for the type of track we're creating, call this.
				var makeTrack = function(){
					// Construct a track with the relevant parameters
			  		thisB.innerTrack = new trackClass({
							config: thisB._innerTrackConfig(trackClassName),
							browser: thisB.browser,
							refSeq: thisB.refSeq,
							store: thisB._visible().store,
							trackPadding: 0});
	  				
	  				// This will be what happens when the inner track updates its height - makes necessary changes to 
	  				// outer track's height and then passes up to the heightUpdate callback specified as a parameter to this object
					var innerHeightUpdate = function(height) {
						thisB.innerDiv.style.height = height + "px";
						thisB.heightInner = height;
						thisB.height = thisB.topHeight + height + thisB.bottomHeight;
						thisB.onlyRefreshOuter = true;
						thisB.refresh();
						thisB.onlyRefreshOuter = false;
						thisB.heightUpdate(thisB.height);
						thisB.div.style.height = thisB.height + "px";
					}
	  
	  				// setViewInfo on inner track
					thisB.innerTrack.setViewInfo (thisB.genomeView, innerHeightUpdate,
						thisB.numBlocks, thisB.innerDiv, thisB.widthPct, thisB.widthPx, thisB.scale);

					thisB._redefineCloseButton();

					// Only do this when the masked data is selected
					// (we don't want editing the config to suddenly remove the data or the mask)
					if(thisB._visible().store == thisB.store) {
						// Refresh inner track config, so that the track can be recreated when the config is edited
						thisB.config.innerTrack = thisB.innerTrack.config;
					}

					thisB.refresh();
		  		}

		  		// Loads the track class from the specified path
				require([trackClassName], function(tc) {
					trackClass = tc;
					if(trackClass) makeTrack();
				});
	  		}
		},

		// The close button of the inner track doesn't only hide the inner track on the tracksel menu - it destroys it
		_redefineCloseButton: function() {
				var closeButton = this.innerTrack.label.childNodes[0];
				if(closeButton.className == "track-close-button") {
					this.innerTrack.label.removeChild(closeButton);
					var closeButton = dojo.create('div',{
															className: 'track-close-button'
														}, this.innerTrack.label, "first");

					this.innerTrack.own( on( closeButton, 'click', dojo.hitch(this,function(evt){
								this.browser.view.suppressDoubleClick( 100 );
								this.reinitialize();
								this.refresh();
								evt.stopPropagation();
					})));

				}
		},

		// Generate the config of the inner track
		_innerTrackConfig: function(trackClass) {
			var config = {
									store: this.store.name,
									storeClass: this.store.config.type,
									feature: ["match"],
									key: "Inner Track",
									label: this.name + "_inner",
									metadata: { description: "This track was created from a combination track."},
									type: trackClass
						};

			if(this.config.innerTrack) {
				if(this.config.innerTrack.storeClass == config.storeClass || this.supportedBy[this.config.innerTrack.storeClass] == this.displayType) {
					config = this.config.innerTrack;
					config.store = this.store.name;
					return config;
				}
				config.key = this.config.innerTrack.key;
				config.label = this.config.innerTrack.label;
				config.metadata = this.config.innerTrack.metadata;
			}
			if(this.supportedBy[trackClass] == "quant") {
				config.autoscale = "local";
			}
			return config;
		},

		// Refresh what the user sees on the screen for this track
		refresh: function(track) {
			if(!track) {
				track = this;
			}
			var storeIsReloaded;
			if(this._visible().store && !this.onlyRefreshOuter) {
				// Reload the store if it's not too much trouble
				storeIsReloaded = this._visible().store.reload(this._visible().tree, this.maskStore, this.displayStore);
				
			}
			else {
				if(!this.onlyRefreshOuter) {
					// Causes the innerTrack to be removed from the config when it has been removed
					delete this.config.innerTrack;
				}
				storeIsReloaded = true;
			}

			// once the store is properly reloaded, make sure the track is showing data correctly
			when(storeIsReloaded, dojo.hitch(this, function(reloadedStore) {
				if(this.range) {
					track.clear();
					track.showRange(this.range.f, this.range.l, this.range.st, this.range.b,
						this.range.sc, this.range.cs, this.range.ce);
				}
		  		this.makeTrackMenu();
			}));
		},

		// Extends the BlockBased track's showRange function.
		showRange: function(first, last, startBase, bpPerBlock, scale, containerStart, containerEnd) {
			this.range = {f: first, l: last, st: startBase, 
										b: bpPerBlock, sc: scale, 
										cs: containerStart, ce: containerEnd};
			if(this.innerTrack && !this.onlyRefreshOuter) {
					
					// The inner track should be reloaded to show the same range as the outer track
					this.innerTrack.clear();
					
					// This is a workaround to a glitch that causes an opaque white rectangle to appear sometimes when a quantitative
					// track is loaded.
					var needsDiv = !this.innerDiv.parentNode;
					if(needsDiv) {
						this.div.appendChild(this.innerDiv);
					}
					this.innerTrack.showRange(first, last, startBase, bpPerBlock, scale, containerStart, containerEnd);
					if(needsDiv) {
						this.div.removeChild(this.innerDiv);
					}
				}
			// Run the method from BlockBased.js
			this.inherited(arguments);
			
			// Make sure the height of this track is right
			this.height = (this.innerTrack ? (this.topHeight + this.heightInner + this.bottomHeight) : this.heightNoInner);
			this.heightUpdate(this.height);
			this.div.style.height = this.height + "px";
		},

		// If moveBlocks is called on this track, should be called on the inner track as well
		moveBlocks: function(delta) {
				this.inherited(arguments);
				if(this.innerTrack)
					this.innerTrack.moveBlocks(delta);
		},

		// fillBlock in this renders all the relevant borders etc that surround the inner track and let the user know
		// that this is a combination track
		fillBlock: function( args ) {
				var blockIndex = args.blockIndex;
				var block = args.block;
				var leftBase = args.leftBase;

				var text = "Add tracks here";
				if(this.innerTrack) {
					// Border on the top
					var topDiv = dom.create("div");
					topDiv.className = "combination";
					topDiv.style.height = this.topHeight + "px";
					topDiv.appendChild( document.createTextNode( text ) );
					block.domNode.appendChild( topDiv );

					// Border on the bottom
					var bottomDiv = dom.create("div");
					bottomDiv.className = "combination";
					bottomDiv.style.height = this.bottomHeight + "px";
					bottomDiv.style.top = (this.topHeight + this.heightInner) + "px";
					bottomDiv.appendChild( document.createTextNode( text ) );
					block.domNode.appendChild( bottomDiv );
				} else {
					// If no inner track, just one solid mass of grey.
					var textDiv = dom.create("div");
					textDiv.className = "combination";
					var text = "Add tracks here";
					textDiv.style.height = this.heightNoInner + "px";
					textDiv.appendChild( document.createTextNode( text ) );  
					block.domNode.appendChild( textDiv );
				}

				// Ensures highlighting handled correctly.
				var highlight = this.browser.getHighlight();
				if( highlight && highlight.ref == this.refSeq.name )
						this.renderRegionHighlight( args, highlight );

				this.heightUpdate( this.height, blockIndex);
				this.div.style.height = this.height + "px";
				args.finishCallback();
		},

		// endZoom is passed down to innerTrack
		endZoom: function(destScale, destBlockBases) {
				this.clear(); // Necessary?
				if(this.innerTrack)
					this.innerTrack.endZoom();
		},

		//  updateStaticElements passed down to innerTrack
		updateStaticElements: function(args) {
		  this.inherited(arguments);
		  if(this.innerTrack)
		  	this.innerTrack.updateStaticElements(args);
		},

		// When the inner track can be shown in multiple different classes (e.g. XYPlot or Density), this allows users to choose between them
		setClassIndex: function(index, type) {
			if(!type)
				type = this._visible().which;
			if(type == "mask" && this.displayStore)
				type = this.supportedBy[this.displayStore.config.type];
			this.classIndex[type] = index;
		},

		// When the inner track can be shown in multiple different classes (e.g. XYPlot or Density), this tells us which one is currently chosen
		getClassIndex: function(type) {
			if(type == "mask" && this.displayStore)
				type = this.supportedBy[this.displayStore.config.type];
			return this.classIndex[type];
		},

		// Adds options to the track context menu
		_trackMenuOptions: function() {
			var o = this.inherited(arguments);
			var combTrack = this;

			// If no tracks are added, we don't need to add any more options
			if(!this.storeType)
				return o;

			if(this.storeType == "mask") {
				// If a masking track, enables users to toggle between viewing data, mask, and masked data
				var maskOrDisplay = ["masked data", "mask", "data only"];
				var maskOrDisplayItems = Object.keys(maskOrDisplay).map(function(i) {
					return {
								type: 'dijit/CheckedMenuItem',
								checked: (combTrack.storeToShow == i),
								label: maskOrDisplay[i],
								title: "View " + maskOrDisplay[i],
								action: function() {
									combTrack.storeToShow = i;
									combTrack.renderInnerTrack();
								}
							}
				});
				o.push.apply(
					o,
					[{
						type: 'dijit/MenuSeparator'
					},
					{
						children: maskOrDisplayItems,
						label: "View",
						title: "switch between the mask, display data and masked data for this masking track" 
					}]);
			}

			// User may choose which class to render inner track (e.g. XYPlot or Density) if multiple options exist
			var classes = this.trackClasses[this._visible().which].innerTypes;

			var classItems = Object.keys(classes).map(function(i){
				return  {
					type: 'dijit/CheckedMenuItem',
					label: classes[i].name,
					checked: (combTrack.classIndex[combTrack._visible().which] == i),
					title: "Display as " + classes[i].name + " track",
					action: function() 
							{
							  combTrack.setClassIndex(i);
							  combTrack.renderInnerTrack();
							}
						};
			});
			o.push.apply(
				o,
				[
				  { type: 'dijit/MenuSeparator' },
				  {
					children: classItems,
					label: "Track type",
					title: "Change what type of track is being displayed"
				  }
				]);

			// Allow user to view the current track formula.
			if(this.opTree) {
				o.push.apply(
					o, 
					  [{ label: 'View formula',
						title: 'View the formula specifying this combination track',
						action: function() {
									var formulaDialog = new Dialog({title: "View Formula"});
									var content = "";
									if(combTrack.opTree)
										content = combTrack._generateTreeFormula(combTrack.opTree);
									else
										content = "No operation formula defined";
									formulaDialog.set("content", content);
									formulaDialog.show();
								}
					  	}]);
			}

			// If the current view contains more than one track combined, user may change the last operation applied
	 		if(this._visible().tree && this._visible().tree.getLeaves().length > 1) {
				var operationItems = this._visible().allowedOps.map(
													function(op) {
														return {
															type: 'dijit/CheckedMenuItem',
															checked: (combTrack._visible().tree.get() == op),
															label: combTrack.inWords[op],
															title: "change operation of last track to " + combTrack.inWords[op],
															action: function() {
																if(combTrack.opTree) {
																	combTrack._visible().tree.set(op);
																	combTrack.refresh();
																}
															}
														}
													});
				o.push.apply(
					o,
					  [{ children: operationItems,
						label: "Change last operation",
						title: "change the operation applied to the last track added"
					  }]
					);
			}
		  
			return o;
		},

		// Turns an opTree into a formula to be better understood by the user.
		_generateTreeFormula: function(tree) {
			if(!tree || tree === undefined){
				return "NULL";
			}
			if(tree.isLeaf()){
				return "\"" + (tree.get().name ? (this.storeToKey[tree.get().name] ? this.storeToKey[tree.get().name] : tree.get().name)
				 : tree.get()) + "\"";
			}
			return "( " + this._generateTreeFormula(tree.left()) +" "+ tree.get() +" " + this._generateTreeFormula(tree.right()) +" )";
		},


		// These methods are not currently in use, but they allow direct loading of the opTree into the config.
		/*
		flatten: function(tree) {
			var newTree = {
				leaf: tree.leaf
			};
			if(tree.leftChild)
				newTree.leftChild = this.flatten(tree.leftChild);
			if(tree.rightChild)
				newTree.rightChild = this.flatten(tree.rightChild);
			if(tree.get().name)
				newTree.store = tree.get().name;
			else
				newTree.op = tree.get();
			return newTree;
		},

		
		loadTree: function(tree) {
			var d = new Deferred();
			var haveLeft = undefined;
			var haveRight = undefined;
			var thisB = this;

			if(!tree) {
				d.resolve(undefined, true);
				return d.promise;
			}

			if(tree.leftChild) {
				haveLeft = this.loadTree(tree.leftChild);
			}
			if(tree.rightChild) {
				haveRight = this.loadTree(tree.rightChild);
			}
			when(all([haveLeft, haveRight]), function(results) {
				var newTree = new TreeNode({ leftChild: results[0], rightChild: results[1], leaf: tree.leaf});
				if(tree.store) {
					thisB.browser.getStore(tree.store, function(store) {
						newTree.set(store);
					});
					d.resolve(newTree, true);
				} else {
					newTree.set(tree.op);
					d.resolve(newTree, true);
				}
			});
			return d.promise;
		}*/
		
});
});