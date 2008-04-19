if(!dojo._hasResource["dojox.lang.functional.fold"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.functional.fold"] = true;
dojo.provide("dojox.lang.functional.fold");

dojo.require("dojox.lang.functional.lambda");

// This module adds high-level functions and related constructs:
//	- "fold" family of functions

// Notes:
//	- missing high-level functions are provided with the compatible API: 
//		foldl, foldl1, foldr, foldr1
//	- missing JS standard functions are provided with the compatible API: 
//		reduce, reduceRight

// Defined methods:
//	- take any valid lambda argument as the functional argument
//	- operate on dense arrays
//	- take a string as the array argument
//	- take an iterator objects as the array argument (only foldl, foldl1, and reduce)

(function(){
	var d = dojo, df = dojox.lang.functional;

	d.mixin(df, {
		// classic reduce-class functions
		foldl: function(/*Array|String|Object*/ a, /*Function*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from left 
			//	to right using a seed value as a starting point; returns the final 
			//	value.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			if(d.isArray(a)){
				for(var i = 0, n = a.length; i < n; z = f.call(o, z, a[i], i, a), ++i);
			}else{
				for(var i = 0; a.hasNext(); z = f.call(o, z, a.next(), i++));
			}
			return z;	// Object
		},
		foldl1: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from left 
			//	to right; returns the final value.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var z;
			if(d.isArray(a)){
				z = a[0];
				for(var i = 1, n = a.length; i < n; z = f.call(o, z, a[i], i, a), ++i);
			}else if(a.hasNext()){
				z = a.next();
				for(var i = 1; a.hasNext(); z = f.call(o, z, a.next(), i++));
			}
			return z;	// Object
		},
		foldr: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from right
			//	to left using a seed value as a starting point; returns the final 
			//	value.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			for(var i = a.length; i > 0; --i, z = f.call(o, z, a[i], i, a));
			return z;	// Object
		},
		foldr1: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from right
			//	to left; returns the final value.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var n = a.length, z = a[n - 1];
			for(var i = n - 1; i > 0; --i, z = f.call(o, z, a[i], i, a));
			return z;	// Object
		},
		// JS 1.8 standard array functions, which can take a lambda as a parameter.
		reduce: function(/*Array|String|Object*/ a, /*Function*/ f, /*Object?*/ z){
			// summary: apply a function simultaneously against two values of the array 
			//	(from left-to-right) as to reduce it to a single value.
			return arguments.length < 3 ? df.foldl1(a, f) : df.foldl(a, f, z);	// Object
		},
		reduceRight: function(/*Array|String*/ a, /*Function*/ f, /*Object?*/ z){
			// summary: apply a function simultaneously against two values of the array 
			//	(from right-to-left) as to reduce it to a single value.
			return arguments.length < 3 ? df.foldr1(a, f) : df.foldr(a, f, z);	// Object
		}
	});
})();

}
