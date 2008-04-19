if(!dojo._hasResource["dojox.grid._grid.view"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid._grid.view"] = true;
dojo.provide("dojox.grid._grid.view");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojox.grid._grid.builder");

dojo.declare('dojox.GridView',
	[dijit._Widget, dijit._Templated],
	{
	// summary:
	//		A collection of grid columns. A grid is comprised of a set of views that stack horizontally.
	//		Grid creates views automatically based on grid's layout structure.
	//		Users should typically not need to access individual views directly.
	//
	// defaultWidth: String
	//		Default widget of the view
	defaultWidth: "18em",

	// viewWidth: String
	// 		Width for the view, in valid css unit
	viewWidth: "",

	templateString:"<div class=\"dojoxGrid-view\">\n\t<div class=\"dojoxGrid-header\" dojoAttachPoint=\"headerNode\">\n\t\t<div dojoAttachPoint=\"headerNodeContainer\" style=\"width:9000em\">\n\t\t\t<div dojoAttachPoint=\"headerContentNode\"></div>\n\t\t</div>\n\t</div>\n\t<input type=\"checkbox\" class=\"dojoxGrid-hidden-focus\" dojoAttachPoint=\"hiddenFocusNode\" />\n\t<input type=\"checkbox\" class=\"dojoxGrid-hidden-focus\" />\n\t<div class=\"dojoxGrid-scrollbox\" dojoAttachPoint=\"scrollboxNode\">\n\t\t<div class=\"dojoxGrid-content\" dojoAttachPoint=\"contentNode\" hidefocus=\"hidefocus\"></div>\n\t</div>\n</div>\n",
	
	themeable: false,
	classTag: 'dojoxGrid',
	marginBottom: 0,
	rowPad: 2,

	postMixInProperties: function(){
		this.rowNodes = [];
	},

	postCreate: function(){
		this.connect(this.scrollboxNode,"onscroll","doscroll");
		dojox.grid.funnelEvents(this.contentNode, this, "doContentEvent", [ 'mouseover', 'mouseout', 'click', 'dblclick', 'contextmenu', 'mousedown' ]);
		dojox.grid.funnelEvents(this.headerNode, this, "doHeaderEvent", [ 'dblclick', 'mouseover', 'mouseout', 'mousemove', 'mousedown', 'click', 'contextmenu' ]);
		this.content = new dojox.grid.contentBuilder(this);
		this.header = new dojox.grid.headerBuilder(this);
		//BiDi: in RTL case, style width='9000em' causes scrolling problem in head node
		if(!dojo._isBodyLtr()){
			this.headerNodeContainer.style.width = "";
		}
	},

	destroy: function(){
		dojox.grid.removeNode(this.headerNode);
		this.inherited("destroy", arguments);
	},

	// focus 
	focus: function(){
		if(dojo.isSafari || dojo.isOpera){
			this.hiddenFocusNode.focus();
		}else{
			this.scrollboxNode.focus();
		}
	},

	setStructure: function(inStructure){
		var vs = this.structure = inStructure;
		// FIXME: similar logic is duplicated in layout
		if(vs.width && !isNaN(vs.width)){
			this.viewWidth = vs.width + 'em';
		}else{
			this.viewWidth = vs.width || this.viewWidth; //|| this.defaultWidth;
		}
		this.onBeforeRow = vs.onBeforeRow;
		this.noscroll = vs.noscroll;
		if(this.noscroll){
			this.scrollboxNode.style.overflow = "hidden";
		}
		// bookkeeping
		this.testFlexCells();
		// accomodate new structure
		this.updateStructure();
	},

	testFlexCells: function(){
		// FIXME: cheater, this function does double duty as initializer and tester
		this.flexCells = false;
		for(var j=0, row; (row=this.structure.rows[j]); j++){
			for(var i=0, cell; (cell=row[i]); i++){
				cell.view = this;
				this.flexCells = this.flexCells || cell.isFlex();
			}
		}
		return this.flexCells;
	},

	updateStructure: function(){
		// header builder needs to update table map
		this.header.update();
		// content builder needs to update markup cache
		this.content.update();
	},

	getScrollbarWidth: function(){
		return (this.noscroll ? 0 : dojox.grid.getScrollbarWidth()); // Integer
	},

	getColumnsWidth: function(){
		return this.headerContentNode.firstChild.offsetWidth; // Integer
	},

	getWidth: function(){
		return this.viewWidth || (this.getColumnsWidth()+this.getScrollbarWidth()) +'px'; // String
	},

	getContentWidth: function(){
		return Math.max(0, dojo._getContentBox(this.domNode).w - this.getScrollbarWidth()) + 'px'; // String
	},

	render: function(){
		this.scrollboxNode.style.height = '';
		this.renderHeader();
	},

	renderHeader: function(){
		this.headerContentNode.innerHTML = this.header.generateHtml(this._getHeaderContent);
	},

	// note: not called in 'view' context
	_getHeaderContent: function(inCell){
		var n = inCell.name || inCell.grid.getCellName(inCell);
		if(inCell.index != inCell.grid.getSortIndex()){
			return n;
		}
		return [ '<div class="', inCell.grid.sortInfo > 0 ? 'dojoxGrid-sort-down' : 'dojoxGrid-sort-up', '"><div class="gridArrowButtonChar">', inCell.grid.sortInfo > 0 ? '&#9660;' : '&#9650;', '</div>', n, '</div>' ].join('');
	},

	resize: function(){
		this.adaptHeight();
		this.adaptWidth();
	},

	hasScrollbar: function(){
		return (this.scrollboxNode.clientHeight != this.scrollboxNode.offsetHeight); // Boolean
	},

	adaptHeight: function(){
		if(!this.grid.autoHeight){
			var h = this.domNode.clientHeight;
			if(!this.hasScrollbar()){ // no scrollbar is rendered
				h -= dojox.grid.getScrollbarWidth();
			}
			dojox.grid.setStyleHeightPx(this.scrollboxNode, h);
		}
	},

	adaptWidth: function(){
		if(this.flexCells){
			// the view content width
			this.contentWidth = this.getContentWidth();
			this.headerContentNode.firstChild.style.width = this.contentWidth;
		}
		// FIXME: it should be easier to get w from this.scrollboxNode.clientWidth, 
		// but clientWidth seemingly does not include scrollbar width in some cases
		var w = this.scrollboxNode.offsetWidth - this.getScrollbarWidth();
		w = Math.max(w, this.getColumnsWidth()) + 'px';
		with(this.contentNode){
			style.width = '';
			offsetWidth;
			style.width = w;
		}
	},

	setSize: function(w, h){
		with(this.domNode.style){
			if(w){
				width = w;
			}
			height = (h >= 0 ? h + 'px' : '');
		}
		with(this.headerNode.style){
			if(w){
				width = w;
			}
		}
	},

	renderRow: function(inRowIndex, inHeightPx){
		var rowNode = this.createRowNode(inRowIndex);
		this.buildRow(inRowIndex, rowNode, inHeightPx);
		this.grid.edit.restore(this, inRowIndex);
		return rowNode;
	},

	createRowNode: function(inRowIndex){
		var node = document.createElement("div");
		node.className = this.classTag + '-row';
		node[dojox.grid.gridViewTag] = this.id;
		node[dojox.grid.rowIndexTag] = inRowIndex;
		this.rowNodes[inRowIndex] = node;
		return node;
	},

	buildRow: function(inRowIndex, inRowNode){
		this.buildRowContent(inRowIndex, inRowNode);
		this.styleRow(inRowIndex, inRowNode);
	},

	buildRowContent: function(inRowIndex, inRowNode){
		inRowNode.innerHTML = this.content.generateHtml(inRowIndex, inRowIndex); 
		if(this.flexCells){
			// FIXME: accessing firstChild here breaks encapsulation
			inRowNode.firstChild.style.width = this.contentWidth;
		}
	},

	rowRemoved:function(inRowIndex){
		this.grid.edit.save(this, inRowIndex);
		delete this.rowNodes[inRowIndex];
	},

	getRowNode: function(inRowIndex){
		return this.rowNodes[inRowIndex];
	},

	getCellNode: function(inRowIndex, inCellIndex){
		var row = this.getRowNode(inRowIndex);
		if(row){
			return this.content.getCellNode(row, inCellIndex);
		}
	},

	// styling
	styleRow: function(inRowIndex, inRowNode){
		inRowNode._style = dojox.grid.getStyleText(inRowNode);
		this.styleRowNode(inRowIndex, inRowNode);
	},

	styleRowNode: function(inRowIndex, inRowNode){
		if(inRowNode){
			this.doStyleRowNode(inRowIndex, inRowNode);
		}
	},

	doStyleRowNode: function(inRowIndex, inRowNode){
		this.grid.styleRowNode(inRowIndex, inRowNode);
	},

	// updating
	updateRow: function(inRowIndex, inHeightPx, inPageNode){
		var rowNode = this.getRowNode(inRowIndex);
		if(rowNode){
			rowNode.style.height = '';
			this.buildRow(inRowIndex, rowNode);
		}
		return rowNode;
	},

	updateRowStyles: function(inRowIndex){
		this.styleRowNode(inRowIndex, this.getRowNode(inRowIndex));
	},

	// scrolling
	lastTop: 0,
	firstScroll:0,

	doscroll: function(inEvent){
		//var s = dojo.marginBox(this.headerContentNode.firstChild);
		var isLtr = dojo._isBodyLtr();
		if(this.firstScroll < 2){
			if((!isLtr && this.firstScroll == 1) || (isLtr && this.firstScroll == 0)){
				var s = dojo.marginBox(this.headerNodeContainer);
				if(dojo.isIE){
					this.headerNodeContainer.style.width = s.w + this.getScrollbarWidth() + 'px';
				}else if(dojo.isMoz){
					//TODO currently only for FF, not sure for safari and opera
					this.headerNodeContainer.style.width = s.w - this.getScrollbarWidth() + 'px';
					//this.headerNodeContainer.style.width = s.w + 'px';
					//set scroll to right in FF
					if(isLtr){
						this.scrollboxNode.scrollLeft = this.scrollboxNode.scrollWidth - this.scrollboxNode.clientWidth;
					}else{
						this.scrollboxNode.scrollLeft = this.scrollboxNode.clientWidth - this.scrollboxNode.scrollWidth;
					}
				}
			}
			this.firstScroll++;
		}
		this.headerNode.scrollLeft = this.scrollboxNode.scrollLeft;
		// 'lastTop' is a semaphore to prevent feedback-loop with setScrollTop below
		var top = this.scrollboxNode.scrollTop;
		if(top != this.lastTop){
			this.grid.scrollTo(top);
		}
	},

	setScrollTop: function(inTop){
		// 'lastTop' is a semaphore to prevent feedback-loop with doScroll above
		this.lastTop = inTop;
		this.scrollboxNode.scrollTop = inTop;
		return this.scrollboxNode.scrollTop;
	},

	// event handlers (direct from DOM)
	doContentEvent: function(e){
		if(this.content.decorateEvent(e)){
			this.grid.onContentEvent(e);
		}
	},

	doHeaderEvent: function(e){
		if(this.header.decorateEvent(e)){
			this.grid.onHeaderEvent(e);
		}
	},

	// event dispatch(from Grid)
	dispatchContentEvent: function(e){
		return this.content.dispatchEvent(e);
	},

	dispatchHeaderEvent: function(e){
		return this.header.dispatchEvent(e);
	},

	// column resizing
	setColWidth: function(inIndex, inWidth){
		this.grid.setCellWidth(inIndex, inWidth + 'px');
	},

	update: function(){
		var left = this.scrollboxNode.scrollLeft;
		this.content.update();
		this.grid.update();
		this.scrollboxNode.scrollLeft = left;
		this.headerNode.scrollLeft = left;
	}
});

}
