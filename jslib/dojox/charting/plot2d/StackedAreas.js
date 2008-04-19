if(!dojo._hasResource["dojox.charting.plot2d.StackedAreas"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.StackedAreas"] = true;
dojo.provide("dojox.charting.plot2d.StackedAreas");

dojo.require("dojox.charting.plot2d.Stacked");

dojo.declare("dojox.charting.plot2d.StackedAreas", dojox.charting.plot2d.Stacked, {
	constructor: function(){
		this.opt.lines = true;
		this.opt.areas = true;
	}
});

}
