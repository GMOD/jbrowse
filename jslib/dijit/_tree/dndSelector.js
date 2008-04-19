if(!dojo._hasResource["dijit._tree.dndSelector"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._tree.dndSelector"] = true;
dojo.provide("dijit._tree.dndSelector");
dojo.require("dojo.dnd.common");
dojo.require("dijit._tree.dndContainer");

dojo.declare("dijit._tree.dndSelector",
	dijit._tree.dndContainer,
	{
		constructor: function(tree, params){
			this.selection={};
			this.anchor = null;
			this.simpleSelection=false;
		
			this.events.push(
				dojo.connect(this.tree.domNode, "onmousedown", this,"onMouseDown"),
				dojo.connect(this.tree.domNode, "onmouseup", this,"onMouseUp")
			);
		},
	
		// object attributes (for markup)
		singular: false,	// is singular property
	
		// methods
		getSelectedItems: function(){
			var selectedItems = []
			for (var i in this.selection){
				selectedItems.push(dijit.getEnclosingWidget(this.selection[i]).item);
			}
			return selectedItems;
		},

		getSelectedNodes: function(){
			return this.selection;
		},

		selectNone: function(){
			// summary: unselects all items
			return this._removeSelection()._removeAnchor();	// self
		},

		insertItems: function(item, parent){
			// summary: inserts new data items (see Container's insertNodes method for details)
			
			//we actually need to add things to the store here instead of adding noes to the tree directly		
		},

		destroy: function(){
			// summary: prepares the object to be garbage-collected
			dojo.dnd.Selector.superclass.destroy.call(this);
			this.selection = this.anchor = null;
		},

		// mouse events
		onMouseDown: function(e){
			// summary: event processor for onmousedown
			// e: Event: mouse event
			if(!this.current){ return; }

			var item = dijit.getEnclosingWidget(this.current).item
			var id = this.tree.model.getIdentity(item);

			if (!this.current.id) {
				this.current.id=id;
			}

			if (!this.current.type) {
				this.current.type="data";
			}

			if(!this.singular && !dojo.dnd.getCopyKeyState(e) && !e.shiftKey && (this.current.id in this.selection)){
				this.simpleSelection = true;
				dojo.stopEvent(e);
				return;
			}

			if(this.singular){
				if(this.anchor == this.current){
					if(dojo.dnd.getCopyKeyState(e)){
						this.selectNone();
					}
				}else{
					this.selectNone();
					this.anchor = this.current;
					this._addItemClass(this.anchor, "Anchor");

					this.selection[this.current.id] = this.current;
				}
			}else{
				if(!this.singular && e.shiftKey){	
					if (dojo.dnd.getCopyKeyState(e)){
						//TODO add range to selection
					}else{
						//TODO select new range from anchor 
					}
				}else{
					if(dojo.dnd.getCopyKeyState(e)){
						if(this.anchor == this.current){
							delete this.selection[this.anchor.id];
							this._removeAnchor();
						}else{
							if(this.current.id in this.selection){
								this._removeItemClass(this.current, "Selected");
								delete this.selection[this.current.id];
							}else{
								if(this.anchor){
									this._removeItemClass(this.anchor, "Anchor");
									this._addItemClass(this.anchor, "Selected");
								}
								this.anchor = this.current;
								this._addItemClass(this.current, "Anchor");
								this.selection[this.current.id] = this.current;
							}
						}
					}else{
						var item = dijit.getEnclosingWidget(this.current).item
						var id = this.tree.model.getIdentity(item);
						if(!(id in this.selection)){
							this.selectNone();
							this.anchor = this.current;
							this._addItemClass(this.current, "Anchor");
							this.selection[id] = this.current;
						}
					}
				}
			}

			dojo.stopEvent(e);
		},

		onMouseMove: function() {

		},

		onOverEvent: function() {
			this.onmousemoveEvent = dojo.connect(this.node, "onmousemove", this, "onMouseMove");
		},

		onMouseUp: function(e){
			// summary: event processor for onmouseup
			// e: Event: mouse event
			if(!this.simpleSelection){ return; }
			this.simpleSelection = false;
			this.selectNone();
			if(this.current){
				this.anchor = this.current;
				this._addItemClass(this.anchor, "Anchor");
				this.selection[this.current.id] = this.current;
			}
		},
		_removeSelection: function(){
			// summary: unselects all items
			var e = dojo.dnd._empty;
			for(var i in this.selection){
				if(i in e){ continue; }
				var node = dojo.byId(i);
				if(node){ this._removeItemClass(node, "Selected"); }
			}
			this.selection = {};
			return this;	// self
		},
		_removeAnchor: function(){
			if(this.anchor){
				this._removeItemClass(this.anchor, "Anchor");
				this.anchor = null;
			}
			return this;	// self
		}
});

}
