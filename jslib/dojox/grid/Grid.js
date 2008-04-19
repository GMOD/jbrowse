if(!dojo._hasResource["dojox.grid.Grid"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid.Grid"] = true;
dojo.provide("dojox.grid.Grid");
dojo.require("dojox.grid.VirtualGrid");
dojo.require("dojox.grid._data.model");
dojo.require("dojox.grid._data.editors");
dojo.require("dojox.grid._data.dijitEditors");

// FIXME: 
//		we are at the wrong location! 

dojo.declare('dojox.Grid', dojox.VirtualGrid, {
	//	summary:
	//		A grid widget with virtual scrolling, cell editing, complex rows,
	//		sorting, fixed columns, sizeable columns, etc.
	//	description:
	//		Grid is a subclass of VirtualGrid, providing binding to a data
	//		store.
	//	example:
	//		define the grid structure:
	//	|	var structure = [ // array of view objects
	//	|		{ cells: [// array of rows, a row is an array of cells
	//	|			[	{ name: "Alpha", width: 6 }, 
	//	|				{ name: "Beta" }, 
	//	|				{ name: "Gamma", get: formatFunction }
	//	|			]
	//	|		]}
	//	|	];
	//	  	
	//		define a grid data model
	//	|	var model = new dojox.grid.data.table(null, data);
	//	|
	//	|	<div id="grid" model="model" structure="structure" 
	//	|		dojoType="dojox.VirtualGrid"></div>
	//	

	//	model:
	//		string or object grid data model
	model: 'dojox.grid.data.Table',
	
	// life cycle
	postCreate: function(){
		if(this.model){
			var m = this.model;
			if(dojo.isString(m)){
				m = dojo.getObject(m);
			}
			this.model = (dojo.isFunction(m)) ? new m() : m;
			this._setModel(this.model);
		}
		this.inherited(arguments);
	},
	
	destroy: function(){
		this.setModel(null);
		this.inherited(arguments);
	},
	
	// structure
	_structureChanged: function() {
		this.indexCellFields();
		this.inherited(arguments);
	},
	
	// model
	_setModel: function(inModel){
		// if(!inModel){ return; }
		this.model = inModel;
		if(this.model){
			this.model.observer(this);
			this.model.measure();
			this.indexCellFields();
		}
	},
	
	setModel: function(inModel){
		// summary:
		//		Set the grid's data model
		// inModel: Object
		//		Model object, usually an instance of a dojox.grid.data.Model
		//		subclass
		if(this.model){
			this.model.notObserver(this);
		}
		this._setModel(inModel);
	},
	

	get: function(inRowIndex){
		// summary: data socket (called in cell's context)	
		return this.grid.model.getDatum(inRowIndex, this.fieldIndex);
	},

	// model modifications
	modelAllChange: function(){
		this.rowCount = (this.model ? this.model.getRowCount() : 0);
		this.updateRowCount(this.rowCount);
	},

	modelRowChange: function(inData, inRowIndex){
		this.updateRow(inRowIndex);
	},

	modelDatumChange: function(inDatum, inRowIndex, inFieldIndex){
		this.updateRow(inRowIndex);
	},

	modelFieldsChange: function() {
		this.indexCellFields();
		this.render();
	},

	// model insertion
	modelInsertion: function(inRowIndex){
		this.updateRowCount(this.model.getRowCount());
	},

	// model removal
	modelRemoval: function(inKeys){
		this.updateRowCount(this.model.getRowCount());
	},

	// cells
	getCellName: function(inCell){
		var v = this.model.fields.values, i = inCell.fieldIndex;
		return i>=0 && i<v.length && v[i].name || this.inherited(arguments);
	},

	indexCellFields: function(){
		var cells = this.layout.cells;
		for(var i=0, c; cells && (c=cells[i]); i++){
			if(dojo.isString(c.field)){
				c.fieldIndex = this.model.fields.indexOf(c.field);
			}
		}
	},

	// utility
	refresh: function(){
		// summary:
		//		Re-render the grid, getting new data from the model
		this.edit.cancel();
		this.model.measure();
	},

	// sorting
	canSort: function(inSortInfo){
		var f = this.getSortField(inSortInfo);
		// 0 is not a valid sort field
		return f && this.model.canSort(f);
	},

	getSortField: function(inSortInfo){
		// summary:
		//		Retrieves the model field on which to sort data.
		// inSortInfo: Integer
		//		1-based grid column index; positive if sort is ascending, otherwise negative
		var c = this.getCell(this.getSortIndex(inSortInfo));
		// we expect c.fieldIndex == -1 for non model fields
		// that yields a getSortField value of 0, which can be detected as invalid
		return (c.fieldIndex+1) * (this.sortInfo > 0 ? 1 : -1);
	},

	sort: function(){
		this.edit.apply();
		this.model.sort(this.getSortField());
	},

	// row editing
	addRow: function(inRowData, inIndex){
		this.edit.apply();
		var i = inIndex || -1;
		if(i<0){
			i = this.selection.getFirstSelected() || 0;
		}
		if(i<0){
			i = 0;
		}
		this.model.insert(inRowData, i);
		this.model.beginModifyRow(i);
		// begin editing row
		// FIXME: add to edit
		for(var j=0, c; ((c=this.getCell(j)) && !c.editor); j++){}
		if(c&&c.editor){
			this.edit.setEditCell(c, i);
			this.focus.setFocusCell(c, i);
		}else{
			this.focus.setFocusCell(this.getCell(0), i);
		}
	},

	removeSelectedRows: function(){
		this.edit.apply();
		var s = this.selection.getSelected();
		if(s.length){
			this.model.remove(s);
			this.selection.clear();
		}
	},

	//: protected
	// editing
	canEdit: function(inCell, inRowIndex){
		// summary: 
		//		Determines if a given cell may be edited
		// inCell: Object
		//		A grid cell
		// inRowIndex: Integer
		//		Grid row index
		// returns: Boolean
		//		True if given cell may be edited
		return (this.model.canModify ? this.model.canModify(inRowIndex) : true);
	},

	doStartEdit: function(inCell, inRowIndex){
		this.model.beginModifyRow(inRowIndex);
		this.onStartEdit(inCell, inRowIndex);
	},

	doApplyCellEdit: function(inValue, inRowIndex, inFieldIndex){
		this.model.setDatum(inValue, inRowIndex, inFieldIndex);
		this.onApplyCellEdit(inValue, inRowIndex, inFieldIndex);
	},

	doCancelEdit: function(inRowIndex){
		this.model.cancelModifyRow(inRowIndex);
		this.onCancelEdit.apply(this, arguments);
	},

	doApplyEdit: function(inRowIndex){
		this.model.endModifyRow(inRowIndex);
		this.onApplyEdit(inRowIndex);
	},

	styleRowState: function(inRow){
		// summary: Perform row styling
		if(this.model.getState){
			var states=this.model.getState(inRow.index), c='';
			for(var i=0, ss=["inflight", "error", "inserting"], s; s=ss[i]; i++){
				if(states[s]){
					c = ' dojoxGrid-row-' + s;
					break;
				}
			}
			inRow.customClasses += c;
		}
	},

	onStyleRow: function(inRow){
		this.styleRowState(inRow);
		this.inherited(arguments);
	}

});

dojox.Grid.markupFactory = function(props, node, ctor){
	// handle setting up a data model for a store if one
	// isn't provided. There are some caveats:
	//		* we only really handle dojo.data sources well. They're the future
	//		  so it's no big deal, but it's something to be aware of.
	//		* I'm pretty sure that colgroup introspection is missing some of
	//		  the available settable properties. 
	//		* No handling of cell formatting and content getting is done
	var d = dojo;
	var widthFromAttr = function(n){
		var w = d.attr(n, "width")||"auto";
		if((w != "auto")&&(w.substr(-2) != "em")){
			w = parseInt(w)+"px";
		}
		return w;
	}
	if(!props.model && d.hasAttr(node, "store")){
		// if a model isn't specified and we point to a store, assume
		// we're also folding the definition for a model up into the
		// inline ctor for the Grid. This will then take properties
		// like "query", "rowsPerPage", and "clientSort" from the grid
		// definition.
		var mNode = node.cloneNode(false);
		d.attr(mNode, {
			"jsId": null,
			"dojoType": d.attr(node, "dataModelClass") || "dojox.grid.data.DojoData"
		});
		props.model = d.parser.instantiate([mNode])[0];
	}
	// if(!props.model){ console.debug("no model!"); }
	// if a structure isn't referenced, do we have enough
	// data to try to build one automatically?
	if(	!props.structure && 
		node.nodeName.toLowerCase() == "table"){

		// try to discover a structure
		props.structure = d.query("> colgroup", node).map(function(cg){
			var sv = d.attr(cg, "span");
			var v = { 
				noscroll: (d.attr(cg, "noscroll") == "true") ? true : false,
				__span: (!!sv ? parseInt(sv) : 1),
				cells: []
			};
			if(d.hasAttr(cg, "width")){
				v.width = widthFromAttr(cg);
			}
			return v; // for vendetta
		});
		if(!props.structure.length){
			props.structure.push({
				__span: Infinity,
				cells: [] // catch-all view
			}); 
		}
		// check to see if we're gonna have more than one view
		
		// for each tr in our th, create a row of cells
		d.query("thead > tr", node).forEach(function(tr, tr_idx){
			var cellCount = 0;
			var viewIdx = 0;
			var lastViewIdx;
			var cView = null;
			d.query("> th", tr).map(function(th){
				// what view will this cell go into?

				// NOTE:
				//		to prevent extraneous iteration, we start counters over
				//		for each row, incrementing over the surface area of the
				//		structure that colgroup processing generates and
				//		creating cell objects for each <th> to place into those
				//		cell groups.  There's a lot of state-keepking logic
				//		here, but it is what it has to be.
				if(!cView){ // current view book keeping
					lastViewIdx = 0;
					cView = props.structure[0];
				}else if(cellCount >= (lastViewIdx+cView.__span)){
					viewIdx++;
					// move to allocating things into the next view
					lastViewIdx += cView.__span;
					lastView = cView;
					cView = props.structure[viewIdx];
				}

				// actually define the cell from what markup hands us
				var cell = {
					name: d.trim(d.attr(th, "name")||th.innerHTML),
					field: d.trim(d.attr(th, "field")||""),
					colSpan: parseInt(d.attr(th, "colspan")||1)
				};
				cellCount += cell.colSpan;
				cell.field = cell.field||cell.name;
				cell.width = widthFromAttr(th);
				if(!cView.cells[tr_idx]){
					cView.cells[tr_idx] = [];
				}
				cView.cells[tr_idx].push(cell);
			});
		});
		// console.debug(dojo.toJson(props.structure, true));
	}
	return new dojox.Grid(props, node);
}


// alias us to the right location
dojox.grid.Grid = dojox.Grid;

}
