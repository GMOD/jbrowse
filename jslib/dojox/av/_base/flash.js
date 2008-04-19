if(!dojo._hasResource["dojox.av._base.flash"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.av._base.flash"] = true;
dojo.provide("dojox.av._base.flash");

(function(){
	/*******************************************************
		dojox.av.flash

		Base functionality to insert a flash movie into
		a document on the fly.

		Support for Flash 6 is dropped in favor of Flash 8;
		multiple movies are supported.
	 ******************************************************/

	//	TODO: solve the Eolas problem, the function that actually pushes
	//		Flash movie into the doc must be loaded from an external script.

	// 	TODO: add Brad's ExpressInstall for automated installation.

	var fMarkup, fVersion, __def__={
		expressInstall: false,
		width: 320,
		height: 240,
		style: null,
		redirect: null,
		params: []
	};
	var keyBase="dojox-av-flash-", keyCount=0;
	function prep(kwArgs){
		kwArgs=dojo.mixin(dojo.clone(__def__), kwArgs || {});
		if(!("path" in kwArgs)){
			console.error("dojox.av._base.flash(ctor):: no path reference to a Flash movie was provided.");
			return null;
		}
		if(!("id" in kwArgs)){
			kwArgs.id=(keyBase + keyCount++);
		}
		return kwArgs;
	}

	if(dojo.isIE){
		//	*** Internet Explorer branch ******************************************************************
		fMarkup=function(kwArgs){
			kwArgs=prep(kwArgs);
			if(!kwArgs){ return null; }
			var s='<object id="' + kwArgs.id + '" '
				+ 'classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" '
				+ 'width="' + kwArgs.width + '" '
				+ 'height="' + kwArgs.height + '"'
				+ ((kwArgs.style)?' style="' + kwArgs.style + '"':'')
				+ '>'
				+ '<param name="movie" value="' + kwArgs.path + '" />';
			for(var i=0, l=kwArgs.params.length; i<l; i++){
				s += '<param name="' + kwArgs.params[i].key + '" value="' + kwArgs.params[i].value + '" />';
			}
			s += '</object>';
			return { id: kwArgs.id, markup: s };
		};

		fVersion=(function(){
			var testVersion=10, testObj=null;
			while(!testObj && testVersion > 7){
				try {
					testObj = new ActiveXObject("ShockwaveFlash.ShockwaveFlash." + testVersion--);
				} catch(e){ }
			}
			if(testObj){
				var v = testObj.GetVariable("$version").split(" ")[1].split(",");
				return {
					major: (v[0]!=null)?parseInt(v[0]):0, 
					minor: (v[1]!=null)?parseInt(v[1]):0, 
					rev: (v[2]!=null)?parseInt(v[2]):0 
				};
			}
			return { major: 0, minor: 0, rev: 0 };
		})();

		//	attach some cleanup for IE, thanks to deconcept :)
		dojo.addOnUnload(function(){
			var objs=dojo.query("object");
			for(var i=objs.length-1; i>=0; i--){
				objs[i].style.display="none";
				for(var p in objs[i]){
					if(p!="FlashVars" && dojo.isFunction(objs[i][p])){
						objs[i][p]=function(){ };
					}
				}
			}
		});

		//	TODO: ...and double check this fix; is IE really firing onbeforeunload with any kind of href="#" link?
		var beforeUnloadHandle = dojo.connect(dojo.global, "onbeforeunload", function(){
			try{
				if(__flash_unloadHandler){ __flash_unloadHandler=function(){ }; }
				if(__flash_savedUnloadHandler){ __flash_savedUnloadHandler=function(){ }; }
			} catch(e){ }
			dojo.disconnect(beforeUnloadHandle);
		});
	} else {
		//	*** Sane browsers branch ******************************************************************
		fMarkup=function(kwArgs){
			kwArgs=prep(kwArgs);
			if(!kwArgs){ return null; }
			var s = '<embed type="application/x-shockwave-flash" '
				+ 'src="' + kwArgs.path + '" '
				+ 'id="' + kwArgs.id + '" '
				+ 'name="' + kwArgs.id + '" '
				+ 'width="' + kwArgs.width + '" '
				+ 'height="' + kwArgs.height + '"'
				+ (("style" in kwArgs)?' style="' + kwArgs.style + '"':'')
				+ 'swLiveConnect="true" '
				+ 'allowScriptAccess="sameDomain" '
				+ 'pluginspage="' + window.location.protocol + '//www.adobe.com/go/getflashplayer" ';
			for(var i=0, l=kwArgs.params.length; i<l; i++){
				s += ' ' + kwArgs.params[i].key + '="' + kwArgs.params[i].value + '"';
			}
			s += ' />'
			return { id: kwArgs.id, markup: s };
		};

		fVersion=(function(){
			var plugin = navigator.plugins["Shockwave Flash"];
			if(plugin && plugin.description){
				var v = plugin.description.replace(/([a-zA-Z]|\s)+/, "").replace(/(\s+r|\s+b[0-9]+)/, ".").split(".");
				return { 
					major: (v[0]!=null)?parseInt(v[0]):0, 
					minor: (v[1]!=null)?parseInt(v[1]):0, 
					rev: (v[2]!=null)?parseInt(v[2]):0 
				};
			}
			return { major: 0, minor: 0, rev: 0 };
		})();
	}

	//	*** the static object for inserting Flash movies ******************************************************
	dojox.av.flash = {
		minSupported : 8,
		available: fVersion.major,
		supported: (fVersion.major >= 8),
		version: fVersion,
		initialized: false,
		onInitialize: function(){
			dojox.av.flash.initialized=true;
		},
		__ie_markup__: function(kwArgs){
			return fMarkup(kwArgs);
		}
	};

	if(dojo.isIE){
		//	Ugh!
		if(dojo._initFired){
			var e=document.createElement("script");
			e.type="text/javascript";
			e.src=dojo.moduleUrl("dojox", "av/_base/_ieFlash.js");
			e.defer=true;
			document.getElementsByTagName("head")[0].appendChild(e);
		} else {
			//	we can use document.write.  What a kludge.
			document.write('<scr'+'ipt defer type="text/javascript" src="' + dojo.moduleUrl("dojox", "av/_base/_ieFlash.js") + '">'
				+ '</scr'+'ipt>');
		}
	} else {
		dojox.av.flash.place = function(node, kwArgs){
			node=dojo.byId(node);
			var o = fMarkup(kwArgs);
			if(o){
				node.innerHTML = o.markup;
				return document[o.id];
			}
			return null;
		}

		if(dojo._initFired){
			dojox.av.flash.onInitialize();
		} else {
			dojo.addOnLoad(function(){
				console.log("firing off dojox.av.flash.onInitialize() for sane browsers.");
				dojox.av.flash.onInitialize();
			});
		}
	}
})();

}
