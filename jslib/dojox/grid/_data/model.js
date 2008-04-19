if(!dojo._hasResource['dojox.grid._data.model']){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource['dojox.grid._data.model'] = true;
dojo.provide('dojox.grid._data.model');
dojo.require('dojox.grid._data.fields');

dojo.declare("dojox.grid.data.Model", null, {
	// summary:
	//	Base abstract grid data model.
	//	Makes no assumptions about the structure of grid data.
	constructor: function(inFields, inData){
		this.observers = [];
		this.fields = new dojox.grid.data.Fields();
		if(inFields){
			this.fields.set(inFields);
		}
		this.setData(inData);
	},
	count: 0,
	updating: 0,
	// observers 
	observer: function(inObserver, inPrefix){
		this.observers.push({o: inObserver, p: inPrefix||'model' });
	},
	notObserver: function(inObserver){
		for(var i=0, m, o; (o=this.observers[i]); i++){
			if(o.o==inObserver){
				this.observers.splice(i, 1);
				return;
			}
		}
	},
	notify: function(inMsg, inArgs){
		if(!this.isUpdating()){
			var a = inArgs || [];
			for(var i=0, m, o; (o=this.observers[i]); i++){
				m = o.p + inMsg; o = o.o;
				(m in o)&&(o[m].apply(o, a));
			}
		}
	},
	// updates
	clear: function(){
		this.fields.clear();
		this.clearData();
	},
	beginUpdate: function(){
		this.updating++;
	},
	endUpdate: function(){
		if(this.updating){
			this.updating--;
		}
		/*if(this.updating){
			if(!(--this.updating)){
				this.change();
			}
		}
		}*/
	},
	isUpdating: function(){
		return Boolean(this.updating);
	},
	// data
	clearData: function(){
		this.setData(null);
	},
	// observer events
	change: function(){
		this.notify("Change", arguments);
	},
	insertion: function(/* index */){
		this.notify("Insertion", arguments);
		this.notify("Change", arguments);
	},
	removal: function(/* keys */){
		this.notify("Removal", arguments);
		this.notify("Change", arguments);
	},
	// insert
	insert: function(inData /*, index */){
		if(!this._insert.apply(this, arguments)){
			return false;
		}
		this.insertion.apply(this, dojo._toArray(arguments, 1));
		return true;
	},
	// remove
	remove: function(inData /*, index */){
		if(!this._remove.apply(this, arguments)){
			return false;
		}
		this.removal.apply(this, arguments);
		return true;
	},
	// sort
	canSort: function(/* (+|-)column_index+1, ... */){
		return this.sort != null;
	},
	generateComparator: function(inCompare, inField, inTrueForAscend, inSubCompare){
		return function(a, b){
			var ineq = inCompare(a[inField], b[inField]);
			return ineq ? (inTrueForAscend ? ineq : -ineq) : inSubCompare && inSubCompare(a, b);
		}
	},
	makeComparator: function(inIndices){
		var idx, col, field, result = null;
		for(var i=inIndices.length-1; i>=0; i--){
			idx = inIndices[i];
			col = Math.abs(idx) - 1;
			if(col >= 0){
				field = this.fields.get(col);
				result = this.generateComparator(field.compare, field.key, idx > 0, result);
			}
		}
		return result;
	},
	sort: null,
	dummy: 0
});

dojo.declare("dojox.grid.data.Rows", dojox.grid.data.Model, {
	// observer events
	allChange: function(){
		this.notify("AllChange", arguments);
		this.notify("Change", arguments);
	},
	rowChange: function(){
		this.notify("RowChange", arguments);
	},
	datumChange: function(){
		this.notify("DatumChange", arguments);
	},
	// copyRow: function(inRowIndex); // abstract
	// update
	beginModifyRow: function(inRowIndex){
		if(!this.cache[inRowIndex]){
			this.cache[inRowIndex] = this.copyRow(inRowIndex);
		}
	},
	endModifyRow: function(inRowIndex){
		var cache = this.cache[inRowIndex];
		if(cache){
			var data = this.getRow(inRowIndex);
			if(!dojox.grid.arrayCompare(cache, data)){
				this.update(cache, data, inRowIndex);
			}
			delete this.cache[inRowIndex];
		}
	},
	cancelModifyRow: function(inRowIndex){
		var cache = this.cache[inRowIndex];
		if(cache){
			this.setRow(cache, inRowIndex);
			delete this.cache[inRowIndex];
		}
	}
});

dojo.declare("dojox.grid.data.Table", dojox.grid.data.Rows, {
	// summary:
	//	Basic grid data model for static data in the form of an array of rows
	//	that are arrays of cell data
	constructor: function(){
		this.cache = [];
	},
	colCount: 0, // tables introduce cols
	data: null,
	cache: null,
	// morphology
	measure: function(){
		this.count = this.getRowCount();
		this.colCount = this.getColCount();
		this.allChange();
		//this.notify("Measure");
	},
	getRowCount: function(){
		return (this.data ? this.data.length : 0);
	},
	getColCount: function(){
		return (this.data && this.data.length ? this.data[0].length : this.fields.count());
	},
	badIndex: function(inCaller, inDescriptor){
		console.debug('dojox.grid.data.Table: badIndex');
	},
	isGoodIndex: function(inRowIndex, inColIndex){
		return (inRowIndex >= 0 && inRowIndex < this.count && (arguments.length < 2 || (inColIndex >= 0 && inColIndex < this.colCount)));
	},
	// access
	getRow: function(inRowIndex){
		return this.data[inRowIndex];
	},
	copyRow: function(inRowIndex){
		return this.getRow(inRowIndex).slice(0);
	},
	getDatum: function(inRowIndex, inColIndex){
		return this.data[inRowIndex][inColIndex];
	},
	get: function(){
		throw('Plain "get" no longer supported. Use "getRow" or "getDatum".');
	},
	setData: function(inData){
		this.data = (inData || []);
		this.allChange();
	},
	setRow: function(inData, inRowIndex){
		this.data[inRowIndex] = inData;
		this.rowChange(inData, inRowIndex);
		this.change();
	},
	setDatum: function(inDatum, inRowIndex, inColIndex){
		this.data[inRowIndex][inColIndex] = inDatum;
		this.datumChange(inDatum, inRowIndex, inColIndex);
	},
	set: function(){
		throw('Plain "set" no longer supported. Use "setData", "setRow", or "setDatum".');
	},
	setRows: function(inData, inRowIndex){
		for(var i=0, l=inData.length, r=inRowIndex; i<l; i++, r++){
			this.setRow(inData[i], r);
		}
	},
	// update
	update: function(inOldData, inNewData, inRowIndex){
		//delete this.cache[inRowIndex];	
		//this.setRow(inNewData, inRowIndex);
		return true;
	},
	// insert
	_insert: function(inData, inRowIndex){
		dojox.grid.arrayInsert(this.data, inRowIndex, inData);
		this.count++;
		return true;
	},
	// remove
	_remove: function(inKeys){
		for(var i=inKeys.length-1; i>=0; i--){
			dojox.grid.arrayRemove(this.data, inKeys[i]);
		}
		this.count -= inKeys.length;
		return true;
	},
	// sort
	sort: function(/* (+|-)column_index+1, ... */){
		this.data.sort(this.makeComparator(arguments));
	},
	swap: function(inIndexA, inIndexB){
		dojox.grid.arraySwap(this.data, inIndexA, inIndexB);
		this.rowChange(this.getRow(inIndexA), inIndexA);
		this.rowChange(this.getRow(inIndexB), inIndexB);
		this.change();
	},
	dummy: 0
});

dojo.declare("dojox.grid.data.Objects", dojox.grid.data.Table, {
	constructor: function(inFields, inData, inKey){
		if(!inFields){
			this.autoAssignFields();
		}
	},
	allChange: function(){
		this.notify("FieldsChange");
		this.inherited(arguments);
	},
	autoAssignFields: function(){
		var d = this.data[0], i = 0, field;
		for(var f in d){
			field = this.fields.get(i++);
			if (!dojo.isString(field.key)){
				field.key = f;
			}
		}
	},
	setData: function(inData){
		this.data = (inData || []);
		this.autoAssignFields();
		this.allChange();
	},
	getDatum: function(inRowIndex, inColIndex){
		return this.data[inRowIndex][this.fields.get(inColIndex).key];
	}
});

dojo.declare("dojox.grid.data.Dynamic", dojox.grid.data.Table, {
	// summary:
	//	Grid data model for dynamic data such as data retrieved from a server.
	//	Retrieves data automatically when requested and provides notification when data is received
	constructor: function(){
		this.page = [];
		this.pages = [];
	},
	page: null,
	pages: null,
	rowsPerPage: 100,
	requests: 0,
	bop: -1,
	eop: -1,
	// data
	clearData: function(){
		this.pages = [];
		this.bop = this.eop = -1;
		this.setData([]);
	},
	getRowCount: function(){
		return this.count;
	},
	getColCount: function(){
		return this.fields.count();
	},
	setRowCount: function(inCount){
		this.count = inCount;
		this.change();
	},
	// paging
	requestsPending: function(inBoolean){
	},
	rowToPage: function(inRowIndex){
		return (this.rowsPerPage ? Math.floor(inRowIndex / this.rowsPerPage) : inRowIndex);
	},
	pageToRow: function(inPageIndex){
		return (this.rowsPerPage ? this.rowsPerPage * inPageIndex : inPageIndex);
	},
	requestRows: function(inRowIndex, inCount){
		// summary:
		//		stub. Fill in to perform actual data row fetching logic. The
		//		returning logic must provide the data back to the system via
		//		setRow
	},
	rowsProvided: function(inRowIndex, inCount){
		this.requests--;
		if(this.requests == 0){
			this.requestsPending(false);
		}
	},
	requestPage: function(inPageIndex){
		var row = this.pageToRow(inPageIndex);
		var count = Math.min(this.rowsPerPage, this.count - row);
		if(count > 0){
			this.requests++;
			this.requestsPending(true);
			setTimeout(dojo.hitch(this, "requestRows", row, count), 1);
			//this.requestRows(row, count);
		}
	},
	needPage: function(inPageIndex){
		if(!this.pages[inPageIndex]){
			this.pages[inPageIndex] = true;
			this.requestPage(inPageIndex);
		}
	},
	preparePage: function(inRowIndex, inColIndex){
		if(inRowIndex < this.bop || inRowIndex >= this.eop){
			var pageIndex = this.rowToPage(inRowIndex);
			this.needPage(pageIndex);
			this.bop = pageIndex * this.rowsPerPage;
			this.eop = this.bop + (this.rowsPerPage || this.count);
		}
	},
	isRowLoaded: function(inRowIndex){
		return Boolean(this.data[inRowIndex]);
	},
	// removal
	removePages: function(inRowIndexes){
		for(var i=0, r; ((r=inRowIndexes[i]) != undefined); i++){
			this.pages[this.rowToPage(r)] = false;
		}
		this.bop = this.eop =-1;
	},
	remove: function(inRowIndexes){
		this.removePages(inRowIndexes);
		dojox.grid.data.Table.prototype.remove.apply(this, arguments);
	},
	// access
	getRow: function(inRowIndex){
		var row = this.data[inRowIndex];
		if(!row){
			this.preparePage(inRowIndex);
		}
		return row;
	},
	getDatum: function(inRowIndex, inColIndex){
		var row = this.getRow(inRowIndex);
		return (row ? row[inColIndex] : this.fields.get(inColIndex).na);
	},
	setDatum: function(inDatum, inRowIndex, inColIndex){
		var row = this.getRow(inRowIndex);
		if(row){
			row[inColIndex] = inDatum;
			this.datumChange(inDatum, inRowIndex, inColIndex);
		}else{
			console.debug('[' + this.declaredClass + '] dojox.grid.data.dynamic.set: cannot set data on an non-loaded row');
		}
	},
	// sort
	canSort: function(){
		return false;
	}
});

// FIXME: deprecated: (included for backward compatibility only)
dojox.grid.data.table = dojox.grid.data.Table;
dojox.grid.data.dynamic = dojox.grid.data.Dynamic;

// we treat dojo.data stores as dynamic stores because no matter how they got
// here, they should always fill that contract
dojo.declare("dojox.grid.data.DojoData", dojox.grid.data.Dynamic, {
	//	summary:
	//		A grid data model for dynamic data retreived from a store which
	//		implements the dojo.data API set. Retrieves data automatically when
	//		requested and provides notification when data is received
	//	description:
	//		This store subclasses the Dynamic grid data object in order to
	//		provide paginated data access support, notification and view
	//		updates for stores which support those features, and simple
	//		field/column mapping for all dojo.data stores.
	constructor: function(inFields, inData, args){
		this.count = 1;
		this._rowIdentities = {};
		this._currentlyProcessing = [];
		if(args){
			dojo.mixin(this, args);
		}
		if(this.store){
			var f = this.store.getFeatures();
			this._canNotify = f['dojo.data.api.Notification'];
			this._canWrite = f['dojo.data.api.Write'];
			this._canIdentify = f['dojo.data.api.Identity'];
			if(this._canNotify){
				dojo.connect(this.store, "onSet", this, "_storeDatumChange");
				dojo.connect(this.store, "onDelete", this, "_storeDatumDelete");
				dojo.connect(this.store, "onNew", this, "_storeDatumNew");
			}
			if(this._canWrite) {
				dojo.connect(this.store, "revert", this, "refresh");
			}
		}
	},
	markupFactory: function(args, node){
		return new dojox.grid.data.DojoData(null, null, args);
	},
	query: { name: "*" }, // default, stupid query
	store: null,
	_currentlyProcessing: null,
	_canNotify: false,
	_canWrite: false,
	_canIdentify: false,
	_rowIdentities: {},
	clientSort: false,
	sortFields: null,
	queryOptions: null,

	// data
	setData: function(inData){
		this.store = inData;
		this.data = [];
		this.allChange();
	},
	setRowCount: function(inCount){
		//console.debug("inCount:", inCount);
		this.count = inCount;
		this.allChange();
	},
	beginReturn: function(inCount){
		if(this.count != inCount){
			// this.setRowCount(0);
			// this.clear();
			// console.debug(this.count, inCount);
			this.setRowCount(inCount);
		}
	},
	_setupFields: function(dataItem){
		// abort if we already have setup fields
		if(this.fields._nameMaps){
			return;
		}
		// set up field/index mappings
		var m = {};
		//console.debug("setting up fields", m);
		var fields = dojo.map(this.store.getAttributes(dataItem),
			function(item, idx){ 
				m[item] = idx;
				m[idx+".idx"] = item;
				// name == display name, key = property name
				return { name: item, key: item };
			},
			this
		);
		this.fields._nameMaps = m;
		// console.debug("new fields:", fields);
		this.fields.set(fields);
		this.notify("FieldsChange");
	},
	_getRowFromItem: function(item){
		// gets us the row object (and row index) of an item
	},
	_createRow: function(item){
		var row = {}; 
		row.__dojo_data_item = item;
		dojo.forEach(this.fields.values, function(a){
			value = this.store.getValue(item, a.name);
			row[a.name] = (value === undefined || value === null)?"":value;
		}, this);
		return row;
	},
	processRows: function(items, request){
		// console.debug(arguments);
		if(!items || items.length == 0){ return; }
		this._setupFields(items[0]);
		dojo.forEach(items, function(item, idx){
			var row = this._createRow(item);
			this._setRowId(item, request.start, idx);
			this.setRow(row, request.start+idx);
		}, this);
		// FIXME: 
		//	Q: scott, steve, how the hell do we actually get this to update
		//		the visible UI for these rows?
		//	A: the goal is that Grid automatically updates to reflect changes
		//		in model. In this case, setRow -> rowChanged -> (observed by) Grid -> modelRowChange -> updateRow
	},
	// request data 
	requestRows: function(inRowIndex, inCount){
		var row  = inRowIndex || 0;
		var params = { 
			start: row,
			count: this.rowsPerPage,
			query: this.query,
			sort: this.sortFields,
			queryOptions: this.queryOptions,
			onBegin: dojo.hitch(this, "beginReturn"),
			onComplete: dojo.hitch(this, "processRows"), // add to deferred?
			onError: dojo.hitch(this, "processError")
		};
		this.store.fetch(params);
	},
	getDatum: function(inRowIndex, inColIndex){
		//console.debug("getDatum", inRowIndex, inColIndex);
		var row = this.getRow(inRowIndex);
		var field = this.fields.values[inColIndex];
		return row && field ? row[field.name] : field ? field.na : '?';
		//var idx = row && this.fields._nameMaps[inColIndex+".idx"];
		//return (row ? row[idx] : this.fields.get(inColIndex).na);
	},
	setDatum: function(inDatum, inRowIndex, inColIndex){
		var n = this.fields._nameMaps[inColIndex+".idx"];
		// console.debug("setDatum:", "n:"+n, inDatum, inRowIndex, inColIndex);
		if(n){
			this.data[inRowIndex][n] = inDatum;
			this.datumChange(inDatum, inRowIndex, inColIndex);
		}
	},
	// modification, update and store eventing
	copyRow: function(inRowIndex){
		var row = {};
		var backstop = {};
		var src = this.getRow(inRowIndex);
		for(var x in src){
			if(src[x] != backstop[x]){
				row[x] = src[x];
			}
		}
		return row;
	},
	_attrCompare: function(cache, data){
		dojo.forEach(this.fields.values, function(a){
			if(cache[a.name] != data[a.name]){ return false; }
		}, this);
		return true;
	},
	endModifyRow: function(inRowIndex){
		var cache = this.cache[inRowIndex];
		if(cache){
			var data = this.getRow(inRowIndex);
			if(!this._attrCompare(cache, data)){
				this.update(cache, data, inRowIndex);
			}
			delete this.cache[inRowIndex];
		}
	},
	cancelModifyRow: function(inRowIndex){
		// console.debug("cancelModifyRow", arguments);
		var cache = this.cache[inRowIndex];
		if(cache){
			this.setRow(cache, inRowIndex);
			delete this.cache[inRowIndex];
		}
	},
	_setRowId: function(item, offset, idx){
		// FIXME: where else do we need to keep this in sync?
		//Handle stores that implement identity and try to handle those that do not.
		if (this._canIdentify) {
			this._rowIdentities[this.store.getIdentity(item)] = {rowId: offset+idx, item: item};
		}else{
			var identity = dojo.toJson(this.query) + ":start:" + offset + ":idx:" + idx + ":sort:" + dojo.toJson(this.sortFields);
			this._rowIdentities[identity] = {rowId: offset+idx, item: item};
		}
	},
	_getRowId: function(item, isNotItem){
		//	summary:
		//		Function determine the row index for a particular item
		//	item:
		//		The store item to examine to determine row index.
		//	isNotItem:
		//		Boolean flag to indicate if the item passed is a store item or not.
		var rowId = null;
		//Handle identity and nonidentity capable stores.
		if(this._canIdentify && !isNotItem){
			rowId = this._rowIdentities[this.store.getIdentity(item)].rowId;
		}else{
			//Not efficient, but without identity support, 
			//not a better way to do it.  Basically, do our best to locate it
			//This may or may not work, but best we can do here.
			var id;
			for(id in this._rowIdentities){
				if(this._rowIdentities[id].item === item){
					rowId = this._rowIdentities[id].rowId;
					break;
				}
			}
		}
		return rowId;
	},
	_storeDatumChange: function(item, attr, oldVal, newVal){
		// the store has changed some data under us, need to update the display
		var rowId = this._getRowId(item);
		var row = this.getRow(rowId);
		if(row){
			row[attr] = newVal;
			var colId = this.fields._nameMaps[attr];
			this.notify("DatumChange", [ newVal, rowId, colId ]);
		}
	},
	_storeDatumDelete: function(item){
		if(dojo.indexOf(this._currentlyProcessing, item) != -1)
			return;
		// the store has deleted some item under us, need to remove that item from
		// the view if possible.  It may be the deleted item isn't even in the grid.
		var rowId = this._getRowId(item, true);
		if(rowId != null){
			this._removeItems([rowId]);
		}
	},
	_storeDatumNew: function(item){
		if(this._disableNew)
			return;
		// the store has added some item under us, need to add it to the view.
		this._insertItem(item, this.data.length);
	},
	insert: function(item, index){
		// Push the given item back to the store
		this._disableNew = true;
		var i = this.store.newItem(item);
		this._disableNew = false;
		this._insertItem(i, index);
	},
	_insertItem: function(storeItem, index){
		// Set up our fields if we haven't already 
		if(!this.fields._nameMaps){
			this._setupFields(storeItem);
		}
		var row = this._createRow(storeItem);
		this._setRowId(storeItem, 0, index);
		dojox.grid.data.Dynamic.prototype.insert.apply(this, [row, index]);
	},
	datumChange: function(value, rowIdx, colIdx){
		if(this._canWrite){
			// we're chaning some data, which means we need to write back
			var row = this.getRow(rowIdx);
			var field = this.fields._nameMaps[colIdx+".idx"];
			this.store.setValue(row.__dojo_data_item, field, value);
			// we don't need to call DatumChange, an eventing store will tell
			// us about the row change events
		}else{
			// we can't write back, so just go ahead and change our local copy
			// of the data
			this.notify("DatumChange", arguments);
		}
	},
	insertion: function(/* index */){
		console.debug("Insertion", arguments);
		this.notify("Insertion", arguments);
		this.notify("Change", arguments);
	},
	removal: function(/* keys */){
		console.debug("Removal", arguments);
		this.notify("Removal", arguments);
		this.notify("Change", arguments);
	},
	remove: function(inRowIndexes){
		//	summary:
		//		Function to remove a set of items from the store based on the row index.
		//	inRowIndexes:
		//		An array of row indexes from the grid to remove from the store.
		/* Call delete on the store */ 
		for(var i=inRowIndexes.length-1; i>=0; i--){
			// Need to find the item, then remove each from the data store
			var item = this.data[inRowIndexes[i]].__dojo_data_item;
			this._currentlyProcessing.push(item);
			this.store.deleteItem(item);
		}
		/* Remove from internal data structure and the view */
		this._removeItems(inRowIndexes);
		this._currentlyProcessing = [];
	},
	_removeItems: function(inRowIndexes /*array*/){
		//	summary:
		//		Function to remove a set of items from the store based on the row index.
		//	inRowIndexes:
		//		An array of row indexes from the grid to remove from the store.
		dojox.grid.data.Dynamic.prototype.remove.apply(this, arguments);
		// Rebuild _rowIdentities
		this._rowIdentities = {};
		for (var i = 0; i < this.data.length; i++){
			this._setRowId(this.data[i].__dojo_data_item, 0, i);
		}
	},
	canSort: function(){
		// Q: Return true and re-issue the queries?
		// A: Return true only. Re-issue the query in 'sort'.
		// Note, above are original comments :)
		return true;
	},
	sort: function(colIndex){
		var col = Math.abs(colIndex) - 1;
		this.sortFields = [{'attribute': this.fields.values[col].name, 'descending': (colIndex>0)}];
		
		// Since we're relying on the data store to sort, we have to refresh our data.
		this.refresh();
	},
	refresh: function(){
		//	summary:
		//		Function to cause the model to re-query the store and rebuild the current viewport.
		this.clearData(true);
		this.requestRows();
	},
	clearData: function(/* boolean */ keepStore){
		this._rowIdentities = {};
		this.pages = [];
		this.bop = this.eop = -1;
		this.count = 0;
		this.setData((keepStore?this.store:[]));
	},
	processError: function(error, request){
		//	summary:
		//		Hook function to trap error messages from the store and emit them.  
		//		Intended for connecting to and handling the error object or at least reporting it.
		//
		//	error:
		//		The error object returned by the store when a problem occurred.
		//	request:
		//		The request object that caused the error.
		console.log(error);
	}
});

}
