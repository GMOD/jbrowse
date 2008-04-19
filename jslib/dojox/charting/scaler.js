if(!dojo._hasResource["dojox.charting.scaler"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.scaler"] = true;
dojo.provide("dojox.charting.scaler");

(function(){
	var deltaLimit = 3;	// pixels
	
	var isText = function(val, text){
		val = val.toLowerCase();
		for(var i = 0; i < text.length; ++i){
			if(val == text[i]){ return true; }
		}
		return false;
	};
	
	var calcTicks = function(min, max, kwArgs, majorTick, minorTick, microTick, span){
		kwArgs = dojo.clone(kwArgs);
		if(!majorTick){
			if(kwArgs.fixUpper == "major"){ kwArgs.fixUpper = "minor"; }
			if(kwArgs.fixLower == "major"){ kwArgs.fixLower = "minor"; }
		}
		if(!minorTick){
			if(kwArgs.fixUpper == "minor"){ kwArgs.fixUpper = "micro"; }
			if(kwArgs.fixLower == "minor"){ kwArgs.fixLower = "micro"; }
		}
		if(!microTick){
			if(kwArgs.fixUpper == "micro"){ kwArgs.fixUpper = "none"; }
			if(kwArgs.fixLower == "micro"){ kwArgs.fixLower = "none"; }
		}
		var lowerBound = isText(kwArgs.fixLower, ["major"]) ? 
				Math.floor(min / majorTick) * majorTick :
					isText(kwArgs.fixLower, ["minor"]) ? 
						Math.floor(min / minorTick) * minorTick :
							isText(kwArgs.fixLower, ["micro"]) ?
								Math.floor(min / microTick) * unit : min,
			upperBound = isText(kwArgs.fixUpper, ["major"]) ? 
				Math.ceil(max / majorTick) * majorTick :
					isText(kwArgs.fixUpper, ["minor"]) ? 
						Math.ceil(max / minorTick) * minorTick :
							isText(kwArgs.fixUpper, ["unit"]) ?
								Math.ceil(max / unit) * unit : max,
			majorStart = (isText(kwArgs.fixLower, ["major"]) || !majorTick) ?
				lowerBound : Math.ceil(lowerBound / majorTick) * majorTick,
			minorStart = (isText(kwArgs.fixLower, ["major", "minor"]) || !minorTick) ?
				lowerBound : Math.ceil(lowerBound / minorTick) * minorTick,
			microStart = (isText(kwArgs.fixLower, ["major", "minor", "micro"]) || ! microTick) ?
				lowerBound : Math.ceil(lowerBound / microTick) * microTick,
			majorCount = !majorTick ? 0 : (isText(kwArgs.fixUpper, ["major"]) ?
				Math.round((upperBound - majorStart) / majorTick) :
				Math.floor((upperBound - majorStart) / majorTick)) + 1,
			minorCount = !minorTick ? 0 : (isText(kwArgs.fixUpper, ["major", "minor"]) ?
				Math.round((upperBound - minorStart) / minorTick) :
				Math.floor((upperBound - minorStart) / minorTick)) + 1,
			microCount = !microTick ? 0 : (isText(kwArgs.fixUpper, ["major", "minor", "micro"]) ?
				Math.round((upperBound - microStart) / microTick) :
				Math.floor((upperBound - microStart) / microTick)) + 1,
			minorPerMajor  = minorTick ? Math.round(majorTick / minorTick) : 0,
			microPerMinor  = microTick ? Math.round(minorTick / microTick) : 0,
			majorPrecision = majorTick ? Math.floor(Math.log(majorTick) / Math.LN10) : 0,
			minorPrecision = minorTick ? Math.floor(Math.log(minorTick) / Math.LN10) : 0,
			scale = span / (upperBound - lowerBound);
		if(!isFinite(scale)){ scale = 1; }
		return {
			bounds: {
				lower:	lowerBound,
				upper:	upperBound
			},
			major: {
				tick:	majorTick,
				start:	majorStart,
				count:	majorCount,
				prec:	majorPrecision
			},
			minor: {
				tick:	minorTick,
				start:	minorStart,
				count:	minorCount,
				prec:	minorPrecision
			},
			micro: {
				tick:	microTick,
				start:	microStart,
				count:	microCount,
				prec:	0
			},
			minorPerMajor:	minorPerMajor,
			microPerMinor:	microPerMinor,
			scale:			scale
		};
	};

	dojox.charting.scaler = function(min, max, span, kwArgs){
		var h = {fixUpper: "none", fixLower: "none", natural: false};
		if(kwArgs){
			if("fixUpper" in kwArgs){ h.fixUpper = String(kwArgs.fixUpper); }
			if("fixLower" in kwArgs){ h.fixLower = String(kwArgs.fixLower); }
			if("natural"  in kwArgs){ h.natural  = Boolean(kwArgs.natural); }
		}
		
		if(max <= min){
			return calcTicks(min, max, h, 0, 0, 0, span);	// Object
		}
		
		var mag = Math.floor(Math.log(max - min) / Math.LN10),
			major = kwArgs && ("majorTick" in kwArgs) ? kwArgs.majorTick : Math.pow(10, mag), 
			minor = 0, micro = 0, ticks;
			
		// calculate minor ticks
		if(kwArgs && ("minorTick" in kwArgs)){
			minor = kwArgs.minorTick;
		}else{
			do{
				minor = major / 10;
				if(!h.natural || minor > 0.9){
					ticks = calcTicks(min, max, h, major, minor, 0, span);
					if(ticks.scale * ticks.minor.tick > deltaLimit){ break; }
				}
				minor = major / 5;
				if(!h.natural || minor > 0.9){
					ticks = calcTicks(min, max, h, major, minor, 0, span);
					if(ticks.scale * ticks.minor.tick > deltaLimit){ break; }
				}
				minor = major / 2;
				if(!h.natural || minor > 0.9){
					ticks = calcTicks(min, max, h, major, minor, 0, span);
					if(ticks.scale * ticks.minor.tick > deltaLimit){ break; }
				}
				return calcTicks(min, max, h, major, 0, 0, span);	// Object
			}while(false);
		}

		// calculate micro ticks
		if(kwArgs && ("microTick" in kwArgs)){
			micro = kwArgs.microTick;
			ticks = calcTicks(min, max, h, major, minor, micro, span);
		}else{
			do{
				micro = minor / 10;
				if(!h.natural || micro > 0.9){
					ticks = calcTicks(min, max, h, major, minor, micro, span);
					if(ticks.scale * ticks.micro.tick > deltaLimit){ break; }
				}
				micro = minor / 5;
				if(!h.natural || micro > 0.9){
					ticks = calcTicks(min, max, h, major, minor, micro, span);
					if(ticks.scale * ticks.micro.tick > deltaLimit){ break; }
				}
				micro = minor / 2;
				if(!h.natural || micro > 0.9){
					ticks = calcTicks(min, max, h, major, minor, micro, span);
					if(ticks.scale * ticks.micro.tick > deltaLimit){ break; }
				}
				micro = 0;
			}while(false);
		}

		return micro ? ticks : calcTicks(min, max, h, major, minor, 0, span);	// Object
	};
})();

}
