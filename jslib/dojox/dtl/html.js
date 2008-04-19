if(!dojo._hasResource["dojox.dtl.html"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.html"] = true;
dojo.provide("dojox.dtl.html");

dojo.require("dojox.dtl._base");
dojo.require("dojox.dtl.Context");

(function(){
	var dd = dojox.dtl;

	var ddt = dd.text;
	var ddh = dd.html = {
		types: dojo.mixin({change: -11, attr: -12, custom: -13, elem: 1, text: 3}, ddt.types),
		_attributes: {},
		_re4: /^function anonymous\(\)\s*{\s*(.*)\s*}$/,
		getTemplate: function(text){
			if(typeof this._commentable == "undefined"){
				// Check to see if the browser can handle comments
				this._commentable = false;
				var div = document.createElement("div");
				div.innerHTML = "<!--Test comment handling, and long comments, using comments whenever possible.-->";
				if(div.childNodes.length && div.childNodes[0].nodeType == 8 && div.childNodes[0].data == "comment"){
					this._commentable = true;
				}
			}

			if(!this._commentable){
				// Strip comments
				text = text.replace(/<!--({({|%).*?(%|})})-->/g, "$1");
			}

			var match;
			var pairs = [
				[true, "select", "option"],
				[dojo.isSafari, "tr", "th"],
				[dojo.isSafari, "tr", "td"],
				[dojo.isSafari, "thead", "tr", "th"],
				[dojo.isSafari, "tbody", "tr", "td"]
			];
			// Some tags can't contain text. So we wrap the text in tags that they can have.
			for(var i = 0, pair; pair = pairs[i]; i++){
				if(!pair[0]){
					continue;
				}
				if(text.indexOf("<" + pair[1]) != -1){
					var selectRe = new RegExp("<" + pair[1] + "[\\s\\S]*?>([\\s\\S]+?)</" + pair[1] + ">", "ig");
					while(match = selectRe.exec(text)){
						// Do it like this to make sure we don't double-wrap
						var found = false;
						var tokens = dojox.string.tokenize(match[1], new RegExp("(<" + pair[2] + "[\\s\\S]*?>[\\s\\S]*?</" + pair[2] + ">)", "ig"), function(child){ found = true; return {data: child}; });
						if(found){
							var replace = [];
							for(var j = 0; j < tokens.length; j++) {
								if(dojo.isObject(tokens[j])){
									replace.push(tokens[j].data);
								}else{
									var close = pair[pair.length - 1];
									var k, replacement = "";
									for(k = 2; k < pair.length - 1; k++){
										replacement += "<" + pair[k] + ">";
									}
									replacement += "<" + close + ' iscomment="true">' + dojo.trim(tokens[j]) + "</" + close + ">";
									for(k = 2; k < pair.length - 1; k++){
										replacement += "</" + pair[k] + ">";
									}
									replace.push(replacement);
								}
							}
							text = text.replace(match[1], replace.join(""));
						}
					}
				}
			}

			var re = /\b([a-zA-Z]+)=['"]/g;
			while(match = re.exec(text)){
				this._attributes[match[1].toLowerCase()] = true;
			}
			var div = document.createElement("div");
			div.innerHTML = text;
			var output = {nodes: []};
			while(div.childNodes.length){
				output.nodes.push(div.removeChild(div.childNodes[0]))
			}

			return output;
		},
		tokenize: function(/*Node*/ nodes){
			var tokens = [];

			for(var i = 0, node; node = nodes[i++];){
				if(node.nodeType != 1){
					this.__tokenize(node, tokens);
				}else{
					this._tokenize(node, tokens);
				}
			}

			return tokens;
		},
		_swallowed: [],
		_tokenize: function(/*Node*/ node, /*Array*/ tokens){
			var types = this.types;
			var first = false;
			var swallowed = this._swallowed;
			var i, j, tag, child;

			if(!tokens.first){
				// Try to efficiently associate tags that use an attribute to
				// remove the node from DOM (eg dojoType) so that we can efficiently
				// locate them later in the tokenizing.
				first = tokens.first = true;
				var tags = dd.register.getAttributeTags();
				for(i = 0; tag = tags[i]; i++){
					try{
						(tag[2])({ swallowNode: function(){ throw 1; }}, "");
					}catch(e){
						swallowed.push(tag);
					}
				}
			}


			for(i = 0; tag = swallowed[i]; i++){
				var text = node.getAttribute(tag[0]);
				if(text){
					var swallowed = false;
					var custom = (tag[2])({ swallowNode: function(){ swallowed = true; return node; }}, text);
					if(swallowed){
						if(node.parentNode && node.parentNode.removeChild){
							node.parentNode.removeChild(node);
						}
						tokens.push([types.custom, custom]);
						return;
					}
				}
			}

			var children = [];
			if(dojo.isIE && node.tagName == "SCRIPT"){
				children.push({
					nodeType: 3,
					data: node.text
				});
				node.text = "";
			}else{
				for(i = 0; child = node.childNodes[i]; i++){
					children.push(child);
				}
			}

			tokens.push([types.elem, node]);

			var change = false;
			if(children.length){
				// Only do a change request if we need to
				tokens.push([types.change, node]);
				change = true;
			}

			for(var key in this._attributes){
				var value = "";
				if(key == "class"){
					value = node.className || value;
				}else if(key == "for"){
					value = node.htmlFor || value;
				}else if(key == "value" && node.value == node.innerHTML){
					// Sometimes .value is set the same as the contents of the item (button)
					continue;
				}else if(node.getAttribute){
					value = node.getAttribute(key, 2) || value;
					if(key == "href" || key == "src"){
						if(dojo.isIE){
							var hash = location.href.lastIndexOf(location.hash);
							var href = location.href.substring(0, hash).split("/");
							href.pop();
							href = href.join("/") + "/";
							if(value.indexOf(href) == 0){
								value = value.replace(href, "");
							}
							value = decodeURIComponent(value);
						}
						if(value.indexOf("{%") != -1 || value.indexOf("{{") != -1){
							node.setAttribute(key, "");
						}
					}
				}
				if(typeof value == "function"){
					value = value.toString().replace(this._re4, "$1");
				}

				if(!change){
					// Only do a change request if we need to
					tokens.push([types.change, node]);
					change = true;
				}
				// We'll have to resolve attributes during parsing
				tokens.push([types.attr, node, key, value]);
			}

			for(i = 0, child; child = children[i]; i++){
				if(child.nodeType == 1 && child.getAttribute("iscomment")){
					child.parentNode.removeChild(child);
					child = {
						nodeType: 8,
						data: child.innerHTML
					};
				}
				this.__tokenize(child, tokens);
			}

			if(!first && node.parentNode && node.parentNode.tagName){
				if(change){
					tokens.push([types.change, node, true]);
				}
				tokens.push([types.change, node.parentNode]);
				node.parentNode.removeChild(node);
			}else{
				// If this node is parentless, it's a base node, so we have to "up" change to itself
				// and note that it's a top-level to watch for errors
				tokens.push([types.change, node, true, true]);
			}
		},
		__tokenize: function(child, tokens){
			var types = this.types;
			var data = child.data;
			switch(child.nodeType){
				case 1:
					this._tokenize(child, tokens);
					return;
				case 3:
					if(data.match(/[^\s\n]/) && (data.indexOf("{{") != -1 || data.indexOf("{%") != -1)){
						var texts = ddt.tokenize(data);
						for(var j = 0, text; text = texts[j]; j++){
							if(typeof text == "string"){
								tokens.push([types.text, text]);
							}else{
								tokens.push(text);
							}
						}
					}else{
						tokens.push([child.nodeType, child]);
					}
					if(child.parentNode) child.parentNode.removeChild(child);
					return;
				case 8:
					if(data.indexOf("{%") == 0){
						var text = dojo.trim(data.slice(2, -2));
						if(text.substr(0, 5) == "load "){
							var parts = dd.text.pySplit(dojo.trim(text));
							for(var i = 1, part; part = parts[i]; i++){
								dojo["require"](part);
							}
						}
						tokens.push([types.tag, text]);
					}
					if(data.indexOf("{{") == 0){
						tokens.push([types.varr, dojo.trim(data.slice(2, -2))]);
					}
					if(child.parentNode) child.parentNode.removeChild(child);
					return;
			}
		}
	};

	dd.HtmlTemplate = dojo.extend(function(/*String|DOMNode|dojo._Url*/ obj){
		// summary: Use this object for HTML templating
		if(!obj.nodes){
			var node = dojo.byId(obj);
			if(node){
				dojo.forEach(["class", "src", "href", "name", "value"], function(item){
					ddh._attributes[item] = true;
				});
				obj = {
					nodes: [node]
				};
			}else{
				if(typeof obj == "object"){
					obj = ddt.getTemplateString(obj);
				}
				obj = ddh.getTemplate(obj);
			}
		}

		var tokens = ddh.tokenize(obj.nodes);
		if(dd.tests){
			this.tokens = tokens.slice(0);
		}

		var parser = new dd._HtmlParser(tokens);
		this.nodelist = parser.parse();
	},
	{
		_count: 0,
		_re: /\bdojo:([a-zA-Z0-9_]+)\b/g,
		setClass: function(str){
			this.getRootNode().className = str;
		},
		getRootNode: function(){
			return this.rootNode;
		},
		getBuffer: function(){
			return new dd.HtmlBuffer();
		},
		render: function(context, buffer){
			buffer = buffer || this.getBuffer();
			this.rootNode = null;
			var output = this.nodelist.render(context || new dd.Context({}), buffer);
			this.rootNode = buffer.getRootNode();
			for(var i = 0, node; node = buffer._cache[i]; i++){
				if(node._cache){
					node._cache.length = 0;
				}
			}
			return output;
		},
		unrender: function(context, buffer){
			return this.nodelist.unrender(context, buffer);
		}
	});

	dd.HtmlBuffer = dojo.extend(function(/*Node*/ parent){
		// summary: Allows the manipulation of DOM
		// description:
		//		Use this to append a child, change the parent, or
		//		change the attribute of the current node.
		this._parent = parent;
		this._cache = [];
	},
	{
		concat: function(/*DOMNode*/ node){
			var parent = this._parent;
			if(node.parentNode && node.parentNode.tagName && parent && !parent._dirty){
				return this;
			}

			if(node.nodeType == 1 && !this.rootNode){
				this.rootNode = node || true;
			}

			if(!parent){
				if(node.nodeType == 3 && dojo.trim(node.data)){
					throw new Error("Text should not exist outside of the root node in template");
				}
				return this;
			}
			if(this._closed && (node.nodeType != 3 || dojo.trim(node.data))){
				throw new Error("Content should not exist outside of the root node in template");
			}
			if(parent._dirty){
				if(node._drawn && node.parentNode == parent){
					var caches = parent._cache;
					if(caches){
						for(var i = 0, cache; cache = caches[i]; i++){
							this.onAddNode(cache);
							parent.insertBefore(cache, node);
							this.onAddNodeComplete(cache);
						}
						caches.length = 0;
					}
				}
				parent._dirty = false;
			}
			if(!parent._cache){
				parent._cache = [];
				this._cache.push(parent);
			}
			parent._dirty = true;
			parent._cache.push(node);
			return this;
		},
		remove: function(obj){
			if(typeof obj == "string"){
				if(this._parent){
					this._parent.removeAttribute(obj);
				}
			}else{
				if(obj.nodeType == 1 && !this.getRootNode() && !this._removed){
					this._removed = true;
					return this;
				}
				if(obj.parentNode){
					this.onRemoveNode();
					if(obj.parentNode){
						obj.parentNode.removeChild(obj);
					}
				}
			}
			return this;
		},
		setAttribute: function(key, value){
			if(key == "class"){
				this._parent.className = value;
			}else if(key == "for"){
				this._parent.htmlFor = value;
			}else if(this._parent.setAttribute){
				this._parent.setAttribute(key, value);
			}
			return this;
		},
		addEvent: function(context, type, fn, /*Array|Function*/ args){
			if(!context.getThis()){ throw new Error("You must use Context.setObject(instance)"); }
			this.onAddEvent(this.getParent(), type, fn);
			var resolved = fn;
			if(dojo.isArray(args)){
				resolved = function(e){
					this[fn].apply(this, [e].concat(args));
				}
			}
			return dojo.connect(this.getParent(), type, context.getThis(), resolved);
		},
		setParent: function(node, /*Boolean?*/ up, /*Boolean?*/ root){
			if(!this._parent) this._parent = this._first = node;

			if(up && root && node === this._first){
				this._closed = true;
			}

			if(up){
				var parent = this._parent;
				var script = "";
				var ie = dojo.isIE && parent.tagName == "SCRIPT";
				if(ie){
					parent.text = "";
				}
				if(parent._dirty){
					var caches = parent._cache;
					for(var i = 0, cache; cache = caches[i]; i++){
						if(cache !== parent){
							this.onAddNode(cache);
							if(ie){
								script += cache.data;
							}else{
								parent.appendChild(cache);
							}
							this.onAddNodeComplete(cache);
						}
					}
					caches.length = 0;
					parent._dirty = false;
				}
				if(ie){
					parent.text = script;
				}
			}

			this.onSetParent(node, up);
			this._parent = node;
			return this;
		},
		getParent: function(){
			return this._parent;
		},
		getRootNode: function(){
			return this.rootNode;
		},
		onSetParent: function(node, up){
			// summary: Stub called when setParent is used.
		},
		onAddNode: function(node){
			// summary: Stub called before new nodes are added
		},
		onAddNodeComplete: function(node){
			// summary: Stub called after new nodes are added
		},
		onRemoveNode: function(node){
			// summary: Stub called when nodes are removed
		},
		onClone: function(/*DOMNode*/ from, /*DOMNode*/ to){
			// summary: Stub called when a node is duplicated
		},
		onAddEvent: function(/*DOMNode*/ node, /*String*/ type, /*String*/ description){
			// summary: Stub to call when you're adding an event
		}
	});

	dd._HtmlNode = dojo.extend(function(node){
		// summary: Places a node into DOM
		this.contents = node;
	},
	{
		render: function(context, buffer){
			this._rendered = true;
			return buffer.concat(this.contents);
		},
		unrender: function(context, buffer){
			if(!this._rendered){
				return buffer;
			}
			this._rendered = false;
			return buffer.remove(this.contents);
		},
		clone: function(buffer){
			return new this.constructor(this.contents);
		}
	});

	dd._HtmlNodeList = dojo.extend(function(/*Node[]*/ nodes){
		// summary: A list of any HTML-specific node object
		// description:
		//		Any object that's used in the constructor or added
		//		through the push function much implement the
		//		render, unrender, and clone functions.
		this.contents = nodes || [];
	},
	{
		push: function(node){
			this.contents.push(node);
		},
		unshift: function(node){
			this.contents.unshift(node);
		},
		render: function(context, buffer, /*Node*/ instance){
			buffer = buffer || dd.HtmlTemplate.prototype.getBuffer();

			if(instance){
				var parent = buffer.getParent();
			}
			for(var i = 0; i < this.contents.length; i++){
				buffer = this.contents[i].render(context, buffer);
				if(!buffer) throw new Error("Template node render functions must return their buffer");
			}
			if(parent){
				buffer.setParent(parent);
			}
			return buffer;
		},
		dummyRender: function(context, buffer, asNode){
			// summary: A really expensive way of checking to see how a rendering will look.
			//		Used in the ifchanged tag
			var div = document.createElement("div");

			var parent = buffer.getParent();
			var old = parent._clone;
			// Tell the clone system to attach itself to our new div
			parent._clone = div;
			var nodelist = this.clone(buffer, div);
			if(old){
				// Restore state if there was a previous clone
				parent._clone = old;
			}else{
				// Remove if there was no clone
				parent._clone = null;
			}

			buffer = dd.HtmlTemplate.prototype.getBuffer();
			nodelist.unshift(new dd.ChangeNode(div));
			nodelist.push(new dd.ChangeNode(div, true));
			nodelist.render(context, buffer);

			if(asNode){
				return buffer.getRootNode();
			}

			var html = div.innerHTML;
			return (dojo.isIE) ? html.replace(/\s*_(dirty|clone)="[^"]*"/g, "") : html;
		},
		unrender: function(context, buffer){
			for(var i = 0; i < this.contents.length; i++){
				buffer = this.contents[i].unrender(context, buffer);
				if(!buffer) throw new Error("Template node render functions must return their buffer");
			}
			return buffer;
		},
		clone: function(buffer){
			// summary:
			//		Used to create an identical copy of a NodeList, useful for things like the for tag.
			var parent = buffer.getParent();
			var contents = this.contents;
			var nodelist = new dd._HtmlNodeList();
			var cloned = [];
			for(var i = 0; i < contents.length; i++){
				var clone = contents[i].clone(buffer);
				if(clone instanceof dd.ChangeNode || clone instanceof dd._HtmlNode){
					var item = clone.contents._clone;
					if(item){
						clone.contents = item;
					}else if(parent != clone.contents && clone instanceof dd._HtmlNode){
						var node = clone.contents;
						clone.contents = clone.contents.cloneNode(false);
						buffer.onClone(node, clone.contents);
						cloned.push(node);
						node._clone = clone.contents;
					}
				}
				nodelist.push(clone);
			}

			for(var i = 0, clone; clone = cloned[i]; i++){
				clone._clone = null;
			}

			return nodelist;
		}
	});

	dd._HtmlVarNode = dojo.extend(function(str){
		// summary: A node to be processed as a variable
		// description:
		//		Will render an object that supports the render function
		// 		and the getRootNode function
		this.contents = new dd._Filter(str);
		this._lists = {};
	},
	{
		render: function(context, buffer){
			this._rendered = true;

			var str = this.contents.resolve(context);
			if(str && str.render && str.getRootNode){
				var root = this._curr = str.getRootNode();
				var lists = this._lists;
				var list = lists[root];
				if(!list){
					list = lists[root] = new dd._HtmlNodeList();
					list.push(new dd.ChangeNode(buffer.getParent()));
					list.push(new dd._HtmlNode(root));
					list.push(str);
					list.push(new dd.ChangeNode(buffer.getParent()));
				}
				return list.render(context, buffer);
			}else{
				if(!this._txt){
					this._txt = document.createTextNode(str);
				}
				this._txt.data = str;
				return buffer.concat(this._txt);
			}
		},
		unrender: function(context, buffer){
			if(!this._rendered){
				return buffer;
			}
			this._rendered = false;
			if(this._curr){
				return this._lists[this._curr].unrender(context, buffer);
			}else if(this._txt){
				return buffer.remove(this._txt);
			}
			return buffer;
		},
		clone: function(){
			return new this.constructor(this.contents.getExpression());
		}
	});

	dd.ChangeNode = dojo.extend(function(node, /*Boolean?*/ up, /*Bookean*/ root){
		// summary: Changes the parent during render/unrender
		this.contents = node;
		this.up = up;
		this.root = root;
	},
	{
		render: function(context, buffer){
			return buffer.setParent(this.contents, this.up, this.root);
		},
		unrender: function(context, buffer){
			if(!this.contents.parentNode){
				return buffer;
			}
			if(!buffer.getParent()){
				return buffer;
			}
			return buffer.setParent(this.contents);
		},
		clone: function(){
			return new this.constructor(this.contents, this.up, this.root);
		}
	});

	dd.AttributeNode = dojo.extend(function(key, value, nodelist){
		// summary: Works on attributes
		this.key = key;
		this.value = value;
		this.nodelist = nodelist || (new dd.Template(value)).nodelist;

		this.contents = "";
	},
	{
		render: function(context, buffer){
			var key = this.key;
			var value = this.nodelist.dummyRender(context);
			if(this._rendered){
				if(value != this.contents){
					this.contents = value;
					return buffer.setAttribute(key, value);
				}
			}else{
				this._rendered = true;
				this.contents = value;
				return buffer.setAttribute(key, value);
			}
			return buffer;
		},
		unrender: function(context, buffer){
			return buffer.remove(this.key);
		},
		clone: function(buffer){
			return new this.constructor(this.key, this.value, this.nodelist.clone(buffer));
		}
	});

	dd._HtmlTextNode = dojo.extend(function(str){
		// summary: Adds a straight text node without any processing
		this.contents = document.createTextNode(str);
	},
	{
		set: function(data){
			this.contents.data = data;
		},
		render: function(context, buffer){
			return buffer.concat(this.contents);
		},
		unrender: function(context, buffer){
			return buffer.remove(this.contents);
		},
		clone: function(){
			return new this.constructor(this.contents.data);
		}
	});

	dd._HtmlParser = dojo.extend(function(tokens){
		// summary: Turn a simple array into a set of objects
		// description:
		//	This is also used by all tags to move through
		//	the list of nodes.
		this.contents = tokens;
	},
	{
		i: 0,
		parse: function(/*Array?*/ stop_at){
			var types = ddh.types;
			var terminators = {};
			var tokens = this.contents;
			if(!stop_at){
				stop_at = [];
			}
			for(var i = 0; i < stop_at.length; i++){
				terminators[stop_at[i]] = true;
			}
			var nodelist = new dd._HtmlNodeList();
			while(this.i < tokens.length){
				var token = tokens[this.i++];
				var type = token[0];
				var value = token[1];
				if(type == types.custom){
					nodelist.push(value);
				}else if(type == types.change){
					var changeNode = new dd.ChangeNode(value, token[2], token[3]);
					value[changeNode.attr] = changeNode;
					nodelist.push(changeNode);
				}else if(type == types.attr){
					var fn = ddt.getTag("attr:" + token[2], true);
					if(fn && token[3]){
						nodelist.push(fn(null, token[2] + " " + token[3]));
					}else if(dojo.isString(token[3]) && (token[3].indexOf("{%") != -1 || token[3].indexOf("{{") != -1)){
						nodelist.push(new dd.AttributeNode(token[2], token[3]));
					}
				}else if(type == types.elem){
					var fn = ddt.getTag("node:" + value.tagName.toLowerCase(), true);
					if(fn){
						// TODO: We need to move this to tokenization so that it's before the
						// 				node and the parser can be passed here instead of null
						nodelist.push(fn(null, value, value.tagName.toLowerCase()));
					}
					nodelist.push(new dd._HtmlNode(value));
				}else if(type == types.varr){
					nodelist.push(new dd._HtmlVarNode(value));
				}else if(type == types.text){
					nodelist.push(new dd._HtmlTextNode(value.data || value));
				}else if(type == types.tag){
					if(terminators[value]){
						--this.i;
						return nodelist;
					}
					var cmd = value.split(/\s+/g);
					if(cmd.length){
						cmd = cmd[0];
						var fn = ddt.getTag(cmd);
						if(typeof fn != "function"){
							throw new Error("Function not found for " + cmd);
						}
						var tpl = fn(this, value);
						if(tpl){
							nodelist.push(tpl);
						}
					}
				}
			}

			if(stop_at.length){
				throw new Error("Could not find closing tag(s): " + stop_at.toString());
			}

			return nodelist;
		},
		next: function(){
			// summary: Used by tags to discover what token was found
			var token = this.contents[this.i++];
			return {type: token[0], text: token[1]};
		},
		skipPast: function(endtag){
			return dd.Parser.prototype.skipPast.call(this, endtag);
		},
		getVarNodeConstructor: function(){
			return dd._HtmlVarNode;
		},
		getTextNodeConstructor: function(){
			return dd._HtmlTextNode;
		},
		getTemplate: function(/*String*/ loc){
			return new dd.HtmlTemplate(ddh.getTemplate(loc));
		}
	});

})();

}
