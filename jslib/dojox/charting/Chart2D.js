if(!dojo._hasResource["dojox.charting.Chart2D"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.Chart2D"] = true;
dojo.provide("dojox.charting.Chart2D");

dojo.require("dojox.gfx");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.fold");
dojo.require("dojox.lang.functional.reversed");

dojo.require("dojox.charting.Theme");
dojo.require("dojox.charting.Series");

dojo.require("dojox.charting.axis2d.Default");

dojo.require("dojox.charting.plot2d.Default");
dojo.require("dojox.charting.plot2d.Lines");
dojo.require("dojox.charting.plot2d.Areas");
dojo.require("dojox.charting.plot2d.Markers");
dojo.require("dojox.charting.plot2d.MarkersOnly");
dojo.require("dojox.charting.plot2d.Scatter");
dojo.require("dojox.charting.plot2d.Stacked");
dojo.require("dojox.charting.plot2d.StackedLines");
dojo.require("dojox.charting.plot2d.StackedAreas");
dojo.require("dojox.charting.plot2d.Columns");
dojo.require("dojox.charting.plot2d.StackedColumns");
dojo.require("dojox.charting.plot2d.ClusteredColumns");
dojo.require("dojox.charting.plot2d.Bars");
dojo.require("dojox.charting.plot2d.StackedBars");
dojo.require("dojox.charting.plot2d.ClusteredBars");
dojo.require("dojox.charting.plot2d.Grid");
dojo.require("dojox.charting.plot2d.Pie");

(function(){
	var df = dojox.lang.functional, dc = dojox.charting, 
		clear = df.lambda("item.clear()"), 
		purge = df.lambda("item.purgeGroup()"),
		destroy = df.lambda("item.destroy()"),
		makeClean = df.lambda("item.dirty = false"),
		makeDirty = df.lambda("item.dirty = true");
		
	dojo.declare("dojox.charting.Chart2D", null, {
		constructor: function(node, kwArgs){
			// initialize parameters
			if(!kwArgs){ kwArgs = {}; }
			this.margins = kwArgs.margins ? kwArgs.margins : {l: 10, t: 10, r: 10, b: 10};
			this.stroke  = kwArgs.stroke;
			this.fill    = kwArgs.fill;
			
			// default initialization
			this.theme = null;
			this.axes = {};		// map of axes
			this.stack = [];	// stack of plotters
			this.plots = {};	// map of plotter indices
			this.series = [];	// stack of data runs
			this.runs = {};		// map of data run indices
			this.dirty = true;
			this.coords = null;
			
			// create a surface
			this.node = dojo.byId(node);
			var box = dojo.marginBox(node);
			this.surface = dojox.gfx.createSurface(this.node, box.w, box.h);
		},
		destroy: function(){
			dojo.forEach(this.series, destroy);
			dojo.forEach(this.stack,  destroy);
			df.forIn(this.axes, destroy);
		},
		getCoords: function(){
			if(!this.coords){
				this.coords = dojo.coords(this.node, true);
			}
			return this.coords;
		},
		setTheme: function(theme){
			this.theme = theme;
			this.dirty = true;
			return this;
		},
		addAxis: function(name, kwArgs){
			var axis;
			if(!kwArgs || !("type" in kwArgs)){
				axis = new dc.axis2d.Default(this, kwArgs);
			}else{
				axis = typeof kwArgs.type == "string" ?
					new dc.axis2d[kwArgs.type](this, kwArgs) :
					new kwArgs.type(this, kwArgs);
			}
			axis.name = name;
			axis.dirty = true;
			if(name in this.axes){
				this.axes[name].destroy();
			}
			this.axes[name] = axis;
			this.dirty = true;
			return this;
		},
		addPlot: function(name, kwArgs){
			var plot;
			if(!kwArgs || !("type" in kwArgs)){
				plot = new dc.plot2d.Default(this, kwArgs);
			}else{
				plot = typeof kwArgs.type == "string" ?
					new dc.plot2d[kwArgs.type](this, kwArgs) :
					new kwArgs.type(this, kwArgs);
			}
			plot.name = name;
			plot.dirty = true;
			if(name in this.plots){
				this.stack[this.plots[name]].destroy();
				this.stack[this.plots[name]] = plot;
			}else{
				this.plots[name] = this.stack.length;
				this.stack.push(plot);
			}
			this.dirty = true;
			return this;
		},
		addSeries: function(name, data, kwArgs){
			var run = new dc.Series(this, data, kwArgs);
			if(name in this.runs){
				this.series[this.runs[name]].destroy();
				this.series[this.runs[name]] = run;
			}else{
				this.runs[name] = this.series.length;
				this.series.push(run);
			}
			this.dirty = true;
			// fix min/max
			if(!("ymin" in run) && "min" in run){ run.ymin = run.min; }
			if(!("ymax" in run) && "max" in run){ run.ymax = run.max; }
			return this;
		},
		updateSeries: function(name, data){
			if(name in this.runs){
				var run = this.series[this.runs[name]],
					plot = this.stack[this.plots[run.plot]], axis;
				run.data = data;
				run.dirty = true;
				// check to see if axes and plot should be updated
				if(plot.hAxis){
					axis = this.axes[plot.hAxis];
					if(axis.dependOnData()){
						axis.dirty = true;
						// find all plots and mark them dirty
						dojo.forEach(this.stack, function(p){
							if(p.hAxis && p.hAxis == plot.hAxis){
								p.dirty = true;
							}
						});
					}
				}else{
					plot.dirty = true;
				}
				if(plot.vAxis){
					axis = this.axes[plot.vAxis];
					if(axis.dependOnData()){
						axis.dirty = true;
						// find all plots and mark them dirty
						dojo.forEach(this.stack, function(p){
							if(p.vAxis && p.vAxis == plot.vAxis){
								p.dirty = true;
							}
						});
					}
				}else{
					plot.dirty = true;
				}
			}
			return this;
		},
		resize: function(width, height){
			var box;
			switch(arguments.length){
				case 0:
					box = dojo.marginBox(this.node);
					break;
				case 1: 
					box = width;
					break;
				default:
					box = {w: width, h: height};
					break;
			}
			dojo.marginBox(this.node, box);
			this.surface.setDimensions(box.w, box.h);
			this.dirty = true;
			this.coords = null;
			return this.render();
		},
		render: function(){
			if(this.dirty){
				return this.fullRender();
			}
			
			// calculate geometry
			dojo.forEach(this.stack, function(plot){
				if(plot.dirty || (plot.hAxis && this.axes[plot.hAxis].dirty) ||
						(plot.vAxis && this.axes[plot.vAxis].dirty)){
					plot.calculateAxes(this.plotArea);
				}
			}, this);

			// go over the stack backwards
			df.forEachRev(this.stack, function(plot){ plot.render(this.dim, this.offsets); }, this);
			
			// go over axes
			df.forIn(this.axes, function(axis){ axis.render(this.dim, this.offsets); }, this);

			this._makeClean();

			// BEGIN FOR HTML CANVAS 
			if(this.surface.render){ this.surface.render(); };	
			// END FOR HTML CANVAS
			
			return this;
		},
		fullRender: function(){
			this._makeDirty();
			
			// clear old values
			dojo.forEach(this.stack,  clear);
			dojo.forEach(this.series, purge);
			df.forIn(this.axes, purge);
			dojo.forEach(this.stack,  purge);
			this.surface.clear();
			
			// rebuild new connections, and add defaults
			
			// assign series
			dojo.forEach(this.series, function(run){
				if(!(run.plot in this.plots)){
					var plot = new dc.plot2d.Default(this, {});
					plot.name = run.plot;
					this.plots[run.plot] = this.stack.length;
					this.stack.push(plot);
				}
				this.stack[this.plots[run.plot]].addSeries(run);
			}, this);
			// assign axes
			dojo.forEach(this.stack, function(plot){
				if(plot.hAxis){
					plot.setAxis(this.axes[plot.hAxis]);
				}
				if(plot.vAxis){
					plot.setAxis(this.axes[plot.vAxis]);
				}
			}, this);
			// set up a theme
			if(!this.theme){
				this.theme = new dojox.charting.Theme(dojox.charting._def);
			}
			var requiredColors = df.foldl(this.stack, "z + plot.getRequiredColors()", 0);
			this.theme.defineColors({num: requiredColors, cache: false});
			
			// calculate geometry
			
			// 1st pass
			var dim = this.dim = this.surface.getDimensions();
			dim.width  = dojox.gfx.normalizedLength(dim.width);
			dim.height = dojox.gfx.normalizedLength(dim.height);
			df.forIn(this.axes, clear);
			dojo.forEach(this.stack, function(plot){ plot.calculateAxes(dim); });
			
			// assumption: we don't have stacked axes yet
			var offsets = this.offsets = {l: 0, r: 0, t: 0, b: 0};
			df.forIn(this.axes, function(axis){
				df.forIn(axis.getOffsets(), function(o, i){ offsets[i] += o; });
			});
			// add margins
			df.forIn(this.margins, function(o, i){ offsets[i] += o; });
			
			// 2nd pass with realistic dimensions
			this.plotArea = {width: dim.width - offsets.l - offsets.r, height: dim.height - offsets.t - offsets.b};
			df.forIn(this.axes, clear);
			dojo.forEach(this.stack, function(plot){ plot.calculateAxes(this.plotArea); }, this);
			
			// generate shapes
			
			// draw a chart background
			var t = this.theme,
				fill   = this.fill   ? this.fill   : (t.chart && t.chart.fill),
				stroke = this.stroke ? this.stroke : (t.chart && t.chart.stroke);
			if(fill){
				this.surface.createRect({
					width:  dim.width, 
					height: dim.height
				}).setFill(fill);
			}
			if(stroke){
				this.surface.createRect({
					width:  dim.width - 1, 
					height: dim.height - 1
				}).setStroke(stroke);
			}
			// draw a plot background
			fill   = t.plotarea && t.plotarea.fill;
			stroke = t.plotarea && t.plotarea.stroke;
			if(fill){
				this.surface.createRect({
					x: offsets.l, y: offsets.t,
					width:  dim.width  - offsets.l - offsets.r, 
					height: dim.height - offsets.t - offsets.b
				}).setFill(fill);
			}
			if(stroke){
				this.surface.createRect({
					x: offsets.l, y: offsets.t,
					width:  dim.width  - offsets.l - offsets.r - 1, 
					height: dim.height - offsets.t - offsets.b - 1
				}).setStroke(stroke);
			}
			
			// go over the stack backwards
			df.foldr(this.stack, function(z, plot){ return plot.render(dim, offsets), 0; }, 0);
			
			// go over axes
			df.forIn(this.axes, function(axis){ axis.render(dim, offsets); });
			
			this._makeClean();
			
			return this;
		},
		_makeClean: function(){
			// reset dirty flags
			dojo.forEach(this.axes,   makeClean);
			dojo.forEach(this.stack,  makeClean);
			dojo.forEach(this.series, makeClean);
			this.dirty = false;
		},
		_makeDirty: function(){
			// reset dirty flags
			dojo.forEach(this.axes,   makeDirty);
			dojo.forEach(this.stack,  makeDirty);
			dojo.forEach(this.series, makeDirty);
			this.dirty = true;
		}
	});
})();

}
