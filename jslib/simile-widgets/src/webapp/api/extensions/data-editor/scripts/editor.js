/* ========================================================================
 * LensSpec.  Stores markup etc. from editor lenses found in HTML.
 *   this._type              Item type.
 *   this._lensHTML          Raw editor lens markup.
 * ======================================================================== */
Exhibit.DataEdit.LensSpec = function(ty,html) {
	this._type = ty;
	this._lensHTML = html;
}

/** Lens registry. */
Exhibit.DataEdit.LensSpec._lenses = [];
/** Debug mode? */
Exhibit.DataEdit.LensSpec._DEBUG_ = false;

/** Return type. */
Exhibit.DataEdit.LensSpec.prototype.getType = function() { return this._type; }
/** Return raw lens HTML. */
Exhibit.DataEdit.LensSpec.prototype.getHTML = function() { return this._lensHTML; }

/** Bootstrap. */
$(document).ready(function() {
	var filter = function(idx) { return $(this).attr("ex:role")==Exhibit.DataEdit.EDIT_ROLE_LENS; }
	if(window.console && Exhibit.DataEdit.LensSpec._DEBUG_) { console.log("Searching for editor lenses"); }
	$('*').filter(filter).each(function(idx) {
		try {
			var ty = $(this).attr("ex:itemType");  // Type
			var ht = $(this).html();  // Markup, raw
			if(window.console && Exhibit.DataEdit.LensSpec._DEBUG_) { console.log("  Lens found: "+ty); }
			Exhibit.DataEdit.LensSpec._lenses[ty] = new Exhibit.DataEdit.LensSpec(ty,ht);
			$(this).remove();  // Erase lens from DOM
		} catch(err) { SimileAjax.Debug.warn(err); }
	});
});


/* ========================================================================
 * Editor is the object that implements an editor when deployed/rendered
 * to page.  Editor can be created from a LensSpec if one exists, or from
 * the item's HTML if not.
 *   this._itemId             Item being edited.
 *   this._jqThis             JQuery ref to DOM node of item in view.
 *   this._fields             Array of field components.
 *   this._validator          Optional validator function
 * ======================================================================== */
Exhibit.DataEdit.Editor = function(itemId,jqThis) {
	this._itemId = itemId;
	this._jqThis = jqThis;
	this._fields = {};  // Field componentns stored here
	this._hasSaveButton = false;
	this._hasCancelButton = false;
	this._hasStatus = false;
}

/** Debug mode? */
Exhibit.DataEdit.Editor._DEBUG_ = false;

/** Cols, used by components. */
Exhibit.DataEdit.Editor._BGCOL_ = '#dddddd';
Exhibit.DataEdit.Editor._ERRCOL_ = '#ff8888';
/** Components. */
Exhibit.DataEdit.Editor._COMPONENTS_ = [ 'TextField','NumberField','EnumField','ListField','TickListField' ];


/** Apply this editor lens. */
Exhibit.DataEdit.Editor.prototype.apply = function() {
	var type = database.getObject(this._itemId , "type");
	var lens = (type) ? Exhibit.DataEdit.LensSpec._lenses[type] : null;
	if(lens) {
		this.log("applyWithLens() "+this._itemId+":"+type);
		this.applyWithLens(lens);
	} else {
		this.log("applyWithoutLens() "+this._itemId+":"+type);
		this.applyWithoutLens();
	}
}

/* ======================================================================== */

