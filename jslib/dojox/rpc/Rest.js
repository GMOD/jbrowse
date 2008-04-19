if(!dojo._hasResource["dojox.rpc.Rest"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.rpc.Rest"] = true;
dojo.provide("dojox.rpc.Rest");
dojo.require("dojox.rpc.Service");
// This provides a HTTP REST service with full range REST verbs include PUT,POST, and DELETE.
// A normal GET query is done by using the service directly:
// var services = dojo.rpc.Service({services: {myRestService: {transport: "REST",...
// services.myRestService("parameters");
// 
// The modifying methods can be called as sub-methods of the rest service method like:
//  services.myRestService.put("parameters","data to put in resource");
//  services.myRestService.post("parameters","data to post to the resource");
//  services.myRestService['delete']("parameters");
dojox.rpc._restMethods = { // these are the common rest methods 
	put : function(r){
		// execute a PUT
		r.url = r.target +'?'+  r.data;
		r.putData = dojox.rpc._restMethods.sendData;
		return dojo.rawXhrPut(r);
	},
	post : function(r){
		// execute a POST
		r.url = r.target +'?'+  r.data;
		r.postData = dojox.rpc._restMethods.sendData;
		var def = dojo.rawXhrPost(r);
		var postObj = dojox.rpc._restMethods.sendObj;
/*	 This is a possible HTTP-compliant way to determine the id of a posted object	 
 		def.addCallback(function(result) {
		 	dojox._newId = def.ioArgs.xhr.getResponseHeader('Content-Location');
			if (dojox._newId) {// we need some way to communicate the id of the newly created object
				dojox.rpc._index[postObj._id = dojox._newId] = postObj;
			}
			return result; 
		});*/
		return def;
	},
	"delete" : function(r){
		r.url = r.target +'?'+  r.data;
		return dojo.xhrDelete(r);
	}
}

dojox.rpc._restMethods.put.sender =
dojox.rpc._restMethods.post.sender = true;// must declare that they send data

dojox.rpc.transportRegistry.register(
	"REST",function(str){return str == "REST"},{// same as GET... for now. Hoping to add put, post, delete as methods of the method 
		fire: function(r){
			r.url=  r.target + (r.data ? '?'+  r.data : '');
			var def = dojo.xhrGet(r);
			var newId = dojox.rpc._restQuery;
			def.addCallback(function(res) {
				dojox._newId = newId; // we need some way to communicate the id of the newly created object
				delete dojox.rpc._restQuery;
				return res;
			});
			return def;
		},
		getExecutor : function(func,method,svc){
			var executor = function(id) {
				dojox.rpc._restQuery = id;
				return func.apply(this,arguments);	
			};
			var restMethods = dojox.rpc._restMethods;
			for (var i in restMethods) { // add the rest methods to the executor
				executor[i] = (function() {
					var restMethod = restMethods[i];//let
					return function() {
						
						if (restMethod.sender) {
							var sendData = dojox.rpc._restMethods.sendObj = arguments[--arguments.length];
							var isJson = ((method.contentType || svc._smd.contentType) + '').match(/application\/json/);
							dojox.rpc._restMethods.sendData = isJson ? dojox.rpc.toJson(sendData,false,method._schema || method.returns) : sendData;// serialize with the right schema for the context;
						}
						for (var j = arguments.length++; j > 0; j--)
							arguments[j] = arguments[j-1]; // shift them over
						arguments[0] = dojo.mixin({restMethod: restMethod},method);
						return svc._executeMethod.apply(svc,arguments);
					}
				})();
				 
			}
			executor.contentType = method.contentType || svc._smd.contentType; // this is so a Rest service can be examined to know what type of content type to expect
			return executor;
		},
		restMethods:dojox.rpc._restMethods 		
	}
);

}
