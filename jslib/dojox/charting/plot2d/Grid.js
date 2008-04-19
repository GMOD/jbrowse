if(!dojo._hasResource["dojox.charting.plot2d.Grid"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Grid"] = true;
dojo.provide("dojox.charting.plot2d.Grid");

dojo.require("dojox.charting.Element");
dojo.require("dojox.charting.plot2d.common");
dojo.require("dojox.lang.functional");

(function(){
	var du = dojox.lang.utils;

	dojo.declare("dojox.charting.plot2d.Grid", dojox.charting.Element, {
		defaultParams: {
			hAxis: "x",			// use a horizontal axis named "x"
			vAxis: "y",			// use a vertical axis named "y"
			hMajorLines: true,	// draw horizontal major lines
			hMinorLines: false,	// draw horizontal minor lines
			vMajorLines: true,	// draw vertical major lines
			vMinorLines: false,	// draw vertical minor lines
			hStripes: "none",	// TBD
			vStripes: "none"	// TBD
		},
		optionalParams: {},	// no optional parameters
		
		constructor: function(chart, kwArgs){
			this.opt = dojo.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
		},
		clear: function(){
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
			// nothing
			return this;
		},
		calculateAxes: function(dim){
			// nothing
			return this;
		},
		getRequiredColors: function(){
			return 0;
		},
		render: function(dim, offsets){
			// draw horizontal stripes and lines
			if(!this.dirty){ return this; }
			this.cleanGroup();
			var s = this.group, ta = this.chart.theme.axis,
				scaler = this._vAxis.getScaler();
			if(this.opt.hMinorLines && scaler.minor.tick){
				for(var i = 0; i < scaler.minor.count; ++i){
					var y = dim.height - offsets.b - scaler.scale * 
							(scaler.minor.start - scaler.bounds.lower + i * scaler.minor.tick);
					s.createLine({
						x1: offsets.l,
						y1: y,
						x2: dim.width - offsets.r,
						y2: y
					}).setStroke(ta.minorTick);
				}
			}
			if(this.opt.hMajorLines && scaler.major.tick){
				for(var i = 0; i < scaler.major.count; ++i){
					var y = dim.height - offsets.b - scaler.scale * 
							(scaler.major.start - scaler.bounds.lower + i * scaler.major.tick);
					s.createLine({
						x1: offsets.l,
						y1: y,
						x2: dim.width - offsets.r,
						y2: y
					}).setStroke(ta.majorTick);
				}
			}
			// draw vertical stripes and lines
			scaler = this._hAxis.getScaler();
			if(this.opt.vMinorLines && scaler.minor.tick){
				for(var i = 0; i < scaler.minor.count; ++i){
					var x = offsets.l + scaler.scale * 
							(scaler.minor.start - scaler.bounds.lower + i * scaler.minor.tick);
					s.createLine({
						x1: x,
						y1: offsets.t,
						x2: x,
						y2: dim.height - offsets.b
					}).setStroke(ta.minorTick);
				}
			}
			if(this.opt.vMajorLines && scaler.major.tick){
				for(var i = 0; i < scaler.major.count; ++i){
					var x = offsets.l + scaler.scale * 
							(scaler.major.start - scaler.bounds.lower + i * scaler.major.tick);
					s.createLine({
						x1: x,
						y1: offsets.t,
						x2: x,
						y2: dim.height - offsets.b
					}).setStroke(ta.majorTick);
				}
			}
			this.dirty = false;
			return this;
		}
	});
})();

}
