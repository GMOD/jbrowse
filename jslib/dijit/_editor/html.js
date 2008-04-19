if(!dojo._hasResource["dijit._editor.html"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._editor.html"] = true;
dojo.provide("dijit._editor.html");

dijit._editor.escapeXml=function(/*String*/str, /*Boolean*/noSingleQuotes){
	//summary:
	//		Adds escape sequences for special characters in XML: &<>"'
	//		Optionally skips escapes for single quotes
	str = str.replace(/&/gm, "&amp;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;").replace(/"/gm, "&quot;");
	if(!noSingleQuotes){
		str = str.replace(/'/gm, "&#39;");
	}
	return str; // string
};

dijit._editor.getNodeHtml=function(/* DomNode */node){
	var output;
	switch(node.nodeType){
		case 1: //element node
			output = '<'+node.nodeName.toLowerCase();

			//store the list of attributes and sort it to have the
			//attributes appear in the dictionary order
			var attrarray = [];
			if(dojo.isIE && node.outerHTML){
				var s = node.outerHTML;
				s = s.substr(0,s.indexOf('>'));
				s = s.replace(/(['"])[^"']*\1/g, '');//to make the following regexp safe
				var reg = /([^\s=]+)=/g;
				var m, key;
				while((m = reg.exec(s))){
					key=m[1];
					if(key.substr(0,3) != '_dj'){
						if(key == 'src' || key == 'href'){
							if(node.getAttribute('_djrealurl')){
								attrarray.push([key,node.getAttribute('_djrealurl')]);
								continue;
							}
						}
						if(key=='style'){
							attrarray.push([key, node.style.cssText.toLowerCase()]);
						}else{
							attrarray.push([key, key=='class'?node.className:node.getAttribute(key)]);
						}
					}
				}
			}else{
				var attr, i=0, attrs = node.attributes;
				while((attr=attrs[i++])){
					//ignore all attributes starting with _dj which are
					//internal temporary attributes used by the editor
					var n=attr.name;
					if(n.substr(0,3) != '_dj' /*&&
						(attr.specified == undefined || attr.specified)*/){
						var v = attr.value;
						if(n == 'src' || n == 'href'){
							if(node.getAttribute('_djrealurl')){
								v = node.getAttribute('_djrealurl');
							}
						}
						attrarray.push([n,v]);
					}
				}
			}
			attrarray.sort(function(a,b){
				return a[0]<b[0]?-1:(a[0]==b[0]?0:1);
			});
			i=0;
			while((attr=attrarray[i++])){
				output += ' '+attr[0]+'="'+dijit._editor.escapeXml(attr[1],true)+'"';
			}
			if(node.childNodes.length){
				output += '>' + dijit._editor.getChildrenHtml(node)+'</'+node.nodeName.toLowerCase()+'>';
			}else{
				output += ' />';
			}
			break;
		case 3: //text
			// FIXME:
			output = dijit._editor.escapeXml(node.nodeValue,true);
			break;
		case 8: //comment
			// FIXME:
			output = '<!--'+dijit._editor.escapeXml(node.nodeValue,true)+'-->';
			break;
		default:
			output = "Element not recognized - Type: " + node.nodeType + " Name: " + node.nodeName;
	}
	return output;
};

dijit._editor.getChildrenHtml = function(/* DomNode */dom){
	// summary: Returns the html content of a DomNode and children
	var out = "";
	if(!dom){ return out; }
	var nodes = dom["childNodes"]||dom;
	var i=0;
	var node;
	while((node=nodes[i++])){
		out += dijit._editor.getNodeHtml(node);
	}
	return out; // String
}

}
