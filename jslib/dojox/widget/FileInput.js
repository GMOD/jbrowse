if(!dojo._hasResource["dojox.widget.FileInput"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.widget.FileInput"] = true;
dojo.provide("dojox.widget.FileInput");
dojo.experimental("dojox.widget.FileInput"); 

dojo.require("dijit.form._FormWidget");
dojo.require("dijit._Templated"); 

dojo.declare("dojox.widget.FileInput",
	dijit.form._FormWidget,
	{
	// summary: A styled input type="file"
	//
	// description: A input type="file" form widget, with a button for uploading to be styled via css,
	//	a cancel button to clear selection, and FormWidget mixin to provide standard dijit.form.Form
	//	support (FIXME: maybe not fully implemented) 

	// label: String
	//	the title text of the "Browse" button
	label: "Browse ...",

	// cancelText: String
	//	the title of the "Cancel" button
	cancelText: "Cancel",

	// name: String
	//	ugh, this should be pulled from this.domNode
	name: "uploadFile",

	templateString:"<div class=\"dijitFileInput\">\n\t<input id=\"${id}\" class=\"dijitFileInputReal\" type=\"file\" dojoAttachPoint=\"fileInput\" name=\"${name}\" />\n\t<div class=\"dijitFakeInput\">\n\t\t<input class=\"dijitFileInputVisible\" type=\"text\" dojoAttachPoint=\"focusNode, inputNode\" />\n\t\t<div class=\"dijitInline dijitFileInputText\" dojoAttachPoint=\"titleNode\">${label}</div>\n\t\t<div class=\"dijitInline dijitFileInputButton\" dojoAttachPoint=\"cancelNode\" \n\t\t\tdojoAttachEvent=\"onclick:_onClick\">${cancelText}</div>\n\t</div>\n</div>\n",
	
	startup: function(){
		// summary: listen for changes on our real file input
		this._listener = dojo.connect(this.fileInput,"onchange",this,"_matchValue");
		this._keyListener = dojo.connect(this.fileInput,"onkeyup",this,"_matchValue");
	},

	_matchValue: function(){
		// summary: set the content of the upper input based on the semi-hidden file input
		this.inputNode.value = this.fileInput.value;
		if(this.inputNode.value){
			this.cancelNode.style.visibility = "visible";
			dojo.fadeIn({ node: this.cancelNode, duration:275 }).play();
		}
	},

	setLabel: function(/* String */label,/* String? */cssClass){
		// summary: method to allow use to change button label
		this.titleNode.innerHTML = label;
	},

	_onClick: function(/* Event */e){
		// summary: on click of cancel button, since we can't clear the input because of
		// 	security reasons, we destroy it, and add a new one in it's place.
		dojo.disconnect(this._listener);
		dojo.disconnect(this._keyListener); 
		this.domNode.removeChild(this.fileInput);
		dojo.fadeOut({ node: this.cancelNode, duration:275 }).play(); 

		// should we use cloneNode()? can we?
		this.fileInput = document.createElement('input');
		this.fileInput.setAttribute("type","file");
		this.fileInput.setAttribute("id",this.id);
		this.fileInput.setAttribute("name",this.name);
		dojo.addClass(this.fileInput,"dijitFileInputReal");
		this.domNode.appendChild(this.fileInput);

		this._keyListener = dojo.connect(this.fileInput,"onkeyup",this,"_matchValue");
		this._listener = dojo.connect(this.fileInput,"onchange",this,"_matchValue"); 
		this.inputNode.value = ""; 
	}

});

}
