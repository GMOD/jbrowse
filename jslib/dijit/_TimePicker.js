if(!dojo._hasResource["dijit._TimePicker"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._TimePicker"] = true;
dojo.provide("dijit._TimePicker");

dojo.require("dijit.form._FormWidget");
dojo.require("dojo.date.locale");

/*=====
dojo.declare(
	"dijit._TimePicker.__Constraints",
	[dojo.date.locale.__FormatOptions],
	{
		// clickableIncrement: String
		//		see dijit._TimePicker.clickableIncrement
		clickableIncrement: "T00:15:00",

		// visibleIncrement: String
		//		see dijit._TimePicker.visibleIncrement
		visibleIncrement: "T01:00:00",

		// visibleRange: String
		//		see dijit._TimePicker.visibleRange
		visibleRange: "T05:00:00"
	}
);
=====*/

dojo.declare("dijit._TimePicker",
	[dijit._Widget, dijit._Templated],
	{
		//	summary:
		//		A graphical time picker.
		//		This widget is used internally by other widgets and is not accessible
		//		as a standalone widget.

		templateString:"<div id=\"widget_${id}\" class=\"dijitMenu\"\n    ><div dojoAttachPoint=\"upArrow\" class=\"dijitButtonNode\"><span class=\"dijitTimePickerA11yText\">&#9650;</span></div\n    ><div dojoAttachPoint=\"timeMenu,focusNode\" dojoAttachEvent=\"onclick:_onOptionSelected,onmouseover,onmouseout\"></div\n    ><div dojoAttachPoint=\"downArrow\" class=\"dijitButtonNode\"><span class=\"dijitTimePickerA11yText\">&#9660;</span></div\n></div>\n",
		baseClass: "dijitTimePicker",

		// clickableIncrement: String
		//		ISO-8601 string representing the amount by which
		//		every clickable element in the time picker increases.
		//		Set in local time, without a time zone.
		//		Example: `T00:15:00` creates 15 minute increments
		//		Must divide dijit._TimePicker.visibleIncrement evenly
		clickableIncrement: "T00:15:00",

		// visibleIncrement: String
		//		ISO-8601 string representing the amount by which
		//		every element with a visible time in the time picker increases.
		//		Set in local time, without a time zone.
		//		Example: `T01:00:00` creates text in every 1 hour increment
		visibleIncrement: "T01:00:00",

		// visibleRange: String
		//		ISO-8601 string representing the range of this TimePicker.
		//		The TimePicker will only display times in this range.
		//		Example: `T05:00:00` displays 5 hours of options
		visibleRange: "T05:00:00",

		// value: String
		//		Date to display.
		//		Defaults to current time and date.
		//		Can be a Date object or an ISO-8601 string.
		//		If you specify the GMT time zone (`-01:00`),
		//		the time will be converted to the local time in the local time zone.
		//		Otherwise, the time is considered to be in the local time zone.
		//		If you specify the date and isDate is true, the date is used.
		//		Example: if your local time zone is `GMT -05:00`,
		//		`T10:00:00` becomes `T10:00:00-05:00` (considered to be local time),
		//		`T10:00:00-01:00` becomes `T06:00:00-05:00` (4 hour difference),
		//		`T10:00:00Z` becomes `T05:00:00-05:00` (5 hour difference between Zulu and local time)
		//		`yyyy-mm-ddThh:mm:ss` is the format to set the date and time
		//		Example: `2007-06-01T09:00:00`
		value: new Date(),

		_visibleIncrement:2,
		_clickableIncrement:1,
		_totalIncrements:10,

		// constraints: dijit._TimePicker.__Constraints 
		constraints:{},

		serialize: dojo.date.stamp.toISOString,

//TODOC: what is priority?
		setValue:function(/*Date*/ date, /*Boolean*/ priority){
			// summary:
			//	Set the value of the TimePicker
			//	Redraws the TimePicker around the new date

			//dijit._TimePicker.superclass.setValue.apply(this, arguments);
			this.value=date;
			this._showText();
		},

		isDisabledDate: function(/*Date*/dateObject, /*String?*/locale){
			// summary:
			//	May be overridden to disable certain dates in the TimePicker e.g. `isDisabledDate=dojo.date.locale.isWeekend`
			return false; // Boolean
		},

		_showText:function(){
			this.timeMenu.innerHTML = "";
			var fromIso = dojo.date.stamp.fromISOString;
			this._clickableIncrementDate=fromIso(this.clickableIncrement);
			this._visibleIncrementDate=fromIso(this.visibleIncrement);
			this._visibleRangeDate=fromIso(this.visibleRange);
			// get the value of the increments and the range in seconds (since 00:00:00) to find out how many divs to create
			var sinceMidnight = function(/*Date*/ date){
				return date.getHours() * 60 * 60 + date.getMinutes() * 60 + date.getSeconds();
			};

			var clickableIncrementSeconds = sinceMidnight(this._clickableIncrementDate);
			var visibleIncrementSeconds = sinceMidnight(this._visibleIncrementDate);
			var visibleRangeSeconds = sinceMidnight(this._visibleRangeDate);

			// round reference date to previous visible increment
			var time = this.value.getTime();
			this._refDate = new Date(time - time % (visibleIncrementSeconds*1000));
			this._refDate.setFullYear(1970,0,1); // match parse defaults

			// assume clickable increment is the smallest unit
			this._clickableIncrement = 1;
			// divide the visible range by the clickable increment to get the number of divs to create
			// example: 10:00:00/00:15:00 -> display 40 divs
			this._totalIncrements = visibleRangeSeconds / clickableIncrementSeconds;
			// divide the visible increments by the clickable increments to get how often to display the time inline
			// example: 01:00:00/00:15:00 -> display the time every 4 divs
			this._visibleIncrement = visibleIncrementSeconds / clickableIncrementSeconds;
			for(var i = -(this._totalIncrements >> 1); i < (this._totalIncrements >> 1); i += this._clickableIncrement){
				this.timeMenu.appendChild(this._createOption(i));
			}
			
			// TODO:
			// I commented this out because it
			// causes problems for a TimeTextBox in a Dialog, or as the editor of an InlineEditBox,
			// because the timeMenu node isn't visible yet. -- Bill (Bug #????)
			// dijit.focus(this.timeMenu);
		},

		postCreate:function(){
			// instantiate constraints
			if(this.constraints===dijit._TimePicker.prototype.constraints){
				this.constraints={};
			}

			// brings in visibleRange, increments, etc.
			dojo.mixin(this, this.constraints);

			// dojo.date.locale needs the lang in the constraints as locale
			if(!this.constraints.locale){
				this.constraints.locale=this.lang;
			}

			// assign typematic mouse listeners to the arrow buttons
			this.connect(this.timeMenu, dojo.isIE ? "onmousewheel" : 'DOMMouseScroll', "_mouseWheeled");
			var typematic = dijit.typematic.addMouseListener;
			typematic(this.upArrow,this,this._onArrowUp, 0.8, 500);
			typematic(this.downArrow,this,this._onArrowDown, 0.8, 500);
			//dijit.typematic.addListener(this.upArrow,this.timeMenu, {keyCode:dojo.keys.UP_ARROW,ctrlKey:false,altKey:false,shiftKey:false}, this, "_onArrowUp", 0.8, 500);
			//dijit.typematic.addListener(this.downArrow, this.timeMenu, {keyCode:dojo.keys.DOWN_ARROW,ctrlKey:false,altKey:false,shiftKey:false}, this, "_onArrowDown", 0.8,500);

			this.inherited(arguments);
			this.setValue(this.value);
		},

		_createOption:function(/*Number*/ index){
			// summary: creates a clickable time option
			var div = dojo.doc.createElement("div");
			var date = (div.date = new Date(this._refDate));
			div.index = index;
			var incrementDate = this._clickableIncrementDate;
			date.setHours(date.getHours() + incrementDate.getHours() * index,
				date.getMinutes() + incrementDate.getMinutes() * index,
				date.getSeconds() + incrementDate.getSeconds() * index);

			var innerDiv = dojo.doc.createElement('div');
			dojo.addClass(div,this.baseClass+"Item");
			dojo.addClass(innerDiv,this.baseClass+"ItemInner");
			innerDiv.innerHTML = dojo.date.locale.format(date, this.constraints);				
			div.appendChild(innerDiv);

			if(index%this._visibleIncrement<1 && index%this._visibleIncrement>-1){
				dojo.addClass(div, this.baseClass+"Marker");
			}else if(!(index%this._clickableIncrement)){
				dojo.addClass(div, this.baseClass+"Tick");
			}
						
			if(this.isDisabledDate(date)){
				// set disabled
				dojo.addClass(div, this.baseClass+"ItemDisabled");
			}
			if(!dojo.date.compare(this.value, date, this.constraints.selector)){
				div.selected = true;
				dojo.addClass(div, this.baseClass+"ItemSelected");
			}
			return div;
		},

		_onOptionSelected:function(/*Object*/ tgt){
			var tdate = tgt.target.date || tgt.target.parentNode.date;			
			if(!tdate || this.isDisabledDate(tdate)){ return; }
			this.setValue(tdate);
			this.onValueSelected(tdate);
		},

		onValueSelected:function(value){
		},

		onmouseover:function(/*Event*/ e){
			var tgr = (e.target.parentNode === this.timeMenu) ? e.target : e.target.parentNode;			
			this._highlighted_option=tgr;
			dojo.addClass(tgr, this.baseClass+"ItemHover");
		},

		onmouseout:function(/*Event*/ e){
			var tgr = (e.target.parentNode === this.timeMenu) ? e.target : e.target.parentNode;
			if(this._highlighted_option===tgr){			
				dojo.removeClass(tgr, this.baseClass+"ItemHover");
			}
		},

		_mouseWheeled:function(/*Event*/e){
			// summary: handle the mouse wheel listener
			dojo.stopEvent(e);
			// we're not _measuring_ the scroll amount, just direction
			var scrollAmount = (dojo.isIE ? e.wheelDelta : -e.detail);
			this[(scrollAmount>0 ? "_onArrowUp" : "_onArrowDown")](); // yes, we're making a new dom node every time you mousewheel, or click
		},

		_onArrowUp:function(){
			// summary: remove the bottom time and add one to the top
			var index = this.timeMenu.childNodes[0].index - 1;
			var div = this._createOption(index);
			this.timeMenu.removeChild(this.timeMenu.childNodes[this.timeMenu.childNodes.length - 1]);
			this.timeMenu.insertBefore(div, this.timeMenu.childNodes[0]);
		},

		_onArrowDown:function(){
			// summary: remove the top time and add one to the bottom
			var index = this.timeMenu.childNodes[this.timeMenu.childNodes.length - 1].index + 1;
			var div = this._createOption(index);
			this.timeMenu.removeChild(this.timeMenu.childNodes[0]);
			this.timeMenu.appendChild(div);
		}
	}
);

}
