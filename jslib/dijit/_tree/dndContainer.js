if(!dojo._hasResource["dijit._tree.dndContainer"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._tree.dndContainer"] = true;
dojo.provide("dijit._tree.dndContainer");
dojo.require("dojo.dnd.common");
dojo.require("dojo.dnd.Container");

dojo.declare("dijit._tree.dndContainer",
	null, 
	{
		constructor: function(tree, params){
			// summary: a constructor of the Container
			// tree: Node: node or node's id to build the container on
			// params: Object: a dict of parameters, which gets mixed into the object
			this.tree = tree;
			this.node = tree.domNode;	// TODO: rename; it's not a TreeNode but the whole Tree
			dojo.mixin(this, params);
	
			// class-specific variables
			this.map = {};
			this.current = null;	// current TreeNode
	
			// states
			this.containerState = "";
			dojo.addClass(this.node, "dojoDndContainer");
			
			// mark up children
			if(!(params && params._skipStartup)){
				this.startup();
			}

			// set up events
			this.events = [
				dojo.connect(this.node, "onmouseover", this, "onMouseOver"),
				dojo.connect(this.node, "onmouseout",  this, "onMouseOut"),

				// cancel text selection and text dragging
				dojo.connect(this.node, "ondragstart",   dojo, "stopEvent"),
				dojo.connect(this.node, "onselectstart", dojo, "stopEvent")
			];
		},


		// abstract access to the map
		getItem: function(/*String*/ key){
			// summary: returns a data item by its key (id)
			//console.log("Container getItem()", arguments,this.map, this.map[key], this.selection[key]);
			return this.selection[key];
			//return this.map[key];	// Object
		},

		// mouse events
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
			if(n){ this._addItemClass(n, "Over"); }
			this.current = n;
		},

		onMouseOut: function(e){
			// summary: event processor for onmouseout
			// e: Event: mouse event
			for(var n = e.relatedTarget; n;){
				if(n == this.node){ return; }
				try{
					n = n.parentNode;
				}catch(x){
					n = null;
				}
			}
			if(this.current){
				this._removeItemClass(this.current, "Over");
				this.current = null;
			}
			this._changeState("Container", "");
			this.onOutEvent();
		},

		_changeState: function(type, newState){
			// summary: changes a named state to new state value
			// type: String: a name of the state to change
			// newState: String: new state
			var prefix = "dojoDnd" + type;
			var state  = type.toLowerCase() + "State";
			//dojo.replaceClass(this.node, prefix + newState, prefix + this[state]);
			dojo.removeClass(this.node, prefix + this[state]);
			dojo.addClass(this.node, prefix + newState);
			this[state] = newState;
		},

		_getChildByEvent: function(e){
			// summary: gets a child, which is under the mouse at the moment, or null
			// e: Event: a mouse event
			var node = e.target;
			if(node){
				for(var parent = node.parentNode; parent; node = parent, parent = node.parentNode){
					if(dojo.hasClass(node, "dijitTreeContent")){ return node; }
				}
			}
			return null;
		},

		markupFactory: function(tree, params){
			params._skipStartup = true;
			return new dijit._tree.dndContainer(tree, params);
		},

		_addItemClass: function(node, type){
			// summary: adds a class with prefix "dojoDndItem"
			// node: Node: a node
			// type: String: a variable suffix for a class name
			dojo.addClass(node, "dojoDndItem" + type);
		},

		_removeItemClass: function(node, type){
			// summary: removes a class with prefix "dojoDndItem"
			// node: Node: a node
			// type: String: a variable suffix for a class name
			dojo.removeClass(node, "dojoDndItem" + type);
		},

		onOverEvent: function(){
			// summary: this function is called once, when mouse is over our container
		},

		onOutEvent: function(){
			// summary: this function is called once, when mouse is out of our container
		}
});

}
