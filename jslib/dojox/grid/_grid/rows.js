if(!dojo._hasResource["dojox.grid._grid.rows"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid._grid.rows"] = true;
dojo.provide("dojox.grid._grid.rows");

dojo.declare("dojox.grid.rows", null, {
	//	Stores information about grid rows. Owned by grid and used internally.
	constructor: function(inGrid){
		this.grid = inGrid;
	},
	linesToEms: 2,
	defaultRowHeight: 1, // lines
	overRow: -2,
	// metrics
	getHeight: function(inRowIndex){
		return '';
	},
	getDefaultHeightPx: function(){
		// summmary:
		// retrieves the default row height
		// returns: int, default row height
		return 32;
		//return Math.round(this.defaultRowHeight * this.linesToEms * this.grid.contentPixelToEmRatio);
	},
	// styles
	prepareStylingRow: function(inRowIndex, inRowNode){
		return {
			index: inRowIndex, 
			node: inRowNode,
			odd: Boolean(inRowIndex&1),
			selected: this.grid.selection.isSelected(inRowIndex),
			over: this.isOver(inRowIndex),
			customStyles: "",
			customClasses: "dojoxGrid-row"
		}
	},
	styleRowNode: function(inRowIndex, inRowNode){
		var row = this.prepareStylingRow(inRowIndex, inRowNode);
		this.grid.onStyleRow(row);
		this.applyStyles(row);
	},
	applyStyles: function(inRow){
		with(inRow){
			node.className = customClasses;
			var h = node.style.height;
			dojox.grid.setStyleText(node, customStyles + ';' + (node._style||''));
			node.style.height = h;
		}
	},
	updateStyles: function(inRowIndex){
		this.grid.updateRowStyles(inRowIndex);
	},
	// states and events
	setOverRow: function(inRowIndex){
		var last = this.overRow;
		this.overRow = inRowIndex;
		if((last!=this.overRow)&&(last >=0)){
			this.updateStyles(last);
		}
		this.updateStyles(this.overRow);
	},
	isOver: function(inRowIndex){
		return (this.overRow == inRowIndex);
	}
});

}
