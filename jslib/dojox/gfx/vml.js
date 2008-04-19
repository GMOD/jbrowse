if(!dojo._hasResource["dojox.gfx.vml"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.gfx.vml"] = true;
dojo.provide("dojox.gfx.vml");

dojo.require("dojox.gfx._base");
dojo.require("dojox.gfx.shape");
dojo.require("dojox.gfx.path");
dojo.require("dojox.gfx.arc");

// dojox.gfx.vml.xmlns: String: a VML's namespace
dojox.gfx.vml.xmlns = "urn:schemas-microsoft-com:vml";

// dojox.gfx.vml.text_alignment: Object: mapping from SVG alignment to VML alignment
dojox.gfx.vml.text_alignment = {start: "left", middle: "center", end: "right"};

dojox.gfx.vml._parseFloat = function(str) {
	// summary: a helper function to parse VML-specific floating-point values
	// str: String: a representation of a floating-point number
	return str.match(/^\d+f$/i) ? parseInt(str) / 65536 : parseFloat(str);	// Number
};

dojox.gfx.vml._bool = {"t": 1, "true": 1};

dojo.extend(dojox.gfx.Shape, {
	// summary: VML-specific implementation of dojox.gfx.Shape methods

	setFill: function(fill){
		// summary: sets a fill object (VML)
		// fill: Object: a fill object
		//	(see dojox.gfx.defaultLinearGradient, 
		//	dojox.gfx.defaultRadialGradient, 
		//	dojox.gfx.defaultPattern, 
		//	or dojo.Color)

		if(!fill){
			// don't fill
			this.fillStyle = null;
			this.rawNode.filled = "f";
			return this;
		}
		if(typeof fill == "object" && "type" in fill){
			// gradient
			var i, f, fo, a, s;
			switch(fill.type){
				case "linear":
					var matrix = this._getRealMatrix(), m = dojox.gfx.matrix;
					s = [];
					f = dojox.gfx.makeParameters(dojox.gfx.defaultLinearGradient, fill);
					a = f.colors;
					this.fillStyle = f;
					dojo.forEach(a, function(v, i, a){
						a[i].color = dojox.gfx.normalizeColor(v.color);
					});
					if(a[0].offset > 0){
						s.push("0 " + a[0].color.toHex());
					}
					for(i = 0; i < a.length; ++i){
						s.push(a[i].offset.toFixed(8) + " " + a[i].color.toHex());
					}
					i = a.length - 1;
					if(a[i].offset < 1){
						s.push("1 " + a[i].color.toHex());
					}
					fo = this.rawNode.fill;
					fo.colors.value = s.join(";");
					fo.method = "sigma";
					fo.type = "gradient";
					var fc1 = matrix ? m.multiplyPoint(matrix, f.x1, f.y1) : {x: f.x1, y: f.y1},
						fc2 = matrix ? m.multiplyPoint(matrix, f.x2, f.y2) : {x: f.x2, y: f.y2};
					fo.angle = (m._radToDeg(Math.atan2(fc2.x - fc1.x, fc2.y - fc1.y)) + 180) % 360;
					fo.on = true;
					break;
				case "radial":
					f = dojox.gfx.makeParameters(dojox.gfx.defaultRadialGradient, fill);
					this.fillStyle = f;
					var l = parseFloat(this.rawNode.style.left),
						t = parseFloat(this.rawNode.style.top),
						w = parseFloat(this.rawNode.style.width),
						h = parseFloat(this.rawNode.style.height),
						c = isNaN(w) ? 1 : 2 * f.r / w;
					a = [];
					// add a color at the offset 0 (1 in VML coordinates)
					if(f.colors[0].offset > 0){
						a.push({offset: 1, color: dojox.gfx.normalizeColor(f.colors[0].color)});
					}
					// massage colors
					dojo.forEach(f.colors, function(v, i){
						a.push({offset: 1 - v.offset * c, color: dojox.gfx.normalizeColor(v.color)});
					});
					i = a.length - 1;
					while(i >= 0 && a[i].offset < 0){ --i; }
					if(i < a.length - 1){
						// correct excessive colors
						var q = a[i], p = a[i + 1];
						p.color = dojo.blendColors(q.color, p.color, q.offset / (q.offset - p.offset));
						p.offset = 0;
						while(a.length - i > 2) a.pop();
					}
					// set colors
					i = a.length - 1, s = [];
					if(a[i].offset > 0){
						s.push("0 " + a[i].color.toHex());
					}
					for(; i >= 0; --i){
						s.push(a[i].offset.toFixed(8) + " " + a[i].color.toHex());
					}
					fo = this.rawNode.fill;
					fo.colors.value = s.join(";");
					fo.method = "sigma";
					fo.type = "gradientradial";
					if(isNaN(w) || isNaN(h) || isNaN(l) || isNaN(t)){
						fo.focusposition = "0.5 0.5";
					}else{
						fo.focusposition = ((f.cx - l) / w).toFixed(8) + " " + ((f.cy - t) / h).toFixed(8);
					}
					fo.focussize = "0 0";
					fo.on = true;
					break;
				case "pattern":
					f = dojox.gfx.makeParameters(dojox.gfx.defaultPattern, fill);
					this.fillStyle = f;
					fo = this.rawNode.fill;
					fo.type = "tile";
					fo.src = f.src;
					if(f.width && f.height){
						// in points
						fo.size.x = dojox.gfx.px2pt(f.width);
						fo.size.y = dojox.gfx.px2pt(f.height);
					}
					fo.alignShape = "f";
					fo.position.x = 0;
					fo.position.y = 0;
					fo.origin.x = f.width  ? f.x / f.width  : 0;
					fo.origin.y = f.height ? f.y / f.height : 0;
					fo.on = true;
					break;
			}
			this.rawNode.fill.opacity = 1;
			return this;
		}
		// color object
		this.fillStyle = dojox.gfx.normalizeColor(fill);
		this.rawNode.fill.method = "any";
		this.rawNode.fill.type = "solid";
		this.rawNode.fillcolor = this.fillStyle.toHex();
		this.rawNode.fill.opacity = this.fillStyle.a;
		this.rawNode.filled = true;
		return this;	// self
	},

	setStroke: function(stroke){
		// summary: sets a stroke object (VML)
		// stroke: Object: a stroke object
		//	(see dojox.gfx.defaultStroke) 
	
		if(!stroke){
			// don't stroke
			this.strokeStyle = null;
			this.rawNode.stroked = "f";
			return this;
		}
		// normalize the stroke
		if(typeof stroke == "string"){
			stroke = {color: stroke};
		}
		var s = this.strokeStyle = dojox.gfx.makeParameters(dojox.gfx.defaultStroke, stroke);
		s.color = dojox.gfx.normalizeColor(s.color);
		// generate attributes
		var rn = this.rawNode;
		rn.stroked = true;
		rn.strokecolor = s.color.toCss();
		rn.strokeweight = s.width + "px";	// TODO: should we assume that the width is always in pixels?
		if(rn.stroke) {
			rn.stroke.opacity = s.color.a;
			rn.stroke.endcap = this._translate(this._capMap, s.cap);
			if(typeof s.join == "number") {
				rn.stroke.joinstyle = "miter";
				rn.stroke.miterlimit = s.join;
			}else{
				rn.stroke.joinstyle = s.join;
				// rn.stroke.miterlimit = s.width;
			}
			rn.stroke.dashstyle = s.style == "none" ? "Solid" : s.style;
		}
		return this;	// self
	},
	
	_capMap: { butt: 'flat' },
	_capMapReversed: { flat: 'butt' },
	
	_translate: function(dict, value) {
		return (value in dict) ? dict[value] : value;
	},
	
	_applyTransform: function() {
		if(this.fillStyle && this.fillStyle.type == "linear"){
			this.setFill(this.fillStyle);
		}
		var matrix = this._getRealMatrix();
		if(!matrix) return this;
		var skew = this.rawNode.skew;
		if(typeof skew == "undefined"){
			for(var i = 0; i < this.rawNode.childNodes.length; ++i){
				if(this.rawNode.childNodes[i].tagName == "skew"){
					skew = this.rawNode.childNodes[i];
					break;
				}
			}
		}
		if(skew){
			skew.on = "f";
			var mt = matrix.xx.toFixed(8) + " " + matrix.xy.toFixed(8) + " " + 
				matrix.yx.toFixed(8) + " " + matrix.yy.toFixed(8) + " 0 0",
				offset = Math.floor(matrix.dx).toFixed() + "px " + Math.floor(matrix.dy).toFixed() + "px",
				s = this.rawNode.style,
				l = parseFloat(s.left),
				t = parseFloat(s.top),
				w = parseFloat(s.width),
				h = parseFloat(s.height);
			if(isNaN(l)) l = 0;
			if(isNaN(t)) t = 0;
			if(isNaN(w)) w = 1;
			if(isNaN(h)) h = 1;
			var origin = (-l / w - 0.5).toFixed(8) + " " + (-t / h - 0.5).toFixed(8);
			skew.matrix =  mt;
			skew.origin = origin;
			skew.offset = offset;
			skew.on = true;
		}
		return this;
	},

	setRawNode: function(rawNode){
		// summary:
		//	assigns and clears the underlying node that will represent this
		//	shape. Once set, transforms, gradients, etc, can be applied.
		//	(no fill & stroke by default)
		rawNode.stroked = "f";
		rawNode.filled  = "f";
		this.rawNode = rawNode;
	},
	
	// move family

	_moveToFront: function(){
		// summary: moves a shape to front of its parent's list of shapes (VML)
		this.rawNode.parentNode.appendChild(this.rawNode);
		return this;
	},
	_moveToBack: function(){
		// summary: moves a shape to back of its parent's list of shapes (VML)
		var r = this.rawNode, p = r.parentNode, n = p.firstChild;
		p.insertBefore(r, n);
		if(n.tagName == "rect"){
			// surface has a background rectangle, which position should be preserved
			n.swapNode(r);
		}
		return this;
	},

	_getRealMatrix: function(){
		// summary: returns the cumulative ("real") transformation matrix
		//	by combining the shape's matrix with its parent's matrix
		return this.parentMatrix ? new dojox.gfx.Matrix2D([this.parentMatrix, this.matrix]) : this.matrix;	// dojox.gfx.Matrix2D
	}
});

dojo.declare("dojox.gfx.Group", dojox.gfx.Shape, {
	// summary: a group shape (VML), which can be used 
	//	to logically group shapes (e.g, to propagate matricies)
	constructor: function(){
		dojox.gfx.vml.Container._init.call(this);
	},
	// apply transformation
	_applyTransform: function(){
		// summary: applies a transformation matrix to a group
		var matrix = this._getRealMatrix();
		for(var i = 0; i < this.children.length; ++i){
			this.children[i]._updateParentMatrix(matrix);
		}
		return this;	// self
	}
});
dojox.gfx.Group.nodeType = "group";

dojo.declare("dojox.gfx.Rect", dojox.gfx.shape.Rect, {
	// summary: a rectangle shape (VML)
	setShape: function(newShape){
		// summary: sets a rectangle shape object (VML)
		// newShape: Object: a rectangle shape object
		var shape = this.shape = dojox.gfx.makeParameters(this.shape, newShape);
		this.bbox = null;
		var style = this.rawNode.style;
		style.left   = shape.x.toFixed();
		style.top    = shape.y.toFixed();
		style.width  = (typeof shape.width == "string" && shape.width.indexOf("%") >= 0)  ? shape.width  : shape.width.toFixed();
		style.height = (typeof shape.width == "string" && shape.height.indexOf("%") >= 0) ? shape.height : shape.height.toFixed();
		var r = Math.min(1, (shape.r / Math.min(parseFloat(shape.width), parseFloat(shape.height)))).toFixed(8);
		// a workaround for the VML's arcsize bug: cannot read arcsize of an instantiated node
		var parent = this.rawNode.parentNode, before = null;
		if(parent){
			if(parent.lastChild != this.rawNode){
				for(var i = 0; i < parent.childNodes.length; ++i){
					if(parent.childNodes[i] == this.rawNode){
						before = parent.childNodes[i+1];
						break;
					}
				}
			}
			parent.removeChild(this.rawNode);
		}
		this.rawNode.arcsize = r;
		if(parent){
			if(before){
				parent.insertBefore(this.rawNode, before);
			}else{
				parent.appendChild(this.rawNode);
			}
		}
		// set all necessary styles, which are lost by VML (yes, it's a VML's bug)
		return this.setTransform(this.matrix).setFill(this.fillStyle).setStroke(this.strokeStyle);	// self
	}
});
dojox.gfx.Rect.nodeType = "roundrect"; // use a roundrect so the stroke join type is respected

dojo.declare("dojox.gfx.Ellipse", dojox.gfx.shape.Ellipse, {
	// summary: an ellipse shape (VML)
	setShape: function(newShape){
		// summary: sets an ellipse shape object (VML)
		// newShape: Object: an ellipse shape object
		var shape = this.shape = dojox.gfx.makeParameters(this.shape, newShape);
		this.bbox = null;
		var style = this.rawNode.style;
		style.left   = (shape.cx - shape.rx).toFixed();
		style.top    = (shape.cy - shape.ry).toFixed();
		style.width  = (shape.rx * 2).toFixed();
		style.height = (shape.ry * 2).toFixed();
		return this.setTransform(this.matrix);	// self
	}
});
dojox.gfx.Ellipse.nodeType = "oval";

dojo.declare("dojox.gfx.Circle", dojox.gfx.shape.Circle, {
	// summary: a circle shape (VML)
	setShape: function(newShape){
		// summary: sets a circle shape object (VML)
		// newShape: Object: a circle shape object
		var shape = this.shape = dojox.gfx.makeParameters(this.shape, newShape);
		this.bbox = null;
		var style = this.rawNode.style;
		style.left   = (shape.cx - shape.r).toFixed();
		style.top    = (shape.cy - shape.r).toFixed();
		style.width  = (shape.r * 2).toFixed();
		style.height = (shape.r * 2).toFixed();
		return this;	// self
	}
});
dojox.gfx.Circle.nodeType = "oval";

dojo.declare("dojox.gfx.Line", dojox.gfx.shape.Line, {
	// summary: a line shape (VML)
	constructor: function(rawNode){
		if(rawNode) rawNode.setAttribute("dojoGfxType", "line");
	},
	setShape: function(newShape){
		// summary: sets a line shape object (VML)
		// newShape: Object: a line shape object
		var shape = this.shape = dojox.gfx.makeParameters(this.shape, newShape);
		this.bbox = null;
		this.rawNode.path.v = "m" + shape.x1.toFixed() + " " + shape.y1.toFixed() +
			"l" + shape.x2.toFixed() + " " + shape.y2.toFixed() + "e";
		return this.setTransform(this.matrix);	// self
	}
});
dojox.gfx.Line.nodeType = "shape";

dojo.declare("dojox.gfx.Polyline", dojox.gfx.shape.Polyline, {
	// summary: a polyline/polygon shape (VML)
	constructor: function(rawNode){
		if(rawNode) rawNode.setAttribute("dojoGfxType", "polyline");
	},
	setShape: function(points, closed){
		// summary: sets a polyline/polygon shape object (VML)
		// points: Object: a polyline/polygon shape object
		// closed: Boolean?: if true, close the polyline explicitely
		if(points && points instanceof Array){
			// branch
			// points: Array: an array of points
			this.shape = dojox.gfx.makeParameters(this.shape, { points: points });
			if(closed && this.shape.points.length) this.shape.points.push(this.shape.points[0]);
		}else{
			this.shape = dojox.gfx.makeParameters(this.shape, points);
		}
		this.bbox = null;
		var attr = [], p = this.shape.points;
		if(p.length > 0){
			attr.push("m");
			var k = 1;
			if(typeof p[0] == "number"){
				attr.push(p[0].toFixed());
				attr.push(p[1].toFixed());
				k = 2;
			}else{
				attr.push(p[0].x.toFixed());
				attr.push(p[0].y.toFixed());
			}
			if(p.length > k){
				attr.push("l");
				for(var i = k; i < p.length; ++i){
					if(typeof p[i] == "number"){
						attr.push(p[i].toFixed());
					}else{
						attr.push(p[i].x.toFixed());
						attr.push(p[i].y.toFixed());
					}
				}
			}
		}
		attr.push("e");
		this.rawNode.path.v = attr.join(" ");
		return this.setTransform(this.matrix);	// self
	}
});
dojox.gfx.Polyline.nodeType = "shape";

dojo.declare("dojox.gfx.Image", dojox.gfx.shape.Image, {
	// summary: an image (VML)
	constructor: function(rawNode){
		if(rawNode) rawNode.setAttribute("dojoGfxType", "image");
	},
	getEventSource: function() {
		// summary: returns a Node, which is used as 
		//	a source of events for this shape
		return this.rawNode ? this.rawNode.firstChild : null;	// Node
	},
	setShape: function(newShape){
		// summary: sets an image shape object (VML)
		// newShape: Object: an image shape object
		var shape = this.shape = dojox.gfx.makeParameters(this.shape, newShape);
		this.bbox = null;
		this.rawNode.firstChild.src = shape.src;
		return this.setTransform(this.matrix);	// self
	},
	_setDimensions: function(s, w, h){
		if(w || h){
			s.width  = w + "px";
			s.height = h + "px";
		}
	},
	_resetImage: function(){
		var s = this.rawNode.firstChild.style,
			shape = this.shape;
		s.left = "0px";
		s.top  = "0px";
		this._setDimensions(s, shape.width, shape.height);
	},
	_applyTransform: function() {
		var matrix = this._getRealMatrix(),
			img = this.rawNode.firstChild,
			s = img.style,
			shape = this.shape;
		if(matrix){
			matrix = dojox.gfx.matrix.multiply(matrix, {dx: shape.x, dy: shape.y});
		}else{
			matrix = dojox.gfx.matrix.normalize({dx: shape.x, dy: shape.y});
		}
		if(matrix.xy == 0 && matrix.yx == 0 && matrix.xx > 0 && matrix.yy > 0){
			// special case to avoid filters
			this.rawNode.style.filter = "";
			s.left = Math.floor(matrix.dx) + "px";
			s.top  = Math.floor(matrix.dy) + "px";
			this._setDimensions(s, Math.floor(matrix.xx * shape.width), Math.floor(matrix.yy * shape.height));
		}else{
			this._resetImage();
			var f = this.rawNode.filters["DXImageTransform.Microsoft.Matrix"];
			if(f){
				f.M11 = matrix.xx;
				f.M12 = matrix.xy;
				f.M21 = matrix.yx;
				f.M22 = matrix.yy;
				f.Dx = matrix.dx;
				f.Dy = matrix.dy;
			}else{
				this.rawNode.style.filter = "progid:DXImageTransform.Microsoft.Matrix(M11=" + matrix.xx + 
					", M12=" + matrix.xy + ", M21=" + matrix.yx + ", M22=" + matrix.yy + 
					", Dx=" + matrix.dx + ", Dy=" + matrix.dy + ")";
			}
		}
		return this;
	}
});
dojox.gfx.Image.nodeType = "div";

dojo.declare("dojox.gfx.Text", dojox.gfx.shape.Text, {
	// summary: an anchored text (VML)
	constructor: function(rawNode){
		if(rawNode){rawNode.setAttribute("dojoGfxType", "text");}
		this.fontStyle = null;
	},
	_alignment: {start: "left", middle: "center", end: "right"},
	setShape: function(newShape){
		// summary: sets a text shape object (VML)
		// newShape: Object: a text shape object
		this.shape = dojox.gfx.makeParameters(this.shape, newShape);
		this.bbox = null;
		var r = this.rawNode, s = this.shape, x = s.x, y = s.y.toFixed();
		switch(s.align){
			case "middle":
				x -= 5;
				break;
			case "end":
				x -= 10;
				break;
		}
		this.rawNode.path.v = "m" + x.toFixed() + "," + y + 
			"l" + (x + 10).toFixed() + "," + y + "e";
		// find path and text path
		var p = null, t = null, c = r.childNodes;
		for(var i = 0; i < c.length; ++i){
			var tag = c[i].tagName;
			if(tag == "path"){
				p = c[i];
				if(t) break;
			}else if(tag == "textpath"){
				t = c[i];
				if(p) break;
			}
		}
		if(!p){
			p = this.rawNode.ownerDocument.createElement("v:path");
			r.appendChild(p);
		}
		if(!t){
			t = this.rawNode.ownerDocument.createElement("v:textpath");
			r.appendChild(t);
		}
		p.textPathOk = true;
		t.on = true;
		var a = dojox.gfx.vml.text_alignment[s.align];
		t.style["v-text-align"] = a ? a : "left";
		t.style["text-decoration"] = s.decoration;
		t.style["v-rotate-letters"] = s.rotated;
		t.style["v-text-kern"] = s.kerning;
		t.string = s.text;
		return this.setTransform(this.matrix);	// self
	},
	_setFont: function(){
		// summary: sets a font object (VML)
		var f = this.fontStyle, c = this.rawNode.childNodes;
		for(var i = 0; i < c.length; ++i){
			if(c[i].tagName == "textpath"){
				c[i].style.font = dojox.gfx.makeFontString(f);
				break;
			}
		}
		this.setTransform(this.matrix);
	},
	_getRealMatrix: function(){
		// summary: returns the cumulative ("real") transformation matrix
		//	by combining the shape's matrix with its parent's matrix;
		//	it makes a correction for a font size
		var matrix = dojox.gfx.Shape.prototype._getRealMatrix.call(this);
		// It appears that text is always aligned vertically at a middle of x-height (???).
		// It is impossible to obtain these metrics from VML => I try to approximate it with 
		// more-or-less util value of 0.7 * FontSize, which is typical for European fonts.
		if(matrix){
			matrix = dojox.gfx.matrix.multiply(matrix, 
				{dy: -dojox.gfx.normalizedLength(this.fontStyle ? this.fontStyle.size : "10pt") * 0.35});
		}
		return matrix;	// dojox.gfx.Matrix2D
	},
	getTextWidth: function(){ 
		// summary: get the text width, in px 
		var rawNode = this.rawNode, _display = rawNode.style.display; 
		rawNode.style.display = "inline"; 
		var _width = dojox.gfx.pt2px(parseFloat(rawNode.currentStyle.width)); 
		rawNode.style.display = _display; 
		return _width; 
	} 
});
dojox.gfx.Text.nodeType = "shape";

dojox.gfx.path._calcArc = function(alpha){
	// return a start point, 1st and 2nd control points, and an end point
	var cosa  = Math.cos(alpha), sina  = Math.sin(alpha),
		p2 = {x: cosa + (4 / 3) * (1 - cosa), y: sina - (4 / 3) * cosa * (1 - cosa) / sina};
	return {
		s:  {x: cosa, y: -sina},
		c1: {x: p2.x, y: -p2.y},
		c2: p2,
		e:  {x: cosa, y: sina}
	};
};

dojo.declare("dojox.gfx.Path", dojox.gfx.path.Path, {
	// summary: a path shape (VML)
	constructor: function(rawNode){
		if(rawNode && !rawNode.getAttribute("dojoGfxType")){
			rawNode.setAttribute("dojoGfxType", "path");
		}
		this.vmlPath = "";
		this.lastControl = {};
	},
	_updateWithSegment: function(segment){
		// summary: updates the bounding box of path with new segment
		// segment: Object: a segment
		var last = dojo.clone(this.last);
		dojox.gfx.Path.superclass._updateWithSegment.apply(this, arguments);
		// add a VML path segment
		var path = this[this.renderers[segment.action]](segment, last);
		if(typeof this.vmlPath == "string"){
			this.vmlPath += path.join("");
			this.rawNode.path.v = this.vmlPath + " r0,0 e";
		}else{
			this.vmlPath = this.vmlPath.concat(path);
		}
	},
	setShape: function(newShape){
		// summary: forms a path using a shape (VML)
		// newShape: Object: an VML path string or a path object (see dojox.gfx.defaultPath)
		this.vmlPath = [];
		this.lastControl = {};
		dojox.gfx.Path.superclass.setShape.apply(this, arguments);
		this.vmlPath = this.vmlPath.join("");
		this.rawNode.path.v = this.vmlPath + " r0,0 e";
		return this;
	},
	_pathVmlToSvgMap: {m: "M", l: "L", t: "m", r: "l", c: "C", v: "c", qb: "Q", x: "z", e: ""},
	// VML-specific segment renderers
	renderers: {
		M: "_moveToA", m: "_moveToR", 
		L: "_lineToA", l: "_lineToR", 
		H: "_hLineToA", h: "_hLineToR", 
		V: "_vLineToA", v: "_vLineToR", 
		C: "_curveToA", c: "_curveToR", 
		S: "_smoothCurveToA", s: "_smoothCurveToR", 
		Q: "_qCurveToA", q: "_qCurveToR", 
		T: "_qSmoothCurveToA", t: "_qSmoothCurveToR", 
		A: "_arcTo", a: "_arcTo", 
		Z: "_closePath", z: "_closePath"
	},
	_addArgs: function(path, args, from, upto){
		if(typeof upto == "undefined"){
			upto = args.length;
		}
		if(typeof from == "undefined"){
			from = 0;
		}
		for(var i = from; i < upto; ++i){
			path.push(" ");
			path.push(args[i].toFixed());
		}
	},
	_addArgsAdjusted: function(path, last, args, from, upto){
		if(typeof upto == "undefined"){
			upto = args.length;
		}
		if(typeof from == "undefined"){
			from = 0;
		}
		for(var i = from; i < upto; i += 2){
			path.push(" ");
			path.push((last.x + args[i]).toFixed());
			path.push(" ");
			path.push((last.y + args[i + 1]).toFixed());
		}
	},
	_moveToA: function(segment){
		var p = [" m"], n = segment.args, l = n.length;
		if(l == 2){
			this._addArgs(p, n);
		}else{
			this._addArgs(p, n, 0, 2);
			p.push(" l");
			this._addArgs(p, n, 2);
		}
		this.lastControl = {};
		return p;
	},
	_moveToR: function(segment, last){
		var p = ["x" in last ? " t" : " m"], n = segment.args, l = n.length;
		if(l == 2){
			this._addArgs(p, n);
		}else{
			this._addArgs(p, n, 0, 2);
			p.push(" r");
			this._addArgs(p, n, 2);
		}
		this.lastControl = {};
		return p;
	},
	_lineToA: function(segment){
		var p = [" l"];
		this._addArgs(p, segment.args);
		this.lastControl = {};
		return p;
	},
	_lineToR: function(segment){
		var p = [" r"];
		this._addArgs(p, segment.args);
		this.lastControl = {};
		return p;
	},
	_hLineToA: function(segment, last){
		var p = [" l"], n = segment.args, l = n.length, y = " " + last.y.toFixed();
		for(var i = 0; i < l; ++i){
			p.push(" ");
			p.push(n[i].toFixed());
			p.push(y);
		}
		this.lastControl = {};
		return p;
	},
	_hLineToR: function(segment){
		var p = [" r"], n = segment.args, l = n.length;
		for(var i = 0; i < l; ++i){
			p.push(" ");
			p.push(n[i].toFixed());
			p.push(" 0");
		}
		this.lastControl = {};
		return p;
	},
	_vLineToA: function(segment, last){
		var p = [" l"], n = segment.args, l = n.length, x = " " + last.x.toFixed();
		for(var i = 0; i < l; ++i){
			p.push(x);
			p.push(" ");
			p.push(n[i].toFixed());
		}
		this.lastControl = {};
		return p;
	},
	_vLineToR: function(segment){
		var p = [" r"], n = segment.args, l = n.length;
		for(var i = 0; i < l; ++i){
			p.push(" 0 ");
			p.push(n[i].toFixed());
		}
		this.lastControl = {};
		return p;
	},
	_curveToA: function(segment){
		var p = [], n = segment.args, l = n.length;
		for(var i = 0; i < l; i += 6){
			p.push(" c");
			this._addArgs(p, n, i, i + 6);
		}
		this.lastControl = {x: n[l - 4], y: n[l - 3], type: "C"};
		return p;
	},
	_curveToR: function(segment, last){
		var p = [], n = segment.args, l = n.length;
		for(var i = 0; i < l; i += 6){
			p.push(" v");
			this._addArgs(p, n, i, i + 6);
			this.lastControl = {x: last.x + n[i + 2], y: last.y + n[i + 3]};
			last.x += n[i + 4];
			last.y += n[i + 5];
		}
		this.lastControl.type = "C";
		return p;
	},
	_smoothCurveToA: function(segment, last){
		var p = [], n = segment.args, l = n.length;
		for(var i = 0; i < l; i += 4){
			p.push(" c");
			if(this.lastControl.type == "C"){
				this._addArgs(p, [
					2 * last.x - this.lastControl.x, 
					2 * last.y - this.lastControl.y
				]);
			}else{
				this._addArgs(p, [last.x, last.y]);
			}
			this._addArgs(p, n, i, i + 4);
		}
		this.lastControl = {x: n[l - 4], y: n[l - 3], type: "C"};
		return p;
	},
	_smoothCurveToR: function(segment, last){
		var p = [], n = segment.args, l = n.length;
		for(var i = 0; i < l; i += 4){
			p.push(" v");
			if(this.lastControl.type == "C"){
				this._addArgs(p, [
					last.x - this.lastControl.x, 
					last.y - this.lastControl.y
				]);
			}else{
				this._addArgs(p, [0, 0]);
			}
			this._addArgs(p, n, i, i + 4);
			this.lastControl = {x: last.x + n[i], y: last.y + n[i + 1]};
			last.x += n[i + 2];
			last.y += n[i + 3];
		}
		this.lastControl.type = "C";
		return p;
	},
	_qCurveToA: function(segment){
		var p = [], n = segment.args, l = n.length;
		for(var i = 0; i < l; i += 4){
			p.push(" qb");
			this._addArgs(p, n, i, i + 4);
		}
		this.lastControl = {x: n[l - 4], y: n[l - 3], type: "Q"};
		return p;
	},
	_qCurveToR: function(segment, last){
		var p = [], n = segment.args, l = n.length;
		for(var i = 0; i < l; i += 4){
			p.push(" qb");
			this._addArgsAdjusted(p, last, n, i, i + 4);
			this.lastControl = {x: last.x + n[i], y: last.y + n[i + 1]};
			last.x += n[i + 2];
			last.y += n[i + 3];
		}
		this.lastControl.type = "Q";
		return p;
	},
	_qSmoothCurveToA: function(segment, last){
		var p = [], n = segment.args, l = n.length;
		for(var i = 0; i < l; i += 2){
			p.push(" qb");
			if(this.lastControl.type == "Q"){
				this._addArgs(p, [
					this.lastControl.x = 2 * last.x - this.lastControl.x, 
					this.lastControl.y = 2 * last.y - this.lastControl.y
				]);
			}else{
				this._addArgs(p, [
					this.lastControl.x = last.x, 
					this.lastControl.y = last.y
				]);
			}
			this._addArgs(p, n, i, i + 2);
		}
		this.lastControl.type = "Q";
		return p;
	},
	_qSmoothCurveToR: function(segment, last){
		var p = [], n = segment.args, l = n.length;
		for(var i = 0; i < l; i += 2){
			p.push(" qb");
			if(this.lastControl.type == "Q"){
				this._addArgs(p, [
					this.lastControl.x = 2 * last.x - this.lastControl.x, 
					this.lastControl.y = 2 * last.y - this.lastControl.y
				]);
			}else{
				this._addArgs(p, [
					this.lastControl.x = last.x, 
					this.lastControl.y = last.y
				]);
			}
			this._addArgsAdjusted(p, last, n, i, i + 2);
		}
		this.lastControl.type = "Q";
		return p;
	},
	_arcTo: function(segment, last){
		var p = [], n = segment.args, l = n.length, relative = segment.action == "a";
		for(var i = 0; i < l; i += 7){
			var x1 = n[i + 5], y1 = n[i + 6];
			if(relative){
				x1 += last.x;
				y1 += last.y;
			}
			var result = dojox.gfx.arc.arcAsBezier(
				last, n[i], n[i + 1], n[i + 2], 
				n[i + 3] ? 1 : 0, n[i + 4] ? 1 : 0,
				x1, y1
			);
			for(var j = 0; j < result.length; ++j){
				p.push(" c");
				this._addArgs(p, result[j]);
			}
			last = {x: x1, y: y1};
		}
		this.lastControl = {};
		return p;
	},
	_closePath: function(){
		this.lastControl = {};
		return ["x"];
	}
});
dojox.gfx.Path.nodeType = "shape";

dojo.declare("dojox.gfx.TextPath", dojox.gfx.Path, {
	// summary: a textpath shape (VML)
	constructor: function(rawNode){
		if(rawNode){rawNode.setAttribute("dojoGfxType", "textpath");}
		this.fontStyle = null;
		if(!("text" in this)){
			this.text = dojo.clone(dojox.gfx.defaultTextPath);
		}
		if(!("fontStyle" in this)){
			this.fontStyle = dojo.clone(dojox.gfx.defaultFont);
		}
	},
	setText: function(newText){
		// summary: sets a text to be drawn along the path
		this.text = dojox.gfx.makeParameters(this.text, 
			typeof newText == "string" ? {text: newText} : newText);
		this._setText();
		return this;	// self
	},
	setFont: function(newFont){
		// summary: sets a font for text
		this.fontStyle = typeof newFont == "string" ? 
			dojox.gfx.splitFontString(newFont) :
			dojox.gfx.makeParameters(dojox.gfx.defaultFont, newFont);
		this._setFont();
		return this;	// self
	},

	_setText: function(){
		// summary: sets a text shape object (VML)
		this.bbox = null;
		var r = this.rawNode, s = this.text,
			// find path and text path
			p = null, t = null, c = r.childNodes;
		for(var i = 0; i < c.length; ++i){
			var tag = c[i].tagName;
			if(tag == "path"){
				p = c[i];
				if(t) break;
			}else if(tag == "textpath"){
				t = c[i];
				if(p) break;
			}
		}
		if(!p){
			p = this.rawNode.ownerDocument.createElement("v:path");
			r.appendChild(p);
		}
		if(!t){
			t = this.rawNode.ownerDocument.createElement("v:textpath");
			r.appendChild(t);
		}
		p.textPathOk = true;
		t.on = true;
		var a = dojox.gfx.vml.text_alignment[s.align];
		t.style["v-text-align"] = a ? a : "left";
		t.style["text-decoration"] = s.decoration;
		t.style["v-rotate-letters"] = s.rotated;
		t.style["v-text-kern"] = s.kerning;
		t.string = s.text;
	},
	_setFont: function(){
		// summary: sets a font object (VML)
		var f = this.fontStyle, c = this.rawNode.childNodes;
		for(var i = 0; i < c.length; ++i){
			if(c[i].tagName == "textpath"){
				c[i].style.font = dojox.gfx.makeFontString(f);
				break;
			}
		}
	}
});
dojox.gfx.TextPath.nodeType = "shape";

dojo.declare("dojox.gfx.Surface", dojox.gfx.shape.Surface, {
	// summary: a surface object to be used for drawings (VML)
	constructor: function(){
		dojox.gfx.vml.Container._init.call(this);
	},
	setDimensions: function(width, height){
		// summary: sets the width and height of the rawNode
		// width: String: width of surface, e.g., "100px"
		// height: String: height of surface, e.g., "100px"
		this.width  = dojox.gfx.normalizedLength(width);	// in pixels
		this.height = dojox.gfx.normalizedLength(height);	// in pixels
		if(!this.rawNode) return this;
		var cs = this.clipNode.style, 
			r = this.rawNode, rs = r.style,
			bs = this.bgNode.style;
		cs.width  = width;
		cs.height = height;
		cs.clip = "rect(0 " + width + " " + height + " 0)";
		rs.width = width;
		rs.height = height;
		r.coordsize = width + " " + height;
		bs.width = width;
		bs.height = height;
		return this;	// self
	},
	getDimensions: function(){
		// summary: returns an object with properties "width" and "height"
		var t = this.rawNode ? {
			width:  dojox.gfx.normalizedLength(this.rawNode.style.width), 
			height: dojox.gfx.normalizedLength(this.rawNode.style.height)} : null;
		if(t.width  <= 0){ t.width  = this.width; }
		if(t.height <= 0){ t.height = this.height; }
		return t;	// Object
	}
});

dojox.gfx.createSurface = function(parentNode, width, height){
	// summary: creates a surface (VML)
	// parentNode: Node: a parent node
	// width: String: width of surface, e.g., "100px"
	// height: String: height of surface, e.g., "100px"

	if(!width){ width = "100%"; }
	if(!height){ height = "100%"; }
	var s = new dojox.gfx.Surface(), p = dojo.byId(parentNode),
		c = s.clipNode = p.ownerDocument.createElement("div"),
		r = s.rawNode = p.ownerDocument.createElement("v:group"),
		cs = c.style, rs = r.style;
		
	p.style.width  = width;
	p.style.height = height;
		
	cs.position = "absolute";
	cs.width  = width;
	cs.height = height;
	cs.clip = "rect(0 " + width + " " + height + " 0)";
	rs.position = "absolute";
	rs.width  = width;
	rs.height = height;
	r.coordsize = (width == "100%" ? width : parseFloat(width)) + " " +
		(height == "100%" ? height : parseFloat(height));
	r.coordorigin = "0 0";
	
	// create a background rectangle, which is required to show all other shapes
	var b = s.bgNode = r.ownerDocument.createElement("v:rect"), bs = b.style;
	bs.left = bs.top = 0;
	bs.width  = rs.width;
	bs.height = rs.height;
	b.filled = b.stroked = "f";

	r.appendChild(b);
	c.appendChild(r);
	p.appendChild(c);
	
	s.width  = dojox.gfx.normalizedLength(width);	// in pixels
	s.height = dojox.gfx.normalizedLength(height);	// in pixels

	return s;	// dojox.gfx.Surface
};

// Extenders

dojox.gfx.vml.Container = {
	_init: function(){
		dojox.gfx.shape.Container._init.call(this);
	},
	add: function(shape){
		// summary: adds a shape to a group/surface
		// shape: dojox.gfx.Shape: an VML shape object
		if(this != shape.getParent()){
			this.rawNode.appendChild(shape.rawNode);
			//dojox.gfx.Group.superclass.add.apply(this, arguments);
			//this.inherited(arguments);
			dojox.gfx.shape.Container.add.apply(this, arguments);
		}
		return this;	// self
	},
	remove: function(shape, silently){
		// summary: remove a shape from a group/surface
		// shape: dojox.gfx.Shape: an VML shape object
		// silently: Boolean?: if true, regenerate a picture
		if(this == shape.getParent()){
			if(this.rawNode == shape.rawNode.parentNode){
				this.rawNode.removeChild(shape.rawNode);
			}
			//dojox.gfx.Group.superclass.remove.apply(this, arguments);
			//this.inherited(arguments);
			dojox.gfx.shape.Container.remove.apply(this, arguments);
		}
		return this;	// self
	},
	clear: function(){
		// summary: removes all shapes from a group/surface
		var r = this.rawNode;
		while(r.firstChild != r.lastChild){
			if(r.firstChild != this.bgNode){
				r.removeChild(r.firstChild);
			}
			if(r.lastChild != this.bgNode){
				r.removeChild(r.lastChild);
			}
		}
		//return this.inherited(arguments);	// self
		return dojox.gfx.shape.Container.clear.apply(this, arguments);
	},
	_moveChildToFront: dojox.gfx.shape.Container._moveChildToFront,
	_moveChildToBack:  dojox.gfx.shape.Container._moveChildToBack
};

dojo.mixin(dojox.gfx.shape.Creator, {
	// summary: VML shape creators
	createGroup: function(){
		// summary: creates a VML group shape
		var g = this.createObject(dojox.gfx.Group, null);	// dojox.gfx.Group
		// create a background rectangle, which is required to show all other shapes
		var r = g.rawNode.ownerDocument.createElement("v:rect");
		r.style.left = r.style.top = 0;
		r.style.width  = g.rawNode.style.width;
		r.style.height = g.rawNode.style.height;
		r.filled = r.stroked = "f";
		g.rawNode.appendChild(r);
		g.bgNode = r;
		return g;	// dojox.gfx.Group
	},
	createImage: function(image){
		// summary: creates a VML image shape
		// image: Object: an image object (see dojox.gfx.defaultImage)
		if(!this.rawNode) return null;
		var shape = new dojox.gfx.Image(), node = this.rawNode.ownerDocument.createElement('div');
		node.style.position = "absolute";
		node.style.width  = this.rawNode.style.width;
		node.style.height = this.rawNode.style.height;
		//node.style.filter = "progid:DXImageTransform.Microsoft.Matrix(M11=1, M12=0, M21=0, M22=1, Dx=0, Dy=0)";
		var img  = this.rawNode.ownerDocument.createElement('img');
		img.style.position = "relative";
		node.appendChild(img);
		shape.setRawNode(node);
		this.rawNode.appendChild(node);
		shape.setShape(image);
		this.add(shape);
		return shape;	// dojox.gfx.Image
	},
	createObject: function(shapeType, rawShape) {
		// summary: creates an instance of the passed shapeType class
		// shapeType: Function: a class constructor to create an instance of
		// rawShape: Object: properties to be passed in to the classes "setShape" method
		// overrideSize: Boolean: set the size explicitly, if true
		if(!this.rawNode) return null;
		var shape = new shapeType(),
			node = this.rawNode.ownerDocument.createElement('v:' + shapeType.nodeType);
		shape.setRawNode(node);
		this.rawNode.appendChild(node);
		switch(shapeType){
			case dojox.gfx.Group:
			case dojox.gfx.Line:
			case dojox.gfx.Polyline:
			case dojox.gfx.Text:
			case dojox.gfx.Path:
			case dojox.gfx.TextPath:
				this._overrideSize(node);
		}
		shape.setShape(rawShape);
		this.add(shape);
		return shape;	// dojox.gfx.Shape
	},
	_overrideSize: function(node){
		var p = this;
		while(p && !(p instanceof dojox.gfx.Surface)){ p = p.parent; }
		node.style.width  = p.width;
		node.style.height = p.height;
		node.coordsize = p.width + " " + p.height;
	}
});

dojo.extend(dojox.gfx.Group, dojox.gfx.vml.Container);
dojo.extend(dojox.gfx.Group, dojox.gfx.shape.Creator);

dojo.extend(dojox.gfx.Surface, dojox.gfx.vml.Container);
dojo.extend(dojox.gfx.Surface, dojox.gfx.shape.Creator);

}
