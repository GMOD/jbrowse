if(!dojo._hasResource["dojox.sketch.Slider"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.sketch.Slider"] = true;
dojo.provide("dojox.sketch.Slider");

dojo.require("dijit.form.Slider");
dojo.declare("dojox.sketch.Slider",dojox.sketch._Plugin,{
	_initButton: function(){
		this.slider=new dijit.form.HorizontalSlider({minimum:20,maximum:200,value:20,style:"width:200px;float:right"});
		this.connect(this.slider,'onChange','_setZoom');
		this.connect(this.slider.sliderHandle,'ondblclick','_zoomToFit');
	},
	_zoomToFit: function(){
		this.slider.setValue(this.figure.getFit(),true);
	},
	_setZoom: function(v){
		if(this.figure){
			this.figure.zoom(v);
		}
	},
	setToolbar: function(t){
		t.addChild(this.slider);
		if(!t._reset2Zoom){
			t._reset2Zoom=true;
			this.connect(t,'reset','_zoomToFit');
		}
	}
});

dojox.sketch.registerTool("Slider", dojox.sketch.Slider);

}