/** Apply with editor lens. */
Exhibit.DataEdit.Editor.prototype.applyWithLens = function(lens) {	
	var self = this;
	// Get rid of existing display lens, replace with edit lens raw HTML
	$(self._jqThis).html(lens._lensHTML);

	// Look for ex:role="editorSaveButton", ex:role="editorCancelButton" and ex:role="editorStatus"
	var saveFilter = function(idx) { return $(this).attr("ex:role")==Exhibit.DataEdit.EDIT_ROLE_SAVE; }
	$('*',self._jqThis).filter(saveFilter).each(function(idx) {
		$(this).click(function() { Exhibit.DataEdit.save(self._itemId); });
		self._hasSaveButton = true;
	});
	/* [CANCEL] no longer supported after multi item edit introduced.
	var cancelFilter = function(idx) { return $(this).attr("ex:role")==Exhibit.DataEdit.EDIT_ROLE_CANCEL; }
	$('*',self._jqThis).filter(cancelFilter).each(function(idx) {
		$(this).click(function() { Exhibit.DataEdit.cancel(); });
		self._hasCancelButton = true;
	});
	*/
	var statusFilter = function(idx) { return $(this).attr("ex:role")==Exhibit.DataEdit.EDIT_ROLE_STATUS; }
	$('*',self._jqThis).filter(statusFilter).each(function(idx) {
		$(this).attr('id',Exhibit.DataEdit.EDIT_MESSAGE);
		self._hasStatus = true;
	});

	// Array of functions to run after each component has been rendered.
	var onShow = [];
	// Walk raw HTML, injecting field editor components
	// For each type of component (text, number ...)
	for(var i=0;i<Exhibit.DataEdit.Editor._COMPONENTS_.length;i++) {
		var c = Exhibit.DataEdit.Editor._COMPONENTS_[i];
		self.log("Scanning for "+c);
		// Scan edit lens looking for this type of component using its domFilter()
		Exhibit.DataEdit.Editor[c].domFilter(self._jqThis,function(idx) {
			var prop,val,f;
			try {
				// Get ex:content property (predicate)
				prop = self._getContent(this);
				if(!prop) { throw "Missing target (ex:content)"; }			
				// Get value (object) and build editor
				val = (self._exists(prop)) ? self._getValues(prop) : undefined ;
				try { 
					f = new Exhibit.DataEdit.Editor[c](this,self._itemId,prop,val,false);
					f._saveOnChange = (!self._hasSaveButton);  // No [SAVE] button?  Switch on field saving mode
				} catch(err) { 
					self.log(err,prop,val,this); 
					SimileAjax.Debug.warn(err);
				}
				self._addFieldComponent(this,prop,f,onShow,true);
			}catch(err) { self.log(err,prop,val,this); }
		});
	}
	// Call each onShow function
	for(var i=0;i<onShow.length;i++) { onShow[i](); }
}

/* ======================================================================== */

/** Apply with display lens HTML. */
Exhibit.DataEdit.Editor.prototype.applyWithoutLens = function() {
	var self = this;
	// Array of functions to run after each component has been rendered.
	var onShow = [];
	// Walk over DOM looking for ex:content attributes
	var filter = function(idx) { return $(this).attr("ex:content"); }
	$('*',self._jqThis).filter(filter).each(function(idx) { // See http://bugs.jquery.com/ticket/3729
		var prop,val,f;
		try {
			// ex:content expression
			var exp = $(this).attr("ex:content");
			if(!exp) { return; }
			// Get first prop in path
			var prop = self._getContent(this); // ex:content
			if(prop) {
				val = self._getValues(prop); // DB vals, scalar or array
				try {
					var t = self._guessFieldType(exp,val);
					f = new Exhibit.DataEdit.Editor[t](this,self._itemId,prop,val,true);
					f._saveOnChange = true;  // Switch on field saving mode
				} catch(err) {
					self.log(err,prop,val,self);
					SimileAjax.Debug.warn(err);
				}
				self._addFieldComponent(this,prop,f,onShow,false); // jq = this
			}
		}catch(err) { self.log(err,prop,val,self); }
	});
	// Call each onShow function
	for(var i=0;i<onShow.length;i++) { onShow[i](); }
}
/** exp = expression from ex:content, val = db value */
Exhibit.DataEdit.Editor.prototype._guessFieldType = function(exp,val) {
	// Check for multiple parts of expression, so prop must be an
	// item ref...
	//if(exp.match(/(\.[^\.]+){2,}/)) { return 'ReferenceField'; }
	// Otherwise check database value
	if((typeof val == 'object') && (val instanceof Array)) { return 'ListField'; }
	if(typeof val == 'number') { return 'NumberField'; }
	if(typeof val == 'string') { return 'TextField'; }
	return 'TextField';
}

