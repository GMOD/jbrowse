if(!dojo._hasResource["dojox.charting.plot2d.Markers"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Markers"] = true;
dojo.provide("dojox.charting.plot2d.Markers");

dojo.require("dojox.charting.plot2d.Default");

dojo.declare("dojox.charting.plot2d.Markers", dojox.charting.plot2d.Default, {
	constructor: function(){
		this.opt.markers = true;
	}
});

}
