if(!dojo._hasResource["dojox.grid._grid.lib"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid._grid.lib"] = true;
dojo.provide("dojox.grid._grid.lib");
// summary: grid utility library
dojo.mixin(dojox.grid,{

	na: '...',

	nop: function(){
		// summary: a null function?
	},

	getTdIndex: function(td){
		return td.cellIndex >=0 ? td.cellIndex : dojo.indexOf(td.parentNode.cells, td);
	},
	
	getTrIndex: function(tr){
		return tr.rowIndex >=0 ? tr.rowIndex : dojo.indexOf(tr.parentNode.childNodes, tr);
	},
	
	getTr: function(rowOwner, index){
		return rowOwner && ((rowOwner.rows||0)[index] || rowOwner.childNodes[index]);
	},
	
	getTd: function(rowOwner, rowIndex, cellIndex){
		return (dojox.grid.getTr(inTable, rowIndex)||0)[cellIndex];
	},
	
	findTable: function(node){
		for (var n=node; n && n.tagName!='TABLE'; n=n.parentNode);
		return n;
	},
	
	ascendDom: function(inNode, inWhile){
		for (var n=inNode; n && inWhile(n); n=n.parentNode);
		return n;
	},
	
	makeNotTagName: function(inTagName){
		var name = inTagName.toUpperCase();
		return function(node){ return node.tagName != name; };
	},
	
	fire: function(ob, ev, args){
		var fn = ob && ev && ob[ev];
		return fn && (args ? fn.apply(ob, args) : ob[ev]());
	},
	
	// from lib.js
	setStyleText: function(inNode, inStyleText){
		if(inNode.style.cssText == undefined){
			inNode.setAttribute("style", inStyleText);
		}else{
			inNode.style.cssText = inStyleText;
		}
	},
	
	getStyleText: function(inNode, inStyleText){
		return (inNode.style.cssText == undefined ? inNode.getAttribute("style") : inNode.style.cssText);
	},
	
	setStyle: function(inElement, inStyle, inValue){
		if(inElement && inElement.style[inStyle] != inValue){
			inElement.style[inStyle] = inValue;
		}
	},
	
	setStyleHeightPx: function(inElement, inHeight){
		if(inHeight >= 0){
			dojox.grid.setStyle(inElement, 'height', inHeight + 'px');
		}
	},
	
	mouseEvents: [ 'mouseover', 'mouseout', /*'mousemove',*/ 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu' ],

	keyEvents: [ 'keyup', 'keydown', 'keypress' ],

	funnelEvents: function(inNode, inObject, inMethod, inEvents){
		var evts = (inEvents ? inEvents : dojox.grid.mouseEvents.concat(dojox.grid.keyEvents));
		for (var i=0, l=evts.length; i<l; i++){
			dojo.connect(inNode, 'on' + evts[i], inObject, inMethod);
		}
	},

	removeNode: function(inNode){
		inNode = dojo.byId(inNode);
		inNode && inNode.parentNode && inNode.parentNode.removeChild(inNode);
		return inNode;
	},
	
	getScrollbarWidth: function(){
		if(this._scrollBarWidth){
			return this._scrollBarWidth;
		}
		this._scrollBarWidth = 18;
		try{
			var e = document.createElement("div");
			e.style.cssText = "top:0;left:0;width:100px;height:100px;overflow:scroll;position:absolute;visibility:hidden;";
			document.body.appendChild(e);
			this._scrollBarWidth = e.offsetWidth - e.clientWidth;
			document.body.removeChild(e);
			delete e;
		}catch (ex){}
		return this._scrollBarWidth;
	},
	
	// needed? dojo has _getProp
	getRef: function(name, create, context){
		var obj=context||dojo.global, parts=name.split("."), prop=parts.pop();
		for(var i=0, p; obj&&(p=parts[i]); i++){
			obj = (p in obj ? obj[p] : (create ? obj[p]={} : undefined));
		}
		return { obj: obj, prop: prop }; 
	},
	
	getProp: function(name, create, context){
		with(dojox.grid.getRef(name, create, context)){
			return (obj)&&(prop)&&(prop in obj ? obj[prop] : (create ? obj[prop]={} : undefined));
		}
	},
	
	indexInParent: function(inNode){
		var i=0, n, p=inNode.parentNode;
		while((n = p.childNodes[i++])){
			if(n == inNode){
				return i - 1;
			}
		}
		return -1;
	},
	
	cleanNode: function(inNode){
		if(!inNode){
			return;
		}
		var filter = function(inW){
			return inW.domNode && dojo.isDescendant(inW.domNode, inNode, true);
		}
		var ws = dijit.registry.filter(filter);
		for(var i=0, w; (w=ws[i]); i++){
			w.destroy();
		}
		delete ws;
	},
	
	getTagName: function(inNodeOrId){
		var node = dojo.byId(inNodeOrId);
		return (node && node.tagName ? node.tagName.toLowerCase() : '');
	},
	
	nodeKids: function(inNode, inTag){
		var result = [];
		var i=0, n;
		while((n = inNode.childNodes[i++])){
			if(dojox.grid.getTagName(n) == inTag){
				result.push(n);
			}
		}
		return result;
	},
	
	divkids: function(inNode){
		return dojox.grid.nodeKids(inNode, 'div');
	},
	
	focusSelectNode: function(inNode){
		try{
			dojox.grid.fire(inNode, "focus");
			dojox.grid.fire(inNode, "select");
		}catch(e){// IE sux bad
		}
	},
	
	whenIdle: function(/*inContext, inMethod, args ...*/){
		setTimeout(dojo.hitch.apply(dojo, arguments), 0);
	},
	
	arrayCompare: function(inA, inB){
		for(var i=0,l=inA.length; i<l; i++){
			if(inA[i] != inB[i]){return false;}
		}
		return (inA.length == inB.length);
	},
	
	arrayInsert: function(inArray, inIndex, inValue){
		if(inArray.length <= inIndex){
			inArray[inIndex] = inValue;
		}else{
			inArray.splice(inIndex, 0, inValue);
		}
	},
	
	arrayRemove: function(inArray, inIndex){
		inArray.splice(inIndex, 1);
	},
	
	arraySwap: function(inArray, inI, inJ){
		var cache = inArray[inI];
		inArray[inI] = inArray[inJ];
		inArray[inJ] = cache;
	},
	
	initTextSizePoll: function(inInterval) {
		var f = document.createElement("div");
		with (f.style) {
			top = "0px";
			left = "0px";
			position = "absolute";
			visibility = "hidden";
		}
		f.innerHTML = "TheQuickBrownFoxJumpedOverTheLazyDog";
		document.body.appendChild(f);
		var fw = f.offsetWidth;
		var job = function() {
			if (f.offsetWidth != fw) {
				fw = f.offsetWidth;
				dojox.grid.textSizeChanged();
			}
		}
		window.setInterval(job, inInterval||200);
		dojox.grid.initTextSizePoll = dojox.grid.nop;
	},
	
	textSizeChanged: function() {

	}
});

dojox.grid.jobs = {

	cancel: function(inHandle){
		if(inHandle){
			window.clearTimeout(inHandle);
		}
	},

	jobs: [],

	job: function(inName, inDelay, inJob){
		dojox.grid.jobs.cancelJob(inName);
		var job = function(){
			delete dojox.grid.jobs.jobs[inName];
			inJob();
		}
		dojox.grid.jobs.jobs[inName] = setTimeout(job, inDelay);
	},

	cancelJob: function(inName){
		dojox.grid.jobs.cancel(dojox.grid.jobs.jobs[inName]);
	}

}

}
