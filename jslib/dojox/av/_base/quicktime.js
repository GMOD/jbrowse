if(!dojo._hasResource["dojox.av._base.quicktime"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.av._base.quicktime"] = true;
dojo.provide("dojox.av._base.quicktime");

(function(){
	/*******************************************************
		dojox.av.quicktime

		Base functionality to insert a QuickTime movie
		into a document on the fly.
	 ******************************************************/

	var qtMarkup, qtVersion, installed, __def__={
		width: 320,
		height: 240,
		redirect: null,
		params: []
	};
	var keyBase="dojox-av-quicktime-", keyCount=0;

	//	reference to the test movie we will use for getting QT info from the browser.
	var testMovieUrl=dojo.moduleUrl("dojox", "av/resources/version.mov");

	//	*** private methods *********************************************************
	function prep(kwArgs){
		kwArgs = dojo.mixin(dojo.clone(__def__), kwArgs || {});
		if(!("path" in kwArgs)){
			console.error("dojox.av._base.quicktime(ctor):: no path reference to a QuickTime movie was provided.");
			return null;
		}
		if(!("id" in kwArgs)){
			kwArgs.id=(keyBase + keyCount++);
		}
		return kwArgs;
	}
	
	var getQTMarkup = 'This content requires the <a href="http://www.apple.com/quicktime/download/" title="Download and install QuickTime.">QuickTime plugin</a>.';
	if(dojo.isIE){
		installed = (function(){
			try{
				var o = new ActiveXObject("QuickTimeCheckObject.QuickTimeCheck.1");
				if(o!==undefined){
					return o.IsQuickTimeAvailable(0);
				}
			} catch(e){ }
			return false;
		})();

		qtMarkup = function(kwArgs){
			if(!installed){ return { id: null, markup: getQTMarkup }; }
			
			kwArgs = prep(kwArgs);
			if(!kwArgs){ return null; }
			var s = '<object classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" '
				+ 'codebase="http://www.apple.com/qtactivex/qtplugin.cab#version=6,0,2,0" '
				+ 'id="' + kwArgs.id + '" '
				+ 'width="' + kwArgs.width + '" '
				+ 'height="' + kwArgs.height + '">'
				+ '<param name="src" value="' + kwArgs.path + '" />';
			for(var i=0, l=kwArgs.params.length; i<l; i++){
				s += '<param name="' + kwArgs.params[i].key + '" value="' + kwArgs.params[i].value + '" />';
			}
			s += '</object>';
			return { id: kwArgs.id, markup: s };
		}
	} else {
		installed = (function(){
			for(var i=0, l=navigator.plugins.length; i<l; i++){
				if(navigator.plugins[i].name.indexOf("QuickTime")>-1){
					return true;
				}
			}
			return false;
		})();

		qtMarkup = function(kwArgs){
			if(!installed){ return { id: null, markup: getQTMarkup }; }

			kwArgs = prep(kwArgs);
			if(!kwArgs){ return null; }
			var s = '<embed type="video/quicktime" src="' + kwArgs.path + '" '
				+ 'id="' + kwArgs.id + '" '
				+ 'name="' + kwArgs.id + '" '
				+ 'pluginspage="www.apple.com/quicktime/download" '
				+ 'enablejavascript="true" '
				+ 'width="' + kwArgs.width + '" '
				+ 'height="' + kwArgs.height + '"';
			for(var i=0, l=kwArgs.params.length; i<l; i++){
				s += ' ' + kwArgs.params[i].key + '="' + kwArgs.params[i].value + '"';
			}
			s += '></embed>';
			return { id: kwArgs.id, markup: s };
		}
	}
	
	qtVersion = { major: 0, minor: 0, rev: 0 };

	// *** This is an offical kludge, but it seems to work everywhere.  Sigh. *************************
	dojo.addOnLoad(function(){
		var n = document.createElement("div");
		n.style.cssText = "top:0;left:0;width:1px;height:1px;overflow:hidden;position:absolute;";
		var o = qtMarkup({ path: testMovieUrl, width:4, height:4 });

		document.body.appendChild(n);
		n.innerHTML = o.markup;
		var qt = (dojo.isIE) ? dojo.byId(o.id) : document[o.id]; 
		
		//	Let Safari and IE have a moment to init the QT object before trying to query it.
		setTimeout(function(){
			var v = [ 0, 0, 0 ];
			if(qt){
				try {
					v = qt.GetQuickTimeVersion().split(".");
					qtVersion = { major: parseInt(v[0]||0), minor: parseInt(v[1]||0), rev: parseInt(v[2]||0) };
				} catch(e){ 
					qtVersion = { major: 0, minor: 0, rev: 0 };
				}
			}

			dojox.av.quicktime.supported = v[0];
			dojox.av.quicktime.version = qtVersion;
			if(dojox.av.quicktime.supported){
				dojox.av.quicktime.onInitialize();
			}

			//	fricking IE.  gonna end up leaving the movie in the doc, for some
			//		reason getting an unspecified error when trying to remove it.
			if(!dojo.isIE){
				document.body.removeChild(n);
			} else {
				//	move it out of the way.
				n.style.top = "-10000px";
				n.style.visibility="hidden";
			}
		}, 10);
	});
	
	//	*** The public interface. ****************************************************************
	dojox.av.quicktime={
		minSupported: 6,
		available: installed,
		supported: installed,
		version: qtVersion,
		initialized: false,
		onInitialize: function(){ dojox.av.quicktime.initialized = true; },	//	stub function to let you know when this is ready

		place: function(/* DOMElement */node, /* Object */kwArgs){
			node = dojo.byId(node);
			var o = qtMarkup(kwArgs);
			if(o){
				node.innerHTML = o.markup;
				if(o.id){
					return (dojo.isIE)? dojo.byId(o.id) : document[o.id];	//	QuickTimeObject
				}
			}
			return null;	//	QuickTimeObject
		}
	};
})();

}
