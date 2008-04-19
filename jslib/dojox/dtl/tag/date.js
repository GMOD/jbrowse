if(!dojo._hasResource["dojox.dtl.tag.date"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.tag.date"] = true;
dojo.provide("dojox.dtl.tag.date");

dojo.require("dojox.dtl._base");
dojo.require("dojox.dtl.utils.date");

dojox.dtl.tag.date.NowNode = function(format, TextNode){
	this.format = new dojox.dtl.utils.date.DateFormat(format);
	this.contents = new TextNode("");
}
dojo.extend(dojox.dtl.tag.date.NowNode, {
	render: function(context, buffer){
		this.contents.set(this.format.format(new Date()));
		return this.contents.render(context, buffer);
	}
});

dojox.dtl.tag.date.now = function(parser, text){
	// Split by either :" or :'
	var parts = text.split((text.substring(0, 5) == "now '") ? "'" : '"');
	if(parts.length != 3){
		throw new Error("'now' statement takes one argument");
	}
	var format = parts[1];
	return new dojox.dtl.tag.date.NowNode(format, parser.getTextNodeConstructor());
}

}
