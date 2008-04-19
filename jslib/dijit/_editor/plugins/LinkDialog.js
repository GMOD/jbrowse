if(!dojo._hasResource["dijit._editor.plugins.LinkDialog"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._editor.plugins.LinkDialog"] = true;
dojo.provide("dijit._editor.plugins.LinkDialog");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.Dialog");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("dojo.i18n");
dojo.require("dojo.string");
dojo.requireLocalization("dijit._editor", "LinkDialog", null, "cs,de,es,fr,gr,hu,it,ja,ko,ROOT,pl,pt,ru,zh,zh-tw");

dojo.declare("dijit._editor.plugins.LinkDialog",
	dijit._editor._Plugin,
	{
		//	summary:
		//		This plugin provides dialogs for inserting links and images into the editor
		//
		//	description:
		//		The commands provided by this plugin are:
		//		* createLink
		//		* insertImage

		buttonClass: dijit.form.DropDownButton,
		useDefaultCommand: false,
		urlRegExp: "((https?|ftps?)\\://|)(([0-9a-zA-Z]([-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?\\.)+(arpa|aero|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|xxx|jobs|mobi|post|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|er|eu|es|et|fi|fj|fk|fm|fo|fr|ga|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sk|sl|sm|sn|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tm|tn|to|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zw)|(((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])|(0[xX]0*[\\da-fA-F]?[\\da-fA-F]\\.){3}0[xX]0*[\\da-fA-F]?[\\da-fA-F]|(0+[0-3][0-7][0-7]\\.){3}0+[0-3][0-7][0-7]|(0|[1-9]\\d{0,8}|[1-3]\\d{9}|4[01]\\d{8}|42[0-8]\\d{7}|429[0-3]\\d{6}|4294[0-8]\\d{5}|42949[0-5]\\d{4}|429496[0-6]\\d{3}|4294967[01]\\d{2}|42949672[0-8]\\d|429496729[0-5])|0[xX]0*[\\da-fA-F]{1,8}|([\\da-fA-F]{1,4}\\:){7}[\\da-fA-F]{1,4}|([\\da-fA-F]{1,4}\\:){6}((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])))(\\:(0|[1-9]\\d*))?(/([^?#\\s/]+/)*)?([^?#\\s/]+(\\?[^?#\\s/]*)?(#[A-Za-z][\\w.:-]*)?)?",
		linkDialogTemplate: [
			"<table><tr><td>",
			"<label for='${id}_urlInput'>${url}</label>",
			"</td><td>",
			"<input dojoType='dijit.form.ValidationTextBox' regExp='${urlRegExp}' required='true' id='${id}_urlInput' name='urlInput'>",
			"</td></tr><tr><td>",
			"<label for='${id}_textInput'>${text}</label>",
			"</td><td>",
			"<input dojoType='dijit.form.ValidationTextBox' required='true' id='${id}_textInput' name='textInput'>",
			"</td></tr><tr><td colspan='2'>",
			"<button dojoType='dijit.form.Button' type='submit'>${set}</button>",
			"</td></tr></table>"
		].join(""),

		_initButton: function(){
			var _this = this;
			this.tag = this.command == 'insertImage' ? 'img' : 'a';
			var messages = dojo.i18n.getLocalization("dijit._editor", "LinkDialog", this.lang);
			var dropDown = (this.dropDown = new dijit.TooltipDialog({
				title: messages[this.command + "Title"],
				execute: dojo.hitch(this, "setValue"),
				onOpen: function(){
					_this._onOpenDialog();
					dijit.TooltipDialog.prototype.onOpen.apply(this, arguments);
				},
				onCancel: function(){
					setTimeout(dojo.hitch(_this, "_onCloseDialog"),0);
				},
				onClose: dojo.hitch(this, "_onCloseDialog")
			}));
			messages.urlRegExp = this.urlRegExp;
			messages.id = dijit.getUniqueId(this.editor.id);
			this._setContent(dropDown.title + "<div style='border-bottom: 1px black solid;padding-bottom:2pt;margin-bottom:4pt'></div>" + dojo.string.substitute(this.linkDialogTemplate, messages));
			dropDown.startup();

			this.inherited(arguments);
		},

		_setContent: function(staticPanel){
			this.dropDown.setContent(staticPanel);
		},

		setValue: function(args){
			// summary: callback from the dialog when user hits "set" button
			//TODO: prevent closing popup if the text is empty
			this._onCloseDialog();
			if(dojo.isIE){ //see #4151
				var a = dojo.withGlobal(this.editor.window, "getAncestorElement", dijit._editor.selection, [this.tag]);
				if(a){
					dojo.withGlobal(this.editor.window, "selectElement", dijit._editor.selection, [a]);
				}
			}
			args.tag = this.tag;
			args.refAttr = this.tag == 'img' ? 'src' : 'href';
			//TODO: textInput should be formatted by escapeXml
			var template = "<${tag} ${refAttr}='${urlInput}' _djrealurl='${urlInput}'" +
				(args.tag == 'img' ? " alt='${textInput}'>" : ">${textInput}") +
				"</${tag}>";
			this.editor.execCommand('inserthtml', dojo.string.substitute(template, args));
 		},

		_onCloseDialog: function(){
			// FIXME: IE is really messed up here!!
			if(dojo.isIE){
				if("_savedSelection" in this){
					var b = this._savedSelection;
					delete this._savedSelection;
					this.editor.focus();
					this.editor._moveToBookmark(b);
				}
			}else{
				this.editor.focus();
			}
		},

		_onOpenDialog: function(){
			var a = dojo.withGlobal(this.editor.window, "getAncestorElement", dijit._editor.selection, [this.tag]);
			var url, text;
			if(a){
				url = a.getAttribute('_djrealurl');
				text = this.tag == 'img' ? a.getAttribute('alt') : a.textContent || a.innerText;
				dojo.withGlobal(this.editor.window, "selectElement", dijit._editor.selection, [a, true]);
			}else{
				text = dojo.withGlobal(this.editor.window, dijit._editor.selection.getSelectedText);
			}
			// FIXME: IE is *really* b0rken
			if(dojo.isIE){
				this._savedSelection = this.editor._getBookmark();
			}
			this.dropDown.reset();
			this.dropDown.setValues({urlInput: url || '', textInput: text || ''});
			//dijit.focus(this.urlInput);
		}/*,

//TODO we don't show this state anymore
		updateState: function(){
			// summary: change shading on button if we are over a link (or not)

			var _e = this.editor;
			if(!_e || !_e.isLoaded){ return; }
			if(this.button){
				// display button differently if there is an existing link associated with the current selection
				var hasA = dojo.withGlobal(this.editor.window, "hasAncestorElement", dijit._editor.selection, [this.tag]);
				this.button.setAttribute('checked', hasA);
			}
		}
*/
	}
);

dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	switch(o.args.name){
	case "createLink": case "insertImage":
		o.plugin = new dijit._editor.plugins.LinkDialog({command: o.args.name});
	}
});

}
