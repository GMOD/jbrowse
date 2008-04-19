if(!dojo._hasResource["dojox.charting.plot2d.MarkersOnly"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.MarkersOnly"] = true;
dojo.provide("dojox.charting.plot2d.MarkersOnly");

dojo.require("dojox.charting.plot2d.Default");

dojo.declare("dojox.charting.plot2d.MarkersOnly", dojox.charting.plot2d.Default, {
	constructor: function(){
		this.opt.lines   = false;
		this.opt.markers = true;
	}
});

}
