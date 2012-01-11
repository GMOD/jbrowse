/**
 * Select one from a list of options.  If no <option> elements are present inside 
 * the <select> body, a list of unique values from current items is constructed.
 *
 * ex:type="text" 
 * ex:content=".<prop>"
 * ex:validators="<list>"
 * ex:disabledFor="edit|add|all"
 * ex:useDisplayStyle="true|false"
 *
 * css class: exhibitDataEditEnumField
 *            exhibitDataEditEnumFieldOption
 */

/* ========================================================================
 * Constructor
 * ======================================================================== */
Exhibit.DataEdit.Editor.EnumField = function(jq,iid,pid,val,noLens) {
	this._jqThis = jq;			// jQuery for original DOM element <input>
	this._itemId = iid;			// Database item (subject) id
	this._propId = pid;			// Database property (predicate)
	this._value = val;			// <string>
	this._divId = '__DATAEDITOR__'+this._propId+'_'+Exhibit.DataEdit.Editor._getUID();
	this._validators = $(jq).attr("ex:validators");
	this._disabledFor = Exhibit.DataEdit.Editor._parseDisabledFor($(jq).attr("ex:disableFor"));
	this._noEditorLens = noLens;	// No editor lens?
	this._matchDisplayLens = Exhibit.DataEdit.Editor._parseTrueFalse($(jq).attr("ex:useDisplayStyle"));  // Try to find into display lens
	this._saveOnChange = false;
	// For this component only
	this._options = [];
	this._allowNew = Exhibit.DataEdit.Editor._parseTrueFalse($(jq).attr("ex:allowNew") , true);
	
	var self = this;
	// Find <option>s
	$('option',this._jqThis).each(function(idx) {
		self._options.push($(this).attr("value"));
	});
	// No <option>s?  Assume the list should be built from current db content
	if(this._options.length==0) {
		var type = database.getObject(this._itemId , "type");
		this._options = Exhibit.DataEdit.Editor._uniqueObjects(type,this._propId);
	}

	// Clean up
	if(this._value==undefined) { this._value = (this._options.length>0)?this._options[0]:''; }
	// Check
	if((typeof this._value)!='string') { throw "Invalid data for EnumField"; }
}

/** Create component HTML. */
Exhibit.DataEdit.Editor.EnumField.prototype.getHTML = function(onShow) {
	var self = this;
		
	// This code is run after the fact.
	onShow.push(function() {
		var ip = $('#'+self._divId);
		//ip.bind('focus',function(ev) { self.setValue( self.getValue() ); });
		ip.bind('blur',function(ev) { self.setValue( self.getValue() ); });
		ip.autocomplete({ source: self._options });
		if(this._saveOnChange) { 
			ip.bind('change',function(ev) { Exhibit.DataEdit.onChange(self._itemId,self._propId); });
		}
	});
	
	var style = null;
	if(this._noEditorLens || this._matchDisplayLens) {
		style = Exhibit.DataEdit.Editor._extractStyle(this._jqThis) +
			'border-width: 0px; '+
			'width: '+$(this._jqThis).width()+'px; height: '+$(this._jqThis).height()+'px; ';
	}	
	var tag = Exhibit.DataEdit.Editor._htmlTag(
		'input' ,
		{ 'id':this._divId , 'style':style , 'class':'exhibitDataEditEnumField' , 'value':this._value } ,
		$(this._jqThis).get()[0] ,
		true
	);
	return tag;
	//return '<input id="'+this._divId+'"'+style+' class="exhibitDataEditEnumField" />';
}

/** Get value. */
Exhibit.DataEdit.Editor.EnumField.prototype.getValue = function() {
	var els = $('#'+this._divId).get();
	if(els.length) { 
		var word = els[0].value;
		if(word.length>0) { 
			var z = Exhibit.DataEdit.Editor.matchExactStringFromList(word,this._options);
			if(z!=null) { // If we got a match, use match
				return z;
			} else { // No match
				if(this._allowNew) { // New vals allowed?  Add new word
					return word;
				} else { // Otherwise try to match closest
					z = Exhibit.DataEdit.Editor.matchClosestStringFromList(word,this._options);
					if(z) { return z; }
				}
			}
		}
	}
	return null;
}
/** Set value. */
Exhibit.DataEdit.Editor.EnumField.prototype.setValue = function(v) {
	var els = $('#'+this._divId).get();
	if(els.length) { els[0].value = v; }
}
/** Show error (?) */
Exhibit.DataEdit.Editor.EnumField.prototype.setError = function(b) {
	$('#'+this._divId).css('background-color' , b?Exhibit.DataEdit.Editor._ERRCOL_:Exhibit.DataEdit.Editor._BGCOL_);
}


/* ======================================================================== 
 * Statics
 * ======================================================================== */
/** Run a function, f, on each element representing <select ex:type="enum">. */
Exhibit.DataEdit.Editor.EnumField.domFilter = function(jqThis,f) { 
	$('select',jqThis)
		.filter(function(idx) { return $(this).attr("ex:type")=="enum"; })
			.each(f);
}