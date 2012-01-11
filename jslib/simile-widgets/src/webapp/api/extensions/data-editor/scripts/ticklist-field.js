/**
 * Select zero or more from a list of options.  If no <option> elements are present inside 
 * the <select> body, a list of unique values from current items is constructed.
 *
 * ex:type="text" 
 * ex:content=".<prop>"
 * ex:validators="<list>"
 * ex:disabledFor="edit|add|all"
 * ex:useDisplayStyle="true|false"
 * ex:allowNew="true|false"
 *
 * css class: exhibitDataEditEnumField
 *            exhibitDataEditEnumFieldOption
 */
 
 /* ========================================================================
  * Constructor
  * ======================================================================== */
Exhibit.DataEdit.Editor.TickListField = function(jq,iid,pid,val,noLens) {
	this._jqThis = jq;			// jQuery for original DOM element <input>
	this._itemId = iid;			// Database item (subject) id
	this._propId = pid;			// Database property (predicate)
	this._value = val;			// <Array>
	this._divId = '__DATAEDITOR__'+this._propId+'_'+Exhibit.DataEdit.Editor._getUID();
	this._validators = $(jq).attr("ex:validators");
	this._disabledFor = Exhibit.DataEdit.Editor._parseDisabledFor($(jq).attr("ex:disableFor"));
	this._noEditorLens = noLens;	// No editor lens?
	this._matchDisplayLens = Exhibit.DataEdit.Editor._parseTrueFalse($(jq).attr("ex:useDisplayStyle"));  // Try to find into display lens
	this._saveOnChange = false;
	// For this component only
	this._options = [];
	this._allowNew = Exhibit.DataEdit.Editor._parseTrueFalse($(jq).attr("ex:allowNew") , true);
	this._width = parseInt($(jq).attr("ex:width"));
	this._height = parseInt($(jq).attr("ex:height"));
	
	// Clean up value
	if(this._value==undefined) { this._value = []; }
	if(typeof(this._value)=='string') { this._value = [this._value]; }
	// Check
	if(!(this._value instanceof Array)) { throw "Invalid data for TickListField"; }

	// Find <option>s
	var self = this;
	$('option',this._jqThis).each(function(idx) {
		self._options.push($(this).attr("value"));
	});
	// No <option>s?  Assume the list should be built from current db content
	if(this._options.length==0) {
		var type = database.getObject(this._itemId , "type");
		this._options = Exhibit.DataEdit.Editor._uniqueObjects(type,this._propId);
	}
	// If we have values that aren't on our options list, add them
	for(var i=0;i<this._value.length;i++) {
		if(this._options.indexOf(this._value[i])===-1) {
			this._options.push(this._value[i]);
		}
	}
}

/** Create component HTML. */
Exhibit.DataEdit.Editor.TickListField.prototype.getHTML = function(onShow) {
	var self = this;
	
	var html = '<div class="exhibitDataEditTickListField">';
	// Scroll box
	var w = (this._width) ? this._width : '20em';
	var h = (this._height) ? this._height : '10em';
	html=html+'<div id="'+this._divId+'" style="overflow:Scroll; width:'+w+'; height:'+h+';">';
	for(var i=0;i<this._options.length;i++) {
		var ch = (this._value.indexOf(this._options[i])>=0) ? ' checked="checked"' : '';
		html=html+'<div><input type="checkbox" name="_TICKLIST_'+this._itemId+'" value="'+this._options[i]+'"'+ch+' />'+this._options[i]+'</div>';
	}
	html=html+'</div>';
	// New tag input box
	if(this._allowNew) {
		html=html+'<input id="_TICKLIST_TF_'+this._itemId+'" type="textfield" xstyle="width:'+w+';" />'+
			'<a href="javascript:Exhibit.DataEdit.Editor.TickListField._add(\''+this._divId+'\',\'_TICKLIST_TF_'+this._itemId+'\',\''+this._itemId+'\')">Add</a>';
	}
	html = html+'</div>';
	return html;
}

/* Add text from id="txDivId" to list at id="divId", using itemId */
Exhibit.DataEdit.Editor.TickListField._add = function(divId,txDivId,itemId) {
	var tf = $('#'+txDivId).get()[0];
	if(tf) {
		var val = tf.value;
		if(val.length==0) { return; }
		// Already exist?
		var cnt = 0;
		var val2 = val.toLowerCase();
		var a1 = '#'+divId;
		var a2 = 'input[name="_TICKLIST_'+itemId+'"]';
		$(a1+' '+a2).each(function(idx) {
			var c = $(this).get()[0];
			if(c.value.toLowerCase()===val2) {
				c.checked=true;  cnt++;  // Match!
			}
		});
		// Need to add?
		if(cnt==0) {
			$('#'+divId).append(
				'<div><input type="checkbox" name="_TICKLIST_'+itemId+'" value="'+val+'" checked="checked" />'+val+'</div>'
			);
		}
	}
}

/** Get value. */
Exhibit.DataEdit.Editor.TickListField.prototype.getValue = function() {
	var ret = [];
	// Foreach over this component's <input>
	var a1 = '#'+this._divId;
	var a2 = 'input[name="_TICKLIST_'+this._itemId+'"]';
	var els = $(a1+' '+a2).each(function(idx) {
		var c = $(this).get()[0];
		if(c.checked) { ret.push(c.value); }
	});
	return ret;
}
/** Set value. */
Exhibit.DataEdit.Editor.TickListField.prototype.setValue = function(v) {
	// Foreach over this component's <input>, setting values if in v[]
	var els = $('#'+this._divId+' input[name="_TICKLIST_'+this._itemId+'"]').each(function(idx) {
		var c = $(this).get()[0];
		c.checked = (v.indexOf(c.value));
	});
}
/** Show error (?) */
Exhibit.DataEdit.Editor.TickListField.prototype.setError = function(b) {
	$('#'+this._divId).css('background-color' , b?Exhibit.DataEdit.Editor._ERRCOL_:Exhibit.DataEdit.Editor._BGCOL_);
}


/* ======================================================================== 
 * Statics
 * ======================================================================== */
/** Run a function, f, on each element representing this . */
Exhibit.DataEdit.Editor.TickListField.domFilter = function(jqThis,f) { 
	$('select',jqThis)
		.filter(function(idx) { return $(this).attr("ex:type")=="ticklist"; })
			.each(f);
}