if(!dojo._hasResource["dojox.widget.FileInputAuto"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.widget.FileInputAuto"] = true;
dojo.provide("dojox.widget.FileInputAuto");

dojo.require("dojox.widget.FileInput");
dojo.require("dojo.io.iframe"); 

dojo.declare("dojox.widget.FileInputAuto",
	dojox.widget.FileInput,
	{
	// summary: An extension on dojox.widget.FileInput providing background upload progress
	//
	// description: An extended version of FileInput - when the user focuses away from the input
	//	the selected file is posted via dojo.io.iframe to the url. example implementation
	//	comes with PHP solution for handling upload, and returning required data.
	//	
	// notes: the return data from the io.iframe is used to populate the input element with 
	//	data regarding the results. it will be a JSON object, like:
	//	
	//	results = { size: "1024", filename: "file.txt" }
	//	
	//	all the parameters allowed to dojox.widget.FileInput apply

	// url: String
	// 	the URL where our background FileUpload will be sent
	url: "",

	// blurDelay: Integer
	//	time in ms before an un-focused widget will wait before uploading the file to the url="" specified
	//	default: 2 seconds
	blurDelay: 2000,

	// duration: Integer
	//	The time in ms to use as the generic timing mechanism for the animations
	//	set to 1 or 0 for "immediate respose"
	duration: 500,

	// uploadMessage: String
	//	
	//	FIXME: i18n somehow?
	uploadMessage: "Uploading ...", 
	
	_sent: false,

	// small template changes, new attachpoint: overlay
	templateString:"<div class=\"dijitFileInput\">\n\t<input id=\"${id}\" name=\"${name}\" class=\"dijitFileInputReal\" type=\"file\" dojoAttachPoint=\"fileInput\" />\n\t<div class=\"dijitFakeInput\" dojoAttachPoint=\"fakeNodeHolder\">\n\t\t<input class=\"dijitFileInputVisible\" type=\"text\" dojoAttachPoint=\"focusNode, inputNode\" />\n\t\t<div class=\"dijitInline dijitFileInputText\" dojoAttachPoint=\"titleNode\">${label}</div>\n\t\t<div class=\"dijitInline dijitFileInputButton\" dojoAttachPoint=\"cancelNode\" dojoAttachEvent=\"onclick:_onClick\">${cancelText}</div>\n\t</div>\n\t<div class=\"dijitProgressOverlay\" dojoAttachPoint=\"overlay\">&nbsp;</div>\n</div>\n",

	startup: function(){
		// summary: add our extra blur listeners
		this._blurListener = dojo.connect(this.fileInput,"onblur",this,"_onBlur");
		this._focusListener = dojo.connect(this.fileInput,"onfocus",this,"_onFocus"); 
		this.inherited("startup",arguments);
	},

	_onFocus: function(){
		// summary: clear the upload timer
		if(this._blurTimer){ clearTimeout(this._blurTimer); }
	},

	_onBlur: function(){
		// summary: start the upload timer
		if(this._blurTimer){ clearTimeout(this._blurTimer); }
		if(!this._sent){
			this._blurTimer = setTimeout(dojo.hitch(this,"_sendFile"),this.blurDelay);		
		}
	},


	setMessage: function(/*String*/title){
		// summary: set the text of the progressbar
		
		// FIXME: this throws errors in IE?!?!?!? egads.		
		if(!dojo.isIE){ this.overlay.innerHTML = title;	}
	},
	
	_sendFile: function(/* Event */e){
		// summary: triggers the chain of events needed to upload a file in the background.
		if(!this.fileInput.value || this._sent){ return; }
		
		dojo.style(this.fakeNodeHolder,"display","none");
		dojo.style(this.overlay,"opacity","0");
		dojo.style(this.overlay,"display","block");

		this.setMessage(this.uploadMessage);

		dojo.fadeIn({ node: this.overlay, duration:this.duration }).play();

		var _newForm; 
		if(dojo.isIE){
			// just to reiterate, IE is a steaming pile of code. 
			_newForm = document.createElement('<form enctype="multipart/form-data" method="post">');
			_newForm.encoding = "multipart/form-data";
			
		}else{
			// this is how all other sane browsers do it
			_newForm = document.createElement('form');
			_newForm.setAttribute("enctype","multipart/form-data");
		}
		_newForm.appendChild(this.fileInput);
		dojo.body().appendChild(_newForm);
	
		dojo.io.iframe.send({
			url: this.url+"?name="+this.name,
			form: _newForm,
			handleAs: "json",
			handle: dojo.hitch(this,"_handleSend")
		});
	},

	_handleSend: function(data,ioArgs){
		// summary: The callback to toggle the progressbar, and fire the user-defined callback
		if(!dojo.isIE){
			// otherwise, this throws errors in ie? FIXME:
			this.overlay.innerHTML = "";
		}
		
		this._sent = true;
		dojo.style(this.overlay,"opacity","0");
		dojo.style(this.overlay,"border","none");
		dojo.style(this.overlay,"background","none"); 

		this.overlay.style.backgroundImage = "none";
		this.fileInput.style.display = "none";
		this.fakeNodeHolder.style.display = "none";
		dojo.fadeIn({ node:this.overlay, duration:this.duration }).play(250);

		dojo.disconnect(this._blurListener);
		dojo.disconnect(this._focusListener);

		this.onComplete(data,ioArgs,this);
	},

	_onClick: function(e){
		// summary: accomodate our extra focusListeners
		if(this._blurTimer){ clearTimeout(this._blurTimer); }

		dojo.disconnect(this._blurListener);
		dojo.disconnect(this._focusListener);

		this.inherited("_onClick",arguments);

		this._blurListener = dojo.connect(this.fileInput,"onblur",this,"_onBlur");
		this._focusListener = dojo.connect(this.fileInput,"onfocus",this,"_onFocus"); 
	},

	onComplete: function(data,ioArgs,widgetRef){
		// summary: stub function fired when an upload has finished. 
		// data: the raw data found in the first [TEXTAREA] tag of the post url
		// ioArgs: the dojo.Deferred data being passed from the handle: callback
		// widgetRef: this widget pointer, so you can set this.overlay to a completed/error message easily
	}
});

dojo.declare("dojox.widget.FileInputBlind",
	dojox.widget.FileInputAuto,
	{
	// summary: An extended version of dojox.widget.FileInputAuto
	//	that does not display an input node, but rather only a button
	// 	and otherwise behaves just like FileInputAuto
	
	startup: function(){
		// summary: hide our fileInput input field
		this.inherited("startup",arguments);
		this._off = dojo.style(this.inputNode,"width");
		this.inputNode.style.display = "none";
		this._fixPosition();
	},
	
	_fixPosition: function(){		
		// summary: in this case, set the button under where the visible button is 
		if(dojo.isIE){
			dojo.style(this.fileInput,"width","1px");
		}else{
			dojo.style(this.fileInput,"left","-"+(this._off)+"px");
		}
	},

	_onClick: function(e){
		// summary: onclick, we need to reposition our newly created input type="file"
		this.inherited("_onClick",arguments);
		this._fixPosition(); 
	}
});

}
