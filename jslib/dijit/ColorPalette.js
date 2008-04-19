if(!dojo._hasResource["dijit.ColorPalette"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.ColorPalette"] = true;
dojo.provide("dijit.ColorPalette");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.colors");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojo", "colors", null, "ROOT,cs,de,es,fr,gr,hu,it,ja,ko,pl,pt,ru,zh,zh-tw");

dojo.declare("dijit.ColorPalette",
	[dijit._Widget, dijit._Templated],
	{
	// summary: A keyboard accessible color-picking widget
	// description:
	//	Grid showing various colors, so the user can pick a certain color
	//	Can be used standalone, or as a popup.
	//
	// example:
	// |	<div dojoType="dijit.ColorPalette"></div>
	//
	// example:
	// |    var picker = new dijit.ColorPalette({ },srcNode);
	// |	picker.startup();
	//
	// defaultTimeout: Number
	//		number of milliseconds before a held key or button becomes typematic
	defaultTimeout: 500,

	// timeoutChangeRate: Number
	//		fraction of time used to change the typematic timer between events
	//		1.0 means that each typematic event fires at defaultTimeout intervals
	//		< 1.0 means that each typematic event fires at an increasing faster rate
	timeoutChangeRate: 0.90,

	// palette: String
	//		Size of grid, either "7x10" or "3x4".
	palette: "7x10",

	//_value: String
	//		The value of the selected color.
	value: null,

	//_currentFocus: Integer
	//		Index of the currently focused color.
	_currentFocus: 0,

	// _xDim: Integer
	//		This is the number of colors horizontally across.
	_xDim: null,

	// _yDim: Integer
	///		This is the number of colors vertically down.
	_yDim: null,

	// _palettes: Map
	// 		This represents the value of the colors.
	//		The first level is a hashmap of the different arrays available
	//		The next two dimensions represent the columns and rows of colors.
	_palettes: {

		"7x10":	[["white", "seashell", "cornsilk", "lemonchiffon","lightyellow", "palegreen", "paleturquoise", "lightcyan",	"lavender", "plum"],
				["lightgray", "pink", "bisque", "moccasin", "khaki", "lightgreen", "lightseagreen", "lightskyblue", "cornflowerblue", "violet"],
				["silver", "lightcoral", "sandybrown", "orange", "palegoldenrod", "chartreuse", "mediumturquoise", 	"skyblue", "mediumslateblue","orchid"],
				["gray", "red", "orangered", "darkorange", "yellow", "limegreen", 	"darkseagreen", "royalblue", "slateblue", "mediumorchid"],
				["dimgray", "crimson", 	"chocolate", "coral", "gold", "forestgreen", "seagreen", "blue", "blueviolet", "darkorchid"],
				["darkslategray","firebrick","saddlebrown", "sienna", "olive", "green", "darkcyan", "mediumblue","darkslateblue", "darkmagenta" ],
				["black", "darkred", "maroon", "brown", "darkolivegreen", "darkgreen", "midnightblue", "navy", "indigo", 	"purple"]],

		"3x4": [["white", "lime", "green", "blue"],
			["silver", "yellow", "fuchsia", "navy"],
			["gray", "red", "purple", "black"]]	

	},

	// _imagePaths: Map
	//		This is stores the path to the palette images
	_imagePaths: {
		"7x10": dojo.moduleUrl("dijit", "templates/colors7x10.png"),
		"3x4": dojo.moduleUrl("dijit", "templates/colors3x4.png")
	},

	// _paletteCoords: Map
	//		This is a map that is used to calculate the coordinates of the
	//		images that make up the palette.
	_paletteCoords: {
		"leftOffset": 3, "topOffset": 3,
		"cWidth": 20, "cHeight": 20
		
	},

	// templatePath: String
	//		Path to the template of this widget.
	templateString:"<div class=\"dijitInline dijitColorPalette\">\n\t<div class=\"dijitColorPaletteInner\" dojoAttachPoint=\"divNode\" waiRole=\"grid\" tabIndex=\"${tabIndex}\">\n\t\t<img class=\"dijitColorPaletteUnder\" dojoAttachPoint=\"imageNode\" waiRole=\"presentation\">\n\t</div>\t\n</div>\n",

	// _paletteDims: Object
	//		Size of the supported palettes for alignment purposes.
	_paletteDims: {
		"7x10": {"width": "206px", "height": "145px"},
		"3x4": {"width": "86px", "height": "64px"}
	},

	// tabIndex: String
	//		Widget tabindex.
	tabIndex: "0",

	postCreate: function(){
		// A name has to be given to the colorMap, this needs to be unique per Palette.
		dojo.mixin(this.divNode.style, this._paletteDims[this.palette]);
		this.imageNode.setAttribute("src", this._imagePaths[this.palette]);
		var choices = this._palettes[this.palette];	
		this.domNode.style.position = "relative";
		this._cellNodes = [];	
		this.colorNames = dojo.i18n.getLocalization("dojo", "colors", this.lang);
		var url = dojo.moduleUrl("dojo", "resources/blank.gif"),
            colorObject = new dojo.Color(),
		    coords = this._paletteCoords;
		for(var row=0; row < choices.length; row++){
			for(var col=0; col < choices[row].length; col++) {
                var imgNode = dojo.doc.createElement("img");
                imgNode.src = url;
                dojo.addClass(imgNode, "dijitPaletteImg");
                var color = choices[row][col],
                        colorValue = colorObject.setColor(dojo.Color.named[color]);
                imgNode.alt = this.colorNames[color];
                imgNode.color = colorValue.toHex();
                var imgStyle = imgNode.style;
                imgStyle.color = imgStyle.backgroundColor = imgNode.color;
                var cellNode = dojo.doc.createElement("span");
                cellNode.appendChild(imgNode);
                dojo.forEach(["Dijitclick", "MouseEnter", "Focus", "Blur"], function(handler) {
                    this.connect(cellNode, "on" + handler.toLowerCase(), "_onCell" + handler);
                }, this);
                this.divNode.appendChild(cellNode);
                var cellStyle = cellNode.style;
                cellStyle.top = coords.topOffset + (row * coords.cHeight) + "px";
                cellStyle.left = coords.leftOffset + (col * coords.cWidth) + "px";
                dojo.attr(cellNode, "tabindex", "-1");
                cellNode.title = this.colorNames[color];
                dojo.addClass(cellNode, "dijitPaletteCell");
                dijit.setWaiRole(cellNode, "gridcell");
                cellNode.index = this._cellNodes.length;
                this._cellNodes.push(cellNode);
            }
		}
		this._xDim = choices[0].length;
		this._yDim = choices.length;
		this.connect(this.divNode, "onfocus", "_onDivNodeFocus");

		// Now set all events
		// The palette itself is navigated to with the tab key on the keyboard
		// Keyboard navigation within the Palette is with the arrow keys
		// Spacebar selects the color.
		// For the up key the index is changed by negative the x dimension.		

		var keyIncrementMap = {
			UP_ARROW: -this._xDim,
			// The down key the index is increase by the x dimension.	
			DOWN_ARROW: this._xDim,
			// Right and left move the index by 1.
			RIGHT_ARROW: 1,
			LEFT_ARROW: -1
		};
		for(var key in keyIncrementMap){
			this._connects.push(dijit.typematic.addKeyListener(this.domNode,
				{keyCode:dojo.keys[key], ctrlKey:false, altKey:false, shiftKey:false},
				this,
				function(){
					var increment = keyIncrementMap[key];
					return function(count){ this._navigateByKey(increment, count); };
				}(),
				this.timeoutChangeRate, this.defaultTimeout));
		}
	},

	focus: function(){
		// summary:
		//		Focus this ColorPalette.  Puts focus on the first swatch.
		this._focusFirst();
	},

	onChange: function(color){
		// summary:
		//		Callback when a color is selected.
		// color: String
		//		Hex value corresponding to color.
//		console.debug("Color selected is: "+color);
	},

	_focusFirst: function(){
		this._currentFocus = 0;
		var cellNode = this._cellNodes[this._currentFocus];
		window.setTimeout(function(){dijit.focus(cellNode)}, 0);
	},

	_onDivNodeFocus: function(evt){
		// focus bubbles on Firefox 2, so just make sure that focus has really
		// gone to the container
		if(evt.target === this.divNode){
			this._focusFirst();
		}
	},

	_onFocus: function(){
		// while focus is on the palette, set its tabindex to -1 so that on a
		// shift-tab from a cell, the container is not in the tab order
		dojo.attr(this.divNode, "tabindex", "-1");
	},

	_onBlur: function(){
		this._removeCellHighlight(this._currentFocus);
		// when focus leaves the palette, restore its tabindex, since it was
		// modified by _onFocus().
		dojo.attr(this.divNode, "tabindex", this.tabIndex);
	},

	_onCellDijitclick: function(/*Event*/ evt){
		// summary:
		//		Handler for click, enter key & space key. Selects the color.
		// evt:
		//		The event.
		var target = evt.currentTarget;
		if (this._currentFocus != target.index){
			this._currentFocus = target.index;
			window.setTimeout(function(){dijit.focus(target)}, 0);
		}
		this._selectColor(target);
		dojo.stopEvent(evt);
	},

	_onCellMouseEnter: function(/*Event*/ evt){
		// summary:
		//		Handler for onMouseOver. Put focus on the color under the mouse.
		// evt:
		//		The mouse event.
		var target = evt.currentTarget;
		window.setTimeout(function(){dijit.focus(target)}, 0);
	},

	_onCellFocus: function(/*Event*/ evt){
		// summary:
		//		Handler for onFocus. Removes highlight of
		//		the color that just lost focus, and highlights
		//		the new color.
		// evt:
		//		The focus event.
		this._removeCellHighlight(this._currentFocus);
		this._currentFocus = evt.currentTarget.index;
		dojo.addClass(evt.currentTarget, "dijitPaletteCellHighlight");
	},

	_onCellBlur: function(/*Event*/ evt){
		// summary:
		//		needed for Firefox 2 on Mac OS X
		this._removeCellHighlight(this._currentFocus);
	},

	_removeCellHighlight: function(index){
		dojo.removeClass(this._cellNodes[index], "dijitPaletteCellHighlight");
	},

	_selectColor: function(selectNode){	
		// summary:
		// 		This selects a color. It triggers the onChange event
		// area:
		//		The area node that covers the color being selected.
		var img = selectNode.getElementsByTagName("img")[0];
		this.onChange(this.value = img.color);
	},

	_navigateByKey: function(increment, typeCount){
		// summary:
		// 	  	This is the callback for typematic.
		// 		It changes the focus and the highlighed color.
		// increment:
		// 		How much the key is navigated.
		// typeCount:
		//		How many times typematic has fired.

		// typecount == -1 means the key is released.
		if(typeCount == -1){ return; }

		var newFocusIndex = this._currentFocus + increment;
		if(newFocusIndex < this._cellNodes.length && newFocusIndex > -1)
		{
			var focusNode = this._cellNodes[newFocusIndex];
			focusNode.focus();
		}
	}
});

}
