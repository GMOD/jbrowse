if(!dojo._hasResource['dojox.grid._grid.selection']){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource['dojox.grid._grid.selection'] = true;
dojo.provide('dojox.grid._grid.selection');

dojo.declare("dojox.grid.selection",
	null,
	{
	// summary:
	//		Manages row selection for grid. Owned by grid and used internally 
	//		for selection. Override to implement custom selection.

	constructor: function(inGrid){
		this.grid = inGrid;
		this.selected = [];
	},
	
	multiSelect: true,
	selected: null,
	updating: 0,
	selectedIndex: -1,

	onCanSelect: function(inIndex){
		return this.grid.onCanSelect(inIndex);
	},

	onCanDeselect: function(inIndex){
		return this.grid.onCanDeselect(inIndex);
	},

	onSelected: function(inIndex){
		return this.grid.onSelected(inIndex);
	},

	onDeselected: function(inIndex){
		return this.grid.onDeselected(inIndex);
	},

	//onSetSelected: function(inIndex, inSelect) { };
	onChanging: function(){
	},

	onChanged: function(){
		return this.grid.onSelectionChanged();
	},

	isSelected: function(inIndex){
		return this.selected[inIndex];
	},

	getFirstSelected: function(){
		for(var i=0, l=this.selected.length; i<l; i++){
			if(this.selected[i]){
				return i;
			}
		}
		return -1;
	},

	getNextSelected: function(inPrev){
		for(var i=inPrev+1, l=this.selected.length; i<l; i++){
			if(this.selected[i]){
				return i;
			}
		}
		return -1;
	},

	getSelected: function(){
		var result = [];
		for(var i=0, l=this.selected.length; i<l; i++){
			if(this.selected[i]){
				result.push(i);
			}
		}
		return result;
	},

	getSelectedCount: function(){
		var c = 0;
		for(var i=0; i<this.selected.length; i++){
			if(this.selected[i]){
				c++;
			}
		}
		return c;
	},

	beginUpdate: function(){
		if(this.updating == 0){
			this.onChanging();
		}
		this.updating++;
	},

	endUpdate: function(){
		this.updating--;
		if(this.updating == 0){
			this.onChanged();
		}
	},

	select: function(inIndex){
		this.unselectAll(inIndex);
		this.addToSelection(inIndex);
	},

	addToSelection: function(inIndex){
		inIndex = Number(inIndex);
		if(this.selected[inIndex]){
			this.selectedIndex = inIndex;
		}else{
			if(this.onCanSelect(inIndex) !== false){
				this.selectedIndex = inIndex;
				this.beginUpdate();
				this.selected[inIndex] = true;
				this.grid.onSelected(inIndex);
				//this.onSelected(inIndex);
				//this.onSetSelected(inIndex, true);
				this.endUpdate();
			}
		}
	},

	deselect: function(inIndex){
		inIndex = Number(inIndex);
		if(this.selectedIndex == inIndex){
			this.selectedIndex = -1;
		}
		if(this.selected[inIndex]){
			if(this.onCanDeselect(inIndex) === false){
				return;
			}
			this.beginUpdate();
			delete this.selected[inIndex];
			this.grid.onDeselected(inIndex);
			//this.onDeselected(inIndex);
			//this.onSetSelected(inIndex, false);
			this.endUpdate();
		}
	},

	setSelected: function(inIndex, inSelect){
		this[(inSelect ? 'addToSelection' : 'deselect')](inIndex);
	},

	toggleSelect: function(inIndex){
		this.setSelected(inIndex, !this.selected[inIndex])
	},

	insert: function(inIndex){
		this.selected.splice(inIndex, 0, false);
		if(this.selectedIndex >= inIndex){
			this.selectedIndex++;
		}
	},

	remove: function(inIndex){
		this.selected.splice(inIndex, 1);
		if(this.selectedIndex >= inIndex){
			this.selectedIndex--;
		}
	},

	unselectAll: function(inExcept){
		for(var i in this.selected){
			if((i!=inExcept)&&(this.selected[i]===true)){
				this.deselect(i);
			}
		}
	},

	shiftSelect: function(inFrom, inTo){
		var s = (inFrom >= 0 ? inFrom : inTo), e = inTo;
		if(s > e){
			e = s;
			s = inTo;
		}
		for(var i=s; i<=e; i++){
			this.addToSelection(i);
		}
	},

	clickSelect: function(inIndex, inCtrlKey, inShiftKey){
		this.beginUpdate();
		if(!this.multiSelect){
			this.select(inIndex);
		}else{
			var lastSelected = this.selectedIndex;
			if(!inCtrlKey){
				this.unselectAll(inIndex);
			}
			if(inShiftKey){
				this.shiftSelect(lastSelected, inIndex);
			}else if(inCtrlKey){
				this.toggleSelect(inIndex);
			}else{
				this.addToSelection(inIndex)
			}
		}
		this.endUpdate();
	},

	clickSelectEvent: function(e){
		this.clickSelect(e.rowIndex, e.ctrlKey, e.shiftKey);
	},

	clear: function(){
		this.beginUpdate();
		this.unselectAll();
		this.endUpdate();
	}

});

}
