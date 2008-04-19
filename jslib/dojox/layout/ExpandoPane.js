if(!dojo._hasResource["dojox.layout.ExpandoPane"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.layout.ExpandoPane"] = true;
dojo.provide("dojox.layout.ExpandoPane");
dojo.experimental("dojox.layout.ExpandoPane"); // just to show it can be done?

dojo.require("dijit.layout.ContentPane");
dojo.require("dijit._Templated");
dojo.require("dijit._Container");

dojo.declare("dojox.layout.ExpandoPane",
	[dijit.layout.ContentPane, dijit._Templated, dijit._Contained],
	{
	// summary: An experimental expando-pane for dijit.layout.BorderContainer
	//
	// description:
	//		Works just like a ContentPane inside of a borderContainer. Will expand/collapse on
	//		command, and supports having Layout Children as direct descendants
	//		via a custom "attachParent" attribute on the child.

	maxHeight:"",
	maxWidth:"",
	splitter:"",

	tamplateString:null,
	templateString:"<div class=\"dojoxExpandoPane\" dojoAttachEvent=\"ondblclick:toggle\" >\n\t<div dojoAttachPoint=\"titleWrapper\" class=\"dojoxExpandoTitle\">\n\t\t<div class=\"dojoxExpandoIcon\" dojoAttachPoint=\"iconNode\" dojoAttachEvent=\"onclick:toggle\"><span class=\"a11yNode\">X</span></div>\t\t\t\n\t\t<span class=\"dojoxExpandoTitleNode\" dojoAttachPoint=\"titleNode\">${title}</span>\n\t</div>\n\t<div class=\"dojoxExpandoWrapper\" dojoAttachPoint=\"cwrapper\" dojoAttachEvent=\"ondblclick:_trap\">\n\t\t<div class=\"dojoxExpandoContent\" dojoAttachPoint=\"containerNode\"></div>\n\t</div>\n</div>\n",

	_showing:true,
	_titleHeight: 28, // FIXME: calculate

	// easeOut: String|Function
	//		easing function used to hide pane
	easeOut:"dojo._DefaultEasing",
	// easeIn: String|Function
	//		easing function use to show pane
	easeIn:"dojo._DefaultEasing",
	// duration: Integer
	//		duration to run show/hide animations
	duration:420,
	
	postCreate:function(){

		this.inherited(arguments);
		this._animConnects = [];

		this._isHorizontal = true;
		
		this._container = this.getParent();
		this._closedSize = this._titleHeight = dojo.marginBox/*_getBorderBox*/(this.titleWrapper).h;
	
		if(typeof this.easeOut == "string"){
			this.easeOut = dojo.getObject(this.easeOut);
		}
		if(typeof this.easeIn == "string"){
			this.easeIn = dojo.getObject(this.easeIn); 
		}
	
		var thisClass = "";
		if(this.region){
			// FIXME: add suport for alternate region types?
			switch(this.region){
				case "right" :
					thisClass = "Right";
					break;
				case "left" :
					thisClass = "Left";
					break;
				case "top" :
					thisClass = "Top";
					break;
				case "bottom" :
					thisClass = "Bottom"; 
					break;
			}
			dojo.addClass(this.domNode,"dojoxExpando"+thisClass);
			this._isHorizontal = /top|bottom/.test(this.region);
		}
		dojo.style(this.domNode,"overflow","hidden");
	},
	
	startup: function(){
		this.inherited(arguments);
		if(this.splitter){
			// find our splitter and tie into it's drag logic
			var myid = this.id;
			dijit.registry.filter(function(w){
				return w && w.child && w.child.id == myid;
			}).forEach(dojo.hitch(this,function(w){
				this.connect(w,"_stopDrag","_afterResize");
			}));
		}
		this._currentSize = dojo.marginBox(this.domNode);
		this._showSize = this._currentSize[(this._isHorizontal ? "h" : "w")];
		this._setupAnims();
	},
	
	_afterResize: function(e){
		var tmp = this._currentSize;
		this._currentSize = dojo.marginBox(this.domNode);
		var n = this._currentSize[(this._isHorizontal ? "h" : "w")] 
		if(n> this._titleHeight){
			if(!this._showing){
				console.log('done being dragged:',e);			
				this._showing = !this._showing; 
				this._showEnd();
			}
			this._showSize = n;
			this._setupAnims();
		}else{
			this._showSize = tmp[(this._isHorizontal ? "h" : "w")];
			this._showing = false;
			this._hideWrapper();
			this._hideAnim.gotoPercent(89,true);
		}

	},
	
	_setupAnims:function(){
		// summary: create the show and hide animations
		dojo.forEach(this._animConnects,dojo.disconnect);
		
		var _common = {
			node:this.domNode,
			duration:this.duration
		};

		var isHorizontal = this._isHorizontal;
		var showProps = {};
		var hideProps = {};

		var dimension = isHorizontal ? "height" : "width";
		showProps[dimension] = { 
			end: this._showSize, 
			unit:"px" 
		};
		hideProps[dimension] = { 
			end: this._closedSize, 
			unit:"px"
		};

		this._showAnim = dojo.animateProperty(dojo.mixin(_common,{
			easing:this.easeIn,
			properties: showProps 
		}));
		this._hideAnim = dojo.animateProperty(dojo.mixin(_common,{
			easing:this.easeOut,
			properties: hideProps
		}));

		this._animConnects = [
			dojo.connect(this._showAnim,"onEnd",this,"_showEnd"),
			dojo.connect(this._hideAnim,"onEnd",this,"_hideEnd")
		];
	},
	
	toggle:function(e){
		// summary: toggle this pane's visibility
		if(this._showing){
			this._hideWrapper();
			if(this._showAnim && this._showAnim.stop()){}
			this._hideAnim.play();
		}else{
			if(this._hideAnim && this._hideAnim.stop()){}
			this._showAnim.play();
		}
		this._showing = !this._showing;
	},
	
	_hideWrapper:function(){
		dojo.style(this.cwrapper,{
				"visibility":"hidden",
				"opacity":"0",
				"overflow":"hidden"
		});
	},
	
	_showEnd: function(){
		// summary: common animation onEnd code
		dojo.style(this.cwrapper,{ "opacity":"0", "visibility":"visible" });
		dojo.fadeIn({ node:this.cwrapper, duration:227 }).play(1);
		dojo.removeClass(this.domNode,"dojoxExpandoClosed");
		setTimeout(dojo.hitch(this._container, "layout"), 15);
	},
	
	_hideEnd: function(){
		dojo.addClass(this.domNode,"dojoxExpandoClosed");
		setTimeout(dojo.hitch(this._container, "layout"), 15);
	},
	
	resize: function(){
		// summary: we aren't a layout widget, but need to act like one:
		var size = dojo.marginBox(this.domNode);
		// FIXME: do i even need to do this query/forEach? why not just set the containerHeight always
		dojo.query("[attachParent]",this.domNode).forEach(function(n){
			if(dijit.byNode(n)){
				var h = size.h - this._titleHeight;
				dojo.style(this.containerNode,"height", h +"px");
			}
		},this);
		this.inherited(arguments);
	},
	
	_trap: function(e){
		dojo.stopEvent(e);
	}

});

}
