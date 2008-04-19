if(!dojo._hasResource["dojox.charting.plot2d.Base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Base"] = true;
dojo.provide("dojox.charting.plot2d.Base");

dojo.require("dojox.charting.Element");
dojo.require("dojox.charting.plot2d.common");

dojo.declare("dojox.charting.plot2d.Base", dojox.charting.Element, {
	clear: function(){
		this.series = [];
		this._hAxis = null;
		this._vAxis = null;
		this.dirty = true;
		return this;
	},
	setAxis: function(axis){
		if(axis){
			this[axis.vertical ? "_vAxis" : "_hAxis"] = axis;
		}
		return this;
	},
	addSeries: function(run){
		this.series.push(run);
		return this;
	},
	calculateAxes: function(dim){
		return this;
	},
	render: function(dim, offsets){
		return this;
	},
	getRequiredColors: function(){
		return this.series.length;
	},
	
	// utilities
	_calc: function(dim, stats){
		// calculate scaler
		if(this._hAxis){
			if(!this._hAxis.initialized()){
				this._hAxis.calculate(stats.hmin, stats.hmax, dim.width);
			}
			this._hScaler = this._hAxis.getScaler();
		}else{
			this._hScaler = {bounds: {lower: stats.hmin, upper: stats.hmax}, 
				scale: dim.width / (stats.hmax - stats.hmin)};
		}
		if(this._vAxis){
			if(!this._vAxis.initialized()){
				this._vAxis.calculate(stats.vmin, stats.vmax, dim.height);
			}
			this._vScaler = this._vAxis.getScaler();
		}else{
			this._vScaler = {bounds: {lower: stats.vmin, upper: stats.vmax}, 
				scale: dim.height / (stats.vmax - stats.vmin)};
		}
	}
});

}
