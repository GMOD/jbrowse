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
Exhibit.DataEdit.Editor.ListField = function(jq,iid,pid,val,noLens) {
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
	if(this._value==undefined) { this._value = []; }
	if(typeof(this._value)=='string') { this._value = [this._value]; }
	// Check
	if(!(this._value instanceof Array)) { throw "Invalid data for ListField"; }
}

/** Create component HTML. */
Exhibit.DataEdit.Editor.ListField.prototype.getHTML = function(onShow) {
	var self = this;
		
	// This code is run after the fact.
	onShow.push(function() {
		var split = function(val) { return val.split(/,\s*/); }  // SEPARATOR
		var extractLast = function(term) { return split(term).pop(); }

		var ip = $('#'+self._divId);
		// Don't navigate away from the field on tab when selecting an item
		ip.bind('keydown',function(ev) {
			if(ev.keyCode===$.ui.keyCode.TAB && $(this).data('autocomplete').menu.active) {
				ev.preventDefault();
			}
		});
		//ip.bind('focus',function(ev) { self.setValue( self.getValue() ); });
		ip.bind('blur',function(ev) { self.setValue( self.getValue() ); });
		ip.autocomplete({
			minLength: 0,
			source: function(request,response) {
				// Delegate back to autocomplete, but extract the last term
				response(
					$.ui.autocomplete.filter(self._options,extractLast(request.term))
				);
			},
			focus: function() {
				// Prevent value inserted on focus
				return false;
			},
			select: function(ev,ui) {
				var terms = split(this.value);
				terms.pop();  // Remove the current input
				terms.push(ui.item.value); // Add the selected item
				terms.push(''); // Add placeholder to get the comma-and-space at the end
				this.value = terms.join(',');  // SEPARATOR
				return false;
			}
		});
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
	var l = "";
	for(var i=0;i<this._value.length;i++) {
		l = l + ((l.length)?',':'') + this._value[i];
	}
	var tag = Exhibit.DataEdit.Editor._htmlTag(
		'input' ,
		{ 'id':this._divId , 'style':style , 'class':'exhibitDataEditListField' , 'value':l } ,
		$(this._jqThis).get()[0] ,
		true
	);
	return tag;

	//return '<input id="'+this._divId+'"'+style+' class="exhibitDataEditListField" />';
}

/** Get value. */
Exhibit.DataEdit.Editor.ListField.prototype.getValue = function() {
	var els = $('#'+this._divId).get();
	var val = ((els.length) ? els[0].value : '');
	var vals = val.split(/,\s*/);
	var ret = [];
	for(var i=0;i<vals.length;i++) {
		var mt = vals[i].match(/^ *(.*) *$/);
		var word = mt[1];
		if(word.length>0) { 
			var z = Exhibit.DataEdit.Editor.matchExactStringFromList(word,this._options);
			if(z!=null) { // If we got a match, add match
				ret.push(z);
			} else { // No match
				if(this._allowNew) { // New vals allowed?  Add new word
					ret.push(word);
				} else { // Otherwise try to match closest
					z = Exhibit.DataEdit.Editor.matchClosestStringFromList(word,this._options);
					if(z) { ret.push(z); }
				}
			}
		}
	}
	return ret;
}
/** Set value. */
Exhibit.DataEdit.Editor.ListField.prototype.setValue = function(v) {
	var els = $('#'+this._divId).get();
	if(els.length) { els[0].value = v.join(','); }
}
/** Show error (?) */
Exhibit.DataEdit.Editor.ListField.prototype.setError = function(b) {
	$('#'+this._divId).css('background-color' , b?Exhibit.DataEdit.Editor._ERRCOL_:Exhibit.DataEdit.Editor._BGCOL_);
}


/* ======================================================================== 
 * Statics
 * ======================================================================== */
/** Run a function, f, on each element representing this . */
Exhibit.DataEdit.Editor.ListField.domFilter = function(jqThis,f) { 
	$('select',jqThis)
		.filter(function(idx) { return $(this).attr("ex:type")=="list"; })
			.each(f);
}