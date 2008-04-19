if(!dojo._hasResource['dojox.grid._grid.scroller']){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource['dojox.grid._grid.scroller'] = true;
dojo.provide('dojox.grid._grid.scroller');

dojo.declare('dojox.grid.scroller.base', null, {
	// summary:
	//	virtual scrollbox, abstract class
	//	Content must in /rows/
	//	Rows are managed in contiguous sets called /pages/
	//	There are a fixed # of rows per page
	//	The minimum rendered unit is a page
	constructor: function(){
		this.pageHeights = [];
		this.stack = [];
	},
	// specified
	rowCount: 0, // total number of rows to manage
	defaultRowHeight: 10, // default height of a row
	keepRows: 100, // maximum number of rows that should exist at one time
	contentNode: null, // node to contain pages
	scrollboxNode: null, // node that controls scrolling
	// calculated
	defaultPageHeight: 0, // default height of a page
	keepPages: 10, // maximum number of pages that should exists at one time
	pageCount: 0,
	windowHeight: 0,
	firstVisibleRow: 0,
	lastVisibleRow: 0,
	// private
	page: 0,
	pageTop: 0,
	// init
	init: function(inRowCount, inKeepRows, inRowsPerPage){
		switch(arguments.length){
			case 3: this.rowsPerPage = inRowsPerPage;
			case 2: this.keepRows = inKeepRows;
			case 1: this.rowCount = inRowCount;
		}
		this.defaultPageHeight = this.defaultRowHeight * this.rowsPerPage;
		//this.defaultPageHeight = this.defaultRowHeight * Math.min(this.rowsPerPage, this.rowCount);
		this.pageCount = Math.ceil(this.rowCount / this.rowsPerPage);
		this.setKeepInfo(this.keepRows);
		this.invalidate();
		if(this.scrollboxNode){
			this.scrollboxNode.scrollTop = 0;
			this.scroll(0);
			this.scrollboxNode.onscroll = dojo.hitch(this, 'onscroll');
		}
	},
	setKeepInfo: function(inKeepRows){
		this.keepRows = inKeepRows;
		this.keepPages = !this.keepRows ? this.keepRows : Math.max(Math.ceil(this.keepRows / this.rowsPerPage), 2);
	},
	// updating
	invalidate: function(){
		this.invalidateNodes();
		this.pageHeights = [];
		this.height = (this.pageCount ? (this.pageCount - 1)* this.defaultPageHeight + this.calcLastPageHeight() : 0);
		this.resize();
	},
	updateRowCount: function(inRowCount){
		this.invalidateNodes();
		this.rowCount = inRowCount;
		// update page count, adjust document height
		oldPageCount = this.pageCount;
		this.pageCount = Math.ceil(this.rowCount / this.rowsPerPage);
		if(this.pageCount < oldPageCount){
			for(var i=oldPageCount-1; i>=this.pageCount; i--){
				this.height -= this.getPageHeight(i);
				delete this.pageHeights[i]
			}
		}else if(this.pageCount > oldPageCount){
			this.height += this.defaultPageHeight * (this.pageCount - oldPageCount - 1) + this.calcLastPageHeight();
		}
		this.resize();
	},
	// abstract interface
	pageExists: function(inPageIndex){
	},
	measurePage: function(inPageIndex){
	},
	positionPage: function(inPageIndex, inPos){
	},
	repositionPages: function(inPageIndex){
	},
	installPage: function(inPageIndex){
	},
	preparePage: function(inPageIndex, inPos, inReuseNode){
	},
	renderPage: function(inPageIndex){
	},
	removePage: function(inPageIndex){
	},
	pacify: function(inShouldPacify){
	},
	// pacification
	pacifying: false,
	pacifyTicks: 200,
	setPacifying: function(inPacifying){
		if(this.pacifying != inPacifying){
			this.pacifying = inPacifying;
			this.pacify(this.pacifying);
		}
	},
	startPacify: function(){
		this.startPacifyTicks = new Date().getTime();
	},
	doPacify: function(){
		var result = (new Date().getTime() - this.startPacifyTicks) > this.pacifyTicks;
		this.setPacifying(true);
		this.startPacify();
		return result;
	},
	endPacify: function(){
		this.setPacifying(false);
	},
	// default sizing implementation
	resize: function(){
		if(this.scrollboxNode){
			this.windowHeight = this.scrollboxNode.clientHeight;
		}
		dojox.grid.setStyleHeightPx(this.contentNode, this.height);
	},
	calcLastPageHeight: function(){
		if(!this.pageCount){
			return 0;
		}
		var lastPage = this.pageCount - 1;
		var lastPageHeight = ((this.rowCount % this.rowsPerPage)||(this.rowsPerPage)) * this.defaultRowHeight;
		this.pageHeights[lastPage] = lastPageHeight;
		return lastPageHeight;
	},
	updateContentHeight: function(inDh){
		this.height += inDh;
		this.resize();
	},
	updatePageHeight: function(inPageIndex){
		if(this.pageExists(inPageIndex)){
			var oh = this.getPageHeight(inPageIndex);
			var h = (this.measurePage(inPageIndex))||(oh);
			this.pageHeights[inPageIndex] = h;
			if((h)&&(oh != h)){
				this.updateContentHeight(h - oh)
				this.repositionPages(inPageIndex);
			}
		}
	},
	rowHeightChanged: function(inRowIndex){
		this.updatePageHeight(Math.floor(inRowIndex / this.rowsPerPage));
	},
	// scroller core
	invalidateNodes: function(){
		while(this.stack.length){
			this.destroyPage(this.popPage());
		}
	},
	createPageNode: function(){
		var p = document.createElement('div');
		p.style.position = 'absolute';
		//p.style.width = '100%';
		p.style[dojo._isBodyLtr() ? "left" : "right"] = '0';
		return p;
	},
	getPageHeight: function(inPageIndex){
		var ph = this.pageHeights[inPageIndex];
		return (ph !== undefined ? ph : this.defaultPageHeight);
	},
	// FIXME: this is not a stack, it's a FIFO list
	pushPage: function(inPageIndex){
		return this.stack.push(inPageIndex);
	},
	popPage: function(){
		return this.stack.shift();
	},
	findPage: function(inTop){
		var i = 0, h = 0;
		for(var ph = 0; i<this.pageCount; i++, h += ph){
			ph = this.getPageHeight(i);
			if(h + ph >= inTop){
				break;
			}
		}
		this.page = i;
		this.pageTop = h;
	},
	buildPage: function(inPageIndex, inReuseNode, inPos){
		this.preparePage(inPageIndex, inReuseNode);
		this.positionPage(inPageIndex, inPos);
		// order of operations is key below
		this.installPage(inPageIndex);
		this.renderPage(inPageIndex);
		// order of operations is key above
		this.pushPage(inPageIndex);
	},
	needPage: function(inPageIndex, inPos){
		var h = this.getPageHeight(inPageIndex), oh = h;
		if(!this.pageExists(inPageIndex)){
			this.buildPage(inPageIndex, this.keepPages&&(this.stack.length >= this.keepPages), inPos);
			h = this.measurePage(inPageIndex) || h;
			this.pageHeights[inPageIndex] = h;
			if(h && (oh != h)){
				this.updateContentHeight(h - oh)
			}
		}else{
			this.positionPage(inPageIndex, inPos);
		}
		return h;
	},
	onscroll: function(){
		this.scroll(this.scrollboxNode.scrollTop);
	},
	scroll: function(inTop){
		this.startPacify();
		this.findPage(inTop);
		var h = this.height;
		var b = this.getScrollBottom(inTop);
		for(var p=this.page, y=this.pageTop; (p<this.pageCount)&&((b<0)||(y<b)); p++){
			y += this.needPage(p, y);
		}
		this.firstVisibleRow = this.getFirstVisibleRow(this.page, this.pageTop, inTop);
		this.lastVisibleRow = this.getLastVisibleRow(p - 1, y, b);
		// indicates some page size has been updated
		if(h != this.height){
			this.repositionPages(p-1);
		}
		this.endPacify();
	},
	getScrollBottom: function(inTop){
		return (this.windowHeight >= 0 ? inTop + this.windowHeight : -1);
	},
	// events
	processNodeEvent: function(e, inNode){
		var t = e.target;
		while(t && (t != inNode) && t.parentNode && (t.parentNode.parentNode != inNode)){
			t = t.parentNode;
		}
		if(!t || !t.parentNode || (t.parentNode.parentNode != inNode)){
			return false;
		}
		var page = t.parentNode;
		e.topRowIndex = page.pageIndex * this.rowsPerPage;
		e.rowIndex = e.topRowIndex + dojox.grid.indexInParent(t);
		e.rowTarget = t;
		return true;
	},
	processEvent: function(e){
		return this.processNodeEvent(e, this.contentNode);
	},
	dummy: 0
});

dojo.declare('dojox.grid.scroller', dojox.grid.scroller.base, {
	// summary:
	//	virtual scroller class, makes no assumption about shape of items being scrolled
	constructor: function(){
		this.pageNodes = [];
	},
	// virtual rendering interface
	renderRow: function(inRowIndex, inPageNode){
	},
	removeRow: function(inRowIndex){
	},
	// page node operations
	getDefaultNodes: function(){
		return this.pageNodes;
	},
	getDefaultPageNode: function(inPageIndex){
		return this.getDefaultNodes()[inPageIndex];
	},
	positionPageNode: function(inNode, inPos){
		inNode.style.top = inPos + 'px';
	},
	getPageNodePosition: function(inNode){
		return inNode.offsetTop;
	},
	repositionPageNodes: function(inPageIndex, inNodes){
		var last = 0;
		for(var i=0; i<this.stack.length; i++){
			last = Math.max(this.stack[i], last);
		}
		//
		var n = inNodes[inPageIndex];
		var y = (n ? this.getPageNodePosition(n) + this.getPageHeight(inPageIndex) : 0);
		//console.log('detected height change, repositioning from #%d (%d) @ %d ', inPageIndex + 1, last, y, this.pageHeights[0]);
		//
		for(var p=inPageIndex+1; p<=last; p++){
			n = inNodes[p];
			if(n){
				//console.log('#%d @ %d', inPageIndex, y, this.getPageNodePosition(n));
				if(this.getPageNodePosition(n) == y){
					return;
				}
				//console.log('placing page %d at %d', p, y);
				this.positionPage(p, y);
			}
			y += this.getPageHeight(p);
		}
	},
	invalidatePageNode: function(inPageIndex, inNodes){
		var p = inNodes[inPageIndex];
		if(p){
			delete inNodes[inPageIndex];
			this.removePage(inPageIndex, p);
			dojox.grid.cleanNode(p);
			p.innerHTML = '';
		}
		return p;
	},
	preparePageNode: function(inPageIndex, inReusePageIndex, inNodes){
		var p = (inReusePageIndex === null ? this.createPageNode() : this.invalidatePageNode(inReusePageIndex, inNodes));
		p.pageIndex = inPageIndex;
		p.id = (this._pageIdPrefix || "") + 'page-' + inPageIndex;
		inNodes[inPageIndex] = p;
	},
	// implementation for page manager
	pageExists: function(inPageIndex){
		return Boolean(this.getDefaultPageNode(inPageIndex));
	},
	measurePage: function(inPageIndex){
		return this.getDefaultPageNode(inPageIndex).offsetHeight;
	},
	positionPage: function(inPageIndex, inPos){
		this.positionPageNode(this.getDefaultPageNode(inPageIndex), inPos);
	},
	repositionPages: function(inPageIndex){
		this.repositionPageNodes(inPageIndex, this.getDefaultNodes());
	},
	preparePage: function(inPageIndex, inReuseNode){
		this.preparePageNode(inPageIndex, (inReuseNode ? this.popPage() : null), this.getDefaultNodes());
	},
	installPage: function(inPageIndex){
		this.contentNode.appendChild(this.getDefaultPageNode(inPageIndex));
	},
	destroyPage: function(inPageIndex){
		var p = this.invalidatePageNode(inPageIndex, this.getDefaultNodes());
		dojox.grid.removeNode(p);
	},
	// rendering implementation
	renderPage: function(inPageIndex){
		var node = this.pageNodes[inPageIndex];
		for(var i=0, j=inPageIndex*this.rowsPerPage; (i<this.rowsPerPage)&&(j<this.rowCount); i++, j++){
			this.renderRow(j, node);
		}
	},
	removePage: function(inPageIndex){
		for(var i=0, j=inPageIndex*this.rowsPerPage; i<this.rowsPerPage; i++, j++){
			this.removeRow(j);
		}
	},
	// scroll control
	getPageRow: function(inPage){
		return inPage * this.rowsPerPage;
	},
	getLastPageRow: function(inPage){
		return Math.min(this.rowCount, this.getPageRow(inPage + 1)) - 1;
	},
	getFirstVisibleRowNodes: function(inPage, inPageTop, inScrollTop, inNodes){
		var row = this.getPageRow(inPage);
		var rows = dojox.grid.divkids(inNodes[inPage]);
		for(var i=0,l=rows.length; i<l && inPageTop<inScrollTop; i++, row++){
			inPageTop += rows[i].offsetHeight;
		}
		return (row ? row - 1 : row);
	},
	getFirstVisibleRow: function(inPage, inPageTop, inScrollTop){
		if(!this.pageExists(inPage)){
			return 0;
		}
		return this.getFirstVisibleRowNodes(inPage, inPageTop, inScrollTop, this.getDefaultNodes());
	},
	getLastVisibleRowNodes: function(inPage, inBottom, inScrollBottom, inNodes){
		var row = this.getLastPageRow(inPage);
		var rows = dojox.grid.divkids(inNodes[inPage]);
		for(var i=rows.length-1; i>=0 && inBottom>inScrollBottom; i--, row--){
			inBottom -= rows[i].offsetHeight;
		}
		return row + 1;
	},
	getLastVisibleRow: function(inPage, inBottom, inScrollBottom){
		if(!this.pageExists(inPage)){
			return 0;
		}
		return this.getLastVisibleRowNodes(inPage, inBottom, inScrollBottom, this.getDefaultNodes());
	},
	findTopRowForNodes: function(inScrollTop, inNodes){
		var rows = dojox.grid.divkids(inNodes[this.page]);
		for(var i=0,l=rows.length,t=this.pageTop,h; i<l; i++){
			h = rows[i].offsetHeight;
			t += h;
			if(t >= inScrollTop){
				this.offset = h - (t - inScrollTop);
				return i + this.page * this.rowsPerPage;
			}
		}
		return -1;
	},
	findScrollTopForNodes: function(inRow, inNodes){
		var rowPage = Math.floor(inRow / this.rowsPerPage);
		var t = 0;
		for(var i=0; i<rowPage; i++){
			t += this.getPageHeight(i);
		}
		this.pageTop = t;
		this.needPage(rowPage, this.pageTop);
		var rows = dojox.grid.divkids(inNodes[rowPage]);
		var r = inRow - this.rowsPerPage * rowPage;
		for(var i=0,l=rows.length; i<l && i<r; i++){
			t += rows[i].offsetHeight;
		}
		return t;
	},
	findTopRow: function(inScrollTop){
		return this.findTopRowForNodes(inScrollTop, this.getDefaultNodes());
	},
	findScrollTop: function(inRow){
		return this.findScrollTopForNodes(inRow, this.getDefaultNodes());
	},
	dummy: 0
});

dojo.declare('dojox.grid.scroller.columns', dojox.grid.scroller, {
	// summary:
	//	Virtual scroller class that scrolls list of columns. Owned by grid and used internally
	//	for virtual scrolling.
	constructor: function(inContentNodes){
		this.setContentNodes(inContentNodes);
	},
	// nodes
	setContentNodes: function(inNodes){
		this.contentNodes = inNodes;
		this.colCount = (this.contentNodes ? this.contentNodes.length : 0);
		this.pageNodes = [];
		for(var i=0; i<this.colCount; i++){
			this.pageNodes[i] = [];
		}
	},
	getDefaultNodes: function(){
		return this.pageNodes[0] || [];
	},
	scroll: function(inTop) {
		if(this.colCount){
			dojox.grid.scroller.prototype.scroll.call(this, inTop);
		}
	},
	// resize
	resize: function(){
		if(this.scrollboxNode){
			this.windowHeight = this.scrollboxNode.clientHeight;
		}
		for(var i=0; i<this.colCount; i++){
			dojox.grid.setStyleHeightPx(this.contentNodes[i], this.height);
		}
	},
	// implementation for page manager
	positionPage: function(inPageIndex, inPos){
		for(var i=0; i<this.colCount; i++){
			this.positionPageNode(this.pageNodes[i][inPageIndex], inPos);
		}
	},
	preparePage: function(inPageIndex, inReuseNode){
		var p = (inReuseNode ? this.popPage() : null);
		for(var i=0; i<this.colCount; i++){
			this.preparePageNode(inPageIndex, p, this.pageNodes[i]);
		}
	},
	installPage: function(inPageIndex){
		for(var i=0; i<this.colCount; i++){
			this.contentNodes[i].appendChild(this.pageNodes[i][inPageIndex]);
		}
	},
	destroyPage: function(inPageIndex){
		for(var i=0; i<this.colCount; i++){
			dojox.grid.removeNode(this.invalidatePageNode(inPageIndex, this.pageNodes[i]));
		}
	},
	// rendering implementation
	renderPage: function(inPageIndex){
		var nodes = [];
		for(var i=0; i<this.colCount; i++){
			nodes[i] = this.pageNodes[i][inPageIndex];
		}
		//this.renderRows(inPageIndex*this.rowsPerPage, this.rowsPerPage, nodes);
		for(var i=0, j=inPageIndex*this.rowsPerPage; (i<this.rowsPerPage)&&(j<this.rowCount); i++, j++){
			this.renderRow(j, nodes);
		}
	}
});

}
