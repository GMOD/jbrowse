if(!dojo._hasResource["dojox.image.MagnifierLite"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.image.MagnifierLite"] = true;
dojo.provide("dojox.image.MagnifierLite");
dojo.experimental("dojox.image.MagnifierLite");

dojo.require("dijit._Widget");

dojo.declare("dojox.image.MagnifierLite",
	[dijit._Widget],{
	// summary:	Adds magnification on a portion of an image element
	//
	// description: An unobtrusive way to add an unstyled overlay
	// 		above the srcNode image element. The overlay/glass is a 
	//		scaled version of the src image (so larger images sized down
	//		are clearer).
	//
	//		The logic behind requiring the src image to be large is
	//		"it's going to be downloaded, anyway" so this method avoids
	//		having to make thumbnails and 2 http requests among other things.
	//
	// glassSize: Int
	// 		the width and height of the bounding box
	glassSize: 125,

	// scale: Decimal
	// 		the multiplier of the Mangification. 
	scale: 6,

	postCreate: function(){
		this.inherited(arguments);
		
		// images are hard to make into workable templates, so just add outer overlay
		// and skip using dijit._Templated		
		this._adjustScale();
		this._createGlass();
		
		this.connect(this.domNode,"onmouseenter","_showGlass");
		this.connect(this.glassNode,"onmousemove","_placeGlass");
		this.connect(this.img,"onmouseout","_hideGlass");

		// when position of domNode changes, _adjustScale needs to run.
		// window.resize isn't it always, FIXME:
		this.connect(window,"onresize","_adjustScale");
		
	},

	_createGlass: function(){
		// summary: make img and glassNode elements as children of the body

		this.glassNode = dojo.doc.createElement('div');
		this.surfaceNode = this.glassNode.appendChild(dojo.doc.createElement('div'));
		dojo.addClass(this.glassNode,"glassNode");
		dojo.body().appendChild(this.glassNode);
		with(this.glassNode.style){
			height = this.glassSize + "px";
			width = this.glassSize + "px";
		}
		
		this.img = dojo.doc.createElement('img');
		this.glassNode.appendChild(this.img);
		this.img.src = this.domNode.src;
		// float the image around inside the .glassNode 
		with(this.img.style){
			position = "relative";
			top = 0; left = 0;
			width = this._zoomSize.w+"px";
			height = this._zoomSize.h+"px";
		}

	},
	
	_adjustScale: function(){
		// summary: update the calculations should this.scale change

		this.offset = dojo.coords(this.domNode,true);
		this._imageSize = { w: this.offset.w, h:this.offset.h };
		this._zoomSize = {
			w: this._imageSize.w * this.scale,
			h: this._imageSize.h * this.scale
		};
	},
	
	_showGlass: function(e){
		// summary: show the overlay
		this._placeGlass(e);		
		with(this.glassNode.style){
			visibility = "visible";
			display = "";
		}			
		
	},
	
	_hideGlass: function(e){
		// summary: hide the overlay
		this.glassNode.style.visibility = "hidden";
		this.glassNode.style.display = "none";
	},
	
	_placeGlass: function(e){
		// summary: position the overlay centered under the cursor

		this._setImage(e);
		var t = Math.floor(e.pageY - (this.glassSize/2));
		var l = Math.floor(e.pageX - (this.glassSize/2));
		dojo.style(this.glassNode,"top",t);
		dojo.style(this.glassNode,"left",l);

	},

	_setImage: function(e){
		// summary: set the image's offset in the clipping window relative to the mouse position

		var xOff = (e.pageX - this.offset.l) / this.offset.w;
		var yOff = (e.pageY - this.offset.t) / this.offset.h;
		var x = (this._zoomSize.w * xOff * -1)+(this.glassSize*xOff);
		var y = (this._zoomSize.h * yOff * -1)+(this.glassSize*yOff);
		with(this.img.style){
			top = y+"px";
			left = x+"px";
		}

	}

});

}
