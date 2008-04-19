if(!dojo._hasResource["dijit._base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base"] = true;
dojo.provide("dijit._base");

dojo.require("dijit._base.focus");
dojo.require("dijit._base.manager");
dojo.require("dijit._base.place");
dojo.require("dijit._base.popup");
dojo.require("dijit._base.scroll");
dojo.require("dijit._base.sniff");
dojo.require("dijit._base.bidi");
dojo.require("dijit._base.typematic");
dojo.require("dijit._base.wai");
dojo.require("dijit._base.window");

//	FIXME: Find a better way of solving this bug!
if(dojo.isSafari){
	//	Ugly-ass hack to solve bug #5626 for 1.1; basically force Safari to re-layout.
	//	Note that we can't reliably use dojo.addOnLoad here because this bug is basically
	//		a timing / race condition; so instead we use window.onload.
	dojo.connect(window, "load", function(){
		window.resizeBy(1,0);
		setTimeout(function(){ window.resizeBy(-1,0); }, 10);
	});
}

}
