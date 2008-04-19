if(!dojo._hasResource["dojox.charting.plot2d.common"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.common"] = true;
dojo.provide("dojox.charting.plot2d.common");

dojo.require("dojo.colors");
dojo.require("dojox.gfx");
dojo.require("dojox.lang.functional");

(function(){
	var df = dojox.lang.functional, dc = dojox.charting.plot2d.common;
	
	dojo.mixin(dojox.charting.plot2d.common, {
		makeStroke: function(stroke){
			if(!stroke){ return stroke; }
			if(typeof stroke == "string" || stroke instanceof dojo.Color){
				stroke = {color: stroke};
			}
			return dojox.gfx.makeParameters(dojox.gfx.defaultStroke, stroke);
		},
		augmentColor: function(target, color){
			var t = new dojo.Color(target),
				c = new dojo.Color(color);
			c.a = t.a;
			return c;
		},
		augmentStroke: function(stroke, color){
			var s = dc.makeStroke(stroke);
			if(s){
				s.color = dc.augmentColor(s.color, color);
			}
			return s;
		},
		augmentFill: function(fill, color){
			var fc, c = new dojo.Color(color);
			if(typeof fill == "string" || fill instanceof dojo.Color){
				return dc.augmentColor(fill, color);
			}
			return fill;
		},
		
		defaultStats: {hmin: Number.POSITIVE_INFINITY, hmax: Number.NEGATIVE_INFINITY, 
			vmin: Number.POSITIVE_INFINITY, vmax: Number.NEGATIVE_INFINITY},
		
		collectSimpleStats: function(series){
			var stats = dojo.clone(dc.defaultStats);
			for(var i = 0; i < series.length; ++i){
				var run = series[i];
				if(!run.data.length){ continue; }
				if(typeof run.data[0] == "number"){
					// 1D case
					var old_vmin = stats.vmin, old_vmax = stats.vmax;
					if(!("ymin" in run) || !("ymax" in run)){
						dojo.forEach(run.data, function(val, i){
							var x = i + 1, y = val;
							if(isNaN(y)){ y = 0; }
							stats.hmin = Math.min(stats.hmin, x);
							stats.hmax = Math.max(stats.hmax, x);
							stats.vmin = Math.min(stats.vmin, y);
							stats.vmax = Math.max(stats.vmax, y);
						});
					}
					if("ymin" in run){ stats.vmin = Math.min(old_vmin, run.ymin); }
					if("ymax" in run){ stats.vmax = Math.max(old_vmax, run.ymax); }
				}else{
					// 2D case
					var old_hmin = stats.hmin, old_hmax = stats.hmax,
						old_vmin = stats.vmin, old_vmax = stats.vmax;
					if(!("xmin" in run) || !("xmax" in run) || !("ymin" in run) || !("ymax" in run)){
						dojo.forEach(run.data, function(val, i){
							var x = val.x, y = val.y;
							if(isNaN(x)){ x = 0; }
							if(isNaN(y)){ y = 0; }
							stats.hmin = Math.min(stats.hmin, x);
							stats.hmax = Math.max(stats.hmax, x);
							stats.vmin = Math.min(stats.vmin, y);
							stats.vmax = Math.max(stats.vmax, y);
						});
					}
					if("xmin" in run){ stats.hmin = Math.min(old_hmin, run.xmin); }
					if("xmax" in run){ stats.hmax = Math.max(old_hmax, run.xmax); }
					if("ymin" in run){ stats.vmin = Math.min(old_vmin, run.ymin); }
					if("ymax" in run){ stats.vmax = Math.max(old_vmax, run.ymax); }
				}
			}
			return stats;
		},
		
		collectStackedStats: function(series){
			// collect statistics
			var stats = dojo.clone(dc.defaultStats);
			if(series.length){
				// 1st pass: find the maximal length of runs
				stats.hmin = Math.min(stats.hmin, 1);
				stats.hmax = df.foldl(series, "seed, run -> Math.max(seed, run.data.length)", stats.hmax);
				// 2nd pass: stack values
				for(var i = 0; i < stats.hmax; ++i){
					var v = series[0].data[i];
					if(isNaN(v)){ v = 0; }
					stats.vmin = Math.min(stats.vmin, v);
					for(var j = 1; j < series.length; ++j){
						var t = series[j].data[i];
						if(isNaN(t)){ t = 0; }
						v += t;
					}
					stats.vmax = Math.max(stats.vmax, v);
				}
			}
			return stats;
		}
	});
})();

}
