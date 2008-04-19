if(!dojo._hasResource["dijit._editor.plugins.ToggleDir"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._editor.plugins.ToggleDir"] = true;
dojo.provide("dijit._editor.plugins.ToggleDir");
dojo.experimental("dijit._editor.plugins.ToggleDir");

dojo.require("dijit._editor._Plugin");

dojo.declare("dijit._editor.plugins.ToggleDir",
	dijit._editor._Plugin,
	{
		//summary: This plugin is used to toggle direction of the edited document only,
		//		   no matter what direction the whole page is.
				
		useDefaultCommand: false,
		command: "toggleDir",

		_initButton: function(){
			this.inherited("_initButton", arguments);
			this.connect(this.button, "onClick", this._toggleDir);		
		},

		updateState: function(){},//overwrite

		_toggleDir: function(){
			var editDoc = this.editor.editorObject.contentWindow.document.documentElement;
			var isLtr = dojo.getComputedStyle(editDoc).direction == "ltr";
			editDoc.dir/*html node*/ = isLtr ? "rtl" : "ltr";
		}
	}
);

dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	switch(o.args.name){
	case "toggleDir":
		o.plugin = new dijit._editor.plugins.ToggleDir({command: o.args.name});
	}
});

}
