if(!dojo._hasResource["dojox.grid._grid.builder"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid._grid.builder"] = true;
dojo.provide("dojox.grid._grid.builder");
dojo.require("dojox.grid._grid.drag");

dojo.declare("dojox.grid.Builder",
	null,
	{
	// summary:
	//		Base class to produce html for grid content.
	//		Also provide event decoration, providing grid related information inside the event object
	// 		passed to grid events.
	constructor: function(inView){
		this.view = inView;
		this.grid = inView.grid;
	},
	
	view: null,
	// boilerplate HTML
	_table: '<table class="dojoxGrid-row-table" border="0" cellspacing="0" cellpadding="0" role="wairole:presentation">',

	// generate starting tags for a cell
	generateCellMarkup: function(inCell, inMoreStyles, inMoreClasses, isHeader){
		var result = [], html;
		if (isHeader){
			html = [ '<th tabIndex="-1" role="wairole:columnheader"' ];
		}else{
			html = [ '<td tabIndex="-1" role="wairole:gridcell"' ];
		}
		inCell.colSpan && html.push(' colspan="', inCell.colSpan, '"');
		inCell.rowSpan && html.push(' rowspan="', inCell.rowSpan, '"');
		html.push(' class="dojoxGrid-cell ');
		inCell.classes && html.push(inCell.classes, ' ');
		inMoreClasses && html.push(inMoreClasses, ' ');
		// result[0] => td opener, style
		result.push(html.join(''));
		// SLOT: result[1] => td classes 
		result.push('');
		html = ['" idx="', inCell.index, '" style="'];
		html.push(inCell.styles, inMoreStyles||'');
		inCell.unitWidth && html.push('width:', inCell.unitWidth, ';');
		// result[2] => markup
		result.push(html.join(''));
		// SLOT: result[3] => td style 
		result.push('');
		html = [ '"' ];
		inCell.attrs && html.push(" ", inCell.attrs);
		html.push('>');
		// result[4] => td postfix
		result.push(html.join(''));
		// SLOT: result[5] => content
		result.push('');
		// result[6] => td closes
		result.push('</td>');
		return result; // Array
	},

	// cell finding
	isCellNode: function(inNode){
		return Boolean(inNode && inNode.getAttribute && inNode.getAttribute("idx"));
	},
	
	getCellNodeIndex: function(inCellNode){
		return inCellNode ? Number(inCellNode.getAttribute("idx")) : -1;
	},
	
	getCellNode: function(inRowNode, inCellIndex){
		for(var i=0, row; row=dojox.grid.getTr(inRowNode.firstChild, i); i++){
			for(var j=0, cell; cell=row.cells[j]; j++){
				if(this.getCellNodeIndex(cell) == inCellIndex){
					return cell;
				}
			}
		}
	},
	
	findCellTarget: function(inSourceNode, inTopNode){
		var n = inSourceNode;
		while(n && (!this.isCellNode(n) || (dojox.grid.gridViewTag in n.offsetParent.parentNode && n.offsetParent.parentNode[dojox.grid.gridViewTag] != this.view.id)) && (n!=inTopNode)){
			n = n.parentNode;
		}
		return n!=inTopNode ? n : null 
	},
	
	// event decoration
	baseDecorateEvent: function(e){
		e.dispatch = 'do' + e.type;
		e.grid = this.grid;
		e.sourceView = this.view;
		e.cellNode = this.findCellTarget(e.target, e.rowNode);
		e.cellIndex = this.getCellNodeIndex(e.cellNode);
		e.cell = (e.cellIndex >= 0 ? this.grid.getCell(e.cellIndex) : null);
	},
	
	// event dispatch
	findTarget: function(inSource, inTag){
		var n = inSource;
		while(n && (n!=this.domNode) && (!(inTag in n) || (dojox.grid.gridViewTag in n && n[dojox.grid.gridViewTag] != this.view.id))){
			n = n.parentNode;
		}
		return (n != this.domNode) ? n : null; 
	},

	findRowTarget: function(inSource){
		return this.findTarget(inSource, dojox.grid.rowIndexTag);
	},

	isIntraNodeEvent: function(e){
		try{
			return (e.cellNode && e.relatedTarget && dojo.isDescendant(e.relatedTarget, e.cellNode));
		}catch(x){
			// e.relatedTarget has permission problem in FF if it's an input: https://bugzilla.mozilla.org/show_bug.cgi?id=208427
			return false;
		}
	},

	isIntraRowEvent: function(e){
		try{
			var row = e.relatedTarget && this.findRowTarget(e.relatedTarget);
			return !row && (e.rowIndex==-1) || row && (e.rowIndex==row.gridRowIndex);			
		}catch(x){
			// e.relatedTarget on INPUT has permission problem in FF: https://bugzilla.mozilla.org/show_bug.cgi?id=208427
			return false;
		}
	},

	dispatchEvent: function(e){
		if(e.dispatch in this){
			return this[e.dispatch](e);
		}
	},

	// dispatched event handlers
	domouseover: function(e){
		if(e.cellNode && (e.cellNode!=this.lastOverCellNode)){
			this.lastOverCellNode = e.cellNode;
			this.grid.onMouseOver(e);
		}
		this.grid.onMouseOverRow(e);
	},

	domouseout: function(e){
		if(e.cellNode && (e.cellNode==this.lastOverCellNode) && !this.isIntraNodeEvent(e, this.lastOverCellNode)){
			this.lastOverCellNode = null;
			this.grid.onMouseOut(e);
			if(!this.isIntraRowEvent(e)){
				this.grid.onMouseOutRow(e);
			}
		}
	},
	
	domousedown: function(e){
		if (e.cellNode)
			this.grid.onMouseDown(e);
		this.grid.onMouseDownRow(e)
	}

});

dojo.declare("dojox.grid.contentBuilder",
	dojox.grid.Builder,
	{
	// summary:
	//		Produces html for grid data content. Owned by grid and used internally 
	//		for rendering data. Override to implement custom rendering.
	update: function(){
		this.prepareHtml();
	},

	// cache html for rendering data rows
	prepareHtml: function(){
		var defaultGet=this.grid.get, rows=this.view.structure.rows;
		for(var j=0, row; (row=rows[j]); j++){
			for(var i=0, cell; (cell=row[i]); i++){
				cell.get = cell.get || (cell.value == undefined) && defaultGet;
				cell.markup = this.generateCellMarkup(cell, cell.cellStyles, cell.cellClasses, false);
			}
		}
	},

	// time critical: generate html using cache and data source
	generateHtml: function(inDataIndex, inRowIndex){
		var
			html = [ this._table ],
			v = this.view,
			obr = v.onBeforeRow,
			rows = v.structure.rows;

		obr && obr(inRowIndex, rows);
		for(var j=0, row; (row=rows[j]); j++){
			if(row.hidden || row.header){
				continue;
			}
			html.push(!row.invisible ? '<tr>' : '<tr class="dojoxGrid-invisible">');
			for(var i=0, cell, m, cc, cs; (cell=row[i]); i++){
				m = cell.markup, cc = cell.customClasses = [], cs = cell.customStyles = [];
				// content (format can fill in cc and cs as side-effects)
				m[5] = cell.format(inDataIndex);
				// classes
				m[1] = cc.join(' ');
				// styles
				m[3] = cs.join(';');
				// in-place concat
				html.push.apply(html, m);
			}
			html.push('</tr>');
		}
		html.push('</table>');
		return html.join(''); // String
	},

	decorateEvent: function(e){
		e.rowNode = this.findRowTarget(e.target);
		if(!e.rowNode){return false};
		e.rowIndex = e.rowNode[dojox.grid.rowIndexTag];
		this.baseDecorateEvent(e);
		e.cell = this.grid.getCell(e.cellIndex);
		return true; // Boolean
	}
	
});

dojo.declare("dojox.grid.headerBuilder",
	dojox.grid.Builder,
	{
	// summary:
	//		Produces html for grid header content. Owned by grid and used internally 
	//		for rendering data. Override to implement custom rendering.

	bogusClickTime: 0,
	overResizeWidth: 4,
	minColWidth: 1,
	
	// FIXME: isn't this getting mixed from dojox.grid.Builder, -1 character?
	_table: '<table class="dojoxGrid-row-table" border="0" cellspacing="0" cellpadding="0" role="wairole:presentation"',

	update: function(){
		this.tableMap = new dojox.grid.tableMap(this.view.structure.rows);
	},

	generateHtml: function(inGetValue, inValue){
		var html = [this._table], rows = this.view.structure.rows;
		
		// render header with appropriate width, if possible so that views with flex columns are correct height
		if(this.view.viewWidth){
			html.push([' style="width:', this.view.viewWidth, ';"'].join(''));
		}
		html.push('>');
		dojox.grid.fire(this.view, "onBeforeRow", [-1, rows]);
		for(var j=0, row; (row=rows[j]); j++){
			if(row.hidden){
				continue;
			}
			html.push(!row.invisible ? '<tr>' : '<tr class="dojoxGrid-invisible">');
			for(var i=0, cell, markup; (cell=row[i]); i++){
				cell.customClasses = [];
				cell.customStyles = [];
				markup = this.generateCellMarkup(cell, cell.headerStyles, cell.headerClasses, true);
				// content
				markup[5] = (inValue != undefined ? inValue : inGetValue(cell));
				// styles
				markup[3] = cell.customStyles.join(';');
				// classes
				markup[1] = cell.customClasses.join(' '); //(cell.customClasses ? ' ' + cell.customClasses : '');
				html.push(markup.join(''));
			}
			html.push('</tr>');
		}
		html.push('</table>');
		return html.join('');
	},

	// event helpers
	getCellX: function(e){
		var x = e.layerX;
		if(dojo.isMoz){
			var n = dojox.grid.ascendDom(e.target, dojox.grid.makeNotTagName("th"));
			x -= (n && n.offsetLeft) || 0;
			var t = e.sourceView.getScrollbarWidth();
			if(!dojo._isBodyLtr() && e.sourceView.headerNode.scrollLeft < t)
				x -= t;
			//x -= getProp(ascendDom(e.target, mkNotTagName("td")), "offsetLeft") || 0;
		}
		var n = dojox.grid.ascendDom(e.target, function(){
			if(!n || n == e.cellNode){
				return false;
			}
			// Mozilla 1.8 (FF 1.5) has a bug that makes offsetLeft = -parent border width
			// when parent has border, overflow: hidden, and is positioned
			// handle this problem here ... not a general solution!
			x += (n.offsetLeft < 0 ? 0 : n.offsetLeft);
			return true;
		});
		return x;
	},

	// event decoration
	decorateEvent: function(e){
		this.baseDecorateEvent(e);
		e.rowIndex = -1;
		e.cellX = this.getCellX(e);
		return true;
	},

	// event handlers
	// resizing
	prepareResize: function(e, mod){
		var i = dojox.grid.getTdIndex(e.cellNode);
		e.cellNode = (i ? e.cellNode.parentNode.cells[i+mod] : null);
		e.cellIndex = (e.cellNode ? this.getCellNodeIndex(e.cellNode) : -1);
		return Boolean(e.cellNode);
	},

	canResize: function(e){
		if(!e.cellNode || e.cellNode.colSpan > 1){
			return false;
		}
		var cell = this.grid.getCell(e.cellIndex); 
		return !cell.noresize && !cell.isFlex();
	},

	overLeftResizeArea: function(e){
		if(dojo._isBodyLtr()){
			return (e.cellIndex>0) && (e.cellX < this.overResizeWidth) && this.prepareResize(e, -1);
		}
		return t = e.cellNode && (e.cellX < this.overResizeWidth);
	},

	overRightResizeArea: function(e){
		if(dojo._isBodyLtr()){
			return e.cellNode && (e.cellX >= e.cellNode.offsetWidth - this.overResizeWidth);
		}
		return (e.cellIndex>0) && (e.cellX >= e.cellNode.offsetWidth - this.overResizeWidth) && this.prepareResize(e, -1);
	},

	domousemove: function(e){
		//console.log(e.cellIndex, e.cellX, e.cellNode.offsetWidth);
		var c = (this.overRightResizeArea(e) ? 'e-resize' : (this.overLeftResizeArea(e) ? 'w-resize' : ''));
		if(c && !this.canResize(e)){
			c = 'not-allowed';
		}
		e.sourceView.headerNode.style.cursor = c || ''; //'default';
		if (c)
			dojo.stopEvent(e);
	},

	domousedown: function(e){
		if(!dojox.grid.drag.dragging){
			if((this.overRightResizeArea(e) || this.overLeftResizeArea(e)) && this.canResize(e)){
				this.beginColumnResize(e);
			}else{
				this.grid.onMouseDown(e);
				this.grid.onMouseOverRow(e);
			}
			//else{
			//	this.beginMoveColumn(e);
			//}
		}
	},

	doclick: function(e) {
		if (new Date().getTime() < this.bogusClickTime) {
			dojo.stopEvent(e);
			return true;
		}
	},

	// column resizing
	beginColumnResize: function(e){
		dojo.stopEvent(e);
		var spanners = [], nodes = this.tableMap.findOverlappingNodes(e.cellNode);
		for(var i=0, cell; (cell=nodes[i]); i++){
			spanners.push({ node: cell, index: this.getCellNodeIndex(cell), width: cell.offsetWidth });
			//console.log("spanner: " + this.getCellNodeIndex(cell));
		}
		var drag = {
			scrollLeft: e.sourceView.headerNode.scrollLeft,
			view: e.sourceView,
			node: e.cellNode,
			index: e.cellIndex,
			w: e.cellNode.clientWidth,
			spanners: spanners
		};
		//console.log(drag.index, drag.w);
		dojox.grid.drag.start(e.cellNode, dojo.hitch(this, 'doResizeColumn', drag), dojo.hitch(this, 'endResizeColumn', drag), e);
	},

	doResizeColumn: function(inDrag, inEvent){
		var isLtr = dojo._isBodyLtr();
		if(isLtr){
			var w = inDrag.w + inEvent.deltaX;
		}else{
			var w = inDrag.w - inEvent.deltaX;
		}
		if(w >= this.minColWidth){
			for(var i=0, s, sw; (s=inDrag.spanners[i]); i++){
				if(isLtr){
					sw = s.width + inEvent.deltaX;
				}else{
					sw = s.width - inEvent.deltaX;
				}
				s.node.style.width = sw + 'px';
				inDrag.view.setColWidth(s.index, sw);
				//console.log('setColWidth', '#' + s.index, sw + 'px');
			}
			inDrag.node.style.width = w + 'px';
			inDrag.view.setColWidth(inDrag.index, w);
			if(!isLtr){
				inDrag.view.headerNode.scrollLeft = (inDrag.scrollLeft - inEvent.deltaX);
			}
		}
		if(inDrag.view.flexCells && !inDrag.view.testFlexCells()){
			var t = dojox.grid.findTable(inDrag.node);
			t && (t.style.width = '');
		}
	},

	endResizeColumn: function(inDrag){
		this.bogusClickTime = new Date().getTime() + 30;
		setTimeout(dojo.hitch(inDrag.view, "update"), 50);
	}

});

dojo.declare("dojox.grid.tableMap",
	null,
	{
	// summary:
	//		Maps an html table into a structure parsable for information about cell row and col spanning.
	//		Used by headerBuilder
	constructor: function(inRows){
		this.mapRows(inRows);
	},
	
	map: null,

	mapRows: function(inRows){
		// summary: Map table topography

		//console.log('mapRows');
		// # of rows
		var rowCount = inRows.length;
		if(!rowCount){
			return;
		}
		// map which columns and rows fill which cells
		this.map = [ ];
		for(var j=0, row; (row=inRows[j]); j++){
			this.map[j] = [];
		}
		for(var j=0, row; (row=inRows[j]); j++){
			for(var i=0, x=0, cell, colSpan, rowSpan; (cell=row[i]); i++){
				while (this.map[j][x]){x++};
				this.map[j][x] = { c: i, r: j };
				rowSpan = cell.rowSpan || 1;
				colSpan = cell.colSpan || 1;
				for(var y=0; y<rowSpan; y++){
					for(var s=0; s<colSpan; s++){
						this.map[j+y][x+s] = this.map[j][x];
					}
				}
				x += colSpan;
			}
		}
		//this.dumMap();
	},

	dumpMap: function(){
		for(var j=0, row, h=''; (row=this.map[j]); j++,h=''){
			for(var i=0, cell; (cell=row[i]); i++){
				h += cell.r + ',' + cell.c + '   ';
			}
			console.log(h);
		}
	},

	getMapCoords: function(inRow, inCol){
		// summary: Find node's map coords by it's structure coords
		for(var j=0, row; (row=this.map[j]); j++){
			for(var i=0, cell; (cell=row[i]); i++){
				if(cell.c==inCol && cell.r == inRow){
					return { j: j, i: i };
				}
				//else{console.log(inRow, inCol, ' : ', i, j, " : ", cell.r, cell.c); };
			}
		}
		return { j: -1, i: -1 };
	},
	
	getNode: function(inTable, inRow, inCol){
		// summary: Find a node in inNode's table with the given structure coords
		var row = inTable && inTable.rows[inRow];
		return row && row.cells[inCol];
	},
	
	_findOverlappingNodes: function(inTable, inRow, inCol){
		var nodes = [];
		var m = this.getMapCoords(inRow, inCol);
		//console.log("node j: %d, i: %d", m.j, m.i);
		var row = this.map[m.j];
		for(var j=0, row; (row=this.map[j]); j++){
			if(j == m.j){ continue; }
			with(row[m.i]){
				//console.log("overlaps: r: %d, c: %d", r, c);
				var n = this.getNode(inTable, r, c);
				if(n){ nodes.push(n); }
			}
		}
		//console.log(nodes);
		return nodes;
	},
	
	findOverlappingNodes: function(inNode){
		return this._findOverlappingNodes(dojox.grid.findTable(inNode), dojox.grid.getTrIndex(inNode.parentNode), dojox.grid.getTdIndex(inNode));
	}
	
});

dojox.grid.rowIndexTag = "gridRowIndex";
dojox.grid.gridViewTag = "gridView";

}
