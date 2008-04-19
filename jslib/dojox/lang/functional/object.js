if(!dojo._hasResource["dojox.lang.functional.object"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.functional.object"] = true;
dojo.provide("dojox.lang.functional.object");

dojo.require("dojox.lang.functional.lambda");

// This module adds high-level functions and related constructs:
//	- object/dictionary helpers

// Defined methods:
//	- take any valid lambda argument as the functional argument

(function(){
	var d = dojo, df = dojox.lang.functional, empty = {};

	d.mixin(df, {
		// object helpers
		forIn: function(/*Object*/ obj, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: iterates over all object members skipping members, which 
			//	are present in the empty object (IE and/or 3rd-party libraries).
			o = o || d.global; f = df.lambda(f);
			for(var i in obj){
				if(i in empty){ continue; }
				f.call(o, obj[i], i, obj);
			}
		},
		keys: function(/*Object*/ obj){
			// summary: returns an array of all keys in the object
			var t = [];
			for(var i in obj){
				if(i in empty){ continue; }
				t.push(i);
			}
			return	t; // Array
		},
		values: function(/*Object*/ obj){
			// summary: returns an array of all values in the object
			var t = [];
			for(var i in obj){
				if(i in empty){ continue; }
				t.push(obj[i]);
			}
			return	t; // Array
		}
	});
})();

}
