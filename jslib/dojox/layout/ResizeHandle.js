if(!dojo._hasResource["dojox.layout.ResizeHandle"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.layout.ResizeHandle"] = true;
dojo.provide("dojox.layout.ResizeHandle");
dojo.experimental("dojox.layout.ResizeHandle"); 

dojo.require("dijit._Widget");
dojo.require("dijit._Templated"); 
dojo.require("dojo.fx"); 

dojo.declare("dojox.layout.ResizeHandle",
	[dijit._Widget, dijit._Templated],
	{
	// summary: A dragable handle used to resize an attached node.
	// description:
	//	The handle on the bottom-right corner of FloatingPane or other widgets that allows
	//	the widget to be resized.
	//	Typically not used directly.
	//
	// targetId: String
	//	id of the Widget OR DomNode that I will size
	targetId: '',

	// targetContainer: DomNode
	//	over-ride targetId and attch this handle directly to a reference of a DomNode
	targetContainer: null, 

	// resizeAxis: String
	//	one of: x|y|xy limit resizing to a single axis, default to xy ... 
	resizeAxis: "xy",

	// activeResize: Boolean
	// 	if true, node will size realtime with mouse movement, 
	//	if false, node will create virtual node, and only resize target on mouseUp
	activeResize: false,
	
	// activeResizeClass: String
	//	css class applied to virtual resize node. 
	activeResizeClass: 'dojoxResizeHandleClone',

	// animateSizing: Boolean
	//	only applicable if activeResize = false. onMouseup, animate the node to the
	//	new size
	animateSizing: true,
	
	// animateMethod: String
	// 	one of "chain" or "combine" ... visual effect only. combine will "scale" 
	// 	node to size, "chain" will alter width, then height
	animateMethod: 'chain',

	// animateDuration: Integer
	//	time in MS to run sizing animation. if animateMethod="chain", total animation 
	//	playtime is 2*animateDuration
	animateDuration: 225,

	// minHeight: Integer
	//	smallest height in px resized node can be
	minHeight: 100,

	// minWidth: Integer
	//	smallest width in px resize node can be
	minWidth: 100,

	templateString: '<div dojoAttachPoint="resizeHandle" class="dojoxResizeHandle"><div></div></div>',

	postCreate: function(){
		// summary: setup our one major listener upon creation
		this.connect(this.resizeHandle, "onmousedown", "_beginSizing");
		if(!this.activeResize){ 
			// there shall be only a single resize rubberbox that at the top
			// level so that we can overlay it on anything whenever the user
			// resizes something. Since there is only one mouse pointer he
			// can't at once resize multiple things interactively.
			this._resizeHelper = dijit.byId('dojoxGlobalResizeHelper');

			if (!this._resizeHelper){
				var tmpNode = document.createElement('div');
				tmpNode.style.display = "none";
				dojo.body().appendChild(tmpNode);
				dojo.addClass(tmpNode,this.activeResizeClass);
				this._resizeHelper = new dojox.layout._ResizeHelper({ 
						id: 'dojoxGlobalResizeHelper'},tmpNode);
				this._resizeHelper.startup();
			}
		}else{ this.animateSizing = false; } 	

		if (!this.minSize) { 
			this.minSize = { w: this.minWidth, h: this.minHeight };
		}
		// should we modify the css for the cursor hover to n-resize nw-resize and w-resize?
		this._resizeX = this._resizeY = false; 
		switch (this.resizeAxis.toLowerCase()) {
		case "xy" : 
			this._resizeX = this._resizeY = true; 
			// FIXME: need logic to determine NW or NE class to see
			// based on which [todo] corner is clicked
			dojo.addClass(this.resizeHandle,"dojoxResizeNW"); 
			break; 
		case "x" : 
			this._resizeX = true; 
			dojo.addClass(this.resizeHandle,"dojoxResizeW");
			break;
		case "y" : 
			this._resizeY = true; 
			dojo.addClass(this.resizeHandle,"dojoxResizeN");
			break;
		}
	},

	_beginSizing: function(/*Event*/ e){
		// summary: setup movement listeners and calculate initial size
		
		if (this._isSizing){ return false; }

		this.targetWidget = dijit.byId(this.targetId);

		this.targetDomNode = this.targetWidget ? this.targetWidget.domNode : dojo.byId(this.targetId);
		if (this.targetContainer) { this.targetDomNode = this.targetContainer; } 
		if (!this.targetDomNode){ return false; }

		if (!this.activeResize) {
			var c = dojo.coords(this.targetDomNode, true);
			this._resizeHelper.resize({l: c.x, t: c.y, w: c.w, h: c.h});
			this._resizeHelper.show();
		}

		this._isSizing = true;
		this.startPoint  = {'x':e.clientX, 'y':e.clientY};

		// FIXME: this is funky: marginBox adds height, contentBox ignores padding (expected, but foo!)
		var mb = (this.targetWidget) ? dojo.marginBox(this.targetDomNode) : dojo.contentBox(this.targetDomNode);  
		this.startSize  = { 'w':mb.w, 'h':mb.h };

		this._pconnects = []; 
		this._pconnects.push(dojo.connect(document,"onmousemove",this,"_updateSizing")); 
		this._pconnects.push(dojo.connect(document,"onmouseup", this, "_endSizing"));

		e.preventDefault();
	},

	_updateSizing: function(/*Event*/ e){
		// summary: called when moving the ResizeHandle ... determines 
		//	new size based on settings/position and sets styles.

		if(this.activeResize){
			this._changeSizing(e);
		}else{
			var tmp = this._getNewCoords(e);	
			if(tmp === false){ return; }
			this._resizeHelper.resize(tmp);
		}
		e.preventDefault();
	},

	_getNewCoords: function(/* Event */ e){
		
		// On IE, if you move the mouse above/to the left of the object being resized,
		// sometimes clientX/Y aren't set, apparently.  Just ignore the event.
		try{
			if(!e.clientX  || !e.clientY){ return false; }
		}catch(e){
			// sometimes you get an exception accessing above fields...
			return false;
		}
		this._activeResizeLastEvent = e; 

		var dx = this.startPoint.x - e.clientX;
		var dy = this.startPoint.y - e.clientY;
		
		var newW = (this._resizeX) ? this.startSize.w - dx : this.startSize.w;
		var newH = (this._resizeY) ? this.startSize.h - dy : this.startSize.h;

		// minimum size check
		if(this.minSize){
			//var mb = dojo.marginBox(this.targetDomNode);
			if(newW < this.minSize.w){
				newW = this.minSize.w;
			}
			if(newH < this.minSize.h){
				newH = this.minSize.h;
			}
		}
		return {w:newW, h:newH};  // Object
	},
	
	_changeSizing: function(/*Event*/ e){
		// summary: apply sizing information based on information in (e) to attached node
		var tmp = this._getNewCoords(e);
		if(tmp===false){ return; }

		if(this.targetWidget && typeof this.targetWidget.resize == "function"){ 
			this.targetWidget.resize(tmp);
		}else{
			if(this.animateSizing){
				var anim = dojo.fx[this.animateMethod]([
					dojo.animateProperty({
						node: this.targetDomNode,
						properties: { 
							width: { start: this.startSize.w, end: tmp.w, unit:'px' } 
						},	
						duration: this.animateDuration
					}),
					dojo.animateProperty({
						node: this.targetDomNode,
						properties: { 
							height: { start: this.startSize.h, end: tmp.h, unit:'px' }
						},
						duration: this.animateDuration
					})
				]);
				anim.play();
			}else{
				dojo.style(this.targetDomNode,"width",tmp.w+"px"); 
				dojo.style(this.targetDomNode,"height",tmp.h+"px");
			}
		}	
	},

	_endSizing: function(/*Event*/ e){
		// summary: disconnect listenrs and cleanup sizing
		dojo.forEach(this._pconnects,dojo.disconnect);
		if(!this.activeResize){
			this._resizeHelper.hide();
			this._changeSizing(e);
		}
		this._isSizing = false;
		this.onResize(e);
	},
	
	onResize: function(e){
		// summary: Stub fired when sizing is done, for things like Grid
	}
	
});

dojo.declare("dojox.layout._ResizeHelper",
	dijit._Widget,
	{
	// summary: A global private resize helper shared between any resizeHandle with activeSizing='false;
	
	startup: function(){
		if(this._started){ return; }	
		this.inherited(arguments);
	},

	show: function(){
		// summary: show helper to start resizing
		dojo.fadeIn({ node: this.domNode, duration:120, 
			beforeBegin: dojo.hitch(this,function(){
				this.domNode.style.display=''; 
			})
		}).play();
	},

	hide: function(){
		// summary: hide helper after resizing is complete
		dojo.fadeOut({ node:this.domNode, duration:250,
			onEnd: dojo.hitch(this,function(){
				this.domNode.style.display="none";
			})
		}).play();
	},
	
	resize: function(/* Object */dim){
		// summary: size the widget and place accordingly
		
		// FIXME: this is off when padding present
		dojo.marginBox(this.domNode, dim);
	}
});

}
