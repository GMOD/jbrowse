define([
		 'dojo/_base/declare',
		 'dojo/on',
		 'dojo/dom-construct',
		 'dojo/dom-class',
		 'dojo/Deferred',
 		 'dojo/promise/all',
 		 'dojo/when',
 		 './Combination/CombinationDialog',
		 'JBrowse/View/Track/BlockBased',
		 'JBrowse/Store/SeqFeature/Combination/TreeNode',
			'dojo/dnd/move',
		 'dojo/dnd/Source',
		 'dojo/dnd/Manager',
		 'JBrowse/Util'],
		 function(
				 declare,
				 on,
				 dom,
				 domClass,
				 Deferred,
				 all,
				 when,
				 Dialog,
				 BlockBased,
				 TreeNode,
				 dndMove,
				 dndSource,
				 dndManager,
				 Util
		 ) {
return declare(BlockBased,
 /**
	* @lends JBrowse.View.Track.Combination.prototype
	*/
{

		/**
		 * 
		 * 
		 * @constructs
		 */


		constructor: function( args ) {
		// The "default" track of each type is the one at index 0 of the innerTypes array.
			this.trackClasses =
			{
				"set":  { 
							innerTypes:   [{
												name: "HTMLFeatures",
												path: "JBrowse/View/Track/HTMLFeatures"
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
				"0000": "normal operation",
				"0020": "use new track as mask",
				"0002": "use old track as mask",
				"1111": "merge tracks",
				"1001": "add new track to old track's displayed data",
				"1010": "add new track to old track's mask",
				"0101": "add old track to new track's displayed data",
				"0110": "add old track to new track's mask"
			};
			this.keyToStore = {};
			this.storeToKey = {};

			this.supportedBy = 
			{
			  "JBrowse/View/Track/HTMLFeatures": "set",
			  "JBrowse/View/Track/HTMLVariants": "set",
			  "JBrowse/Store/BigWig": "quant",
  			  "JBrowse/Store/SeqFeature/BAM": "BAM",
			  "JBrowse/Store/SeqFeature/Combination": "set",
			  "JBrowse/Store/SeqFeature/QCombination": "quant",
			  "JBrowse/Store/SeqFeature/Mask": "mask" 
			};

			this.loaded = true;
			this.divClass = args.divClass || "combination";

			this.reinitialize();
			this.tracks = [];

			// this.opTree = new TreeNode({ Value: this.defaultOp });

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

			this.counter = 0;
		},

		setViewInfo: function(genomeView, heightUpdate, numBlocks,
												 trackDiv,
												 widthPct, widthPx, scale) {
				this.inherited( arguments );
				this.scale = scale;

				this.dnd = new dndSource( this.div,
				{
					accept: ["track"], //Accepts only tracks
					withHandles: true,
					creator: dojo.hitch( this, function( trackConfig, hint ) {
							return {
									data: trackConfig,
									type: ["track"],
									node: hint == 'avatar'
										? dojo.create('div', { innerHTML: "Inner Track", className: 'track-label dragging' })
										: this.addTrack(trackConfig)
							};
					})
				});

				this._attachDndEvents();
		},


		// This function ensure that the combination track's drag-and-drop interface works correctly.
		_attachDndEvents: function() {
				var thisB = this;

				on(thisB.dnd, "DndStart", function(source, nodes, copy) {
						if(source == thisB.dnd && nodes[0] && thisB.innerTrack) {
							// Dragging the inner track out of the outer track.
							source.getItem(nodes[0].id).data = thisB.innerTrack.config;
							source.getItem(nodes[0].id).data.label = "combination_inner_track" + thisB.browser.innerTrackCount;
							thisB.onlyRefreshOuter = true;
						}
						// Stores the information about whether the source was copy-only, for future reference
						thisB.currentDndSource = source;
						thisB.sourceWasCopyOnly = source.copyOnly;
				});
				on(thisB.dnd, "DraggingOver", function() {        
						if(thisB.currentDndSource) {
							// Tracks being dragged onto this track are copied, not moved.
							thisB.currentDndSource.copyOnly = true;

							// Do some css voodoo if the track being dragged is "unacceptable"
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
					if(source == thisB.dnd && nodes[0]) {
						thisB.browser.innerTrackCount++;
						thisB.onlyRefreshOuter = false;
					}
					if(!copy && nodes[0] && source == thisB.dnd && target != thisB.dnd) {
						// Refresh the view when the inner track is dragged out
						thisB.reinitialize();
						thisB.refresh();
					}
				});
				dojo.subscribe("/dnd/drop/before", function(source, nodes, copy, target) {
						if(target == thisB.dnd && nodes[0]) {
							thisB.dnd.current = null;
						}
				});
				on(thisB.dnd, "DndCancel", function() {
						thisB.onlyRefreshOuter = false;
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

		reinitialize: function() {
			this.innerDiv = undefined;
			this.innerTrack = undefined;
			this.storeType = undefined;
			this.classIndex = {"set" : 0, "quant": 0, "BAM": 0};
			this.storeToShow = 0;
			this.displayStore = undefined;
			this.maskStore = undefined;
			this.store = undefined;
			this.opTree = undefined;
		},

		addTrack: function(trackConfig) {
			// There's probably a better way to store this data.  We'll do it this way since it's easily bidirectional (for read/write).

			if(trackConfig && trackConfig.key) this.storeToKey[trackConfig.store] = trackConfig.key;
			if(trackConfig && trackConfig.store) this.keyToStore[trackConfig.key] = trackConfig.store;
			// This should be eventually made more complicated to disallow 
			this.currType = this.supportedBy[trackConfig.storeClass] || this.supportedBy[trackConfig.type];

			this.oldType = this.storeType;
			// This needs to be moved to the right place.

			//this.defaultOp = this.trackClasses[this.storeType].defaultOp;
			this.storeClass = this.trackClasses[this.currType].store; //

			if(!this.innerDiv) {
				this.innerDiv = dom.create("div");
				this.innerDiv.className = "track";
				this.innerDiv.id = this.name + "_innerDiv";
				this.innerDiv.style.top = this.topHeight + "px"; //Alter this.
			} else { // Otherwise we'll have to remove whatever track is currently in the div
				this.innerDiv.parentNode.removeChild(this.innerDiv);
			}

			this._addTrackStore(trackConfig);
			return this.innerDiv;
		},

		_addTrackStore: function(trackConfig) {
			var storeName = trackConfig.store;
			var thisB = this;
			var haveStore = (function() {
				var d = new Deferred();
				thisB.browser.getStore(storeName, function(store) {
					if(store) {
						d.resolve(store,true);
						console.log(store.config.type);
					} else {
						d.reject("store " + storeName + " not found", true);
					}
				});
				return d.promise;
			})();
			haveStore.then(function(store){
				thisB.runDialog(trackConfig, store);
			});
		},

		runDialog: function(trackConfig, store) {
			if(this.oldType === undefined) {
				var opTree = store.isCombinationStore ? store.opTree : new TreeNode({Value: store, leaf: true});
				this.displayType = (this.currType == "mask") ? this.supportedBy[store.stores.display.config.type] : undefined;
				this._adjustStores(opTree, store);
				return;
			}
			if(this.preferencesDialog) this.preferencesDialog.destroyRecursive();
			this.preferencesDialog = new Dialog({
				key: trackConfig.key,
				store: store,
				track: this
			});
			this.preferencesDialog.run(dojo.hitch(this, function(opTree, newstore, displayType) {
				this.displayType = displayType;
				console.log(this._generateTreeFormula(opTree));
				this._adjustStores(opTree, newstore);
			}), function() {});
		},

		_adjustStores: function (opTree, store) {
			var d = new Deferred();

			this.opTree = opTree;

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
			} else if(opTree.get() == "M" || opTree.get() == "N") { // We may want to not hard-code this in.  Means the final store will be a masked store.
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
			d.then(dojo.hitch(this, function() {
				this.createStore();
			}));
		},

		createStore: function() {
			var d = new Deferred();
			var thisB = this;

			if(!this.store) {
				d = this._createStore();
			} else {
				d.resolve(this.store, true);
			}
			d.then(function(store) { 
				thisB.store = store;
				thisB.store.reload(thisB.opTree, thisB.maskStore, thisB.displayStore);
				thisB.renderInnerTrack();
			})
		},

		_createStore: function(storeType) {
			var d = new Deferred();
			var thisB = this;

			var storeConf = this._storeConfig(storeType);
			var storeName = this.browser._addStoreConfig(undefined, storeConf);
			storeConf.name = storeName;
			thisB.browser.getStore(storeName, function(store) {
				d.resolve(store, true);
			});
			return d.promise;
		},

		_storeConfig: function(storeType) {
			if(!storeType) storeType = this.storeType;
			var storeClass = this.trackClasses[storeType].store;

			var op = this.trackClasses[storeType].defaultOp;
			return 	{
						browser: this.browser,
						refSeq: this.browser.refSeq.name,
						type: storeClass,
						op: op
					};
		},

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

		renderInnerTrack: function() {
			if(this.innerTrack) {
				this.innerTrack.clear();
				this.innerTrack.destroy();

				while(this.innerDiv.firstChild) { // Use dojo.empty instead?
					this.innerDiv.removeChild(this.innerDiv.firstChild);
				}
			}
			if(this._visible().store) {
				var trackClassName = this._visible().trackType;
				var trackClass;
				var thisB = this;
				var makeTrack = function(){
			  		thisB.innerTrack = new trackClass({
							config: thisB._innerTrackConfig(trackClassName),
							browser: thisB.browser,
							refSeq: thisB.refSeq,
							store: thisB._visible().store,
							trackPadding: 0});
	  
					var innerHeightUpdate = function(height) {
						thisB.heightInner = height;
						thisB.height = thisB.topHeight + height + thisB.bottomHeight;
						thisB.onlyRefreshOuter = true;
						thisB.refresh();
						thisB.onlyRefreshOuter = false;
						thisB.heightUpdate(thisB.height);
						thisB.div.style.height = thisB.height + "px";
					}
	  
					thisB.innerTrack.setViewInfo (thisB.genomeView, innerHeightUpdate,
						thisB.numBlocks, thisB.innerDiv, thisB.widthPct, thisB.widthPx, thisB.scale);
					thisB._redefineCloseButton();
					thisB.refresh();
		  		}

				require([trackClassName], function(tc) {
					trackClass = tc;
					if(trackClass) makeTrack();
				});
	  		}
		},

		_redefineCloseButton: function() {
				var closeButton = this.innerTrack.label.childNodes[0];
				if(closeButton.className == "track-close-button") {
					this.innerTrack.label.removeChild(closeButton);
					var closeButton = dojo.create('div',{
															className: 'track-close-button'
														}, this.innerTrack.label, "first");

					this.innerTrack.own( on( closeButton, 'click', dojo.hitch(this,function(evt){
								this.browser.view.suppressDoubleClick( 100 );
								this.div.removeChild(this.innerDiv);
								this.reinitialize();
								this.refresh();
								evt.stopPropagation();
					})));

				}
		},

		_innerTrackConfig: function(trackClass) {
			var config = {
									store: this.store.name,
									storeClass: this.store.config.type,
									feature: ["match"],
									key: "Inner Track",
									label: this.name + "_inner",
									metadata: {Description: "This track was created from a combination track."},
									type: trackClass
						};
			if(this.supportedBy[trackClass] == "quant") {
				config.autoscale = "local";
			}
			return config;
		},

		refresh: function(track) {
			if(!track) track = this;
			var storeIsReloaded;
			if(this._visible().store && !this.onlyRefreshOuter) 
				storeIsReloaded = this._visible().store.reload(this._visible().tree, this.maskStore, this.displayStore);
			else storeIsReloaded = true;


			when(storeIsReloaded, dojo.hitch(this, function(reloadedStore) {
				if(this.range) {
					track.clear();
					track.showRange(this.range.f, this.range.l, this.range.st, this.range.b,
						this.range.sc, this.range.cs, this.range.ce);
				}
		  		this.makeTrackMenu();
			}));
		},

		showRange: function(first, last, startBase, bpPerBlock, scale,
												containerStart, containerEnd) {
			this.range = {f: first, l: last, st: startBase, 
										b: bpPerBlock, sc: scale, 
										cs: containerStart, ce: containerEnd};
			if(this.innerTrack && !this.onlyRefreshOuter) {
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
			this.inherited(arguments);
			this.height = (this.innerTrack ? (this.topHeight + this.heightInner + this.bottomHeight) : this.heightNoInner);
			this.heightUpdate(this.height);
			this.div.style.height = this.height + "px";
		},

		moveBlocks: function(delta) {
				this.inherited(arguments);
				if(this.innerTrack) this.innerTrack.moveBlocks(delta);
		},

		fillBlock: function( args ) {
				var blockIndex = args.blockIndex;
				var block = args.block;
				var leftBase = args.leftBase;

				var text = "Add tracks here";
				if(this.innerTrack) {
					var topDiv = dom.create("div");
					topDiv.className = "combination";
					topDiv.style.height = this.topHeight + "px";
					topDiv.appendChild( document.createTextNode( text ) );
					block.domNode.appendChild( topDiv );

					var bottomDiv = dom.create("div");
					bottomDiv.className = "combination";
					bottomDiv.style.height = this.bottomHeight + "px";
					bottomDiv.style.top = (this.topHeight + this.heightInner) + "px";
					bottomDiv.appendChild( document.createTextNode( text ) );
					block.domNode.appendChild( bottomDiv );
				} else {
					var textDiv = dom.create("div");
					textDiv.className = "combination";
					var text = "Add tracks here";
					textDiv.style.height = this.heightNoInner + "px";
					textDiv.appendChild( document.createTextNode( text ) );  
					block.domNode.appendChild( textDiv );
				}

				var highlight = this.browser.getHighlight();
				if( highlight && highlight.ref == this.refSeq.name )
						this.renderRegionHighlight( args, highlight );

				this.heightUpdate( this.height, blockIndex);
				this.div.style.height = this.height + "px";
				args.finishCallback();
		},

		endZoom: function(destScale, destBlockBases) {
				this.clear(); // Necessary?
				if(this.innerTrack) this.innerTrack.endZoom();
		},

		msgLoop: function(list) {
			var msg = "";
			for(var item in list) msg = msg + " " + item +": " + list[item];
			alert(msg);
		},

		updateStaticElements: function(args) {
		  this.inherited(arguments);
		  if(this.innerTrack) this.innerTrack.updateStaticElements(args);
		},

		setClassIndex: function(index, type) {
			if(!type) type = this._visible().which;
			if(type == "mask" && this.displayStore) type = this.supportedBy[this.displayStore.config.type];
			this.classIndex[type] = index;
		},

		getClassIndex: function(type) {
			if(type == "mask" && this.displayStore) type = this.supportedBy[this.displayStore.config.type];
			return this.classIndex[type];
		},

		_trackMenuOptions: function() {
			var o = this.inherited(arguments);
			var combTrack = this;

			if(!this.storeType) return o;

			if(this.storeType == "mask") {
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

			if(this.opTree) {
				o.push.apply(
					o, 
					  [{ label: 'View formula',
						title: 'View the formula specifying this combination track',
						action: function() {
									if(combTrack.opTree) alert(combTrack._generateTreeFormula(combTrack.opTree));
									else alert("No operation formula defined");
								}
					  	}]);
			}

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

		_generateTreeFormula: function(tree) {
			if(!tree || tree === undefined){ return "NULL";}
			if(tree.isLeaf()){
				return "\"" + (tree.get().name ? (this.storeToKey[tree.get().name] ? this.storeToKey[tree.get().name] : tree.get().name)
				 : tree.get()) + "\"";
			}
			return "( " + this._generateTreeFormula(tree.left()) +" "+ tree.get() +" " + this._generateTreeFormula(tree.right()) +" )";
		},
		
});
});