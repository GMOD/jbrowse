/**
 * Edit text string.  A value of 'undefined' is assumed to mean the value (object) 
 * is missing from the item (subject).  An undefined value is presented for editing
 * as an emptry string.  An empty string will treated as undefined when saving an 
 * item back to the database, and as such the property/value will not be stored.
 *
 * ex:type="text" 
 * ex:content=".<prop>"
 * ex:validators="<list>"
 * ex:disabledFor="edit|add|all"
 * ex:useDisplayStyle="true|false"
 * ex:large="true"  [optional]
 * ex:rows="v" [optional, if ex:large set]
 * ex:cols="v" [optional, if ex:large set]
 *
 * css class: exhibitDataEditTextField
 */
 
/* ========================================================================
 * Constructor
 * ======================================================================== */
Exhibit.DataEdit.Editor.TextField = function(jq,iid,pid,val,noLens) {
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
	this._prefDimensions = null;
	// For this component only
	this._largeText = Exhibit.DataEdit.Editor._parseTrueFalse($(jq).attr("ex:large"));  // Use <textarea> ?
	this._rows = parseInt($(jq).attr("ex:rows"));
	this._cols = parseInt($(jq).attr("ex:cols"));
	
	// Clean up
	if(this._value==undefined) { this._value = ""; }
	// Check
	if((typeof this._value)!='string') { throw "Invalid data for TextField"; }
}

/** Create component HTML. */
Exhibit.DataEdit.Editor.TextField.prototype.getHTML = function(onShow) {
	var textDim = Exhibit.DataEdit.Editor._getColRowDimensions(this._jqThis,1,1);
	this._prefDimensions = { width:textDim.width*10 , height:textDim.height*1 };
	var style = null;
	if(this._noEditorLens || this._matchDisplayLens) {
		style = Exhibit.DataEdit.Editor._extractStyle(this._jqThis) +
			'border-width: 0px;  border-style: None; padding: 0px; '+
			'width: '+$(this._jqThis).width()+'px; height: '+$(this._jqThis).height()+'px; ';
		var contH = $(this._jqThis).height();
		this._largeText = ((contH/textDim.height) >= 2);
	}
	var onChange = (this._saveOnChange) ? "Exhibit.DataEdit.onChange('"+this._itemId+"','"+this._propId+"')" : "";
	if(this._largeText) {
		var c = this._cols ? this._cols : null;
		var r = this._rows ? this._rows : null;
		var tag = Exhibit.DataEdit.Editor._htmlTag(
			'textarea',
			{ 'id':this._divId , 'style':style , 'class':'exhibitDataEditTextAreaField' , 'rows':r , 'cols':c , 'onchange':onChange } ,
			$(this._jqThis).get()[0] , 
			false
		);
		return tag + this._value + '</textarea>';
	} else {
		var tag = Exhibit.DataEdit.Editor._htmlTag(
			'input' ,
			{ 'id':this._divId , 'style':style , 'class':'exhibitDataEditTextField' , 'type':'Text' , 'value':this._value , 'onchange':onChange } ,
			$(this._jqThis).get()[0] ,
			true
		);
		return tag;
	}
}

/** Get value -- empty is assumed to be undefined. */
Exhibit.DataEdit.Editor.TextField.prototype.getValue = function() {
	var els = $('#'+this._divId).get();
	if(els.length) { 
		return (els[0].value!="") ? els[0].value : undefined ;
	} else {
		return undefined;
	}
}
/** Set value. */
Exhibit.DataEdit.Editor.TextField.prototype.setValue = function(v) {
	var els = $('#'+this._divId).get();
	if(els.length) { els[0].value = v; }
}
/** Show error (?) */
Exhibit.DataEdit.Editor.TextField.prototype.setError = function(b) {
	$('#'+this._divId).css('background-color' , b?Exhibit.DataEdit.Editor._ERRCOL_:Exhibit.DataEdit.Editor._BGCOL_);
}


/* ======================================================================== 
 * Statics
 * ======================================================================== */
/** Run a function, f, on each element representing <input ex:type="text">. */
Exhibit.DataEdit.Editor.TextField.domFilter = function(jqThis,f) {
	$('input',jqThis)
		.filter(function(idx) { return $(this).attr("ex:type")=="text"; })
			.each(f);
}