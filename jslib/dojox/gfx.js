if(!dojo._hasResource["dojox.gfx"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.gfx"] = true;
dojo.provide("dojox.gfx");

dojo.require("dojox.gfx.matrix");
dojo.require("dojox.gfx._base");

(function(){
	var renderers = (typeof dojo.config["gfxRenderer"] == "string" ?
		dojo.config["gfxRenderer"] : "svg,vml,silverlight,canvas").split(",");
	for(var i = 0; i < renderers.length; ++i){
		switch(renderers[i]){
			case "svg":
				//TODO: need more comprehensive test for SVG
				if(!dojo.isIE && (navigator.userAgent.indexOf("iPhone") < 0) && (navigator.userAgent.indexOf("iPod") < 0)){ dojox.gfx.renderer = "svg"; }
				break;
			case "vml":
				if(dojo.isIE != 0){ dojox.gfx.renderer = "vml"; }
				break;
			case "silverlight":
				//TODO: need more comprehensive test for Silverlight
				if(window.Silverlight){ dojox.gfx.renderer = "silverlight"; }
				break;
			case "canvas":
				//TODO: need more comprehensive test for Canvas
				if(dojo.isIE == 0){ dojox.gfx.renderer = "canvas"; }
				break;
		}
		if(dojox.gfx.renderer){ break; }
	}
	console.log("gfx renderer = " + dojox.gfx.renderer);
})();

// include a renderer conditionally
dojo.requireIf(dojox.gfx.renderer == "svg", "dojox.gfx.svg");
dojo.requireIf(dojox.gfx.renderer == "vml", "dojox.gfx.vml");
dojo.requireIf(dojox.gfx.renderer == "silverlight", "dojox.gfx.silverlight");
dojo.requireIf(dojox.gfx.renderer == "canvas", "dojox.gfx.canvas");

}
