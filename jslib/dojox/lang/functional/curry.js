if(!dojo._hasResource["dojox.lang.functional.curry"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.functional.curry"] = true;
dojo.provide("dojox.lang.functional.curry");

dojo.require("dojox.lang.functional.lambda");

// This module adds high-level functions and related constructs:
//	- currying and partial functions
//	- argument pre-processing: mixer and flip

// Acknoledgements:
//	- partial() is based on work by Oliver Steele 
//		(http://osteele.com/sources/javascript/functional/functional.js)
//		which was published under MIT License

// Defined methods:
//	- take any valid lambda argument as the functional argument

(function(){
	var df = dojox.lang.functional;

	var currying = function(/*Object*/ info){
		return function(){	// Function
			if(arguments.length + info.args.length < info.arity){
				return currying({func: info.func, arity: info.arity, 
					args: Array.prototype.concat.apply(info.args, arguments)});
			}
			return info.func.apply(this, Array.prototype.concat.apply(info.args, arguments));
		};
	};

	dojo.mixin(df, {
		// currying and partial functions
		curry: function(/*Function|String|Array*/ f, /*Number?*/ arity){
			// summary: curries a function until the arity is satisfied, at 
			//	which point it returns the calculated value.
			f = df.lambda(f);
			arity = typeof arity == "number" ? arity : f.length;
			return currying({func: f, arity: arity, args: []});	// Function
		},
		arg: {},	// marker for missing arguments
		partial: function(/*Function|String|Array*/ f){
			// summary: creates a function where some arguments are bound, and
			//	some arguments (marked as dojox.lang.functional.arg) are will be 
			//	accepted by the final function in the order they are encountered.
			// description: This method is used to produce partially bound 
			//	functions. If you want to change the order of arguments, use
			//	dojox.lang.functional.mixer() or dojox.lang.functional.flip().
			var a = arguments, args = new Array(a.length - 1), p = [];
			f = df.lambda(f);
			for(var i = 1; i < a.length; ++i){
				var t = a[i];
				args[i - 1] = t;
				if(t == df.arg){
					p.push(i - 1);
				}
			}
			return function(){	// Function
				var t = Array.prototype.slice.call(args, 0); // clone the array
				for(var i = 0; i < p.length; ++i){
					t[p[i]] = arguments[i];
				}
				return f.apply(this, t);
			};
		},
		// argument pre-processing
		mixer: function(/*Function|String|Array*/ f, /*Array*/ mix){
			// summary: changes the order of arguments using an array of
			//	numbers mix --- i-th argument comes from mix[i]-th place
			//	of supplied arguments.
			f = df.lambda(f);
			return function(){	// Function
				var t = new Array(mix.length);
				for(var i = 0; i < mix.length; ++i){
					t[i] = arguments[mix[i]];
				}
				return f.apply(this, t);
			};
		},
		flip: function(/*Function|String|Array*/ f){
			// summary: changes the order of arguments by reversing their
			//	order.
			f = df.lambda(f);
			return function(){	// Function
				// reverse arguments
				var a = arguments, l = a.length - 1, t = new Array(l + 1), i;
				for(i = 0; i <= l; ++i){
					t[l - i] = a[i];
				}
				return f.apply(this, t);
			};
		}
	});
})();

}
