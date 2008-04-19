if(!dojo._hasResource["dojox.widget.FisheyeLite"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.widget.FisheyeLite"] = true;
dojo.provide("dojox.widget.FisheyeLite");
dojo.experimental("dojox.widget.FisheyeLite");

dojo.require("dijit._Widget");
dojo.require("dojox.fx.easing");

dojo.declare("dojox.widget.FisheyeLite",
	dijit._Widget,
	{
	// summary:  A Light-weight Fisheye Component, or an exhanced version
	//		of dojo.fx.Toggler ... 
	//
	// description:
	//		A Simple FisheyeList-like widget which (in the interest of
	//		performance) relies on well-styled content for positioning,
	// 		and natural page layout for rendering.
	//
	//		use position:absolute/relative nodes to prevent layout
	//		changes, and use caution when seleting properties to
	//		scale. Negative scaling works, but some properties
	//		react poorly to being set to negative values, IE being
	//		particularly annoying in that regard.
	//
	//		quirk: uses the domNode as the target of the animation
	//		unless it finds a node class="fisheyeTarget" in the container
	//		being turned into a FisheyeLite instance
	//
	// example:
	//	|	// make all the LI's in a node Fisheye's:
	//	|   dojo.query("#node li").forEach(function(n){
	// 	|		new dojox.widget.FisheyeLite({},n);
	//	|	});
	//
	// duationIn: Integer
	//		The time (in ms) the run the show animation
	durationIn: 350,
	
	// easeIn: Function
	//		An easing function to use for the show animation
	easeIn: dojox.fx.easing.backOut,
	
	// durationOut: Integer
	//		The Time (in ms) to run the hide animation
	durationOut: 1420,
	
	// easeOut: Function	
	// 		An easing function to use for the hide animation
	easeOut: dojox.fx.easing.elasticOut,

	//	properties: Object
	//			An object of "property":scale pairs
	//			defaults to font-size with a scale of 2.75
	properties: { 
		fontSize: 2.75
	},
	
	// unit: String
	//		Sometimes, you need to specify a unit. Should be part of
	//		properties attrib, but was trying to shorthand the logic there
	unit:"px",
	
	postCreate: function(){
		
		this.inherited(arguments);
		this._target = dojo.query(".fisheyeTarget",this.domNode)[0] || this.domNode;
		this._makeAnims();
		
		this.connect(this.domNode,"onmouseover","show");
		this.connect(this.domNode,"onmouseout","hide");
		this.connect(this._target,"onclick","onClick");

	},
	
	show: function(){
		// summary:
		//		Show this Fisheye item. 
		this._runningOut.stop();
		this._runningIn.play();
	},
	
	hide: function(){
		// summary:
		//		Hide this fisheye item on mouse leave
		this._runningIn.stop();
		this._runningOut.play();
	},
	
	_makeAnims: function(){
		// summary:
		//		Pre-generate the animations

		// create two properties: objects, one for each "state"
		var _in = {};
		var _out = {};
		var cs = dojo.getComputedStyle(this._target);		
		for(var p in this.properties){
			var v = parseInt(cs[p]);
			// note: do not set negative scale for [a list of properties] for IE support
			// note: filter:'s are your own issue, too ;)
			_out[p] = { end: v, unit:this.unit };
			_in[p] = {	end: (this.properties[p]*v), unit:this.unit };
		}
									
		this._runningIn = dojo.animateProperty({
			node: this._target,
			easing: this.easeIn,
			duration: this.durationIn,
			properties: _in
		});
		
		this._runningOut = dojo.animateProperty({
			node: this._target,
			duration: this.durationOut,
			easing: this.easeOut,
			properties: _out
		});
		
		this.connect(this._runningIn,"onEnd",dojo.hitch(this,"onSelected",this));
	},
	
	onClick: function(/* Event */e){
		// summary: stub function fired when target is clicked
		//		connect or override to use.
	},
	
	onSelected: function(/* Object */e){
		// summary: stub function fired when Fisheye Item is fully visible and
		// 		hovered. connect or override use.
	}
		
});

}
