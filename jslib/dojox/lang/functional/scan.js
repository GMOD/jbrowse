if(!dojo._hasResource["dojox.lang.functional.scan"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.functional.scan"] = true;
dojo.provide("dojox.lang.functional.scan");

dojo.require("dojox.lang.functional.lambda");

// This module adds high-level functions and related constructs:
//	- "scan" family of functions

// Notes:
//	- missing high-level functions are provided with the compatible API: 
//		scanl, scanl1, scanr, scanr1

// Defined methods:
//	- take any valid lambda argument as the functional argument
//	- operate on dense arrays
//	- take a string as the array argument
//	- take an iterator objects as the array argument (only scanl, and scanl1)

(function(){
	var d = dojo, df = dojox.lang.functional;

	d.mixin(df, {
		// classic reduce-class functions
		scanl: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from left 
			//	to right using a seed value as a starting point; returns an array
			//	of values produced by foldl() at that point.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var t, n;
			if(d.isArray(a)){
				t = new Array((n = a.length) + 1);
				t[0] = z;
				for(var i = 0; i < n; z = f.call(o, z, a[i], i, a), t[++i] = z);
			}else{
				t = [z];
				for(var i = 0; a.hasNext(); t.push(z = f.call(o, z, a.next(), i++)));
			}
			return t;	// Array
		},
		scanl1: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from left 
			//	to right; returns an array of values produced by foldl1() at that 
			//	point.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var t, n, z;
			if(d.isArray(a)){
				t = new Array(n = a.length);
				t[0] = z = a[0];
				for(var i = 1; i < n; t[i] = z = f.call(o, z, a[i], i, a), ++i);
			}else if(a.hasNext()){
				t = [z = a.next()];
				for(var i = 1; a.hasNext(); t.push(z = f.call(o, z, a.next(), i++)));
			}
			return t;	// Array
		},
		scanr: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from right
			//	to left using a seed value as a starting point; returns an array
			//	of values produced by foldr() at that point.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var n = a.length, t = new Array(n + 1);
			t[n] = z;
			for(var i = n; i > 0; --i, z = f.call(o, z, a[i], i, a), t[i] = z);
			return t;	// Array
		},
		scanr1: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from right
			//	to left; returns an array of values produced by foldr1() at that 
			//	point.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var n = a.length, t = new Array(n), z = a[n - 1];
			t[n - 1] = z;
			for(var i = n - 1; i > 0; --i, z = f.call(o, z, a[i], i, a), t[i] = z);
			return t;	// Array
		}
	});
})();

}
