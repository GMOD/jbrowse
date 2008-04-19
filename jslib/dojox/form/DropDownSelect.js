if(!dojo._hasResource["dojox.form.DropDownSelect"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.form.DropDownSelect"] = true;
dojo.provide("dojox.form.DropDownSelect");

dojo.require("dijit.form.Button");
dojo.require("dijit.Menu");

dojo.require("dojo.data.ItemFileWriteStore");

dojo.declare("dojox.form.DropDownSelect", dijit.form.DropDownButton, {
	// summary:
	//		This is a "Styleable" select box - it is basically a DropDownButton which
	//		can take as its input a <select>.

	baseClass: "dojoxDropDownSelect",

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
	
	// emptyLabel: string
	//		What to display in an "empty" dropdown
	emptyLabel: "",
	
	// _isPopulated: boolean
	//		Whether or not we have been populated
	_isPopulated: false,

	_addMenuItem: function(/* dojox.form.__SelectOption */ option){
		// summary:
		//		For the given option, add a menu item to our dropdown
		//		If the option doesn't have a value, then a separator is added 
		//		in that place.
		var menu = this.dropDown;

		if(!option.value){
			// We are a separator (no label set for it)
			menu.addChild(new dijit.MenuSeparator());
		}else{
			// Just a regular menu option
			var click = dojo.hitch(this, "setAttribute","value",option);
			var mi = new dijit.MenuItem({
				id: this.id + "_item_" + option.value,
				label: option.label,
				onClick: click
			});
			menu.addChild(mi);

		}
	},

	_resetButtonState: function(){
		// summary: 
		//		Resets the menu and the length attribute of the button - and
		//		ensures that the label is appropriately set.
		var len = this.options.length;
		
		// reset the menu to make it "populatable on the next click
		var dropDown = this.dropDown;
		dojo.forEach(dropDown.getChildren(), function(child){
			child.destroyRecursive();
		});
		this._isPopulated = false;
		
		// Set our length attribute and our value
		this.setAttribute("readOnly", (len === 1));
		this.setAttribute("disabled", (len === 0));	
		this.setAttribute("value", this.value);
	},
	
	_updateSelectedState: function(){
		// summary:
		//		Sets the "selected" class on the item for styling purposes
		var val = this.value;
		if(val){
			var testId = this.id + "_item_" + val;
			dojo.forEach(this.dropDown.getChildren(), function(child){
				dojo[child.id === testId ? "addClass" : "removeClass"](child.domNode,
														this.baseClass + "SelectedOption");
			}, this);
		}
	},
	
	addOption: function(/* dojox.form.__SelectOption or string, optional */ value, /* string? */ label){
		// summary:
		//		Adds an option to the end of the select.  If value is empty or 
		//		missing, a separator is created instead.
		
		this.options.push(value.value ? value : { value:value, label:label });
	},
	
	removeOption: function(/* string, dojox.form.__SelectOption or number */ valueOrIdx){
		// summary:
		//		Removes the given option
		this.options = dojo.filter(this.options, function(node, idx){
			return !((typeof valueOrIdx === "number" && idx === valueOrIdx) ||
					(typeof valueOrIdx === "string" && node.value === valueOrIdx) ||
					(valueOrIdx.value && node.value === valueOrIdx.value));
		});
	},
	
	setOptionLabel: function(/*string*/ value, /*string*/ label){
		dojo.forEach(this.options, function(node){
			if(node.value === value){
				node.label = label;
			}
		});
	},

	destroy: function(){
		// summary:
		//		Clear out an outstanding hack handle
		if(this._labelHackHandle){
			clearTimeout(this._labelHackHandle);
		}
		this.inherited(arguments);
	},
	
	setLabel: function(/* string */ content){
		// summary:
		//		Wraps our label in a div - that way, our rich text can work
		//		correctly.

		content = '<div class=" ' + this.baseClass + 'Label">' +
					content +
					'</div>';
		//		Because FF2 has a problem with layout, we need to delay this
		//		call for it.
		if(this._labelHackHandle){
			clearTimeout(this._labelHackHandle);
		}
		if(dojo.isFF === 2){
			this._labelHackHandle = setTimeout(dojo.hitch(this, function(){
				this._labelHackHandle = null;
				dijit.form.DropDownButton.prototype.setLabel.call(this, content);
			}), 0);
		}else{
			this.inherited(arguments);
		}
	},

	setAttribute: function(/*string*/ attr, /* anything */ value){
		// summary: sometime we get called to set our value - we need to 
		//			make sure and route those requests through _setValue()
		//			instead.
		if(attr === "value"){
			// If a string is passed, then we set our value from looking it up.
			if(typeof value === "string"){
				value = dojo.filter(this.options, function(node){
					return node.value === value;
				})[0];
			}
			
			// If we don't have a value, try to show the first item
			if(!value){
				value = this.options[0] || { value: "", label: "" };
			}
			this.value = value.value;
			if(this._started){
				this.setLabel(value.label || this.emptyLabel || "&nbsp;");
			}
			this._handleOnChange(value.value);
			value = this.value;
		}else{
			this.inherited(arguments);
		}
	},
	
	_fillContent: function(){
		// summary:  
		//		Loads our options and sets up our dropdown correctly.  We 
		//		don't want any content, so we don't call any inherit chain
		//		function.
		var opts = this.options;
		if(!opts){
			opts = this.options = this.srcNodeRef ? dojo.query(">", 
						this.srcNodeRef).map(function(node){
							if(node.getAttribute("type") === "separator"){
								return { value: "", label: "" };
							}
							return { value: node.getAttribute("value"),
										label: String(node.innerHTML) };
						}, this) : [];
		}
		
		// Set the value to be the first, or the selected index
		if(opts.length && !this.value){
			var si = this.srcNodeRef.selectedIndex;
			this.value = opts[si != -1 ? si : 0].value;
		}
		
		// Create the dropDown widget
		this.dropDown = new dijit.Menu();
	},

	postCreate: function(){
		// summary: sets up our event handling that we need for functioning
		//			as a select

		this.inherited(arguments);

		// Make our event connections for updating state
		var fx = function(){
			dojo[this._opened ? "addClass" : "removeClass"](this.focusNode,
														this.baseClass + "ButtonOpened");
		};
		this.connect(this, "_openDropDown", fx);
		this.connect(this, "_closeDropDown", fx);
		this.connect(this, "onChange", "_updateSelectedState");
		this.connect(this, "addOption", "_resetButtonState");
		this.connect(this, "removeOption", "_resetButtonState");
		this.connect(this, "setOptionLabel", "_resetButtonState");
	},

	startup: function(){
		// summary: 
		//		FF2 has layout problems if the reset call isn't done on a
		//		slight delay
		this.inherited(arguments);
		if(dojo.isFF === 2){
			setTimeout(dojo.hitch(this, this._resetButtonState), 0);
		}else{
			this._resetButtonState();
		}
	},
	
	_populate: function(/* function */ callback){
		// summary: 
		//			populates the menu (and does the callback, if passed)
		
		var dropDown = this.dropDown;
		
		// Add each menu item
		dojo.forEach(this.options, this._addMenuItem, this);
		
		// Update states
		this._updateSelectedState();
		dojo.addClass(this.dropDown.domNode, this.baseClass + "Menu");
		this._isPopulated = true;
		if(callback){ callback.call(this); }
	},
	
	_toggleDropDown: function(){
		// summary: Overrides DropDownButton's toggle function to make sure 
		//			that the values are correctly populated.
		var dropDown = this.dropDown;
		if(dropDown && !dropDown.isShowingNow && !this._isPopulated){
			this._populate(dojox.form.DropDownSelect.superclass._toggleDropDown);
		}else{
			this.inherited(arguments);
		}
	}
});

}