Exhibit.DataEdit.Editor.prototype._exists = function(prop) {
	return database.getObject(this._itemId,prop);
}
Exhibit.DataEdit.Editor.prototype._getValues = function(prop) {
	// Get value in database, either as array or scalar 
	var valArr = [];
	database.getObjects(this._itemId,prop).visit(function(val) { valArr.push(val); });
	return (valArr.length>1) ? valArr : valArr[0];
}
// Does this element have an ex:content; if so, return target (minus dot)
Exhibit.DataEdit.Editor.prototype._getContent = function(jq) {
	var exp = $(jq).attr("ex:content");
	if(!exp) { return null; }
	var m = exp.match(/^\.(.+)?\.?/);
	return (m && m.length>1) ? m[1] : null;
}
// Does this element have ***A SINGLE*** ex:???-subcontent, with ***A SINGLE*** property reference?; 
// if so, return reference target (minus dot)
/*Exhibit.DataEdit.Editor.prototype._getSubContent = function(jq) {
	var attrs = $(jq).get(0).attributes;
	if(!attrs) { return null; }
	
	var cnt = 0;
	if(attrs.length) {
		for(var i=0;i<attrs.length;i++) {
			console.log(attrs[i].name);
			if(attrs[i].specified && attrs[i].name.match(/^ex:(.+)-subcontent$/)) {
				var subexp = attrs[i].value;
				var m = subexp.match(/\{\{\.([^\}\.]+)\}\}/g);
				console.log(m);
				cnt++;
			}
		}
	}
}*/
Exhibit.DataEdit.Editor.prototype._addFieldComponent = function(jq,prop,f,onShow,usingLens) {
	if(f) {
		this._fields[prop] = f;
		var h = f.getHTML(onShow);
		// Auto-resize?
		var srcDim = { width:$(jq).width() , height:$(jq).height() };
		var prefDim = f['_prefDimensions'];  // Has _prefDimensions..?
		// Disabled auto-resized (see false) for now
		if(false && !usingLens && prefDim && ((srcDim.width<prefDim.width) || (srcDim.height<prefDim.height))) {
			h = '<span style="display:Inline-Block; position:Relative; width:'+srcDim.width+'px; height:'+srcDim.height+'px;">'+h+'</span>';
			$(jq).replaceWith(h);
			$('#'+f._divId)
				.mouseenter(function(ev) { // Mouse enter: upsize and raise
					var pos = $(this).parent().position();
					$(this).width(prefDim.width).height(prefDim.height).css('z-index','1000');
				})
				.mouseleave(function(ev) { // Mouse leave: downsize and lower
					$(this).width(srcDim.width).height(srcDim.height).css('z-index','Auto');
				})
				.css('position','Absolute').css('top','0px').css('left','0px');
			// Empty text may cause 0 sized fields.  10 pixels min seems sensible.
			if(srcDim.width<=0) { srcDim.width=10;  $('#'+f._divId).width(srcDim.width); }
			if(srcDim.height<=0) { srcDim.height=10;  $('#'+f._divId).height(srcDim.height); }
		} else {
			$(jq).replaceWith(h);
		}
	} else {
		$(jq).replaceWith('<span style="color:Red;">Failed to initalise</span>');
	}
}

/* ======================================================================== */

