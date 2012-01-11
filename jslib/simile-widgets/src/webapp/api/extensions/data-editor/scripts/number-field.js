/**
 * Edit integer number.  The value should be passes as an integer value.  A value 
 * of 'undefined' is assumed to mean the value (object) is missing from the item 
 * (subject).  An undefined value is presented for editing as an empty string.  An 
 * empty string will treated as undefined when saving an item back to the database, 
 * and as such the property/value will not be stored.
 *
 * ex:formatDigits allows the output to be a string, with zero padding up to n digits.
 * If used in lens-less mode the initial value is check to see if its most leftmost 
 * digit char is a zero, and if so the number of digit chars is used as a format.  Thus
 * a value of 001 or -001 will result in this._formatDigits being 3.
 *
 * ex:type="text" 
 * ex:content=".<prop>"
 * ex:validators="<list>"
 * ex:disabledFor="edit|add|all"
 * ex:useDisplayStyle="true|false"
 * ex:formatDigits="<num>"
 *
 * css class: exhibitDataEditNumberField
 */
 
/* ========================================================================
 * Constructor
 * ======================================================================== */
Exhibit.DataEdit.Editor.NumberField = function(jq,iid,pid,val,noLens) {
	this._jqThis = jq;			// jQuery for original DOM element <input>
	this._itemId = iid;			// Database item (subject) id
	this._propId = pid;			// Database property (predicate)
	this._value = val;			// <number>
	this._divId = '__DATAEDITOR__'+this._propId+'_'+Exhibit.DataEdit.Editor._getUID();
	this._validators = $(jq).attr("ex:validators");
	this._disabledFor = Exhibit.DataEdit.Editor._parseDisabledFor($(jq).attr("ex:disableFor"));
	this._noEditorLens = noLens;	// No editor lens?
	this._matchDisplayLens = Exhibit.DataEdit.Editor._parseTrueFalse($(jq).attr("ex:useDisplayStyle"));  // Try to find into display lens
	this._saveOnChange = false;
	// For this component only
	this._formatDigits = parseInt($(jq).attr("ex:formatDigits"));
	
	// Make intelligent guess at number o/p format, if no lens
	if(this._noEditorLens && (typeof this._value=='string')) {
		var v = this._value;
		if(v.charAt(0)=='-') { v = v.substring(1); }
		if(v.charAt(0)=='0') {
			v = v.match(/^(\d*)/)[1];
			this._formatDigits = v.length;
		}
	}
	
	// Clean up
	if(this._value==undefined) {	
		this._value = "0";
	} else if(typeof this._value == 'number') {
		this._value = parseInt(this._value);
	} else if((typeof this._value != 'string') || (!this._value.match(/^-?[0-9]*$/))) {
		throw "Invalid data for NumberField"; 
	}
}

/** Create component HTML. */
Exhibit.DataEdit.Editor.NumberField.prototype.getHTML = function(onShow) {
	var style = null;
	if(this._noEditorLens || this._matchDisplayLens) {
		style = Exhibit.DataEdit.Editor._extractStyle(this._jqThis) +
			'border-width: 0px; '+
			'width: '+$(this._jqThis).width()+'px; height: '+$(this._jqThis).height()+'px; ';
	}
	var onChange = (this._saveOnChange) ? "Exhibit.DataEdit.onChange('"+this._itemId+"','"+this._propId+"')" : "";
	var tag = Exhibit.DataEdit.Editor._htmlTag(
		'input',
		{ 'id':this._divId , 'style':style , 'class':'exhibitDataEditNumberField' , 'type':'Text' , 'value':this._format(this._value) , 'onchange':onChange } ,
		$(this._jqThis).get()[0] ,
		true
	);
	return tag;
}

/** Get value -- empty is assumed to be undefined. */
Exhibit.DataEdit.Editor.NumberField.prototype.getValue = function() {
	var els = $('#'+this._divId).get();
	if(els.length && (els[0].value!="")) { 
		return (!this._formatDigits) ? els[0].value : this._format(els[0].value+"");
	} else {
		return undefined;
	}
}
/** Set value. */
Exhibit.DataEdit.Editor.NumberField.prototype.setValue = function(v) {
	var els = $('#'+this._divId).get();
	if(els.length) { els[0].value = v+""; }
}
/** Show error (?) */
Exhibit.DataEdit.Editor.NumberField.prototype.setError = function(b) {
	$('#'+this._divId).css('background-color' , b?Exhibit.DataEdit.Editor._ERRCOL_:Exhibit.DataEdit.Editor._BGCOL_);
}

/* Attempt to format number (as string) */
Exhibit.DataEdit.Editor.NumberField.prototype._format = function(v) {
	v=v+"";
	var neg = false;
	if(v.charAt(0)=='-') { neg=true;  v=v.substring(1); }
	while(v.length < this._formatDigits) { v="0"+v; }
	if(neg) { v="-"+v; }
	return v;
}

/* ======================================================================== 
 * Statics
 * ======================================================================== */
/** Run a function, f, on each element representing <input ex:type="number">. */
Exhibit.DataEdit.Editor.NumberField.domFilter = function(jqThis,f) {
	$('input',jqThis)
		.filter(function(idx) { return $(this).attr("ex:type")=="number"; })
			.each(f);
}