if(!dojo._hasResource["dojox.charting.axis2d.Base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.axis2d.Base"] = true;
dojo.provide("dojox.charting.axis2d.Base");

dojo.require("dojox.charting.Element");

dojo.declare("dojox.charting.axis2d.Base", dojox.charting.Element, {
	constructor: function(chart, kwArgs){
		this.vertical = kwArgs && kwArgs.vertical;
	},
	clear: function(){
		return this;
	},
	initialized: function(){
		return false;
	},
	calculate: function(min, max, span){
		return this;
	},
	getScaler: function(){
		return null;
	},
	getOffsets: function(){
		return {l: 0, r: 0, t: 0, b: 0};
	},
	render: function(dim, offsets){
		return this;
	}
});

}
