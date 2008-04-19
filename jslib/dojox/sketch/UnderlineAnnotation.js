if(!dojo._hasResource["dojox.sketch.UnderlineAnnotation"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.sketch.UnderlineAnnotation"] = true;
dojo.provide("dojox.sketch.UnderlineAnnotation");
dojo.require("dojox.sketch.Annotation");
dojo.require("dojox.sketch.Anchor");

(function(){
	var ta=dojox.sketch;
	ta.UnderlineAnnotation=function(figure, id){
		ta.Annotation.call(this, figure, id);
		this.transform={dx:0, dy:0};
		this.start={x:0, y:0};
		this.property('label',this.id);
		this.labelShape=null;
		this.lineShape=null;
		this.anchors.start=new ta.Anchor(this, "start", false);
	};
	ta.UnderlineAnnotation.prototype=new ta.Annotation;
	var p=ta.UnderlineAnnotation.prototype;
	p.constructor=ta.UnderlineAnnotation;

	p.type=function(){ return 'Underline'; };
	p.getType=function(){ return ta.UnderlineAnnotation; };

	p.apply=function(obj){
		if(!obj) return;
		if(obj.documentElement) obj=obj.documentElement;
		this.readCommonAttrs(obj);
		
		for(var i=0; i<obj.childNodes.length; i++){
			var c=obj.childNodes[i];
			if(c.localName=="text") this.property('label',c.childNodes[0].nodeValue);
		}
	};
	
	p.initialize=function(obj){
		var font=(ta.Annotation.labelFont)?ta.Annotation.labelFont:{family:"Times", size:"16px"};
		this.apply(obj);

		//	create either from scratch or based on the passed node
		this.shape=this.figure.group.createGroup();
		this.shape.getEventSource().setAttribute("id", this.id);
		if(this.transform.dx || this.transform.dy) this.shape.setTransform(this.transform);
		this.labelShape=this.shape.createText({
			x:0, y:0, text:this.property('label'), align:"start"
		}).setFont(font).setFill(this.property('fill'));
		this.lineShape=this.shape.createLine({ x1:1, x2:this.labelShape.getTextWidth(), y1:2, y2:2 }).setStroke({ color:this.property('fill'), width:1 });
		this.lineShape.getEventSource().setAttribute("shape-rendering","crispEdges");
	};
	p.destroy=function(){
		if(!this.shape) return;
		this.shape.remove(this.labelShape);
		this.shape.remove(this.lineShape);
		this.figure.group.remove(this.shape);
		this.shape=this.lineShape=this.labelShape=null;
	};
	p.getBBox=function(){
		var b=this.getTextBox();
//		console.log('getBBox',b,this.getLabel());
		return { x:0, y:b.h*-1+4, width:b.w+2, height:b.h };
	};
	p.draw=function(obj){
		this.apply(obj);
		this.shape.setTransform(this.transform);
		this.labelShape.setShape({ x:0, y:0, text:this.property('label') }).setFill(this.property('fill'));
		this.lineShape.setShape({ x1:1, x2:this.labelShape.getTextWidth()+1, y1:2, y2:2 }).setStroke({ color:this.property('fill'), width:1 });
	};
	p.serialize=function(){
		var s=this.property('stroke');
		return '<g '+this.writeCommonAttrs()+'>'
			+ '<line x1="1" x2="'+this.labelShape.getTextWidth()+1+'" y1="5" y2="5" style="stroke:'+s.color+';stroke-weight:'+s.width+'" />'
			+ '<text style="fill:'+this.property('fill')+';" font-weight="bold" '
			+ 'x="0" y="0">'
			+ this.property('label')
			+ '</text>'
			+ '</g>';
	};

	ta.Annotation.register("Underline");
})();

}
