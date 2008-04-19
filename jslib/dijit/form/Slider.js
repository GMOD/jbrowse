if(!dojo._hasResource["dijit.form.Slider"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.form.Slider"] = true;
dojo.provide("dijit.form.Slider");

dojo.require("dijit.form._FormWidget");
dojo.require("dijit._Container");
dojo.require("dojo.dnd.move");
dojo.require("dijit.form.Button");
dojo.require("dojo.number");
dojo.require("dojo._base.fx");

dojo.declare(
	"dijit.form.HorizontalSlider",
	[dijit.form._FormValueWidget, dijit._Container],
{
	// summary
	//	A form widget that allows one to select a value with a horizontally draggable image

	templateString:"<table class=\"dijit dijitReset dijitSlider\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" rules=\"none\"\n\t><tr class=\"dijitReset\"\n\t\t><td class=\"dijitReset\" colspan=\"2\"></td\n\t\t><td dojoAttachPoint=\"containerNode,topDecoration\" class=\"dijitReset\" style=\"text-align:center;width:100%;\"></td\n\t\t><td class=\"dijitReset\" colspan=\"2\"></td\n\t></tr\n\t><tr class=\"dijitReset\"\n\t\t><td class=\"dijitReset dijitSliderButtonContainer dijitSliderButtonContainerH\"\n\t\t\t><div class=\"dijitSliderDecrementIconH\" tabIndex=\"-1\" style=\"display:none\" dojoAttachPoint=\"decrementButton\" dojoAttachEvent=\"onclick: decrement\"><span class=\"dijitSliderButtonInner\">-</span></div\n\t\t></td\n\t\t><td class=\"dijitReset\"\n\t\t\t><div class=\"dijitSliderBar dijitSliderBumper dijitSliderBumperH dijitSliderLeftBumper dijitSliderLeftBumper\" dojoAttachEvent=\"onclick:_onClkDecBumper\"></div\n\t\t></td\n\t\t><td class=\"dijitReset\"\n\t\t\t><input dojoAttachPoint=\"valueNode\" type=\"hidden\" name=\"${name}\"\n\t\t\t/><div waiRole=\"presentation\" style=\"position:relative;\" dojoAttachPoint=\"sliderBarContainer\"\n\t\t\t\t><div waiRole=\"presentation\" dojoAttachPoint=\"progressBar\" class=\"dijitSliderBar dijitSliderBarH dijitSliderProgressBar dijitSliderProgressBarH\" dojoAttachEvent=\"onclick:_onBarClick\"\n\t\t\t\t\t><div dojoAttachPoint=\"sliderHandle,focusNode\" class=\"dijitSliderMoveable dijitSliderMoveableH\" dojoAttachEvent=\"onkeypress:_onKeyPress,onmousedown:_onHandleClick\" waiRole=\"slider\" valuemin=\"${minimum}\" valuemax=\"${maximum}\"\n\t\t\t\t\t\t><div class=\"dijitSliderImageHandle dijitSliderImageHandleH\"></div\n\t\t\t\t\t></div\n\t\t\t\t></div\n\t\t\t\t><div waiRole=\"presentation\" dojoAttachPoint=\"remainingBar\" class=\"dijitSliderBar dijitSliderBarH dijitSliderRemainingBar dijitSliderRemainingBarH\" dojoAttachEvent=\"onclick:_onBarClick\"></div\n\t\t\t></div\n\t\t></td\n\t\t><td class=\"dijitReset\"\n\t\t\t><div class=\"dijitSliderBar dijitSliderBumper dijitSliderBumperH dijitSliderRightBumper dijitSliderRightBumper\" dojoAttachEvent=\"onclick:_onClkIncBumper\"></div\n\t\t></td\n\t\t><td class=\"dijitReset dijitSliderButtonContainer dijitSliderButtonContainerH\" style=\"right:0px;\"\n\t\t\t><div class=\"dijitSliderIncrementIconH\" tabIndex=\"-1\" style=\"display:none\" dojoAttachPoint=\"incrementButton\" dojoAttachEvent=\"onclick: increment\"><span class=\"dijitSliderButtonInner\">+</span></div\n\t\t></td\n\t></tr\n\t><tr class=\"dijitReset\"\n\t\t><td class=\"dijitReset\" colspan=\"2\"></td\n\t\t><td dojoAttachPoint=\"containerNode,bottomDecoration\" class=\"dijitReset\" style=\"text-align:center;\"></td\n\t\t><td class=\"dijitReset\" colspan=\"2\"></td\n\t></tr\n></table>\n",
	value: 0,

	// showButtons: boolean
	//	Show increment/decrement buttons at the ends of the slider?
	showButtons: true,

	// minimum:: integer
	//	The minimum value allowed.
	minimum: 0,

	// maximum: integer
	//	The maximum allowed value.
	maximum: 100,

	// discreteValues: integer
	//	The maximum allowed values dispersed evenly between minimum and maximum (inclusive).
	discreteValues: Infinity,

	// pageIncrement: integer
	//	The amount of change with shift+arrow
	pageIncrement: 2,

	// clickSelect: boolean
	//	If clicking the progress bar changes the value or not
	clickSelect: true,

	// slideDuration: Number
	//	The time in ms to take to animate the slider handle from 0% to 100%
	slideDuration: 1000,

	widgetsInTemplate: true,

	attributeMap: dojo.mixin(dojo.clone(dijit.form._FormWidget.prototype.attributeMap),
		{id:"", name:"valueNode"}),

	baseClass: "dijitSlider",

	_mousePixelCoord: "pageX",
	_pixelCount: "w",
	_startingPixelCoord: "x",
	_startingPixelCount: "l",
	_handleOffsetCoord: "left",
	_progressPixelSize: "width",

	_onKeyPress: function(/*Event*/ e){
		if(this.disabled || this.readOnly || e.altKey || e.ctrlKey){ return; }
		switch(e.keyCode){
			case dojo.keys.HOME:
				this.setValue(this.minimum, true);
				break;
			case dojo.keys.END:
				this.setValue(this.maximum, true);
				break;
			// this._descending === false: if ascending vertical (min on top)
			// (this._descending || this.isLeftToRight()): if left-to-right horizontal or descending vertical
			case ((this._descending || this.isLeftToRight()) ? dojo.keys.RIGHT_ARROW : dojo.keys.LEFT_ARROW):
			case (this._descending === false ? dojo.keys.DOWN_ARROW : dojo.keys.UP_ARROW):
			case (this._descending === false ? dojo.keys.PAGE_DOWN : dojo.keys.PAGE_UP):
				this.increment(e);
				break;
			case ((this._descending || this.isLeftToRight()) ? dojo.keys.LEFT_ARROW : dojo.keys.RIGHT_ARROW):
			case (this._descending === false ? dojo.keys.UP_ARROW : dojo.keys.DOWN_ARROW):
			case (this._descending === false ? dojo.keys.PAGE_UP : dojo.keys.PAGE_DOWN):
				this.decrement(e);
				break;
			default:
				this.inherited(arguments);
				return;
		}
		dojo.stopEvent(e);
	},

	_onHandleClick: function(e){
		if(this.disabled || this.readOnly){ return; }
		if(!dojo.isIE){
			// make sure you get focus when dragging the handle
			// (but don't do on IE because it causes a flicker on mouse up (due to blur then focus)
			dijit.focus(this.sliderHandle);
		}
		dojo.stopEvent(e);
	},
	
	_isReversed: function(){
		return !this.isLeftToRight();
	},

	_onBarClick: function(e){
		if(this.disabled || this.readOnly || !this.clickSelect){ return; }
		dijit.focus(this.sliderHandle);
		dojo.stopEvent(e);
		var abspos = dojo.coords(this.sliderBarContainer, true);
		var pixelValue = e[this._mousePixelCoord] - abspos[this._startingPixelCoord];
		this._setPixelValue(this._isReversed() ? (abspos[this._pixelCount] - pixelValue) : pixelValue, abspos[this._pixelCount], true);
	},

	_setPixelValue: function(/*Number*/ pixelValue, /*Number*/ maxPixels, /*Boolean, optional*/ priorityChange){
		if(this.disabled || this.readOnly){ return; }
		pixelValue = pixelValue < 0 ? 0 : maxPixels < pixelValue ? maxPixels : pixelValue;
		var count = this.discreteValues;
		if(count <= 1 || count == Infinity){ count = maxPixels; }
		count--;
		var pixelsPerValue = maxPixels / count;
		var wholeIncrements = Math.round(pixelValue / pixelsPerValue);
		this.setValue((this.maximum-this.minimum)*wholeIncrements/count + this.minimum, priorityChange);
	},

	setValue: function(/*Number*/ value, /*Boolean, optional*/ priorityChange){
		this.valueNode.value = this.value = value;
		dijit.setWaiState(this.focusNode, "valuenow", value);
		this.inherited(arguments);
		var percent = (value - this.minimum) / (this.maximum - this.minimum);
		var progressBar = (this._descending === false) ? this.remainingBar : this.progressBar;
		var remainingBar = (this._descending === false) ? this.progressBar : this.remainingBar;
		if(priorityChange && this.slideDuration > 0 && progressBar.style[this._progressPixelSize]){
			// animate the slider
			var _this = this;
			var props = {};
			var start = parseFloat(progressBar.style[this._progressPixelSize]);
			var duration = this.slideDuration * (percent-start/100);
			if(duration == 0){ return; }
			if(duration < 0){ duration = 0 - duration; }
			props[this._progressPixelSize] = { start: start, end: percent*100, units:"%" };
			dojo.animateProperty({ node: progressBar, duration: duration, 
				onAnimate: function(v){ remainingBar.style[_this._progressPixelSize] = (100-parseFloat(v[_this._progressPixelSize])) + "%"; },
			        properties: props
			}).play();
		}
		else{
			progressBar.style[this._progressPixelSize] = (percent*100) + "%";
			remainingBar.style[this._progressPixelSize] = ((1-percent)*100) + "%";
		}
	},

	_bumpValue: function(signedChange){
		if(this.disabled || this.readOnly){ return; }
		var s = dojo.getComputedStyle(this.sliderBarContainer);
		var c = dojo._getContentBox(this.sliderBarContainer, s);
		var count = this.discreteValues;
		if(count <= 1 || count == Infinity){ count = c[this._pixelCount]; }
		count--;
		var value = (this.value - this.minimum) * count / (this.maximum - this.minimum) + signedChange;
		if(value < 0){ value = 0; }
		if(value > count){ value = count; }
		value = value * (this.maximum - this.minimum) / count + this.minimum;
		this.setValue(value, true);
	},

	_onClkIncBumper: function(){
		this.setValue(this._descending === false ? this.minimum : this.maximum, true);
	},

	_onClkDecBumper: function(){
		this.setValue(this._descending === false ? this.maximum : this.minimum, true);
	},

	decrement: function(e){
		// summary
		//	decrement slider by 1 unit
		this._bumpValue(e.keyCode == dojo.keys.PAGE_DOWN?-this.pageIncrement:-1);
	},

	increment: function(e){
		// summary
		//	increment slider by 1 unit
		this._bumpValue(e.keyCode == dojo.keys.PAGE_UP?this.pageIncrement:1);
	},

	_mouseWheeled: function(/*Event*/ evt){
		dojo.stopEvent(evt);
		var scrollAmount = 0;
		if(typeof evt.wheelDelta == 'number'){ // IE
			scrollAmount = evt.wheelDelta;
		}else if(typeof evt.detail == 'number'){ // Mozilla+Firefox
			scrollAmount = -evt.detail;
		}
		if(scrollAmount > 0){
			this.increment(evt);
		}else if(scrollAmount < 0){
			this.decrement(evt);
		}
	},

	startup: function(){
		dojo.forEach(this.getChildren(), function(child){
			if(this[child.container] != this.containerNode){
				this[child.container].appendChild(child.domNode);
			}
		}, this);
	},

	postCreate: function(){
		if(this.showButtons){
			this.incrementButton.style.display="";
			this.decrementButton.style.display="";
		}
		this.connect(this.domNode, dojo.isIE ? "onmousewheel" : 'DOMMouseScroll', "_mouseWheeled");

		// define a custom constructor for a SliderMover that points back to me
		var _self = this;
		var mover = function(){
			dijit.form._SliderMover.apply(this, arguments);
			this.widget = _self;
		};
		dojo.extend(mover, dijit.form._SliderMover.prototype);

		this._movable = new dojo.dnd.Moveable(this.sliderHandle, {mover: mover});
		dijit.setWaiState(this.focusNode, "valuemin", this.minimum);
		dijit.setWaiState(this.focusNode, "valuemax", this.maximum);

		this.inherited(arguments);
	},

	destroy: function(){
		this._movable.destroy();
		this.inherited(arguments);	
	}
});

dojo.declare(
	"dijit.form.VerticalSlider",
	dijit.form.HorizontalSlider,
{
	// summary
	//	A form widget that allows one to select a value with a vertically draggable image

	templateString:"<table class=\"dijitReset dijitSlider\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" rules=\"none\"\n><tbody class=\"dijitReset\"\n\t><tr class=\"dijitReset\"\n\t\t><td class=\"dijitReset\"></td\n\t\t><td class=\"dijitReset dijitSliderButtonContainer dijitSliderButtonContainerV\"\n\t\t\t><div class=\"dijitSliderIncrementIconV\" tabIndex=\"-1\" style=\"display:none\" dojoAttachPoint=\"incrementButton\" dojoAttachEvent=\"onclick:_topButtonClicked\"><span class=\"dijitSliderButtonInner\">+</span></div\n\t\t></td\n\t\t><td class=\"dijitReset\"></td\n\t></tr\n\t><tr class=\"dijitReset\"\n\t\t><td class=\"dijitReset\"></td\n\t\t><td class=\"dijitReset\"\n\t\t\t><center><div class=\"dijitSliderBar dijitSliderBumper dijitSliderBumperV dijitSliderTopBumper dijitSliderTopBumper\" dojoAttachEvent=\"onclick:_onClkIncBumper\"></div></center\n\t\t></td\n\t\t><td class=\"dijitReset\"></td\n\t></tr\n\t><tr class=\"dijitReset\"\n\t\t><td dojoAttachPoint=\"leftDecoration\" class=\"dijitReset\" style=\"text-align:center;height:100%;\"></td\n\t\t><td class=\"dijitReset\" style=\"height:100%;\"\n\t\t\t><input dojoAttachPoint=\"valueNode\" type=\"hidden\" name=\"${name}\"\n\t\t\t/><center waiRole=\"presentation\" style=\"position:relative;height:100%;\" dojoAttachPoint=\"sliderBarContainer\"\n\t\t\t\t><div waiRole=\"presentation\" dojoAttachPoint=\"remainingBar\" class=\"dijitSliderBar dijitSliderBarV dijitSliderRemainingBar dijitSliderRemainingBarV\" dojoAttachEvent=\"onclick:_onBarClick\"><!--#5629--></div\n\t\t\t\t><div waiRole=\"presentation\" dojoAttachPoint=\"progressBar\" class=\"dijitSliderBar dijitSliderBarV dijitSliderProgressBar dijitSliderProgressBarV\" dojoAttachEvent=\"onclick:_onBarClick\"\n\t\t\t\t\t><div dojoAttachPoint=\"sliderHandle,focusNode\" class=\"dijitSliderMoveable\" dojoAttachEvent=\"onkeypress:_onKeyPress,onmousedown:_onHandleClick\" style=\"vertical-align:top;\" waiRole=\"slider\" valuemin=\"${minimum}\" valuemax=\"${maximum}\"\n\t\t\t\t\t\t><div class=\"dijitSliderImageHandle dijitSliderImageHandleV\"></div\n\t\t\t\t\t></div\n\t\t\t\t></div\n\t\t\t></center\n\t\t></td\n\t\t><td dojoAttachPoint=\"containerNode,rightDecoration\" class=\"dijitReset\" style=\"text-align:center;height:100%;\"></td\n\t></tr\n\t><tr class=\"dijitReset\"\n\t\t><td class=\"dijitReset\"></td\n\t\t><td class=\"dijitReset\"\n\t\t\t><center><div class=\"dijitSliderBar dijitSliderBumper dijitSliderBumperV dijitSliderBottomBumper dijitSliderBottomBumper\" dojoAttachEvent=\"onclick:_onClkDecBumper\"></div></center\n\t\t></td\n\t\t><td class=\"dijitReset\"></td\n\t></tr\n\t><tr class=\"dijitReset\"\n\t\t><td class=\"dijitReset\"></td\n\t\t><td class=\"dijitReset dijitSliderButtonContainer dijitSliderButtonContainerV\"\n\t\t\t><div class=\"dijitSliderDecrementIconV\" tabIndex=\"-1\" style=\"display:none\" dojoAttachPoint=\"decrementButton\" dojoAttachEvent=\"onclick:_bottomButtonClicked\"><span class=\"dijitSliderButtonInner\">-</span></div\n\t\t></td\n\t\t><td class=\"dijitReset\"></td\n\t></tr\n></tbody></table>\n",
	_mousePixelCoord: "pageY",
	_pixelCount: "h",
	_startingPixelCoord: "y",
	_startingPixelCount: "t",
	_handleOffsetCoord: "top",
	_progressPixelSize: "height",

	// _descending: boolean
	//      Specifies if the slider values go from high-on-top (true), or low-on-top (false)
	//	TODO: expose this in 1.2 - the css progress/remaining bar classes need to be reversed
	_descending: true,

	startup: function(){
		if(this._started){ return; }

		if(!this.isLeftToRight() && dojo.isMoz){
			if(this.leftDecoration){this._rtlRectify(this.leftDecoration);}
			if(this.rightDecoration){this._rtlRectify(this.rightDecoration);}
		}

		this.inherited(arguments);
	},
		
	_isReversed: function(){
		return this._descending;
	},

	_topButtonClicked: function(e){
		if(this._descending){
			this.increment(e);
		}else{
			this.decrement(e);
		}
	},

	_bottomButtonClicked: function(e){
		if(this._descending){
			this.decrement(e);
		}else{
			this.increment(e);
		}
	},

	_rtlRectify: function(decorationNode/*NodeList*/){
		// summary:
		//      Rectify children nodes for left/right decoration in rtl case.
		//		Simply switch the rule and label child for each decoration node.
		var childNodes = [];
		while(decorationNode.firstChild){
				childNodes.push(decorationNode.firstChild);
				decorationNode.removeChild(decorationNode.firstChild);
		}
		for(var i = childNodes.length-1; i >=0; i--){
			if(childNodes[i]){
				decorationNode.appendChild(childNodes[i]);
			}
		}
	}
});

dojo.declare("dijit.form._SliderMover",
	dojo.dnd.Mover,
{
	onMouseMove: function(e){
		var widget = this.widget;
		var abspos = widget._abspos;
		if(!abspos){
			abspos = widget._abspos = dojo.coords(widget.sliderBarContainer, true);
			widget._setPixelValue_ = dojo.hitch(widget, "_setPixelValue");
			widget._isReversed_ = widget._isReversed();
		}
		var pixelValue = e[widget._mousePixelCoord] - abspos[widget._startingPixelCoord];
		widget._setPixelValue_(widget._isReversed_ ? (abspos[widget._pixelCount]-pixelValue) : pixelValue, abspos[widget._pixelCount], false);
	},
	
	destroy: function(e){
		dojo.dnd.Mover.prototype.destroy.apply(this, arguments);
		var widget = this.widget;
		widget.setValue(widget.value, true);
	}
});


dojo.declare("dijit.form.HorizontalRule", [dijit._Widget, dijit._Templated],
{
	//	Summary:
	//		Create hash marks for the Horizontal slider
	templateString: '<div class="dijitRuleContainer dijitRuleContainerH"></div>',

	// count: Integer
	//		Number of hash marks to generate
	count: 3,

	// container: Node
	//		If this is a child widget, connect it to this parent node
	container: "containerNode",

	// ruleStyle: String
	//		CSS style to apply to individual hash marks
	ruleStyle: "",

	_positionPrefix: '<div class="dijitRuleMark dijitRuleMarkH" style="left:',
	_positionSuffix: '%;',
	_suffix: '"></div>',

	_genHTML: function(pos, ndx){
		return this._positionPrefix + pos + this._positionSuffix + this.ruleStyle + this._suffix;
	},
	
	_isHorizontal: true,

	postCreate: function(){
		var innerHTML;
		if(this.count==1){
			innerHTML = this._genHTML(50, 0);
		}else{
			var i;
			var interval = 100 / (this.count-1);
			if(!this._isHorizontal || this.isLeftToRight()){
				innerHTML = this._genHTML(0, 0);
				for(i=1; i < this.count-1; i++){
					innerHTML += this._genHTML(interval*i, i);
				}
				innerHTML += this._genHTML(100, this.count-1);
			}else{
				innerHTML = this._genHTML(100, 0);
				for(i=1; i < this.count-1; i++){
					innerHTML += this._genHTML(100-interval*i, i);
				}
				innerHTML += this._genHTML(0, this.count-1);
			}
		}
		this.domNode.innerHTML = innerHTML;
	}
});

dojo.declare("dijit.form.VerticalRule", dijit.form.HorizontalRule,
{
	//	Summary:
	//		Create hash marks for the Vertical slider
	templateString: '<div class="dijitRuleContainer dijitRuleContainerV"></div>',
	_positionPrefix: '<div class="dijitRuleMark dijitRuleMarkV" style="top:',
	
	_isHorizontal: false
});

dojo.declare("dijit.form.HorizontalRuleLabels", dijit.form.HorizontalRule,
{
	//	Summary:
	//		Create labels for the Horizontal slider
	templateString: '<div class="dijitRuleContainer dijitRuleContainerH"></div>',

	// labelStyle: String
	//		CSS style to apply to individual text labels
	labelStyle: "",

	// labels: Array
	//	Array of text labels to render - evenly spaced from left-to-right or bottom-to-top
	labels: [],

	// numericMargin: Integer
	//	Number of generated numeric labels that should be rendered as '' on the ends when labels[] are not specified
	numericMargin: 0,

	// numericMinimum: Integer
	//	Leftmost label value for generated numeric labels when labels[] are not specified
	minimum: 0,

	// numericMaximum: Integer
	//	Rightmost label value for generated numeric labels when labels[] are not specified
	maximum: 1,

	// constraints: object
	//	pattern, places, lang, et al (see dojo.number) for generated numeric labels when labels[] are not specified
	constraints: {pattern:"#%"},

	_positionPrefix: '<div class="dijitRuleLabelContainer dijitRuleLabelContainerH" style="left:',
	_labelPrefix: '"><span class="dijitRuleLabel dijitRuleLabelH">',
	_suffix: '</span></div>',

	_calcPosition: function(pos){
		return pos;
	},

	_genHTML: function(pos, ndx){
		return this._positionPrefix + this._calcPosition(pos) + this._positionSuffix + this.labelStyle + this._labelPrefix + this.labels[ndx] + this._suffix;
	},

	getLabels: function(){
		// summary: user replaceable function to return the labels array

		// if the labels array was not specified directly, then see if <li> children were
		var labels = this.labels;
		if(!labels.length){
			// for markup creation, labels are specified as child elements
			labels = dojo.query("> li", this.srcNodeRef).map(function(node){
				return String(node.innerHTML);
			});
		}
		this.srcNodeRef.innerHTML = '';
		// if the labels were not specified directly and not as <li> children, then calculate numeric labels
		if(!labels.length && this.count > 1){
			var start = this.minimum;
			var inc = (this.maximum - start) / (this.count-1);
			for (var i=0; i < this.count; i++){
				labels.push((i<this.numericMargin||i>=(this.count-this.numericMargin))? '' : dojo.number.format(start, this.constraints));
				start += inc;
			}
		}
		return labels;
	},

	postMixInProperties: function(){
		this.inherited(arguments);
		this.labels = this.getLabels();
		this.count = this.labels.length;
	}
});

dojo.declare("dijit.form.VerticalRuleLabels", dijit.form.HorizontalRuleLabels,
{
	//	Summary:
	//		Create labels for the Vertical slider
	templateString: '<div class="dijitRuleContainer dijitRuleContainerV"></div>',

	_positionPrefix: '<div class="dijitRuleLabelContainer dijitRuleLabelContainerV" style="top:',
	_labelPrefix: '"><span class="dijitRuleLabel dijitRuleLabelV">',

	_calcPosition: function(pos){
		return 100-pos;
	},
	
	_isHorizontal: false
});

}
