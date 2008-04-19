if(!dojo._hasResource["dijit._editor.plugins.FontChoice"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._editor.plugins.FontChoice"] = true;
dojo.provide("dijit._editor.plugins.FontChoice");

dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.FilteringSelect");
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dojo.i18n");

dojo.requireLocalization("dijit._editor", "FontChoice", null, "ROOT,gr");

dojo.declare("dijit._editor.plugins.FontChoice",
	dijit._editor._Plugin,
	{
		//	summary:
		//		This plugin provides three dropdowns for setting font information in the editor
		//
		//	description:
		//		The commands provided by this plugin are:
		//
		//		* fontName
		//	|		Provides a dropdown to select from a list of generic font names
		//		* fontSize
		//	|		Provides a dropdown to select from a list of pre-defined font sizes
		//		* formatBlock
		//	|		Provides a dropdown to select from a list of styles
		//  |
		//
		//		which can easily be added to an editor by including one or more of the above commands
		//		in the `plugins` attribute as follows:
		//
		//	|	plugins="['fontName','fontSize',...]"
		//
		//		It is possible to override the default dropdown list by providing an Array for the `custom` property when
		//		instantiating this plugin, e.g.
		//
		//	|	plugins="[{name:'dijit._editor.plugins.FontChoice', command:'fontName', custom:['Verdana','Myriad','Garamond']},...]"
		//
		//		Alternatively, for `fontName` only, `generic:true` may be specified to provide a dropdown with
		//		[CSS generic font families](http://www.w3.org/TR/REC-CSS2/fonts.html#generic-font-families)
		//
		//		Note that the editor is often unable to properly handle font styling information defined outside
		//		the context of the current editor instance, such as pre-populated HTML.

		_uniqueId: 0,

		buttonClass: dijit.form.FilteringSelect,

		_initButton: function(){
			//TODO: would be nice to be able to handle comma-separated font lists and search within them
			var cmd = this.command;
			var names = this.custom ||
			{
				fontName: this.generic ? ["serif", "sans-serif", "monospace", "cursive", "fantasy"] : // CSS font-family generics
					["Arial", "Times New Roman", "Comic Sans MS", "Courier New"],
				fontSize: [1,2,3,4,5,6,7], // sizes according to the old HTML FONT SIZE
				formatBlock: ["p", "h1", "h2", "h3", "pre"]
			}[cmd];
			var strings = dojo.i18n.getLocalization("dijit._editor", "FontChoice");
			var items = dojo.map(names, function(value){
				var name = strings[value] || value;
				var label = name;
				switch(cmd){
				case "fontName":
					label = "<div style='font-family: "+value+"'>" + name + "</div>";
					break;
				case "fontSize":
					// we're stuck using the deprecated FONT tag to correspond with the size measurements used by the editor
					label = "<font size="+value+"'>"+name+"</font>";
					break;
				case "formatBlock":
					label = "<" + value + ">" + name + "</" + value + ">";
				}
				return { label: label, name: name, value: value };
			});
			items.push({label: "", name:"", value:""}); // FilteringSelect doesn't like unmatched blank strings

			dijit._editor.plugins.FontChoice.superclass._initButton.apply(this,
				[{ labelType: "html", labelAttr: "label", searchAttr: "name", store: new dojo.data.ItemFileReadStore(
					{ data: { identifier: "value", items: items } })}]);

			this.button.setValue("");

			this.connect(this.button, "onChange", function(choice){
				if(this.updating){ return; }
				// FIXME: IE is really messed up here!!
				if(dojo.isIE && "_savedSelection" in this){
					var b = this._savedSelection;
					delete this._savedSelection;
					this.editor.focus();
					this.editor._moveToBookmark(b);
				}else{
//					this.editor.focus();
					dijit.focus(this._focusHandle);
				}
				if(this.command == "fontName" && choice.indexOf(" ") != -1){ choice = "'" + choice + "'"; }
				this.editor.execCommand(this.editor._normalizeCommand(this.command), choice);
			});
		},

		updateState: function(){
			this.inherited(arguments);
			var _e = this.editor;
			var _c = this.command;
			if(!_e || !_e.isLoaded || !_c.length){ return; }
			if(this.button){
				var value = _e.queryCommandValue(this.editor._normalizeCommand(_c)) || "";
				// strip off single quotes, if any
				var quoted = dojo.isString(value) && value.match(/'([^']*)'/);
				if(quoted){ value = quoted[1]; }
//console.log("selected " + value);
				if(this.generic && _c == "fontName"){
					var map = {
						"Arial": "sans-serif",
						"Helvetica": "sans-serif",
						"Myriad": "sans-serif",
						"Times": "serif",
						"Times New Roman": "serif",
						"Comic Sans MS": "cursive",
						"Apple Chancery": "cursive",
						"Courier": "monospace",
						"Courier New": "monospace",
						"Papyrus": "fantasy"
// 						,"????": "fantasy" TODO: IE doesn't map fantasy font-family?
					};
//console.log("mapped to " + map[value]);
					value = map[value] || value;
				}else if(_c == "fontSize" && value.indexOf && value.indexOf("px") != -1){
					var pixels = parseInt(value);
					value = {10:1, 13:2, 16:3, 18:4, 24:5, 32:6, 48:7}[pixels] || value;
				}
				this.updating = true;
				this.button.setValue(value);
				delete this.updating;
			}

			// FIXME: IE is *really* b0rken
			if(dojo.isIE){
				this._savedSelection = this.editor._getBookmark();
			}
			this._focusHandle = dijit.getFocus(this.editor.iframe);
		},

		setToolbar: function(){
			this.inherited(arguments);

			var forRef = this.button;
			if(!forRef.id){ forRef.id = dijit._scopeName+"EditorButton-"+this.command+(this._uniqueId++); } //TODO: is this necessary?  FilteringSelects always seem to have an id?
			var label = dojo.doc.createElement("label");
			dojo.addClass(label, "dijit dijitReset dijitLeft dijitInline");
			label.setAttribute("for", forRef.id);
			var strings = dojo.i18n.getLocalization("dijit._editor", "FontChoice");
			label.appendChild(dojo.doc.createTextNode(strings[this.command]));
			dojo.place(label, this.button.domNode, "before");
		}
	}
);

dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	switch(o.args.name){
	case "fontName": case "fontSize": case "formatBlock":
		o.plugin = new dijit._editor.plugins.FontChoice({command: o.args.name});
	}
});

}
