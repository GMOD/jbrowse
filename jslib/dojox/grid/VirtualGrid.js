if(!dojo._hasResource["dojox.grid.VirtualGrid"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid.VirtualGrid"] = true;
dojo.provide("dojox.grid.VirtualGrid");

dojo.require("dojox.grid._grid.lib");
dojo.require("dojox.grid._grid.scroller");
dojo.require("dojox.grid._grid.view");
dojo.require("dojox.grid._grid.views");
dojo.require("dojox.grid._grid.layout");
dojo.require("dojox.grid._grid.rows");
dojo.require("dojox.grid._grid.focus");
dojo.require("dojox.grid._grid.selection");
dojo.require("dojox.grid._grid.edit");
dojo.require("dojox.grid._grid.rowbar");
dojo.require("dojox.grid._grid.publicEvents");

dojo.declare('dojox.VirtualGrid', 
	[ dijit._Widget, dijit._Templated ], 
	{
	// summary:
	// 		A grid widget with virtual scrolling, cell editing, complex rows,
	// 		sorting, fixed columns, sizeable columns, etc.
	//
	//	description:
	//		VirtualGrid provides the full set of grid features without any
	//		direct connection to a data store.
	//
	//		The grid exposes a get function for the grid, or optionally
	//		individual columns, to populate cell contents.
	//
	//		The grid is rendered based on its structure, an object describing
	//		column and cell layout.
	//
	//	example:
	//		A quick sample:
	//		
	//		define a get function
	//	|	function get(inRowIndex){ // called in cell context
	//	|		return [this.index, inRowIndex].join(', ');
	//	|	}
	//		
	//		define the grid structure:
	//	|	var structure = [ // array of view objects
	//	|		{ cells: [// array of rows, a row is an array of cells
	//	|			[
	//	|				{ name: "Alpha", width: 6 }, 
	//	|				{ name: "Beta" }, 
	//	|				{ name: "Gamma", get: get }]
	//	|		]}
	//	|	];
	//		
	//	|	<div id="grid" 
	//	|		rowCount="100" get="get" 
	//	|		structure="structure" 
	//	|		dojoType="dojox.VirtualGrid"></div>

	templateString:"<div class=\"dojoxGrid\" hidefocus=\"hidefocus\" role=\"wairole:grid\">\n\t<div class=\"dojoxGrid-master-header\" dojoAttachPoint=\"viewsHeaderNode\"></div>\n\t<div class=\"dojoxGrid-master-view\" dojoAttachPoint=\"viewsNode\"></div>\n\t<span dojoAttachPoint=\"lastFocusNode\" tabindex=\"0\"></span>\n</div>\n",
	
	// classTag: String
	// 		CSS class applied to the grid's domNode
	classTag: 'dojoxGrid',

	get: function(inRowIndex){
		// summary: Default data getter. 
		// description:
		//		Provides data to display in a grid cell. Called in grid cell context.
		//		So this.cell.index is the column index.
		// inRowIndex: Integer
		//		Row for which to provide data
		// returns:
		//		Data to display for a given grid cell.
	},
	
	// settings
	// rowCount: Integer
	//		Number of rows to display. 
	rowCount: 5,

	// keepRows: Integer
	//		Number of rows to keep in the rendering cache.
	keepRows: 75,
	
	// rowsPerPage: Integer
	//		Number of rows to render at a time.
	rowsPerPage: 25,

	// autoWidth: Boolean
	//		If autoWidth is true, grid width is automatically set to fit the data.
	autoWidth: false,
	
	// autoHeight: Boolean
	//		If autoHeight is true, grid height is automatically set to fit the data.
	autoHeight: false,
	
	// autoRender: Boolean
	//		If autoRender is true, grid will render itself after initialization.
	autoRender: true,

	// defaultHeight: String
	//		default height of the grid, measured in any valid css unit.
	defaultHeight: '15em',

	// structure: Object|String
	//		View layout defintion. Can be set to a layout object, or to the (string) name of a layout object.
	structure: '',

	// elasticView: Integer
	//	Override defaults and make the indexed grid view elastic, thus filling available horizontal space.
	elasticView: -1,
	
	// singleClickEdit: boolean
	//		Single-click starts editing. Default is double-click
	singleClickEdit: false,

	// Used to store the last two clicks, to ensure double-clicking occurs based on the intended row
	_click: null,
	
	// private
	sortInfo: 0,
	themeable: true,

	// initialization
	buildRendering: function(){
		this.inherited(arguments);
		// reset get from blank function (needed for markup parsing) to null, if not changed
		if(this.get == dojox.VirtualGrid.prototype.get){
			this.get = null;
		}
		if(!this.domNode.getAttribute('tabIndex')){
			this.domNode.tabIndex = "0";
		}
		this.createScroller();
		this.createLayout();
		this.createViews();
		this.createManagers();
		dojox.grid.initTextSizePoll();
		this.connect(dojox.grid, "textSizeChanged", "textSizeChanged");
		dojox.grid.funnelEvents(this.domNode, this, 'doKeyEvent', dojox.grid.keyEvents);
		this.connect(this, "onShow", "renderOnIdle");
	},
	postCreate: function(){
		// replace stock styleChanged with one that triggers an update
		this.styleChanged = this._styleChanged;
		this.setStructure(this.structure);
		this._click = [];
	},
	
	destroy: function(){
		this.domNode.onReveal = null;
		this.domNode.onSizeChange = null;
		this.edit.destroy();
		this.views.destroyViews();
		this.inherited(arguments);
	},
	
	styleChanged: function(){
		this.setStyledClass(this.domNode, '');
	},
	
	_styleChanged: function(){
		this.styleChanged();
		this.update();
	},
	
	textSizeChanged: function(){
		setTimeout(dojo.hitch(this, "_textSizeChanged"), 1);
	},
	
	_textSizeChanged: function(){
		if(this.domNode){
			this.views.forEach(function(v){
				v.content.update();
			});
			this.render();
		}
	},
	
	sizeChange: function(){
		dojox.grid.jobs.job(this.id + 'SizeChange', 50, dojo.hitch(this, "update"));
	},
	
	renderOnIdle: function() {
		setTimeout(dojo.hitch(this, "render"), 1);
	},
	
	createManagers: function(){
		// summary:
		//		create grid managers for various tasks including rows, focus, selection, editing
		
		// row manager
		this.rows = new dojox.grid.rows(this);
		// focus manager
		this.focus = new dojox.grid.focus(this);
		// selection manager
		this.selection = new dojox.grid.selection(this);
		// edit manager
		this.edit = new dojox.grid.edit(this);
	},

	createScroller: function(){
		// summary: Creates a new virtual scroller
		this.scroller = new dojox.grid.scroller.columns();
		this.scroller._pageIdPrefix = this.id + '-';
		this.scroller.renderRow = dojo.hitch(this, "renderRow");
		this.scroller.removeRow = dojo.hitch(this, "rowRemoved");
	},

	createLayout: function(){
		// summary: Creates a new Grid layout
		this.layout = new dojox.grid.layout(this);
	},

	// views
	createViews: function(){
		this.views = new dojox.grid.views(this);
		this.views.createView = dojo.hitch(this, "createView");
	},
	
	createView: function(inClass){
		if(dojo.isAIR){
			var obj = window;
			var names = inClass.split('.');
			for(var i=0;i<names.length;i++){
				if(typeof obj[names[i]]=='undefined'){
					var undefstring = names[0];
					for(var j=1;j<=i;j++){
						undefstring+="."+names[j];
					}
					throw new Error(undefstring+" is undefined");
				}
				obj = obj[names[i]];
			}
			var c = obj;
		}else{
			var c = eval(inClass);
		}
		var view = new c({ grid: this });
		this.viewsNode.appendChild(view.domNode);
		this.viewsHeaderNode.appendChild(view.headerNode);
		this.views.addView(view);
		return view;
	},

	buildViews: function(){
		for(var i=0, vs; (vs=this.layout.structure[i]); i++){
			this.createView(vs.type || dojox._scopeName + ".GridView").setStructure(vs);
		}
		this.scroller.setContentNodes(this.views.getContentNodes());
	},
	
	setStructure: function(inStructure){
		// summary:
		//		Install a new structure and rebuild the grid.
		// inStructure: Object
		//		Structure object defines the grid layout and provides various
		//		options for grid views and columns
		//	description:
		//		A grid structure is an array of view objects. A view object can
		//		specify a view type (view class), width, noscroll (boolean flag
		//		for view scrolling), and cells. Cells is an array of objects
		//		corresponding to each grid column. The view cells object is an
		//		array of subrows comprising a single row. Each subrow is an
		//		array of column objects. A column object can have a name,
		//		width, value (default), get function to provide data, styles,
		//		and span attributes (rowSpan, colSpan).

		this.views.destroyViews();
		this.structure = inStructure;
		if((this.structure)&&(dojo.isString(this.structure))){
			this.structure=dojox.grid.getProp(this.structure);
		}
		if(!this.structure){
			this.structure=window["layout"];
		}
		if(!this.structure){
			return;
		}
		this.layout.setStructure(this.structure);
		this._structureChanged();
	},

	_structureChanged: function() {
		this.buildViews();
		if(this.autoRender){
			this.render();
		}
	},

	hasLayout: function() {
		return this.layout.cells.length;
	},

	// sizing
	resize: function(sizeBox){
	// summary:
		//		Update the grid's rendering dimensions and resize it
		// sizeBox: Object?
		//		{w: int, h: int, l: int, t: int}
		
		// FIXME: If grid is not sized explicitly, sometimes bogus scrollbars 
		// can appear in our container, which may require an extra call to 'resize'
		// to sort out.
		this._sizeBox = sizeBox;
		this._resize();
		this.sizeChange();
	},
	
	_getPadBorder: function() {
		this._padBorder = this._padBorder || dojo._getPadBorderExtents(this.domNode);
		return this._padBorder;
	},
	
	_resize: function(){
		// if we have set up everything except the DOM, we cannot resize
		if(!this.domNode.parentNode || this.domNode.parentNode.nodeType != 1 || !this.hasLayout()){
			return;
		}
		// useful measurement
		var padBorder = this._getPadBorder();
		// grid height
		if(this.autoHeight){
			this.domNode.style.height = 'auto';
			this.viewsNode.style.height = '';
		}else if(this.flex > 0){
		}else if(this.domNode.clientHeight <= padBorder.h){
			if(this.domNode.parentNode == document.body){
				this.domNode.style.height = this.defaultHeight;
			}else{
				this.fitTo = "parent";
			}
		}
		// if we are given dimensions, size the grid's domNode to those dimensions
		if(this._sizeBox){
			dojo.contentBox(this.domNode, this._sizeBox);
		}else if(this.fitTo == "parent"){
			var h = dojo._getContentBox(this.domNode.parentNode).h;
			dojo.marginBox(this.domNode, { h: Math.max(0, h) });
		}
		
		var h = dojo._getContentBox(this.domNode).h;
		if(h == 0 && !this.autoHeight){
			// We need to hide the header, since the Grid is essentially hidden.
			this.viewsHeaderNode.style.display = "none";
		}else{
			// Otherwise, show the header and give it an appropriate height.
			this.viewsHeaderNode.style.display = "block";
		}
		
		// NOTE: it is essential that width be applied before height
		// Header height can only be calculated properly after view widths have been set.
		// This is because flex column width is naturally 0 in Firefox.
		// Therefore prior to width sizing flex columns with spaces are maximally wrapped 
		// and calculated to be too tall.
		this.adaptWidth();
		this.adaptHeight();
		
		// default row height (FIXME: use running average(?), remove magic #)
		this.scroller.defaultRowHeight = this.rows.getDefaultHeightPx() + 1;
		this.postresize();
	},

	adaptWidth: function() {
		// private: sets width and position for views and update grid width if necessary
		var
			w = this.autoWidth ? 0 : this.domNode.clientWidth || (this.domNode.offsetWidth - this._getPadBorder().w);
			vw = this.views.arrange(1, w);
		this.views.onEach("adaptWidth");
		if (this.autoWidth)
			this.domNode.style.width = vw + "px";
	},

	adaptHeight: function(){
		// private: measures and normalizes header height, then sets view heights, and then updates scroller
		var vns = this.viewsHeaderNode.style, t = vns.display == "none" ? 0 : this.views.measureHeader();
		vns.height = t + 'px';
		// header heights are reset during measuring so must be normalized after measuring.
		this.views.normalizeHeaderNodeHeight();
		// content extent
		var h = (this.autoHeight ? -1 : Math.max(this.domNode.clientHeight - t, 0) || 0);
		this.views.onEach('setSize', [0, h]);
		this.views.onEach('adaptHeight');
		this.scroller.windowHeight = h; 
	},

	// render 
	render: function(){
		// summary:
		//	Render the grid, headers, and views. Edit and scrolling states are reset. To retain edit and 
		// scrolling states, see Update.

		if(!this.domNode){return;}
		
		if(!this.hasLayout()) {
			this.scroller.init(0, this.keepRows, this.rowsPerPage);
			return;
		}
		//
		this.update = this.defaultUpdate;
		this.scroller.init(this.rowCount, this.keepRows, this.rowsPerPage);
		this.prerender();
		this.setScrollTop(0);
		this.postrender();
	},

	prerender: function(){
		// if autoHeight, make sure scroller knows not to virtualize; everything must be rendered.
		this.keepRows = this.autoHeight ? 0 : this.constructor.prototype.keepRows;
		this.scroller.setKeepInfo(this.keepRows);
		this.views.render();
		this._resize();
	},

	postrender: function(){
		this.postresize();
		this.focus.initFocusView();
		// make rows unselectable
		dojo.setSelectable(this.domNode, false);
	},

	postresize: function(){
		// views are position absolute, so they do not inflate the parent
		if(this.autoHeight){
			this.viewsNode.style.height = this.views.measureContent() + 'px';
		}
	},

	renderRow: function(inRowIndex, inNodes){
		// summary: private, used internally to render rows
		this.views.renderRow(inRowIndex, inNodes);
	},

	rowRemoved: function(inRowIndex){
		// summary: private, used internally to remove rows
		this.views.rowRemoved(inRowIndex);
	},

	invalidated: null,

	updating: false,

	beginUpdate: function(){
		// summary:
		//		Use to make multiple changes to rows while queueing row updating.
		// NOTE: not currently supporting nested begin/endUpdate calls
		this.invalidated = [];
		this.updating = true;
	},

	endUpdate: function(){
		// summary:
		//		Use after calling beginUpdate to render any changes made to rows.
		this.updating = false;
		var i = this.invalidated;
		if(i.all){
			this.update();
		}else if(i.rowCount != undefined){
			this.updateRowCount(i.rowCount);
		}else{
			for(r in i){
				this.updateRow(Number(r));
			}
		}
		this.invalidated = null;
	},

	// update
	defaultUpdate: function(){
		// note: initial update calls render and subsequently this function.
		if(!this.domNode){return;}
		if(this.updating){
			this.invalidated.all = true;
			return;
		}
		//this.edit.saveState(inRowIndex);
		this.prerender();
		this.scroller.invalidateNodes();
		this.setScrollTop(this.scrollTop);
		this.postrender();
		//this.edit.restoreState(inRowIndex);
	},

	update: function(){
		// summary:
		//		Update the grid, retaining edit and scrolling states.
		this.render();
	},

	updateRow: function(inRowIndex){
		// summary:
		//		Render a single row.
		// inRowIndex: Integer
		//		Index of the row to render
		inRowIndex = Number(inRowIndex);
		if(this.updating){
			this.invalidated[inRowIndex]=true;
		}else{
			this.views.updateRow(inRowIndex, this.rows.getHeight(inRowIndex));
			this.scroller.rowHeightChanged(inRowIndex);
		}
	},

	updateRowCount: function(inRowCount){
		//summary: 
		//	Change the number of rows.
		// inRowCount: int
		//	Number of rows in the grid.
		if(this.updating){
			this.invalidated.rowCount = inRowCount;
		}else{
			this.rowCount = inRowCount;
			if(this.layout.cells.length){
				this.scroller.updateRowCount(inRowCount);
				this.setScrollTop(this.scrollTop);
			}
			this._resize();
		}
	},

	updateRowStyles: function(inRowIndex){
		// summary:
		//		Update the styles for a row after it's state has changed.
		this.views.updateRowStyles(inRowIndex);
	},

	rowHeightChanged: function(inRowIndex){
		// summary: 
		//		Update grid when the height of a row has changed. Row height is handled automatically as rows
		//		are rendered. Use this function only to update a row's height outside the normal rendering process.
		// inRowIndex: Integer
		// 		index of the row that has changed height
		
		this.views.renormalizeRow(inRowIndex);
		this.scroller.rowHeightChanged(inRowIndex);
	},
	
	// fastScroll: Boolean
	//		flag modifies vertical scrolling behavior. Defaults to true but set to false for slower 
	//		scroll performance but more immediate scrolling feedback
	fastScroll: true,
	
	delayScroll: false,

	// scrollRedrawThreshold: int
	//	pixel distance a user must scroll vertically to trigger grid scrolling.
	scrollRedrawThreshold: (dojo.isIE ? 100 : 50),

	// scroll methods
	scrollTo: function(inTop){
		// summary:
		//		Vertically scroll the grid to a given pixel position
		// inTop: Integer
		//		vertical position of the grid in pixels
		if(!this.fastScroll){
			this.setScrollTop(inTop);
			return;
		}
		var delta = Math.abs(this.lastScrollTop - inTop);
		this.lastScrollTop = inTop;
		if(delta > this.scrollRedrawThreshold || this.delayScroll){
			this.delayScroll = true;
			this.scrollTop = inTop;
			this.views.setScrollTop(inTop);
			dojox.grid.jobs.job('dojoxGrid-scroll', 200, dojo.hitch(this, "finishScrollJob"));
		}else{
			this.setScrollTop(inTop);
		}
	},
	
	finishScrollJob: function(){
		this.delayScroll = false;
		this.setScrollTop(this.scrollTop);
	},
	
	setScrollTop: function(inTop){
		this.scrollTop = this.views.setScrollTop(inTop);
		this.scroller.scroll(this.scrollTop);
	},
	
	scrollToRow: function(inRowIndex){
		// summary:
		//		Scroll the grid to a specific row.
		// inRowIndex: Integer
		// 		grid row index
		this.setScrollTop(this.scroller.findScrollTop(inRowIndex) + 1);
	},
	
	// styling (private, used internally to style individual parts of a row)
	styleRowNode: function(inRowIndex, inRowNode){
		if(inRowNode){
			this.rows.styleRowNode(inRowIndex, inRowNode);
		}
	},

	// cells
	getCell: function(inIndex){
		// summary:
		//		Retrieves the cell object for a given grid column.
		// inIndex: Integer
		// 		Grid column index of cell to retrieve
		// returns:
		//		a grid cell
		return this.layout.cells[inIndex];
	},

	setCellWidth: function(inIndex, inUnitWidth) {
		this.getCell(inIndex).unitWidth = inUnitWidth;
	},

	getCellName: function(inCell){
		// summary: Returns the cell name of a passed cell
		return "Cell " + inCell.index; // String
	},

	// sorting
	canSort: function(inSortInfo){
		// summary:
		//		Determines if the grid can be sorted
		// inSortInfo: Integer
		//		Sort information, 1-based index of column on which to sort, positive for an ascending sort
		// 		and negative for a descending sort
		// returns: Boolean
		//		True if grid can be sorted on the given column in the given direction
	},
	
	sort: function(){
	},
	
	getSortAsc: function(inSortInfo){
		// summary:
		//		Returns true if grid is sorted in an ascending direction.
		inSortInfo = inSortInfo == undefined ? this.sortInfo : inSortInfo;
		return Boolean(inSortInfo > 0); // Boolean
	},
	
	getSortIndex: function(inSortInfo){
		// summary:
		//		Returns the index of the column on which the grid is sorted
		inSortInfo = inSortInfo == undefined ? this.sortInfo : inSortInfo;
		return Math.abs(inSortInfo) - 1; // Integer
	},
	
	setSortIndex: function(inIndex, inAsc){
		// summary:
		// 		Sort the grid on a column in a specified direction
		// inIndex: Integer
		// 		Column index on which to sort.
		// inAsc: Boolean
		// 		If true, sort the grid in ascending order, otherwise in descending order
		var si = inIndex +1;
		if(inAsc != undefined){
			si *= (inAsc ? 1 : -1);
		} else if(this.getSortIndex() == inIndex){
			si = -this.sortInfo;
		}
		this.setSortInfo(si);
	},
	
	setSortInfo: function(inSortInfo){
		if(this.canSort(inSortInfo)){
			this.sortInfo = inSortInfo;
			this.sort();
			this.update();
		}
	},
	
	// DOM event handler
	doKeyEvent: function(e){
		e.dispatch = 'do' + e.type;
		this.onKeyEvent(e);
	},

	// event dispatch
	//: protected
	_dispatch: function(m, e){
		if(m in this){
			return this[m](e);
		}
	},

	dispatchKeyEvent: function(e){
		this._dispatch(e.dispatch, e);
	},
	
	dispatchContentEvent: function(e){
		this.edit.dispatchEvent(e) || e.sourceView.dispatchContentEvent(e) || this._dispatch(e.dispatch, e);
	},
	
	dispatchHeaderEvent: function(e){
		e.sourceView.dispatchHeaderEvent(e) || this._dispatch('doheader' + e.type, e);
	},
	
	dokeydown: function(e){
		this.onKeyDown(e);
	},
	
	doclick: function(e){
		if(e.cellNode){
			this.onCellClick(e);
		}else{
			this.onRowClick(e);
		}
	},
	
	dodblclick: function(e){
		if(e.cellNode){
			this.onCellDblClick(e);
		}else{
			this.onRowDblClick(e);
		}
	},
	
	docontextmenu: function(e){
		if(e.cellNode){
			this.onCellContextMenu(e);
		}else{
			this.onRowContextMenu(e);
		}
	},
	
	doheaderclick: function(e){
		if(e.cellNode){
			this.onHeaderCellClick(e);
		}else{
			this.onHeaderClick(e);
		}
	},
	
	doheaderdblclick: function(e){
		if(e.cellNode){
			this.onHeaderCellDblClick(e);
		}else{
			this.onHeaderDblClick(e);
		}
	},
	
	doheadercontextmenu: function(e){
		if(e.cellNode){
			this.onHeaderCellContextMenu(e);
		}else{
			this.onHeaderContextMenu(e);
		}
	},
	
	// override to modify editing process
	doStartEdit: function(inCell, inRowIndex){
		this.onStartEdit(inCell, inRowIndex);
	},
	
	doApplyCellEdit: function(inValue, inRowIndex, inFieldIndex){
		this.onApplyCellEdit(inValue, inRowIndex, inFieldIndex);
	},
	
	doCancelEdit: function(inRowIndex){
		this.onCancelEdit(inRowIndex);
	},
	
	doApplyEdit: function(inRowIndex){
		this.onApplyEdit(inRowIndex);
	},
	
	// row editing
	addRow: function(){
		// summary:
		//		Add a row to the grid.
		this.updateRowCount(this.rowCount+1);
	},
	
	removeSelectedRows: function(){
		// summary:
		//		Remove the selected rows from the grid.
		this.updateRowCount(Math.max(0, this.rowCount - this.selection.getSelected().length));
		this.selection.clear();
	}

});

dojo.mixin(dojox.VirtualGrid.prototype, dojox.grid.publicEvents);

}
