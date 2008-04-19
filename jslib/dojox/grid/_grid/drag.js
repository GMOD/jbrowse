if(!dojo._hasResource["dojox.grid._grid.drag"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid._grid.drag"] = true;
dojo.provide("dojox.grid._grid.drag");

// summary:
//	utility functions for dragging as used in grid.
// begin closure
(function(){

var dgdrag = dojox.grid.drag = {};

dgdrag.dragging = false;
dgdrag.hysteresis = 2;

dgdrag.capture = function(inElement) {
	//console.debug('dojox.grid.drag.capture');
	if (inElement.setCapture)
		inElement.setCapture();
	else {
		document.addEventListener("mousemove", inElement.onmousemove, true);
		document.addEventListener("mouseup", inElement.onmouseup, true);
		document.addEventListener("click", inElement.onclick, true);
	}
}

dgdrag.release = function(inElement) {
	//console.debug('dojox.grid.drag.release');
	if(inElement.releaseCapture){
		inElement.releaseCapture();
	}else{
		document.removeEventListener("click", inElement.onclick, true);
		document.removeEventListener("mouseup", inElement.onmouseup, true);
		document.removeEventListener("mousemove", inElement.onmousemove, true);
	}
}

dgdrag.start = function(inElement, inOnDrag, inOnEnd, inEvent, inOnStart){
	if(/*dgdrag.elt ||*/ !inElement || dgdrag.dragging){
		console.debug('failed to start drag: bad input node or already dragging');
		return;
	}
	dgdrag.dragging = true;
	dgdrag.elt = inElement;
	dgdrag.events = {
		drag: inOnDrag || dojox.grid.nop, 
		end: inOnEnd || dojox.grid.nop, 
		start: inOnStart || dojox.grid.nop, 
		oldmove: inElement.onmousemove, 
		oldup: inElement.onmouseup, 
		oldclick: inElement.onclick 
	};
	dgdrag.positionX = (inEvent && ('screenX' in inEvent) ? inEvent.screenX : false);
	dgdrag.positionY = (inEvent && ('screenY' in inEvent) ? inEvent.screenY : false);
	dgdrag.started = (dgdrag.position === false);
	inElement.onmousemove = dgdrag.mousemove;
	inElement.onmouseup = dgdrag.mouseup;
	inElement.onclick = dgdrag.click;
	dgdrag.capture(dgdrag.elt);
}

dgdrag.end = function(){
	//console.debug("dojox.grid.drag.end");
	dgdrag.release(dgdrag.elt);
	dgdrag.elt.onmousemove = dgdrag.events.oldmove;
	dgdrag.elt.onmouseup = dgdrag.events.oldup;
	dgdrag.elt.onclick = dgdrag.events.oldclick;
	dgdrag.elt = null;
	try{
		if(dgdrag.started){
			dgdrag.events.end();
		}
	}finally{
		dgdrag.dragging = false;
	}
}

dgdrag.calcDelta = function(inEvent){
	inEvent.deltaX = inEvent.screenX - dgdrag.positionX;
	inEvent.deltaY = inEvent.screenY - dgdrag.positionY;
}

dgdrag.hasMoved = function(inEvent){
	return Math.abs(inEvent.deltaX) + Math.abs(inEvent.deltaY) > dgdrag.hysteresis;
}

dgdrag.mousemove = function(inEvent){
	inEvent = dojo.fixEvent(inEvent);
	dojo.stopEvent(inEvent);
	dgdrag.calcDelta(inEvent);
	if((!dgdrag.started)&&(dgdrag.hasMoved(inEvent))){
		dgdrag.events.start(inEvent);
		dgdrag.started = true;
	}
	if(dgdrag.started){
		dgdrag.events.drag(inEvent);
	}
}

dgdrag.mouseup = function(inEvent){
	//console.debug("dojox.grid.drag.mouseup");
	dojo.stopEvent(dojo.fixEvent(inEvent));
	dgdrag.end();
}

dgdrag.click = function(inEvent){
	dojo.stopEvent(dojo.fixEvent(inEvent));
	//dgdrag.end();
}

})();
// end closure

}
