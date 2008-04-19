if(!dojo._hasResource["dojox.dtl.tag.loader"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.tag.loader"] = true;
dojo.provide("dojox.dtl.tag.loader");

dojo.require("dojox.dtl._base");

(function(){
	var dd = dojox.dtl;
	var ddtl = dd.tag.loader;

	ddtl.BlockNode = dojo.extend(function(name, nodelist){
		this.name = name;
		this.nodelist = nodelist; // Can be overridden
	},
	{
		render: function(context, buffer){
			var name = this.name;
			var nodelist = this.nodelist;
			if(buffer.blocks){
				var block = buffer.blocks[name];
				if(block){
					nodelist = block.nodelist;
					block.used = true;
				}
			}
			this.rendered = nodelist;
			return nodelist.render(context, buffer, this);
		},
		unrender: function(context, buffer){
			return this.rendered.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.name, this.nodelist.clone(buffer));
		},
		setOverride: function(nodelist){
			// summary: In a shared parent, we override, not overwrite
			if(!this.override){
				this.override = nodelist;
			}
		},
		toString: function(){ return "dojox.dtl.tag.loader.BlockNode"; }
	});

	ddtl.ExtendsNode = dojo.extend(function(getTemplate, nodelist, shared, parent, key){
		this.getTemplate = getTemplate;
		this.nodelist = nodelist;
		this.shared = shared;
		this.parent = parent;
		this.key = key;
	},
	{
		parents: {},
		getParent: function(context){
			if(!this.parent){
				this.parent = context.get(this.key, false);
				if(!this.parent){
					throw new Error("extends tag used a variable that did not resolve");
				}
				if(typeof this.parent == "object"){
					if(this.parent.url){
						if(this.parent.shared){
							this.shared = true;
						}
						this.parent = this.parent.url.toString();
					}else{
						this.parent = this.parent.toString();
					}
				}
				if(this.parent && this.parent.indexOf("shared:") == 0){
					this.shared = true;
					this.parent = this.parent.substring(7, parent.length);
				}
			}
			var parent = this.parent;
			if(!parent){
				throw new Error("Invalid template name in 'extends' tag.");
			}
			if(parent.render){
				return parent;
			}
			if(this.parents[parent]){
				return this.parents[parent];
			}
			this.parent = this.getTemplate(dojox.dtl.text.getTemplateString(parent));
			if(this.shared){
				this.parents[parent] = this.parent;
			}
			return this.parent;
		},
		render: function(context, buffer){
			var parent = this.getParent(context);

			buffer.blocks = buffer.blocks || {};

			// The parent won't always be in the default parent's nodelist
			for(var i = 0, node; node = this.nodelist.contents[i]; i++){
				if(node instanceof dojox.dtl.tag.loader.BlockNode){
					buffer.blocks[node.name] = {
						shared: this.shared,
						nodelist: node.nodelist,
						used: false
					}
				}
			}

			this.rendered = parent;
			buffer = parent.nodelist.render(context, buffer, this);

			var rerender = false;
			for(var name in buffer.blocks){
				var block = buffer.blocks[name];
				if(!block.used){
					rerender = true;
					parent.nodelist[0].nodelist.append(block.nodelist);
				}
			}

			if(rerender){
				buffer = parent.nodelist.render(context, buffer, this);
			}

			return buffer;
		},
		unrender: function(context, buffer){
			return this.rendered.unrender(context, buffer, this);
		},
		toString: function(){ return "dojox.dtl.block.ExtendsNode"; }
	});

	ddtl.IncludeNode = dojo.extend(function(path, constant, getTemplate, TextNode, parsed){
		this._path = path;
		this.constant = constant;
		this.path = (constant) ? path : new dd._Filter(path);
		this.getTemplate = getTemplate;
		this.TextNode = TextNode;
		this.parsed = (arguments.length == 5) ? parsed : true;
	},
	{
		_cache: [{}, {}],
		render: function(context, buffer){
			var location = ((this.constant) ? this.path : this.path.resolve(context)).toString();
			var parsed = Number(this.parsed);
			var dirty = false;
			if(location != this.last){
				dirty = true;
				if(this.last){
					buffer = this.unrender(context, buffer);
				}
				this.last = location;
			}

			var cache = this._cache[parsed];

			if(parsed){
				if(!cache[location]){
					cache[location] = dd.text._resolveTemplateArg(location, true);
				}
				if(dirty){
					var template = this.getTemplate(cache[location]);
					this.rendered = template.nodelist;
				}
				return this.rendered.render(context, buffer, this);
			}else{
				if(this.TextNode == dd._TextNode){
					if(dirty){
						this.rendered = new this.TextNode("");
						this.rendered.set(dd.text._resolveTemplateArg(location, true));
					}
					return this.rendered.render(context, buffer);
				}else{
					if(!cache[location]){
						var nodelist = [];
						var div = document.createElement("div");
						div.innerHTML = dd.text._resolveTemplateArg(location, true);
						var children = div.childNodes;
						while(children.length){
							var removed = div.removeChild(children[0]);
							nodelist.push(removed);
						}
						cache[location] = nodelist;
					}
					if(dirty){
						this.nodelist = [];
						var exists = true;
						for(var i = 0, child; child = cache[location][i]; i++){
							this.nodelist.push(child.cloneNode(true));
						}
					}
					for(var i = 0, node; node = this.nodelist[i]; i++){
						buffer = buffer.concat(node);
					}
				}
			}
			return buffer;
		},
		unrender: function(context, buffer){
			if(this.rendered){
				buffer = this.rendered.unrender(context, buffer);
			}
			if(this.nodelist){
				for(var i = 0, node; node = this.nodelist[i]; i++){
					buffer = buffer.remove(node);
				}
			}
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this._path, this.constant, this.getTemplate, this.TextNode, this.parsed);
		}
	});

	dojo.mixin(ddtl, {
		block: function(parser, text){
			var parts = text.split(" ");
			var name = parts[1];

			parser._blocks = parser._blocks || {};
			parser._blocks[name] = parser._blocks[name] || [];
			parser._blocks[name].push(name);

			var nodelist = parser.parse(["endblock", "endblock " + name]);
			parser.next();
			return new dojox.dtl.tag.loader.BlockNode(name, nodelist);
		},
		extends_: function(parser, text){
			var parts = text.split(" ");
			var shared = false;
			var parent = null;
			var key = null;
			if(parts[1].charAt(0) == '"' || parts[1].charAt(0) == "'"){
				parent = parts[1].substring(1, parts[1].length - 1);
			}else{
				key = parts[1];
			}
			if(parent && parent.indexOf("shared:") == 0){
				shared = true;
				parent = parent.substring(7, parent.length);
			}
			var nodelist = parser.parse();
			return new dojox.dtl.tag.loader.ExtendsNode(parser.getTemplate, nodelist, shared, parent, key);
		},
		include: function(parser, token){
			var parts = dd.text.pySplit(token);
			if(parts.length != 2){
				throw new Error(parts[0] + " tag takes one argument: the name of the template to be included");
			}
			var path = parts[1];
			var constant = false;
			if((path.charAt(0) == '"' || path.slice(-1) == "'") && path.charAt(0) == path.slice(-1)){
				path = path.slice(1, -1);
				constant = true;
			}
			return new ddtl.IncludeNode(path, constant, parser.getTemplate, parser.getTextNodeConstructor());
		},
		ssi: function(parser, token){
			// We're going to treat things a little differently here.
			// First of all, this tag is *not* portable, so I'm not
			// concerned about it being a "drop in" replacement.

			// Instead, we'll just replicate the include tag, but with that
			// optional "parsed" parameter.
			var parts = dd.text.pySplit(token);
			var parsed = false;
			if(parts.length == 3){
				parsed = (parts.pop() == "parsed");
				if(!parsed){
					throw new Error("Second (optional) argument to ssi tag must be 'parsed'");
				}
			}
			var node = ddtl.include(parser, parts.join(" "));
			node.parsed = parsed;
			return node;
		}
	});
})();

}
