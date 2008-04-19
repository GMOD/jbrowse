if(!dojo._hasResource["dojox.dtl.Context"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.Context"] = true;
dojo.provide("dojox.dtl.Context");
dojo.require("dojox.dtl._base");

dojox.dtl.Context = dojo.extend(function(dict){
	this._this = {};
	dojox.dtl._Context.call(this, dict);
}, dojox.dtl._Context.prototype,
{
	extend: function(/*dojox.dtl.Context|Object*/ obj){
		// summary: Returns a clone of this context object, with the items from the
		//		passed objecct mixed in.
		var context = new dojox.dtl.Context();
		var keys = this.getKeys();
		var i, key;
		for(i = 0; key = keys[i]; i++){
			if(typeof obj[key] != "undefined"){
				context[key] = obj[key];
			}else{
				context[key] = this[key];
			}
		}

		if(obj instanceof dojox.dtl.Context){
			keys = obj.getKeys();
		}else if(typeof obj == "object"){
			keys = [];
			for(key in obj){
				keys.push(key);
			}
		}

		for(i = 0; key = keys[i]; i++){
			context[key] = obj[key];
		}

		return context;
	},
	filter: function(/*dojox.dtl.Context|Object|String...*/ filter){
		// summary: Returns a clone of this context, only containing the items
		//		defined in the filter.
		var context = new dojox.dtl.Context();
		var keys = [];
		var i, arg;
		if(filter instanceof dojox.dtl.Context){
			keys = filter.getKeys();
		}else if(typeof filter == "object"){
			for(var key in filter){
				keys.push(key);
			}
		}else{
			for(i = 0; arg = arguments[i]; i++){
				if(typeof arg == "string"){
					keys.push(arg);
				}
			}
		}

		for(i = 0, key; key = keys[i]; i++){
			context[key] = this[key];
		}

		return context;
	},
	setThis: function(/*Object*/ _this){
		this._this = _this;
	},
	getThis: function(){
		return this._this;
	},
	hasKey: function(key){
		if(typeof this[key] != "undefined"){
			return true;
		}

		for(var i = 0, dict; dict = this._dicts[i]; i++){
			if(typeof dict[key] != "undefined"){
				return true;
			}
		}

		return false;
	}
});

}
