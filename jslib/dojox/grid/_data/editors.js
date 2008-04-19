if(!dojo._hasResource["dojox.grid._data.editors"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid._data.editors"] = true;
dojo.provide("dojox.grid._data.editors");
dojo.provide("dojox.grid.editors");

dojo.declare("dojox.grid.editors.Base", null, {
	// summary:
	//	base grid editor class. Other grid editors should inherited from this class.
	constructor: function(inCell){
		this.cell = inCell;
	},
	//private
	_valueProp: "value",
	_formatPending: false,
	format: function(inDatum, inRowIndex){
		// summary:
		//	formats the cell for editing
		// inDatum: anything
		//	cell data to edit
		// inRowIndex: int
		//	grid row index
		// returns: string of html to place in grid cell
	},
	//protected
	needFormatNode: function(inDatum, inRowIndex){
		this._formatPending = true;
		dojox.grid.whenIdle(this, "_formatNode", inDatum, inRowIndex);
	},
	cancelFormatNode: function(){
		this._formatPending = false;
	},
	//private
	_formatNode: function(inDatum, inRowIndex){
		if(this._formatPending){
			this._formatPending = false;
			// make cell selectable
			dojo.setSelectable(this.cell.grid.domNode, true);
			this.formatNode(this.getNode(inRowIndex), inDatum, inRowIndex);
		}
	},
	//protected
	getNode: function(inRowIndex){
		return (this.cell.getNode(inRowIndex) || 0).firstChild || 0;
	},
	formatNode: function(inNode, inDatum, inRowIndex){
		// summary:
		//	format the editing dom node. Use when editor is a widget.
		// inNode: dom node
		// dom node for the editor
		// inDatum: anything
		//	cell data to edit
		// inRowIndex: int
		//	grid row index
		if(dojo.isIE){
			// IE sux bad
			dojox.grid.whenIdle(this, "focus", inRowIndex, inNode);
		}else{
			this.focus(inRowIndex, inNode);
		}
	},
	dispatchEvent: function(m, e){
		if(m in this){
			return this[m](e);
		}
	},
	//public
	getValue: function(inRowIndex){
		// summary:
		//	returns value entered into editor
		// inRowIndex: int
		// grid row index
		// returns:
		//	value of editor
		return this.getNode(inRowIndex)[this._valueProp];
	},
	setValue: function(inRowIndex, inValue){
		// summary:
		//	set the value of the grid editor
		// inRowIndex: int
		// grid row index
		// inValue: anything
		//	value of editor
		var n = this.getNode(inRowIndex);
		if(n){
			n[this._valueProp] = inValue
		};
	},
	focus: function(inRowIndex, inNode){
		// summary:
		//	focus the grid editor
		// inRowIndex: int
		// grid row index
		// inNode: dom node
		//	editor node
		dojox.grid.focusSelectNode(inNode || this.getNode(inRowIndex));
	},
	save: function(inRowIndex){
		// summary:
		//	save editor state
		// inRowIndex: int
		// grid row index
		this.value = this.value || this.getValue(inRowIndex);
		//console.log("save", this.value, inCell.index, inRowIndex);
	},
	restore: function(inRowIndex){
		// summary:
		//	restore editor state
		// inRowIndex: int
		// grid row index
		this.setValue(inRowIndex, this.value);
		//console.log("restore", this.value, inCell.index, inRowIndex);
	},
	//protected
	_finish: function(inRowIndex){
		// summary:
		//	called when editing is completed to clean up editor
		// inRowIndex: int
		// grid row index
		dojo.setSelectable(this.cell.grid.domNode, false);
		this.cancelFormatNode(this.cell);
	},
	//public
	apply: function(inRowIndex){
		// summary:
		//	apply edit from cell editor
		// inRowIndex: int
		// grid row index
		this.cell.applyEdit(this.getValue(inRowIndex), inRowIndex);
		this._finish(inRowIndex);
	},
	cancel: function(inRowIndex){
		// summary:
		//	cancel cell edit
		// inRowIndex: int
		// grid row index
		this.cell.cancelEdit(inRowIndex);
		this._finish(inRowIndex);
	}
});
dojox.grid.editors.base = dojox.grid.editors.Base; // back-compat

dojo.declare("dojox.grid.editors.Input", dojox.grid.editors.Base, {
	// summary
	// grid cell editor that provides a standard text input box
	constructor: function(inCell){
		this.keyFilter = this.keyFilter || this.cell.keyFilter;
	},
	// keyFilter: object
	// optional regex for disallowing keypresses
	keyFilter: null,
	format: function(inDatum, inRowIndex){
		this.needFormatNode(inDatum, inRowIndex);
		return '<input class="dojoxGrid-input" type="text" value="' + inDatum + '">';
	},
	formatNode: function(inNode, inDatum, inRowIndex){
		this.inherited(arguments);
		// FIXME: feels too specific for this interface
		this.cell.registerOnBlur(inNode, inRowIndex);
	},
	doKey: function(e){
		if(this.keyFilter){
			var key = String.fromCharCode(e.charCode);
			if(key.search(this.keyFilter) == -1){
				dojo.stopEvent(e);
			}
		}
	},
	_finish: function(inRowIndex){
		this.inherited(arguments);
		var n = this.getNode(inRowIndex);
		try{
			dojox.grid.fire(n, "blur");
		}catch(e){}
	}
});
dojox.grid.editors.input = dojox.grid.editors.Input; // back compat

dojo.declare("dojox.grid.editors.Select", dojox.grid.editors.Input, {
	// summary:
	// grid cell editor that provides a standard select
	// options: text of each item
	// values: value for each item
	// returnIndex: editor returns only the index of the selected option and not the value
	constructor: function(inCell){
		this.options = this.options || this.cell.options;
		this.values = this.values || this.cell.values || this.options;
	},
	format: function(inDatum, inRowIndex){
		this.needFormatNode(inDatum, inRowIndex);
		var h = [ '<select class="dojoxGrid-select">' ];
		for (var i=0, o, v; ((o=this.options[i]) !== undefined)&&((v=this.values[i]) !== undefined); i++){
			h.push("<option", (inDatum==v ? ' selected' : ''), ' value="' + v + '"', ">", o, "</option>");
		}
		h.push('</select>');
		return h.join('');
	},
	getValue: function(inRowIndex){
		var n = this.getNode(inRowIndex);
		if(n){
			var i = n.selectedIndex, o = n.options[i];
			return this.cell.returnIndex ? i : o.value || o.innerHTML;
		}
	}
});
dojox.grid.editors.select = dojox.grid.editors.Select; // back compat

dojo.declare("dojox.grid.editors.AlwaysOn", dojox.grid.editors.Input, {
	// summary:
	// grid cell editor that is always on, regardless of grid editing state
	// alwaysOn: boolean
	// flag to use editor to format grid cell regardless of editing state.
	alwaysOn: true,
	_formatNode: function(inDatum, inRowIndex){
		this.formatNode(this.getNode(inRowIndex), inDatum, inRowIndex);
	},
	applyStaticValue: function(inRowIndex){
		var e = this.cell.grid.edit;
		e.applyCellEdit(this.getValue(inRowIndex), this.cell, inRowIndex);
		e.start(this.cell, inRowIndex, true);
	}
});
dojox.grid.editors.alwaysOn = dojox.grid.editors.AlwaysOn; // back-compat

dojo.declare("dojox.grid.editors.Bool", dojox.grid.editors.AlwaysOn, {
	// summary:
	// grid cell editor that provides a standard checkbox that is always on
	_valueProp: "checked",
	format: function(inDatum, inRowIndex){
		return '<input class="dojoxGrid-input" type="checkbox"' + (inDatum ? ' checked="checked"' : '') + ' style="width: auto" />';
	},
	doclick: function(e){
		if(e.target.tagName == 'INPUT'){
			this.applyStaticValue(e.rowIndex);
		}
	}
});
dojox.grid.editors.bool = dojox.grid.editors.Bool; // back-compat

}
