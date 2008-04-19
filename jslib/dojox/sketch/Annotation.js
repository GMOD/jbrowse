if(!dojo._hasResource["dojox.sketch.Annotation"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.sketch.Annotation"] = true;
dojo.provide("dojox.sketch.Annotation");
dojo.require("dojox.sketch.Anchor");
dojo.require("dojox.sketch._Plugin");

(function(){
	var ta=dojox.sketch;
	dojo.declare("dojox.sketch.AnnotationTool", ta._Plugin, {
//		constructor: function(){
////			console.log('this.shape',this.shape);
////			this.annotation=ta.tools[this.shape];
//		},
		onMouseMove: function(e,rect){
				if(this._cshape){ 
					this._cshape.setShape(rect);
				} else {
					this._cshape=this.figure.surface.createRect(rect)
						.setStroke({color:"#999", width:1, style:"ShortDot"})
						.setFill([255,255,255,0.7]);
					this._cshape.getEventSource().setAttribute("shape-rendering","crispEdges");
				}
		},
		onMouseUp: function(e){
			var f=this.figure;
			if(!(f._startPoint.x==e.pageX&&f._startPoint.y==e.pageY)){
				if(this._cshape){
					//	The minimum number of pixels one has to travel before a shape
					//		gets drawn.
					var limit=40;
					if(Math.max(
						limit, 
						Math.abs(f._absEnd.x-f._start.x), 
						Math.abs(f._absEnd.y-f._start.y)
					)>limit){
						this._create(f._start, f._end);
					}
				}
			}
			if(this._cshape) f.surface.remove(this._cshape);
		},
		_create: function(start,end){
			//	create a new shape, needs to be accessible from the
			//		dragging functions.
			var f=this.figure;
			var _=f.nextKey();
			var a=new (this.annotation)(f, "annotation-"+_);
			a.transform={dx:start.x/f.zoomFactor, dy:start.y/f.zoomFactor};
			a.end={ x:end.x/f.zoomFactor, y:end.y/f.zoomFactor };
			if(a.control){
				a.control={ x:Math.round((end.x/2)/f.zoomFactor),y:Math.round((end.y/2)/f.zoomFactor) };
			}
			f.onBeforeCreateShape(a);
			a.initialize();
			f.select(a);
			f.onCreateShape(a);
			f.history.add(ta.CommandTypes.Create,a);
		}
	});
	ta.Annotation=function(figure, id){
		//	for editing stuff.
		this.id=this._key=id;
		this.figure=figure;
		this.mode=ta.Annotation.Modes.View;
		this.shape=null;	// dojox.gfx.Group
		this.boundingBox=null;	// rect for boundaries
		this.hasAnchors=true;
		this.anchors={};	//	ta.Anchor
		this._properties={
			'stroke':{ color:"blue", width:2 },
			'fill': "blue",
			'label': ""
		};

		if(this.figure) this.figure.add(this);
	};
	var p=ta.Annotation.prototype;
	p.constructor=ta.Annotation;
	p.type=function(){ return ''; };
	p.getType=function(){ return ta.Annotation; };

	p.remove=function(){
		this.figure.history.add(ta.CommandTypes.Delete, this, this.serialize());
	};
	p.property=function(name,/*?*/value){
		var r;
		name=name.toLowerCase();
		if(this._properties[name]!==undefined){
			r=this._properties[name];
		}
		if(arguments.length>1){
			this._properties[name]=value;
		}
		if(r!=value){
			this.onPropertyChange(name,r);
		}
		return r;
	};
	p.onPropertyChange=function(name,oldvalue){};
	p.onCreate=function(){
		this.figure.history.add(ta.CommandTypes.Create,this);
	}
	p.onDblClick=function(event){
		var l=prompt('Set new text:',this.property('label'));
		if(l!==false){
			this.beginEdit(ta.CommandTypes.Modify);
			this.property('label',l);
			this.draw();
			this.endEdit();
		}
	}
	p.initialize=function(){ };
	p.destroy=function(){ };
	p.draw=function(){ };
	p.apply=function(obj){ };
	p.serialize=function(){ };
	p.getBBox=function(){ };
	p.beginEdit=function(type){
		this._type=type||ta.CommandTypes.Move;
		this._prevState=this.serialize();
	};
	p.endEdit=function(){
		var newstep=true;
		if(this._type==ta.CommandTypes.Move){
			var f=this.figure;
			if(f._absEnd.x==f._start.x&&f._absEnd.y==f._start.y){
				newstep=false;
			}
		}
		if(newstep){
			this.figure.history.add(this._type,this,this._prevState);
		}
		this._type=this._prevState='';
	};
	p.calculate={
		slope:function(p1, p2){
			if(!(p1.x-p2.x)) return 0;
			return ((p1.y-p2.y)/(p1.x-p2.x));
		},
		dx:function(p1, p2, dy){
			var s=this.slope(p1,p2);
			if(s==0) return s;
			return dy/s; 
		},
		dy:function(p1, p2, dx){ return this.slope(p1,p2)*dx; }
	};
	p.drawBBox=function(){
		var r=this.getBBox();
		if(!this.boundingBox){
			this.boundingBox=this.shape.createRect(r)
				.moveToBack()
				.setStroke({color:"#999", width:1, style:"Dash"})
				.setFill([238,238,238,0.3]);
			this.boundingBox.getEventSource().setAttribute("id",this.id+"-boundingBox");
			this.boundingBox.getEventSource().setAttribute("shape-rendering","crispEdges");
			this.figure._add(this);
		} else this.boundingBox.setShape(r);
	};
	p.setBinding=function(pt){
		this.transform.dx+=pt.dx;
		this.transform.dy+=pt.dy;
		this.draw();
	};
	p.doChange=function(pt){ };
	p.getTextBox=function(){
		return dojox.gfx._base._getTextBox(this.property('label'),ta.Annotation.labelFont);
	};
	p.setMode=function(m){
		if(this.mode==m) return;
		this.mode=m;
		var method="disable";
		if(m==ta.Annotation.Modes.Edit) method="enable";
		if(method=="enable"){
			//	draw the bounding box
			this.drawBBox();
			this.figure._add(this);
		} else {
			if(this.boundingBox){
				if(this.shape) this.shape.remove(this.boundingBox);
				this.boundingBox=null;
			}
		}
		for(var p in this.anchors){ this.anchors[p][method](); }
	};
//	p.writeProperties=function(){
//		var ps=this._properties;
//		return "<!CDATA[properties:"+dojo.toJson(ps)+"]]>";
//	};
	p.writeCommonAttrs=function(){
		return 'id="' + this.id + '" dojoxsketch:type="' + this.type() + '"'
			+ ' transform="translate('+ this.transform.dx + "," + this.transform.dy + ')"'
			+ (this.data?(' ><![CDATA[data:'+dojo.toJson(this.data)+']]'):'');
	};
	p.readCommonAttrs=function(obj){
		var i=0,cs=obj.childNodes,c;
		while((c=cs[i++])){
			if(c.nodeType==4){ //CDATA
				if(c.nodeValue.substr(0,11)=='properties:'){
					this._properties=dojo.fromJson(c.nodeValue.substr(11));
				}else if(c.nodeValue.substr(0,5)=='data:'){
					this.data=dojo.fromJson(c.nodeValue.substr(5));
				}else{
					console.error('unknown CDATA node in node ',obj);
				}
			}
		}

		if(obj.getAttribute('transform')){
			var t=obj.getAttribute('transform').replace("translate(","");
			var pt=t.split(",");
			this.transform.dx=parseFloat(pt[0],10);
			this.transform.dy=parseFloat(pt[1],10);
		}
	};
	ta.Annotation.Modes={ View:0, Edit:1 };
	ta.Annotation.labelFont={family:"Arial", size:"16px", weight:"bold"};
	ta.Annotation.register=function(name){
		var cls=ta[name+'Annotation'];
		ta.registerTool(name, function(p){dojo.mixin(p,{shape: name,annotation:cls});return new ta.AnnotationTool(p)});
	};
})();

}
