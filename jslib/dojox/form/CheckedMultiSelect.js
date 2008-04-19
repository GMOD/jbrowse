if(!dojo._hasResource["dojox.form.CheckedMultiSelect"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.form.CheckedMultiSelect"] = true;
dojo.provide("dojox.form.CheckedMultiSelect");

dojo.require("dijit.form.MultiSelect");
dojo.require("dijit.form.CheckBox");

dojo.declare("dojox.form._CheckedMultiSelectItem", 
	[dijit._Widget, dijit._Templated],
	{
	// summary:
	//		The individual items for a CheckedMultiSelect

	widgetsInTemplate: true,
	templateString:"<div class=\"dijitReset ${baseClass}\"\n\t><input class=\"${baseClass}Box\" dojoType=\"dijit.form.CheckBox\" dojoAttachPoint=\"checkBox\" dojoAttachEvent=\"_onClick:_changeBox\" type=\"checkbox\" \n\t><div class=\"dijitInline ${baseClass}Label\" dojoAttachPoint=\"labelNode\" dojoAttachEvent=\"onmousedown:_onMouse,onmouseover:_onMouse,onmouseout:_onMouse,onclick:_onClick\">${option.innerHTML}</div\n></div>\n",

	baseClass: "dojoxMultiSelectItem",

	// option: Element
	//		The option that is associated with this item
	option: null,
	parent: null,
	
	// disabled: boolean
	//		Whether or not this widget is disabled
	disabled: false,

	_changeBox: function(){
		// summary:
		//		Called to force the select to match the state of the check box
		//		(only on click of the checkbox)
		this.option.selected = this.checkBox.getValue() && true;

		// fire the parent's change
		this.parent._onChange();
		
		// refocus the parent
		this.parent.focus();
	},

	_labelClick: function(){
		// summary:
		//		Called when the label portion is clicked
		dojo.stopEvent(e);
		if(this.disabled){
			return;
		}
		var cb = this.checkBox;
		cb.setValue(!cb.getValue());
		this._changeBox();
	},

	_onMouse: function(e){
		// summary:
		//		Sets the hover state depending on mouse state (passes through
		//		to the check box)
		this.checkBox._onMouse(e);
	},
	
	_onClick: function(e){
		// summary:
		//		Sets the click state (passes through to the check box)
		this.checkBox._onClick(e);
	},
	
	_updateBox: function(){
		// summary:
		//		Called to force the box to match the state of the select
		this.checkBox.setValue(this.option.selected);
	},
	
	setAttribute: function(attr, value){
		// summary:
		//		Disables (or enables) all the children as well
		this.inherited(arguments);
		switch(attr){
			case "disabled":
				this.checkBox.setAttribute(attr, value);
				break;
			default:
				break;
		}
	}
});

dojo.declare("dojox.form.CheckedMultiSelect", dijit.form.MultiSelect, {
	// summary:
	//		Extends the core dijit MultiSelect to provide a "checkbox" selector

	templateString: "",
	templateString:"<div class=\"dijit dijitReset dijitInline\" dojoAttachEvent=\"onmousedown:_mouseDown,onclick:focus\"\n\t><select class=\"${baseClass}Select\" multiple=\"true\" dojoAttachPoint=\"containerNode,focusNode\" dojoAttachEvent=\"onchange: _onChange\"></select\n\t><div dojoAttachPoint=\"wrapperDiv\"></div\n></div>\n",

	baseClass: "dojoxMultiSelect",

	// children: dojox.form._CheckedMultiSelectItem[]
	//		Array of all our children (for updating them)
	children: [],
	
	/*=====
	dojox.form.__SelectOption = function(){
		//	value: String
		//		The value of the option.  Setting to empty (or missing) will
		//		place a separator at that location
		//	label: String
		//		The label for our option.  It can contain html tags.
		this.value = value;
		this.label = label;
	}
	=====*/

	// options: dojox.form.__SelectOption[]
	//		our set of options
	options: null,

	_mouseDown: function(e){
		// summary:
		//		Cancels the mousedown event to prevent others from stealing
		//		focus
		dojo.stopEvent(e);
	},

	_updateChildren: function(){
		// summary:
		//		Called to update the checked states of my children to match me
		dojo.forEach(this.children,function(child){
			child._updateBox();
		});
	},
	
	_addChild: function(/*Element*/ option){
		// summary:
		//		Adds and returns a child for the given option.
		var item = new dojox.form._CheckedMultiSelectItem({
			option: option,
			parent: this
		});
		this.wrapperDiv.appendChild(item.domNode);
		return item;
	},

	_loadChildren: function(){
		// summary:
		//		Reloads the children to match our box.

		// Destroy any existing children before loading them again
		dojo.forEach(this.children, function(child){
			child.destroyRecursive();
		});
		this.children = dojo.query("option", this.domNode).map(function(child){
			return this._addChild(child);
		}, this);
		this.options = dojo.map(this.children, function(child){
			var opt = child.option;
			return { value:opt.value, label: opt.text };
		});
		// Update the statuses of the children
		this._updateChildren();
	},

	addOption: function(/* dojox.form.__SelectOption or string, optional */ value, /* string? */ label){
		// summary: Adds the given option to the select
		
		var o = new Option("","");
		o.value = value.value || value;
		o.innerHTML = value.label || label;
		this.containerNode.appendChild(o);
	},

	removeOption: function(/*String*/ optionId){
		dojo.query("option[value=" + optionId + "]", this.domNode).forEach(function(node){
			node.parentNode.removeChild(node);
		}, this);
	},
	
	setOptionLabel: function(/*string*/ optionId, /*string*/ label){
		dojo.query("option[value=" + optionId + "]", this.domNode).forEach(function(node){
			node.innerHTML = label;
		});
	},

	addSelected: function(select){
		this.inherited(arguments);
		
		// Reload my children and the children of the guy pointing to me
		if(select._loadChildren){
			select._loadChildren();
		}
		this._loadChildren();
	},
	
	setAttribute: function(attr, value){
		// summary:
		//		Disable (or enable) all the children as well
		this.inherited(arguments);
		switch(attr){
			case "disabled":
				dojo.forEach(this.children, function(node){
					if(node && node.setAttribute){
						node.setAttribute(attr, value);
					}
				});
				break;
			default:
				break;
		}
	},

	startup: function(){
		if(this._started){ return; }
		this.inherited(arguments);

		// Load children and make connections
		this._loadChildren();
		this.connect(this, "setValue", "_updateChildren");
		this.connect(this, "invertSelection", "_updateChildren");
		this.connect(this, "addOption", "_loadChildren");
		this.connect(this, "removeOption", "_loadChildren");
		this.connect(this, "setOptionLabel", "_loadChildren");
		this._started = true;
	}
});

}
