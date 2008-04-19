if(!dojo._hasResource["dojox.dtl._HtmlTemplated"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl._HtmlTemplated"] = true;
dojo.provide("dojox.dtl._HtmlTemplated");
dojo.require("dijit._Templated");
dojo.require("dojox.dtl.html");
dojo.require("dojox.dtl.render.html");
dojo.require("dojox.dtl.contrib.dijit");

dojox.dtl._HtmlTemplated = {
	prototype: {
		_dijitTemplateCompat: false,
		buildRendering: function(){
			this.domNode = this.srcNodeRef;

			if(!this._render){
				var ddcd = dojox.dtl.contrib.dijit;
				var old = ddcd.widgetsInTemplate;
				ddcd.widgetsInTemplate = this.widgetsInTemplate;
				this._template = this._getCachedTemplate(this.templatePath, this.templateString);
				this._render = new dojox.dtl.render.html.Render(this.domNode, this._template);
				ddcd.widgetsInTemplate = old;
			}

			var self = this;
			this._rendering = setTimeout(function(){ self.render(); }, 10);
		},
		setTemplate: function(/*String|dojo._Url*/ template, /*dojox.dtl.Context?*/ context){
			// summary:
			//		Quickly switch between templated by location
			if(dojox.dtl.text._isTemplate(template)){
				this._template = this._getCachedTemplate(null, template);
			}else{
				this._template = this._getCachedTemplate(template);
			}
			this.render(context);
		},
		render: function(/*dojox.dtl.Context?*/ context){
			if(this._rendering){
				clearTimeout(this._rendering);
				delete this._rendering;
			}
			this._render.render(this._getContext(context));
		},
		_getContext: function(context){
			if (!(context instanceof dojox.dtl.Context)) {
				context = false;
			}
			context = context || new dojox.dtl.Context(this);
			context.setThis(this);
			return context;
		},
		_getCachedTemplate: function(templatePath, templateString){
			if(!this._templates){
				this._templates = {};
			}
			var key = templateString || templatePath.toString();
			var tmplts = this._templates;
			if(tmplts[key]){
				return tmplts[key];
			}
			return (tmplts[key] = new dojox.dtl.HtmlTemplate(
				dijit._Templated.getCachedTemplate(
					templatePath,
					templateString,
					true
				)
			));
		}
	}
};

}
