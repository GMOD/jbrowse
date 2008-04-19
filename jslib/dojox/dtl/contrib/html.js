if(!dojo._hasResource["dojox.dtl.contrib.html"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.contrib.html"] = true;
dojo.provide("dojox.dtl.contrib.html");

dojo.require("dojox.dtl.html");

(function(){
	var dd = dojox.dtl;
	var ddch = dd.contrib.html;

	ddch.HtmlNode = dojo.extend(function(name){
		this.contents = new dd._Filter(name);
		this._div = document.createElement("div");
		this._lasts = [];
	},
	{
		render: function(context, buffer){
			var text = this.contents.resolve(context);
			if(text){
				text = text.replace(/<(\/?script)/ig, '&lt;$1').replace(/\bon[a-z]+\s*=/ig, '');
				if(this._rendered && this._last != text){
					buffer = this.unrender(context, buffer);
				}
				this._last = text;

				// This can get reset in the above tag
				if(!this._rendered){
					this._rendered = true;
					var div = this._div;
					div.innerHTML = text;
					var children = div.childNodes;
					while(children.length){
						var removed = div.removeChild(children[0]);
						this._lasts.push(removed);
						buffer = buffer.concat(removed);
					}
				}
			}

			return buffer;
		},
		unrender: function(context, buffer){
			if(this._rendered){
				this._rendered = false;
				this._last = "";
				for(var i = 0, node; node = this._lasts[i++];){
					buffer = buffer.remove(node);
					dojo._destroyElement(node);
				}
				this._lasts = [];
			}
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this.contents.getExpression());
		}
	});

	ddch.StyleNode = dojo.extend(function(styles){
		this.contents = {};
		this._styles = styles;
		for(var key in styles){
			this.contents[key] = new dd.Template(styles[key]);
		}
	},
	{
		render: function(context, buffer){
			for(var key in this.contents){
				dojo.style(buffer.getParent(), key, this.contents[key].render(context));
			}
			return buffer;
		},
		unrender: function(context, buffer){
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this._styles);
		}
	});

	dojo.mixin(ddch, {
		html: function(parser, text){
			var parts = text.split(" ", 2);
			return new ddch.HtmlNode(parts[1]);
		},
		tstyle: function(parser, text){
			var styles = {};
			text = text.replace(/^tstyle\s+/, "");
			var rules = text.split(/\s*;\s*/g);
			for(var i = 0, rule; rule = rules[i]; i++){
				var parts = rule.split(/\s*:\s*/g);
				var key = parts[0];
				var value = parts[1];
				if(value.indexOf("{{") == 0){
					styles[key] = value;
				}
			}
			return new ddch.StyleNode(styles);
		}
	});

	dd.register.tags("dojox.dtl.contrib", {
		"html": ["html", "attr:tstyle"]
	});
})();

}
