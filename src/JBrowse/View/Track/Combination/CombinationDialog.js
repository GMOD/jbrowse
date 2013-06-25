define([
		'dojo/_base/declare',
 		 'dijit/Dialog',
 		 'dijit/form/RadioButton',
 		 'dijit/form/Button',
 		 'dojo/dom-construct',
 		 'JBrowse/Store/SeqFeature/Combination/TreeNode'
	], 
	function(declare, Dialog, RadioButton, Button, dom, TreeNode) { 
		return declare(null, {

			constructor: function( args ) {

				this.newTrackKey = args.trackConfig ? args.trackConfig.key : args.key;
				this.track = args.track;
				this.newStore = args.store;
				this.opTree = this.track.opTree;


				this.currType = this.track.currType;
				this.oldType = this.track.oldType;
				this.supportedBy = this.track.supportedBy;
				this.displayType = this.track.displayStore ? this.supportedBy[this.track.displayStore.config.type] : undefined;

				this.newDisplayType = this.displayType;


				this.inWords = this.track.inWords;

				this.trackClasses = this.track.trackClasses;


				this.dialog = new Dialog({title: "Adding track \"" + this.newTrackKey + "\"", style: {width: "400px"}});
				var content = this._dialogContent(this.newStore);
				this.dialog.set('content', content);
			},


			_dialogContent: function(store) {
				var nodesToAdd = [];

				var opList = this._allAllowedOperations(store);
				if(!opList.length) {
					nodesToAdd.push(
						dom.create("div", {innerHTML: "No operations are possible for this track."})
					);
					var actionBar = this._createActionBar(false);
					nodesToAdd.push(actionBar);
					return nodesToAdd;
				}

				nodesToAdd.push(
					dom.create("div", {innerHTML: "You are currently adding the track \"" + this.newTrackKey + "\", which is a " + this.currType + " track.  "
						+ "  Please select how you would like this track to be combined."})
				);

				var maskOpListDiv = dom.create("div", {id: this.track.name + "_maskOpList"});
				
				var thisB = this;

				this.whichOpArg = "";

				var unique = {};

				var maskOps = opList.map(function(item) { return item.substring(0, 4)}).filter(function(value) {
					if(!unique[value]) {
						unique[value] = true;
						return true;
					}
					return false;
				});

				nodesToAdd.push(maskOpListDiv);
				this.whichOpSpan = dom.create("span", {innerHTML: "<br />Which operation?", style: {display: "none"}});
				nodesToAdd.push(this.whichOpSpan);
				this.opListDiv = dom.create("div", {id: this.track.name + "_OpList"});
				nodesToAdd.push(this.opListDiv);

				this.leftRightSpan = dom.create("span", {innerHTML: "<br />Left or right?", style: {display: "none"}});  // Not the prettiest way to render line breaks.
				nodesToAdd.push(this.leftRightSpan);
				this.whichArgDiv = dom.create("div", {id: this.track.name + "_whichArg"});
				nodesToAdd.push(this.whichArgDiv);

				nodesToAdd.push(dom.create("span", {innerHTML: "<br />Combination Formula Preview"}));

				this.formulaPreview = dom.create("div", {innerHTML: "(nothing currently selected)", className: "formulaPreview"});
				nodesToAdd.push(this.formulaPreview);

				this.maskOpButtons = [];

				if(maskOps.length > 0) {
					for(var i in maskOps) {
						var opButton = this._renderRadioButton(maskOpListDiv, maskOps[i], this.inWords[maskOps[i]]);
						this.maskOpButtons.push(opButton);

						opButton.on("change", function(isSelected) {
							if(isSelected) {
								delete thisB.whichOpArg;
								thisB.maskOpValue = this.value;
								thisB._generateSuffixRadioButtons(this.value, opList, store);
								thisB._maybeRenderWhichArgDiv(this.value, store);
								if(thisB.leftRightButtons.length && !thisB.whichOpArg) {
									thisB.leftRightButtons[0].set('checked', 'checked');
								}
								if(thisB.opButtons.length) {
									thisB.opButtons[0].set('checked', 'checked');
								}
								thisB.whichOpSpan.style.display = thisB.opButtons.length ? "" : "none";
								thisB.leftRightSpan.style.display = thisB.leftRightButtons.length ? "" : "none";
							}
						});
					}
					if(maskOps[0]) this.maskOpButtons[0].set('checked', 'checked');
				} else if(maskOps.length == 1) {
					this.maskOpValue = maskOps[0];
					this._generateSuffixRadioButtons(maskOps[0], opList, store);
				}

				var actionBar = this._createActionBar();

				nodesToAdd.push(actionBar);

				return nodesToAdd;
			},

			_createActionBar: function (addingEnabled) {
				if(addingEnabled === undefined) addingEnabled = true;
				var actionBar = dom.create("div", { className: "dijitDialogPaneActionBar"});
				new Button({
					iconClass: 'dijitIconDelete',
					label: "Cancel",
					onClick: dojo.hitch(this, function() {
						this.shouldCombine = false;
						this.dialog.hide();
					})
				}).placeAt(actionBar);

				var btnCombine = new Button({
					label: "Combine tracks",
					onClick: dojo.hitch(this, function() {
						this.shouldCombine = true;
						this.dialog.hide();					
					})
				});

				btnCombine.placeAt(actionBar);

				if(!addingEnabled) btnCombine.set("disabled", "disabled");
				return actionBar;
			},

			_maybeRenderWhichArgDiv: function(prefix, store) {
				for(var i in this.leftRightButtons) {
					if(dijit.byId(this.leftRightButtons[i].id)) {
						dijit.byId(this.leftRightButtons[i].id).destroy();
					}
				}
				while(this.whichArgDiv.firstChild) {
					dom.destroy(this.whichArgDiv.firstChild);
				}
				this.leftRightButtons = [];
				var thisB = this;

				var whichArgChange = function(isSelected, value) {
					if(isSelected) {
						thisB.whichOpArg = value === undefined ? this.value : value;
						var operation = thisB.maskOpValue + thisB.opValue + thisB.whichOpArg;
						thisB.previewTree = thisB._createPreviewTree(operation, store);
						thisB.formulaPreview.innerHTML = thisB._generateTreeFormula(thisB.previewTree);
					}
				}

				switch(prefix) {
					case "0020":
						whichArgChange(true, "L");
						break;
					case "0002":
						whichArgChange(true, "R");
						break;
					default:
						var rbLeft = this._renderRadioButton(this.whichArgDiv, "L", "left");
						var rbRight = this._renderRadioButton(this.whichArgDiv, "R", "right");
						this.leftRightButtons.push(rbLeft);
						this.leftRightButtons.push(rbRight);
						rbLeft.on("change", whichArgChange);
						rbRight.on("change", whichArgChange);
				}
			},

			_generateSuffixRadioButtons: function(prefix, stringlist, store) {
				for(var i in this.opButtons) {
					if(dijit.byId(this.opButtons[i].id)) {
						dijit.byId(this.opButtons[i].id).destroy();
					}
				}
				while(this.opListDiv.firstChild) {
					dom.destroy(this.opListDiv.firstChild);
				}
				this.opButtons = [];

				var thisB = this;
				var allowedOps = this._generateSuffixList(prefix, stringlist);
				for(var i in allowedOps) {
					var opButton = this._renderRadioButton(this.opListDiv, allowedOps[i], this.inWords[allowedOps[i]]);
					this.opButtons.push(opButton);
					opButton.on("change", function(isSelected) {
						if(isSelected) {
							thisB.opValue = this.value;
							var operation = thisB.maskOpValue + thisB.opValue + thisB.whichOpArg;
							thisB.previewTree = thisB._createPreviewTree(operation, store)
							thisB.formulaPreview.innerHTML = thisB._generateTreeFormula(thisB.previewTree);
						}
					});
				}
			},

			//Type checking necessary?
			_generateSuffixList: function(prefix, stringlist) {
				return stringlist.filter(function(value) {
					return value.indexOf(prefix) != -1;
				}).map(function(item) { return item.substring(prefix.length, prefix.length + 1); });
			},

			_createPreviewTree: function (opString, store ) {
				// Recursive cloning would probably be safer, but this seems to be working okay
				var newOpTree = store.opTree ? new TreeNode(store.opTree) : new TreeNode({Value: store});
				var superior = new TreeNode(this.opTree);
				var firstChars = opString.substring(0, 2);
				var inferior = newOpTree;
				if(firstChars == "01") {
					superior = newOpTree;
					inferior = this.opTree;
				}
				return this._applyTreeTransform(opString.substring(2), superior, inferior);
			},

			_applyTreeTransform: function (opString, superior, inferior) {
				var retTree = superior;
				var firstChars = opString.substring(0, 2);
				var childToUse;
				var opTree1 = superior;
				var opTree2 = inferior;
				switch(firstChars) {
					case "10":
						opTree1 = superior.leftChild;
						childToUse = "leftChild";
						opTree2 = inferior;
						break;
					case "01":
						opTree1 = superior.rightChild;
						childToUse = "rightChild";
						opTree2 = inferior;
						break;
					case "11":
						retTree["leftChild"] = this._transformTree(opString.substring(2), superior.leftChild, inferior.leftChild);
						childToUse = "rightChild";
						opTree1 = superior.rightChild;
						opTree2 = inferior.rightChild;
						break;
					case "20":
						this.newDisplayType = this.oldType;
						break;
					case "02":
						this.newDisplayType = this.currType;
						break;
				}

				var opNode= this._transformTree(opString.substring(2), opTree1, opTree2);
				if(childToUse == undefined) return opNode;

				retTree[childToUse] = opNode;
				return retTree;
			},

			_transformTree: function(opString, opTree1, opTree2) {

				var op = opString.substring (0, 1);
				var opNode = new TreeNode({Value: op});
				if(opString.substring(1,2) == "L") {
					opNode.add(opTree2);
					opNode.add(opTree1);
				} else {
					opNode.add(opTree1);
					opNode.add(opTree2);
				}

				return opNode;
			},

			// This mess constructs a complete list of all operations that can be performed
			_allAllowedOperations: function(store) {
				var allowedList = [];
				var candidate = "";
				var allowedOps;
				candidate = candidate + (this.oldType == "mask" ? "1" : "0");
				candidate = candidate + (this.currType == "mask" ? "1" : "0");
				if (candidate == "00") {
					if(this.oldType == this.currType) {
						var candidate2 = candidate + "00";
						allowedOps = this.trackClasses[this.currType].allowedOps;
						for(var i in allowedOps) {
							allowedList.push(candidate2 + allowedOps[i]);
						}
					}
					allowedOps = this.trackClasses["mask"].allowedOps;
					if(this.currType == "set") {
						var candidate2 = candidate + "20";
						for(var i in allowedOps) allowedList.push(candidate2 + allowedOps[i]);
					}
					if(this.oldType == "set") {
						var candidate2 = candidate + "02";
						for(var i in allowedOps) allowedList.push(candidate2 + allowedOps[i]);
					}
				} else if (candidate == "10") {
					if(this.currType == "set") {
						allowedOps = this.trackClasses[this.currType].allowedOps;
						var candidate2 = candidate + "10";
						for(var i in allowedOps) {
							allowedList.push(candidate2 + allowedOps[i]);
						}
					}
					if(this.currType == this.displayType) {
						var candidate2 = candidate + "01";
						allowedOps = this.trackClasses[this.currType].allowedOps;
						for(var i in allowedOps) {
							allowedList.push(candidate2 + allowedOps[i]);
						}
					}
				} else if (candidate == "01") {
					if(this.oldType == "set") {
						allowedOps = this.trackClasses[this.oldType].allowedOps;
						var candidate2 = candidate + "10";
						for(var i in allowedOps) {
							allowedList.push(candidate2 + allowedOps[i]);
						}
					}
					var displayType = this.supportedBy[store.stores.display.config.type];
					if(this.oldType == displayType) {
						candidate = candidate + "01";
						var allowedOps = this.trackClasses[displayType].allowedOps;
						for(var i in allowedOps) {
							allowedList.push(candidate + allowedOps[i]);
						}
					}
				} else if (candidate == "11") { // Fix the logic of the tree manipulation to work with out the last L's and R's
					candidate = candidate + "11";
					allowedOps = this.trackClasses["set"].allowedOps;
					for(var i in allowedOps) {
						var displayType = this.supportedBy[store.stores.display.config.type];
						var oldType = this.displayType;
						if(displayType == oldType) {
							var allowedOps2 = this.trackClasses[displayType].allowedOps; 
							for(var j in allowedOps2) {
								//allowedList.push(candidate + allowedOps[i] + allowedOps2[j]);
							}
						}
					}
				}

				return allowedList;
			},

			_renderRadioButton: function(parent, value, label) {
				label = label || value;	
				var radioButton = new RadioButton({name: parent.id + "_rb", id: parent.id + "_rb_" + value,  value: value});
				parent.appendChild(radioButton.domNode);
				var radioButtonLabel = dom.create("label", {"for": radioButton.id, innerHTML: label}, parent);
				parent.appendChild(dom.create("br"));
				return radioButton;
			},

			run: function( callback, cancelCallback, errorCallback) {
				this.dialog.show();
				var thisB = this;
				this.dialog.on("Hide", function() {
					if(thisB.shouldCombine) callback(thisB.previewTree, thisB.newStore, thisB.newDisplayType);
					else cancelCallback();
				});
			},

			_generateTreeFormula: function(tree) {
				if(!tree || tree === undefined){ return "NULL";}
				if(tree.isLeaf()){
					return "\"" + (tree.get().name ? (this.track.storeToKey[tree.get().name] ? this.track.storeToKey[tree.get().name] : tree.get().name)
					 : tree.get()) + "\"";
				}
				return "( " + this._generateTreeFormula(tree.left()) +" "+ tree.get() +" " + this._generateTreeFormula(tree.right()) +" )";
			},

			destroyRecursive: function() {
				this.dialog.destroyRecursive();
			}

		}); 

	});