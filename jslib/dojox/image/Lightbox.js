if(!dojo._hasResource["dojox.image.Lightbox"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.image.Lightbox"] = true;
dojo.provide("dojox.image.Lightbox");
dojo.experimental("dojox.image.Lightbox");

dojo.require("dijit.Dialog"); 
dojo.require("dojox.fx._base");

dojo.declare("dojox.image.Lightbox",
	dijit._Widget,{
	// summary:
	//	A dojo-based Lightbox implementation. 
	//
	// description:
	//	An Elegant, keyboard accessible, markup and store capable Lightbox widget to show images
	//	in a modal dialog-esque format. Can show individual images as Modal dialog, or can group
	//	images with multiple entry points, all using a single "master" Dialog for visualization
	//
	//	key controls:
	//		ESC - close
	//		Down Arrow / Rt Arrow / N - Next Image
	//		Up Arrow / Lf Arrow / P - Previous Image
	// 
	// example:
	// |	<a href="image1.jpg" dojoType="dojox.image.Lightbox">show lightbox</a>
	//
	// example: 
	// |	<a href="image2.jpg" dojoType="dojox.image.Lightbox" group="one">show group lightbox</a>
	// |	<a href="image3.jpg" dojoType="dojox.image.Lightbox" group="one">show group lightbox</a>
	//
	// example:	 
	// |	not implemented fully yet, though works with basic datastore access. need to manually call
	// |	widget._attachedDialog.addImage(item,"fromStore") for each item in a store result set.
	// |	<div dojoType="dojox.image.Lightbox" group="fromStore" store="storeName"></div>
	//
	// group: String
	//		Grouping images in a page with similar tags will provide a 'slideshow' like grouping of images
	group: "",

	// title: String 
	//		A string of text to be shown in the Lightbox beneath the image (empty if using a store)
	title: "",

	// href; String
	//		Link to image to use for this Lightbox node (empty if using a store).
	href: "",

	// duration: Integer
	//		Generic time in MS to adjust the feel of widget. could possibly add various 
	//		durations for the various actions (dialog fadein, sizeing, img fadein ...) 
	duration: 500,

	// _allowPassthru: Boolean
	//		Privately set this to disable/enable natural link of anchor tags
	_allowPassthru: false,
	
	// _attachedDialg: dojox.image._LightboxDialog
	//		The pointer to the global lightbox dialog for this widget
	_attachedDialog: null, // try to share a single underlay per page?

	startup: function(){
		this.inherited(arguments);
		// setup an attachment to the masterDialog (or create the masterDialog)
		var tmp = dijit.byId('dojoxLightboxDialog');
		if(tmp){
			this._attachedDialog = tmp;
		}else{
			// this is the first instance to start, so we make the masterDialog
			this._attachedDialog = new dojox.image._LightboxDialog({ id: "dojoxLightboxDialog" });
			this._attachedDialog.startup();
		}
		if(!this.store){
			// FIXME: full store support lacking, have to manually call this._attachedDialog.addImage(imgage,group) as it stands
			this._addSelf();
			this.connect(this.domNode, "onclick", "_handleClick");
		}
	},

	_addSelf: function(){
		// summary: Add this instance to the master LightBoxDialog
		this._attachedDialog.addImage({
			href: this.href,
			title: this.title
		},this.group||null);
	},

	_handleClick: function(/* Event */e){
		// summary: Handle the click on the link 
		if(!this._allowPassthru){ e.preventDefault(); }
		else{ return; }
		this.show();
	},

	show: function(){
		// summary: Show the Lightbox with this instance as the starting point
		this._attachedDialog.show(this);
	},

	disable: function(){
		// summary: Disables event clobbering and dialog, and follows natural link
		this._allowPassthru = true;
	},

	enable: function(){
		// summary: Enables the dialog (prevents default link)
		this._allowPassthru = false; 
	}

});

dojo.declare("dojox.image._LightboxDialog",
	dijit.Dialog,{
	// summary:
	//		The "dialog" shared  between any Lightbox instances on the page
	//
	// description:
	//	
	//		A widget that intercepts anchor links (typically around images) 	
	//		and displays a modal Dialog. this is the actual Dialog, which you can
	//		create and populate manually, though should use simple Lightbox's
	//		unless you need to direct access.
	//
	//		There should only be one of these on a page, so all dojox.image.Lightbox's will us it
	//		(the first instance of a Lightbox to be show()'n will create me If i do not exist)
	// 
	// title: String
	// 		The current title, read from object passed to show() 
	title: "",

	// FIXME: implement titleTemplate

	// inGroup: Array
	//		Array of objects. this is populated by from the JSON object _groups, and
	//		should not be populate manually. it is a placeholder for the currently 
	//		showing group of images in this master dialog
	inGroup: null,

	// imgUrl: String
	//		The src="" attribute of our imageNode (can be null at statup)
	imgUrl: "",
		
	// errorMessage: String
	// 		The text to display when an unreachable image is linked
	errorMessage: "Image not found.",

	// adjust: Boolean
	//		If true, ensure the image always stays within the viewport
	//		more difficult than necessary to disable, but enabled by default
	//		seems sane in most use cases.
	adjust: true,

	// an object of arrays, each array (of objects) being a unique 'group'
	_groups: { XnoGroupX: [] },

	// errorImg: Url
	//		Path to the image used when a 404 is encountered
	errorImg: dojo.moduleUrl("dojox.image","resources/images/warning.png"),		

	// privates:
	_imageReady: false,
	_blankImg: dojo.moduleUrl("dojo","resources/blank.gif"),
	_clone: null, // the "untained" image
	_wasStyled: null, // indicating taint on the imgNode

	// animation holders:
	_loadingAnim:null, 
	_showImageAnim: null,
	_showNavAnim: null,
	_animConnects: [],
	
	templateString:"<div class=\"dojoxLightbox\" dojoAttachPoint=\"containerNode\">\n\t<div style=\"position:relative\">\n\t\t<div dojoAttachPoint=\"imageContainer\" class=\"dojoxLightboxContainer\">\n\t\t\t<img dojoAttachPoint=\"imgNode\" src=\"${imgUrl}\" class=\"dojoxLightboxImage\" alt=\"${title}\">\n\t\t\t<div class=\"dojoxLightboxFooter\" dojoAttachPoint=\"titleNode\">\n\t\t\t\t<div class=\"dijitInline LightboxClose\" dojoAttachPoint=\"closeNode\"></div>\n\t\t\t\t<div class=\"dijitInline LightboxNext\" dojoAttachPoint=\"nextNode\"></div>\t\n\t\t\t\t<div class=\"dijitInline LightboxPrev\" dojoAttachPoint=\"prevNode\"></div>\n\n\t\t\t\t<div class=\"dojoxLightboxText\"><span dojoAttachPoint=\"textNode\">${title}</span><span dojoAttachPoint=\"groupCount\" class=\"dojoxLightboxGroupText\"></span></div>\n\t\t\t</div>\n\t\t</div>\t\n\t\t\n\t</div>\n</div>\n",

	startup: function(){
		// summary: Add some extra event handlers, and startup our superclass.

		this.inherited(arguments);
		this._clone = dojo.clone(this.imgNode);
		this.connect(document.documentElement,"onkeypress","_handleKey");
		this.connect(window,"onresize","_position"); 
		this.connect(this.nextNode, "onclick", "_nextImage");
		this.connect(this.prevNode, "onclick", "_prevImage");
		this.connect(this.closeNode, "onclick", "hide");
		this._makeAnims();
		this._vp = dijit.getViewport();
		
	},

	show: function(/* Object */groupData){
		// summary: Show the Master Dialog. Starts the chain of events to show
		//		an image in the dialog, including showing the dialog if it is
		//		not already visible
		//
		// groupData: Object
		//		needs href and title attributes. the values for this image.
		
		var _t = this; // size

		// we only need to call dijit.Dialog.show() if we're not already open.
		if(!_t.open){ _t.inherited(arguments); }

		if(this._wasStyled){
			// ugly fix for IE being stupid:
			dojo._destroyElement(_t.imgNode);
			_t.imgNode = dojo.clone(_t._clone);
			dojo.place(_t.imgNode,_t.imageContainer,"first");
			_t._makeAnims();
			_t._wasStyled = false;
		}
		
		dojo.style(_t.imgNode,"opacity","0"); 
		dojo.style(_t.titleNode,"opacity","0");
		
		_t._imageReady = false; 
		_t.imgNode.src = groupData.href;
		
		if((groupData.group && groupData !== "XnoGroupX") || _t.inGroup){ 
			if(!_t.inGroup){ 
				_t.inGroup = _t._groups[(groupData.group)];
				// determine where we were or are in the show 
				dojo.forEach(_t.inGroup,function(g,i){
					if(g.href == groupData.href){
						_t._positionIndex = i;
					}
				},_t);
			}
			if(!_t._positionIndex){
				_t._positionIndex=0;
				_t.imgNode.src = _t.inGroup[_t._positionIndex].href;
			}
			// FIXME: implement titleTemplate
			_t.groupCount.innerHTML = " (" +(_t._positionIndex+1) +" of "+_t.inGroup.length+")";
			_t.prevNode.style.visibility = "visible";
			_t.nextNode.style.visibility = "visible";
		}else{
			// single images don't have buttons, or counters:
			_t.groupCount.innerHTML = "";
			_t.prevNode.style.visibility = "hidden";
			_t.nextNode.style.visibility = "hidden";
		}
		_t.textNode.innerHTML = groupData.title;
		
		if(!_t._imageReady || _t.imgNode.complete === true){
			// connect to the onload of the image
			_t._imgConnect = dojo.connect(_t.imgNode, "onload", _t, function(){
				_t._imageReady = true;
				_t.resizeTo({
					w: _t.imgNode.width,
					h: _t.imgNode.height,
					duration:_t.duration
				});
				// cleanup
				dojo.disconnect(_t._imgConnect);
				if(_t._imgError){ dojo.disconnect(_t._imgError); }
			});
			
			// listen for 404's:
			_t._imgError = dojo.connect(_t.imgNode, "onerror", _t, function(){
				dojo.disconnect(_t._imgError);
				// trigger the above onload with a new src:
				_t.imgNode.src = _t.errorImg;
				_t._imageReady = true;
				_t.textNode.innerHTML = _t.errorMessage;
			});

			// onload doesn't fire in IE if you connect before you set the src. 
			// hack to re-set the src after onload connection made:
			if(dojo.isIE){ _t.imgNode.src = _t.imgNode.src; }

		}else{
			// do it quickly. kind of a hack, but image is ready now
			_t.resizeTo({ w: _t.imgNode.width, h: _t.imgNode.height, duration: 1 });
		}

	},

	_nextImage: function(){
		// summary: Load next image in group
		if(!this.inGroup){ return; }
		if(this._positionIndex+1<this.inGroup.length){
			this._positionIndex++;
		}else{
			this._positionIndex = 0;
		}
		this._loadImage();
	},

	_prevImage: function(){
		// summary: Load previous image in group

		if(this.inGroup){ 
			if(this._positionIndex == 0){
				this._positionIndex = this.inGroup.length - 1;
			}else{
				this._positionIndex--;
			}
			this._loadImage();
		}
	},

	_loadImage: function(){
		// summary: Do the prep work before we can show another image 
		this._loadingAnim.play(1);
	},

	_prepNodes: function(){
		// summary: A localized hook to accompany _loadImage
		this._imageReady = false; 
		this.show({
			href: this.inGroup[this._positionIndex].href,
			title: this.inGroup[this._positionIndex].title
		});
	},

	resizeTo: function(/* Object */size){
		// summary: Resize our dialog container, and fire _showImage
		
		if(this.adjust && (size.h + 80 > this._vp.h || size.w + 50 > this._vp.w)){
			size = this._scaleToFit(size);
		}
		
		var _sizeAnim = dojox.fx.sizeTo({ 
			node: this.containerNode,
			duration: size.duration||this.duration,
			width: size.w, 
			height: size.h + 30
		});
		this.connect(_sizeAnim,"onEnd","_showImage");
		_sizeAnim.play(15);
	},

	_showImage: function(){
		// summary: Fade in the image, and fire showNav
		this._showImageAnim.play(1);
	},

	_showNav: function(){
		// summary: Fade in the footer, and setup our connections.
		this._showNavAnim.play(1);
	},

	hide: function(){
		// summary: Hide the Master Lightbox
		dojo.fadeOut({node:this.titleNode, duration:200,
			onEnd: dojo.hitch(this,function(){
				// refs #5112 - if you _don't_ change the .src, safari will _never_ fire onload for this image
				this.imgNode.src = this._blankImg; 
			}) 
		}).play(5); 
		this.inherited(arguments);
		this.inGroup = null;
		this._positionIndex = null;
	},

	addImage: function(child, group){
		// summary: Add an image to this Master Lightbox
		//
		// child: Object
		//		The image information to add.
		//		href: String - link to image (required)
		// 		title: String - title to display
		//
		// group: String?
		//		attach to group of similar tag or null for individual image instance
		var g = group;
		if(!child.href){ return; }
		if(g){ 	
			if(!this._groups[g]){
				this._groups[g] = [];				
			}
			this._groups[g].push(child); 
		}else{ this._groups["XnoGroupX"].push(child); }
	},

	_handleKey: function(/* Event */e){
		// summary: Handle keyboard navigation internally
		if(!this.open){ return; }

		var dk = dojo.keys;
		var key = (e.charCode == dk.SPACE ? dk.SPACE : e.keyCode);
		switch(key){
			
			case dk.ESCAPE: this.hide(); break;

			case dk.DOWN_ARROW:
			case dk.RIGHT_ARROW:
			case 78: // key "n"
				this._nextImage(); break;

			case dk.UP_ARROW:
			case dk.LEFT_ARROW:
			case 80: // key "p" 
				this._prevImage(); break;
		}
	},
	
	_scaleToFit: function(/* Object */size){
		// summary: resize an image to fit within the bounds of the viewport
		// size: Object
		//		The 'size' object passed around for this image
		var ns = {};

		// one of the dimensions is too big, go with the smaller viewport edge:
		if(this._vp.h > this._vp.w){
			// don't actually touch the edges:
			ns.w = this._vp.w - 70;
			ns.h = ns.w * (size.h / size.w);
		}else{
			// give a little room for the titlenode, too:
			ns.h = this._vp.h - 80;
			ns.w = ns.h * (size.w / size.h);
		}

		// trigger the nasty width="auto" workaround in show()
		this._wasStyled = true;

		// we actually have to style this image, it's too big
		var s = this.imgNode.style;
		s.height = ns.h + "px";	
		s.width = ns.w + "px";

		ns.duration = size.duration;
		return ns; // Object

	},
	
	_position: function(/* Event */e){
		// summary: we want to know the viewport size any time it changes
		this.inherited(arguments);
		this._vp = dijit.getViewport();
	},
	
	_makeAnims: function(){
		// summary: make and cleanup animation and animation connections
		
		dojo.forEach(this._animConnects,dojo.disconnect);
		this._animConnects = [];
		this._showImageAnim = dojo.fadeIn({
				node: this.imgNode,
				duration: this.duration
			});
		this._animConnects.push(dojo.connect(this._showImageAnim, "onEnd", this, "_showNav"));
		this._loadingAnim = dojo.fx.combine([
				dojo.fadeOut({ node:this.imgNode, duration:175 }),
				dojo.fadeOut({ node:this.titleNode, duration:175 })
			]);
		this._animConnects.push(dojo.connect(this._loadingAnim, "onEnd", this, "_prepNodes"));
		this._showNavAnim = dojo.fadeIn({ node: this.titleNode, duration:225 });
	}
});

}
