if(!dojo._hasResource["dojox.gfx.utils"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.gfx.utils"] = true;
dojo.provide("dojox.gfx.utils");

dojo.require("dojox.gfx");

dojox.gfx.utils.serialize = function(
	/* dojox.gfx.Surface || dojox.gfx.Shape */ object
){
	var t = {}, v, isSurface = object instanceof dojox.gfx.Surface;	
	if(isSurface || object instanceof dojox.gfx.Group){
		t.children = [];		
		for(var i = 0; i < object.children.length; ++i){		
			t.children.push(dojox.gfx.utils.serialize(object.children[i]));			
		}		
		if(isSurface){
			return t.children;	// Array			
		}		
	}else{	
		t.shape = object.getShape();		
	}	
	if(object.getTransform){	
		v = object.getTransform();		
		if(v){ t.transform = v; }		
	}	
	if(object.getStroke){	
		v = object.getStroke();		
		if(v){ t.stroke = v; }		
	}	
	if(object.getFill){	
		v = object.getFill();		
		if(v){ t.fill = v; }		
	}	
	if(object.getFont){	
		v = object.getFont();		 
		if(v){ t.font = v; }		
	}	
	return t;	// Object	
};

dojox.gfx.utils.toJson = function(
	/* dojox.gfx.Surface || dojox.gfx.Shape */ object, 
	/* Boolean? */ prettyPrint
){
	return dojo.toJson(dojox.gfx.utils.serialize(object), prettyPrint);	// String
};

dojox.gfx.utils.deserialize = function(
	/* dojox.gfx.Surface || dojox.gfx.Shape */ parent, 
	/* dojox.gfx.Shape || Array */ object
){
	if(object instanceof Array){
		var t = [];
		for(var i = 0; i < object.length; ++i){
			t.push(dojox.gfx.utils.deserialize(parent, object[i]));
		}
		return t;	// Array
	}
	var shape = ("shape" in object) ? parent.createShape(object.shape) : parent.createGroup();
	if("transform" in object){
		shape.setTransform(object.transform);
	}
	if("stroke" in object){
		shape.setStroke(object.stroke);
	}
	if("fill" in object){
		shape.setFill(object.fill);
	}
	if("font" in object){
		shape.setFont(object.font);
	}
	if("children" in object){
		for(var i = 0; i < object.children.length; ++i){
			dojox.gfx.utils.deserialize(shape, object.children[i]);
		}
	}
	return shape;	// dojox.gfx.Shape
};

dojox.gfx.utils.fromJson = function(
	/* dojox.gfx.Surface || dojox.gfx.Shape */ parent, 
	/* String */ json
){
	return dojox.gfx.utils.deserialize(parent, dojo.fromJson(json));	// Array || dojox.gfx.Shape
};

}
