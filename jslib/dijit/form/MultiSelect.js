if(!dojo._hasResource["dijit.form.MultiSelect"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.form.MultiSelect"] = true;
dojo.provide("dijit.form.MultiSelect");

dojo.require("dijit.form._FormWidget");

dojo.declare("dijit.form.MultiSelect",dijit.form._FormWidget,{
	// summary: Wrapper for a native select multiple="true" element to
	//		interact with dijit.form.Form

	// size: Number
	//		Number of elements to display on a page
	//		NOTE: may be removed in version 2.0, since elements may have variable height;
	//		set the size via style="..." or CSS class names instead.
	size: 7,
	
	templateString: "<select multiple='true' dojoAttachPoint='containerNode,focusNode' dojoAttachEvent='onchange: _onChange'></select>",

	attributeMap: dojo.mixin(dojo.clone(dijit.form._FormWidget.prototype.attributeMap),
		{size:"focusNode"}),

	addSelected: function(/* dijit.form.MultiSelect */select){
		// summary: Move the selected nodes af an passed Select widget
		//			instance to this Select widget.
		//
		// example:
		// |	// move all the selected values from "bar" to "foo"
		// | 	dijit.byId("foo").addSelected(dijit.byId("bar"));
		
		select.getSelected().forEach(function(n){
			this.containerNode.appendChild(n);
		},this);
	},
					
	getSelected: function(){
		// summary: Access the NodeList of the selected options directly
		return dojo.query("option",this.containerNode).filter(function(n){
			return n.selected; // Boolean
		});
	},
	
	_getValueDeprecated: false, // remove when _FormWidget:_getValueDeprecated is removed in 2.0
	getValue: function(){
		// summary: Returns an array of the selected options' values
		return this.getSelected().map(function(n){
			return n.value;
		});
	},
	
	_multiValue: true, // for Form
	setValue: function(/* Array */values){
		// summary: Set the value(s) of this Select based on passed values
		dojo.query("option",this.containerNode).forEach(function(n){
			n.selected = (dojo.indexOf(values,n.value) != -1);
		});
	},
		
	invertSelection: function(onChange){
		// summary: Invert the selection
		// onChange: Boolean
		//		If null, onChange is not fired.
		dojo.query("option",this.containerNode).forEach(function(n){
			n.selected = !n.selected;
		});
		this._handleOnChange(this.getValue(), onChange==true);
	},

	_onChange: function(/*Event*/ e){
		this._handleOnChange(this.getValue(), true);
	},
	
	// for layout widgets:
	resize: function(/* Object */size){
		if(size){
			dojo.marginBox(this.domNode, size);
		}
	},
	
	postCreate: function(){
		this._onChange();
	}
});

}
