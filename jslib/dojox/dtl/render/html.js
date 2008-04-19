if(!dojo._hasResource["dojox.dtl.render.html"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.render.html"] = true;
dojo.provide("dojox.dtl.render.html");
dojo.require("dojox.dtl.Context");

dojox.dtl.render.html.sensitivity = {
	// summary:
	//		Set conditions under which to buffer changes
	// description:
	//		Necessary if you make a lot of changes to your template.
	//		What happens is that the entire node, from the attached DOM Node
	//		down gets swapped with a clone, and until the entire rendering
	//		is complete, we don't replace the clone again. In this way, renders are
	//		"batched".
	//
	//		But, if we're only changing a small number of nodes, we might no want to buffer at all.
	//		The higher numbers mean that even small changes will result in buffering.
	//		Each higher level includes the lower levels.
	NODE: 1, // If a node changes, implement buffering
	ATTRIBUTE: 2, // If an attribute or node changes, implement buffering
	TEXT: 3 // If any text at all changes, implement buffering
}
dojox.dtl.render.html.Render = function(/*DOMNode?*/ attachPoint, /*dojox.dtl.HtmlTemplate?*/ tpl){
	this._tpl = tpl;
	this.domNode = attachPoint;
	this._swap = dojo.hitch(this, function(){
		// summary: Swaps the node out the first time the DOM is changed
		// description: Gets swapped back it at end of render
		if(this.domNode === this._tpl.getRootNode()){
			var frag = this.domNode;
			this.domNode = this.domNode.cloneNode(true);
			frag.parentNode.replaceChild(this.domNode, frag);
		}
	});
}
dojo.extend(dojox.dtl.render.html.Render, {
	sensitivity: dojox.dtl.render.html.sensitivity,
	setAttachPoint: function(/*Node*/ node){
		this.domNode = node;
	},
	render: function(/*Object*/ context, /*dojox.dtl.HtmlTemplate?*/ tpl, /*dojox.dtl.HtmlBuffer?*/ buffer){
		if(!this.domNode){
			throw new Error("You cannot use the Render object without specifying where you want to render it");
		}

		tpl = tpl || this._tpl;
		buffer = buffer || tpl.getBuffer();
		context = context || new dojox.dtl.Context();

		if(context.getThis() && context.getThis().buffer == this.sensitivity.NODE){
			var onAddNode = dojo.connect(buffer, "onAddNode", this, "_swap");
			var onRemoveNode = dojo.connect(buffer, "onRemoveNode", this, "_swap");
		}

		if(this._tpl && this._tpl !== tpl){
			this._tpl.unrender(context, buffer);
		}
		this._tpl = tpl;

		var frag = tpl.render(context, buffer).getParent();
		if(!frag){
			throw new Error("Rendered template does not have a root node");
		}

		dojo.disconnect(onAddNode);
		dojo.disconnect(onRemoveNode);

		if(this.domNode !== frag){
			this.domNode.parentNode.replaceChild(frag, this.domNode);
			dojo._destroyElement(this.domNode);
			this.domNode = frag;
		}
	}
});

}
