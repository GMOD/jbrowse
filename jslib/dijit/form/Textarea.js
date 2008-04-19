if(!dojo._hasResource["dijit.form.Textarea"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.form.Textarea"] = true;
dojo.provide("dijit.form.Textarea");

dojo.require("dijit.form._FormWidget");
dojo.require("dojo.i18n");
dojo.requireLocalization("dijit", "Textarea", null, "ROOT");

dojo.declare(
	"dijit.form.Textarea",
	dijit.form._FormValueWidget,
	{
	// summary: A resizing textarea widget
	//
	// description:
	//	A textarea that resizes vertically to contain the data.
	//	Takes nearly all the parameters (name, value, etc.) that a vanilla textarea takes.
	//	Cols is not supported and the width should be specified with style width.
	//	Rows is not supported since this widget adjusts the height.
	//
	// example:
	// |	<textarea dojoType="dijit.form.TextArea">...</textarea>
	//

	attributeMap: dojo.mixin(dojo.clone(dijit.form._FormValueWidget.prototype.attributeMap),
		{style:"styleNode", 'class':"styleNode"}),

	templateString: (dojo.isIE || dojo.isSafari || dojo.isFF) ?
				((dojo.isIE || dojo.isSafari || dojo.isFF >= 3) ? '<fieldset id="${id}" class="dijitInline dijitInputField dijitTextArea" dojoAttachPoint="styleNode" waiRole="presentation"><div dojoAttachPoint="editNode,focusNode,eventNode" dojoAttachEvent="onpaste:_changing,oncut:_changing" waiRole="textarea" style="text-decoration:none;display:block;overflow:auto;" contentEditable="true"></div>'
					: '<span id="${id}" class="dijitReset">'+
					'<iframe src="javascript:<html><head><title>${_iframeEditTitle}</title></head><body><script>var _postCreate=window.frameElement?window.frameElement.postCreate:null;if(_postCreate)_postCreate();</script></body></html>"'+
							' dojoAttachPoint="iframe,styleNode" dojoAttachEvent="onblur:_onIframeBlur" class="dijitInline dijitInputField dijitTextArea"></iframe>')
				+ '<textarea name="${name}" value="${value}" dojoAttachPoint="formValueNode" style="display:none;"></textarea>'
				+ ((dojo.isIE || dojo.isSafari || dojo.isFF >= 3) ? '</fieldset>':'</span>')
			: '<textarea id="${id}" name="${name}" value="${value}" dojoAttachPoint="formValueNode,editNode,focusNode,styleNode" class="dijitInputField dijitTextArea">'+dojo.isFF+'</textarea>',

	setAttribute: function(/*String*/ attr, /*anything*/ value){
		this.inherited(arguments);
		switch(attr){
			case "disabled":
				this.formValueNode.disabled = this.disabled;
			case "readOnly":
				if(dojo.isIE || dojo.isSafari || dojo.isFF >= 3){
					this.editNode.contentEditable = (!this.disabled && !this.readOnly);
				}else if(dojo.isFF){
					this.iframe.contentDocument.designMode = (this.disabled || this.readOnly)? "off" : "on";
				}
		}
	},

	focus: function(){
		// summary: Received focus, needed for the InlineEditBox widget
		if(!this.disabled && !this.readOnly){
			this._changing(); // set initial height
		}
		dijit.focus(this.iframe || this.focusNode);
	},

	setValue: function(/*String*/ value, /*Boolean, optional*/ priorityChange){
		var editNode = this.editNode;
		if(typeof value == "string"){
			editNode.innerHTML = ""; // wipe out old nodes
			if(value.split){
				var _this=this;
				var isFirst = true;
				dojo.forEach(value.split("\n"), function(line){
					if(isFirst){ isFirst = false; }
					else{
						editNode.appendChild(dojo.doc.createElement("BR")); // preserve line breaks
					}
					if(line){
						editNode.appendChild(dojo.doc.createTextNode(line)); // use text nodes so that imbedded tags can be edited
					}
				});
			}else if(value){
				editNode.appendChild(dojo.doc.createTextNode(value));
			}
			if(!dojo.isIE){
				editNode.appendChild(dojo.doc.createElement("BR")); // so that you see a cursor
			}
		}else{
			// blah<BR>blah --> blah\nblah
			// <P>blah</P><P>blah</P> --> blah\nblah
			// <DIV>blah</DIV><DIV>blah</DIV> --> blah\nblah
			// &amp;&lt;&gt; -->&< >
			value = editNode.innerHTML;
			if(this.iframe){ // strip sizeNode
				value = value.replace(/<div><\/div>\r?\n?$/i,"");
			}
			value = value.replace(/\s*\r?\n|^\s+|\s+$|&nbsp;/g,"").replace(/>\s+</g,"><").replace(/<\/(p|div)>$|^<(p|div)[^>]*>/gi,"").replace(/([^>])<div>/g,"$1\n").replace(/<\/p>\s*<p[^>]*>|<br[^>]*>|<\/div>\s*<div[^>]*>/gi,"\n").replace(/<[^>]*>/g,"").replace(/&amp;/gi,"\&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">");
			if(!dojo.isIE){
				value = value.replace(/\n$/,""); // remove added <br>
			}
		}
		this.value = this.formValueNode.value = value;
		if(this.iframe){
			var sizeNode = dojo.doc.createElement('div');
			editNode.appendChild(sizeNode);
			var newHeight = sizeNode.offsetTop;
			if(editNode.scrollWidth > editNode.clientWidth){ newHeight+=16; } // scrollbar space needed?
			if(this.lastHeight != newHeight){ // cache size so that we don't get a resize event because of a resize event
				if(newHeight == 0){ newHeight = 16; } // height = 0 causes the browser to not set scrollHeight
				dojo.contentBox(this.iframe, {h: newHeight});
				this.lastHeight = newHeight;
			}
			editNode.removeChild(sizeNode);
		}
		dijit.form.Textarea.superclass.setValue.call(this, this.getValue(), priorityChange);
	},

	getValue: function(){
		return this.value.replace(/\r/g,"");
	},

	postMixInProperties: function(){
		this.inherited(arguments);
		// don't let the source text be converted to a DOM structure since we just want raw text
		if(this.srcNodeRef && this.srcNodeRef.innerHTML != ""){
			this.value = this.srcNodeRef.innerHTML;
			this.srcNodeRef.innerHTML = "";
		}
		if((!this.value || this.value == "") && this.srcNodeRef && this.srcNodeRef.value){
			this.value = this.srcNodeRef.value;
		}
		if(!this.value){ this.value = ""; }
		this.value = this.value.replace(/\r\n/g,"\n").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&amp;/g,"&");
		if(dojo.isFF == 2){
			// In the case of Firefox an iframe is used and when the text gets focus,
			// focus is fired from the document object.  There isn't a way to put a
			// waiRole on the document object and as a result screen readers don't
			// announce the role.  As a result screen reader users are lost.
			//
			// An additional problem is that the browser gives the document object a
			// very cryptic accessible name, e.g.
			// wysiwyg://13/http://archive.dojotoolkit.org/nightly/dojotoolkit/dijit/tests/form/test_InlineEditBox.html
			// When focus is fired from the document object, the screen reader speaks
			// the accessible name.  The cyptic accessile name is confusing.
			//
			// A workaround for both of these problems is to give the iframe's
			// document a title, the name of which is similar to a role name, i.e.
			// "edit area".  This will be used as the accessible name which will replace
			// the cryptic name and will also convey the role information to the user.
			// Because it is read directly to the user, the string must be localized.
			// In addition, since a <label> element can not be associated with an iframe, if 
			// this control has a label, insert the label text into the title as well.
			var _nlsResources = dojo.i18n.getLocalization("dijit", "Textarea");
			this._iframeEditTitle = _nlsResources.iframeEditTitle;
			this._iframeFocusTitle = _nlsResources.iframeFocusTitle;
			var label=dojo.query('label[for="'+this.id+'"]');
			if(label.length){
				this._iframeEditTitle = label[0].innerHTML + " " + this._iframeEditTitle;
			}
			var body = this.focusNode = this.editNode = dojo.doc.createElement('BODY');
			body.style.margin="0px";
			body.style.padding="0px";
			body.style.border="0px";
		}
	},

	postCreate: function(){
		if(dojo.isIE || dojo.isSafari || dojo.isFF >= 3){
			this.domNode.style.overflowY = 'hidden';
		}else if(dojo.isFF){
			var w = this.iframe.contentWindow;
			var title = '';
			try { // #4715: peeking at the title can throw a security exception during iframe setup
				title = this.iframe.contentDocument.title;
			} catch(e) {}
			if(!w || !title){
				this.iframe.postCreate = dojo.hitch(this, this.postCreate);
				return;
			}
			var d = w.document;
			d.getElementsByTagName('HTML')[0].replaceChild(this.editNode, d.getElementsByTagName('BODY')[0]);
			if(!this.isLeftToRight()){
				d.getElementsByTagName('HTML')[0].dir = "rtl";
			}			
			this.iframe.style.overflowY = 'hidden';
			this.eventNode = d;
			// this.connect won't destroy this handler cleanly since its on the iframe's window object
			// resize is a method of window, not document
			w.addEventListener("resize", dojo.hitch(this, this._changed), false); // resize is only on the window object
		}else{
			this.focusNode = this.domNode;
		}
		if(this.eventNode){
			this.connect(this.eventNode, "keypress", this._onKeyPress);
			this.connect(this.eventNode, "mousemove", this._changed);
			this.connect(this.eventNode, "focus", this._focused);
			this.connect(this.eventNode, "blur", this._blurred);
		}
		if(this.editNode){
			this.connect(this.editNode, "change", this._changed); // needed for mouse paste events per #3479
		}
		this.inherited('postCreate', arguments);
	},

	// event handlers, you can over-ride these in your own subclasses
	_focused: function(e){
		dojo.addClass(this.iframe||this.domNode, "dijitInputFieldFocused");
		this._changed(e);
	},

	_blurred: function(e){
		dojo.removeClass(this.iframe||this.domNode, "dijitInputFieldFocused");
		this._changed(e, true);
	},

	_onIframeBlur: function(){
		// Reset the title back to "edit area".
		this.iframe.contentDocument.title = this._iframeEditTitle;
	},

	_onKeyPress: function(e){
		if(e.keyCode == dojo.keys.TAB && !e.shiftKey && !e.ctrlKey && !e.altKey && this.iframe){
			// Pressing the tab key in the iframe (with designMode on) will cause the
			// entry of a tab character so we have to trap that here.  Since we don't
			// know the next focusable object we put focus on the iframe and then the
			// user has to press tab again (which then does the expected thing).
			// A problem with that is that the screen reader user hears "edit area"
			// announced twice which causes confusion.  By setting the
			// contentDocument's title to "edit area frame" the confusion should be
			// eliminated.
			this.iframe.contentDocument.title = this._iframeFocusTitle;
			// Place focus on the iframe. A subsequent tab or shift tab will put focus
			// on the correct control.
			// Note: Can't use this.focus() because that results in a call to
			// dijit.focus and if that receives an iframe target it will set focus
			// on the iframe's contentWindow.
			this.iframe.focus();  // this.focus(); won't work
			dojo.stopEvent(e);
		}else if(e.keyCode == dojo.keys.ENTER){
			e.stopPropagation();
		}else if(this.inherited("_onKeyPress", arguments) && this.iframe){
			// #3752:
			// The key press will not make it past the iframe.
			// If a widget is listening outside of the iframe, (like InlineEditBox)
			// it will not hear anything.
			// Create an equivalent event so everyone else knows what is going on.
			var te = dojo.doc.createEvent("KeyEvents");
			te.initKeyEvent("keypress", true, true, null, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.keyCode, e.charCode);
			this.iframe.dispatchEvent(te);
		}
		this._changing();
	},

	_changing: function(e){
		// summary: event handler for when a change is imminent
		setTimeout(dojo.hitch(this, "_changed", e, false), 1);
	},

	_changed: function(e, priorityChange){
		// summary: event handler for when a change has already happened
		if(this.iframe && this.iframe.contentDocument.designMode != "on" && !this.disabled && !this.readOnly){
			this.iframe.contentDocument.designMode="on"; // in case this failed on init due to being hidden
		}
		this.setValue(null, priorityChange || false);
	}
});

}
