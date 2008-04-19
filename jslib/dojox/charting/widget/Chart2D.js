if(!dojo._hasResource["dojox.charting.widget.Chart2D"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.widget.Chart2D"] = true;
dojo.provide("dojox.charting.widget.Chart2D");

dojo.require("dijit._Widget");
dojo.require("dojox.charting.Chart2D");
dojo.require("dojox.lang.functional");

(function(){
	var collectAxisParams, collectPlotParams, collectDataParams,
		notNull = function(o){ return o; },
		df = dojox.lang.functional,
		du = dojox.lang.utils;
	
	dojo.declare("dojox.charting.widget.Chart2D", dijit._Widget, {
		// parameters for the markup
		
		// theme for the chart
		theme: null,
		
		// margins for the chart: {l: 10, r: 10, t: 10, b: 10}
		margins: null,
		
		// chart area
		stroke: null,
		fill:   null,
		
		// methods
		
		buildRendering: function(){
			var n = this.domNode = this.srcNodeRef;
			
			// collect chart parameters
			var axes   = dojo.filter(dojo.query("> .axis",   n).map(collectAxisParams), notNull);
			var plots  = dojo.filter(dojo.query("> .plot",   n).map(collectPlotParams), notNull);
			var series = dojo.filter(dojo.query("> .series", n).map(collectDataParams), notNull);
			
			// build the chart
			n.innerHTML = "";
			var c = this.chart = new dojox.charting.Chart2D(n, {
				margins: this.margins, 
				stroke:  this.stroke,
				fill:    this.fill
			});
			
			// add collected parameters
			if(this.theme){
				c.setTheme(this.theme);
			}
			dojo.forEach(axes, function(axis){
				c.addAxis(axis.name, axis.kwArgs);
			});
			dojo.forEach(plots, function(plot){
				c.addPlot(plot.name, plot.kwArgs);
			});
			var render = df.foldl(series, function(render, series){
				if(series.type == "data"){
					c.addSeries(series.name, series.data, series.kwArgs);
					render = true;
				}else{
					c.addSeries(series.name, [0], series.kwArgs);
					var kw = {};
					du.updateWithPattern(
						kw, 
						series.kwArgs, 
						{
							"query": "", 
							"queryOptions": null, 
							"start": 0, 
							"count": 1 //, 
							// "sort": []
						}, 
						true
					);
					if(series.kwArgs.sort){
						// sort is a complex object type and doesn't survive coercian
						kw.sort = dojo.clone(series.kwArgs.sort);
					}
					dojo.mixin(kw, {
						onComplete: function(data){
							var values;
							if("valueFn" in series.kwArgs){
								var fn = series.kwArgs.valueFn;
								values = dojo.map(data, function(x){
									return fn(series.data.getValue(x, series.field, 0));
								});
							}else{
								values = dojo.map(data, function(x){
									return series.data.getValue(x, series.field, 0);
								});
							}
							c.addSeries(series.name, values, series.kwArgs).render();
						}
					});
					series.data.fetch(kw);
				}
				return render;
			}, false);
			if(render){ c.render(); }
		},
		resize: function(box){
			dojo.marginBox(this.domNode, box);
			this.chart.resize();
		}
	});
	
	collectAxisParams = function(node){
		var name = node.getAttribute("name"), type = node.getAttribute("type");
		if(!name){ return null; }
		var o = {name: name, kwArgs: {}}, kw = o.kwArgs;
		if(type){
			if(dojox.charting.axis2d[type]){
				type = dojox._scopeName + ".charting.axis2d." + type;
			}
			var axis = eval("(" + type + ")");
			if(axis){ kw.type = axis; } 
		}else{
			type = dojox._scopeName + ".charting.axis2d.Default";
		}
		var dp = eval("(" + type + ".prototype.defaultParams)");
		for(var x in dp){
			if(x in kw){ continue; }
			var attr = node.getAttribute(x);
			kw[x] = du.coerceType(dp[x], attr == null ? dp[x] : attr);
		}
		var op = eval("(" + type + ".prototype.optionalParams)");
		for(var x in op){
			if(x in kw){ continue; }
			var attr = node.getAttribute(x);
			if(attr != null){
				kw[x] = du.coerceType(op[x], attr);
			}
		}
		return o;
	};
	
	collectPlotParams = function(node){
		var name = node.getAttribute("name"), type = node.getAttribute("type");
		if(!name){ return null; }
		var o = {name: name, kwArgs: {}}, kw = o.kwArgs;
		if(type){
			if(dojox.charting.plot2d[type]){
				type = dojox._scopeName + ".charting.plot2d." + type;
			}
			var plot = eval("(" + type + ")");
			if(plot){ kw.type = plot; } 
		}else{
			type = dojox._scopeName + ".charting.plot2d.Default";
		}
		var dp = eval("(" + type + ".prototype.defaultParams)");
		for(var x in dp){
			if(x in kw){ continue; }
			var attr = node.getAttribute(x);
			kw[x] = du.coerceType(dp[x], attr == null ? dp[x] : attr);
		}
		var op = eval("(" + type + ".prototype.optionalParams)");
		for(var x in op){
			if(x in kw){ continue; }
			var attr = node.getAttribute(x);
			if(attr != null){
				kw[x] = du.coerceType(op[x], attr);
			}
		}
		return o;
	};
	
	collectDataParams = function(node){
		var name = node.getAttribute("name");
		if(!name){ return null; }
		var o = {name: name, kwArgs: {}}, kw = o.kwArgs, t;
		t = node.getAttribute("plot");
		if(t != null){ kw.plot = t; }
		t = node.getAttribute("marker");
		if(t != null){ kw.marker = t; }
		t = node.getAttribute("stroke");
		if(t != null){ kw.stroke = eval("(" + t + ")"); }
		t = node.getAttribute("fill");
		if(t != null){ kw.fill = eval("(" + t + ")"); }
		t = node.getAttribute("data");
		if(t != null){
			o.type = "data";
			o.data = dojo.map(String(t).split(','), Number);
			return o;
		}
		t = node.getAttribute("array");
		if(t != null){
			o.type = "data";
			o.data = eval("(" + t + ")");
			return o;
		}
		t = node.getAttribute("store");
		if(t != null){
			o.type = "store";
			o.data = eval("(" + t + ")");
			t = node.getAttribute("field");
			o.field = t != null ? t : "value";
			t = node.getAttribute("query");
			if(!!t){ kw.query = t; }
			t = node.getAttribute("queryOptions");
			if(!!t){ kw.queryOptions = eval("(" + t + ")"); }
			t = node.getAttribute("start");
			if(!!t){ kw.start = Number(t); }
			t = node.getAttribute("count");
			if(!!t){ kw.count = Number(t); }
			t = node.getAttribute("sort");
			if(!!t){ kw.sort = eval("("+t+")"); }
			t = node.getAttribute("valueFn");
			if(!!t){ kw.valueFn = df.lambda(t); }
			return o;
		}
		return null;
	};
})();

}
