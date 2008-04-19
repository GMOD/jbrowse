if(!dojo._hasResource["dijit._tree.dndSource"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._tree.dndSource"] = true;
dojo.provide("dijit._tree.dndSource");

dojo.require("dijit._tree.dndSelector");
dojo.require("dojo.dnd.Manager");

dojo.declare("dijit._tree.dndSource", dijit._tree.dndSelector, {
	// summary: a Source object, which can be used as a DnD source, or a DnD target
	
	// object attributes (for markup)
	isSource: true,
	copyOnly: false,
	skipForm: false,
	accept: ["text"],
	
	constructor: function(tree, params){
		// summary: a constructor of the Source
		// tree: dijit.Tree: the tree widget to build the source on
		// params: Object: a dict of parameters, recognized parameters are:
		//	isSource: Boolean: can be used as a DnD source, if true; assumed to be "true" if omitted
		//	accept: Array: list of accepted types (text strings) for a target; assumed to be ["text"] if omitted
		//	horizontal: Boolean: a horizontal container, if true, vertical otherwise or when omitted
		//	copyOnly: Boolean: always copy items, if true, use a state of Ctrl key otherwise
		//	skipForm: Boolean: don't start the drag operation, if clicked on form elements
		//	the rest of parameters are passed to the selector
		if(!params){ params = {}; }
		dojo.mixin(this, params);
		this.isSource = typeof params.isSource == "undefined" ? true : params.isSource;
		var type = params.accept instanceof Array ? params.accept : ["text"];
		this.accept = null;
		if(type.length){
			this.accept = {};
			for(var i = 0; i < type.length; ++i){
				this.accept[type[i]] = 1;
			}
		}

		// class-specific variables
		this.isDragging = false;
		this.mouseDown = false;
		this.targetAnchor = null;
		this.targetBox = null;
		this.before = true;

		// states
		this.sourceState  = "";
		if(this.isSource){
			dojo.addClass(this.node, "dojoDndSource");
		}
		this.targetState  = "";
		if(this.accept){
			dojo.addClass(this.node, "dojoDndTarget");
		}
		if(this.horizontal){
			dojo.addClass(this.node, "dojoDndHorizontal");
		}
		// set up events
		this.topics = [
			dojo.subscribe("/dnd/source/over", this, "onDndSourceOver"),
			dojo.subscribe("/dnd/start",  this, "onDndStart"),
			dojo.subscribe("/dnd/drop",   this, "onDndDrop"),
			dojo.subscribe("/dnd/cancel", this, "onDndCancel")
		];
	},

	startup: function(){
	},
	
	// methods
	checkAcceptance: function(source, nodes){
		// summary: checks, if the target can accept nodes from this source
		// source: Object: the source which provides items
		// nodes: Array: the list of transferred items
		return true;	// Boolean
	},
	copyState: function(keyPressed){
		// summary: Returns true, if we need to copy items, false to move.
		//		It is separated to be overwritten dynamically, if needed.
		// keyPressed: Boolean: the "copy" was pressed
		return this.copyOnly || keyPressed;	// Boolean
	},
	destroy: function(){
		// summary: prepares the object to be garbage-collected
		this.inherited("destroy",arguments);
		dojo.forEach(this.topics, dojo.unsubscribe);
		this.targetAnchor = null;
	},

	// markup methods
	markupFactory: function(params, node){
		params._skipStartup = true;
		return new dijit._tree.dndSource(node, params);
	},

	// mouse event processors
	onMouseMove: function(e){
		// summary: event processor for onmousemove
		// e: Event: mouse event
		if(this.isDragging && this.targetState == "Disabled"){ return; }
		this.inherited("onMouseMove", arguments);
		var m = dojo.dnd.manager();
		if(this.isDragging){
			// calculate before/after

			if (this.allowBetween){ // not implemented yet for tree since it has no concept of order
				var before = false;
				if(this.current){
					if(!this.targetBox || this.targetAnchor != this.current){
						this.targetBox = {
							xy: dojo.coords(this.current, true),
							w: this.current.offsetWidth,
							h: this.current.offsetHeight
						};
					}
					if(this.horizontal){
						before = (e.pageX - this.targetBox.xy.x) < (this.targetBox.w / 2);
					}else{
						before = (e.pageY - this.targetBox.xy.y) < (this.targetBox.h / 2);
					}
				}
				if(this.current != this.targetAnchor || before != this.before){
					this._markTargetAnchor(before);
					m.canDrop(!this.current || m.source != this || !(this.current.id in this.selection));
				}
			}
		}else{
			if(this.mouseDown && this.isSource){
				var n = this.getSelectedNodes();
				var nodes=[];
				for (var i in n){
					nodes.push(n[i]);
				}
				if(nodes.length){
					m.startDrag(this, nodes, this.copyState(dojo.dnd.getCopyKeyState(e)));
				}
			}
		}
	},

	onMouseDown: function(e){
		// summary: event processor for onmousedown
		// e: Event: mouse event
		this.mouseDown = true;
		this.mouseButton = e.button;
		this.inherited("onMouseDown",arguments);
	},

	onMouseUp: function(e){
		// summary: event processor for onmouseup
		// e: Event: mouse event
		if(this.mouseDown){
			this.mouseDown = false;
			this.inherited("onMouseUp",arguments);
		}
	},

	onMouseOver: function(e){
		// summary: event processor for onmouseover
		// e: Event: mouse event

		// handle when mouse has just moved over the Tree itself (not a TreeNode, but the Tree)
		var rt = e.relatedTarget;	// the previous location
		while(rt){
			if(rt == this.node){ break; }
			try{
				rt = rt.parentNode;
			}catch(x){
				rt = null;
			}
		}
		if(!rt){
			this._changeState("Container", "Over");
			this.onOverEvent();
		}

		// code below is for handling depending on which TreeNode we are over
		var n = this._getChildByEvent(e);	// the TreeNode
		if(this.current == n){ return; }
		if(this.current){ this._removeItemClass(this.current, "Over"); }
		var m = dojo.dnd.manager();
		if(n){ 
			this._addItemClass(n, "Over"); 
			if(this.isDragging){
				if(this.checkItemAcceptance(n,m.source)){
					m.canDrop(this.targetState != "Disabled" && (!this.current || m.source != this || !(n in this.selection)));
				}else{
					m.canDrop(false);
				}
			}
		}else{
			if(this.isDragging){
				if (m.source && this.checkAcceptance(m.source,m.source.getSelectedNodes())){
					m.canDrop(this.targetState != "Disabled" && (!this.current || m.source != this || !(this.current.id in this.selection)));
				}else{
					m.canDrop(false);
				}
			}
		}
		this.current = n;
	},

	checkItemAcceptance: function(node, source){
		// summary: stub funciton to be overridden if one wants to check for the ability to drop at the node/item level 
		return true;	
	},
	
	// topic event processors
	onDndSourceOver: function(source){
		// summary: topic event processor for /dnd/source/over, called when detected a current source
		// source: Object: the source which has the mouse over it
		if(this != source){
			this.mouseDown = false;
			if(this.targetAnchor){
				this._unmarkTargetAnchor();
			}
		}else if(this.isDragging){
			var m = dojo.dnd.manager();
			m.canDrop(this.targetState != "Disabled" && (!this.current || m.source != this || !(this.current.id in this.selection)));
		}
	},
	onDndStart: function(source, nodes, copy){
		// summary: topic event processor for /dnd/start, called to initiate the DnD operation
		// source: Object: the source which provides items
		// nodes: Array: the list of transferred items
		// copy: Boolean: copy items, if true, move items otherwise

		if(this.isSource){
			this._changeState("Source", this == source ? (copy ? "Copied" : "Moved") : "");
		}
		var accepted = this.checkAcceptance(source, nodes);

		this._changeState("Target", accepted ? "" : "Disabled");

		if(accepted){
			dojo.dnd.manager().overSource(this);
		}

		this.isDragging = true;
	},

	itemCreator: function(nodes){
		return dojo.map(nodes, function(node){
			return {
				"id": node.id,
				"name": node.textContent || node.innerText || ""
			};
		});
	},

	onDndDrop: function(source, nodes, copy){
		// summary:
		//		Topic event processor for /dnd/drop, called to finish the DnD operation..
		//		Updates data store items according to where node was dragged from and dropped
		//		to.   The tree will then respond to those data store updates and redraw itself.
		// source: Object: the source which provides items
		// nodes: Array: the list of transferred items
		// copy: Boolean: copy items, if true, move items otherwise

		if(this.containerState == "Over"){
			var tree = this.tree,
				model = tree.model,
				target = this.current,
				requeryRoot = false;	// set to true iff top level items change

			this.isDragging = false;

			// Compute the new parent item
			var targetWidget = dijit.getEnclosingWidget(target),
				newParentItem = (targetWidget && targetWidget.item) || tree.item;

			// If we are dragging from another source (or at least, another source
			// that points to a different data store), then we need to make new data
			// store items for each element in nodes[].  This call get the parameters
			// to pass to store.newItem()
			var newItemsParams;
			if(source != this){
				newItemsParams = this.itemCreator(nodes, target);
			}

			dojo.forEach(nodes, function(node, idx){
				if(source == this){
					// This is a node from my own tree, and we are moving it, not copying.
					// Remove item from old parent's children attribute.
					// TODO: dijit._tree.dndSelector should implement deleteSelectedNodes()
					// and this code should go there.
					var childTreeNode = dijit.getEnclosingWidget(node),
						childItem = childTreeNode.item,
						oldParentItem = childTreeNode.getParent().item;

					model.pasteItem(childItem, oldParentItem, newParentItem, copy);
				}else{
					model.newItem(newItemsParams[idx], newParentItem);
				}
			}, this);

			// Expand the target node (if it's currently collapsed) so the user can see
			// where their node was dropped.   In particular since that node is still selected.
			this.tree._expandNode(targetWidget);
		}
		this.onDndCancel();
	},
	onDndCancel: function(){
		// summary: topic event processor for /dnd/cancel, called to cancel the DnD operation
		if(this.targetAnchor){
			this._unmarkTargetAnchor();
			this.targetAnchor = null;
		}
		this.before = true;
		this.isDragging = false;
		this.mouseDown = false;
		delete this.mouseButton;
		this._changeState("Source", "");
		this._changeState("Target", "");
	},
	
	// utilities

	onOverEvent: function(){
		// summary: this function is called once, when mouse is over our container
		this.inherited("onOverEvent",arguments);
		dojo.dnd.manager().overSource(this);
	},
	onOutEvent: function(){
		// summary: this function is called once, when mouse is out of our container
		this.inherited("onOutEvent",arguments);	
		dojo.dnd.manager().outSource(this);
	},
	_markTargetAnchor: function(before){
		// summary: assigns a class to the current target anchor based on "before" status
		// before: Boolean: insert before, if true, after otherwise
		if(this.current == this.targetAnchor && this.before == before){ return; }
		if(this.targetAnchor){
			this._removeItemClass(this.targetAnchor, this.before ? "Before" : "After");
		}
		this.targetAnchor = this.current;
		this.targetBox = null;
		this.before = before;
		if(this.targetAnchor){
			this._addItemClass(this.targetAnchor, this.before ? "Before" : "After");
		}
	},
	_unmarkTargetAnchor: function(){
		// summary: removes a class of the current target anchor based on "before" status
		if(!this.targetAnchor){ return; }
		this._removeItemClass(this.targetAnchor, this.before ? "Before" : "After");
		this.targetAnchor = null;
		this.targetBox = null;
		this.before = true;
	},
	_markDndStatus: function(copy){
		// summary: changes source's state based on "copy" status
		this._changeState("Source", copy ? "Copied" : "Moved");
	}
});

dojo.declare("dijit._tree.dndTarget", dijit._tree.dndSource, {
	// summary: a Target object, which can be used as a DnD target
	
	constructor: function(node, params){
		// summary: a constructor of the Target --- see the Source constructor for details
		this.isSource = false;
		dojo.removeClass(this.node, "dojoDndSource");
	},

	// markup methods
	markupFactory: function(params, node){
		params._skipStartup = true;
		return new dijit._tree.dndTarget(node, params);
	}
});

}
