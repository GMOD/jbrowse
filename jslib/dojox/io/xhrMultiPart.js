if(!dojo._hasResource["dojox.io.xhrMultiPart"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.io.xhrMultiPart"] = true;
dojo.provide("dojox.io.xhrMultiPart");

dojo.require("dojo._base.xhr");
dojo.require("dojox.uuid.generateRandomUuid");

(function(){
	function _createPart(args, boundary){
		if(!args["name"] && !args["content"]){
			throw new Error("Each part of a multi-part request requires 'name' and 'content'.");
		}

		var tmp = [];
		tmp.push("--" + boundary,
				 "Content-Disposition: form-data; name=\"" + args.name + "\"" +
				 (args["filename"] ? "; filename=\"" + args.filename + "\"" : ""));

		if(args["contentType"]){
			var ct = "Content-Type: " + args.contentType;
			if(args["charset"]){
				ct += "; Charset=" + args.charset;
			}
			tmp.push(ct);
		}

		if(args["contentTransferEncoding"]){
			tmp.push("Content-Transfer-Encoding: " + args.contentTransferEncoding);
		}

		tmp.push("", args.content);

		return tmp;
	}

	function _needIframe(node){
		return (!!(dojo.query("input[type=file]", node).length));
	}

	function _partsFromNode(node, boundary){
		// TODO: write this function!
		var tmp = [];
		return tmp;
	}

	dojox.io.xhrMultiPart = function(args){
		if(!args["file"] && !args["form"]){
			throw new Error("file or form must be provided to dojox.io.xhrMultiPart's arguments");
		}

		// unique guid as a boundary value for multipart posts
		var boundary = dojox.uuid.generateRandomUuid();

		var tmp = [];
		var out = "";

		if(args["file"]){
			var d = (dojo.isArray(args.file) ? args.file : [args.file]);

			for(var i=0; i < d.length; i++){
				tmp = tmp.concat(_createPart(d[i], boundary));
			}
		}

		if(args["form"]){
			tmp = tmp.concat(_partsFromNode(args["form"], boundary));
		}

		if(tmp.length){
			tmp.push("--"+boundary+"--", "");
			out = tmp.join("\r\n");
		}

		return dojo.rawXhrPost(dojo.mixin(args, {
			contentType: "multipart/form-data; boundary=" + boundary,
			postData: out
		}));
	}
})();

}
