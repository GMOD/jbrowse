if(!dojo._hasResource["dijit.form._FormWidget"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.form._FormWidget"] = true;
dojo.provide("dijit.form._FormWidget");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.declare("dijit.form._FormWidget", [dijit._Widget, dijit._Templated],
{
	/*
	Summary:
		_FormWidget's correspond to native HTML elements such as <checkbox> or <button>.
		Each _FormWidget represents a single HTML element.

		All these widgets should have these attributes just like native HTML input elements.
		You can set them during widget construction.

		They also share some common methods.
	*/

	// baseClass: String
	//		Root CSS class of the widget (ex: dijitTextBox), used to add CSS classes of widget
	//		(ex: "dijitTextBox dijitTextBoxInvalid dijitTextBoxFocused dijitTextBoxInvalidFocused")
	//		See _setStateClass().
	baseClass: "",

	// name: String
	//		Name used when submitting form; same as "name" attribute or plain HTML elements
	name: "",

	// alt: String
	//		Corresponds to the native HTML <input> element's attribute.
	alt: "",

	// value: String
	//		Corresponds to the native HTML <input> element's attribute.
	value: "",

	// type: String
	//		Corresponds to the native HTML <input> element's attribute.
	type: "text",

	// tabIndex: Integer
	//		Order fields are traversed when user hits the tab key
	tabIndex: "0",

	// disabled: Boolean
	//		Should this widget respond to user input?
	//		In markup, this is specified as "disabled='disabled'", or just "disabled".
	disabled: false,

	// readOnly: Boolean
	//		Should this widget respond to user input?
	//		In markup, this is specified as "readOnly".
	//		Similar to disabled except readOnly form values are submitted
	readOnly: false,

	// intermediateChanges: Boolean
	//		Fires onChange for each value change or only on demand
	intermediateChanges: false,

	// These mixins assume that the focus node is an INPUT, as many but not all _FormWidgets are.
	// Don't attempt to mixin the 'type', 'name' attributes here programatically -- they must be declared
	// directly in the template as read by the parser in order to function. IE is known to specifically 
	// require the 'name' attribute at element creation time.
	attributeMap: dojo.mixin(dojo.clone(dijit._Widget.prototype.attributeMap),
		{value:"focusNode", disabled:"focusNode", readOnly:"focusNode", id:"focusNode", tabIndex:"focusNode", alt:"focusNode"}),

	setAttribute: function(/*String*/ attr, /*anything*/ value){
		this.inherited(arguments);
		switch(attr){
			case "disabled":
				var tabIndexNode = this[this.attributeMap['tabIndex']||'domNode'];
				if(value){
					//reset those, because after the domNode is disabled, we can no longer receive
					//mouse related events, see #4200
					this._hovering = false;
					this._active = false;
					// remove the tabIndex, especially for FF
					tabIndexNode.removeAttribute('tabIndex');
				}else{
					tabIndexNode.setAttribute('tabIndex', this.tabIndex);
				}
				dijit.setWaiState(this[this.attributeMap['disabled']||'domNode'], "disabled", value);
				this._setStateClass();
		}
	},

	setDisabled: function(/*Boolean*/ disabled){
		// summary:
		//		Set disabled state of widget (Deprecated).
		dojo.deprecated("setDisabled("+disabled+") is deprecated. Use setAttribute('disabled',"+disabled+") instead.", "", "2.0");
		this.setAttribute('disabled', disabled);
	},


	_onMouse : function(/*Event*/ event){
		// summary:
		//	Sets _hovering, _active, and stateModifier properties depending on mouse state,
		//	then calls setStateClass() to set appropriate CSS classes for this.domNode.
		//
		//	To get a different CSS class for hover, send onmouseover and onmouseout events to this method.
		//	To get a different CSS class while mouse button is depressed, send onmousedown to this method.

		var mouseNode = event.currentTarget;
		if(mouseNode && mouseNode.getAttribute){
			this.stateModifier = mouseNode.getAttribute("stateModifier") || "";
		}

		if(!this.disabled){
			switch(event.type){
				case "mouseenter":	
				case "mouseover":
					this._hovering = true;
					this._active = this._mouseDown;
					break;

				case "mouseout":
				case "mouseleave":
					this._hovering = false;
					this._active = false;
					break;

				case "mousedown" :
					this._active = true;
					this._mouseDown = true;
					// set a global event to handle mouseup, so it fires properly
					//	even if the cursor leaves the button
					var mouseUpConnector = this.connect(dojo.body(), "onmouseup", function(){
						this._active = false;
						this._mouseDown = false;
						this._setStateClass();
						this.disconnect(mouseUpConnector);
					});
					if(this.isFocusable()){ this.focus(); }
					break;
			}
			this._setStateClass();
		}
	},

	isFocusable: function(){
		return !this.disabled && !this.readOnly && this.focusNode && (dojo.style(this.domNode, "display") != "none");
	},

	focus: function(){
		setTimeout(dojo.hitch(this, dijit.focus, this.focusNode), 0); // cannot call focus() from an event handler directly
	},

	_setStateClass: function(){
		// summary
		//	Update the visual state of the widget by setting the css classes on this.domNode
		//  (or this.stateNode if defined) by combining this.baseClass with
		//	various suffixes that represent the current widget state(s).
		//
		//	In the case where a widget has multiple
		//	states, it sets the class based on all possible
		//  combinations.  For example, an invalid form widget that is being hovered
		//	will be "dijitInput dijitInputInvalid dijitInputHover dijitInputInvalidHover".
		//
		//	For complex widgets with multiple regions, there can be various hover/active states,
		//	such as "Hover" or "CloseButtonHover" (for tab buttons).
		//	This is controlled by a stateModifier="CloseButton" attribute on the close button node.
		//
		//	The widget may have one or more of the following states, determined
		//	by this.state, this.checked, this.valid, and this.selected:
		//		Error - ValidationTextBox sets this.state to "Error" if the current input value is invalid
		//		Checked - ex: a checkmark or a ToggleButton in a checked state, will have this.checked==true
		//		Selected - ex: currently selected tab will have this.selected==true
		//
		//	In addition, it may have one or more of the following states,
		//	based on this.disabled and flags set in _onMouse (this._active, this._hovering, this._focused):
		//		Disabled	- if the widget is disabled
		//		Active		- if the mouse (or space/enter key?) is being pressed down
		//		Focused		- if the widget has focus
		//		Hover		- if the mouse is over the widget

		// Get original (non state related, non baseClass related) class specified in template
		if(!("staticClass" in this)){
			this.staticClass = (this.stateNode||this.domNode).className;
		}

		// Compute new set of classes
		var classes = [ this.baseClass ];

		function multiply(modifier){
			classes=classes.concat(dojo.map(classes, function(c){ return c+modifier; }), "dijit"+modifier);
		}

		if(this.checked){
			multiply("Checked");
		}
		if(this.state){
			multiply(this.state);
		}
		if(this.selected){
			multiply("Selected");
		}

		if(this.disabled){
			multiply("Disabled");
		}else if(this.readOnly){
			multiply("ReadOnly");
		}else if(this._active){
			multiply(this.stateModifier+"Active");
		}else{
			if(this._focused){
				multiply("Focused");
			}
			if(this._hovering){
				multiply(this.stateModifier+"Hover");
			}
		}

		(this.stateNode || this.domNode).className = this.staticClass + " " + classes.join(" ");
	},

	onChange: function(newValue){
		// summary: callback when value is changed
	},

	_onChangeMonitor: 'value',
	_onChangeActive: false,

	_handleOnChange: function(/*anything*/ newValue, /*Boolean, optional*/ priorityChange){
		// summary: set the value of the widget.
		this._lastValue = newValue;
		if(this._lastValueReported == undefined && (priorityChange === null || !this._onChangeActive)){
			this._resetValue = this._lastValueReported = newValue;
		}
		if((this.intermediateChanges || priorityChange || priorityChange === undefined) && 
			((newValue && newValue.toString)?newValue.toString():newValue) !== ((this._lastValueReported && this._lastValueReported.toString)?this._lastValueReported.toString():this._lastValueReported)){
			this._lastValueReported = newValue;
			if(this._onChangeActive){ this.onChange(newValue); }
		}
	},

	reset: function(){
		this._hasBeenBlurred = false;
		if(this.setValue && !this._getValueDeprecated){
			this.setValue(this._resetValue, true);
		}else if(this._onChangeMonitor){
			this.setAttribute(this._onChangeMonitor, (this._resetValue !== undefined && this._resetValue !== null)? this._resetValue : '');
		}
	},

	create: function(){
		this.inherited(arguments);
		this._onChangeActive = true;
		this._setStateClass();
	},
	
	destroy: function(){
		if(this._layoutHackHandle){
			clearTimeout(this._layoutHackHandle);
		}
		this.inherited(arguments);
	},

	setValue: function(/*String*/ value){
		dojo.deprecated("dijit.form._FormWidget:setValue("+value+") is deprecated.  Use setAttribute('value',"+value+") instead.", "", "2.0");
		this.setAttribute('value', value);
	},

	_getValueDeprecated: true, // Form uses this, remove when getValue is removed
	getValue: function(){
		dojo.deprecated("dijit.form._FormWidget:getValue() is deprecated.  Use widget.value instead.", "", "2.0");
		return this.value;
	},

	_layoutHack: function(){
		// summary: work around table sizing bugs on FF2 by forcing redraw
		if(dojo.isFF == 2){
			var node=this.domNode;
			var old = node.style.opacity;
			node.style.opacity = "0.999";
			this._layoutHackHandle = setTimeout(dojo.hitch(this, function(){
				this._layoutHackHandle = null;
				node.style.opacity = old;
			}), 0);
		}
	}
});

dojo.declare("dijit.form._FormValueWidget", dijit.form._FormWidget,
{
	/*
	Summary:
		_FormValueWidget's correspond to native HTML elements such as <input> or <select> that have user changeable values.
		Each _ValueWidget represents a single input value, and has a (possibly hidden) <input> element,
		to which it serializes its input value, so that form submission (either normal submission or via FormBind?)
		works as expected.
	*/

	attributeMap: dojo.mixin(dojo.clone(dijit.form._FormWidget.prototype.attributeMap),
		{value:""}),

	postCreate: function(){
		this.setValue(this.value, null);
	},

	setValue: function(/*anything*/ newValue, /*Boolean, optional*/ priorityChange){
		// summary: set the value of the widget.
		this.value = newValue;
		this._handleOnChange(newValue, priorityChange);
	},

	_getValueDeprecated: false, // remove when _FormWidget:getValue is removed
	getValue: function(){
		// summary: get the value of the widget.
		return this._lastValue;
	},

	undo: function(){
		// summary: restore the value to the last value passed to onChange
		this.setValue(this._lastValueReported, false);
	},

	_valueChanged: function(){
		var v = this.getValue();
		var lv = this._lastValueReported;
		// Equality comparison of objects such as dates are done by reference so
		// two distinct objects are != even if they have the same data. So use
		// toStrings in case the values are objects.
		return ((v !== null && (v !== undefined) && v.toString)?v.toString():'') !== ((lv !== null && (lv !== undefined) && lv.toString)?lv.toString():'');
	},

	_onKeyPress: function(e){
		if(e.keyCode == dojo.keys.ESCAPE && !e.shiftKey && !e.ctrlKey && !e.altKey){
			if(this._valueChanged()){
				this.undo();
				dojo.stopEvent(e);
				return false;
			}
		}
		return true;
	}
});

}
