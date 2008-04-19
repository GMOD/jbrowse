if(!dojo._hasResource["dijit.Menu"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.Menu"] = true;
dojo.provide("dijit.Menu");

dojo.require("dijit._Widget");
dojo.require("dijit._Container");
dojo.require("dijit._Templated");

dojo.declare("dijit.Menu",
	[dijit._Widget, dijit._Templated, dijit._KeyNavContainer],
	{
	// summary
	//	A context menu you can assign to multiple elements

	constructor: function(){
		this._bindings = [];
	},

	templateString:
			'<table class="dijit dijitMenu dijitReset dijitMenuTable" waiRole="menu" dojoAttachEvent="onkeypress:_onKeyPress">' +
				'<tbody class="dijitReset" dojoAttachPoint="containerNode"></tbody>'+
			'</table>',

	// targetNodeIds: String[]
	//	Array of dom node ids of nodes to attach to.
	//	Fill this with nodeIds upon widget creation and it becomes context menu for those nodes.
	targetNodeIds: [],

	// contextMenuForWindow: Boolean
	//	if true, right clicking anywhere on the window will cause this context menu to open;
	//	if false, must specify targetNodeIds
	contextMenuForWindow: false,

	// leftClickToOpen: Boolean
	//	If true, menu will open on left click instead of right click, similiar to a file menu.
	leftClickToOpen: false,
	
	// parentMenu: Widget
	// pointer to menu that displayed me
	parentMenu: null,

	// popupDelay: Integer
	//	number of milliseconds before hovering (without clicking) causes the popup to automatically open
	popupDelay: 500,

	// _contextMenuWithMouse: Boolean
	//	used to record mouse and keyboard events to determine if a context
	//	menu is being opened with the keyboard or the mouse
	_contextMenuWithMouse: false,

	postCreate: function(){
		if(this.contextMenuForWindow){
			this.bindDomNode(dojo.body());
		}else{
			dojo.forEach(this.targetNodeIds, this.bindDomNode, this);
		}
		this.connectKeyNavHandlers([dojo.keys.UP_ARROW], [dojo.keys.DOWN_ARROW]);
	},

	startup: function(){
		if(this._started){ return; }

		dojo.forEach(this.getChildren(), function(child){ child.startup(); });
		this.startupKeyNavChildren();

		this.inherited(arguments);
	},

	onExecute: function(){
		// summary: attach point for notification about when a menu item has been executed
	},

	onCancel: function(/*Boolean*/ closeAll){
		// summary: attach point for notification about when the user cancels the current menu
	},

	_moveToPopup: function(/*Event*/ evt){
		if(this.focusedChild && this.focusedChild.popup && !this.focusedChild.disabled){
			this.focusedChild._onClick(evt);
		}
	},

	_onKeyPress: function(/*Event*/ evt){
		// summary: Handle keyboard based menu navigation.
		if(evt.ctrlKey || evt.altKey){ return; }

		switch(evt.keyCode){
			case dojo.keys.RIGHT_ARROW:
				this._moveToPopup(evt);
				dojo.stopEvent(evt);
				break;
			case dojo.keys.LEFT_ARROW:
				if(this.parentMenu){
					this.onCancel(false);
				}else{
					dojo.stopEvent(evt);
				}
				break;
		}
	},

	onItemHover: function(/*MenuItem*/ item){
		// summary: Called when cursor is over a MenuItem
		this.focusChild(item);

		if(this.focusedChild.popup && !this.focusedChild.disabled && !this.hover_timer){
			this.hover_timer = setTimeout(dojo.hitch(this, "_openPopup"), this.popupDelay);
		}
	},

	_onChildBlur: function(item){
		// summary: Close all popups that are open and descendants of this menu
		dijit.popup.close(item.popup);
		item._blur();
		this._stopPopupTimer();
	},

	onItemUnhover: function(/*MenuItem*/ item){
		// summary: Callback fires when mouse exits a MenuItem
	},

	_stopPopupTimer: function(){
		if(this.hover_timer){
			clearTimeout(this.hover_timer);
			this.hover_timer = null;
		}
	},

	_getTopMenu: function(){
		for(var top=this; top.parentMenu; top=top.parentMenu);
		return top;
	},

	onItemClick: function(/*Widget*/ item, /*Event*/ evt){
		// summary: user defined function to handle clicks on an item
		if(item.disabled){ return false; }

		if(item.popup){
			if(!this.is_open){
				this._openPopup();
			}
		}else{
			// before calling user defined handler, close hierarchy of menus
			// and restore focus to place it was when menu was opened
			this.onExecute();

			// user defined handler for click
			item.onClick(evt);
		}
	},

	// thanks burstlib!
	_iframeContentWindow: function(/* HTMLIFrameElement */iframe_el){
		// summary:
		//	Returns the window reference of the passed iframe
		var win = dijit.getDocumentWindow(dijit.Menu._iframeContentDocument(iframe_el)) ||
			// Moz. TODO: is this available when defaultView isn't?
			dijit.Menu._iframeContentDocument(iframe_el)['__parent__'] ||
			(iframe_el.name && dojo.doc.frames[iframe_el.name]) || null;
		return win;	//	Window
	},

	_iframeContentDocument: function(/* HTMLIFrameElement */iframe_el){
		// summary:
		//	Returns a reference to the document object inside iframe_el
		var doc = iframe_el.contentDocument // W3
			|| (iframe_el.contentWindow && iframe_el.contentWindow.document) // IE
			|| (iframe_el.name && dojo.doc.frames[iframe_el.name] && dojo.doc.frames[iframe_el.name].document)
			|| null;
		return doc;	//	HTMLDocument
	},

	bindDomNode: function(/*String|DomNode*/ node){
		// summary: attach menu to given node
		node = dojo.byId(node);

		//TODO: this is to support context popups in Editor.  Maybe this shouldn't be in dijit.Menu
		var win = dijit.getDocumentWindow(node.ownerDocument);
		if(node.tagName.toLowerCase()=="iframe"){
			win = this._iframeContentWindow(node);
			node = dojo.withGlobal(win, dojo.body);
		}

		// to capture these events at the top level,
		// attach to document, not body
		var cn = (node == dojo.body() ? dojo.doc : node);

		node[this.id] = this._bindings.push([
			dojo.connect(cn, (this.leftClickToOpen)?"onclick":"oncontextmenu", this, "_openMyself"),
			dojo.connect(cn, "onkeydown", this, "_contextKey"),
			dojo.connect(cn, "onmousedown", this, "_contextMouse")
		]);
	},

	unBindDomNode: function(/*String|DomNode*/ nodeName){
		// summary: detach menu from given node
		var node = dojo.byId(nodeName);
		if(node){
			var bid = node[this.id]-1, b = this._bindings[bid];
			dojo.forEach(b, dojo.disconnect);
			delete this._bindings[bid];
		}
	},

	_contextKey: function(e){
		this._contextMenuWithMouse = false;
		if(e.keyCode == dojo.keys.F10){
			dojo.stopEvent(e);
			if(e.shiftKey && e.type=="keydown"){
				// FF: copying the wrong property from e will cause the system
				// context menu to appear in spite of stopEvent. Don't know
				// exactly which properties cause this effect.
				var _e = { target: e.target, pageX: e.pageX, pageY: e.pageY };
				_e.preventDefault = _e.stopPropagation = function(){};
				// IE: without the delay, focus work in "open" causes the system
				// context menu to appear in spite of stopEvent.
				window.setTimeout(dojo.hitch(this, function(){ this._openMyself(_e); }), 1);
			}
		}
	},

	_contextMouse: function(e){
		this._contextMenuWithMouse = true;
	},

	_openMyself: function(/*Event*/ e){
		// summary:
		//		Internal function for opening myself when the user
		//		does a right-click or something similar

		if(this.leftClickToOpen&&e.button>0){
			return;
		}
		dojo.stopEvent(e);

		// Get coordinates.
		// if we are opening the menu with the mouse or on safari open
		// the menu at the mouse cursor
		// (Safari does not have a keyboard command to open the context menu
		// and we don't currently have a reliable way to determine
		// _contextMenuWithMouse on Safari)
		var x,y;
		if(dojo.isSafari || this._contextMenuWithMouse){
			x=e.pageX;
			y=e.pageY;
		}else{
			// otherwise open near e.target
			var coords = dojo.coords(e.target, true);
			x = coords.x + 10;
			y = coords.y + 10;
		}

		var self=this;
		var savedFocus = dijit.getFocus(this);
		function closeAndRestoreFocus(){
			// user has clicked on a menu or popup
			dijit.focus(savedFocus);
			dijit.popup.close(self);
		}
		dijit.popup.open({
			popup: this,
			x: x,
			y: y,
			onExecute: closeAndRestoreFocus,
			onCancel: closeAndRestoreFocus,
			orient: this.isLeftToRight() ? 'L' : 'R'
		});
		this.focus();

		this._onBlur = function(){
			this.inherited('_onBlur', arguments);
			// Usually the parent closes the child widget but if this is a context
			// menu then there is no parent
			dijit.popup.close(this);
			// don't try to restore focus; user has clicked another part of the screen
			// and set focus there
		}
	},

	onOpen: function(/*Event*/ e){
		// summary: Open menu relative to the mouse
		this.isShowingNow = true;
	},

	onClose: function(){
		// summary: callback when this menu is closed
		this._stopPopupTimer();
		this.parentMenu = null;
		this.isShowingNow = false;
		this.currentPopup = null;
		if(this.focusedChild){
			this._onChildBlur(this.focusedChild);
			this.focusedChild = null;
		}
	},

	_openPopup: function(){
		// summary: open the popup to the side of the current menu item
		this._stopPopupTimer();
		var from_item = this.focusedChild;
		var popup = from_item.popup;

		if(popup.isShowingNow){ return; }
		popup.parentMenu = this;
		var self = this;
		dijit.popup.open({
			parent: this,
			popup: popup,
			around: from_item.arrowCell,
			orient: this.isLeftToRight() ? {'TR': 'TL', 'TL': 'TR'} : {'TL': 'TR', 'TR': 'TL'},
			onCancel: function(){
				// called when the child menu is canceled
				dijit.popup.close(popup);
				from_item.focus();	// put focus back on my node
				self.currentPopup = null;
			}
		});

		this.currentPopup = popup;

		if(popup.focus){
			popup.focus();
		}
	},
	
	uninitialize: function(){
 		dojo.forEach(this.targetNodeIds, this.unBindDomNode, this);
 		this.inherited(arguments);
	}
}
);

dojo.declare("dijit.MenuItem",
	[dijit._Widget, dijit._Templated, dijit._Contained],
	{
	// summary: A line item in a Menu Widget

	// Make 3 columns
	//   icon, label, and expand arrow (BiDi-dependent) indicating sub-menu
	templateString:
		 '<tr class="dijitReset dijitMenuItem" '
		+'dojoAttachEvent="onmouseenter:_onHover,onmouseleave:_onUnhover,ondijitclick:_onClick">'
		+'<td class="dijitReset"><div class="dijitMenuItemIcon ${iconClass}" dojoAttachPoint="iconNode"></div></td>'
		+'<td tabIndex="-1" class="dijitReset dijitMenuItemLabel" dojoAttachPoint="containerNode,focusNode" waiRole="menuitem"></td>'
		+'<td class="dijitReset" dojoAttachPoint="arrowCell">'
			+'<div class="dijitMenuExpand" dojoAttachPoint="expand" style="display:none">'
			+'<span class="dijitInline dijitArrowNode dijitMenuExpandInner">+</span>'
			+'</div>'
		+'</td>'
		+'</tr>',

	// label: String
	//	menu text
	label: '',

	// iconClass: String
	//	class to apply to div in button to make it display an icon
	iconClass: "",

	// disabled: Boolean
	//  if true, the menu item is disabled
	//  if false, the menu item is enabled
	disabled: false,

	postCreate: function(){
		dojo.setSelectable(this.domNode, false);
		this.setDisabled(this.disabled);
		if(this.label){
			this.setLabel(this.label);
		}
	},

	_onHover: function(){
		// summary: callback when mouse is moved onto menu item
		this.getParent().onItemHover(this);
	},

	_onUnhover: function(){
		// summary: callback when mouse is moved off of menu item

		// if we are unhovering the currently selected item
		// then unselect it
		this.getParent().onItemUnhover(this);
	},

	_onClick: function(evt){
		this.getParent().onItemClick(this, evt);
		dojo.stopEvent(evt);
	},

	onClick: function(/*Event*/ evt){
		// summary: User defined function to handle clicks
	},

	focus: function(){
		dojo.addClass(this.domNode, 'dijitMenuItemHover');
		try{
			dijit.focus(this.containerNode);
		}catch(e){
			// this throws on IE (at least) in some scenarios
		}
	},

	_blur: function(){
		dojo.removeClass(this.domNode, 'dijitMenuItemHover');
	},
	
	setLabel: function(/*String*/ value){
		this.containerNode.innerHTML=this.label=value;
	},

	setDisabled: function(/*Boolean*/ value){
		// summary: enable or disable this menu item
		this.disabled = value;
		dojo[value ? "addClass" : "removeClass"](this.domNode, 'dijitMenuItemDisabled');
		dijit.setWaiState(this.containerNode, 'disabled', value ? 'true' : 'false');
	}
});

dojo.declare("dijit.PopupMenuItem",
	dijit.MenuItem,
	{
	_fillContent: function(){
		// summary: The innerHTML contains both the menu item text and a popup widget
		// description: the first part holds the menu item text and the second part is the popup
		// example: 
		// |	<div dojoType="dijit.PopupMenuItem">
		// |		<span>pick me</span>
		// |		<popup> ... </popup>
		// |	</div>
		if(this.srcNodeRef){
			var nodes = dojo.query("*", this.srcNodeRef);
			dijit.PopupMenuItem.superclass._fillContent.call(this, nodes[0]);

			// save pointer to srcNode so we can grab the drop down widget after it's instantiated
			this.dropDownContainer = this.srcNodeRef;
		}
	},

	startup: function(){
		if(this._started){ return; }
		this.inherited(arguments);

		// we didn't copy the dropdown widget from the this.srcNodeRef, so it's in no-man's
		// land now.  move it to dojo.doc.body.
		if(!this.popup){
			var node = dojo.query("[widgetId]", this.dropDownContainer)[0];
			this.popup = dijit.byNode(node);
		}
		dojo.body().appendChild(this.popup.domNode);

		this.popup.domNode.style.display="none";
		dojo.addClass(this.expand, "dijitMenuExpandEnabled");
		dojo.style(this.expand, "display", "");
		dijit.setWaiState(this.containerNode, "haspopup", "true");
	},
	
	destroyDescendants: function(){
		if(this.popup){
			this.popup.destroyRecursive();
			delete this.popup;
		}
		this.inherited(arguments);
	}
});

dojo.declare("dijit.MenuSeparator",
	[dijit._Widget, dijit._Templated, dijit._Contained],
	{
	// summary: A line between two menu items

	templateString: '<tr class="dijitMenuSeparator"><td colspan=3>'
			+'<div class="dijitMenuSeparatorTop"></div>'
			+'<div class="dijitMenuSeparatorBottom"></div>'
			+'</td></tr>',

	postCreate: function(){
		dojo.setSelectable(this.domNode, false);
	},
	
	isFocusable: function(){
		// summary: over ride to always return false
		return false; // Boolean
	}
});

}
