if(!dojo._hasResource["dojox.rpc.Service"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.rpc.Service"] = true;
dojo.provide("dojox.rpc.Service");

dojo.require("dojo.AdapterRegistry");

dojo.declare("dojox.rpc.Service", null, {
	constructor: function(smd, options){
		//summary:
		//Take a string as a url to retrieve an smd or an object that is an smd or partial smd to use
		//as a definition for the service
		//
		//	smd: object
		//		Takes a number of properties as kwArgs for defining the service.  It also
		//		accepts a string.  When passed a string, it is treated as a url from
		//		which it should synchronously retrieve an smd file.  Otherwise it is a kwArgs
		//		object.  It accepts serviceUrl, to manually define a url for the rpc service
		//		allowing the rpc system to be used without an smd definition. strictArgChecks
		//		forces the system to verify that the # of arguments provided in a call
		//		matches those defined in the smd.  smdString allows a developer to pass
		//		a jsonString directly, which will be converted into an object or alternatively
		//		smdObject is accepts an smdObject directly.
		//
		var url;
		var _this = this;
		function processSmd(smd){
			smd._baseUrl = new dojo._Url(location.href,url || '.') + '';
			_this._smd = smd;
			
			//generate the methods
			for(var serviceName in _this._smd.services){
				_this[serviceName]=_this._generateService(serviceName, _this._smd.services[serviceName]);
	
			}
		}				
		if(smd){
			//if the arg is a string, we assume it is a url to retrieve an smd definition from
			if( (dojo.isString(smd)) || (smd instanceof dojo._Url)){
				if (smd instanceof dojo._Url){
					url = smd + "";
				}else{
					url = smd;
				}
			
				var text = dojo._getText(url);
				if(!text){
					throw new Error("Unable to load SMD from " + smd)
				}else{
					processSmd(dojo.fromJson(text));
				}
			}else{
				processSmd(smd);
			}
		}

		if (options){this._options = options}
		this._requestId=0;
	},

	_generateService: function(serviceName, method){
		if(this[method]){
			throw new Error("WARNING: "+ serviceName+ " already exists for service. Unable to generate function");
		}
		method.name = serviceName;
		var func = dojo.hitch(this, "_executeMethod",method);
		var transport = dojox.rpc.transportRegistry.match(method.transport || this._smd.transport);
		if (transport.getExecutor)
			func = transport.getExecutor(func,method,this);
		var schema = method.returns || (method._schema = {}); // define the schema
		schema._idPrefix = serviceName +'/'; // schemas are minimally used to track the id prefixes for the different services
		dojox.rpc.services[serviceName] = func; // register the service
		schema._service = func;
		func.serviceName = serviceName;
		func._schema = schema;
		
		return func; 
	},

	_executeMethod: function(method){
		var args = [];
		var i;
		for (i=1; i< arguments.length; i++){
			args.push(arguments[i]);
		}
		
		var smd = this._smd;
		if (method.parameters && method.parameters[0] && method.parameters[0].name && (args.length==1) && dojo.isObject(args[0])){
			// if it is the parameters are not named in the definition, then we should use ordered params, otherwise try to determine by parameters 
			args = args[0];
			// inherit root-level parameters
			if (smd.parameters && smd.parameters[0]){
				for (i=0; i< smd.parameters.length; i++){
					if (smd.parameters[i]["name"] && smd.parameters[i]["default"]){
						args[smd.parameters[i]["name"]] = smd.parameters[i]["default"];
					}
				}
			}
		}
		if (dojo.isObject(this._options)){
			args = dojo.mixin(args, this._options);
		}

		var envelope = method.envelope || smd.envelope || "NONE";
		var envDef = dojox.rpc.envelopeRegistry.match(envelope);
		var schema = method._schema || method.returns; // serialize with the right schema for the context;
		var request = envDef.serialize.apply(this, [smd, method, args]);
		var contentType = (method.contentType || smd.contentType || request.contentType);
		var isJson = (contentType + '').match(/application\/json/);

		// this allows to mandate synchronous behavior from elsewhere when necessary, this may need to be changed to be one-shot in FF3 new sync handling model
		dojo.mixin(request,{sync : dojox.rpc._sync, 
				handleAs : isJson ? "json" : "text",
				contentType : contentType,
				target : request.target || dojox.rpc.getTarget(smd, method),
				transport: method.transport || smd.transport || request.transport,
				envelope: method.envelope || smd.envelope || request.envelope,
				timeout: method.timeout || smd.timeout,
                callbackParamName: method.callbackParamName || smd.callbackParamName,
				preventCache: method.preventCache || smd.preventCache});
		 
		var deferred = (method.restMethod || dojox.rpc.transportRegistry.match(request.transport).fire).call(this,request);
		deferred.addBoth(dojo.hitch(this,function(results){
			// if it is an application/json content type, than it should be handled as json
			// we have to do conversion here instead of in XHR so that we can set the currentSchema before running it
			results = envDef.deserialize.call(this,isJson ? dojox.rpc.resolveJson(results,schema) : results); 
			return results;									
		}));
		return deferred;
	}
});

dojox.rpc.getTarget = function(smd, method){
	
	var dest=smd._baseUrl;
	if (smd.target){
		dest = new dojo._Url(dest,smd.target) + '';
	}
	if (method.target){
		dest = new dojo._Url(dest,method.target) + '';
	}
	return dest;
}

dojox.rpc.toNamed=function(method, args, strictParams){
	var i;
	if (!dojo.isArray(args)){
		if (strictParams){
			//verify that all required parameters were supplied
			for (i=0; i<method.parameters.length;i++){
				if ((!method.parameters[i].optional) && (!args[method.parameters[i].name])){
					throw new Error("Optional Parameter '" + method.parameters[i].name + "' not supplied to " + method.name);
				}
			}

			//remove any properties that were not defined
			for (var x in args){
				var found=false;
				for(i=0; i<method.parameters.length;i++){
					if (method.parameters[i].name==x){found=true;}	
				}
				if(!found){
					delete args[x];
				}
			}			
		}
		return args;
	}

	var data={};
	for(i=0;i<method.parameters.length;i++){
		data[method.parameters[i].name]=args[i]
	}	
	return data;
}

dojox.rpc.toOrdered=function(method, args){
	if (dojo.isArray(args)){return args;}
	var data=[];
	for(var i=0;i<method.parameters.length;i++){
		data.push(args[method.parameters[i].name]);
	}	
	return data;
}

dojox.rpc.transportRegistry = new dojo.AdapterRegistry(true);
dojox.rpc.envelopeRegistry = new dojo.AdapterRegistry(true);
//Built In Envelopes

dojox.rpc.envelopeRegistry.register(
	"URL",function(str){return str == "URL"},{
		serialize:function(smd, method, data ){ 
			var d = dojo.objectToQuery(dojox.rpc.toNamed(method, data, method.strictParameters||smd.strictParameters));
	
			return {
				data: d,
		                transport:"POST"
			}
		},
		deserialize:function(results){
			return results;
		}
	}
);

dojox.rpc.envelopeRegistry.register(
	"JSON",function(str){return str == "JSON"},{
		serialize: function(smd, method, data){ 
			var d = dojox.rpc.toJson(dojox.rpc.toNamed(method, data, method.strictParameters||smd.strictParameters));
	
			return {
				data: d,
				contentType : 'application/json'
			}
		},
		deserialize: function(results){
			return results;
		}
	}
);
dojox.rpc.envelopeRegistry.register(
	"PATH",function(str){return str == "PATH"},{
		serialize:function(smd, method, data){
			var i;
			var target = dojox.rpc.getTarget(smd, method);
			if (dojo.isArray(data)){
				for (i = 0; i < data.length;i++)
					target += '/' + data[i];
			}
			else {
				for (i in data)
					target += '/' + i + '/' + data[i];				
			}
	
			return {
				data:'',
				target: target
			}
		},
		deserialize:function(results){
			return results;
		}
	}
);



//post is registered first because it is the default;
dojox.rpc.transportRegistry.register(
	"POST",function(str){return str == "POST"},{
		fire:function(r){
			r.url = r.target;
			r.postData = r.data;
			return dojo.rawXhrPost(r);
		}		
	}
);

dojox.rpc.transportRegistry.register(
	"GET",function(str){return str == "GET"},{
		fire: function(r){
			r.url=  r.target + (r.data ? '?'+  r.data : '');
			r.preventCache = r.preventCache || true;
			return dojo.xhrGet(r);
		}
	}
);


//only works if you include dojo.io.script 
dojox.rpc.transportRegistry.register(
	"JSONP",function(str){return str == "JSONP"},{	
		fire:function(r){
			r.url = r.target + ((r.target.indexOf("?") == -1) ? '?' : '&') + r.data,
			r.callbackParamName = r.callbackParamName || "callback";
			return dojo.io.script.get(r);
		}
	}
);
dojox.rpc.services={};
// The RPC service can have it's own serializer. It needs to define this if they are not defined by JsonReferencing
if (!dojox.rpc.toJson){
	dojox.rpc.toJson = function(){
		return dojo.toJson.apply(dojo,arguments);
	}
	dojox.rpc.fromJson = function(){
		return dojo.fromJson.apply(dojo,arguments);
	}
	dojox.rpc.resolveJson = function(it){
		return it;
	}
}

}
