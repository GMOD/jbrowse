if(!dojo._hasResource["dojox.charting.Element"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.Element"] = true;
dojo.provide("dojox.charting.Element");

dojo.declare("dojox.charting.Element", null, {
	constructor: function(chart){
		this.chart = chart;
		this.group = null;
		this.htmlElements = [];
		this.dirty = true;
	},
	createGroup: function(creator){
		if(!creator){ creator = this.chart.surface; }
		if(!this.group){
			this.group = creator.createGroup();
		}
		return this;
	},
	purgeGroup: function(){
		this.destroyHtmlElements();
		if(this.group){
			this.group.clear();
			this.group.removeShape();
			this.group = null;
		}
		this.dirty = true;
		return this;
	},
	cleanGroup: function(creator){
		this.destroyHtmlElements();
		if(!creator){ creator = this.chart.surface; }
		if(this.group){
			this.group.clear();
		}else{
			this.group = creator.createGroup();
		}
		this.dirty = true;
		return this;
	},
	destroyHtmlElements: function(){
		dojo.forEach(this.htmlElements, dojo._destroyElement);
		this.htmlElements = [];
	},
	destroy: function(){
		this.purgeGroup();
	}
});

}
