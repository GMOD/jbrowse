if(!dojo._hasResource["dojox.grid._grid.layout"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid._grid.layout"] = true;
dojo.provide("dojox.grid._grid.layout");
dojo.require("dojox.grid._grid.cell");

dojo.declare("dojox.grid.layout", null, {
	// summary:
	//	Controls grid cell layout. Owned by grid and used internally.
	constructor: function(inGrid){
		this.grid = inGrid;
	},
	// flat array of grid cells
	cells: [],
	// structured array of grid cells
	structure: null,
	// default cell width
	defaultWidth: '6em',
	// methods
	setStructure: function(inStructure){
		this.fieldIndex = 0;
		this.cells = [];
		var s = this.structure = [];
		for(var i=0, viewDef, rows; (viewDef=inStructure[i]); i++){
			s.push(this.addViewDef(viewDef));
		}
		this.cellCount = this.cells.length;
	},
	addViewDef: function(inDef){
		this._defaultCellProps = inDef.defaultCell || {};
		return dojo.mixin({}, inDef, {rows: this.addRowsDef(inDef.rows || inDef.cells)});
	},
	addRowsDef: function(inDef){
		var result = [];
		for(var i=0, row; inDef && (row=inDef[i]); i++){
			result.push(this.addRowDef(i, row));
		}
		return result;
	},
	addRowDef: function(inRowIndex, inDef){
		var result = [];
		for(var i=0, def, cell; (def=inDef[i]); i++){
			cell = this.addCellDef(inRowIndex, i, def);
			result.push(cell);
			this.cells.push(cell);
		}
		return result;
	},
	addCellDef: function(inRowIndex, inCellIndex, inDef){
		var w = 0;
		if(inDef.colSpan > 1){
			w = 0;
		}else if(!isNaN(inDef.width)){
			w = inDef.width + "em";
		}else{
			w = inDef.width || this.defaultWidth;
		}
		// fieldIndex progresses linearly from the last indexed field
		// FIXME: support generating fieldIndex based a text field name (probably in Grid)
		var fieldIndex = inDef.field != undefined ? inDef.field : (inDef.get ? -1 : this.fieldIndex);
		if((inDef.field != undefined) || !inDef.get){
			this.fieldIndex = (inDef.field > -1 ? inDef.field : this.fieldIndex) + 1; 
		}
		return new dojox.grid.cell(
			dojo.mixin({}, this._defaultCellProps, inDef, {
				grid: this.grid,
				subrow: inRowIndex,
				layoutIndex: inCellIndex,
				index: this.cells.length,
				fieldIndex: fieldIndex,
				unitWidth: w
			}));
	}
});

}