/** Return unique property values (predicate objects) for given item (subject) type. */
Exhibit.DataEdit.Editor._uniqueObjects = function(itemType,predicate) {
	var v = [];
	var itemKeys = database.getAllItems().toArray();
	for(var i=0;i<itemKeys.length;i++) {
		var item = database.getItem( itemKeys[i] );
		if(item.type!=itemType) { continue; }
		database.getObjects(item.id,predicate).visit(function(val) { v[val]=true; });
	}
	var list = [];
	for(var i in v) { list.push(i); }
	return list.sort();
}
/** Text is true or false. */
Exhibit.DataEdit.Editor._parseTrueFalse = function(s,def) {
	def = (def==undefined) ? false : def;
	if(!s) { return def; }
	s=s.toLowerCase();
	return (s==='true' || s==='yes');
}
/** Returns flags, edit or add. */
Exhibit.DataEdit.Editor._parseDisabledFor = function(s) {
	var flags = { edit:true , add:true }
	if(s) {
		var arr = s.split(',');
		for(var i=0;i<arr.length;i++) {
			var a = arr[i].toLowerCase();
			if(a=='edit' || a=='all') { flags.edit=true; }
			else if(a=='add' || a=='all') { flags.add=true; }
		}
	}
	return flags;
}
/** Create opening <tag>, using list of attrs and source element. */
Exhibit.DataEdit.Editor._htmlTag = function(elName,attr,srcEl,closed) {
	// Copy attributes from srcEl to attr, if unset
	for(var i=0;i<srcEl.attributes.length;i++) { 
		var n = srcEl.attributes[i].name;
		var v = srcEl.attributes[i].value;
		if((srcEl.attributes[i].specified!=undefined) && !srcEl.attributes[i].specified) { continue; } // Fix IE7 $%@# up!
		if(attr[n]==undefined) { attr[n]=v; }
	}
	// Create tag
	var s = '<'+elName;
	for(k in attr) { 
		if(attr[k]) { s=s+' '+k+'="'+attr[k]+'"'; }
	}
	s=s+((closed)?'/>':'>');
	return s;
}
/** Take jQuery obj, and extract certain CSS props into String */
Exhibit.DataEdit.Editor._extractStyle = function(jq) {
	var props = [ 'font-family','font-size','font-weight','font-style',
		'text-transform','text-decoration','letter-spacing',
		'word-spacing','line-height','text-align','vertical-align',
		'margin-top','margin-right','margin-bottom','margin-left',
		'padding-top','padding-right','padding-bottom','padding-left'
	];
	var s="";
	for(var i=0;i<props.length;i++) {
		var v = $(jq).css(props[i])+""; // Add "" to placate IE7 (returns Number for ints)
		if(v) { 
			v = v.replace(/["|']/gi,'');
			s = s + props[i]+':'+v+'; ';
		}
	}
	return s;
}
/** Return computed style in cross browser way */
/*Exhibit.DataEdit.Editor._getComputedStyle = function(el,style) {	
	if(el.currentStyle) { 
		return el.currentStyle[style];  // IE
	} else if(document.defaultView!=undefined && document.defaultView.getComputedStyle!=undefined) {
		return document.defaultView.getComputedStyle(el,null).getPropertyValue(style);  // Moz/W3C
	} else {
		return null;
	}
}*/
/** Using inherited font, how big in pixels would some text (cols x rows) be? */
Exhibit.DataEdit.Editor._getColRowDimensions = function(jq,cols,rows) {
	/* Yeah, so apparently the only cross-browser way to get line height in pixels is to
	* inject a <span> into the start of the element, ask for it's height, then remove it!! */
	$(jq).prepend('<span id="__SIZE_GUESSER__">M</span>');
	var textW = $('#__SIZE_GUESSER__',jq).width();
	var textH = $('#__SIZE_GUESSER__',jq).height();
	$('#__SIZE_GUESSER__',jq).remove();
	return { width:(cols*textW) , height:(rows*textH) };
}
/** Unique ids -- handy! */
Exhibit.DataEdit.Editor._uid = (new Date).getTime();
Exhibit.DataEdit.Editor._getUID = function() {
	// FIXME: Not thread safe!!
	Exhibit.DataEdit.Editor._uid++;
	return Exhibit.DataEdit.Editor._uid;
}
/** Escape string */
Exhibit.DataEdit.Editor._escapeString = function(str) {
	var r = '';
	for(var i=0;i<str.length;i++) {
		var c = str.charCodeAt(i);
		var isAlpha = ((c>=97&&c<=122) || (c>=65&&c<=90));
		if(isAlpha) {
			r = r + str.charAt(i);
		} else {
			r = r + ((c<16)?'0':'') + c.toString(16);			
		}
	}
	return r;
}

/** Return match, or closest match. */
Exhibit.DataEdit.Editor.matchExactStringFromList = function(str,list) {
	var lstr = str.toLowerCase();
	// Look for straight match
	for(var i=0;i<list.length;i++) {
		if(lstr===list[i].toLowerCase()) { return list[i]; }
	}
	return null;
}
Exhibit.DataEdit.Editor.matchClosestStringFromList = function(str,list) {
	var lstr = str.toLowerCase();
	// No direct match, so find closest match
	var closest = 9999;
	var closestIdx = -1;
	for(var i=0;i<list.length;i++) {
		var li = list[i].substring(0,lstr.length).toLowerCase();
		var m = Exhibit.DataEdit.Editor._levenshteinDistance(lstr,li);
		if(m<closest) { closest=m;  closestIdx=i; }
	}
	// Return
	if(closestIdx!=-1) { return list[closestIdx]; }
		else { return null; }
}
Exhibit.DataEdit.Editor._levenshteinDistance = function(s1,s2) {
	if(s1.length<s2.length) { var t=s1;  s1=s2;  s2=t; }
	var sz1 = s1.length;
	var sz2 = s2.length;
	// Seed array
	var r = new Array();
	r[0] = new Array();
	for(var i=0;i<sz1+1;i++) { r[0][i]=i; }
	// Lowest value from three
	var smallest = function(p1,p2,p3) {
		if(p1<p2 && p1<p3) { return p1; }
			else if(p2<p1 && p2<p3) { return p2; }
				else { return p3; }
	}
	// Match
	for(var i=1;i<sz1+1;i++) {
		r[i] = new Array();
		r[i][0] = i;
		for(var j=1;j<sz2+1;j++) {
			var cost = (s1.charAt(i-1)==s2.charAt(j-1)) ? 0 : 1;
			r[i][j] = smallest(r[i-1][j]+1,r[i][j-1]+1,r[i-1][j-1]+cost);
		}
	}
	return r[sz1][sz2];
}

/** Get field for property name. */
/*Exhibit.DataEdit.Editor.prototype.getField = function(prop) {
	return this._fields[prop];
}*/

/** Fields. */
Exhibit.DataEdit.Editor.prototype.getFields = function() {
	return this._fields;
}
/** Varargs log function, using special array 'arguments', and apply() */
Exhibit.DataEdit.Editor.prototype.log = function() {
	if(window['console'] && Exhibit.DataEdit.Editor._DEBUG_) { console.log.apply(this,arguments); }
}		


