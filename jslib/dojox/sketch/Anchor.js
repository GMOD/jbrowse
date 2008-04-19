if(!dojo._hasResource["dojox.sketch.Anchor"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.sketch.Anchor"] = true;
dojo.provide("dojox.sketch.Anchor");
dojo.require("dojox.gfx");

(function(){
	var ta=dojox.sketch;
	ta.Anchor=function(an, id, isControl){
		var self=this;
		var size=4;	//	.5 * size of anchor.
		var rect=null;

		this.type=function(){ return "Anchor"; };
		this.annotation=an;

		this.id=id;
		this._key="anchor-" + ta.Anchor.count++;
		this.shape=null;
		this.isControl=(isControl!=null)?isControl:true;

		this.beginEdit=function(){
			this.annotation.beginEdit(ta.CommandTypes.Modify);
		};
		this.endEdit=function(){
			this.annotation.endEdit();
		};
		this.doChange=function(pt){
			if(this.isControl) this.shape.applyTransform(pt);
			else{
				an.transform.dx+=pt.dx;
				an.transform.dy+=pt.dy;
			}
		};
		this.setBinding=function(pt){
			an[id]={ x: an[id].x+pt.dx, y:an[id].y+pt.dy };
			an.draw();
			an.drawBBox();
		};
		this.setUndo=function(){ an.setUndo(); };

		this.enable=function(){
			if(!an.shape) return;
			an.figure._add(this);
			rect={ x:an[id].x-size, y:an[id].y-size, width:size*2, height:size*2 };
			this.shape=an.shape.createRect(rect)
				.setStroke({ color:"black", width:1 })
				.setFill([255,255,255,0.35]);
			this.shape.getEventSource().setAttribute("id", self._key);
			this.shape.getEventSource().setAttribute("shape-rendering", "crispEdges");
		};
		this.disable=function(){
			an.figure._remove(this);
			if(an.shape) an.shape.remove(this.shape);
			this.shape=null;
			rect=null;
		};
	};
	ta.Anchor.count=0;
})();

}
