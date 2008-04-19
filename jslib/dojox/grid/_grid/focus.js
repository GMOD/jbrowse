if(!dojo._hasResource["dojox.grid._grid.focus"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid._grid.focus"] = true;
dojo.provide("dojox.grid._grid.focus");

// focus management
dojo.declare("dojox.grid.focus", null, {
	// summary:
	//	Controls grid cell focus. Owned by grid and used internally for focusing.
	//	Note: grid cell actually receives keyboard input only when cell is being edited.
	constructor: function(inGrid){
		this.grid = inGrid;
		this.cell = null;
		this.rowIndex = -1;
		dojo.connect(this.grid.domNode, "onfocus", this, "doFocus");
	},
	tabbingOut: false,
	focusClass: "dojoxGrid-cell-focus",
	focusView: null,
	initFocusView: function(){
		this.focusView = this.grid.views.getFirstScrollingView();
	},
	isFocusCell: function(inCell, inRowIndex){
		// summary:
		//	states if the given cell is focused
		// inCell: object
		//	grid cell object
		// inRowIndex: int
		//	grid row index
		// returns:
		//	true of the given grid cell is focused
		return (this.cell == inCell) && (this.rowIndex == inRowIndex);
	},
	isLastFocusCell: function(){
		return (this.rowIndex == this.grid.rowCount-1) && (this.cell.index == this.grid.layout.cellCount-1);
	},
	isFirstFocusCell: function(){
		return (this.rowIndex == 0) && (this.cell.index == 0);
	},
	isNoFocusCell: function(){
		return (this.rowIndex < 0) || !this.cell;
	},
	_focusifyCellNode: function(inBork){
		var n = this.cell && this.cell.getNode(this.rowIndex);
		if(n){
			dojo.toggleClass(n, this.focusClass, inBork);
			if (inBork){
				this.scrollIntoView();
				try{
					if(!this.grid.edit.isEditing())
						dojox.grid.fire(n, "focus");
				}catch(e){}
			}
		}
	},
	scrollIntoView: function() {
		if(!this.cell){
			return;
		}
		var 
			c = this.cell,
			s = c.view.scrollboxNode,
			sr = {
				w: s.clientWidth,
				l: s.scrollLeft,
				t: s.scrollTop,
				h: s.clientHeight
			},
			n = c.getNode(this.rowIndex),
			r = c.view.getRowNode(this.rowIndex),
			rt = this.grid.scroller.findScrollTop(this.rowIndex);
		// place cell within horizontal view
		if(n.offsetLeft + n.offsetWidth > sr.l + sr.w){
			s.scrollLeft = n.offsetLeft + n.offsetWidth - sr.w;
		}else if(n.offsetLeft < sr.l){
			s.scrollLeft = n.offsetLeft;
		}
		// place cell within vertical view
		if(rt + r.offsetHeight > sr.t + sr.h){
			this.grid.setScrollTop(rt + r.offsetHeight - sr.h);
		}else if(rt < sr.t){
			this.grid.setScrollTop(rt);
		}
	},
	styleRow: function(inRow){
		return;
	},
	setFocusIndex: function(inRowIndex, inCellIndex){
		// summary:
		//	focuses the given grid cell
		// inRowIndex: int
		//	grid row index
		// inCellIndex: int
		//	grid cell index
		this.setFocusCell(this.grid.getCell(inCellIndex), inRowIndex);
	},
	setFocusCell: function(inCell, inRowIndex){
		// summary:
		//	focuses the given grid cell
		// inCell: object
		//	grid cell object
		// inRowIndex: int
		//	grid row index
		if(inCell && !this.isFocusCell(inCell, inRowIndex)){
			this.tabbingOut = false;
			this.focusGridView();
			this._focusifyCellNode(false);
			this.cell = inCell;
			this.rowIndex = inRowIndex;
			this._focusifyCellNode(true);
		}
		// even if this cell isFocusCell, the document focus may need to be rejiggered
		// call opera on delay to prevent keypress from altering focus
		if(dojo.isOpera){
			setTimeout(dojo.hitch(this.grid, 'onCellFocus', this.cell, this.rowIndex), 1);
		}else{
			this.grid.onCellFocus(this.cell, this.rowIndex);
		}
	},
	next: function(){
		// summary:
		//	focus next grid cell
		var row=this.rowIndex, col=this.cell.index+1, cc=this.grid.layout.cellCount-1, rc=this.grid.rowCount-1;
		if(col > cc){
			col = 0;
			row++;
		}
		if(row > rc){
			col = cc;
			row = rc;
		}
		this.setFocusIndex(row, col);
	},
	previous: function(){
		// summary:
		//	focus previous grid cell
		var row=(this.rowIndex || 0), col=(this.cell.index || 0) - 1;
		if(col < 0){
			col = this.grid.layout.cellCount-1;
			row--;
		}
		if(row < 0){
			row = 0;
			col = 0;
		}
		this.setFocusIndex(row, col);
	},
	move: function(inRowDelta, inColDelta) {
		// summary:
		//	focus grid cell based on position relative to current focus
		// inRowDelta: int
		// vertical distance from current focus
		// inColDelta: int
		// horizontal distance from current focus
		var
			rc = this.grid.rowCount-1,
			cc = this.grid.layout.cellCount-1,
			r = this.rowIndex,
			i = this.cell.index,
			row = Math.min(rc, Math.max(0, r+inRowDelta)),
			col = Math.min(cc, Math.max(0, i+inColDelta));
		this.setFocusIndex(row, col);
		if(inRowDelta){
			this.grid.updateRow(r);
		}
	},
	previousKey: function(e){
		if(this.isFirstFocusCell()){
			this.tabOut(this.grid.domNode);
		}else{
			dojo.stopEvent(e);
			this.previous();
		}
	},
	nextKey: function(e) {
		if(this.isLastFocusCell()){
			this.tabOut(this.grid.lastFocusNode);
		}else{
			dojo.stopEvent(e);
			this.next();
		}
	},
	tabOut: function(inFocusNode){
		this.tabbingOut = true;
		inFocusNode.focus();
	},
	focusGridView: function(){
		dojox.grid.fire(this.focusView, "focus");
	},
	focusGrid: function(inSkipFocusCell){
		this.focusGridView();
		this._focusifyCellNode(true);
	},
	doFocus: function(e){
		// trap focus only for grid dom node
		if(e && e.target != e.currentTarget){
			return;
		}
		// do not focus for scrolling if grid is about to blur
		if(!this.tabbingOut && this.isNoFocusCell()){
			// establish our virtual-focus, if necessary
			this.setFocusIndex(0, 0);
		}
		this.tabbingOut = false;
	}
});

}
