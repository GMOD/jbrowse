if(!dojo._hasResource["dojox.rpc.JsonReferencing"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.rpc.JsonReferencing"] = true;
dojo.provide("dojox.rpc.JsonReferencing");
dojo.require("dojo.date.stamp");
dojo.require("dojo._base.Deferred");

// summary:
// Adds advanced JSON {de}serialization capabilities to the base json library.
// This enhances the capabilities of dojo.toJson and dojo.fromJson,
// adding referencing support, date handling, and other extra format handling.
// On parsing, references are resolved. When references are made to 
// ids/objects that have been loaded yet, a Deferred object will be used as the
// value and as soon as a callback is added to the Deferred object, the target
// object will be loaded.
 


dojox.rpc._index={}; // the global map of id->object
dojox.rpc.onUpdate = function(/*Object*/ object,  /* attribute-name-string */ attribute,  /* any */ oldValue,  /* any */ newValue){
		//	summary:
		//		This function is called when an existing object in the system is updated. Existing objects are found by id. 
};

dojox.rpc.resolveJson = function(/*Object*/ root,/*Object?*/ schema){
	// summary:
	// 		Indexes and resolves references in the JSON object. 
	// A JSON Schema object that can be used to advise the handling of the JSON (defining ids, date properties, urls, etc)
	//  
	// root: 
	//		The root object of the object graph to be processed
	//
	// schema: A JSON Schema object that can be used to advise the parsing of the JSON (defining ids, date properties, urls, etc)	//
	// 		Currently this provides a means for context based id handling
	//
	// return:
	//		An object, the result of the processing
	var ref,reWalk=[];
	function makeIdInfo(schema){ // find out what attribute and what id prefix to use
		if (schema){
			var attr;
			if (!(attr = schema._idAttr)){
				for (var i in schema.properties){
					if (schema.properties[i].unique){
						schema._idAttr = attr = i;
					}
				}
			}
			if (attr || schema._idPrefix){
				return {attr:attr || 'id',prefix:schema._idPrefix};
			}
		}

		return false;
	}
	function walk(it,stop,schema,idInfo,defaultId){
		// this walks the new graph, resolving references and making other changes 
	 	var val,i;
	 	var id = it[idInfo.attr];
	 	id = (id && (idInfo.prefix + id)) || defaultId; // if there is an id, prefix it, otherwise inherit 
	 	var target = it;
	 	
		if (id){ // if there is an id available...
			it._id = id;
			if (dojox.rpc._index[id]){ // if the id already exists in the system, we should use the existing object, and just update it
				target = dojox.rpc._index[id];
				delete target.$ref; // remove this artifact
			}
			dojox.rpc._index[id] = target; // add the prefix, set _id, and index it
			if (schema && dojox.validate && dojox.validate.jsonSchema){ // if json schema is activated, we can load it in the registry of instance schemas map
				dojox.validate.jsonSchema._schemas[id] = schema;
			}
			
		}		
		for (i in it){
			if (it.hasOwnProperty(i) && (typeof (val=it[i]) =='object') && val){
				ref=val.$ref;
				if (ref){ // a reference was found
					var stripped = ref.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');// trim it
					if(/[\w\[\]\.\$ \/\r\n\t]/.test(stripped) && !/=|((^|\W)new\W)/.test(stripped)){ // make sure it is a safe reference
						var path = ref.match(/(^\.*[^\.\[]+)([\.\[].*)?/); // divide along the path
						if ((ref=path[1]=='$' ? root:dojox.rpc._index[new dojo._Url(idInfo.prefix,path[1])]) &&  // a $ indicates to start with the root, otherwise start with an id 
							(ref = path[2] ? eval('ref' + path[2]) : ref)){// starting point was found, use eval to resolve remaining property references
							// otherwise, no starting point was found (id not found), if stop is set, it does not exist, we have 
							// unloaded reference, if stop is not set, it may be in a part of the graph not walked yet, 
							// we will wait for the second loop
							val = ref;
						}
						else{
							if (!stop){
								if (!rewalking) 
									reWalk.push(it); // we need to rewalk it to resolve references
								var rewalking = true; // we only want to add it once
							}
							else {
								ref = val.$ref;
								val = new dojo.Deferred();
								val._id = idInfo.prefix + ref;
								(function(val,ref){
									var connectId = dojo.connect(val,"addCallbacks",function(){
										dojo.disconnect(connectId);
										dojox.rpc.services[idInfo.prefix.substring(0,idInfo.prefix.length-1)](ref) // otherwise call by looking up the service 
											.addCallback(dojo.hitch(val,val.callback));
										
									});
								})(val,ref);
							}
						}
					}
				}
				else {
					if (!stop){ // if we are in stop, that means we are in the second loop, and we only need to check this current one,
										// further walking may lead down circular loops
						var valSchema = val.schema || // a schema can be self-defined by the object,  
										(schema && schema.properties && schema.properties[i]);  // or it can from the schema sub-object definition 
						if (valSchema){
							idInfo = makeIdInfo(valSchema)||idInfo;
						}
						val = walk(val,reWalk==it,valSchema,idInfo,id && (id + ('[' + dojo._escapeString(i) + ']')));
					}
				}
			}
			if (dojo.isString(val) && schema && schema.properties && schema.properties[i] && schema.properties[i].format=='date-time'){// parse the date string
				val = dojo.date.stamp.fromISOString(val); // create a date object
			}
			it[i] = val;
			var old = target[i];  
			if (val !== old){ // only update if it changed
				target[i] = val; // update the target
				propertyChange(i,old,val);
			}
		}
		function propertyChange(key,old,newValue){
			setTimeout(function(){
				dojox.rpc.onUpdate(target,i,old,newValue); // call the listener for each update
			});
		}
		if (target != it){ // this means we are updating, we need to remove deleted
			for (i in target){
				if (!it.hasOwnProperty(i) && i != '_id' && !(target instanceof Array && isNaN(i))){
					propertyChange(i,target[i],undefined);
					delete target[i];
				}
			}
		}
		return target;
	}
	var idInfo = makeIdInfo(schema)||{attr:'id',prefix:''};
	if (!root){ return root; } 
	root = walk(root,false,schema,idInfo,dojox._newId && (new dojo._Url(idInfo.prefix,dojox._newId) +'')); // do the main walk through
	walk(reWalk,false,schema,idInfo); // re walk any parts that were not able to resolve references on the first round
	return root;
};
dojox.rpc.fromJson = function(/*String*/ str,/*Object?*/ schema){
	// summary:
	// 		evaluates the passed string-form of a JSON object. 
	// A JSON Schema object that can be used to advise the parsing of the JSON (defining ids, date properties, urls, etc)
	// which may defined by setting dojox.currentSchema to the current schema you want to use for this evaluation
	//  
	// json: 
	//		a string literal of a JSON item, for instance:
	//			'{ "foo": [ "bar", 1, { "baz": "thud" } ] }'
	// schema: A JSON Schema object that can be used to advise the parsing of the JSON (defining ids, date properties, urls, etc)	//
	// 		Currently this provides a means for context based id handling
	//
	// return:
	//		An object, the result of the evaluation
	root = eval('(' + str + ')'); // do the eval
	if (root){
		return this.resolveJson(root,schema);
	}
	return root;
}
dojox.rpc.toJson = function(/*Object*/ it, /*Boolean?*/ prettyPrint, /*Object?*/ schema){
	// summary:
	//		Create a JSON serialization of an object. 
	//		This has support for referencing, including circular references, duplicate references, and out-of-message references
	// 		id and path-based referencing is supported as well and is based on http://www.json.com/2007/10/19/json-referencing-proposal-and-library/.
	//
	// it:
	//		an object to be serialized. 
	//
	// prettyPrint:
	//		if true, we indent objects and arrays to make the output prettier.
	//		The variable dojo.toJsonIndentStr is used as the indent string 
	//		-- to use something other than the default (tab), 
	//		change that variable before calling dojo.toJson().
	//
	// schema: A JSON Schema object that can be used to advise the parsing of the JSON (defining ids, date properties, urls, etc)	//
	// 		Currently this provides a means for context based id handling
	// 		
	// return:
	//		a String representing the serialized version of the passed object.
	
	var idPrefix = (schema&& schema._idPrefix) || ''; // the id prefix for this context 
	var paths={};
	function serialize(it,path,_indentStr){ 
		if (it && dojo.isObject(it)){
			var value;
			if (it instanceof Date){ // properly serialize dates
				return '"' + dojo.date.stamp.toISOString(it,{zulu:true}) + '"';
			}
			var id = it._id;
			if (id){ // we found an identifiable object, we will just serialize a reference to it... unless it is the root
				
				if (path != '$'){
					return serialize({$ref:id.charAt(0)=='$' ? id : // a pure path based reference, leave it alone
 									id.substring(0,idPrefix.length)==idPrefix ?  // see if the reference is in the current context
 										id.substring(idPrefix.length): // a reference with a prefix matching the current context, the prefix should be removed
	 										'../' + id});// a reference to a different context, assume relative url based referencing
				}
				path = id;
			}
			else {
				it._id = path; // we will create path ids for other objects in case they are circular 
				paths[path] = it;// save it here so they can be deleted at the end
			}
			_indentStr = _indentStr || "";
			var nextIndent = prettyPrint ? _indentStr + dojo.toJsonIndentStr : "";
			var newLine = prettyPrint ? "\n" : "";
			var sep = prettyPrint ? " " : "";
			
			if (it instanceof Array){
				var res = dojo.map(it, function(obj,i){
					var val = serialize(obj, path + '[' + i + ']', nextIndent);
					if(!dojo.isString(val)){
						val = "undefined";
					}
					return newLine + nextIndent + val;
				});
				return "[" + res.join("," + sep) + newLine + _indentStr + "]";
			} 
			
			var output = [];
			for(var i in it){
				var keyStr;
				if(typeof i == "number"){
					keyStr = '"' + i + '"';
				}else if(dojo.isString(i) && i != '_id'){
					keyStr = dojo._escapeString(i);
				}else{
					// skip non-string or number keys
					continue;
				}
				var val = serialize(it[i],path+(i.match(/^[a-zA-Z]\w*$/) ? // can we use simple .property syntax? 
													('.' + i) : // yes, otherwise we have to escape it
													('[' + dojo._escapeString(i) + ']')),nextIndent);
				if(!dojo.isString(val)){
					// skip non-serializable values
					continue;
				}
				output.push(newLine + nextIndent + keyStr + ":" + sep + val);
			}
			return "{" + output.join("," + sep) + newLine + _indentStr + "}";
		}
		
		return dojo.toJson(it); // use the default serializer for primitives
	}
	var json = serialize(it,'$','');
	for (i in paths){  // cleanup the temporary path-generated ids
		delete paths[i]._id;
	}
	return json;
}

}
