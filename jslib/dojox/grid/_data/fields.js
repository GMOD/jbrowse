if(!dojo._hasResource["dojox.grid._data.fields"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.grid._data.fields"] = true;
dojo.provide("dojox.grid._data.fields");

dojo.declare("dojox.grid.data.Mixer", null, {
	// summary:
	//	basic collection class that provides a default value for items
	
	constructor: function(){
		this.defaultValue = {};
		this.values = [];
	},
	count: function(){
		return this.values.length;
	},
	clear: function(){
		this.values = [];
	},
	build: function(inIndex){
		var result = dojo.mixin({owner: this}, this.defaultValue);
		result.key = inIndex;
		this.values[inIndex] = result;
		return result;
	},
	getDefault: function(){
		return this.defaultValue;
	},
	setDefault: function(inField /*[, inField2, ... inFieldN] */){
		for(var i=0, a; (a = arguments[i]); i++){
			dojo.mixin(this.defaultValue, a);
		}
	},
	get: function(inIndex){
		return this.values[inIndex] || this.build(inIndex);
	},
	_set: function(inIndex, inField /*[, inField2, ... inFieldN] */){
		// each field argument can be a single field object of an array of field objects
		var v = this.get(inIndex);
		for(var i=1; i<arguments.length; i++){
			dojo.mixin(v, arguments[i]);
		}
		this.values[inIndex] = v;
	},
	set: function(/* inIndex, inField [, inField2, ... inFieldN] | inArray */){
		if(arguments.length < 1){
			return;
		}
		var a = arguments[0];
		if(!dojo.isArray(a)){
			this._set.apply(this, arguments);
		}else{
			if(a.length && a[0]["default"]){
				this.setDefault(a.shift());
			}
			for(var i=0, l=a.length; i<l; i++){
				this._set(i, a[i]);
			}
		}
	},
	insert: function(inIndex, inProps){
		if (inIndex >= this.values.length){
			this.values[inIndex] = inProps;
		}else{
			this.values.splice(inIndex, 0, inProps);
		}
	},
	remove: function(inIndex){
		this.values.splice(inIndex, 1);
	},
	swap: function(inIndexA, inIndexB){
		dojox.grid.arraySwap(this.values, inIndexA, inIndexB);
	},
	move: function(inFromIndex, inToIndex){
		dojox.grid.arrayMove(this.values, inFromIndex, inToIndex);
	}
});

dojox.grid.data.compare = function(a, b){
	return (a > b ? 1 : (a == b ? 0 : -1));
}

dojo.declare('dojox.grid.data.Field', null, {
	constructor: function(inName){
		this.name = inName;
		this.compare = dojox.grid.data.compare;
	},
	na: dojox.grid.na
});

dojo.declare('dojox.grid.data.Fields', dojox.grid.data.Mixer, {
	constructor: function(inFieldClass){
		var fieldClass = inFieldClass ? inFieldClass : dojox.grid.data.Field;
		this.defaultValue = new fieldClass();
	},
	indexOf: function(inKey){
		for(var i=0; i<this.values.length; i++){
			var v = this.values[i];
			if(v && v.key == inKey){return i;}
		}
		return -1;
	}
});

}
