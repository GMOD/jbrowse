if(!dojo._hasResource["dojox.grid._data.dijitEditors"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid._data.dijitEditors"] = true;
dojo.provide("dojox.grid._data.dijitEditors");
dojo.require("dojox.grid._data.editors");
dojo.require("dijit.form.DateTextBox");
dojo.require("dijit.form.TimeTextBox");
dojo.require("dijit.form.ComboBox");
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.NumberSpinner");
dojo.require("dijit.form.NumberTextBox");
dojo.require("dijit.form.CurrencyTextBox");
dojo.require("dijit.form.Slider");
dojo.require("dijit.Editor");

dojo.declare("dojox.grid.editors.Dijit", dojox.grid.editors.base, {
	editorClass: "dijit.form.TextBox",
	constructor: function(inCell){
		this.editor = null;
		this.editorClass = dojo.getObject(this.cell.editorClass || this.editorClass);
	},
	format: function(inDatum, inRowIndex){
		this.needFormatNode(inDatum, inRowIndex);
		return "<div></div>";
	},
	getValue: function(inRowIndex){
		return this.editor.getValue();
	},
	setValue: function(inRowIndex, inValue){
		if(this.editor&&this.editor.setValue){
			this.editor.setValue(inValue);
		}else{
			this.inherited(arguments);
		}
	},
	getEditorProps: function(inDatum){
		return dojo.mixin({}, this.cell.editorProps||{}, {
			constraints: dojo.mixin({}, this.cell.constraint) || {}, //TODO: really just for ValidationTextBoxes
			value: inDatum
		});
	},
	createEditor: function(inNode, inDatum, inRowIndex){
		return new this.editorClass(this.getEditorProps(inDatum), inNode);

	},
	attachEditor: function(inNode, inDatum, inRowIndex){
		inNode.appendChild(this.editor.domNode);
		this.setValue(inRowIndex, inDatum);
	},
	formatNode: function(inNode, inDatum, inRowIndex){
		if(!this.editorClass){
			return inDatum;
		}
		if(!this.editor){
			this.editor = this.createEditor.apply(this, arguments);
		}else{
			this.attachEditor.apply(this, arguments);
		}
		this.sizeEditor.apply(this, arguments);
		this.cell.grid.rowHeightChanged(inRowIndex);
		this.focus();
	},
	sizeEditor: function(inNode, inDatum, inRowIndex){
		var
			p = this.cell.getNode(inRowIndex),
			box = dojo.contentBox(p);
		dojo.marginBox(this.editor.domNode, {w: box.w});
	},
	focus: function(inRowIndex, inNode){
		if(this.editor){
			setTimeout(dojo.hitch(this.editor, function(){
				dojox.grid.fire(this, "focus");
			}), 0);
		}
	},
	_finish: function(inRowIndex){
		this.inherited(arguments);
		dojox.grid.removeNode(this.editor.domNode);
	}
});

dojo.declare("dojox.grid.editors.ComboBox", dojox.grid.editors.Dijit, {
	editorClass: "dijit.form.ComboBox",
	getEditorProps: function(inDatum){
		var items=[];
		dojo.forEach(this.cell.options, function(o){
			items.push({name: o, value: o});
		});
		var store = new dojo.data.ItemFileReadStore({data: {identifier:"name", items: items}});
		return dojo.mixin({}, this.cell.editorProps||{}, {
			value: inDatum,
			store: store
		});
	},
	getValue: function(){
		var e = this.editor;
		// make sure to apply the displayed value
		e.setDisplayedValue(e.getDisplayedValue());
		return e.getValue();
	}
});

dojo.declare("dojox.grid.editors.DateTextBox", dojox.grid.editors.Dijit, {
	editorClass: "dijit.form.DateTextBox",
	setValue: function(inRowIndex, inValue){
		if(this.editor){
			this.editor.setValue(new Date(inValue));
		}else{
			this.inherited(arguments);
		}
	},
	getEditorProps: function(inDatum){
		return dojo.mixin(this.inherited(arguments), {
			value: new Date(inDatum)
		});
	}
});


dojo.declare("dojox.grid.editors.CheckBox", dojox.grid.editors.Dijit, {
	editorClass: "dijit.form.CheckBox",
	getValue: function(){
		return this.editor.checked;
	},
	setValue: function(inRowIndex, inValue){
		if(this.editor&&this.editor.setAttribute){
			this.editor.setAttribute("checked", inValue);
		}else{
			this.inherited(arguments);
		}
	},
	sizeEditor: function(inNode, inDatum, inRowIndex){
		return;
	}
});


dojo.declare("dojox.grid.editors.Editor", dojox.grid.editors.Dijit, {
	editorClass: "dijit.Editor",
	getEditorProps: function(inDatum){
		return dojo.mixin({}, this.cell.editorProps||{}, {
			height: this.cell.editorHeight || "100px"
		});
	},
	createEditor: function(inNode, inDatum, inRowIndex){
		// editor needs its value set after creation
		var editor = new this.editorClass(this.getEditorProps(inDatum), inNode);
		editor.setValue(inDatum);
		return editor;
	},
	formatNode: function(inNode, inDatum, inRowIndex){
		this.inherited(arguments);
		// FIXME: seem to need to reopen the editor and display the toolbar
		var e = this.editor;
		e.open();
		if(this.cell.editorToolbar){
			dojo.place(e.toolbar.domNode, e.editingArea, "before");
		}
	}
});

}
