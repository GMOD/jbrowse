if(!dojo._hasResource["dojox.grid._grid.cell"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid._grid.cell"] = true;
dojo.provide("dojox.grid._grid.cell");

dojo.declare("dojox.grid.cell", null, {
	// summary:
	//	Respresents a grid cell and contains information about column options and methods
	//	for retrieving cell related information.
	//	Each column in a grid layout has a cell object and most events and many methods
	//	provide access to these objects.
	styles: '',
	constructor: function(inProps){
		dojo.mixin(this, inProps);
		if(this.editor){this.editor = new this.editor(this);}
	},
	// data source
	format: function(inRowIndex){
		// summary:
		//	provides the html for a given grid cell.
		// inRowIndex: int
		// grid row index
		// returns: html for a given grid cell
		var f, i=this.grid.edit.info, d=this.get ? this.get(inRowIndex) : this.value;
		if(this.editor && (this.editor.alwaysOn || (i.rowIndex==inRowIndex && i.cell==this))){
			return this.editor.format(d, inRowIndex);
		}else{
			return (f = this.formatter) ? f.call(this, d, inRowIndex) : d;
		}
	},
	// utility
	getNode: function(inRowIndex){
		// summary:
		//	gets the dom node for a given grid cell.
		// inRowIndex: int
		// grid row index
		// returns: dom node for a given grid cell
		return this.view.getCellNode(inRowIndex, this.index);
	},
	isFlex: function(){
		var uw = this.unitWidth;
		return uw && (uw=='auto' || uw.slice(-1)=='%');
	},
	// edit support
	applyEdit: function(inValue, inRowIndex){
		this.grid.edit.applyCellEdit(inValue, this, inRowIndex);
	},
	cancelEdit: function(inRowIndex){
		this.grid.doCancelEdit(inRowIndex);
	},
	_onEditBlur: function(inRowIndex){
		if(this.grid.edit.isEditCell(inRowIndex, this.index)){
			//console.log('editor onblur', e);
			this.grid.edit.apply();
		}
	},
	registerOnBlur: function(inNode, inRowIndex){
		if(this.commitOnBlur){
			dojo.connect(inNode, "onblur", function(e){
				// hack: if editor still thinks this editor is current some ms after it blurs, assume we've focused away from grid
				setTimeout(dojo.hitch(this, "_onEditBlur", inRowIndex), 250);
			});
		}
	}
});

}
