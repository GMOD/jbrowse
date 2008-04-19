if(!dojo._hasResource["dojox.dtl.tag.misc"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.tag.misc"] = true;
dojo.provide("dojox.dtl.tag.misc");
dojo.require("dojox.dtl._base");

(function(){
	var dd = dojox.dtl;
	var ddtm = dd.tag.misc;

	ddtm.DebugNode = dojo.extend(function(TextNode){
		this._TextNode = TextNode;
	},
	{
		render: function(context, buffer){
			var keys = context.getKeys();
			var debug = "";
			for(var i = 0, key; key = keys[i]; i++){
				console.debug("DEBUG", key, ":", context[key]);
				debug += key + ": " + dojo.toJson(context[key]) + "\n\n";
			}
			return new this._TextNode(debug).render(context, buffer, this);
		},
		unrender: function(context, buffer){
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this._TextNode);
		},
		toString: function(){ return "ddtm.DebugNode"; }
	});

	ddtm.FilterNode = dojo.extend(function(varnode, nodelist){
		this._varnode = varnode;
		this._nodelist = nodelist;
	},
	{
		render: function(context, buffer){
			// Doing this in HTML requires a different buffer with a fake root node
			var output = this._nodelist.render(context, new dojox.string.Builder());
			context.update({ "var": output.toString() });
			var filtered = this._varnode.render(context, buffer);
			context.pop();
			return buffer;
		},
		unrender: function(context, buffer){
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this._expression, this._nodelist.clone(buffer));
		}
	});

	ddtm.FirstOfNode = dojo.extend(function(vars, TextNode){
		this._vars = vars;
		this.vars = dojo.map(vars, function(item){
			return new dojox.dtl._Filter(item);
		});
		this.contents = new TextNode("");
	},
	{
		render: function(context, buffer){
			for(var i = 0, item; item = this.vars[i]; i++){
				var resolved = item.resolve(context);
				if(typeof resolved != "undefined"){
					if(resolved === null){
						resolved = "null";
					}
					this.contents.set(resolved);
					return this.contents.render(context, buffer);
				}
			}
			return this.contents.unrender(context, buffer);
		},
		unrender: function(context, buffer){
			return this.contents.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this._vars, this.contents.constructor);
		}
	});

	ddtm.SpacelessNode = dojo.extend(function(nodelist, TextNode){
		this.nodelist = nodelist;
		this.TextNode = TextNode;
	},
	{
		render: function(context, buffer){
			if(buffer.onAddNodeComplete){
				// Unfortunately, we have to branch here
				var watch = [
					dojo.connect(buffer, "onAddNodeComplete", this, "_watch"),
					dojo.connect(buffer, "onSetParent", this, "_watchParent")
				];
				buffer = this.nodelist.render(context, buffer);
				dojo.disconnect(watch[0]);
				dojo.disconnect(watch[1]);
			}else{
				if(!this.contents){
					this.contents = new this.TextNode("");
				}
				var value = this.nodelist.dummyRender(context);
				this.contents.set(value.replace(/>\s+</g, '><'));
				buffer = this.contents.render(context, buffer);
			}
			return buffer;
		},
		unrender: function(context, buffer){
			return this.nodelist.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.nodelist.clone(buffer));
		},
		_isEmpty: function(node){
			return (node.nodeType == 3 && !node.data.match(/[^\s\n]/));
		},
		_watch: function(node){
			if(this._isEmpty(node)){
				var remove = false;
				if(node.parentNode.firstChild == node){
					node.parentNode.removeChild(node);
				}
			}else{
				var children = node.parentNode.childNodes;
				if(node.nodeType == 1 && children.length > 2){
					for(var i = 2, child; child = children[i]; i++){
						if(children[i - 2].nodeType == 1 && this._isEmpty(children[i - 1])){
							node.parentNode.removeChild(children[i - 1]);
							return;
						}
					}
				}
			}
		},
		_watchParent: function(node){
			var children = node.childNodes;
			if(children.length){
				while(node.childNodes.length){
					var last = node.childNodes[node.childNodes.length - 1];
					if(!this._isEmpty(last)){
						return;
					}
					node.removeChild(last);
				}
			}
		}
	});

	ddtm.TemplateTagNode = dojo.extend(function(tag, TextNode){
		this.tag = tag;
		this.contents = new TextNode("");
	},
	{
		mapping: {
			openblock: "{%",
			closeblock: "%}",
			openvariable: "{{",
			closevariable: "}}",
			openbrace: "{",
			closebrace: "}",
			opencomment: "{#",
			closecomment: "#}"
		},
		render: function(context, buffer){
			this.contents.set(this.mapping[this.tag]);
			return this.contents.render(context, buffer);
		},
		unrender: function(context, buffer){
			return this.contents.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.tag, this.contents.constructor);
		}
	});

	ddtm.WidthRatioNode = dojo.extend(function(current, max, width, TextNode){
		this.current = new dd._Filter(current);
		this.max = new dd._Filter(max);
		this.width = width;
		this.contents = new TextNode("");
	},
	{
		render: function(context, buffer){
			var current = +this.current.resolve(context);
			var max = +this.max.resolve(context);
			if(typeof current != "number" || typeof max != "number" || !max){
				this.contents.set("");
			}else{
				this.contents.set("" + Math.round((current / max) * this.width));
			}
			return this.contents.render(context, buffer);
		},
		unrender: function(context, buffer){
			return this.contents.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.current.getExpression(), this.max.getExpression(), this.width, this.contents.constructor);
		}
	});

	ddtm.WithNode = dojo.extend(function(target, alias, nodelist){
		this.target = new dd._Filter(target);
		this.alias = alias;
		this.nodelist = nodelist;
	},
	{
		render: function(context, buffer){
			var target = this.target.resolve(context);
			context.push();
			context[this.alias] = target;
			buffer = this.nodelist.render(context, buffer);
			context.pop();
			return buffer;
		},
		unrender: function(context, buffer){
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this.target.getExpression(), this.alias, this.nodelist.clone(buffer));
		}
	});

	dojo.mixin(ddtm, {
		comment: function(parser, text){
			// summary: Ignore everything between {% comment %} and {% endcomment %}
			parser.skipPast("endcomment");
			return dd._noOpNode;
		},
		debug: function(parser, text){
			// summary: Output the current context, maybe add more stuff later.
			return new ddtm.DebugNode(parser.getTextNodeConstructor());
		},
		filter: function(parser, text){
			// summary: Filter the contents of the blog through variable filters.
			var parts = text.split(" ", 2);
			var varnode = new (parser.getVarNodeConstructor())("var|" + parts[1]);
			var nodelist = parser.parse(["endfilter"]);
			parser.next();
			return new ddtm.FilterNode(varnode, nodelist);
		},
		firstof: function(parser, text){
			var parts = dojox.dtl.text.pySplit(text).slice(1);
			if(!parts.length){
				throw new Error("'firstof' statement requires at least one argument");
			}
			return new ddtm.FirstOfNode(parts, parser.getTextNodeConstructor());
		},
		spaceless: function(parser, text){
			var nodelist = parser.parse(["endspaceless"]);
			parser.next();
			return new ddtm.SpacelessNode(nodelist, parser.getTextNodeConstructor());
		},
		templatetag: function(parser, text){
			var parts = dd.text.pySplit(text);
			if(parts.length != 2){
				throw new Error("'templatetag' statement takes one argument");
			}
			var tag = parts[1];
			var mapping = ddtm.TemplateTagNode.prototype.mapping;
			if(!mapping[tag]){
				var keys = [];
				for(var key in mapping){
					keys.push(key);
				}
				throw new Error("Invalid templatetag argument: '" + tag + "'. Must be one of: " + keys.join(", "));
			}
			return new ddtm.TemplateTagNode(tag, parser.getTextNodeConstructor());
		},
		widthratio: function(parser, text){
			var parts = dd.text.pySplit(text);
			if(parts.length != 4){
				throw new Error("widthratio takes three arguments");
			}
			var width = +parts[3];
			if(typeof width != "number"){
				throw new Error("widthratio final argument must be an integer");
			}
			return new ddtm.WidthRatioNode(parts[1], parts[2], width, parser.getTextNodeConstructor());
		},
		with_: function(parser, text){
			var parts = dd.text.pySplit(text);
			if(parts.length != 4 || parts[2] != "as"){
				throw new Error("do_width expected format as 'with value as name'");
			}
			var nodelist = parser.parse(["endwith"]);
			parser.next();
			return new ddtm.WithNode(parts[1], parts[3], nodelist);
		}
	});
})();

}
