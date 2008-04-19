if(!dojo._hasResource["dojox.rpc.JsonRPC"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.rpc.JsonRPC"] = true;
dojo.provide("dojox.rpc.JsonRPC");

dojox.rpc.envelopeRegistry.register(
	"JSON-RPC-1.0",function(str){return str == "JSON-RPC-1.0"},{
		serialize: function(smd, method, data, options){
			//not converted to json it self. This  will be done, if appropriate, at the 
			//transport level
	                var d = dojox.rpc.toOrdered(method, data);
					d = dojox.rpc.toJson({id: this._requestId++, method: method.name, params: d});
	
	                return {
	                        data: d,
	                        contentType: 'application/json',
	                        transport:"POST"
	                }
		},

		deserialize: function(results){
			var obj = dojox.rpc.resolveJson(results);
			if (obj.error) {
				var e = new Error(obj.error);
				e._rpcErrorObject = obj.error;
				return e;
			}
			return obj.result || true;
		}
	}
);

dojox.rpc.envelopeRegistry.register(
	"JSON-RPC-1.2",function(str){return str == "JSON-RPC-1.2"},{
		serialize: function(smd, method, data, options){
	                var trans = method.transport || smd.transport || "POST";
	                var d = dojox.rpc.toNamed(method, data);
	
			d = dojox.rpc.toJson({id: this._requestId++, method: method.name, params: data});
	                return {
	                        data: d,
	                        contentType: 'application/json',
	                        transport:"POST"
	                }
		},
	
		deserialize: function(results){
			var obj = dojox.rpc.resolveJson(results);
			if (obj.error) {
				var e = new Error(obj.error.message);
				e._rpcErrorObject = obj.error;
				return e;
			}
			return obj.result || true;
		}
	}
);

}
