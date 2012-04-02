/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

/*
	This is an optimized version of Dojo, built for deployment and not for
	development. To get sources and documentation, please visit:

		http://dojotoolkit.org
*/

dojo.provide("jbrowse_dojo");
if(!dojo._hasResource["dojo.dnd.common"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.dnd.common"] = true;
dojo.provide("dojo.dnd.common");

dojo.getObject("dnd", true, dojo);

dojo.dnd.getCopyKeyState = dojo.isCopyKey;

dojo.dnd._uniqueId = 0;
dojo.dnd.getUniqueId = function(){
	// summary:
	//		returns a unique string for use with any DOM element
	var id;
	do{
		id = dojo._scopeName + "Unique" + (++dojo.dnd._uniqueId);
	}while(dojo.byId(id));
	return id;
};

dojo.dnd._empty = {};

dojo.dnd.isFormElement = function(/*Event*/ e){
	// summary:
	//		returns true if user clicked on a form element
	var t = e.target;
	if(t.nodeType == 3 /*TEXT_NODE*/){
		t = t.parentNode;
	}
	return " button textarea input select option ".indexOf(" " + t.tagName.toLowerCase() + " ") >= 0;	// Boolean
};

}

if(!dojo._hasResource["dojo.date.stamp"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.date.stamp"] = true;
dojo.provide("dojo.date.stamp");

dojo.getObject("date.stamp", true, dojo);

// Methods to convert dates to or from a wire (string) format using well-known conventions

dojo.date.stamp.fromISOString = function(/*String*/formattedString, /*Number?*/defaultTime){
	//	summary:
	//		Returns a Date object given a string formatted according to a subset of the ISO-8601 standard.
	//
	//	description:
	//		Accepts a string formatted according to a profile of ISO8601 as defined by
	//		[RFC3339](http://www.ietf.org/rfc/rfc3339.txt), except that partial input is allowed.
	//		Can also process dates as specified [by the W3C](http://www.w3.org/TR/NOTE-datetime)
	//		The following combinations are valid:
	//
	//			* dates only
	//			|	* yyyy
	//			|	* yyyy-MM
	//			|	* yyyy-MM-dd
	// 			* times only, with an optional time zone appended
	//			|	* THH:mm
	//			|	* THH:mm:ss
	//			|	* THH:mm:ss.SSS
	// 			* and "datetimes" which could be any combination of the above
	//
	//		timezones may be specified as Z (for UTC) or +/- followed by a time expression HH:mm
	//		Assumes the local time zone if not specified.  Does not validate.  Improperly formatted
	//		input may return null.  Arguments which are out of bounds will be handled
	// 		by the Date constructor (e.g. January 32nd typically gets resolved to February 1st)
	//		Only years between 100 and 9999 are supported.
	//
  	//	formattedString:
	//		A string such as 2005-06-30T08:05:00-07:00 or 2005-06-30 or T08:05:00
	//
	//	defaultTime:
	//		Used for defaults for fields omitted in the formattedString.
	//		Uses 1970-01-01T00:00:00.0Z by default.

	if(!dojo.date.stamp._isoRegExp){
		dojo.date.stamp._isoRegExp =
//TODO: could be more restrictive and check for 00-59, etc.
			/^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(.\d+)?)?((?:[+-](\d{2}):(\d{2}))|Z)?)?$/;
	}

	var match = dojo.date.stamp._isoRegExp.exec(formattedString),
		result = null;

	if(match){
		match.shift();
		if(match[1]){match[1]--;} // Javascript Date months are 0-based
		if(match[6]){match[6] *= 1000;} // Javascript Date expects fractional seconds as milliseconds

		if(defaultTime){
			// mix in defaultTime.  Relatively expensive, so use || operators for the fast path of defaultTime === 0
			defaultTime = new Date(defaultTime);
			dojo.forEach(dojo.map(["FullYear", "Month", "Date", "Hours", "Minutes", "Seconds", "Milliseconds"], function(prop){
				return defaultTime["get" + prop]();
			}), function(value, index){
				match[index] = match[index] || value;
			});
		}
		result = new Date(match[0]||1970, match[1]||0, match[2]||1, match[3]||0, match[4]||0, match[5]||0, match[6]||0); //TODO: UTC defaults
		if(match[0] < 100){
			result.setFullYear(match[0] || 1970);
		}

		var offset = 0,
			zoneSign = match[7] && match[7].charAt(0);
		if(zoneSign != 'Z'){
			offset = ((match[8] || 0) * 60) + (Number(match[9]) || 0);
			if(zoneSign != '-'){ offset *= -1; }
		}
		if(zoneSign){
			offset -= result.getTimezoneOffset();
		}
		if(offset){
			result.setTime(result.getTime() + offset * 60000);
		}
	}

	return result; // Date or null
};

/*=====
	dojo.date.stamp.__Options = function(){
		//	selector: String
		//		"date" or "time" for partial formatting of the Date object.
		//		Both date and time will be formatted by default.
		//	zulu: Boolean
		//		if true, UTC/GMT is used for a timezone
		//	milliseconds: Boolean
		//		if true, output milliseconds
		this.selector = selector;
		this.zulu = zulu;
		this.milliseconds = milliseconds;
	}
=====*/

dojo.date.stamp.toISOString = function(/*Date*/dateObject, /*dojo.date.stamp.__Options?*/options){
	//	summary:
	//		Format a Date object as a string according a subset of the ISO-8601 standard
	//
	//	description:
	//		When options.selector is omitted, output follows [RFC3339](http://www.ietf.org/rfc/rfc3339.txt)
	//		The local time zone is included as an offset from GMT, except when selector=='time' (time without a date)
	//		Does not check bounds.  Only years between 100 and 9999 are supported.
	//
	//	dateObject:
	//		A Date object

	var _ = function(n){ return (n < 10) ? "0" + n : n; };
	options = options || {};
	var formattedDate = [],
		getter = options.zulu ? "getUTC" : "get",
		date = "";
	if(options.selector != "time"){
		var year = dateObject[getter+"FullYear"]();
		date = ["0000".substr((year+"").length)+year, _(dateObject[getter+"Month"]()+1), _(dateObject[getter+"Date"]())].join('-');
	}
	formattedDate.push(date);
	if(options.selector != "date"){
		var time = [_(dateObject[getter+"Hours"]()), _(dateObject[getter+"Minutes"]()), _(dateObject[getter+"Seconds"]())].join(':');
		var millis = dateObject[getter+"Milliseconds"]();
		if(options.milliseconds){
			time += "."+ (millis < 100 ? "0" : "") + _(millis);
		}
		if(options.zulu){
			time += "Z";
		}else if(options.selector != "time"){
			var timezoneOffset = dateObject.getTimezoneOffset();
			var absOffset = Math.abs(timezoneOffset);
			time += (timezoneOffset > 0 ? "-" : "+") +
				_(Math.floor(absOffset/60)) + ":" + _(absOffset%60);
		}
		formattedDate.push(time);
	}
	return formattedDate.join('T'); // String
};

}

if(!dojo._hasResource["dojo.parser"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.parser"] = true;
dojo.provide("dojo.parser");



new Date("X"); // workaround for #11279, new Date("") == NaN

dojo.parser = new function(){
	// summary:
	//		The Dom/Widget parsing package

	var d = dojo;

	function val2type(/*Object*/ value){
		// summary:
		//		Returns name of type of given value.

		if(d.isString(value)){ return "string"; }
		if(typeof value == "number"){ return "number"; }
		if(typeof value == "boolean"){ return "boolean"; }
		if(d.isFunction(value)){ return "function"; }
		if(d.isArray(value)){ return "array"; } // typeof [] == "object"
		if(value instanceof Date) { return "date"; } // assume timestamp
		if(value instanceof d._Url){ return "url"; }
		return "object";
	}

	function str2obj(/*String*/ value, /*String*/ type){
		// summary:
		//		Convert given string value to given type
		switch(type){
			case "string":
				return value;
			case "number":
				return value.length ? Number(value) : NaN;
			case "boolean":
				// for checked/disabled value might be "" or "checked".	 interpret as true.
				return typeof value == "boolean" ? value : !(value.toLowerCase()=="false");
			case "function":
				if(d.isFunction(value)){
					// IE gives us a function, even when we say something like onClick="foo"
					// (in which case it gives us an invalid function "function(){ foo }").
					//	Therefore, convert to string
					value=value.toString();
					value=d.trim(value.substring(value.indexOf('{')+1, value.length-1));
				}
				try{
					if(value === "" || value.search(/[^\w\.]+/i) != -1){
						// The user has specified some text for a function like "return x+5"
						return new Function(value);
					}else{
						// The user has specified the name of a function like "myOnClick"
						// or a single word function "return"
						return d.getObject(value, false) || new Function(value);
					}
				}catch(e){ return new Function(); }
			case "array":
				return value ? value.split(/\s*,\s*/) : [];
			case "date":
				switch(value){
					case "": return new Date("");	// the NaN of dates
					case "now": return new Date();	// current date
					default: return d.date.stamp.fromISOString(value);
				}
			case "url":
				return d.baseUrl + value;
			default:
				return d.fromJson(value);
		}
	}

	var dummyClass = {}, instanceClasses = {
		// map from fully qualified name (like "dijit.Button") to structure like
		// { cls: dijit.Button, params: {label: "string", disabled: "boolean"} }
	};

	// Widgets like BorderContainer add properties to _Widget via dojo.extend().
	// If BorderContainer is loaded after _Widget's parameter list has been cached,
	// we need to refresh that parameter list (for _Widget and all widgets that extend _Widget).
	// TODO: remove this in 2.0, when we stop caching parameters.
	d.connect(d, "extend", function(){
		instanceClasses = {};
	});

	function getProtoInfo(cls, params){
		// cls: A prototype
		//		The prototype of the class to check props on
		// params: Object
		//		The parameters object to mix found parameters onto.
		for(var name in cls){
			if(name.charAt(0)=="_"){ continue; }	// skip internal properties
			if(name in dummyClass){ continue; }		// skip "constructor" and "toString"
			params[name] = val2type(cls[name]);
		}
		return params;
	}

	function getClassInfo(/*String*/ className, /*Boolean*/ skipParamsLookup){
		// summary:
		//		Maps a widget name string like "dijit.form.Button" to the widget constructor itself,
		//		and a list of that widget's parameters and their types
		// className:
		//		fully qualified name (like "dijit.form.Button")
		// returns:
		//		structure like
		//			{
		//				cls: dijit.Button,
		//				params: { label: "string", disabled: "boolean"}
		//			}

		var c = instanceClasses[className];
		if(!c){
			// get pointer to widget class
			var cls = d.getObject(className), params = null;
			if(!cls){ return null; }		// class not defined [yet]
			if(!skipParamsLookup){ // from fastpath, we don't need to lookup the attrs on the proto because they are explicit
				params = getProtoInfo(cls.prototype, {})
			}
			c = { cls: cls, params: params };
			
		}else if(!skipParamsLookup && !c.params){
			// if we're calling getClassInfo and have a cls proto, but no params info, scan that cls for params now
			// and update the pointer in instanceClasses[className]. This happens when a widget appears in another
			// widget's template which still uses dojoType, but an instance of the widget appears prior with a data-dojo-type,
			// skipping this lookup the first time.
			c.params = getProtoInfo(c.cls.prototype, {});
		}
		
		return c;
	}

	this._functionFromScript = function(script, attrData){
		// summary:
		//		Convert a <script type="dojo/method" args="a, b, c"> ... </script>
		//		into a function
		// script: DOMNode
		//		The <script> DOMNode
		// attrData: String
		//		For HTML5 compliance, searches for attrData + "args" (typically
		//		"data-dojo-args") instead of "args"
		var preamble = "";
		var suffix = "";
		var argsStr = (script.getAttribute(attrData + "args") || script.getAttribute("args"));
		if(argsStr){
			d.forEach(argsStr.split(/\s*,\s*/), function(part, idx){
				preamble += "var "+part+" = arguments["+idx+"]; ";
			});
		}
		var withStr = script.getAttribute("with");
		if(withStr && withStr.length){
			d.forEach(withStr.split(/\s*,\s*/), function(part){
				preamble += "with("+part+"){";
				suffix += "}";
			});
		}
		return new Function(preamble+script.innerHTML+suffix);
	};

	this.instantiate = function(/* Array */nodes, /* Object? */mixin, /* Object? */args){
		// summary:
		//		Takes array of nodes, and turns them into class instances and
		//		potentially calls a startup method to allow them to connect with
		//		any children.
		// nodes: Array
		//		Array of nodes or objects like
		//	|		{
		//	|			type: "dijit.form.Button",
		//	|			node: DOMNode,
		//	|			scripts: [ ... ],	// array of <script type="dojo/..."> children of node
		//	|			inherited: { ... }	// settings inherited from ancestors like dir, theme, etc.
		//	|		}
		// mixin: Object?
		//		An object that will be mixed in with each node in the array.
		//		Values in the mixin will override values in the node, if they
		//		exist.
		// args: Object?
		//		An object used to hold kwArgs for instantiation.
		//		See parse.args argument for details.

		var thelist = [],
		mixin = mixin||{};
		args = args||{};

		// TODO: for 2.0 default to data-dojo- regardless of scopeName (or maybe scopeName won't exist in 2.0)
		var attrName = (args.scope || d._scopeName) + "Type",	// typically "dojoType"
			attrData = "data-" + (args.scope || d._scopeName) + "-";	// typically "data-dojo-"

		d.forEach(nodes, function(obj){
			if(!obj){ return; }

			// Get pointers to DOMNode, dojoType string, and clsInfo (metadata about the dojoType), etc.
			var node, type, clsInfo, clazz, scripts, fastpath;
			if(obj.node){
				// new format of nodes[] array, object w/lots of properties pre-computed for me
				node = obj.node;
				type = obj.type;
				fastpath = obj.fastpath;
				clsInfo = obj.clsInfo || (type && getClassInfo(type, fastpath));
				clazz = clsInfo && clsInfo.cls;
				scripts = obj.scripts;
			}else{
				// old (backwards compatible) format of nodes[] array, simple array of DOMNodes. no fastpath/data-dojo-type support here.
				node = obj;
				type = attrName in mixin ? mixin[attrName] : node.getAttribute(attrName);
				clsInfo = type && getClassInfo(type);
				clazz = clsInfo && clsInfo.cls;
				scripts = (clazz && (clazz._noScript || clazz.prototype._noScript) ? [] :
							d.query("> script[type^='dojo/']", node));
			}
			if(!clsInfo){
				throw new Error("Could not load class '" + type);
			}

			// Setup hash to hold parameter settings for this widget.	Start with the parameter
			// settings inherited from ancestors ("dir" and "lang").
			// Inherited setting may later be overridden by explicit settings on node itself.
			var params = {};
				
			if(args.defaults){
				// settings for the document itself (or whatever subtree is being parsed)
				d._mixin(params, args.defaults);
			}
			if(obj.inherited){
				// settings from dir=rtl or lang=... on a node above this node
				d._mixin(params, obj.inherited);
			}
			
			// mix things found in data-dojo-props into the params
			if(fastpath){
				var extra = node.getAttribute(attrData + "props");
				if(extra && extra.length){
					try{
						extra = d.fromJson.call(args.propsThis, "{" + extra + "}");
						d._mixin(params, extra);
					}catch(e){
						// give the user a pointer to their invalid parameters. FIXME: can we kill this in production?
						throw new Error(e.toString() + " in data-dojo-props='" + extra + "'");
					}
				}

				// For the benefit of _Templated, check if node has data-dojo-attach-point/data-dojo-attach-event
				// and mix those in as though they were parameters
				var attachPoint = node.getAttribute(attrData + "attach-point");
				if(attachPoint){
					params.dojoAttachPoint = attachPoint;
				}
				var attachEvent = node.getAttribute(attrData + "attach-event");
				if(attachEvent){
					params.dojoAttachEvent = attachEvent;
				}
				dojo.mixin(params, mixin);
			}else{
				// FIXME: we need something like "deprecateOnce()" to throw dojo.deprecation for something.
				// remove this logic in 2.0
				// read parameters (ie, attributes) specified on DOMNode

				var attributes = node.attributes;

				// clsInfo.params lists expected params like {"checked": "boolean", "n": "number"}
				for(var name in clsInfo.params){
					var item = name in mixin ? { value:mixin[name], specified:true } : attributes.getNamedItem(name);
					if(!item || (!item.specified && (!dojo.isIE || name.toLowerCase()!="value"))){ continue; }
					var value = item.value;
					// Deal with IE quirks for 'class' and 'style'
					switch(name){
					case "class":
						value = "className" in mixin ? mixin.className : node.className;
						break;
					case "style":
						value = "style" in mixin ? mixin.style : (node.style && node.style.cssText); // FIXME: Opera?
					}
					var _type = clsInfo.params[name];
					if(typeof value == "string"){
						params[name] = str2obj(value, _type);
					}else{
						params[name] = value;
					}
				}
			}

			// Process <script type="dojo/*"> script tags
			// <script type="dojo/method" event="foo"> tags are added to params, and passed to
			// the widget on instantiation.
			// <script type="dojo/method"> tags (with no event) are executed after instantiation
			// <script type="dojo/connect" event="foo"> tags are dojo.connected after instantiation
			// note: dojo/* script tags cannot exist in self closing widgets, like <input />
			var connects = [],	// functions to connect after instantiation
				calls = [];		// functions to call after instantiation

			d.forEach(scripts, function(script){
				node.removeChild(script);
				// FIXME: drop event="" support in 2.0. use data-dojo-event="" instead
				var event = (script.getAttribute(attrData + "event") || script.getAttribute("event")),
					type = script.getAttribute("type"),
					nf = d.parser._functionFromScript(script, attrData);
				if(event){
					if(type == "dojo/connect"){
						connects.push({event: event, func: nf});
					}else{
						params[event] = nf;
					}
				}else{
					calls.push(nf);
				}
			});

			var markupFactory = clazz.markupFactory || clazz.prototype && clazz.prototype.markupFactory;
			// create the instance
			var instance = markupFactory ? markupFactory(params, node, clazz) : new clazz(params, node);
			thelist.push(instance);

			// map it to the JS namespace if that makes sense
			// FIXME: in 2.0, drop jsId support. use data-dojo-id instead
			var jsname = (node.getAttribute(attrData + "id") || node.getAttribute("jsId"));
			if(jsname){
				d.setObject(jsname, instance);
			}

			// process connections and startup functions
			d.forEach(connects, function(connect){
				d.connect(instance, connect.event, null, connect.func);
			});
			d.forEach(calls, function(func){
				func.call(instance);
			});
		});

		// Call startup on each top level instance if it makes sense (as for
		// widgets).  Parent widgets will recursively call startup on their
		// (non-top level) children
		if(!mixin._started){
			// TODO: for 2.0, when old instantiate() API is desupported, store parent-child
			// relationships in the nodes[] array so that no getParent() call is needed.
			// Note that will  require a parse() call from ContentPane setting a param that the
			// ContentPane is the parent widget (so that the parse doesn't call startup() on the
			// ContentPane's children)
			d.forEach(thelist, function(instance){
				if( !args.noStart && instance  &&
					dojo.isFunction(instance.startup) &&
					!instance._started &&
					(!instance.getParent || !instance.getParent())
				){
					instance.startup();
				}
			});
		}
		return thelist;
	};

	this.parse = function(rootNode, args){
		// summary:
		//		Scan the DOM for class instances, and instantiate them.
		//
		// description:
		//		Search specified node (or root node) recursively for class instances,
		//		and instantiate them. Searches for either data-dojo-type="Class" or
		//		dojoType="Class" where "Class" is a a fully qualified class name,
		//		like `dijit.form.Button`
		//
		//		Using `data-dojo-type`:
		//		Attributes using can be mixed into the parameters used to instantitate the
		//		Class by using a `data-dojo-props` attribute on the node being converted.
		//		`data-dojo-props` should be a string attribute to be converted from JSON.
		//
		//		Using `dojoType`:
		//		Attributes are read from the original domNode and converted to appropriate
		//		types by looking up the Class prototype values. This is the default behavior
		//		from Dojo 1.0 to Dojo 1.5. `dojoType` support is deprecated, and will
		//		go away in Dojo 2.0.
		//
		// rootNode: DomNode?
		//		A default starting root node from which to start the parsing. Can be
		//		omitted, defaulting to the entire document. If omitted, the `args`
		//		object can be passed in this place. If the `args` object has a
		//		`rootNode` member, that is used.
		//
		// args: Object
		//		a kwArgs object passed along to instantiate()
		//
		//			* noStart: Boolean?
		//				when set will prevent the parser from calling .startup()
		//				when locating the nodes.
		//			* rootNode: DomNode?
		//				identical to the function's `rootNode` argument, though
		//				allowed to be passed in via this `args object.
		//			* template: Boolean
		//				If true, ignores ContentPane's stopParser flag and parses contents inside of
		//				a ContentPane inside of a template.   This allows dojoAttachPoint on widgets/nodes
		//				nested inside the ContentPane to work.
		//			* inherited: Object
		//				Hash possibly containing dir and lang settings to be applied to
		//				parsed widgets, unless there's another setting on a sub-node that overrides
		//			* scope: String
		//				Root for attribute names to search for.   If scopeName is dojo,
		//				will search for data-dojo-type (or dojoType).   For backwards compatibility
		//				reasons defaults to dojo._scopeName (which is "dojo" except when
		//				multi-version support is used, when it will be something like dojo16, dojo20, etc.)
		//			* propsThis: Object
		//				If specified, "this" referenced from data-dojo-props will refer to propsThis.
		//				Intended for use from the widgets-in-template feature of `dijit._Templated`
		//
		// example:
		//		Parse all widgets on a page:
		//	|		dojo.parser.parse();
		//
		// example:
		//		Parse all classes within the node with id="foo"
		//	|		dojo.parser.parse(dojo.byId('foo'));
		//
		// example:
		//		Parse all classes in a page, but do not call .startup() on any
		//		child
		//	|		dojo.parser.parse({ noStart: true })
		//
		// example:
		//		Parse all classes in a node, but do not call .startup()
		//	|		dojo.parser.parse(someNode, { noStart:true });
		//	|		// or
		//	|		dojo.parser.parse({ noStart:true, rootNode: someNode });

		// determine the root node based on the passed arguments.
		var root;
		if(!args && rootNode && rootNode.rootNode){
			args = rootNode;
			root = args.rootNode;
		}else{
			root = rootNode;
		}
		root = root ? dojo.byId(root) : dojo.body();
		args = args || {};

		var attrName = (args.scope || d._scopeName) + "Type",		// typically "dojoType"
			attrData = "data-" + (args.scope || d._scopeName) + "-";	// typically "data-dojo-"

		function scan(parent, list){
			// summary:
			//		Parent is an Object representing a DOMNode, with or without a dojoType specified.
			//		Scan parent's children looking for nodes with dojoType specified, storing in list[].
			//		If parent has a dojoType, also collects <script type=dojo/*> children and stores in parent.scripts[].
			// parent: Object
			//		Object representing the parent node, like
			//	|	{
			//	|		node: DomNode,			// scan children of this node
			//	|		inherited: {dir: "rtl"},	// dir/lang setting inherited from above node
			//	|
			//	|		// attributes only set if node has dojoType specified
			//	|		scripts: [],			// empty array, put <script type=dojo/*> in here
			//	|		clsInfo: { cls: dijit.form.Button, ...}
			//	|	}
			// list: DomNode[]
			//		Output array of objects (same format as parent) representing nodes to be turned into widgets

			// Effective dir and lang settings on parent node, either set directly or inherited from grandparent
			var inherited = dojo.clone(parent.inherited);
			dojo.forEach(["dir", "lang"], function(name){
				// TODO: what if this is a widget and dir/lang are declared in data-dojo-props?
				var val = parent.node.getAttribute(name);
				if(val){
					inherited[name] = val;
				}
			});

			// if parent is a widget, then search for <script type=dojo/*> tags and put them in scripts[].
			var scripts = parent.clsInfo && !parent.clsInfo.cls.prototype._noScript ? parent.scripts : null;

			// unless parent is a widget with the stopParser flag set, continue search for dojoType, recursively
			var recurse = (!parent.clsInfo || !parent.clsInfo.cls.prototype.stopParser) || (args && args.template);

			// scan parent's children looking for dojoType and <script type=dojo/*>
			for(var child = parent.node.firstChild; child; child = child.nextSibling){
				if(child.nodeType == 1){
					// FIXME: desupport dojoType in 2.0. use data-dojo-type instead
					var type, html5 = recurse && child.getAttribute(attrData + "type");
					if(html5){
						type = html5;
					}else{
						// fallback to backward compatible mode, using dojoType. remove in 2.0
						type = recurse && child.getAttribute(attrName);
					}
					
					var fastpath = html5 == type;

					if(type){
						// if dojoType/data-dojo-type specified, add to output array of nodes to instantiate
						var params = {
							"type": type,
							fastpath: fastpath,
							clsInfo: getClassInfo(type, fastpath), // note: won't find classes declared via dojo.Declaration
							node: child,
							scripts: [], // <script> nodes that are parent's children
							inherited: inherited // dir & lang attributes inherited from parent
						};
						list.push(params);

						// Recurse, collecting <script type="dojo/..."> children, and also looking for
						// descendant nodes with dojoType specified (unless the widget has the stopParser flag),
						scan(params, list);
					}else if(scripts && child.nodeName.toLowerCase() == "script"){
						// if <script type="dojo/...">, save in scripts[]
						type = child.getAttribute("type");
						if (type && /^dojo\/\w/i.test(type)) {
							scripts.push(child);
						}
					}else if(recurse){
						// Recurse, looking for grandchild nodes with dojoType specified
						scan({
							node: child,
							inherited: inherited
						}, list);
					}
				}
			}
		}

		// Ignore bogus entries in inherited hash like {dir: ""}
		var inherited = {};
		if(args && args.inherited){
			for(var key in args.inherited){
				if(args.inherited[key]){ inherited[key] = args.inherited[key]; }
			}
		}

		// Make list of all nodes on page w/dojoType specified
		var list = [];
		scan({
			node: root,
			inherited: inherited
		}, list);

		// go build the object instances
		var mixin = args && args.template ? {template: true} : null;
		return this.instantiate(list, mixin, args); // Array
	};
}();

//Register the parser callback. It should be the first callback
//after the a11y test.

(function(){
	var parseRunner = function(){
		if(dojo.config.parseOnLoad){
			dojo.parser.parse();
		}
	};

	// FIXME: need to clobber cross-dependency!!
	if(dojo.getObject("dijit.wai.onload") === dojo._loaders[0]){
		dojo._loaders.splice(1, 0, parseRunner);
	}else{
		dojo._loaders.unshift(parseRunner);
	}
})();

}

if(!dojo._hasResource["dojo.dnd.Container"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.dnd.Container"] = true;
dojo.provide("dojo.dnd.Container");




/*
	Container states:
		""		- normal state
		"Over"	- mouse over a container
	Container item states:
		""		- normal state
		"Over"	- mouse over a container item
*/

/*=====
dojo.declare("dojo.dnd.__ContainerArgs", [], {
	creator: function(){
		// summary:
		//		a creator function, which takes a data item, and returns an object like that:
		//		{node: newNode, data: usedData, type: arrayOfStrings}
	},

	// skipForm: Boolean
	//		don't start the drag operation, if clicked on form elements
	skipForm: false,

	// dropParent: Node||String
	//		node or node's id to use as the parent node for dropped items
	//		(must be underneath the 'node' parameter in the DOM)
	dropParent: null,

	// _skipStartup: Boolean
	//		skip startup(), which collects children, for deferred initialization
	//		(this is used in the markup mode)
	_skipStartup: false
});

dojo.dnd.Item = function(){
	// summary:
	//		Represents (one of) the source node(s) being dragged.
	//		Contains (at least) the "type" and "data" attributes.
	// type: String[]
	//		Type(s) of this item, by default this is ["text"]
	// data: Object
	//		Logical representation of the object being dragged.
	//		If the drag object's type is "text" then data is a String,
	//		if it's another type then data could be a different Object,
	//		perhaps a name/value hash.
	
	this.type = type;
	this.data = data;
}
=====*/

dojo.declare("dojo.dnd.Container", null, {
	// summary:
	//		a Container object, which knows when mouse hovers over it,
	//		and over which element it hovers
	
	// object attributes (for markup)
	skipForm: false,
	
	/*=====
	// current: DomNode
	//		The DOM node the mouse is currently hovered over
	current: null,
	
	// map: Hash<String, dojo.dnd.Item>
	//		Map from an item's id (which is also the DOMNode's id) to
	//		the dojo.dnd.Item itself.
	map: {},
	=====*/
	
	constructor: function(node, params){
		// summary:
		//		a constructor of the Container
		// node: Node
		//		node or node's id to build the container on
		// params: dojo.dnd.__ContainerArgs
		//		a dictionary of parameters
		this.node = dojo.byId(node);
		if(!params){ params = {}; }
		this.creator = params.creator || null;
		this.skipForm = params.skipForm;
		this.parent = params.dropParent && dojo.byId(params.dropParent);
		
		// class-specific variables
		this.map = {};
		this.current = null;

		// states
		this.containerState = "";
		dojo.addClass(this.node, "dojoDndContainer");
		
		// mark up children
		if(!(params && params._skipStartup)){
			this.startup();
		}

		// set up events
		this.events = [
			dojo.connect(this.node, "onmouseover", this, "onMouseOver"),
			dojo.connect(this.node, "onmouseout",  this, "onMouseOut"),
			// cancel text selection and text dragging
			dojo.connect(this.node, "ondragstart",   this, "onSelectStart"),
			dojo.connect(this.node, "onselectstart", this, "onSelectStart")
		];
	},
	
	// object attributes (for markup)
	creator: function(){
		// summary:
		//		creator function, dummy at the moment
	},
	
	// abstract access to the map
	getItem: function(/*String*/ key){
		// summary:
		//		returns a data item by its key (id)
		return this.map[key];	// dojo.dnd.Item
	},
	setItem: function(/*String*/ key, /*dojo.dnd.Item*/ data){
		// summary:
		//		associates a data item with its key (id)
		this.map[key] = data;
	},
	delItem: function(/*String*/ key){
		// summary:
		//		removes a data item from the map by its key (id)
		delete this.map[key];
	},
	forInItems: function(/*Function*/ f, /*Object?*/ o){
		// summary:
		//		iterates over a data map skipping members that
		//		are present in the empty object (IE and/or 3rd-party libraries).
		o = o || dojo.global;
		var m = this.map, e = dojo.dnd._empty;
		for(var i in m){
			if(i in e){ continue; }
			f.call(o, m[i], i, this);
		}
		return o;	// Object
	},
	clearItems: function(){
		// summary:
		//		removes all data items from the map
		this.map = {};
	},
	
	// methods
	getAllNodes: function(){
		// summary:
		//		returns a list (an array) of all valid child nodes
		return dojo.query("> .dojoDndItem", this.parent);	// NodeList
	},
	sync: function(){
		// summary:
		//		sync up the node list with the data map
		var map = {};
		this.getAllNodes().forEach(function(node){
			if(node.id){
				var item = this.getItem(node.id);
				if(item){
					map[node.id] = item;
					return;
				}
			}else{
				node.id = dojo.dnd.getUniqueId();
			}
			var type = node.getAttribute("dndType"),
				data = node.getAttribute("dndData");
			map[node.id] = {
				data: data || node.innerHTML,
				type: type ? type.split(/\s*,\s*/) : ["text"]
			};
		}, this);
		this.map = map;
		return this;	// self
	},
	insertNodes: function(data, before, anchor){
		// summary:
		//		inserts an array of new nodes before/after an anchor node
		// data: Array
		//		a list of data items, which should be processed by the creator function
		// before: Boolean
		//		insert before the anchor, if true, and after the anchor otherwise
		// anchor: Node
		//		the anchor node to be used as a point of insertion
		if(!this.parent.firstChild){
			anchor = null;
		}else if(before){
			if(!anchor){
				anchor = this.parent.firstChild;
			}
		}else{
			if(anchor){
				anchor = anchor.nextSibling;
			}
		}
		if(anchor){
			for(var i = 0; i < data.length; ++i){
				var t = this._normalizedCreator(data[i]);
				this.setItem(t.node.id, {data: t.data, type: t.type});
				this.parent.insertBefore(t.node, anchor);
			}
		}else{
			for(var i = 0; i < data.length; ++i){
				var t = this._normalizedCreator(data[i]);
				this.setItem(t.node.id, {data: t.data, type: t.type});
				this.parent.appendChild(t.node);
			}
		}
		return this;	// self
	},
	destroy: function(){
		// summary:
		//		prepares this object to be garbage-collected
		dojo.forEach(this.events, dojo.disconnect);
		this.clearItems();
		this.node = this.parent = this.current = null;
	},

	// markup methods
	markupFactory: function(params, node){
		params._skipStartup = true;
		return new dojo.dnd.Container(node, params);
	},
	startup: function(){
		// summary:
		//		collects valid child items and populate the map
		
		// set up the real parent node
		if(!this.parent){
			// use the standard algorithm, if not assigned
			this.parent = this.node;
			if(this.parent.tagName.toLowerCase() == "table"){
				var c = this.parent.getElementsByTagName("tbody");
				if(c && c.length){ this.parent = c[0]; }
			}
		}
		this.defaultCreator = dojo.dnd._defaultCreator(this.parent);

		// process specially marked children
		this.sync();
	},

	// mouse events
	onMouseOver: function(e){
		// summary:
		//		event processor for onmouseover
		// e: Event
		//		mouse event
		var n = e.relatedTarget;
		while(n){
			if(n == this.node){ break; }
			try{
				n = n.parentNode;
			}catch(x){
				n = null;
			}
		}
		if(!n){
			this._changeState("Container", "Over");
			this.onOverEvent();
		}
		n = this._getChildByEvent(e);
		if(this.current == n){ return; }
		if(this.current){ this._removeItemClass(this.current, "Over"); }
		if(n){ this._addItemClass(n, "Over"); }
		this.current = n;
	},
	onMouseOut: function(e){
		// summary:
		//		event processor for onmouseout
		// e: Event
		//		mouse event
		for(var n = e.relatedTarget; n;){
			if(n == this.node){ return; }
			try{
				n = n.parentNode;
			}catch(x){
				n = null;
			}
		}
		if(this.current){
			this._removeItemClass(this.current, "Over");
			this.current = null;
		}
		this._changeState("Container", "");
		this.onOutEvent();
	},
	onSelectStart: function(e){
		// summary:
		//		event processor for onselectevent and ondragevent
		// e: Event
		//		mouse event
		if(!this.skipForm || !dojo.dnd.isFormElement(e)){
			dojo.stopEvent(e);
		}
	},
	
	// utilities
	onOverEvent: function(){
		// summary:
		//		this function is called once, when mouse is over our container
	},
	onOutEvent: function(){
		// summary:
		//		this function is called once, when mouse is out of our container
	},
	_changeState: function(type, newState){
		// summary:
		//		changes a named state to new state value
		// type: String
		//		a name of the state to change
		// newState: String
		//		new state
		var prefix = "dojoDnd" + type;
		var state  = type.toLowerCase() + "State";
		//dojo.replaceClass(this.node, prefix + newState, prefix + this[state]);
		dojo.replaceClass(this.node, prefix + newState, prefix + this[state]);
		this[state] = newState;
	},
	_addItemClass: function(node, type){
		// summary:
		//		adds a class with prefix "dojoDndItem"
		// node: Node
		//		a node
		// type: String
		//		a variable suffix for a class name
		dojo.addClass(node, "dojoDndItem" + type);
	},
	_removeItemClass: function(node, type){
		// summary:
		//		removes a class with prefix "dojoDndItem"
		// node: Node
		//		a node
		// type: String
		//		a variable suffix for a class name
		dojo.removeClass(node, "dojoDndItem" + type);
	},
	_getChildByEvent: function(e){
		// summary:
		//		gets a child, which is under the mouse at the moment, or null
		// e: Event
		//		a mouse event
		var node = e.target;
		if(node){
			for(var parent = node.parentNode; parent; node = parent, parent = node.parentNode){
				if(parent == this.parent && dojo.hasClass(node, "dojoDndItem")){ return node; }
			}
		}
		return null;
	},
	_normalizedCreator: function(/*dojo.dnd.Item*/ item, /*String*/ hint){
		// summary:
		//		adds all necessary data to the output of the user-supplied creator function
		var t = (this.creator || this.defaultCreator).call(this, item, hint);
		if(!dojo.isArray(t.type)){ t.type = ["text"]; }
		if(!t.node.id){ t.node.id = dojo.dnd.getUniqueId(); }
		dojo.addClass(t.node, "dojoDndItem");
		return t;
	}
});

dojo.dnd._createNode = function(tag){
	// summary:
	//		returns a function, which creates an element of given tag
	//		(SPAN by default) and sets its innerHTML to given text
	// tag: String
	//		a tag name or empty for SPAN
	if(!tag){ return dojo.dnd._createSpan; }
	return function(text){	// Function
		return dojo.create(tag, {innerHTML: text});	// Node
	};
};

dojo.dnd._createTrTd = function(text){
	// summary:
	//		creates a TR/TD structure with given text as an innerHTML of TD
	// text: String
	//		a text for TD
	var tr = dojo.create("tr");
	dojo.create("td", {innerHTML: text}, tr);
	return tr;	// Node
};

dojo.dnd._createSpan = function(text){
	// summary:
	//		creates a SPAN element with given text as its innerHTML
	// text: String
	//		a text for SPAN
	return dojo.create("span", {innerHTML: text});	// Node
};

// dojo.dnd._defaultCreatorNodes: Object
//		a dictionary that maps container tag names to child tag names
dojo.dnd._defaultCreatorNodes = {ul: "li", ol: "li", div: "div", p: "div"};

dojo.dnd._defaultCreator = function(node){
	// summary:
	//		takes a parent node, and returns an appropriate creator function
	// node: Node
	//		a container node
	var tag = node.tagName.toLowerCase();
	var c = tag == "tbody" || tag == "thead" ? dojo.dnd._createTrTd :
			dojo.dnd._createNode(dojo.dnd._defaultCreatorNodes[tag]);
	return function(item, hint){	// Function
		var isObj = item && dojo.isObject(item), data, type, n;
		if(isObj && item.tagName && item.nodeType && item.getAttribute){
			// process a DOM node
			data = item.getAttribute("dndData") || item.innerHTML;
			type = item.getAttribute("dndType");
			type = type ? type.split(/\s*,\s*/) : ["text"];
			n = item;	// this node is going to be moved rather than copied
		}else{
			// process a DnD item object or a string
			data = (isObj && item.data) ? item.data : item;
			type = (isObj && item.type) ? item.type : ["text"];
			n = (hint == "avatar" ? dojo.dnd._createSpan : c)(String(data));
		}
		if(!n.id){
			n.id = dojo.dnd.getUniqueId();
		}
		return {node: n, data: data, type: type};
	};
};

}

if(!dojo._hasResource["dojo.dnd.Selector"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.dnd.Selector"] = true;
dojo.provide("dojo.dnd.Selector");




/*
	Container item states:
		""			- an item is not selected
		"Selected"	- an item is selected
		"Anchor"	- an item is selected, and is an anchor for a "shift" selection
*/

/*=====
dojo.declare("dojo.dnd.__SelectorArgs", [dojo.dnd.__ContainerArgs], {
	//	singular: Boolean
	//		allows selection of only one element, if true
	singular: false,

	//	autoSync: Boolean
	//		autosynchronizes the source with its list of DnD nodes,
	autoSync: false
});
=====*/

dojo.declare("dojo.dnd.Selector", dojo.dnd.Container, {
	// summary:
	//		a Selector object, which knows how to select its children
	
	/*=====
	// selection: Set<String>
	//		The set of id's that are currently selected, such that this.selection[id] == 1
	//		if the node w/that id is selected.  Can iterate over selected node's id's like:
	//	|		for(var id in this.selection)
	selection: {},
	=====*/

	constructor: function(node, params){
		// summary:
		//		constructor of the Selector
		// node: Node||String
		//		node or node's id to build the selector on
		// params: dojo.dnd.__SelectorArgs?
		//		a dictionary of parameters
		if(!params){ params = {}; }
		this.singular = params.singular;
		this.autoSync = params.autoSync;
		// class-specific variables
		this.selection = {};
		this.anchor = null;
		this.simpleSelection = false;
		// set up events
		this.events.push(
			dojo.connect(this.node, "onmousedown", this, "onMouseDown"),
			dojo.connect(this.node, "onmouseup",   this, "onMouseUp"));
	},
	
	// object attributes (for markup)
	singular: false,	// is singular property
	
	// methods
	getSelectedNodes: function(){
		// summary:
		//		returns a list (an array) of selected nodes
		var t = new dojo.NodeList();
		var e = dojo.dnd._empty;
		for(var i in this.selection){
			if(i in e){ continue; }
			t.push(dojo.byId(i));
		}
		return t;	// NodeList
	},
	selectNone: function(){
		// summary:
		//		unselects all items
		return this._removeSelection()._removeAnchor();	// self
	},
	selectAll: function(){
		// summary:
		//		selects all items
		this.forInItems(function(data, id){
			this._addItemClass(dojo.byId(id), "Selected");
			this.selection[id] = 1;
		}, this);
		return this._removeAnchor();	// self
	},
	deleteSelectedNodes: function(){
		// summary:
		//		deletes all selected items
		var e = dojo.dnd._empty;
		for(var i in this.selection){
			if(i in e){ continue; }
			var n = dojo.byId(i);
			this.delItem(i);
			dojo.destroy(n);
		}
		this.anchor = null;
		this.selection = {};
		return this;	// self
	},
	forInSelectedItems: function(/*Function*/ f, /*Object?*/ o){
		// summary:
		//		iterates over selected items;
		//		see `dojo.dnd.Container.forInItems()` for details
		o = o || dojo.global;
		var s = this.selection, e = dojo.dnd._empty;
		for(var i in s){
			if(i in e){ continue; }
			f.call(o, this.getItem(i), i, this);
		}
	},
	sync: function(){
		// summary:
		//		sync up the node list with the data map
		
		dojo.dnd.Selector.superclass.sync.call(this);
		
		// fix the anchor
		if(this.anchor){
			if(!this.getItem(this.anchor.id)){
				this.anchor = null;
			}
		}
		
		// fix the selection
		var t = [], e = dojo.dnd._empty;
		for(var i in this.selection){
			if(i in e){ continue; }
			if(!this.getItem(i)){
				t.push(i);
			}
		}
		dojo.forEach(t, function(i){
			delete this.selection[i];
		}, this);
		
		return this;	// self
	},
	insertNodes: function(addSelected, data, before, anchor){
		// summary:
		//		inserts new data items (see `dojo.dnd.Container.insertNodes()` method for details)
		// addSelected: Boolean
		//		all new nodes will be added to selected items, if true, no selection change otherwise
		// data: Array
		//		a list of data items, which should be processed by the creator function
		// before: Boolean
		//		insert before the anchor, if true, and after the anchor otherwise
		// anchor: Node
		//		the anchor node to be used as a point of insertion
		var oldCreator = this._normalizedCreator;
		this._normalizedCreator = function(item, hint){
			var t = oldCreator.call(this, item, hint);
			if(addSelected){
				if(!this.anchor){
					this.anchor = t.node;
					this._removeItemClass(t.node, "Selected");
					this._addItemClass(this.anchor, "Anchor");
				}else if(this.anchor != t.node){
					this._removeItemClass(t.node, "Anchor");
					this._addItemClass(t.node, "Selected");
				}
				this.selection[t.node.id] = 1;
			}else{
				this._removeItemClass(t.node, "Selected");
				this._removeItemClass(t.node, "Anchor");
			}
			return t;
		};
		dojo.dnd.Selector.superclass.insertNodes.call(this, data, before, anchor);
		this._normalizedCreator = oldCreator;
		return this;	// self
	},
	destroy: function(){
		// summary:
		//		prepares the object to be garbage-collected
		dojo.dnd.Selector.superclass.destroy.call(this);
		this.selection = this.anchor = null;
	},

	// markup methods
	markupFactory: function(params, node){
		params._skipStartup = true;
		return new dojo.dnd.Selector(node, params);
	},

	// mouse events
	onMouseDown: function(e){
		// summary:
		//		event processor for onmousedown
		// e: Event
		//		mouse event
		if(this.autoSync){ this.sync(); }
		if(!this.current){ return; }
		if(!this.singular && !dojo.isCopyKey(e) && !e.shiftKey && (this.current.id in this.selection)){
			this.simpleSelection = true;
			if(e.button === dojo.mouseButtons.LEFT){
				// accept the left button and stop the event
				// for IE we don't stop event when multiple buttons are pressed
				dojo.stopEvent(e);
			}
			return;
		}
		if(!this.singular && e.shiftKey){
			if(!dojo.isCopyKey(e)){
				this._removeSelection();
			}
			var c = this.getAllNodes();
			if(c.length){
				if(!this.anchor){
					this.anchor = c[0];
					this._addItemClass(this.anchor, "Anchor");
				}
				this.selection[this.anchor.id] = 1;
				if(this.anchor != this.current){
					var i = 0;
					for(; i < c.length; ++i){
						var node = c[i];
						if(node == this.anchor || node == this.current){ break; }
					}
					for(++i; i < c.length; ++i){
						var node = c[i];
						if(node == this.anchor || node == this.current){ break; }
						this._addItemClass(node, "Selected");
						this.selection[node.id] = 1;
					}
					this._addItemClass(this.current, "Selected");
					this.selection[this.current.id] = 1;
				}
			}
		}else{
			if(this.singular){
				if(this.anchor == this.current){
					if(dojo.isCopyKey(e)){
						this.selectNone();
					}
				}else{
					this.selectNone();
					this.anchor = this.current;
					this._addItemClass(this.anchor, "Anchor");
					this.selection[this.current.id] = 1;
				}
			}else{
				if(dojo.isCopyKey(e)){
					if(this.anchor == this.current){
						delete this.selection[this.anchor.id];
						this._removeAnchor();
					}else{
						if(this.current.id in this.selection){
							this._removeItemClass(this.current, "Selected");
							delete this.selection[this.current.id];
						}else{
							if(this.anchor){
								this._removeItemClass(this.anchor, "Anchor");
								this._addItemClass(this.anchor, "Selected");
							}
							this.anchor = this.current;
							this._addItemClass(this.current, "Anchor");
							this.selection[this.current.id] = 1;
						}
					}
				}else{
					if(!(this.current.id in this.selection)){
						this.selectNone();
						this.anchor = this.current;
						this._addItemClass(this.current, "Anchor");
						this.selection[this.current.id] = 1;
					}
				}
			}
		}
		dojo.stopEvent(e);
	},
	onMouseUp: function(e){
		// summary:
		//		event processor for onmouseup
		// e: Event
		//		mouse event
		if(!this.simpleSelection){ return; }
		this.simpleSelection = false;
		this.selectNone();
		if(this.current){
			this.anchor = this.current;
			this._addItemClass(this.anchor, "Anchor");
			this.selection[this.current.id] = 1;
		}
	},
	onMouseMove: function(e){
		// summary
		//		event processor for onmousemove
		// e: Event
		//		mouse event
		this.simpleSelection = false;
	},
	
	// utilities
	onOverEvent: function(){
		// summary:
		//		this function is called once, when mouse is over our container
		this.onmousemoveEvent = dojo.connect(this.node, "onmousemove", this, "onMouseMove");
	},
	onOutEvent: function(){
		// summary:
		//		this function is called once, when mouse is out of our container
		dojo.disconnect(this.onmousemoveEvent);
		delete this.onmousemoveEvent;
	},
	_removeSelection: function(){
		// summary:
		//		unselects all items
		var e = dojo.dnd._empty;
		for(var i in this.selection){
			if(i in e){ continue; }
			var node = dojo.byId(i);
			if(node){ this._removeItemClass(node, "Selected"); }
		}
		this.selection = {};
		return this;	// self
	},
	_removeAnchor: function(){
		if(this.anchor){
			this._removeItemClass(this.anchor, "Anchor");
			this.anchor = null;
		}
		return this;	// self
	}
});

}

if(!dojo._hasResource["dojo.window"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.window"] = true;
dojo.provide("dojo.window");

dojo.getObject("window", true, dojo);

dojo.window.getBox = function(){
	// summary:
	//		Returns the dimensions and scroll position of the viewable area of a browser window

	var scrollRoot = (dojo.doc.compatMode == 'BackCompat') ? dojo.body() : dojo.doc.documentElement;

	// get scroll position
	var scroll = dojo._docScroll(); // scrollRoot.scrollTop/Left should work
	return { w: scrollRoot.clientWidth, h: scrollRoot.clientHeight, l: scroll.x, t: scroll.y };
};

dojo.window.get = function(doc){
	// summary:
	// 		Get window object associated with document doc

	// In some IE versions (at least 6.0), document.parentWindow does not return a
	// reference to the real window object (maybe a copy), so we must fix it as well
	// We use IE specific execScript to attach the real window reference to
	// document._parentWindow for later use
	if(dojo.isIE && window !== document.parentWindow){
		/*
		In IE 6, only the variable "window" can be used to connect events (others
		may be only copies).
		*/
		doc.parentWindow.execScript("document._parentWindow = window;", "Javascript");
		//to prevent memory leak, unset it after use
		//another possibility is to add an onUnload handler which seems overkill to me (liucougar)
		var win = doc._parentWindow;
		doc._parentWindow = null;
		return win;	//	Window
	}

	return doc.parentWindow || doc.defaultView;	//	Window
};

dojo.window.scrollIntoView = function(/*DomNode*/ node, /*Object?*/ pos){
	// summary:
	//		Scroll the passed node into view, if it is not already.
	
	// don't rely on node.scrollIntoView working just because the function is there

	try{ // catch unexpected/unrecreatable errors (#7808) since we can recover using a semi-acceptable native method
		node = dojo.byId(node);
		var doc = node.ownerDocument || dojo.doc,
			body = doc.body || dojo.body(),
			html = doc.documentElement || body.parentNode,
			isIE = dojo.isIE, isWK = dojo.isWebKit;
		// if an untested browser, then use the native method
		if((!(dojo.isMoz || isIE || isWK || dojo.isOpera) || node == body || node == html) && (typeof node.scrollIntoView != "undefined")){
			node.scrollIntoView(false); // short-circuit to native if possible
			return;
		}
		var backCompat = doc.compatMode == 'BackCompat',
			clientAreaRoot = (isIE >= 9 && node.ownerDocument.parentWindow.frameElement)
				? ((html.clientHeight > 0 && html.clientWidth > 0 && (body.clientHeight == 0 || body.clientWidth == 0 || body.clientHeight > html.clientHeight || body.clientWidth > html.clientWidth)) ? html : body)
				: (backCompat ? body : html),
			scrollRoot = isWK ? body : clientAreaRoot,
			rootWidth = clientAreaRoot.clientWidth,
			rootHeight = clientAreaRoot.clientHeight,
			rtl = !dojo._isBodyLtr(),
			nodePos = pos || dojo.position(node),
			el = node.parentNode,
			isFixed = function(el){
				return ((isIE <= 6 || (isIE && backCompat))? false : (dojo.style(el, 'position').toLowerCase() == "fixed"));
			};
		if(isFixed(node)){ return; } // nothing to do

		while(el){
			if(el == body){ el = scrollRoot; }
			var elPos = dojo.position(el),
				fixedPos = isFixed(el);
	
			if(el == scrollRoot){
				elPos.w = rootWidth; elPos.h = rootHeight;
				if(scrollRoot == html && isIE && rtl){ elPos.x += scrollRoot.offsetWidth-elPos.w; } // IE workaround where scrollbar causes negative x
				if(elPos.x < 0 || !isIE){ elPos.x = 0; } // IE can have values > 0
				if(elPos.y < 0 || !isIE){ elPos.y = 0; }
			}else{
				var pb = dojo._getPadBorderExtents(el);
				elPos.w -= pb.w; elPos.h -= pb.h; elPos.x += pb.l; elPos.y += pb.t;
				var clientSize = el.clientWidth,
					scrollBarSize = elPos.w - clientSize;
				if(clientSize > 0 && scrollBarSize > 0){
					elPos.w = clientSize;
					elPos.x += (rtl && (isIE || el.clientLeft > pb.l/*Chrome*/)) ? scrollBarSize : 0;
				}
				clientSize = el.clientHeight;
				scrollBarSize = elPos.h - clientSize;
				if(clientSize > 0 && scrollBarSize > 0){
					elPos.h = clientSize;
				}
			}
			if(fixedPos){ // bounded by viewport, not parents
				if(elPos.y < 0){
					elPos.h += elPos.y; elPos.y = 0;
				}
				if(elPos.x < 0){
					elPos.w += elPos.x; elPos.x = 0;
				}
				if(elPos.y + elPos.h > rootHeight){
					elPos.h = rootHeight - elPos.y;
				}
				if(elPos.x + elPos.w > rootWidth){
					elPos.w = rootWidth - elPos.x;
				}
			}
			// calculate overflow in all 4 directions
			var l = nodePos.x - elPos.x, // beyond left: < 0
				t = nodePos.y - Math.max(elPos.y, 0), // beyond top: < 0
				r = l + nodePos.w - elPos.w, // beyond right: > 0
				bot = t + nodePos.h - elPos.h; // beyond bottom: > 0
			if(r * l > 0){
				var s = Math[l < 0? "max" : "min"](l, r);
				if(rtl && ((isIE == 8 && !backCompat) || isIE >= 9)){ s = -s; }
				nodePos.x += el.scrollLeft;
				el.scrollLeft += s;
				nodePos.x -= el.scrollLeft;
			}
			if(bot * t > 0){
				nodePos.y += el.scrollTop;
				el.scrollTop += Math[t < 0? "max" : "min"](t, bot);
				nodePos.y -= el.scrollTop;
			}
			el = (el != scrollRoot) && !fixedPos && el.parentNode;
		}
	}catch(error){
		console.error('scrollIntoView: ' + error);
		node.scrollIntoView(false);
	}
};

}

if(!dojo._hasResource["dojo.dnd.autoscroll"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.dnd.autoscroll"] = true;
dojo.provide("dojo.dnd.autoscroll");


dojo.getObject("dnd", true, dojo);

dojo.dnd.getViewport = dojo.window.getBox;

dojo.dnd.V_TRIGGER_AUTOSCROLL = 32;
dojo.dnd.H_TRIGGER_AUTOSCROLL = 32;

dojo.dnd.V_AUTOSCROLL_VALUE = 16;
dojo.dnd.H_AUTOSCROLL_VALUE = 16;

dojo.dnd.autoScroll = function(e){
	// summary:
	//		a handler for onmousemove event, which scrolls the window, if
	//		necesary
	// e: Event
	//		onmousemove event

	// FIXME: needs more docs!
	var v = dojo.window.getBox(), dx = 0, dy = 0;
	if(e.clientX < dojo.dnd.H_TRIGGER_AUTOSCROLL){
		dx = -dojo.dnd.H_AUTOSCROLL_VALUE;
	}else if(e.clientX > v.w - dojo.dnd.H_TRIGGER_AUTOSCROLL){
		dx = dojo.dnd.H_AUTOSCROLL_VALUE;
	}
	if(e.clientY < dojo.dnd.V_TRIGGER_AUTOSCROLL){
		dy = -dojo.dnd.V_AUTOSCROLL_VALUE;
	}else if(e.clientY > v.h - dojo.dnd.V_TRIGGER_AUTOSCROLL){
		dy = dojo.dnd.V_AUTOSCROLL_VALUE;
	}
	window.scrollBy(dx, dy);
};

dojo.dnd._validNodes = {"div": 1, "p": 1, "td": 1};
dojo.dnd._validOverflow = {"auto": 1, "scroll": 1};

dojo.dnd.autoScrollNodes = function(e){
	// summary:
	//		a handler for onmousemove event, which scrolls the first avaialble
	//		Dom element, it falls back to dojo.dnd.autoScroll()
	// e: Event
	//		onmousemove event

	// FIXME: needs more docs!
	for(var n = e.target; n;){
		if(n.nodeType == 1 && (n.tagName.toLowerCase() in dojo.dnd._validNodes)){
			var s = dojo.getComputedStyle(n);
			if(s.overflow.toLowerCase() in dojo.dnd._validOverflow){
				var b = dojo._getContentBox(n, s), t = dojo.position(n, true);
				//console.log(b.l, b.t, t.x, t.y, n.scrollLeft, n.scrollTop);
				var w = Math.min(dojo.dnd.H_TRIGGER_AUTOSCROLL, b.w / 2),
					h = Math.min(dojo.dnd.V_TRIGGER_AUTOSCROLL, b.h / 2),
					rx = e.pageX - t.x, ry = e.pageY - t.y, dx = 0, dy = 0;
				if(dojo.isWebKit || dojo.isOpera){
					// FIXME: this code should not be here, it should be taken into account
					// either by the event fixing code, or the dojo.position()
					// FIXME: this code doesn't work on Opera 9.5 Beta
					rx += dojo.body().scrollLeft;
					ry += dojo.body().scrollTop;
				}
				if(rx > 0 && rx < b.w){
					if(rx < w){
						dx = -w;
					}else if(rx > b.w - w){
						dx = w;
					}
				}
				//console.log("ry =", ry, "b.h =", b.h, "h =", h);
				if(ry > 0 && ry < b.h){
					if(ry < h){
						dy = -h;
					}else if(ry > b.h - h){
						dy = h;
					}
				}
				var oldLeft = n.scrollLeft, oldTop = n.scrollTop;
				n.scrollLeft = n.scrollLeft + dx;
				n.scrollTop  = n.scrollTop  + dy;
				if(oldLeft != n.scrollLeft || oldTop != n.scrollTop){ return; }
			}
		}
		try{
			n = n.parentNode;
		}catch(x){
			n = null;
		}
	}
	dojo.dnd.autoScroll(e);
};

}

if(!dojo._hasResource["dojo.dnd.Avatar"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.dnd.Avatar"] = true;
dojo.provide("dojo.dnd.Avatar");



dojo.declare("dojo.dnd.Avatar", null, {
	// summary:
	//		Object that represents transferred DnD items visually
	// manager: Object
	//		a DnD manager object

	constructor: function(manager){
		this.manager = manager;
		this.construct();
	},

	// methods
	construct: function(){
		// summary:
		//		constructor function;
		//		it is separate so it can be (dynamically) overwritten in case of need
		this.isA11y = dojo.hasClass(dojo.body(),"dijit_a11y");
		var a = dojo.create("table", {
				"class": "dojoDndAvatar",
				style: {
					position: "absolute",
					zIndex:   "1999",
					margin:   "0px"
				}
			}),
			source = this.manager.source, node,
			b = dojo.create("tbody", null, a),
			tr = dojo.create("tr", null, b),
			td = dojo.create("td", null, tr),
			icon = this.isA11y ? dojo.create("span", {
						id : "a11yIcon",
						innerHTML : this.manager.copy ? '+' : "<"
					}, td) : null,
			span = dojo.create("span", {
				innerHTML: source.generateText ? this._generateText() : ""
			}, td),
			k = Math.min(5, this.manager.nodes.length), i = 0;
		// we have to set the opacity on IE only after the node is live
		dojo.attr(tr, {
			"class": "dojoDndAvatarHeader",
			style: {opacity: 0.9}
		});
		for(; i < k; ++i){
			if(source.creator){
				// create an avatar representation of the node
				node = source._normalizedCreator(source.getItem(this.manager.nodes[i].id).data, "avatar").node;
			}else{
				// or just clone the node and hope it works
				node = this.manager.nodes[i].cloneNode(true);
				if(node.tagName.toLowerCase() == "tr"){
					// insert extra table nodes
					var table = dojo.create("table"),
						tbody = dojo.create("tbody", null, table);
					tbody.appendChild(node);
					node = table;
				}
			}
			node.id = "";
			tr = dojo.create("tr", null, b);
			td = dojo.create("td", null, tr);
			td.appendChild(node);
			dojo.attr(tr, {
				"class": "dojoDndAvatarItem",
				style: {opacity: (9 - i) / 10}
			});
		}
		this.node = a;
	},
	destroy: function(){
		// summary:
		//		destructor for the avatar; called to remove all references so it can be garbage-collected
		dojo.destroy(this.node);
		this.node = false;
	},
	update: function(){
		// summary:
		//		updates the avatar to reflect the current DnD state
		dojo[(this.manager.canDropFlag ? "add" : "remove") + "Class"](this.node, "dojoDndAvatarCanDrop");
		if (this.isA11y){
			var icon = dojo.byId("a11yIcon");
			var text = '+';   // assume canDrop && copy
			if (this.manager.canDropFlag && !this.manager.copy) {
				text = '< '; // canDrop && move
			}else if (!this.manager.canDropFlag && !this.manager.copy) {
				text = "o"; //!canDrop && move
			}else if(!this.manager.canDropFlag){
				text = 'x';  // !canDrop && copy
			}
			icon.innerHTML=text;
		}
		// replace text
		dojo.query(("tr.dojoDndAvatarHeader td span" +(this.isA11y ? " span" : "")), this.node).forEach(
			function(node){
				node.innerHTML = this._generateText();
			}, this);
	},
	_generateText: function(){
		// summary: generates a proper text to reflect copying or moving of items
		return this.manager.nodes.length.toString();
	}
});

}

if(!dojo._hasResource["dojo.dnd.Manager"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.dnd.Manager"] = true;
dojo.provide("dojo.dnd.Manager");





dojo.declare("dojo.dnd.Manager", null, {
	// summary:
	//		the manager of DnD operations (usually a singleton)
	constructor: function(){
		this.avatar  = null;
		this.source = null;
		this.nodes = [];
		this.copy  = true;
		this.target = null;
		this.canDropFlag = false;
		this.events = [];
	},

	// avatar's offset from the mouse
	OFFSET_X: 16,
	OFFSET_Y: 16,
	
	// methods
	overSource: function(source){
		// summary:
		//		called when a source detected a mouse-over condition
		// source: Object
		//		the reporter
		if(this.avatar){
			this.target = (source && source.targetState != "Disabled") ? source : null;
			this.canDropFlag = Boolean(this.target);
			this.avatar.update();
		}
		dojo.publish("/dnd/source/over", [source]);
	},
	outSource: function(source){
		// summary:
		//		called when a source detected a mouse-out condition
		// source: Object
		//		the reporter
		if(this.avatar){
			if(this.target == source){
				this.target = null;
				this.canDropFlag = false;
				this.avatar.update();
				dojo.publish("/dnd/source/over", [null]);
			}
		}else{
			dojo.publish("/dnd/source/over", [null]);
		}
	},
	startDrag: function(source, nodes, copy){
		// summary:
		//		called to initiate the DnD operation
		// source: Object
		//		the source which provides items
		// nodes: Array
		//		the list of transferred items
		// copy: Boolean
		//		copy items, if true, move items otherwise
		this.source = source;
		this.nodes  = nodes;
		this.copy   = Boolean(copy); // normalizing to true boolean
		this.avatar = this.makeAvatar();
		dojo.body().appendChild(this.avatar.node);
		dojo.publish("/dnd/start", [source, nodes, this.copy]);
		this.events = [
			dojo.connect(dojo.doc, "onmousemove", this, "onMouseMove"),
			dojo.connect(dojo.doc, "onmouseup",   this, "onMouseUp"),
			dojo.connect(dojo.doc, "onkeydown",   this, "onKeyDown"),
			dojo.connect(dojo.doc, "onkeyup",     this, "onKeyUp"),
			// cancel text selection and text dragging
			dojo.connect(dojo.doc, "ondragstart",   dojo.stopEvent),
			dojo.connect(dojo.body(), "onselectstart", dojo.stopEvent)
		];
		var c = "dojoDnd" + (copy ? "Copy" : "Move");
		dojo.addClass(dojo.body(), c);
	},
	canDrop: function(flag){
		// summary:
		//		called to notify if the current target can accept items
		var canDropFlag = Boolean(this.target && flag);
		if(this.canDropFlag != canDropFlag){
			this.canDropFlag = canDropFlag;
			this.avatar.update();
		}
	},
	stopDrag: function(){
		// summary:
		//		stop the DnD in progress
		dojo.removeClass(dojo.body(), ["dojoDndCopy", "dojoDndMove"]);
		dojo.forEach(this.events, dojo.disconnect);
		this.events = [];
		this.avatar.destroy();
		this.avatar = null;
		this.source = this.target = null;
		this.nodes = [];
	},
	makeAvatar: function(){
		// summary:
		//		makes the avatar; it is separate to be overwritten dynamically, if needed
		return new dojo.dnd.Avatar(this);
	},
	updateAvatar: function(){
		// summary:
		//		updates the avatar; it is separate to be overwritten dynamically, if needed
		this.avatar.update();
	},
	
	// mouse event processors
	onMouseMove: function(e){
		// summary:
		//		event processor for onmousemove
		// e: Event
		//		mouse event
		var a = this.avatar;
		if(a){
			dojo.dnd.autoScrollNodes(e);
			//dojo.dnd.autoScroll(e);
			var s = a.node.style;
			s.left = (e.pageX + this.OFFSET_X) + "px";
			s.top  = (e.pageY + this.OFFSET_Y) + "px";
			var copy = Boolean(this.source.copyState(dojo.isCopyKey(e)));
			if(this.copy != copy){
				this._setCopyStatus(copy);
			}
		}
	},
	onMouseUp: function(e){
		// summary:
		//		event processor for onmouseup
		// e: Event
		//		mouse event
		if(this.avatar){
			if(this.target && this.canDropFlag){
				var copy = Boolean(this.source.copyState(dojo.isCopyKey(e))),
				params = [this.source, this.nodes, copy, this.target, e];
				dojo.publish("/dnd/drop/before", params);
				dojo.publish("/dnd/drop", params);
			}else{
				dojo.publish("/dnd/cancel");
			}
			this.stopDrag();
		}
	},
	
	// keyboard event processors
	onKeyDown: function(e){
		// summary:
		//		event processor for onkeydown:
		//		watching for CTRL for copy/move status, watching for ESCAPE to cancel the drag
		// e: Event
		//		keyboard event
		if(this.avatar){
			switch(e.keyCode){
				case dojo.keys.CTRL:
					var copy = Boolean(this.source.copyState(true));
					if(this.copy != copy){
						this._setCopyStatus(copy);
					}
					break;
				case dojo.keys.ESCAPE:
					dojo.publish("/dnd/cancel");
					this.stopDrag();
					break;
			}
		}
	},
	onKeyUp: function(e){
		// summary:
		//		event processor for onkeyup, watching for CTRL for copy/move status
		// e: Event
		//		keyboard event
		if(this.avatar && e.keyCode == dojo.keys.CTRL){
			var copy = Boolean(this.source.copyState(false));
			if(this.copy != copy){
				this._setCopyStatus(copy);
			}
		}
	},
	
	// utilities
	_setCopyStatus: function(copy){
		// summary:
		//		changes the copy status
		// copy: Boolean
		//		the copy status
		this.copy = copy;
		this.source._markDndStatus(this.copy);
		this.updateAvatar();
		dojo.replaceClass(dojo.body(),
			"dojoDnd" + (this.copy ? "Copy" : "Move"),
			"dojoDnd" + (this.copy ? "Move" : "Copy"));
	}
});

// dojo.dnd._manager:
//		The manager singleton variable. Can be overwritten if needed.
dojo.dnd._manager = null;

dojo.dnd.manager = function(){
	// summary:
	//		Returns the current DnD manager.  Creates one if it is not created yet.
	if(!dojo.dnd._manager){
		dojo.dnd._manager = new dojo.dnd.Manager();
	}
	return dojo.dnd._manager;	// Object
};

}

if(!dojo._hasResource["dojo.dnd.Source"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.dnd.Source"] = true;
dojo.provide("dojo.dnd.Source");




/*
	Container property:
		"Horizontal"- if this is the horizontal container
	Source states:
		""			- normal state
		"Moved"		- this source is being moved
		"Copied"	- this source is being copied
	Target states:
		""			- normal state
		"Disabled"	- the target cannot accept an avatar
	Target anchor state:
		""			- item is not selected
		"Before"	- insert point is before the anchor
		"After"		- insert point is after the anchor
*/

/*=====
dojo.dnd.__SourceArgs = function(){
	//	summary:
	//		a dict of parameters for DnD Source configuration. Note that any
	//		property on Source elements may be configured, but this is the
	//		short-list
	//	isSource: Boolean?
	//		can be used as a DnD source. Defaults to true.
	//	accept: Array?
	//		list of accepted types (text strings) for a target; defaults to
	//		["text"]
	//	autoSync: Boolean
	//		if true refreshes the node list on every operation; false by default
	//	copyOnly: Boolean?
	//		copy items, if true, use a state of Ctrl key otherwise,
	//		see selfCopy and selfAccept for more details
	//	delay: Number
	//		the move delay in pixels before detecting a drag; 0 by default
	//	horizontal: Boolean?
	//		a horizontal container, if true, vertical otherwise or when omitted
	//	selfCopy: Boolean?
	//		copy items by default when dropping on itself,
	//		false by default, works only if copyOnly is true
	//	selfAccept: Boolean?
	//		accept its own items when copyOnly is true,
	//		true by default, works only if copyOnly is true
	//	withHandles: Boolean?
	//		allows dragging only by handles, false by default
	//  generateText: Boolean?
	//		generate text node for drag and drop, true by default
	this.isSource = isSource;
	this.accept = accept;
	this.autoSync = autoSync;
	this.copyOnly = copyOnly;
	this.delay = delay;
	this.horizontal = horizontal;
	this.selfCopy = selfCopy;
	this.selfAccept = selfAccept;
	this.withHandles = withHandles;
	this.generateText = true;
}
=====*/

dojo.declare("dojo.dnd.Source", dojo.dnd.Selector, {
	// summary:
	//		a Source object, which can be used as a DnD source, or a DnD target
	
	// object attributes (for markup)
	isSource: true,
	horizontal: false,
	copyOnly: false,
	selfCopy: false,
	selfAccept: true,
	skipForm: false,
	withHandles: false,
	autoSync: false,
	delay: 0, // pixels
	accept: ["text"],
	generateText: true,
	
	constructor: function(/*DOMNode|String*/node, /*dojo.dnd.__SourceArgs?*/params){
		// summary:
		//		a constructor of the Source
		// node:
		//		node or node's id to build the source on
		// params:
		//		any property of this class may be configured via the params
		//		object which is mixed-in to the `dojo.dnd.Source` instance
		dojo.mixin(this, dojo.mixin({}, params));
		var type = this.accept;
		if(type.length){
			this.accept = {};
			for(var i = 0; i < type.length; ++i){
				this.accept[type[i]] = 1;
			}
		}
		// class-specific variables
		this.isDragging = false;
		this.mouseDown = false;
		this.targetAnchor = null;
		this.targetBox = null;
		this.before = true;
		this._lastX = 0;
		this._lastY = 0;
		// states
		this.sourceState  = "";
		if(this.isSource){
			dojo.addClass(this.node, "dojoDndSource");
		}
		this.targetState  = "";
		if(this.accept){
			dojo.addClass(this.node, "dojoDndTarget");
		}
		if(this.horizontal){
			dojo.addClass(this.node, "dojoDndHorizontal");
		}
		// set up events
		this.topics = [
			dojo.subscribe("/dnd/source/over", this, "onDndSourceOver"),
			dojo.subscribe("/dnd/start",  this, "onDndStart"),
			dojo.subscribe("/dnd/drop",   this, "onDndDrop"),
			dojo.subscribe("/dnd/cancel", this, "onDndCancel")
		];
	},
	
	// methods
	checkAcceptance: function(source, nodes){
		// summary:
		//		checks if the target can accept nodes from this source
		// source: Object
		//		the source which provides items
		// nodes: Array
		//		the list of transferred items
		if(this == source){
			return !this.copyOnly || this.selfAccept;
		}
		for(var i = 0; i < nodes.length; ++i){
			var type = source.getItem(nodes[i].id).type;
			// type instanceof Array
			var flag = false;
			for(var j = 0; j < type.length; ++j){
				if(type[j] in this.accept){
					flag = true;
					break;
				}
			}
			if(!flag){
				return false;	// Boolean
			}
		}
		return true;	// Boolean
	},
	copyState: function(keyPressed, self){
		// summary:
		//		Returns true if we need to copy items, false to move.
		//		It is separated to be overwritten dynamically, if needed.
		// keyPressed: Boolean
		//		the "copy" key was pressed
		// self: Boolean?
		//		optional flag that means that we are about to drop on itself
		
		if(keyPressed){ return true; }
		if(arguments.length < 2){
			self = this == dojo.dnd.manager().target;
		}
		if(self){
			if(this.copyOnly){
				return this.selfCopy;
			}
		}else{
			return this.copyOnly;
		}
		return false;	// Boolean
	},
	destroy: function(){
		// summary:
		//		prepares the object to be garbage-collected
		dojo.dnd.Source.superclass.destroy.call(this);
		dojo.forEach(this.topics, dojo.unsubscribe);
		this.targetAnchor = null;
	},

	// markup methods
	markupFactory: function(params, node){
		params._skipStartup = true;
		return new dojo.dnd.Source(node, params);
	},

	// mouse event processors
	onMouseMove: function(e){
		// summary:
		//		event processor for onmousemove
		// e: Event
		//		mouse event
		if(this.isDragging && this.targetState == "Disabled"){ return; }
		dojo.dnd.Source.superclass.onMouseMove.call(this, e);
		var m = dojo.dnd.manager();
		if(!this.isDragging){
			if(this.mouseDown && this.isSource &&
					(Math.abs(e.pageX - this._lastX) > this.delay || Math.abs(e.pageY - this._lastY) > this.delay)){
				var nodes = this.getSelectedNodes();
				if(nodes.length){
					m.startDrag(this, nodes, this.copyState(dojo.isCopyKey(e), true));
				}
			}
		}
		if(this.isDragging){
			// calculate before/after
			var before = false;
			if(this.current){
				if(!this.targetBox || this.targetAnchor != this.current){
					this.targetBox = dojo.position(this.current, true);
				}
				if(this.horizontal){
					before = (e.pageX - this.targetBox.x) < (this.targetBox.w / 2);
				}else{
					before = (e.pageY - this.targetBox.y) < (this.targetBox.h / 2);
				}
			}
			if(this.current != this.targetAnchor || before != this.before){
				this._markTargetAnchor(before);
				m.canDrop(!this.current || m.source != this || !(this.current.id in this.selection));
			}
		}
	},
	onMouseDown: function(e){
		// summary:
		//		event processor for onmousedown
		// e: Event
		//		mouse event
		if(!this.mouseDown && this._legalMouseDown(e) && (!this.skipForm || !dojo.dnd.isFormElement(e))){
			this.mouseDown = true;
			this._lastX = e.pageX;
			this._lastY = e.pageY;
			dojo.dnd.Source.superclass.onMouseDown.call(this, e);
		}
	},
	onMouseUp: function(e){
		// summary:
		//		event processor for onmouseup
		// e: Event
		//		mouse event
		if(this.mouseDown){
			this.mouseDown = false;
			dojo.dnd.Source.superclass.onMouseUp.call(this, e);
		}
	},
	
	// topic event processors
	onDndSourceOver: function(source){
		// summary:
		//		topic event processor for /dnd/source/over, called when detected a current source
		// source: Object
		//		the source which has the mouse over it
		if(this != source){
			this.mouseDown = false;
			if(this.targetAnchor){
				this._unmarkTargetAnchor();
			}
		}else if(this.isDragging){
			var m = dojo.dnd.manager();
			m.canDrop(this.targetState != "Disabled" && (!this.current || m.source != this || !(this.current.id in this.selection)));
		}
	},
	onDndStart: function(source, nodes, copy){
		// summary:
		//		topic event processor for /dnd/start, called to initiate the DnD operation
		// source: Object
		//		the source which provides items
		// nodes: Array
		//		the list of transferred items
		// copy: Boolean
		//		copy items, if true, move items otherwise
		if(this.autoSync){ this.sync(); }
		if(this.isSource){
			this._changeState("Source", this == source ? (copy ? "Copied" : "Moved") : "");
		}
		var accepted = this.accept && this.checkAcceptance(source, nodes);
		this._changeState("Target", accepted ? "" : "Disabled");
		if(this == source){
			dojo.dnd.manager().overSource(this);
		}
		this.isDragging = true;
	},
	onDndDrop: function(source, nodes, copy, target){
		// summary:
		//		topic event processor for /dnd/drop, called to finish the DnD operation
		// source: Object
		//		the source which provides items
		// nodes: Array
		//		the list of transferred items
		// copy: Boolean
		//		copy items, if true, move items otherwise
		// target: Object
		//		the target which accepts items
		if(this == target){
			// this one is for us => move nodes!
			this.onDrop(source, nodes, copy);
		}
		this.onDndCancel();
	},
	onDndCancel: function(){
		// summary:
		//		topic event processor for /dnd/cancel, called to cancel the DnD operation
		if(this.targetAnchor){
			this._unmarkTargetAnchor();
			this.targetAnchor = null;
		}
		this.before = true;
		this.isDragging = false;
		this.mouseDown = false;
		this._changeState("Source", "");
		this._changeState("Target", "");
	},
	
	// local events
	onDrop: function(source, nodes, copy){
		// summary:
		//		called only on the current target, when drop is performed
		// source: Object
		//		the source which provides items
		// nodes: Array
		//		the list of transferred items
		// copy: Boolean
		//		copy items, if true, move items otherwise
		
		if(this != source){
			this.onDropExternal(source, nodes, copy);
		}else{
			this.onDropInternal(nodes, copy);
		}
	},
	onDropExternal: function(source, nodes, copy){
		// summary:
		//		called only on the current target, when drop is performed
		//		from an external source
		// source: Object
		//		the source which provides items
		// nodes: Array
		//		the list of transferred items
		// copy: Boolean
		//		copy items, if true, move items otherwise
		
		var oldCreator = this._normalizedCreator;
		// transferring nodes from the source to the target
		if(this.creator){
			// use defined creator
			this._normalizedCreator = function(node, hint){
				return oldCreator.call(this, source.getItem(node.id).data, hint);
			};
		}else{
			// we have no creator defined => move/clone nodes
			if(copy){
				// clone nodes
				this._normalizedCreator = function(node, hint){
					var t = source.getItem(node.id);
					var n = node.cloneNode(true);
					n.id = dojo.dnd.getUniqueId();
					return {node: n, data: t.data, type: t.type};
				};
			}else{
				// move nodes
				this._normalizedCreator = function(node, hint){
					var t = source.getItem(node.id);
					source.delItem(node.id);
					return {node: node, data: t.data, type: t.type};
				};
			}
		}
		this.selectNone();
		if(!copy && !this.creator){
			source.selectNone();
		}
		this.insertNodes(true, nodes, this.before, this.current);
		if(!copy && this.creator){
			source.deleteSelectedNodes();
		}
		this._normalizedCreator = oldCreator;
	},
	onDropInternal: function(nodes, copy){
		// summary:
		//		called only on the current target, when drop is performed
		//		from the same target/source
		// nodes: Array
		//		the list of transferred items
		// copy: Boolean
		//		copy items, if true, move items otherwise
		
		var oldCreator = this._normalizedCreator;
		// transferring nodes within the single source
		if(this.current && this.current.id in this.selection){
			// do nothing
			return;
		}
		if(copy){
			if(this.creator){
				// create new copies of data items
				this._normalizedCreator = function(node, hint){
					return oldCreator.call(this, this.getItem(node.id).data, hint);
				};
			}else{
				// clone nodes
				this._normalizedCreator = function(node, hint){
					var t = this.getItem(node.id);
					var n = node.cloneNode(true);
					n.id = dojo.dnd.getUniqueId();
					return {node: n, data: t.data, type: t.type};
				};
			}
		}else{
			// move nodes
			if(!this.current){
				// do nothing
				return;
			}
			this._normalizedCreator = function(node, hint){
				var t = this.getItem(node.id);
				return {node: node, data: t.data, type: t.type};
			};
		}
		this._removeSelection();
		this.insertNodes(true, nodes, this.before, this.current);
		this._normalizedCreator = oldCreator;
	},
	onDraggingOver: function(){
		// summary:
		//		called during the active DnD operation, when items
		//		are dragged over this target, and it is not disabled
	},
	onDraggingOut: function(){
		// summary:
		//		called during the active DnD operation, when items
		//		are dragged away from this target, and it is not disabled
	},
	
	// utilities
	onOverEvent: function(){
		// summary:
		//		this function is called once, when mouse is over our container
		dojo.dnd.Source.superclass.onOverEvent.call(this);
		dojo.dnd.manager().overSource(this);
		if(this.isDragging && this.targetState != "Disabled"){
			this.onDraggingOver();
		}
	},
	onOutEvent: function(){
		// summary:
		//		this function is called once, when mouse is out of our container
		dojo.dnd.Source.superclass.onOutEvent.call(this);
		dojo.dnd.manager().outSource(this);
		if(this.isDragging && this.targetState != "Disabled"){
			this.onDraggingOut();
		}
	},
	_markTargetAnchor: function(before){
		// summary:
		//		assigns a class to the current target anchor based on "before" status
		// before: Boolean
		//		insert before, if true, after otherwise
		if(this.current == this.targetAnchor && this.before == before){ return; }
		if(this.targetAnchor){
			this._removeItemClass(this.targetAnchor, this.before ? "Before" : "After");
		}
		this.targetAnchor = this.current;
		this.targetBox = null;
		this.before = before;
		if(this.targetAnchor){
			this._addItemClass(this.targetAnchor, this.before ? "Before" : "After");
		}
	},
	_unmarkTargetAnchor: function(){
		// summary:
		//		removes a class of the current target anchor based on "before" status
		if(!this.targetAnchor){ return; }
		this._removeItemClass(this.targetAnchor, this.before ? "Before" : "After");
		this.targetAnchor = null;
		this.targetBox = null;
		this.before = true;
	},
	_markDndStatus: function(copy){
		// summary:
		//		changes source's state based on "copy" status
		this._changeState("Source", copy ? "Copied" : "Moved");
	},
	_legalMouseDown: function(e){
		// summary:
		//		checks if user clicked on "approved" items
		// e: Event
		//		mouse event
		
		// accept only the left mouse button
		if(!dojo.mouseButtons.isLeft(e)){ return false; }
		
		if(!this.withHandles){ return true; }
		
		// check for handles
		for(var node = e.target; node && node !== this.node; node = node.parentNode){
			if(dojo.hasClass(node, "dojoDndHandle")){ return true; }
			if(dojo.hasClass(node, "dojoDndItem") || dojo.hasClass(node, "dojoDndIgnore")){ break; }
		}
		return false;	// Boolean
	}
});

dojo.declare("dojo.dnd.Target", dojo.dnd.Source, {
	// summary: a Target object, which can be used as a DnD target
	
	constructor: function(node, params){
		// summary:
		//		a constructor of the Target --- see the `dojo.dnd.Source.constructor` for details
		this.isSource = false;
		dojo.removeClass(this.node, "dojoDndSource");
	},

	// markup methods
	markupFactory: function(params, node){
		params._skipStartup = true;
		return new dojo.dnd.Target(node, params);
	}
});

dojo.declare("dojo.dnd.AutoSource", dojo.dnd.Source, {
	// summary:
	//		a source that syncs its DnD nodes by default
	
	constructor: function(node, params){
		// summary:
		//		constructor of the AutoSource --- see the Source constructor for details
		this.autoSync = true;
	},

	// markup methods
	markupFactory: function(params, node){
		params._skipStartup = true;
		return new dojo.dnd.AutoSource(node, params);
	}
});

}

if(!dojo._hasResource["dojo.dnd.Mover"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.dnd.Mover"] = true;
dojo.provide("dojo.dnd.Mover");




dojo.declare("dojo.dnd.Mover", null, {
	constructor: function(node, e, host){
		// summary:
		//		an object which makes a node follow the mouse, or touch-drag on touch devices.
		//		Used as a default mover, and as a base class for custom movers.
		// node: Node
		//		a node (or node's id) to be moved
		// e: Event
		//		a mouse event, which started the move;
		//		only pageX and pageY properties are used
		// host: Object?
		//		object which implements the functionality of the move,
		//	 	and defines proper events (onMoveStart and onMoveStop)
		this.node = dojo.byId(node);
		var pos = e.touches ? e.touches[0] : e;
		this.marginBox = {l: pos.pageX, t: pos.pageY};
		this.mouseButton = e.button;
		var h = (this.host = host), d = node.ownerDocument;
		this.events = [
			// At the start of a drag, onFirstMove is called, and then the following two
			// connects are disconnected
			dojo.connect(d, "onmousemove", this, "onFirstMove"),
			dojo.connect(d, "ontouchmove", this, "onFirstMove"),

			// These are called continually during the drag
			dojo.connect(d, "onmousemove", this, "onMouseMove"),
			dojo.connect(d, "ontouchmove", this, "onMouseMove"),

			// And these are called at the end of the drag
			dojo.connect(d, "onmouseup",   this, "onMouseUp"),
			dojo.connect(d, "ontouchend", this, "onMouseUp"),

			// cancel text selection and text dragging
			dojo.connect(d, "ondragstart",   dojo.stopEvent),
			dojo.connect(d.body, "onselectstart", dojo.stopEvent)
		];
		// notify that the move has started
		if(h && h.onMoveStart){
			h.onMoveStart(this);
		}
	},
	// mouse event processors
	onMouseMove: function(e){
		// summary:
		//		event processor for onmousemove/ontouchmove
		// e: Event
		//		mouse/touch event
		dojo.dnd.autoScroll(e);
		var m = this.marginBox,
			pos = e.touches ? e.touches[0] : e;
		this.host.onMove(this, {l: m.l + pos.pageX, t: m.t + pos.pageY}, e);
		dojo.stopEvent(e);
	},
	onMouseUp: function(e){
		if(dojo.isWebKit && dojo.isMac && this.mouseButton == 2 ?
				e.button == 0 : this.mouseButton == e.button){ // TODO Should condition be met for touch devices, too?
			this.destroy();
		}
		dojo.stopEvent(e);
	},
	// utilities
	onFirstMove: function(e){
		// summary:
		//		makes the node absolute; it is meant to be called only once.
		// 		relative and absolutely positioned nodes are assumed to use pixel units
		var s = this.node.style, l, t, h = this.host;
		switch(s.position){
			case "relative":
			case "absolute":
				// assume that left and top values are in pixels already
				l = Math.round(parseFloat(s.left)) || 0;
				t = Math.round(parseFloat(s.top)) || 0;
				break;
			default:
				s.position = "absolute";	// enforcing the absolute mode
				var m = dojo.marginBox(this.node);
				// event.pageX/pageY (which we used to generate the initial
				// margin box) includes padding and margin set on the body.
				// However, setting the node's position to absolute and then
				// doing dojo.marginBox on it *doesn't* take that additional
				// space into account - so we need to subtract the combined
				// padding and margin.  We use getComputedStyle and
				// _getMarginBox/_getContentBox to avoid the extra lookup of
				// the computed style.
				var b = dojo.doc.body;
				var bs = dojo.getComputedStyle(b);
				var bm = dojo._getMarginBox(b, bs);
				var bc = dojo._getContentBox(b, bs);
				l = m.l - (bc.l - bm.l);
				t = m.t - (bc.t - bm.t);
				break;
		}
		this.marginBox.l = l - this.marginBox.l;
		this.marginBox.t = t - this.marginBox.t;
		if(h && h.onFirstMove){
			h.onFirstMove(this, e);
		}
		
		// Disconnect onmousemove and ontouchmove events that call this function
		dojo.disconnect(this.events.shift());
		dojo.disconnect(this.events.shift());
	},
	destroy: function(){
		// summary:
		//		stops the move, deletes all references, so the object can be garbage-collected
		dojo.forEach(this.events, dojo.disconnect);
		// undo global settings
		var h = this.host;
		if(h && h.onMoveStop){
			h.onMoveStop(this);
		}
		// destroy objects
		this.events = this.node = this.host = null;
	}
});

}

if(!dojo._hasResource["dojo.dnd.Moveable"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.dnd.Moveable"] = true;
dojo.provide("dojo.dnd.Moveable");



/*=====
dojo.declare("dojo.dnd.__MoveableArgs", [], {
	// handle: Node||String
	//		A node (or node's id), which is used as a mouse handle.
	//		If omitted, the node itself is used as a handle.
	handle: null,

	// delay: Number
	//		delay move by this number of pixels
	delay: 0,

	// skip: Boolean
	//		skip move of form elements
	skip: false,

	// mover: Object
	//		a constructor of custom Mover
	mover: dojo.dnd.Mover
});
=====*/

dojo.declare("dojo.dnd.Moveable", null, {
	// object attributes (for markup)
	handle: "",
	delay: 0,
	skip: false,
	
	constructor: function(node, params){
		// summary:
		//		an object, which makes a node moveable
		// node: Node
		//		a node (or node's id) to be moved
		// params: dojo.dnd.__MoveableArgs?
		//		optional parameters
		this.node = dojo.byId(node);
		if(!params){ params = {}; }
		this.handle = params.handle ? dojo.byId(params.handle) : null;
		if(!this.handle){ this.handle = this.node; }
		this.delay = params.delay > 0 ? params.delay : 0;
		this.skip  = params.skip;
		this.mover = params.mover ? params.mover : dojo.dnd.Mover;
		this.events = [
			dojo.connect(this.handle, "onmousedown", this, "onMouseDown"),
			dojo.connect(this.handle, "ontouchstart", this, "onMouseDown"),
			// cancel text selection and text dragging
			dojo.connect(this.handle, "ondragstart",   this, "onSelectStart"),
			dojo.connect(this.handle, "onselectstart", this, "onSelectStart")
		];
	},

	// markup methods
	markupFactory: function(params, node){
		return new dojo.dnd.Moveable(node, params);
	},

	// methods
	destroy: function(){
		// summary:
		//		stops watching for possible move, deletes all references, so the object can be garbage-collected
		dojo.forEach(this.events, dojo.disconnect);
		this.events = this.node = this.handle = null;
	},
	
	// mouse event processors
	onMouseDown: function(e){
		// summary:
		//		event processor for onmousedown/ontouchstart, creates a Mover for the node
		// e: Event
		//		mouse/touch event
		if(this.skip && dojo.dnd.isFormElement(e)){ return; }
		if(this.delay){
			this.events.push(
				dojo.connect(this.handle, "onmousemove", this, "onMouseMove"),
				dojo.connect(this.handle, "ontouchmove", this, "onMouseMove"),
				dojo.connect(this.handle, "onmouseup", this, "onMouseUp"),
				dojo.connect(this.handle, "ontouchend", this, "onMouseUp")
			);
			var pos = e.touches ? e.touches[0] : e;
			this._lastX = pos.pageX;
			this._lastY = pos.pageY;
		}else{
			this.onDragDetected(e);
		}
		dojo.stopEvent(e);
	},
	onMouseMove: function(e){
		// summary:
		//		event processor for onmousemove/ontouchmove, used only for delayed drags
		// e: Event
		//		mouse/touch event
		var pos = e.touches ? e.touches[0] : e;
		if(Math.abs(pos.pageX - this._lastX) > this.delay || Math.abs(pos.pageY - this._lastY) > this.delay){
			this.onMouseUp(e);
			this.onDragDetected(e);
		}
		dojo.stopEvent(e);
	},
	onMouseUp: function(e){
		// summary:
		//		event processor for onmouseup, used only for delayed drags
		// e: Event
		//		mouse event
		for(var i = 0; i < 2; ++i){
			dojo.disconnect(this.events.pop());
		}
		dojo.stopEvent(e);
	},
	onSelectStart: function(e){
		// summary:
		//		event processor for onselectevent and ondragevent
		// e: Event
		//		mouse event
		if(!this.skip || !dojo.dnd.isFormElement(e)){
			dojo.stopEvent(e);
		}
	},
	
	// local events
	onDragDetected: function(/* Event */ e){
		// summary:
		//		called when the drag is detected;
		//		responsible for creation of the mover
		new this.mover(this.node, e, this);
	},
	onMoveStart: function(/* dojo.dnd.Mover */ mover){
		// summary:
		//		called before every move operation
		dojo.publish("/dnd/move/start", [mover]);
		dojo.addClass(dojo.body(), "dojoMove");
		dojo.addClass(this.node, "dojoMoveItem");
	},
	onMoveStop: function(/* dojo.dnd.Mover */ mover){
		// summary:
		//		called after every move operation
		dojo.publish("/dnd/move/stop", [mover]);
		dojo.removeClass(dojo.body(), "dojoMove");
		dojo.removeClass(this.node, "dojoMoveItem");
	},
	onFirstMove: function(/* dojo.dnd.Mover */ mover, /* Event */ e){
		// summary:
		//		called during the very first move notification;
		//		can be used to initialize coordinates, can be overwritten.
		
		// default implementation does nothing
	},
	onMove: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop, /* Event */ e){
		// summary:
		//		called during every move notification;
		//		should actually move the node; can be overwritten.
		this.onMoving(mover, leftTop);
		var s = mover.node.style;
		s.left = leftTop.l + "px";
		s.top  = leftTop.t + "px";
		this.onMoved(mover, leftTop);
	},
	onMoving: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop){
		// summary:
		//		called before every incremental move; can be overwritten.
		
		// default implementation does nothing
	},
	onMoved: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop){
		// summary:
		//		called after every incremental move; can be overwritten.
		
		// default implementation does nothing
	}
});

}

if(!dojo._hasResource["dojo.dnd.move"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.dnd.move"] = true;
dojo.provide("dojo.dnd.move");




/*=====
dojo.declare("dojo.dnd.move.__constrainedMoveableArgs", [dojo.dnd.__MoveableArgs], {
	// constraints: Function
	//		Calculates a constraint box.
	//		It is called in a context of the moveable object.
	constraints: function(){},

	// within: Boolean
	//		restrict move within boundaries.
	within: false
});
=====*/

dojo.declare("dojo.dnd.move.constrainedMoveable", dojo.dnd.Moveable, {
	// object attributes (for markup)
	constraints: function(){},
	within: false,
	
	// markup methods
	markupFactory: function(params, node){
		return new dojo.dnd.move.constrainedMoveable(node, params);
	},

	constructor: function(node, params){
		// summary:
		//		an object that makes a node moveable
		// node: Node
		//		a node (or node's id) to be moved
		// params: dojo.dnd.move.__constrainedMoveableArgs?
		//		an optional object with additional parameters;
		//		the rest is passed to the base class
		if(!params){ params = {}; }
		this.constraints = params.constraints;
		this.within = params.within;
	},
	onFirstMove: function(/* dojo.dnd.Mover */ mover){
		// summary:
		//		called during the very first move notification;
		//		can be used to initialize coordinates, can be overwritten.
		var c = this.constraintBox = this.constraints.call(this, mover);
		c.r = c.l + c.w;
		c.b = c.t + c.h;
		if(this.within){
			var mb = dojo._getMarginSize(mover.node);
			c.r -= mb.w;
			c.b -= mb.h;
		}
	},
	onMove: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop){
		// summary:
		//		called during every move notification;
		//		should actually move the node; can be overwritten.
		var c = this.constraintBox, s = mover.node.style;
		this.onMoving(mover, leftTop);
		leftTop.l = leftTop.l < c.l ? c.l : c.r < leftTop.l ? c.r : leftTop.l;
		leftTop.t = leftTop.t < c.t ? c.t : c.b < leftTop.t ? c.b : leftTop.t;
		s.left = leftTop.l + "px";
		s.top  = leftTop.t + "px";
		this.onMoved(mover, leftTop);
	}
});

/*=====
dojo.declare("dojo.dnd.move.__boxConstrainedMoveableArgs", [dojo.dnd.move.__constrainedMoveableArgs], {
	// box: Object
	//		a constraint box
	box: {}
});
=====*/

dojo.declare("dojo.dnd.move.boxConstrainedMoveable", dojo.dnd.move.constrainedMoveable, {
	// box:
	//		object attributes (for markup)
	box: {},
	
	// markup methods
	markupFactory: function(params, node){
		return new dojo.dnd.move.boxConstrainedMoveable(node, params);
	},

	constructor: function(node, params){
		// summary:
		//		an object, which makes a node moveable
		// node: Node
		//		a node (or node's id) to be moved
		// params: dojo.dnd.move.__boxConstrainedMoveableArgs?
		//		an optional object with parameters
		var box = params && params.box;
		this.constraints = function(){ return box; };
	}
});

/*=====
dojo.declare("dojo.dnd.move.__parentConstrainedMoveableArgs", [dojo.dnd.move.__constrainedMoveableArgs], {
	// area: String
	//		A parent's area to restrict the move.
	//		Can be "margin", "border", "padding", or "content".
	area: ""
});
=====*/

dojo.declare("dojo.dnd.move.parentConstrainedMoveable", dojo.dnd.move.constrainedMoveable, {
	// area:
	//		object attributes (for markup)
	area: "content",

	// markup methods
	markupFactory: function(params, node){
		return new dojo.dnd.move.parentConstrainedMoveable(node, params);
	},

	constructor: function(node, params){
		// summary:
		//		an object, which makes a node moveable
		// node: Node
		//		a node (or node's id) to be moved
		// params: dojo.dnd.move.__parentConstrainedMoveableArgs?
		//		an optional object with parameters
		var area = params && params.area;
		this.constraints = function(){
			var n = this.node.parentNode,
				s = dojo.getComputedStyle(n),
				mb = dojo._getMarginBox(n, s);
			if(area == "margin"){
				return mb;	// Object
			}
			var t = dojo._getMarginExtents(n, s);
			mb.l += t.l, mb.t += t.t, mb.w -= t.w, mb.h -= t.h;
			if(area == "border"){
				return mb;	// Object
			}
			t = dojo._getBorderExtents(n, s);
			mb.l += t.l, mb.t += t.t, mb.w -= t.w, mb.h -= t.h;
			if(area == "padding"){
				return mb;	// Object
			}
			t = dojo._getPadExtents(n, s);
			mb.l += t.l, mb.t += t.t, mb.w -= t.w, mb.h -= t.h;
			return mb;	// Object
		};
	}
});

// patching functions one level up for compatibility

dojo.dnd.constrainedMover = dojo.dnd.move.constrainedMover;
dojo.dnd.boxConstrainedMover = dojo.dnd.move.boxConstrainedMover;
dojo.dnd.parentConstrainedMover = dojo.dnd.move.parentConstrainedMover;

}

if(!dojo._hasResource["dijit._base.manager"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.manager"] = true;
dojo.provide("dijit._base.manager");


dojo.declare("dijit.WidgetSet", null, {
	// summary:
	//		A set of widgets indexed by id. A default instance of this class is
	//		available as `dijit.registry`
	//
	// example:
	//		Create a small list of widgets:
	//		|	var ws = new dijit.WidgetSet();
	//		|	ws.add(dijit.byId("one"));
	//		| 	ws.add(dijit.byId("two"));
	//		|	// destroy both:
	//		|	ws.forEach(function(w){ w.destroy(); });
	//
	// example:
	//		Using dijit.registry:
	//		|	dijit.registry.forEach(function(w){ /* do something */ });

	constructor: function(){
		this._hash = {};
		this.length = 0;
	},

	add: function(/*dijit._Widget*/ widget){
		// summary:
		//		Add a widget to this list. If a duplicate ID is detected, a error is thrown.
		//
		// widget: dijit._Widget
		//		Any dijit._Widget subclass.
		if(this._hash[widget.id]){
			throw new Error("Tried to register widget with id==" + widget.id + " but that id is already registered");
		}
		this._hash[widget.id] = widget;
		this.length++;
	},

	remove: function(/*String*/ id){
		// summary:
		//		Remove a widget from this WidgetSet. Does not destroy the widget; simply
		//		removes the reference.
		if(this._hash[id]){
			delete this._hash[id];
			this.length--;
		}
	},

	forEach: function(/*Function*/ func, /* Object? */thisObj){
		// summary:
		//		Call specified function for each widget in this set.
		//
		// func:
		//		A callback function to run for each item. Is passed the widget, the index
		//		in the iteration, and the full hash, similar to `dojo.forEach`.
		//
		// thisObj:
		//		An optional scope parameter
		//
		// example:
		//		Using the default `dijit.registry` instance:
		//		|	dijit.registry.forEach(function(widget){
		//		|		console.log(widget.declaredClass);
		//		|	});
		//
		// returns:
		//		Returns self, in order to allow for further chaining.

		thisObj = thisObj || dojo.global;
		var i = 0, id;
		for(id in this._hash){
			func.call(thisObj, this._hash[id], i++, this._hash);
		}
		return this;	// dijit.WidgetSet
	},

	filter: function(/*Function*/ filter, /* Object? */thisObj){
		// summary:
		//		Filter down this WidgetSet to a smaller new WidgetSet
		//		Works the same as `dojo.filter` and `dojo.NodeList.filter`
		//
		// filter:
		//		Callback function to test truthiness. Is passed the widget
		//		reference and the pseudo-index in the object.
		//
		// thisObj: Object?
		//		Option scope to use for the filter function.
		//
		// example:
		//		Arbitrary: select the odd widgets in this list
		//		|	dijit.registry.filter(function(w, i){
		//		|		return i % 2 == 0;
		//		|	}).forEach(function(w){ /* odd ones */ });

		thisObj = thisObj || dojo.global;
		var res = new dijit.WidgetSet(), i = 0, id;
		for(id in this._hash){
			var w = this._hash[id];
			if(filter.call(thisObj, w, i++, this._hash)){
				res.add(w);
			}
		}
		return res; // dijit.WidgetSet
	},

	byId: function(/*String*/ id){
		// summary:
		//		Find a widget in this list by it's id.
		// example:
		//		Test if an id is in a particular WidgetSet
		//		| var ws = new dijit.WidgetSet();
		//		| ws.add(dijit.byId("bar"));
		//		| var t = ws.byId("bar") // returns a widget
		//		| var x = ws.byId("foo"); // returns undefined

		return this._hash[id];	// dijit._Widget
	},

	byClass: function(/*String*/ cls){
		// summary:
		//		Reduce this widgetset to a new WidgetSet of a particular `declaredClass`
		//
		// cls: String
		//		The Class to scan for. Full dot-notated string.
		//
		// example:
		//		Find all `dijit.TitlePane`s in a page:
		//		|	dijit.registry.byClass("dijit.TitlePane").forEach(function(tp){ tp.close(); });

		var res = new dijit.WidgetSet(), id, widget;
		for(id in this._hash){
			widget = this._hash[id];
			if(widget.declaredClass == cls){
				res.add(widget);
			}
		 }
		 return res; // dijit.WidgetSet
},

	toArray: function(){
		// summary:
		//		Convert this WidgetSet into a true Array
		//
		// example:
		//		Work with the widget .domNodes in a real Array
		//		|	dojo.map(dijit.registry.toArray(), function(w){ return w.domNode; });

		var ar = [];
		for(var id in this._hash){
			ar.push(this._hash[id]);
		}
		return ar;	// dijit._Widget[]
},

	map: function(/* Function */func, /* Object? */thisObj){
		// summary:
		//		Create a new Array from this WidgetSet, following the same rules as `dojo.map`
		// example:
		//		|	var nodes = dijit.registry.map(function(w){ return w.domNode; });
		//
		// returns:
		//		A new array of the returned values.
		return dojo.map(this.toArray(), func, thisObj); // Array
	},

	every: function(func, thisObj){
		// summary:
		// 		A synthetic clone of `dojo.every` acting explicitly on this WidgetSet
		//
		// func: Function
		//		A callback function run for every widget in this list. Exits loop
		//		when the first false return is encountered.
		//
		// thisObj: Object?
		//		Optional scope parameter to use for the callback

		thisObj = thisObj || dojo.global;
		var x = 0, i;
		for(i in this._hash){
			if(!func.call(thisObj, this._hash[i], x++, this._hash)){
				return false; // Boolean
			}
		}
		return true; // Boolean
	},

	some: function(func, thisObj){
		// summary:
		// 		A synthetic clone of `dojo.some` acting explictly on this WidgetSet
		//
		// func: Function
		//		A callback function run for every widget in this list. Exits loop
		//		when the first true return is encountered.
		//
		// thisObj: Object?
		//		Optional scope parameter to use for the callback

		thisObj = thisObj || dojo.global;
		var x = 0, i;
		for(i in this._hash){
			if(func.call(thisObj, this._hash[i], x++, this._hash)){
				return true; // Boolean
			}
		}
		return false; // Boolean
	}

});

(function(){

	/*=====
	dijit.registry = {
		// summary:
		//		A list of widgets on a page.
		// description:
		//		Is an instance of `dijit.WidgetSet`
	};
	=====*/
	dijit.registry = new dijit.WidgetSet();

	var hash = dijit.registry._hash,
		attr = dojo.attr,
		hasAttr = dojo.hasAttr,
		style = dojo.style;

	dijit.byId = function(/*String|dijit._Widget*/ id){
		// summary:
		//		Returns a widget by it's id, or if passed a widget, no-op (like dojo.byId())
		return typeof id == "string" ? hash[id] : id; // dijit._Widget
	};

	var _widgetTypeCtr = {};
	dijit.getUniqueId = function(/*String*/widgetType){
		// summary:
		//		Generates a unique id for a given widgetType
	
		var id;
		do{
			id = widgetType + "_" +
				(widgetType in _widgetTypeCtr ?
					++_widgetTypeCtr[widgetType] : _widgetTypeCtr[widgetType] = 0);
		}while(hash[id]);
		return dijit._scopeName == "dijit" ? id : dijit._scopeName + "_" + id; // String
	};
	
	dijit.findWidgets = function(/*DomNode*/ root){
		// summary:
		//		Search subtree under root returning widgets found.
		//		Doesn't search for nested widgets (ie, widgets inside other widgets).
	
		var outAry = [];
	
		function getChildrenHelper(root){
			for(var node = root.firstChild; node; node = node.nextSibling){
				if(node.nodeType == 1){
					var widgetId = node.getAttribute("widgetId");
					if(widgetId){
						var widget = hash[widgetId];
						if(widget){	// may be null on page w/multiple dojo's loaded
							outAry.push(widget);
						}
					}else{
						getChildrenHelper(node);
					}
				}
			}
		}
	
		getChildrenHelper(root);
		return outAry;
	};
	
	dijit._destroyAll = function(){
		// summary:
		//		Code to destroy all widgets and do other cleanup on page unload
	
		// Clean up focus manager lingering references to widgets and nodes
		dijit._curFocus = null;
		dijit._prevFocus = null;
		dijit._activeStack = [];
	
		// Destroy all the widgets, top down
		dojo.forEach(dijit.findWidgets(dojo.body()), function(widget){
			// Avoid double destroy of widgets like Menu that are attached to <body>
			// even though they are logically children of other widgets.
			if(!widget._destroyed){
				if(widget.destroyRecursive){
					widget.destroyRecursive();
				}else if(widget.destroy){
					widget.destroy();
				}
			}
		});
	};
	
	if(dojo.isIE){
		// Only run _destroyAll() for IE because we think it's only necessary in that case,
		// and because it causes problems on FF.  See bug #3531 for details.
		dojo.addOnWindowUnload(function(){
			dijit._destroyAll();
		});
	}
	
	dijit.byNode = function(/*DOMNode*/ node){
		// summary:
		//		Returns the widget corresponding to the given DOMNode
		return hash[node.getAttribute("widgetId")]; // dijit._Widget
	};
	
	dijit.getEnclosingWidget = function(/*DOMNode*/ node){
		// summary:
		//		Returns the widget whose DOM tree contains the specified DOMNode, or null if
		//		the node is not contained within the DOM tree of any widget
		while(node){
			var id = node.getAttribute && node.getAttribute("widgetId");
			if(id){
				return hash[id];
			}
			node = node.parentNode;
		}
		return null;
	};

	var shown = (dijit._isElementShown = function(/*Element*/ elem){
		var s = style(elem);
		return (s.visibility != "hidden")
			&& (s.visibility != "collapsed")
			&& (s.display != "none")
			&& (attr(elem, "type") != "hidden");
	});
	
	dijit.hasDefaultTabStop = function(/*Element*/ elem){
		// summary:
		//		Tests if element is tab-navigable even without an explicit tabIndex setting
	
		// No explicit tabIndex setting, need to investigate node type
		switch(elem.nodeName.toLowerCase()){
			case "a":
				// An <a> w/out a tabindex is only navigable if it has an href
				return hasAttr(elem, "href");
			case "area":
			case "button":
			case "input":
			case "object":
			case "select":
			case "textarea":
				// These are navigable by default
				return true;
			case "iframe":
				// If it's an editor <iframe> then it's tab navigable.
				var body;
				try{
					// non-IE
					var contentDocument = elem.contentDocument;
					if("designMode" in contentDocument && contentDocument.designMode == "on"){
						return true;
					}
					body = contentDocument.body;
				}catch(e1){
					// contentWindow.document isn't accessible within IE7/8
					// if the iframe.src points to a foreign url and this
					// page contains an element, that could get focus
					try{
						body = elem.contentWindow.document.body;
					}catch(e2){
						return false;
					}
				}
				return body.contentEditable == 'true' || (body.firstChild && body.firstChild.contentEditable == 'true');
			default:
				return elem.contentEditable == 'true';
		}
	};
	
	var isTabNavigable = (dijit.isTabNavigable = function(/*Element*/ elem){
		// summary:
		//		Tests if an element is tab-navigable
	
		// TODO: convert (and rename method) to return effective tabIndex; will save time in _getTabNavigable()
		if(attr(elem, "disabled")){
			return false;
		}else if(hasAttr(elem, "tabIndex")){
			// Explicit tab index setting
			return attr(elem, "tabIndex") >= 0; // boolean
		}else{
			// No explicit tabIndex setting, so depends on node type
			return dijit.hasDefaultTabStop(elem);
		}
	});

	dijit._getTabNavigable = function(/*DOMNode*/ root){
		// summary:
		//		Finds descendants of the specified root node.
		//
		// description:
		//		Finds the following descendants of the specified root node:
		//		* the first tab-navigable element in document order
		//		  without a tabIndex or with tabIndex="0"
		//		* the last tab-navigable element in document order
		//		  without a tabIndex or with tabIndex="0"
		//		* the first element in document order with the lowest
		//		  positive tabIndex value
		//		* the last element in document order with the highest
		//		  positive tabIndex value
		var first, last, lowest, lowestTabindex, highest, highestTabindex, radioSelected = {};
		function radioName(node) {
			// If this element is part of a radio button group, return the name for that group.
			return node && node.tagName.toLowerCase() == "input" &&
				node.type && node.type.toLowerCase() == "radio" &&
				node.name && node.name.toLowerCase();
		}
		var walkTree = function(/*DOMNode*/parent){
			dojo.query("> *", parent).forEach(function(child){
				// Skip hidden elements, and also non-HTML elements (those in custom namespaces) in IE,
				// since show() invokes getAttribute("type"), which crash on VML nodes in IE.
				if((dojo.isIE && child.scopeName!=="HTML") || !shown(child)){
					return;
				}

				if(isTabNavigable(child)){
					var tabindex = attr(child, "tabIndex");
					if(!hasAttr(child, "tabIndex") || tabindex == 0){
						if(!first){ first = child; }
						last = child;
					}else if(tabindex > 0){
						if(!lowest || tabindex < lowestTabindex){
							lowestTabindex = tabindex;
							lowest = child;
						}
						if(!highest || tabindex >= highestTabindex){
							highestTabindex = tabindex;
							highest = child;
						}
					}
					var rn = radioName(child);
					if(dojo.attr(child, "checked") && rn) {
						radioSelected[rn] = child;
					}
				}
				if(child.nodeName.toUpperCase() != 'SELECT'){
					walkTree(child);
				}
			});
		};
		if(shown(root)){ walkTree(root) }
		function rs(node) {
			// substitute checked radio button for unchecked one, if there is a checked one with the same name.
			return radioSelected[radioName(node)] || node;
		}
		return { first: rs(first), last: rs(last), lowest: rs(lowest), highest: rs(highest) };
	}
	dijit.getFirstInTabbingOrder = function(/*String|DOMNode*/ root){
		// summary:
		//		Finds the descendant of the specified root node
		//		that is first in the tabbing order
		var elems = dijit._getTabNavigable(dojo.byId(root));
		return elems.lowest ? elems.lowest : elems.first; // DomNode
	};
	
	dijit.getLastInTabbingOrder = function(/*String|DOMNode*/ root){
		// summary:
		//		Finds the descendant of the specified root node
		//		that is last in the tabbing order
		var elems = dijit._getTabNavigable(dojo.byId(root));
		return elems.last ? elems.last : elems.highest; // DomNode
	};
	
	/*=====
	dojo.mixin(dijit, {
		// defaultDuration: Integer
		//		The default animation speed (in ms) to use for all Dijit
		//		transitional animations, unless otherwise specified
		//		on a per-instance basis. Defaults to 200, overrided by
		//		`djConfig.defaultDuration`
		defaultDuration: 200
	});
	=====*/
	
	dijit.defaultDuration = dojo.config["defaultDuration"] || 200;

})();

}

if(!dojo._hasResource["dojo.Stateful"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.Stateful"] = true;
dojo.provide("dojo.Stateful");


dojo.declare("dojo.Stateful", null, {
	// summary:
	//		Base class for objects that provide named properties with optional getter/setter
	//		control and the ability to watch for property changes
	// example:
	//	|	var obj = new dojo.Stateful();
	//	|	obj.watch("foo", function(){
	//	|		console.log("foo changed to " + this.get("foo"));
	//	|	});
	//	|	obj.set("foo","bar");
	postscript: function(mixin){
		if(mixin){
			dojo.mixin(this, mixin);
		}
	},
	
	get: function(/*String*/name){
		// summary:
		//		Get a property on a Stateful instance.
		//	name:
		//		The property to get.
		// description:
		//		Get a named property on a Stateful object. The property may
		//		potentially be retrieved via a getter method in subclasses. In the base class
		// 		this just retrieves the object's property.
		// 		For example:
		//	|	stateful = new dojo.Stateful({foo: 3});
		//	|	stateful.get("foo") // returns 3
		//	|	stateful.foo // returns 3
		
		return this[name];
	},
	set: function(/*String*/name, /*Object*/value){
		// summary:
		//		Set a property on a Stateful instance
		//	name:
		//		The property to set.
		//	value:
		//		The value to set in the property.
		// description:
		//		Sets named properties on a stateful object and notifies any watchers of
		// 		the property. A programmatic setter may be defined in subclasses.
		// 		For example:
		//	|	stateful = new dojo.Stateful();
		//	|	stateful.watch(function(name, oldValue, value){
		//	|		// this will be called on the set below
		//	|	}
		//	|	stateful.set(foo, 5);
		//
		//	set() may also be called with a hash of name/value pairs, ex:
		//	|	myObj.set({
		//	|		foo: "Howdy",
		//	|		bar: 3
		//	|	})
		//	This is equivalent to calling set(foo, "Howdy") and set(bar, 3)
		if(typeof name === "object"){
			for(var x in name){
				this.set(x, name[x]);
			}
			return this;
		}
		var oldValue = this[name];
		this[name] = value;
		if(this._watchCallbacks){
			this._watchCallbacks(name, oldValue, value);
		}
		return this;
	},
	watch: function(/*String?*/name, /*Function*/callback){
		// summary:
		//		Watches a property for changes
		//	name:
		//		Indicates the property to watch. This is optional (the callback may be the
		// 		only parameter), and if omitted, all the properties will be watched
		// returns:
		//		An object handle for the watch. The unwatch method of this object
		// 		can be used to discontinue watching this property:
		//		|	var watchHandle = obj.watch("foo", callback);
		//		|	watchHandle.unwatch(); // callback won't be called now
		//	callback:
		//		The function to execute when the property changes. This will be called after
		//		the property has been changed. The callback will be called with the |this|
		//		set to the instance, the first argument as the name of the property, the
		// 		second argument as the old value and the third argument as the new value.
		
		var callbacks = this._watchCallbacks;
		if(!callbacks){
			var self = this;
			callbacks = this._watchCallbacks = function(name, oldValue, value, ignoreCatchall){
				var notify = function(propertyCallbacks){
					if(propertyCallbacks){
                        propertyCallbacks = propertyCallbacks.slice();
						for(var i = 0, l = propertyCallbacks.length; i < l; i++){
							try{
								propertyCallbacks[i].call(self, name, oldValue, value);
							}catch(e){
								console.error(e);
							}
						}
					}
				};
				notify(callbacks['_' + name]);
				if(!ignoreCatchall){
					notify(callbacks["*"]); // the catch-all
				}
			}; // we use a function instead of an object so it will be ignored by JSON conversion
		}
		if(!callback && typeof name === "function"){
			callback = name;
			name = "*";
		}else{
			// prepend with dash to prevent name conflicts with function (like "name" property)
			name = '_' + name;
		}
		var propertyCallbacks = callbacks[name];
		if(typeof propertyCallbacks !== "object"){
			propertyCallbacks = callbacks[name] = [];
		}
		propertyCallbacks.push(callback);
		return {
			unwatch: function(){
				propertyCallbacks.splice(dojo.indexOf(propertyCallbacks, callback), 1);
			}
		};
	}
	
});

}

if(!dojo._hasResource["dijit._WidgetBase"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._WidgetBase"] = true;
dojo.provide("dijit._WidgetBase");




(function(){

dojo.declare("dijit._WidgetBase", dojo.Stateful, {
	// summary:
	//		Future base class for all Dijit widgets.
	//		_Widget extends this class adding support for various features needed by desktop.

	// id: [const] String
	//		A unique, opaque ID string that can be assigned by users or by the
	//		system. If the developer passes an ID which is known not to be
	//		unique, the specified ID is ignored and the system-generated ID is
	//		used instead.
	id: "",

	// lang: [const] String
	//		Rarely used.  Overrides the default Dojo locale used to render this widget,
	//		as defined by the [HTML LANG](http://www.w3.org/TR/html401/struct/dirlang.html#adef-lang) attribute.
	//		Value must be among the list of locales specified during by the Dojo bootstrap,
	//		formatted according to [RFC 3066](http://www.ietf.org/rfc/rfc3066.txt) (like en-us).
	lang: "",

	// dir: [const] String
	//		Bi-directional support, as defined by the [HTML DIR](http://www.w3.org/TR/html401/struct/dirlang.html#adef-dir)
	//		attribute. Either left-to-right "ltr" or right-to-left "rtl".  If undefined, widgets renders in page's
	//		default direction.
	dir: "",

	// class: String
	//		HTML class attribute
	"class": "",

	// style: String||Object
	//		HTML style attributes as cssText string or name/value hash
	style: "",

	// title: String
	//		HTML title attribute.
	//
	//		For form widgets this specifies a tooltip to display when hovering over
	//		the widget (just like the native HTML title attribute).
	//
	//		For TitlePane or for when this widget is a child of a TabContainer, AccordionContainer,
	//		etc., it's used to specify the tab label, accordion pane title, etc.
	title: "",

	// tooltip: String
	//		When this widget's title attribute is used to for a tab label, accordion pane title, etc.,
	//		this specifies the tooltip to appear when the mouse is hovered over that text.
	tooltip: "",

	// baseClass: [protected] String
	//		Root CSS class of the widget (ex: dijitTextBox), used to construct CSS classes to indicate
	//		widget state.
	baseClass: "",

	// srcNodeRef: [readonly] DomNode
	//		pointer to original DOM node
	srcNodeRef: null,

	// domNode: [readonly] DomNode
	//		This is our visible representation of the widget! Other DOM
	//		Nodes may by assigned to other properties, usually through the
	//		template system's dojoAttachPoint syntax, but the domNode
	//		property is the canonical "top level" node in widget UI.
	domNode: null,

	// containerNode: [readonly] DomNode
	//		Designates where children of the source DOM node will be placed.
	//		"Children" in this case refers to both DOM nodes and widgets.
	//		For example, for myWidget:
	//
	//		|	<div dojoType=myWidget>
	//		|		<b> here's a plain DOM node
	//		|		<span dojoType=subWidget>and a widget</span>
	//		|		<i> and another plain DOM node </i>
	//		|	</div>
	//
	//		containerNode would point to:
	//
	//		|		<b> here's a plain DOM node
	//		|		<span dojoType=subWidget>and a widget</span>
	//		|		<i> and another plain DOM node </i>
	//
	//		In templated widgets, "containerNode" is set via a
	//		dojoAttachPoint assignment.
	//
	//		containerNode must be defined for any widget that accepts innerHTML
	//		(like ContentPane or BorderContainer or even Button), and conversely
	//		is null for widgets that don't, like TextBox.
	containerNode: null,

/*=====
	// _started: Boolean
	//		startup() has completed.
	_started: false,
=====*/

	// attributeMap: [protected] Object
	//		attributeMap sets up a "binding" between attributes (aka properties)
	//		of the widget and the widget's DOM.
	//		Changes to widget attributes listed in attributeMap will be
	//		reflected into the DOM.
	//
	//		For example, calling set('title', 'hello')
	//		on a TitlePane will automatically cause the TitlePane's DOM to update
	//		with the new title.
	//
	//		attributeMap is a hash where the key is an attribute of the widget,
	//		and the value reflects a binding to a:
	//
	//		- DOM node attribute
	// |		focus: {node: "focusNode", type: "attribute"}
	// 		Maps this.focus to this.focusNode.focus
	//
	//		- DOM node innerHTML
	//	|		title: { node: "titleNode", type: "innerHTML" }
	//		Maps this.title to this.titleNode.innerHTML
	//
	//		- DOM node innerText
	//	|		title: { node: "titleNode", type: "innerText" }
	//		Maps this.title to this.titleNode.innerText
	//
	//		- DOM node CSS class
	// |		myClass: { node: "domNode", type: "class" }
	//		Maps this.myClass to this.domNode.className
	//
	//		If the value is an array, then each element in the array matches one of the
	//		formats of the above list.
	//
	//		There are also some shorthands for backwards compatibility:
	//		- string --> { node: string, type: "attribute" }, for example:
	//	|	"focusNode" ---> { node: "focusNode", type: "attribute" }
	//		- "" --> { node: "domNode", type: "attribute" }
	attributeMap: {id:"", dir:"", lang:"", "class":"", style:"", title:""},

	// _blankGif: [protected] String
	//		Path to a blank 1x1 image.
	//		Used by <img> nodes in templates that really get their image via CSS background-image.
	_blankGif: (dojo.config.blankGif || dojo.moduleUrl("dojo", "resources/blank.gif")).toString(),

	//////////// INITIALIZATION METHODS ///////////////////////////////////////

	postscript: function(/*Object?*/params, /*DomNode|String*/srcNodeRef){
		// summary:
		//		Kicks off widget instantiation.  See create() for details.
		// tags:
		//		private
		this.create(params, srcNodeRef);
	},

	create: function(/*Object?*/params, /*DomNode|String?*/srcNodeRef){
		// summary:
		//		Kick off the life-cycle of a widget
		// params:
		//		Hash of initialization parameters for widget, including
		//		scalar values (like title, duration etc.) and functions,
		//		typically callbacks like onClick.
		// srcNodeRef:
		//		If a srcNodeRef (DOM node) is specified:
		//			- use srcNodeRef.innerHTML as my contents
		//			- if this is a behavioral widget then apply behavior
		//			  to that srcNodeRef
		//			- otherwise, replace srcNodeRef with my generated DOM
		//			  tree
		// description:
		//		Create calls a number of widget methods (postMixInProperties, buildRendering, postCreate,
		//		etc.), some of which of you'll want to override. See http://docs.dojocampus.org/dijit/_Widget
		//		for a discussion of the widget creation lifecycle.
		//
		//		Of course, adventurous developers could override create entirely, but this should
		//		only be done as a last resort.
		// tags:
		//		private

		// store pointer to original DOM tree
		this.srcNodeRef = dojo.byId(srcNodeRef);

		// For garbage collection.  An array of handles returned by Widget.connect()
		// Each handle returned from Widget.connect() is an array of handles from dojo.connect()
		this._connects = [];

		// For garbage collection.  An array of handles returned by Widget.subscribe()
		// The handle returned from Widget.subscribe() is the handle returned from dojo.subscribe()
		this._subscribes = [];

		// mix in our passed parameters
		if(this.srcNodeRef && (typeof this.srcNodeRef.id == "string")){ this.id = this.srcNodeRef.id; }
		if(params){
			this.params = params;
			dojo._mixin(this, params);
		}
		this.postMixInProperties();

		// generate an id for the widget if one wasn't specified
		// (be sure to do this before buildRendering() because that function might
		// expect the id to be there.)
		if(!this.id){
			this.id = dijit.getUniqueId(this.declaredClass.replace(/\./g,"_"));
		}
		dijit.registry.add(this);

		this.buildRendering();

		if(this.domNode){
			// Copy attributes listed in attributeMap into the [newly created] DOM for the widget.
			// Also calls custom setters for all attributes with custom setters.
			this._applyAttributes();

			// If srcNodeRef was specified, then swap out original srcNode for this widget's DOM tree.
			// For 2.0, move this after postCreate().  postCreate() shouldn't depend on the
			// widget being attached to the DOM since it isn't when a widget is created programmatically like
			// new MyWidget({}).   See #11635.
			var source = this.srcNodeRef;
			if(source && source.parentNode && this.domNode !== source){
				source.parentNode.replaceChild(this.domNode, source);
			}
		}

		if(this.domNode){
			// Note: for 2.0 may want to rename widgetId to dojo._scopeName + "_widgetId",
			// assuming that dojo._scopeName even exists in 2.0
			this.domNode.setAttribute("widgetId", this.id);
		}
		this.postCreate();

		// If srcNodeRef has been processed and removed from the DOM (e.g. TemplatedWidget) then delete it to allow GC.
		if(this.srcNodeRef && !this.srcNodeRef.parentNode){
			delete this.srcNodeRef;
		}

		this._created = true;
	},

	_applyAttributes: function(){
		// summary:
		//		Step during widget creation to copy all widget attributes to the
		//		DOM as per attributeMap and _setXXXAttr functions.
		// description:
		//		Skips over blank/false attribute values, unless they were explicitly specified
		//		as parameters to the widget, since those are the default anyway,
		//		and setting tabIndex="" is different than not setting tabIndex at all.
		//
		//		It processes the attributes in the attribute map first, and then
		//		it goes through and processes the attributes for the _setXXXAttr
		//		functions that have been specified
		// tags:
		//		private
		var condAttrApply = function(attr, scope){
			if((scope.params && attr in scope.params) || scope[attr]){
				scope.set(attr, scope[attr]);
			}
		};

		// Do the attributes in attributeMap
		for(var attr in this.attributeMap){
			condAttrApply(attr, this);
		}

		// And also any attributes with custom setters
		dojo.forEach(this._getSetterAttributes(), function(a){
			if(!(a in this.attributeMap)){
				condAttrApply(a, this);
			}
		}, this);
	},

	_getSetterAttributes: function(){
		// summary:
		//		Returns list of attributes with custom setters for this widget
		var ctor = this.constructor;
		if(!ctor._setterAttrs){
			var r = (ctor._setterAttrs = []),
				attrs,
				proto = ctor.prototype;
			for(var fxName in proto){
				if(dojo.isFunction(proto[fxName]) && (attrs = fxName.match(/^_set([a-zA-Z]*)Attr$/)) && attrs[1]){
					r.push(attrs[1].charAt(0).toLowerCase() + attrs[1].substr(1));
				}
			}
		}
		return ctor._setterAttrs;	// String[]
	},

	postMixInProperties: function(){
		// summary:
		//		Called after the parameters to the widget have been read-in,
		//		but before the widget template is instantiated. Especially
		//		useful to set properties that are referenced in the widget
		//		template.
		// tags:
		//		protected
	},

	buildRendering: function(){
		// summary:
		//		Construct the UI for this widget, setting this.domNode
		// description:
		//		Most widgets will mixin `dijit._Templated`, which implements this
		//		method.
		// tags:
		//		protected

		if(!this.domNode){
			// Create root node if it wasn't created by _Templated
			this.domNode = this.srcNodeRef || dojo.create('div');
		}

		// baseClass is a single class name or occasionally a space-separated list of names.
		// Add those classes to the DOMNode.  If RTL mode then also add with Rtl suffix.
		// TODO: make baseClass custom setter
		if(this.baseClass){
			var classes = this.baseClass.split(" ");
			if(!this.isLeftToRight()){
				classes = classes.concat( dojo.map(classes, function(name){ return name+"Rtl"; }));
			}
			dojo.addClass(this.domNode, classes);
		}
	},

	postCreate: function(){
		// summary:
		//		Processing after the DOM fragment is created
		// description:
		//		Called after the DOM fragment has been created, but not necessarily
		//		added to the document.  Do not include any operations which rely on
		//		node dimensions or placement.
		// tags:
		//		protected
	},

	startup: function(){
		// summary:
		//		Processing after the DOM fragment is added to the document
		// description:
		//		Called after a widget and its children have been created and added to the page,
		//		and all related widgets have finished their create() cycle, up through postCreate().
		//		This is useful for composite widgets that need to control or layout sub-widgets.
		//		Many layout widgets can use this as a wiring phase.
		this._started = true;
	},

	//////////// DESTROY FUNCTIONS ////////////////////////////////

	destroyRecursive: function(/*Boolean?*/ preserveDom){
		// summary:
		// 		Destroy this widget and its descendants
		// description:
		//		This is the generic "destructor" function that all widget users
		// 		should call to cleanly discard with a widget. Once a widget is
		// 		destroyed, it is removed from the manager object.
		// preserveDom:
		//		If true, this method will leave the original DOM structure
		//		alone of descendant Widgets. Note: This will NOT work with
		//		dijit._Templated widgets.

		this._beingDestroyed = true;
		this.destroyDescendants(preserveDom);
		this.destroy(preserveDom);
	},

	destroy: function(/*Boolean*/ preserveDom){
		// summary:
		// 		Destroy this widget, but not its descendants.
		//		This method will, however, destroy internal widgets such as those used within a template.
		// preserveDom: Boolean
		//		If true, this method will leave the original DOM structure alone.
		//		Note: This will not yet work with _Templated widgets

		this._beingDestroyed = true;
		this.uninitialize();
		var d = dojo,
			dfe = d.forEach,
			dun = d.unsubscribe;
		dfe(this._connects, function(array){
			dfe(array, d.disconnect);
		});
		dfe(this._subscribes, function(handle){
			dun(handle);
		});

		// destroy widgets created as part of template, etc.
		dfe(this._supportingWidgets || [], function(w){
			if(w.destroyRecursive){
				w.destroyRecursive();
			}else if(w.destroy){
				w.destroy();
			}
		});

		this.destroyRendering(preserveDom);
		dijit.registry.remove(this.id);
		this._destroyed = true;
	},

	destroyRendering: function(/*Boolean?*/ preserveDom){
		// summary:
		//		Destroys the DOM nodes associated with this widget
		// preserveDom:
		//		If true, this method will leave the original DOM structure alone
		//		during tear-down. Note: this will not work with _Templated
		//		widgets yet.
		// tags:
		//		protected

		if(this.bgIframe){
			this.bgIframe.destroy(preserveDom);
			delete this.bgIframe;
		}

		if(this.domNode){
			if(preserveDom){
				dojo.removeAttr(this.domNode, "widgetId");
			}else{
				dojo.destroy(this.domNode);
			}
			delete this.domNode;
		}

		if(this.srcNodeRef){
			if(!preserveDom){
				dojo.destroy(this.srcNodeRef);
			}
			delete this.srcNodeRef;
		}
	},

	destroyDescendants: function(/*Boolean?*/ preserveDom){
		// summary:
		//		Recursively destroy the children of this widget and their
		//		descendants.
		// preserveDom:
		//		If true, the preserveDom attribute is passed to all descendant
		//		widget's .destroy() method. Not for use with _Templated
		//		widgets.

		// get all direct descendants and destroy them recursively
		dojo.forEach(this.getChildren(), function(widget){
			if(widget.destroyRecursive){
				widget.destroyRecursive(preserveDom);
			}
		});
	},

	uninitialize: function(){
		// summary:
		//		Stub function. Override to implement custom widget tear-down
		//		behavior.
		// tags:
		//		protected
		return false;
	},

	////////////////// GET/SET, CUSTOM SETTERS, ETC. ///////////////////

	_setClassAttr: function(/*String*/ value){
		// summary:
		//		Custom setter for the CSS "class" attribute
		// tags:
		//		protected
		var mapNode = this[this.attributeMap["class"] || 'domNode'];
		dojo.replaceClass(mapNode, value, this["class"]);
		this._set("class", value);
	},

	_setStyleAttr: function(/*String||Object*/ value){
		// summary:
		//		Sets the style attribute of the widget according to value,
		//		which is either a hash like {height: "5px", width: "3px"}
		//		or a plain string
		// description:
		//		Determines which node to set the style on based on style setting
		//		in attributeMap.
		// tags:
		//		protected

		var mapNode = this[this.attributeMap.style || 'domNode'];

		// Note: technically we should revert any style setting made in a previous call
		// to his method, but that's difficult to keep track of.

		if(dojo.isObject(value)){
			dojo.style(mapNode, value);
		}else{
			if(mapNode.style.cssText){
				mapNode.style.cssText += "; " + value;
			}else{
				mapNode.style.cssText = value;
			}
		}

		this._set("style", value);
	},

	_attrToDom: function(/*String*/ attr, /*String*/ value){
		// summary:
		//		Reflect a widget attribute (title, tabIndex, duration etc.) to
		//		the widget DOM, as specified in attributeMap.
		//		Note some attributes like "type"
		//		cannot be processed this way as they are not mutable.
		//
		// tags:
		//		private

		var commands = this.attributeMap[attr];
		dojo.forEach(dojo.isArray(commands) ? commands : [commands], function(command){

			// Get target node and what we are doing to that node
			var mapNode = this[command.node || command || "domNode"];	// DOM node
			var type = command.type || "attribute";	// class, innerHTML, innerText, or attribute

			switch(type){
				case "attribute":
					if(dojo.isFunction(value)){ // functions execute in the context of the widget
						value = dojo.hitch(this, value);
					}

					// Get the name of the DOM node attribute; usually it's the same
					// as the name of the attribute in the widget (attr), but can be overridden.
					// Also maps handler names to lowercase, like onSubmit --> onsubmit
					var attrName = command.attribute ? command.attribute :
						(/^on[A-Z][a-zA-Z]*$/.test(attr) ? attr.toLowerCase() : attr);

					dojo.attr(mapNode, attrName, value);
					break;
				case "innerText":
					mapNode.innerHTML = "";
					mapNode.appendChild(dojo.doc.createTextNode(value));
					break;
				case "innerHTML":
					mapNode.innerHTML = value;
					break;
				case "class":
					dojo.replaceClass(mapNode, value, this[attr]);
					break;
			}
		}, this);
	},

	get: function(name){
		// summary:
		//		Get a property from a widget.
		//	name:
		//		The property to get.
		// description:
		//		Get a named property from a widget. The property may
		//		potentially be retrieved via a getter method. If no getter is defined, this
		// 		just retrieves the object's property.
		// 		For example, if the widget has a properties "foo"
		//		and "bar" and a method named "_getFooAttr", calling:
		//	|	myWidget.get("foo");
		//		would be equivalent to writing:
		//	|	widget._getFooAttr();
		//		and:
		//	|	myWidget.get("bar");
		//		would be equivalent to writing:
		//	|	widget.bar;
		var names = this._getAttrNames(name);
		return this[names.g] ? this[names.g]() : this[name];
	},
	
	set: function(name, value){
		// summary:
		//		Set a property on a widget
		//	name:
		//		The property to set.
		//	value:
		//		The value to set in the property.
		// description:
		//		Sets named properties on a widget which may potentially be handled by a
		// 		setter in the widget.
		// 		For example, if the widget has a properties "foo"
		//		and "bar" and a method named "_setFooAttr", calling:
		//	|	myWidget.set("foo", "Howdy!");
		//		would be equivalent to writing:
		//	|	widget._setFooAttr("Howdy!");
		//		and:
		//	|	myWidget.set("bar", 3);
		//		would be equivalent to writing:
		//	|	widget.bar = 3;
		//
		//	set() may also be called with a hash of name/value pairs, ex:
		//	|	myWidget.set({
		//	|		foo: "Howdy",
		//	|		bar: 3
		//	|	})
		//	This is equivalent to calling set(foo, "Howdy") and set(bar, 3)

		if(typeof name === "object"){
			for(var x in name){
				this.set(x, name[x]);
			}
			return this;
		}
		var names = this._getAttrNames(name);
		if(this[names.s]){
			// use the explicit setter
			var result = this[names.s].apply(this, Array.prototype.slice.call(arguments, 1));
		}else{
			// if param is specified as DOM node attribute, copy it
			if(name in this.attributeMap){
				this._attrToDom(name, value);
			}
			this._set(name, value);
		}
		return result || this;
	},
	
	_attrPairNames: {},		// shared between all widgets
	_getAttrNames: function(name){
		// summary:
		//		Helper function for get() and set().
		//		Caches attribute name values so we don't do the string ops every time.
		// tags:
		//		private

		var apn = this._attrPairNames;
		if(apn[name]){ return apn[name]; }
		var uc = name.charAt(0).toUpperCase() + name.substr(1);
		return (apn[name] = {
			n: name+"Node",
			s: "_set"+uc+"Attr",
			g: "_get"+uc+"Attr"
		});
	},

	_set: function(/*String*/ name, /*anything*/ value){
		// summary:
		//		Helper function to set new value for specified attribute, and call handlers
		//		registered with watch() if the value has changed.
		var oldValue = this[name];
		this[name] = value;
		if(this._watchCallbacks && this._created && value !== oldValue){
			this._watchCallbacks(name, oldValue, value);
		}
	},

	toString: function(){
		// summary:
		//		Returns a string that represents the widget
		// description:
		//		When a widget is cast to a string, this method will be used to generate the
		//		output. Currently, it does not implement any sort of reversible
		//		serialization.
		return '[Widget ' + this.declaredClass + ', ' + (this.id || 'NO ID') + ']'; // String
	},

	getDescendants: function(){
		// summary:
		//		Returns all the widgets contained by this, i.e., all widgets underneath this.containerNode.
		//		This method should generally be avoided as it returns widgets declared in templates, which are
		//		supposed to be internal/hidden, but it's left here for back-compat reasons.

		return this.containerNode ? dojo.query('[widgetId]', this.containerNode).map(dijit.byNode) : []; // dijit._Widget[]
	},

	getChildren: function(){
		// summary:
		//		Returns all the widgets contained by this, i.e., all widgets underneath this.containerNode.
		//		Does not return nested widgets, nor widgets that are part of this widget's template.
		return this.containerNode ? dijit.findWidgets(this.containerNode) : []; // dijit._Widget[]
	},

	connect: function(
			/*Object|null*/ obj,
			/*String|Function*/ event,
			/*String|Function*/ method){
		// summary:
		//		Connects specified obj/event to specified method of this object
		//		and registers for disconnect() on widget destroy.
		// description:
		//		Provide widget-specific analog to dojo.connect, except with the
		//		implicit use of this widget as the target object.
		//		Events connected with `this.connect` are disconnected upon
		//		destruction.
		// returns:
		//		A handle that can be passed to `disconnect` in order to disconnect before
		//		the widget is destroyed.
		// example:
		//	|	var btn = new dijit.form.Button();
		//	|	// when foo.bar() is called, call the listener we're going to
		//	|	// provide in the scope of btn
		//	|	btn.connect(foo, "bar", function(){
		//	|		console.debug(this.toString());
		//	|	});
		// tags:
		//		protected

		var handles = [dojo._connect(obj, event, this, method)];
		this._connects.push(handles);
		return handles;		// _Widget.Handle
	},

	disconnect: function(/* _Widget.Handle */ handles){
		// summary:
		//		Disconnects handle created by `connect`.
		//		Also removes handle from this widget's list of connects.
		// tags:
		//		protected
		for(var i=0; i<this._connects.length; i++){
			if(this._connects[i] == handles){
				dojo.forEach(handles, dojo.disconnect);
				this._connects.splice(i, 1);
				return;
			}
		}
	},

	subscribe: function(
			/*String*/ topic,
			/*String|Function*/ method){
		// summary:
		//		Subscribes to the specified topic and calls the specified method
		//		of this object and registers for unsubscribe() on widget destroy.
		// description:
		//		Provide widget-specific analog to dojo.subscribe, except with the
		//		implicit use of this widget as the target object.
		// example:
		//	|	var btn = new dijit.form.Button();
		//	|	// when /my/topic is published, this button changes its label to
		//	|   // be the parameter of the topic.
		//	|	btn.subscribe("/my/topic", function(v){
		//	|		this.set("label", v);
		//	|	});
		var handle = dojo.subscribe(topic, this, method);

		// return handles for Any widget that may need them
		this._subscribes.push(handle);
		return handle;
	},

	unsubscribe: function(/*Object*/ handle){
		// summary:
		//		Unsubscribes handle created by this.subscribe.
		//		Also removes handle from this widget's list of subscriptions
		for(var i=0; i<this._subscribes.length; i++){
			if(this._subscribes[i] == handle){
				dojo.unsubscribe(handle);
				this._subscribes.splice(i, 1);
				return;
			}
		}
	},

	isLeftToRight: function(){
		// summary:
		//		Return this widget's explicit or implicit orientation (true for LTR, false for RTL)
		// tags:
		//		protected
		return this.dir ? (this.dir == "ltr") : dojo._isBodyLtr(); //Boolean
	},

	placeAt: function(/* String|DomNode|_Widget */reference, /* String?|Int? */position){
		// summary:
		//		Place this widget's domNode reference somewhere in the DOM based
		//		on standard dojo.place conventions, or passing a Widget reference that
		//		contains and addChild member.
		//
		// description:
		//		A convenience function provided in all _Widgets, providing a simple
		//		shorthand mechanism to put an existing (or newly created) Widget
		//		somewhere in the dom, and allow chaining.
		//
		// reference:
		//		The String id of a domNode, a domNode reference, or a reference to a Widget posessing
		//		an addChild method.
		//
		// position:
		//		If passed a string or domNode reference, the position argument
		//		accepts a string just as dojo.place does, one of: "first", "last",
		//		"before", or "after".
		//
		//		If passed a _Widget reference, and that widget reference has an ".addChild" method,
		//		it will be called passing this widget instance into that method, supplying the optional
		//		position index passed.
		//
		// returns:
		//		dijit._Widget
		//		Provides a useful return of the newly created dijit._Widget instance so you
		//		can "chain" this function by instantiating, placing, then saving the return value
		//		to a variable.
		//
		// example:
		// | 	// create a Button with no srcNodeRef, and place it in the body:
		// | 	var button = new dijit.form.Button({ label:"click" }).placeAt(dojo.body());
		// | 	// now, 'button' is still the widget reference to the newly created button
		// | 	dojo.connect(button, "onClick", function(e){ console.log('click'); });
		//
		// example:
		// |	// create a button out of a node with id="src" and append it to id="wrapper":
		// | 	var button = new dijit.form.Button({},"src").placeAt("wrapper");
		//
		// example:
		// |	// place a new button as the first element of some div
		// |	var button = new dijit.form.Button({ label:"click" }).placeAt("wrapper","first");
		//
		// example:
		// |	// create a contentpane and add it to a TabContainer
		// |	var tc = dijit.byId("myTabs");
		// |	new dijit.layout.ContentPane({ href:"foo.html", title:"Wow!" }).placeAt(tc)

		if(reference.declaredClass && reference.addChild){
			reference.addChild(this, position);
		}else{
			dojo.place(this.domNode, reference, position);
		}
		return this;
	}
});

})();

}

if(!dojo._hasResource["dijit._base.focus"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.focus"] = true;
dojo.provide("dijit._base.focus");




// summary:
//		These functions are used to query or set the focus and selection.
//
//		Also, they trace when widgets become activated/deactivated,
//		so that the widget can fire _onFocus/_onBlur events.
//		"Active" here means something similar to "focused", but
//		"focus" isn't quite the right word because we keep track of
//		a whole stack of "active" widgets.  Example: ComboButton --> Menu -->
//		MenuItem.  The onBlur event for ComboButton doesn't fire due to focusing
//		on the Menu or a MenuItem, since they are considered part of the
//		ComboButton widget.  It only happens when focus is shifted
//		somewhere completely different.

dojo.mixin(dijit, {
	// _curFocus: DomNode
	//		Currently focused item on screen
	_curFocus: null,

	// _prevFocus: DomNode
	//		Previously focused item on screen
	_prevFocus: null,

	isCollapsed: function(){
		// summary:
		//		Returns true if there is no text selected
		return dijit.getBookmark().isCollapsed;
	},

	getBookmark: function(){
		// summary:
		//		Retrieves a bookmark that can be used with moveToBookmark to return to the same range
		var bm, rg, tg, sel = dojo.doc.selection, cf = dijit._curFocus;

		if(dojo.global.getSelection){
			//W3C Range API for selections.
			sel = dojo.global.getSelection();
			if(sel){
				if(sel.isCollapsed){
					tg = cf? cf.tagName : "";
					if(tg){
						//Create a fake rangelike item to restore selections.
						tg = tg.toLowerCase();
						if(tg == "textarea" ||
								(tg == "input" && (!cf.type || cf.type.toLowerCase() == "text"))){
							sel = {
								start: cf.selectionStart,
								end: cf.selectionEnd,
								node: cf,
								pRange: true
							};
							return {isCollapsed: (sel.end <= sel.start), mark: sel}; //Object.
						}
					}
					bm = {isCollapsed:true};
					if(sel.rangeCount){
						bm.mark = sel.getRangeAt(0).cloneRange();
					}
				}else{
					rg = sel.getRangeAt(0);
					bm = {isCollapsed: false, mark: rg.cloneRange()};
				}
			}
		}else if(sel){
			// If the current focus was a input of some sort and no selection, don't bother saving
			// a native bookmark.  This is because it causes issues with dialog/page selection restore.
			// So, we need to create psuedo bookmarks to work with.
			tg = cf ? cf.tagName : "";
			tg = tg.toLowerCase();
			if(cf && tg && (tg == "button" || tg == "textarea" || tg == "input")){
				if(sel.type && sel.type.toLowerCase() == "none"){
					return {
						isCollapsed: true,
						mark: null
					}
				}else{
					rg = sel.createRange();
					return {
						isCollapsed: rg.text && rg.text.length?false:true,
						mark: {
							range: rg,
							pRange: true
						}
					};
				}
			}
			bm = {};

			//'IE' way for selections.
			try{
				// createRange() throws exception when dojo in iframe
				//and nothing selected, see #9632
				rg = sel.createRange();
				bm.isCollapsed = !(sel.type == 'Text' ? rg.htmlText.length : rg.length);
			}catch(e){
				bm.isCollapsed = true;
				return bm;
			}
			if(sel.type.toUpperCase() == 'CONTROL'){
				if(rg.length){
					bm.mark=[];
					var i=0,len=rg.length;
					while(i<len){
						bm.mark.push(rg.item(i++));
					}
				}else{
					bm.isCollapsed = true;
					bm.mark = null;
				}
			}else{
				bm.mark = rg.getBookmark();
			}
		}else{
			console.warn("No idea how to store the current selection for this browser!");
		}
		return bm; // Object
	},

	moveToBookmark: function(/*Object*/bookmark){
		// summary:
		//		Moves current selection to a bookmark
		// bookmark:
		//		This should be a returned object from dijit.getBookmark()

		var _doc = dojo.doc,
			mark = bookmark.mark;
		if(mark){
			if(dojo.global.getSelection){
				//W3C Rangi API (FF, WebKit, Opera, etc)
				var sel = dojo.global.getSelection();
				if(sel && sel.removeAllRanges){
					if(mark.pRange){
						var r = mark;
						var n = r.node;
						n.selectionStart = r.start;
						n.selectionEnd = r.end;
					}else{
						sel.removeAllRanges();
						sel.addRange(mark);
					}
				}else{
					console.warn("No idea how to restore selection for this browser!");
				}
			}else if(_doc.selection && mark){
				//'IE' way.
				var rg;
				if(mark.pRange){
					rg = mark.range;
				}else if(dojo.isArray(mark)){
					rg = _doc.body.createControlRange();
					//rg.addElement does not have call/apply method, so can not call it directly
					//rg is not available in "range.addElement(item)", so can't use that either
					dojo.forEach(mark, function(n){
						rg.addElement(n);
					});
				}else{
					rg = _doc.body.createTextRange();
					rg.moveToBookmark(mark);
				}
				rg.select();
			}
		}
	},

	getFocus: function(/*Widget?*/ menu, /*Window?*/ openedForWindow){
		// summary:
		//		Called as getFocus(), this returns an Object showing the current focus
		//		and selected text.
		//
		//		Called as getFocus(widget), where widget is a (widget representing) a button
		//		that was just pressed, it returns where focus was before that button
		//		was pressed.   (Pressing the button may have either shifted focus to the button,
		//		or removed focus altogether.)   In this case the selected text is not returned,
		//		since it can't be accurately determined.
		//
		// menu: dijit._Widget or {domNode: DomNode} structure
		//		The button that was just pressed.  If focus has disappeared or moved
		//		to this button, returns the previous focus.  In this case the bookmark
		//		information is already lost, and null is returned.
		//
		// openedForWindow:
		//		iframe in which menu was opened
		//
		// returns:
		//		A handle to restore focus/selection, to be passed to `dijit.focus`
		var node = !dijit._curFocus || (menu && dojo.isDescendant(dijit._curFocus, menu.domNode)) ? dijit._prevFocus : dijit._curFocus;
		return {
			node: node,
			bookmark: (node == dijit._curFocus) && dojo.withGlobal(openedForWindow || dojo.global, dijit.getBookmark),
			openedForWindow: openedForWindow
		}; // Object
	},

	focus: function(/*Object || DomNode */ handle){
		// summary:
		//		Sets the focused node and the selection according to argument.
		//		To set focus to an iframe's content, pass in the iframe itself.
		// handle:
		//		object returned by get(), or a DomNode

		if(!handle){ return; }

		var node = "node" in handle ? handle.node : handle,		// because handle is either DomNode or a composite object
			bookmark = handle.bookmark,
			openedForWindow = handle.openedForWindow,
			collapsed = bookmark ? bookmark.isCollapsed : false;

		// Set the focus
		// Note that for iframe's we need to use the <iframe> to follow the parentNode chain,
		// but we need to set focus to iframe.contentWindow
		if(node){
			var focusNode = (node.tagName.toLowerCase() == "iframe") ? node.contentWindow : node;
			if(focusNode && focusNode.focus){
				try{
					// Gecko throws sometimes if setting focus is impossible,
					// node not displayed or something like that
					focusNode.focus();
				}catch(e){/*quiet*/}
			}
			dijit._onFocusNode(node);
		}

		// set the selection
		// do not need to restore if current selection is not empty
		// (use keyboard to select a menu item) or if previous selection was collapsed
		// as it may cause focus shift (Esp in IE).
		if(bookmark && dojo.withGlobal(openedForWindow || dojo.global, dijit.isCollapsed) && !collapsed){
			if(openedForWindow){
				openedForWindow.focus();
			}
			try{
				dojo.withGlobal(openedForWindow || dojo.global, dijit.moveToBookmark, null, [bookmark]);
			}catch(e2){
				/*squelch IE internal error, see http://trac.dojotoolkit.org/ticket/1984 */
			}
		}
	},

	// _activeStack: dijit._Widget[]
	//		List of currently active widgets (focused widget and it's ancestors)
	_activeStack: [],

	registerIframe: function(/*DomNode*/ iframe){
		// summary:
		//		Registers listeners on the specified iframe so that any click
		//		or focus event on that iframe (or anything in it) is reported
		//		as a focus/click event on the <iframe> itself.
		// description:
		//		Currently only used by editor.
		// returns:
		//		Handle to pass to unregisterIframe()
		return dijit.registerWin(iframe.contentWindow, iframe);
	},

	unregisterIframe: function(/*Object*/ handle){
		// summary:
		//		Unregisters listeners on the specified iframe created by registerIframe.
		//		After calling be sure to delete or null out the handle itself.
		// handle:
		//		Handle returned by registerIframe()

		dijit.unregisterWin(handle);
	},

	registerWin: function(/*Window?*/targetWindow, /*DomNode?*/ effectiveNode){
		// summary:
		//		Registers listeners on the specified window (either the main
		//		window or an iframe's window) to detect when the user has clicked somewhere
		//		or focused somewhere.
		// description:
		//		Users should call registerIframe() instead of this method.
		// targetWindow:
		//		If specified this is the window associated with the iframe,
		//		i.e. iframe.contentWindow.
		// effectiveNode:
		//		If specified, report any focus events inside targetWindow as
		//		an event on effectiveNode, rather than on evt.target.
		// returns:
		//		Handle to pass to unregisterWin()

		// TODO: make this function private in 2.0; Editor/users should call registerIframe(),

		var mousedownListener = function(evt){
			dijit._justMouseDowned = true;
			setTimeout(function(){ dijit._justMouseDowned = false; }, 0);
			
			// workaround weird IE bug where the click is on an orphaned node
			// (first time clicking a Select/DropDownButton inside a TooltipDialog)
			if(dojo.isIE && evt && evt.srcElement && evt.srcElement.parentNode == null){
				return;
			}

			dijit._onTouchNode(effectiveNode || evt.target || evt.srcElement, "mouse");
		};
		//dojo.connect(targetWindow, "onscroll", ???);

		// Listen for blur and focus events on targetWindow's document.
		// IIRC, I'm using attachEvent() rather than dojo.connect() because focus/blur events don't bubble
		// through dojo.connect(), and also maybe to catch the focus events early, before onfocus handlers
		// fire.
		// Connect to <html> (rather than document) on IE to avoid memory leaks, but document on other browsers because
		// (at least for FF) the focus event doesn't fire on <html> or <body>.
		var doc = dojo.isIE ? targetWindow.document.documentElement : targetWindow.document;
		if(doc){
			if(dojo.isIE){
				targetWindow.document.body.attachEvent('onmousedown', mousedownListener);
				var activateListener = function(evt){
					// IE reports that nodes like <body> have gotten focus, even though they have tabIndex=-1,
					// Should consider those more like a mouse-click than a focus....
					if(evt.srcElement.tagName.toLowerCase() != "#document" &&
						dijit.isTabNavigable(evt.srcElement)){
						dijit._onFocusNode(effectiveNode || evt.srcElement);
					}else{
						dijit._onTouchNode(effectiveNode || evt.srcElement);
					}
				};
				doc.attachEvent('onactivate', activateListener);
				var deactivateListener =  function(evt){
					dijit._onBlurNode(effectiveNode || evt.srcElement);
				};
				doc.attachEvent('ondeactivate', deactivateListener);

				return function(){
					targetWindow.document.detachEvent('onmousedown', mousedownListener);
					doc.detachEvent('onactivate', activateListener);
					doc.detachEvent('ondeactivate', deactivateListener);
					doc = null;	// prevent memory leak (apparent circular reference via closure)
				};
			}else{
				doc.body.addEventListener('mousedown', mousedownListener, true);
				var focusListener = function(evt){
					dijit._onFocusNode(effectiveNode || evt.target);
				};
				doc.addEventListener('focus', focusListener, true);
				var blurListener = function(evt){
					dijit._onBlurNode(effectiveNode || evt.target);
				};
				doc.addEventListener('blur', blurListener, true);

				return function(){
					doc.body.removeEventListener('mousedown', mousedownListener, true);
					doc.removeEventListener('focus', focusListener, true);
					doc.removeEventListener('blur', blurListener, true);
					doc = null;	// prevent memory leak (apparent circular reference via closure)
				};
			}
		}
	},

	unregisterWin: function(/*Handle*/ handle){
		// summary:
		//		Unregisters listeners on the specified window (either the main
		//		window or an iframe's window) according to handle returned from registerWin().
		//		After calling be sure to delete or null out the handle itself.

		// Currently our handle is actually a function
		handle && handle();
	},

	_onBlurNode: function(/*DomNode*/ node){
		// summary:
		// 		Called when focus leaves a node.
		//		Usually ignored, _unless_ it *isn't* follwed by touching another node,
		//		which indicates that we tabbed off the last field on the page,
		//		in which case every widget is marked inactive
		dijit._prevFocus = dijit._curFocus;
		dijit._curFocus = null;

		if(dijit._justMouseDowned){
			// the mouse down caused a new widget to be marked as active; this blur event
			// is coming late, so ignore it.
			return;
		}

		// if the blur event isn't followed by a focus event then mark all widgets as inactive.
		if(dijit._clearActiveWidgetsTimer){
			clearTimeout(dijit._clearActiveWidgetsTimer);
		}
		dijit._clearActiveWidgetsTimer = setTimeout(function(){
			delete dijit._clearActiveWidgetsTimer;
			dijit._setStack([]);
			dijit._prevFocus = null;
		}, 100);
	},

	_onTouchNode: function(/*DomNode*/ node, /*String*/ by){
		// summary:
		//		Callback when node is focused or mouse-downed
		// node:
		//		The node that was touched.
		// by:
		//		"mouse" if the focus/touch was caused by a mouse down event

		// ignore the recent blurNode event
		if(dijit._clearActiveWidgetsTimer){
			clearTimeout(dijit._clearActiveWidgetsTimer);
			delete dijit._clearActiveWidgetsTimer;
		}

		// compute stack of active widgets (ex: ComboButton --> Menu --> MenuItem)
		var newStack=[];
		try{
			while(node){
				var popupParent = dojo.attr(node, "dijitPopupParent");
				if(popupParent){
					node=dijit.byId(popupParent).domNode;
				}else if(node.tagName && node.tagName.toLowerCase() == "body"){
					// is this the root of the document or just the root of an iframe?
					if(node === dojo.body()){
						// node is the root of the main document
						break;
					}
					// otherwise, find the iframe this node refers to (can't access it via parentNode,
					// need to do this trick instead). window.frameElement is supported in IE/FF/Webkit
					node=dojo.window.get(node.ownerDocument).frameElement;
				}else{
					// if this node is the root node of a widget, then add widget id to stack,
					// except ignore clicks on disabled widgets (actually focusing a disabled widget still works,
					// to support MenuItem)
					var id = node.getAttribute && node.getAttribute("widgetId"),
						widget = id && dijit.byId(id);
					if(widget && !(by == "mouse" && widget.get("disabled"))){
						newStack.unshift(id);
					}
					node=node.parentNode;
				}
			}
		}catch(e){ /* squelch */ }

		dijit._setStack(newStack, by);
	},

	_onFocusNode: function(/*DomNode*/ node){
		// summary:
		//		Callback when node is focused

		if(!node){
			return;
		}

		if(node.nodeType == 9){
			// Ignore focus events on the document itself.  This is here so that
			// (for example) clicking the up/down arrows of a spinner
			// (which don't get focus) won't cause that widget to blur. (FF issue)
			return;
		}

		dijit._onTouchNode(node);

		if(node == dijit._curFocus){ return; }
		if(dijit._curFocus){
			dijit._prevFocus = dijit._curFocus;
		}
		dijit._curFocus = node;
		dojo.publish("focusNode", [node]);
	},

	_setStack: function(/*String[]*/ newStack, /*String*/ by){
		// summary:
		//		The stack of active widgets has changed.  Send out appropriate events and records new stack.
		// newStack:
		//		array of widget id's, starting from the top (outermost) widget
		// by:
		//		"mouse" if the focus/touch was caused by a mouse down event

		var oldStack = dijit._activeStack;
		dijit._activeStack = newStack;

		// compare old stack to new stack to see how many elements they have in common
		for(var nCommon=0; nCommon<Math.min(oldStack.length, newStack.length); nCommon++){
			if(oldStack[nCommon] != newStack[nCommon]){
				break;
			}
		}

		var widget;
		// for all elements that have gone out of focus, send blur event
		for(var i=oldStack.length-1; i>=nCommon; i--){
			widget = dijit.byId(oldStack[i]);
			if(widget){
				widget._focused = false;
				widget.set("focused", false);
				widget._hasBeenBlurred = true;
				if(widget._onBlur){
					widget._onBlur(by);
				}
				dojo.publish("widgetBlur", [widget, by]);
			}
		}

		// for all element that have come into focus, send focus event
		for(i=nCommon; i<newStack.length; i++){
			widget = dijit.byId(newStack[i]);
			if(widget){
				widget._focused = true;
				widget.set("focused", true);
				if(widget._onFocus){
					widget._onFocus(by);
				}
				dojo.publish("widgetFocus", [widget, by]);
			}
		}
	}
});

// register top window and all the iframes it contains
dojo.addOnLoad(function(){
	var handle = dijit.registerWin(window);
	if(dojo.isIE){
		dojo.addOnWindowUnload(function(){
			dijit.unregisterWin(handle);
			handle = null;
		})
	}
});

}

if(!dojo._hasResource["dojo.AdapterRegistry"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.AdapterRegistry"] = true;
dojo.provide("dojo.AdapterRegistry");


dojo.AdapterRegistry = function(/*Boolean?*/ returnWrappers){
	//	summary:
	//		A registry to make contextual calling/searching easier.
	//	description:
	//		Objects of this class keep list of arrays in the form [name, check,
	//		wrap, directReturn] that are used to determine what the contextual
	//		result of a set of checked arguments is. All check/wrap functions
	//		in this registry should be of the same arity.
	//	example:
	//	|	// create a new registry
	//	|	var reg = new dojo.AdapterRegistry();
	//	|	reg.register("handleString",
	//	|		dojo.isString,
	//	|		function(str){
	//	|			// do something with the string here
	//	|		}
	//	|	);
	//	|	reg.register("handleArr",
	//	|		dojo.isArray,
	//	|		function(arr){
	//	|			// do something with the array here
	//	|		}
	//	|	);
	//	|
	//	|	// now we can pass reg.match() *either* an array or a string and
	//	|	// the value we pass will get handled by the right function
	//	|	reg.match("someValue"); // will call the first function
	//	|	reg.match(["someValue"]); // will call the second

	this.pairs = [];
	this.returnWrappers = returnWrappers || false; // Boolean
};

dojo.extend(dojo.AdapterRegistry, {
	register: function(/*String*/ name, /*Function*/ check, /*Function*/ wrap, /*Boolean?*/ directReturn, /*Boolean?*/ override){
		//	summary:
		//		register a check function to determine if the wrap function or
		//		object gets selected
		//	name:
		//		a way to identify this matcher.
		//	check:
		//		a function that arguments are passed to from the adapter's
		//		match() function.  The check function should return true if the
		//		given arguments are appropriate for the wrap function.
		//	directReturn:
		//		If directReturn is true, the value passed in for wrap will be
		//		returned instead of being called. Alternately, the
		//		AdapterRegistry can be set globally to "return not call" using
		//		the returnWrappers property. Either way, this behavior allows
		//		the registry to act as a "search" function instead of a
		//		function interception library.
		//	override:
		//		If override is given and true, the check function will be given
		//		highest priority. Otherwise, it will be the lowest priority
		//		adapter.
		this.pairs[((override) ? "unshift" : "push")]([name, check, wrap, directReturn]);
	},

	match: function(/* ... */){
		// summary:
		//		Find an adapter for the given arguments. If no suitable adapter
		//		is found, throws an exception. match() accepts any number of
		//		arguments, all of which are passed to all matching functions
		//		from the registered pairs.
		for(var i = 0; i < this.pairs.length; i++){
			var pair = this.pairs[i];
			if(pair[1].apply(this, arguments)){
				if((pair[3])||(this.returnWrappers)){
					return pair[2];
				}else{
					return pair[2].apply(this, arguments);
				}
			}
		}
		throw new Error("No match found");
	},

	unregister: function(name){
		// summary: Remove a named adapter from the registry

		// FIXME: this is kind of a dumb way to handle this. On a large
		// registry this will be slow-ish and we can use the name as a lookup
		// should we choose to trade memory for speed.
		for(var i = 0; i < this.pairs.length; i++){
			var pair = this.pairs[i];
			if(pair[0] == name){
				this.pairs.splice(i, 1);
				return true;
			}
		}
		return false;
	}
});

}

if(!dojo._hasResource["dijit._base.place"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.place"] = true;
dojo.provide("dijit._base.place");




dijit.getViewport = function(){
	// summary:
	//		Returns the dimensions and scroll position of the viewable area of a browser window

	return dojo.window.getBox();
};

/*=====
dijit.__Position = function(){
	// x: Integer
	//		horizontal coordinate in pixels, relative to document body
	// y: Integer
	//		vertical coordinate in pixels, relative to document body

	thix.x = x;
	this.y = y;
}
=====*/


dijit.placeOnScreen = function(
	/* DomNode */			node,
	/* dijit.__Position */	pos,
	/* String[] */			corners,
	/* dijit.__Position? */	padding){
	// summary:
	//		Positions one of the node's corners at specified position
	//		such that node is fully visible in viewport.
	// description:
	//		NOTE: node is assumed to be absolutely or relatively positioned.
	//	pos:
	//		Object like {x: 10, y: 20}
	//	corners:
	//		Array of Strings representing order to try corners in, like ["TR", "BL"].
	//		Possible values are:
	//			* "BL" - bottom left
	//			* "BR" - bottom right
	//			* "TL" - top left
	//			* "TR" - top right
	//	padding:
	//		set padding to put some buffer around the element you want to position.
	// example:
	//		Try to place node's top right corner at (10,20).
	//		If that makes node go (partially) off screen, then try placing
	//		bottom left corner at (10,20).
	//	|	placeOnScreen(node, {x: 10, y: 20}, ["TR", "BL"])

	var choices = dojo.map(corners, function(corner){
		var c = { corner: corner, pos: {x:pos.x,y:pos.y} };
		if(padding){
			c.pos.x += corner.charAt(1) == 'L' ? padding.x : -padding.x;
			c.pos.y += corner.charAt(0) == 'T' ? padding.y : -padding.y;
		}
		return c;
	});

	return dijit._place(node, choices);
}

dijit._place = function(/*DomNode*/ node, choices, layoutNode, /*Object*/ aroundNodeCoords){
	// summary:
	//		Given a list of spots to put node, put it at the first spot where it fits,
	//		of if it doesn't fit anywhere then the place with the least overflow
	// choices: Array
	//		Array of elements like: {corner: 'TL', pos: {x: 10, y: 20} }
	//		Above example says to put the top-left corner of the node at (10,20)
	// layoutNode: Function(node, aroundNodeCorner, nodeCorner, size)
	//		for things like tooltip, they are displayed differently (and have different dimensions)
	//		based on their orientation relative to the parent.   This adjusts the popup based on orientation.
	//		It also passes in the available size for the popup, which is useful for tooltips to
	//		tell them that their width is limited to a certain amount.   layoutNode() may return a value expressing
	//		how much the popup had to be modified to fit into the available space.   This is used to determine
	//		what the best placement is.
	// aroundNodeCoords: Object
	//		Size of aroundNode, ex: {w: 200, h: 50}

	// get {x: 10, y: 10, w: 100, h:100} type obj representing position of
	// viewport over document
	var view = dojo.window.getBox();

	// This won't work if the node is inside a <div style="position: relative">,
	// so reattach it to dojo.doc.body.   (Otherwise, the positioning will be wrong
	// and also it might get cutoff)
	if(!node.parentNode || String(node.parentNode.tagName).toLowerCase() != "body"){
		dojo.body().appendChild(node);
	}

	var best = null;
	dojo.some(choices, function(choice){
		var corner = choice.corner;
		var pos = choice.pos;
		var overflow = 0;

		// calculate amount of space available given specified position of node
		var spaceAvailable = {
			w: corner.charAt(1) == 'L' ? (view.l + view.w) - pos.x : pos.x - view.l,
			h: corner.charAt(1) == 'T' ? (view.t + view.h) - pos.y : pos.y - view.t
		};

		// configure node to be displayed in given position relative to button
		// (need to do this in order to get an accurate size for the node, because
		// a tooltip's size changes based on position, due to triangle)
		if(layoutNode){
			var res = layoutNode(node, choice.aroundCorner, corner, spaceAvailable, aroundNodeCoords);
			overflow = typeof res == "undefined" ? 0 : res;
		}

		// get node's size
		var style = node.style;
		var oldDisplay = style.display;
		var oldVis = style.visibility;
		style.visibility = "hidden";
		style.display = "";
		var mb = dojo.marginBox(node);
		style.display = oldDisplay;
		style.visibility = oldVis;

		// coordinates and size of node with specified corner placed at pos,
		// and clipped by viewport
		var startX = Math.max(view.l, corner.charAt(1) == 'L' ? pos.x : (pos.x - mb.w)),
			startY = Math.max(view.t, corner.charAt(0) == 'T' ? pos.y : (pos.y - mb.h)),
			endX = Math.min(view.l + view.w, corner.charAt(1) == 'L' ? (startX + mb.w) : pos.x),
			endY = Math.min(view.t + view.h, corner.charAt(0) == 'T' ? (startY + mb.h) : pos.y),
			width = endX - startX,
			height = endY - startY;

		overflow += (mb.w - width) + (mb.h - height);

		if(best == null || overflow < best.overflow){
			best = {
				corner: corner,
				aroundCorner: choice.aroundCorner,
				x: startX,
				y: startY,
				w: width,
				h: height,
				overflow: overflow,
				spaceAvailable: spaceAvailable
			};
		}
		
		return !overflow;
	});

	// In case the best position is not the last one we checked, need to call
	// layoutNode() again.
	if(best.overflow && layoutNode){
		layoutNode(node, best.aroundCorner, best.corner, best.spaceAvailable, aroundNodeCoords);
	}

	// And then position the node.   Do this last, after the layoutNode() above
	// has sized the node, due to browser quirks when the viewport is scrolled
	// (specifically that a Tooltip will shrink to fit as though the window was
	// scrolled to the left).
	//
	// In RTL mode, set style.right rather than style.left so in the common case,
	// window resizes move the popup along with the aroundNode.
	var l = dojo._isBodyLtr(),
		s = node.style;
	s.top = best.y + "px";
	s[l ? "left" : "right"] = (l ? best.x : view.w - best.x - best.w) + "px";
	
	return best;
}

dijit.placeOnScreenAroundNode = function(
	/* DomNode */		node,
	/* DomNode */		aroundNode,
	/* Object */		aroundCorners,
	/* Function? */		layoutNode){

	// summary:
	//		Position node adjacent or kitty-corner to aroundNode
	//		such that it's fully visible in viewport.
	//
	// description:
	//		Place node such that corner of node touches a corner of
	//		aroundNode, and that node is fully visible.
	//
	// aroundCorners:
	//		Ordered list of pairs of corners to try matching up.
	//		Each pair of corners is represented as a key/value in the hash,
	//		where the key corresponds to the aroundNode's corner, and
	//		the value corresponds to the node's corner:
	//
	//	|	{ aroundNodeCorner1: nodeCorner1, aroundNodeCorner2: nodeCorner2, ...}
	//
	//		The following strings are used to represent the four corners:
	//			* "BL" - bottom left
	//			* "BR" - bottom right
	//			* "TL" - top left
	//			* "TR" - top right
	//
	// layoutNode: Function(node, aroundNodeCorner, nodeCorner)
	//		For things like tooltip, they are displayed differently (and have different dimensions)
	//		based on their orientation relative to the parent.   This adjusts the popup based on orientation.
	//
	// example:
	//	|	dijit.placeOnScreenAroundNode(node, aroundNode, {'BL':'TL', 'TR':'BR'});
	//		This will try to position node such that node's top-left corner is at the same position
	//		as the bottom left corner of the aroundNode (ie, put node below
	//		aroundNode, with left edges aligned).  If that fails it will try to put
	// 		the bottom-right corner of node where the top right corner of aroundNode is
	//		(ie, put node above aroundNode, with right edges aligned)
	//

	// get coordinates of aroundNode
	aroundNode = dojo.byId(aroundNode);
	var aroundNodePos = dojo.position(aroundNode, true);

	// place the node around the calculated rectangle
	return dijit._placeOnScreenAroundRect(node,
		aroundNodePos.x, aroundNodePos.y, aroundNodePos.w, aroundNodePos.h,	// rectangle
		aroundCorners, layoutNode);
};

/*=====
dijit.__Rectangle = function(){
	// x: Integer
	//		horizontal offset in pixels, relative to document body
	// y: Integer
	//		vertical offset in pixels, relative to document body
	// width: Integer
	//		width in pixels
	// height: Integer
	//		height in pixels

	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
}
=====*/


dijit.placeOnScreenAroundRectangle = function(
	/* DomNode */			node,
	/* dijit.__Rectangle */	aroundRect,
	/* Object */			aroundCorners,
	/* Function */			layoutNode){

	// summary:
	//		Like dijit.placeOnScreenAroundNode(), except that the "around"
	//		parameter is an arbitrary rectangle on the screen (x, y, width, height)
	//		instead of a dom node.

	return dijit._placeOnScreenAroundRect(node,
		aroundRect.x, aroundRect.y, aroundRect.width, aroundRect.height,	// rectangle
		aroundCorners, layoutNode);
};

dijit._placeOnScreenAroundRect = function(
	/* DomNode */		node,
	/* Number */		x,
	/* Number */		y,
	/* Number */		width,
	/* Number */		height,
	/* Object */		aroundCorners,
	/* Function */		layoutNode){

	// summary:
	//		Like dijit.placeOnScreenAroundNode(), except it accepts coordinates
	//		of a rectangle to place node adjacent to.

	// TODO: combine with placeOnScreenAroundRectangle()

	// Generate list of possible positions for node
	var choices = [];
	for(var nodeCorner in aroundCorners){
		choices.push( {
			aroundCorner: nodeCorner,
			corner: aroundCorners[nodeCorner],
			pos: {
				x: x + (nodeCorner.charAt(1) == 'L' ? 0 : width),
				y: y + (nodeCorner.charAt(0) == 'T' ? 0 : height)
			}
		});
	}

	return dijit._place(node, choices, layoutNode, {w: width, h: height});
};

dijit.placementRegistry= new dojo.AdapterRegistry();
dijit.placementRegistry.register("node",
	function(n, x){
		return typeof x == "object" &&
			typeof x.offsetWidth != "undefined" && typeof x.offsetHeight != "undefined";
	},
	dijit.placeOnScreenAroundNode);
dijit.placementRegistry.register("rect",
	function(n, x){
		return typeof x == "object" &&
			"x" in x && "y" in x && "width" in x && "height" in x;
	},
	dijit.placeOnScreenAroundRectangle);

dijit.placeOnScreenAroundElement = function(
	/* DomNode */		node,
	/* Object */		aroundElement,
	/* Object */		aroundCorners,
	/* Function */		layoutNode){

	// summary:
	//		Like dijit.placeOnScreenAroundNode(), except it accepts an arbitrary object
	//		for the "around" argument and finds a proper processor to place a node.

	return dijit.placementRegistry.match.apply(dijit.placementRegistry, arguments);
};

dijit.getPopupAroundAlignment = function(/*Array*/ position, /*Boolean*/ leftToRight){
	// summary:
	//		Transforms the passed array of preferred positions into a format suitable for passing as the aroundCorners argument to dijit.placeOnScreenAroundElement.
	//
	// position: String[]
	//		This variable controls the position of the drop down.
	//		It's an array of strings with the following values:
	//
	//			* before: places drop down to the left of the target node/widget, or to the right in
	//			  the case of RTL scripts like Hebrew and Arabic
	//			* after: places drop down to the right of the target node/widget, or to the left in
	//			  the case of RTL scripts like Hebrew and Arabic
	//			* above: drop down goes above target node
	//			* below: drop down goes below target node
	//
	//		The list is positions is tried, in order, until a position is found where the drop down fits
	//		within the viewport.
	//
	// leftToRight: Boolean
	//		Whether the popup will be displaying in leftToRight mode.
	//
	var align = {};
	dojo.forEach(position, function(pos){
		switch(pos){
			case "after":
				align[leftToRight ? "BR" : "BL"] = leftToRight ? "BL" : "BR";
				break;
			case "before":
				align[leftToRight ? "BL" : "BR"] = leftToRight ? "BR" : "BL";
				break;
			case "below-alt":
				leftToRight = !leftToRight;
				// fall through
			case "below":
				// first try to align left borders, next try to align right borders (or reverse for RTL mode)
				align[leftToRight ? "BL" : "BR"] = leftToRight ? "TL" : "TR";
				align[leftToRight ? "BR" : "BL"] = leftToRight ? "TR" : "TL";
				break;
			case "above-alt":
				leftToRight = !leftToRight;
				// fall through
			case "above":
			default:
				// first try to align left borders, next try to align right borders (or reverse for RTL mode)
				align[leftToRight ? "TL" : "TR"] = leftToRight ? "BL" : "BR";
				align[leftToRight ? "TR" : "TL"] = leftToRight ? "BR" : "BL";
				break;
		}
	});
	return align;
};

}

if(!dojo._hasResource["dijit._base.window"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.window"] = true;
dojo.provide("dijit._base.window");



dijit.getDocumentWindow = function(doc){
	return dojo.window.get(doc);
};

}

if(!dojo._hasResource["dijit._base.popup"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.popup"] = true;
dojo.provide("dijit._base.popup");





/*=====
dijit.popup.__OpenArgs = function(){
	// popup: Widget
	//		widget to display
	// parent: Widget
	//		the button etc. that is displaying this popup
	// around: DomNode
	//		DOM node (typically a button); place popup relative to this node.  (Specify this *or* "x" and "y" parameters.)
	// x: Integer
	//		Absolute horizontal position (in pixels) to place node at.  (Specify this *or* "around" parameter.)
	// y: Integer
	//		Absolute vertical position (in pixels) to place node at.  (Specify this *or* "around" parameter.)
	// orient: Object|String
	//		When the around parameter is specified, orient should be an
	//		ordered list of tuples of the form (around-node-corner, popup-node-corner).
	//		dijit.popup.open() tries to position the popup according to each tuple in the list, in order,
	//		until the popup appears fully within the viewport.
	//
	//		The default value is {BL:'TL', TL:'BL'}, which represents a list of two tuples:
	//			1. (BL, TL)
	//			2. (TL, BL)
	//		where BL means "bottom left" and "TL" means "top left".
	//		So by default, it first tries putting the popup below the around node, left-aligning them,
	//		and then tries to put it above the around node, still left-aligning them.   Note that the
	//		default is horizontally reversed when in RTL mode.
	//
	//		When an (x,y) position is specified rather than an around node, orient is either
	//		"R" or "L".  R (for right) means that it tries to put the popup to the right of the mouse,
	//		specifically positioning the popup's top-right corner at the mouse position, and if that doesn't
	//		fit in the viewport, then it tries, in order, the bottom-right corner, the top left corner,
	//		and the top-right corner.
	// onCancel: Function
	//		callback when user has canceled the popup by
	//			1. hitting ESC or
	//			2. by using the popup widget's proprietary cancel mechanism (like a cancel button in a dialog);
	//			   i.e. whenever popupWidget.onCancel() is called, args.onCancel is called
	// onClose: Function
	//		callback whenever this popup is closed
	// onExecute: Function
	//		callback when user "executed" on the popup/sub-popup by selecting a menu choice, etc. (top menu only)
	// padding: dijit.__Position
	//		adding a buffer around the opening position. This is only useful when around is not set.
	this.popup = popup;
	this.parent = parent;
	this.around = around;
	this.x = x;
	this.y = y;
	this.orient = orient;
	this.onCancel = onCancel;
	this.onClose = onClose;
	this.onExecute = onExecute;
	this.padding = padding;
}
=====*/

dijit.popup = {
	// summary:
	//		This singleton is used to show/hide widgets as popups.

	// _stack: dijit._Widget[]
	//		Stack of currently popped up widgets.
	//		(someone opened _stack[0], and then it opened _stack[1], etc.)
	_stack: [],
	
	// _beginZIndex: Number
	//		Z-index of the first popup.   (If first popup opens other
	//		popups they get a higher z-index.)
	_beginZIndex: 1000,

	_idGen: 1,

	_createWrapper: function(/*Widget || DomNode*/ widget){
		// summary:
		//		Initialization for widgets that will be used as popups.
		//		Puts widget inside a wrapper DIV (if not already in one),
		//		and returns pointer to that wrapper DIV.

		var wrapper = widget.declaredClass ? widget._popupWrapper : (widget.parentNode && dojo.hasClass(widget.parentNode, "dijitPopup")),
			node = widget.domNode || widget;

		if(!wrapper){
			// Create wrapper <div> for when this widget [in the future] will be used as a popup.
			// This is done early because of IE bugs where creating/moving DOM nodes causes focus
			// to go wonky, see tests/robot/Toolbar.html to reproduce
			wrapper = dojo.create("div",{
				"class":"dijitPopup",
				style:{ display: "none"},
				role: "presentation"
			}, dojo.body());
			wrapper.appendChild(node);

			var s = node.style;
			s.display = "";
			s.visibility = "";
			s.position = "";
			s.top = "0px";

			if(widget.declaredClass){		// TODO: in 2.0 change signature to always take widget, then remove if()
				widget._popupWrapper = wrapper;
				dojo.connect(widget, "destroy", function(){
					dojo.destroy(wrapper);
					delete widget._popupWrapper;
				});
			}
		}
		
		return wrapper;
	},

	moveOffScreen: function(/*Widget || DomNode*/ widget){
		// summary:
		//		Moves the popup widget off-screen.
		//		Do not use this method to hide popups when not in use, because
		//		that will create an accessibility issue: the offscreen popup is
		//		still in the tabbing order.

		// Create wrapper if not already there
		var wrapper = this._createWrapper(widget);

		dojo.style(wrapper, {
			visibility: "hidden",
			top: "-9999px",		// prevent transient scrollbar causing misalign (#5776), and initial flash in upper left (#10111)
			display: ""
		});
	},

	hide: function(/*dijit._Widget*/ widget){
		// summary:
		//		Hide this popup widget (until it is ready to be shown).
		//		Initialization for widgets that will be used as popups
		//
		// 		Also puts widget inside a wrapper DIV (if not already in one)
		//
		//		If popup widget needs to layout it should
		//		do so when it is made visible, and popup._onShow() is called.

		// Create wrapper if not already there
		var wrapper = this._createWrapper(widget);

		dojo.style(wrapper, "display", "none");
	},
		
	getTopPopup: function(){
		// summary:
		//		Compute the closest ancestor popup that's *not* a child of another popup.
		//		Ex: For a TooltipDialog with a button that spawns a tree of menus, find the popup of the button.
		var stack = this._stack;
		for(var pi=stack.length-1; pi > 0 && stack[pi].parent === stack[pi-1].widget; pi--){
			/* do nothing, just trying to get right value for pi */
		}
		return stack[pi];
	},

	open: function(/*dijit.popup.__OpenArgs*/ args){
		// summary:
		//		Popup the widget at the specified position
		//
		// example:
		//		opening at the mouse position
		//		|		dijit.popup.open({popup: menuWidget, x: evt.pageX, y: evt.pageY});
		//
		// example:
		//		opening the widget as a dropdown
		//		|		dijit.popup.open({parent: this, popup: menuWidget, around: this.domNode, onClose: function(){...}});
		//
		//		Note that whatever widget called dijit.popup.open() should also listen to its own _onBlur callback
		//		(fired from _base/focus.js) to know that focus has moved somewhere else and thus the popup should be closed.

		var stack = this._stack,
			widget = args.popup,
			orient = args.orient || (
				(args.parent ? args.parent.isLeftToRight() : dojo._isBodyLtr()) ?
				{'BL':'TL', 'BR':'TR', 'TL':'BL', 'TR':'BR'} :
				{'BR':'TR', 'BL':'TL', 'TR':'BR', 'TL':'BL'}
			),
			around = args.around,
			id = (args.around && args.around.id) ? (args.around.id+"_dropdown") : ("popup_"+this._idGen++);

		// If we are opening a new popup that isn't a child of a currently opened popup, then
		// close currently opened popup(s).   This should happen automatically when the old popups
		// gets the _onBlur() event, except that the _onBlur() event isn't reliable on IE, see [22198].
		while(stack.length && (!args.parent || !dojo.isDescendant(args.parent.domNode, stack[stack.length-1].widget.domNode))){
			dijit.popup.close(stack[stack.length-1].widget);
		}

		// Get pointer to popup wrapper, and create wrapper if it doesn't exist
		var wrapper = this._createWrapper(widget);


		dojo.attr(wrapper, {
			id: id,
			style: {
				zIndex: this._beginZIndex + stack.length
			},
			"class": "dijitPopup " + (widget.baseClass || widget["class"] || "").split(" ")[0] +"Popup",
			dijitPopupParent: args.parent ? args.parent.id : ""
		});

		if(dojo.isIE || dojo.isMoz){
			if(!widget.bgIframe){
				// setting widget.bgIframe triggers cleanup in _Widget.destroy()
				widget.bgIframe = new dijit.BackgroundIframe(wrapper);
			}
		}

		// position the wrapper node and make it visible
		var best = around ?
			dijit.placeOnScreenAroundElement(wrapper, around, orient, widget.orient ? dojo.hitch(widget, "orient") : null) :
			dijit.placeOnScreen(wrapper, args, orient == 'R' ? ['TR','BR','TL','BL'] : ['TL','BL','TR','BR'], args.padding);

		wrapper.style.display = "";
		wrapper.style.visibility = "visible";
		widget.domNode.style.visibility = "visible";	// counteract effects from _HasDropDown

		var handlers = [];

		// provide default escape and tab key handling
		// (this will work for any widget, not just menu)
		handlers.push(dojo.connect(wrapper, "onkeypress", this, function(evt){
			if(evt.charOrCode == dojo.keys.ESCAPE && args.onCancel){
				dojo.stopEvent(evt);
				args.onCancel();
			}else if(evt.charOrCode === dojo.keys.TAB){
				dojo.stopEvent(evt);
				var topPopup = this.getTopPopup();
				if(topPopup && topPopup.onCancel){
					topPopup.onCancel();
				}
			}
		}));

		// watch for cancel/execute events on the popup and notify the caller
		// (for a menu, "execute" means clicking an item)
		if(widget.onCancel){
			handlers.push(dojo.connect(widget, "onCancel", args.onCancel));
		}

		handlers.push(dojo.connect(widget, widget.onExecute ? "onExecute" : "onChange", this, function(){
			var topPopup = this.getTopPopup();
			if(topPopup && topPopup.onExecute){
				topPopup.onExecute();
			}
		}));

		stack.push({
			widget: widget,
			parent: args.parent,
			onExecute: args.onExecute,
			onCancel: args.onCancel,
 			onClose: args.onClose,
			handlers: handlers
		});

		if(widget.onOpen){
			// TODO: in 2.0 standardize onShow() (used by StackContainer) and onOpen() (used here)
			widget.onOpen(best);
		}

		return best;
	},

	close: function(/*dijit._Widget?*/ popup){
		// summary:
		//		Close specified popup and any popups that it parented.
		//		If no popup is specified, closes all popups.

		var stack = this._stack;

		// Basically work backwards from the top of the stack closing popups
		// until we hit the specified popup, but IIRC there was some issue where closing
		// a popup would cause others to close too.  Thus if we are trying to close B in [A,B,C]
		// closing C might close B indirectly and then the while() condition will run where stack==[A]...
		// so the while condition is constructed defensively.
		while((popup && dojo.some(stack, function(elem){return elem.widget == popup;})) ||
			(!popup && stack.length)){
			var top = stack.pop(),
				widget = top.widget,
				onClose = top.onClose;

			if(widget.onClose){
				// TODO: in 2.0 standardize onHide() (used by StackContainer) and onClose() (used here)
				widget.onClose();
			}
			dojo.forEach(top.handlers, dojo.disconnect);

			// Hide the widget and it's wrapper unless it has already been destroyed in above onClose() etc.
			if(widget && widget.domNode){
				this.hide(widget);
			}
                        
			if(onClose){
				onClose();
			}
		}
	}
};

// TODO: remove dijit._frames, it isn't being used much, since popups never release their
// iframes (see [22236])
dijit._frames = new function(){
	// summary:
	//		cache of iframes

	var queue = [];

	this.pop = function(){
		var iframe;
		if(queue.length){
			iframe = queue.pop();
			iframe.style.display="";
		}else{
			if(dojo.isIE < 9){
				var burl = dojo.config["dojoBlankHtmlUrl"] || (dojo.moduleUrl("dojo", "resources/blank.html")+"") || "javascript:\"\"";
				var html="<iframe src='" + burl + "'"
					+ " style='position: absolute; left: 0px; top: 0px;"
					+ "z-index: -1; filter:Alpha(Opacity=\"0\");'>";
				iframe = dojo.doc.createElement(html);
			}else{
			 	iframe = dojo.create("iframe");
				iframe.src = 'javascript:""';
				iframe.className = "dijitBackgroundIframe";
				dojo.style(iframe, "opacity", 0.1);
			}
			iframe.tabIndex = -1; // Magic to prevent iframe from getting focus on tab keypress - as style didn't work.
			dijit.setWaiRole(iframe,"presentation");
		}
		return iframe;
	};

	this.push = function(iframe){
		iframe.style.display="none";
		queue.push(iframe);
	}
}();


dijit.BackgroundIframe = function(/*DomNode*/ node){
	// summary:
	//		For IE/FF z-index schenanigans. id attribute is required.
	//
	// description:
	//		new dijit.BackgroundIframe(node)
	//			Makes a background iframe as a child of node, that fills
	//			area (and position) of node

	if(!node.id){ throw new Error("no id"); }
	if(dojo.isIE || dojo.isMoz){
		var iframe = (this.iframe = dijit._frames.pop());
		node.appendChild(iframe);
		if(dojo.isIE<7 || dojo.isQuirks){
			this.resize(node);
			this._conn = dojo.connect(node, 'onresize', this, function(){
				this.resize(node);
			});
		}else{
			dojo.style(iframe, {
				width: '100%',
				height: '100%'
			});
		}
	}
};

dojo.extend(dijit.BackgroundIframe, {
	resize: function(node){
		// summary:
		// 		Resize the iframe so it's the same size as node.
		//		Needed on IE6 and IE/quirks because height:100% doesn't work right.
		if(this.iframe){
			dojo.style(this.iframe, {
				width: node.offsetWidth + 'px',
				height: node.offsetHeight + 'px'
			});
		}
	},
	destroy: function(){
		// summary:
		//		destroy the iframe
		if(this._conn){
			dojo.disconnect(this._conn);
			this._conn = null;
		}
		if(this.iframe){
			dijit._frames.push(this.iframe);
			delete this.iframe;
		}
	}
});

}

if(!dojo._hasResource["dijit._base.scroll"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.scroll"] = true;
dojo.provide("dijit._base.scroll");



dijit.scrollIntoView = function(/*DomNode*/ node, /*Object?*/ pos){
	// summary:
	//		Scroll the passed node into view, if it is not already.
	//		Deprecated, use `dojo.window.scrollIntoView` instead.
	
	dojo.window.scrollIntoView(node, pos);
};

}

if(!dojo._hasResource["dojo.uacss"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.uacss"] = true;
dojo.provide("dojo.uacss");


(function(){
	// summary:
	//		Applies pre-set CSS classes to the top-level HTML node, based on:
	// 			- browser (ex: dj_ie)
	//			- browser version (ex: dj_ie6)
	//			- box model (ex: dj_contentBox)
	//			- text direction (ex: dijitRtl)
	//
	//		In addition, browser, browser version, and box model are
	//		combined with an RTL flag when browser text is RTL.  ex: dj_ie-rtl.

	var d = dojo,
		html = d.doc.documentElement,
		ie = d.isIE,
		opera = d.isOpera,
		maj = Math.floor,
		ff = d.isFF,
		boxModel = d.boxModel.replace(/-/,''),

		classes = {
			dj_ie: ie,
			dj_ie6: maj(ie) == 6,
			dj_ie7: maj(ie) == 7,
			dj_ie8: maj(ie) == 8,
			dj_ie9: maj(ie) == 9,
			dj_quirks: d.isQuirks,
			dj_iequirks: ie && d.isQuirks,

			// NOTE: Opera not supported by dijit
			dj_opera: opera,

			dj_khtml: d.isKhtml,

			dj_webkit: d.isWebKit,
			dj_safari: d.isSafari,
			dj_chrome: d.isChrome,

			dj_gecko: d.isMozilla,
			dj_ff3: maj(ff) == 3
		}; // no dojo unsupported browsers

	classes["dj_" + boxModel] = true;

	// apply browser, browser version, and box model class names
	var classStr = "";
	for(var clz in classes){
		if(classes[clz]){
			classStr += clz + " ";
		}
	}
	html.className = d.trim(html.className + " " + classStr);

	// If RTL mode, then add dj_rtl flag plus repeat existing classes with -rtl extension.
	// We can't run the code below until the <body> tag has loaded (so we can check for dir=rtl).
	// Unshift() is to run sniff code before the parser.
	dojo._loaders.unshift(function(){
		if(!dojo._isBodyLtr()){
			var rtlClassStr = "dj_rtl dijitRtl " + classStr.replace(/ /g, "-rtl ")
			html.className = d.trim(html.className + " " + rtlClassStr);
		}
	});
})();

}

if(!dojo._hasResource["dijit._base.sniff"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.sniff"] = true;
dojo.provide("dijit._base.sniff");



// summary:
//		Applies pre-set CSS classes to the top-level HTML node, see
//		`dojo.uacss` for details.
//
//		Simply doing a require on this module will
//		establish this CSS.  Modified version of Morris' CSS hack.

}

if(!dojo._hasResource["dijit._base.typematic"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.typematic"] = true;
dojo.provide("dijit._base.typematic");


dijit.typematic = {
	// summary:
	//		These functions are used to repetitively call a user specified callback
	//		method when a specific key or mouse click over a specific DOM node is
	//		held down for a specific amount of time.
	//		Only 1 such event is allowed to occur on the browser page at 1 time.

	_fireEventAndReload: function(){
		this._timer = null;
		this._callback(++this._count, this._node, this._evt);
		
		// Schedule next event, timer is at most minDelay (default 10ms) to avoid
		// browser overload (particularly avoiding starving DOH robot so it never gets to send a mouseup)
		this._currentTimeout = Math.max(
			this._currentTimeout < 0 ? this._initialDelay :
				(this._subsequentDelay > 1 ? this._subsequentDelay : Math.round(this._currentTimeout * this._subsequentDelay)),
			this._minDelay);
		this._timer = setTimeout(dojo.hitch(this, "_fireEventAndReload"), this._currentTimeout);
	},

	trigger: function(/*Event*/ evt, /*Object*/ _this, /*DOMNode*/ node, /*Function*/ callback, /*Object*/ obj, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
		// summary:
		//		Start a timed, repeating callback sequence.
		//		If already started, the function call is ignored.
		//		This method is not normally called by the user but can be
		//		when the normal listener code is insufficient.
		// evt:
		//		key or mouse event object to pass to the user callback
		// _this:
		//		pointer to the user's widget space.
		// node:
		//		the DOM node object to pass the the callback function
		// callback:
		//		function to call until the sequence is stopped called with 3 parameters:
		// count:
		//		integer representing number of repeated calls (0..n) with -1 indicating the iteration has stopped
		// node:
		//		the DOM node object passed in
		// evt:
		//		key or mouse event object
		// obj:
		//		user space object used to uniquely identify each typematic sequence
		// subsequentDelay (optional):
		//		if > 1, the number of milliseconds until the 3->n events occur
		//		or else the fractional time multiplier for the next event's delay, default=0.9
		// initialDelay (optional):
		//		the number of milliseconds until the 2nd event occurs, default=500ms
		// minDelay (optional):
		//		the maximum delay in milliseconds for event to fire, default=10ms
		if(obj != this._obj){
			this.stop();
			this._initialDelay = initialDelay || 500;
			this._subsequentDelay = subsequentDelay || 0.90;
			this._minDelay = minDelay || 10;
			this._obj = obj;
			this._evt = evt;
			this._node = node;
			this._currentTimeout = -1;
			this._count = -1;
			this._callback = dojo.hitch(_this, callback);
			this._fireEventAndReload();
			this._evt = dojo.mixin({faux: true}, evt);
		}
	},

	stop: function(){
		// summary:
		//		Stop an ongoing timed, repeating callback sequence.
		if(this._timer){
			clearTimeout(this._timer);
			this._timer = null;
		}
		if(this._obj){
			this._callback(-1, this._node, this._evt);
			this._obj = null;
		}
	},

	addKeyListener: function(/*DOMNode*/ node, /*Object*/ keyObject, /*Object*/ _this, /*Function*/ callback, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
		// summary:
		//		Start listening for a specific typematic key.
		//		See also the trigger method for other parameters.
		// keyObject:
		//		an object defining the key to listen for:
		// 		charOrCode:
		//			the printable character (string) or keyCode (number) to listen for.
		// 		keyCode:
		//			(deprecated - use charOrCode) the keyCode (number) to listen for (implies charCode = 0).
		// 		charCode:
		//			(deprecated - use charOrCode) the charCode (number) to listen for.
		// 		ctrlKey:
		//			desired ctrl key state to initiate the callback sequence:
		//			- pressed (true)
		//			- released (false)
		//			- either (unspecified)
		// 		altKey:
		//			same as ctrlKey but for the alt key
		// 		shiftKey:
		//			same as ctrlKey but for the shift key
		// returns:
		//		an array of dojo.connect handles
		if(keyObject.keyCode){
			keyObject.charOrCode = keyObject.keyCode;
			dojo.deprecated("keyCode attribute parameter for dijit.typematic.addKeyListener is deprecated. Use charOrCode instead.", "", "2.0");
		}else if(keyObject.charCode){
			keyObject.charOrCode = String.fromCharCode(keyObject.charCode);
			dojo.deprecated("charCode attribute parameter for dijit.typematic.addKeyListener is deprecated. Use charOrCode instead.", "", "2.0");
		}
		return [
			dojo.connect(node, "onkeypress", this, function(evt){
				if(evt.charOrCode == keyObject.charOrCode &&
				(keyObject.ctrlKey === undefined || keyObject.ctrlKey == evt.ctrlKey) &&
				(keyObject.altKey === undefined || keyObject.altKey == evt.altKey) &&
				(keyObject.metaKey === undefined || keyObject.metaKey == (evt.metaKey || false)) && // IE doesn't even set metaKey
				(keyObject.shiftKey === undefined || keyObject.shiftKey == evt.shiftKey)){
					dojo.stopEvent(evt);
					dijit.typematic.trigger(evt, _this, node, callback, keyObject, subsequentDelay, initialDelay, minDelay);
				}else if(dijit.typematic._obj == keyObject){
					dijit.typematic.stop();
				}
			}),
			dojo.connect(node, "onkeyup", this, function(evt){
				if(dijit.typematic._obj == keyObject){
					dijit.typematic.stop();
				}
			})
		];
	},

	addMouseListener: function(/*DOMNode*/ node, /*Object*/ _this, /*Function*/ callback, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
		// summary:
		//		Start listening for a typematic mouse click.
		//		See the trigger method for other parameters.
		// returns:
		//		an array of dojo.connect handles
		var dc = dojo.connect;
		return [
			dc(node, "mousedown", this, function(evt){
				dojo.stopEvent(evt);
				dijit.typematic.trigger(evt, _this, node, callback, node, subsequentDelay, initialDelay, minDelay);
			}),
			dc(node, "mouseup", this, function(evt){
				dojo.stopEvent(evt);
				dijit.typematic.stop();
			}),
			dc(node, "mouseout", this, function(evt){
				dojo.stopEvent(evt);
				dijit.typematic.stop();
			}),
			dc(node, "mousemove", this, function(evt){
				evt.preventDefault();
			}),
			dc(node, "dblclick", this, function(evt){
				dojo.stopEvent(evt);
				if(dojo.isIE){
					dijit.typematic.trigger(evt, _this, node, callback, node, subsequentDelay, initialDelay, minDelay);
					setTimeout(dojo.hitch(this, dijit.typematic.stop), 50);
				}
			})
		];
	},

	addListener: function(/*Node*/ mouseNode, /*Node*/ keyNode, /*Object*/ keyObject, /*Object*/ _this, /*Function*/ callback, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
		// summary:
		//		Start listening for a specific typematic key and mouseclick.
		//		This is a thin wrapper to addKeyListener and addMouseListener.
		//		See the addMouseListener and addKeyListener methods for other parameters.
		// mouseNode:
		//		the DOM node object to listen on for mouse events.
		// keyNode:
		//		the DOM node object to listen on for key events.
		// returns:
		//		an array of dojo.connect handles
		return this.addKeyListener(keyNode, keyObject, _this, callback, subsequentDelay, initialDelay, minDelay).concat(
			this.addMouseListener(mouseNode, _this, callback, subsequentDelay, initialDelay, minDelay));
	}
};

}

if(!dojo._hasResource["dijit._base.wai"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.wai"] = true;
dojo.provide("dijit._base.wai");


dijit.wai = {
	onload: function(){
		// summary:
		//		Detects if we are in high-contrast mode or not

		// This must be a named function and not an anonymous
		// function, so that the widget parsing code can make sure it
		// registers its onload function after this function.
		// DO NOT USE "this" within this function.

		// create div for testing if high contrast mode is on or images are turned off
		var div = dojo.create("div",{
			id: "a11yTestNode",
			style:{
				cssText:'border: 1px solid;'
					+ 'border-color:red green;'
					+ 'position: absolute;'
					+ 'height: 5px;'
					+ 'top: -999px;'
					+ 'background-image: url("' + (dojo.config.blankGif || dojo.moduleUrl("dojo", "resources/blank.gif")) + '");'
			}
		}, dojo.body());

		// test it
		var cs = dojo.getComputedStyle(div);
		if(cs){
			var bkImg = cs.backgroundImage;
			var needsA11y = (cs.borderTopColor == cs.borderRightColor) || (bkImg != null && (bkImg == "none" || bkImg == "url(invalid-url:)" ));
			dojo[needsA11y ? "addClass" : "removeClass"](dojo.body(), "dijit_a11y");
			if(dojo.isIE){
				div.outerHTML = "";		// prevent mixed-content warning, see http://support.microsoft.com/kb/925014
			}else{
				dojo.body().removeChild(div);
			}
		}
	}
};

// Test if computer is in high contrast mode.
// Make sure the a11y test runs first, before widgets are instantiated.
if(dojo.isIE || dojo.isMoz){	// NOTE: checking in Safari messes things up
	dojo._loaders.unshift(dijit.wai.onload);
}

dojo.mixin(dijit, {
	hasWaiRole: function(/*Element*/ elem, /*String?*/ role){
		// summary:
		//		Determines if an element has a particular role.
		// returns:
		//		True if elem has the specific role attribute and false if not.
		// 		For backwards compatibility if role parameter not provided,
		// 		returns true if has a role
		var waiRole = this.getWaiRole(elem);
		return role ? (waiRole.indexOf(role) > -1) : (waiRole.length > 0);
	},

	getWaiRole: function(/*Element*/ elem){
		// summary:
		//		Gets the role for an element (which should be a wai role).
		// returns:
		//		The role of elem or an empty string if elem
		//		does not have a role.
		 return dojo.trim((dojo.attr(elem, "role") || "").replace("wairole:",""));
	},

	setWaiRole: function(/*Element*/ elem, /*String*/ role){
		// summary:
		//		Sets the role on an element.
		// description:
		//		Replace existing role attribute with new role.

			dojo.attr(elem, "role", role);
	},

	removeWaiRole: function(/*Element*/ elem, /*String*/ role){
		// summary:
		//		Removes the specified role from an element.
		// 		Removes role attribute if no specific role provided (for backwards compat.)

		var roleValue = dojo.attr(elem, "role");
		if(!roleValue){ return; }
		if(role){
			var t = dojo.trim((" " + roleValue + " ").replace(" " + role + " ", " "));
			dojo.attr(elem, "role", t);
		}else{
			elem.removeAttribute("role");
		}
	},

	hasWaiState: function(/*Element*/ elem, /*String*/ state){
		// summary:
		//		Determines if an element has a given state.
		// description:
		//		Checks for an attribute called "aria-"+state.
		// returns:
		//		true if elem has a value for the given state and
		//		false if it does not.

		return elem.hasAttribute ? elem.hasAttribute("aria-"+state) : !!elem.getAttribute("aria-"+state);
	},

	getWaiState: function(/*Element*/ elem, /*String*/ state){
		// summary:
		//		Gets the value of a state on an element.
		// description:
		//		Checks for an attribute called "aria-"+state.
		// returns:
		//		The value of the requested state on elem
		//		or an empty string if elem has no value for state.

		return elem.getAttribute("aria-"+state) || "";
	},

	setWaiState: function(/*Element*/ elem, /*String*/ state, /*String*/ value){
		// summary:
		//		Sets a state on an element.
		// description:
		//		Sets an attribute called "aria-"+state.

		elem.setAttribute("aria-"+state, value);
	},

	removeWaiState: function(/*Element*/ elem, /*String*/ state){
		// summary:
		//		Removes a state from an element.
		// description:
		//		Sets an attribute called "aria-"+state.

		elem.removeAttribute("aria-"+state);
	}
});

}

if(!dojo._hasResource["dijit._base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base"] = true;
dojo.provide("dijit._base");












}

if(!dojo._hasResource["dijit._Widget"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._Widget"] = true;
dojo.provide("dijit._Widget");





////////////////// DEFERRED CONNECTS ///////////////////

// This code is to assist deferring dojo.connect() calls in widgets (connecting to events on the widgets'
// DOM nodes) until someone actually needs to monitor that event.
dojo.connect(dojo, "_connect",
	function(/*dijit._Widget*/ widget, /*String*/ event){
		if(widget && dojo.isFunction(widget._onConnect)){
			widget._onConnect(event);
		}
	});

dijit._connectOnUseEventHandler = function(/*Event*/ event){};

////////////////// ONDIJITCLICK SUPPORT ///////////////////

// Keep track of where the last keydown event was, to help avoid generating
// spurious ondijitclick events when:
// 1. focus is on a <button> or <a>
// 2. user presses then releases the ENTER key
// 3. onclick handler fires and shifts focus to another node, with an ondijitclick handler
// 4. onkeyup event fires, causing the ondijitclick handler to fire
dijit._lastKeyDownNode = null;
if(dojo.isIE){
	(function(){
		var keydownCallback = function(evt){
			dijit._lastKeyDownNode = evt.srcElement;
		};
		dojo.doc.attachEvent('onkeydown', keydownCallback);
		dojo.addOnWindowUnload(function(){
			dojo.doc.detachEvent('onkeydown', keydownCallback);
		});
	})();
}else{
	dojo.doc.addEventListener('keydown', function(evt){
		dijit._lastKeyDownNode = evt.target;
	}, true);
}

(function(){

dojo.declare("dijit._Widget", dijit._WidgetBase, {
	// summary:
	//		Base class for all Dijit widgets.
	//
	//		Extends _WidgetBase, adding support for:
	//			- deferred connections
	//				A call like dojo.connect(myWidget, "onMouseMove", func)
	//				will essentially do a dojo.connect(myWidget.domNode, "onMouseMove", func)
	//			- ondijitclick
	//				Support new dojoAttachEvent="ondijitclick: ..." that is triggered by a mouse click or a SPACE/ENTER keypress
	//			- focus related functions
	//				In particular, the onFocus()/onBlur() callbacks.   Driven internally by
	//				dijit/_base/focus.js.
	//			- deprecated methods
	//			- onShow(), onHide(), onClose()
	//
	//		Also, by loading code in dijit/_base, turns on:
	//			- browser sniffing (putting browser id like .dj_ie on <html> node)
	//			- high contrast mode sniffing (add .dijit_a11y class to <body> if machine is in high contrast mode)
	

	////////////////// DEFERRED CONNECTS ///////////////////

	// _deferredConnects: [protected] Object
	//		attributeMap addendum for event handlers that should be connected only on first use
	_deferredConnects: {
		onClick: "",
		onDblClick: "",
		onKeyDown: "",
		onKeyPress: "",
		onKeyUp: "",
		onMouseMove: "",
		onMouseDown: "",
		onMouseOut: "",
		onMouseOver: "",
		onMouseLeave: "",
		onMouseEnter: "",
		onMouseUp: ""
	},

	onClick: dijit._connectOnUseEventHandler,
	/*=====
	onClick: function(event){
		// summary:
		//		Connect to this function to receive notifications of mouse click events.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onDblClick: dijit._connectOnUseEventHandler,
	/*=====
	onDblClick: function(event){
		// summary:
		//		Connect to this function to receive notifications of mouse double click events.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onKeyDown: dijit._connectOnUseEventHandler,
	/*=====
	onKeyDown: function(event){
		// summary:
		//		Connect to this function to receive notifications of keys being pressed down.
		// event:
		//		key Event
		// tags:
		//		callback
	},
	=====*/
	onKeyPress: dijit._connectOnUseEventHandler,
	/*=====
	onKeyPress: function(event){
		// summary:
		//		Connect to this function to receive notifications of printable keys being typed.
		// event:
		//		key Event
		// tags:
		//		callback
	},
	=====*/
	onKeyUp: dijit._connectOnUseEventHandler,
	/*=====
	onKeyUp: function(event){
		// summary:
		//		Connect to this function to receive notifications of keys being released.
		// event:
		//		key Event
		// tags:
		//		callback
	},
	=====*/
	onMouseDown: dijit._connectOnUseEventHandler,
	/*=====
	onMouseDown: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse button is pressed down.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseMove: dijit._connectOnUseEventHandler,
	/*=====
	onMouseMove: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves over nodes contained within this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseOut: dijit._connectOnUseEventHandler,
	/*=====
	onMouseOut: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves off of nodes contained within this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseOver: dijit._connectOnUseEventHandler,
	/*=====
	onMouseOver: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves onto nodes contained within this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseLeave: dijit._connectOnUseEventHandler,
	/*=====
	onMouseLeave: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves off of this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseEnter: dijit._connectOnUseEventHandler,
	/*=====
	onMouseEnter: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves onto this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseUp: dijit._connectOnUseEventHandler,
	/*=====
	onMouseUp: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse button is released.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/

	create: function(/*Object?*/params, /*DomNode|String?*/srcNodeRef){
		// To avoid double-connects, remove entries from _deferredConnects
		// that have been setup manually by a subclass (ex, by dojoAttachEvent).
		// If a subclass has redefined a callback (ex: onClick) then assume it's being
		// connected to manually.
		this._deferredConnects = dojo.clone(this._deferredConnects);
		for(var attr in this.attributeMap){
			delete this._deferredConnects[attr]; // can't be in both attributeMap and _deferredConnects
		}
		for(attr in this._deferredConnects){
			if(this[attr] !== dijit._connectOnUseEventHandler){
				delete this._deferredConnects[attr];	// redefined, probably dojoAttachEvent exists
			}
		}

		this.inherited(arguments);

		if(this.domNode){
			// If the developer has specified a handler as a widget parameter
			// (ex: new Button({onClick: ...})
			// then naturally need to connect from DOM node to that handler immediately,
			for(attr in this.params){
				this._onConnect(attr);
			}
		}
	},

	_onConnect: function(/*String*/ event){
		// summary:
		//		Called when someone connects to one of my handlers.
		//		"Turn on" that handler if it isn't active yet.
		//
		//		This is also called for every single initialization parameter
		//		so need to do nothing for parameters like "id".
		// tags:
		//		private
		if(event in this._deferredConnects){
			var mapNode = this[this._deferredConnects[event] || 'domNode'];
			this.connect(mapNode, event.toLowerCase(), event);
			delete this._deferredConnects[event];
		}
	},

	////////////////// FOCUS RELATED ///////////////////
	// _onFocus() and _onBlur() are called by the focus manager

	// focused: [readonly] Boolean
	//		This widget or a widget it contains has focus, or is "active" because
	//		it was recently clicked.
	focused: false,

	isFocusable: function(){
		// summary:
		//		Return true if this widget can currently be focused
		//		and false if not
		return this.focus && (dojo.style(this.domNode, "display") != "none");
	},

	onFocus: function(){
		// summary:
		//		Called when the widget becomes "active" because
		//		it or a widget inside of it either has focus, or has recently
		//		been clicked.
		// tags:
		//		callback
	},

	onBlur: function(){
		// summary:
		//		Called when the widget stops being "active" because
		//		focus moved to something outside of it, or the user
		//		clicked somewhere outside of it, or the widget was
		//		hidden.
		// tags:
		//		callback
	},

	_onFocus: function(e){
		// summary:
		//		This is where widgets do processing for when they are active,
		//		such as changing CSS classes.  See onFocus() for more details.
		// tags:
		//		protected
		this.onFocus();
	},

	_onBlur: function(){
		// summary:
		//		This is where widgets do processing for when they stop being active,
		//		such as changing CSS classes.  See onBlur() for more details.
		// tags:
		//		protected
		this.onBlur();
	},

	////////////////// DEPRECATED METHODS ///////////////////

	setAttribute: function(/*String*/ attr, /*anything*/ value){
		// summary:
		//		Deprecated.  Use set() instead.
		// tags:
		//		deprecated
		dojo.deprecated(this.declaredClass+"::setAttribute(attr, value) is deprecated. Use set() instead.", "", "2.0");
		this.set(attr, value);
	},

	attr: function(/*String|Object*/name, /*Object?*/value){
		// summary:
		//		Set or get properties on a widget instance.
		//	name:
		//		The property to get or set. If an object is passed here and not
		//		a string, its keys are used as names of attributes to be set
		//		and the value of the object as values to set in the widget.
		//	value:
		//		Optional. If provided, attr() operates as a setter. If omitted,
		//		the current value of the named property is returned.
		// description:
		//		This method is deprecated, use get() or set() directly.

		// Print deprecation warning but only once per calling function
		if(dojo.config.isDebug){
			var alreadyCalledHash = arguments.callee._ach || (arguments.callee._ach = {}),
				caller = (arguments.callee.caller || "unknown caller").toString();
			if(!alreadyCalledHash[caller]){
				dojo.deprecated(this.declaredClass + "::attr() is deprecated. Use get() or set() instead, called from " +
				caller, "", "2.0");
				alreadyCalledHash[caller] = true;
			}
		}

		var args = arguments.length;
		if(args >= 2 || typeof name === "object"){ // setter
			return this.set.apply(this, arguments);
		}else{ // getter
			return this.get(name);
		}
	},
	
	////////////////// ONDIJITCLICK SUPPORT ///////////////////

	// nodesWithKeyClick: [private] String[]
	//		List of nodes that correctly handle click events via native browser support,
	//		and don't need dijit's help
	nodesWithKeyClick: ["input", "button"],

	connect: function(
			/*Object|null*/ obj,
			/*String|Function*/ event,
			/*String|Function*/ method){
		// summary:
		//		Connects specified obj/event to specified method of this object
		//		and registers for disconnect() on widget destroy.
		// description:
		//		Provide widget-specific analog to dojo.connect, except with the
		//		implicit use of this widget as the target object.
		//		This version of connect also provides a special "ondijitclick"
		//		event which triggers on a click or space or enter keyup.
		//		Events connected with `this.connect` are disconnected upon
		//		destruction.
		// returns:
		//		A handle that can be passed to `disconnect` in order to disconnect before
		//		the widget is destroyed.
		// example:
		//	|	var btn = new dijit.form.Button();
		//	|	// when foo.bar() is called, call the listener we're going to
		//	|	// provide in the scope of btn
		//	|	btn.connect(foo, "bar", function(){
		//	|		console.debug(this.toString());
		//	|	});
		// tags:
		//		protected

		var d = dojo,
			dc = d._connect,
			handles = this.inherited(arguments, [obj, event == "ondijitclick" ? "onclick" : event, method]);

		if(event == "ondijitclick"){
			// add key based click activation for unsupported nodes.
			// do all processing onkey up to prevent spurious clicks
			// for details see comments at top of this file where _lastKeyDownNode is defined
			if(d.indexOf(this.nodesWithKeyClick, obj.nodeName.toLowerCase()) == -1){ // is NOT input or button
				var m = d.hitch(this, method);
				handles.push(
					dc(obj, "onkeydown", this, function(e){
						//console.log(this.id + ": onkeydown, e.target = ", e.target, ", lastKeyDownNode was ", dijit._lastKeyDownNode, ", equality is ", (e.target === dijit._lastKeyDownNode));
						if((e.keyCode == d.keys.ENTER || e.keyCode == d.keys.SPACE) &&
							!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey){
							// needed on IE for when focus changes between keydown and keyup - otherwise dropdown menus do not work
							dijit._lastKeyDownNode = e.target;
							
							// Stop event to prevent scrolling on space key in IE.
							// But don't do this for _HasDropDown because it surpresses the onkeypress
							// event needed to open the drop down when the user presses the SPACE key.
							if(!("openDropDown" in this && obj == this._buttonNode)){
								e.preventDefault();
							}
						}
			 		}),
					dc(obj, "onkeyup", this, function(e){
						//console.log(this.id + ": onkeyup, e.target = ", e.target, ", lastKeyDownNode was ", dijit._lastKeyDownNode, ", equality is ", (e.target === dijit._lastKeyDownNode));
						if( (e.keyCode == d.keys.ENTER || e.keyCode == d.keys.SPACE) &&
							e.target == dijit._lastKeyDownNode &&	// === breaks greasemonkey
							!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey){
								//need reset here or have problems in FF when focus returns to trigger element after closing popup/alert
								dijit._lastKeyDownNode = null;
								return m(e);
						}
					})
				);
			}
		}

		return handles;		// _Widget.Handle
	},

	////////////////// MISCELLANEOUS METHODS ///////////////////

	_onShow: function(){
		// summary:
		//		Internal method called when this widget is made visible.
		//		See `onShow` for details.
		this.onShow();
	},

	onShow: function(){
		// summary:
		//		Called when this widget becomes the selected pane in a
		//		`dijit.layout.TabContainer`, `dijit.layout.StackContainer`,
		//		`dijit.layout.AccordionContainer`, etc.
		//
		//		Also called to indicate display of a `dijit.Dialog`, `dijit.TooltipDialog`, or `dijit.TitlePane`.
		// tags:
		//		callback
	},

	onHide: function(){
		// summary:
			//		Called when another widget becomes the selected pane in a
			//		`dijit.layout.TabContainer`, `dijit.layout.StackContainer`,
			//		`dijit.layout.AccordionContainer`, etc.
			//
			//		Also called to indicate hide of a `dijit.Dialog`, `dijit.TooltipDialog`, or `dijit.TitlePane`.
			// tags:
			//		callback
	},

	onClose: function(){
		// summary:
		//		Called when this widget is being displayed as a popup (ex: a Calendar popped
		//		up from a DateTextBox), and it is hidden.
		//		This is called from the dijit.popup code, and should not be called directly.
		//
		//		Also used as a parameter for children of `dijit.layout.StackContainer` or subclasses.
		//		Callback if a user tries to close the child.   Child will be closed if this function returns true.
		// tags:
		//		extension

		return true;		// Boolean
	}
});

})();

}

if(!dojo._hasResource["dijit._Contained"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._Contained"] = true;
dojo.provide("dijit._Contained");


dojo.declare("dijit._Contained",
		null,
		{
			// summary:
			//		Mixin for widgets that are children of a container widget
			//
			// example:
			// | 	// make a basic custom widget that knows about it's parents
			// |	dojo.declare("my.customClass",[dijit._Widget,dijit._Contained],{});

			getParent: function(){
				// summary:
				//		Returns the parent widget of this widget, assuming the parent
				//		specifies isContainer
				var parent = dijit.getEnclosingWidget(this.domNode.parentNode);
				return parent && parent.isContainer ? parent : null;
			},

			_getSibling: function(/*String*/ which){
				// summary:
				//      Returns next or previous sibling
				// which:
				//      Either "next" or "previous"
				// tags:
				//      private
				var node = this.domNode;
				do{
					node = node[which+"Sibling"];
				}while(node && node.nodeType != 1);
				return node && dijit.byNode(node);	// dijit._Widget
			},

			getPreviousSibling: function(){
				// summary:
				//		Returns null if this is the first child of the parent,
				//		otherwise returns the next element sibling to the "left".

				return this._getSibling("previous"); // dijit._Widget
			},

			getNextSibling: function(){
				// summary:
				//		Returns null if this is the last child of the parent,
				//		otherwise returns the next element sibling to the "right".

				return this._getSibling("next"); // dijit._Widget
			},

			getIndexInParent: function(){
				// summary:
				//		Returns the index of this widget within its container parent.
				//		It returns -1 if the parent does not exist, or if the parent
				//		is not a dijit._Container

				var p = this.getParent();
				if(!p || !p.getIndexOfChild){
					return -1; // int
				}
				return p.getIndexOfChild(this); // int
			}
		}
	);

}

if(!dojo._hasResource["dijit._Container"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._Container"] = true;
dojo.provide("dijit._Container");


dojo.declare("dijit._Container",
	null,
	{
		// summary:
		//		Mixin for widgets that contain a set of widget children.
		// description:
		//		Use this mixin for widgets that needs to know about and
		//		keep track of their widget children. Suitable for widgets like BorderContainer
		//		and TabContainer which contain (only) a set of child widgets.
		//
		//		It's not suitable for widgets like ContentPane
		//		which contains mixed HTML (plain DOM nodes in addition to widgets),
		//		and where contained widgets are not necessarily directly below
		//		this.containerNode.   In that case calls like addChild(node, position)
		//		wouldn't make sense.

		// isContainer: [protected] Boolean
		//		Indicates that this widget acts as a "parent" to the descendant widgets.
		//		When the parent is started it will call startup() on the child widgets.
		//		See also `isLayoutContainer`.
		isContainer: true,

		buildRendering: function(){
			this.inherited(arguments);
			if(!this.containerNode){
				// all widgets with descendants must set containerNode
	 				this.containerNode = this.domNode;
			}
		},

		addChild: function(/*dijit._Widget*/ widget, /*int?*/ insertIndex){
			// summary:
			//		Makes the given widget a child of this widget.
			// description:
			//		Inserts specified child widget's dom node as a child of this widget's
			//		container node, and possibly does other processing (such as layout).

			var refNode = this.containerNode;
			if(insertIndex && typeof insertIndex == "number"){
				var children = this.getChildren();
				if(children && children.length >= insertIndex){
					refNode = children[insertIndex-1].domNode;
					insertIndex = "after";
				}
			}
			dojo.place(widget.domNode, refNode, insertIndex);

			// If I've been started but the child widget hasn't been started,
			// start it now.  Make sure to do this after widget has been
			// inserted into the DOM tree, so it can see that it's being controlled by me,
			// so it doesn't try to size itself.
			if(this._started && !widget._started){
				widget.startup();
			}
		},

		removeChild: function(/*Widget or int*/ widget){
			// summary:
			//		Removes the passed widget instance from this widget but does
			//		not destroy it.  You can also pass in an integer indicating
			//		the index within the container to remove

			if(typeof widget == "number"){
				widget = this.getChildren()[widget];
			}

			if(widget){
				var node = widget.domNode;
				if(node && node.parentNode){
					node.parentNode.removeChild(node); // detach but don't destroy
				}
			}
		},

		hasChildren: function(){
			// summary:
			//		Returns true if widget has children, i.e. if this.containerNode contains something.
			return this.getChildren().length > 0;	// Boolean
		},

		destroyDescendants: function(/*Boolean*/ preserveDom){
			// summary:
			//      Destroys all the widgets inside this.containerNode,
			//      but not this widget itself
			dojo.forEach(this.getChildren(), function(child){ child.destroyRecursive(preserveDom); });
		},

		_getSiblingOfChild: function(/*dijit._Widget*/ child, /*int*/ dir){
			// summary:
			//		Get the next or previous widget sibling of child
			// dir:
			//		if 1, get the next sibling
			//		if -1, get the previous sibling
			// tags:
			//      private
			var node = child.domNode,
				which = (dir>0 ? "nextSibling" : "previousSibling");
			do{
				node = node[which];
			}while(node && (node.nodeType != 1 || !dijit.byNode(node)));
			return node && dijit.byNode(node);	// dijit._Widget
		},

		getIndexOfChild: function(/*dijit._Widget*/ child){
			// summary:
			//		Gets the index of the child in this container or -1 if not found
			return dojo.indexOf(this.getChildren(), child);	// int
		},

		startup: function(){
			// summary:
			//		Called after all the widgets have been instantiated and their
			//		dom nodes have been inserted somewhere under dojo.doc.body.
			//
			//		Widgets should override this method to do any initialization
			//		dependent on other widgets existing, and then call
			//		this superclass method to finish things off.
			//
			//		startup() in subclasses shouldn't do anything
			//		size related because the size of the widget hasn't been set yet.

			if(this._started){ return; }

			// Startup all children of this widget
			dojo.forEach(this.getChildren(), function(child){ child.startup(); });

			this.inherited(arguments);
		}
	}
);

}

if(!dojo._hasResource["dijit.layout._LayoutWidget"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.layout._LayoutWidget"] = true;
dojo.provide("dijit.layout._LayoutWidget");





dojo.declare("dijit.layout._LayoutWidget",
	[dijit._Widget, dijit._Container, dijit._Contained],
	{
		// summary:
		//		Base class for a _Container widget which is responsible for laying out its children.
		//		Widgets which mixin this code must define layout() to manage placement and sizing of the children.

		// baseClass: [protected extension] String
		//		This class name is applied to the widget's domNode
		//		and also may be used to generate names for sub nodes,
		//		for example dijitTabContainer-content.
		baseClass: "dijitLayoutContainer",

		// isLayoutContainer: [protected] Boolean
		//		Indicates that this widget is going to call resize() on its
		//		children widgets, setting their size, when they become visible.
		isLayoutContainer: true,

		buildRendering: function(){
			this.inherited(arguments);
			dojo.addClass(this.domNode, "dijitContainer");
		},

		startup: function(){
			// summary:
			//		Called after all the widgets have been instantiated and their
			//		dom nodes have been inserted somewhere under dojo.doc.body.
			//
			//		Widgets should override this method to do any initialization
			//		dependent on other widgets existing, and then call
			//		this superclass method to finish things off.
			//
			//		startup() in subclasses shouldn't do anything
			//		size related because the size of the widget hasn't been set yet.

			if(this._started){ return; }

			// Need to call inherited first - so that child widgets get started
			// up correctly
			this.inherited(arguments);

			// If I am a not being controlled by a parent layout widget...
			var parent = this.getParent && this.getParent()
			if(!(parent && parent.isLayoutContainer)){
				// Do recursive sizing and layout of all my descendants
				// (passing in no argument to resize means that it has to glean the size itself)
				this.resize();

				// Since my parent isn't a layout container, and my style *may be* width=height=100%
				// or something similar (either set directly or via a CSS class),
				// monitor when my size changes so that I can re-layout.
				// For browsers where I can't directly monitor when my size changes,
				// monitor when the viewport changes size, which *may* indicate a size change for me.
				this.connect(dojo.isIE ? this.domNode : dojo.global, 'onresize', function(){
					// Using function(){} closure to ensure no arguments to resize.
					this.resize();
				});
			}
		},

		resize: function(changeSize, resultSize){
			// summary:
			//		Call this to resize a widget, or after its size has changed.
			// description:
			//		Change size mode:
			//			When changeSize is specified, changes the marginBox of this widget
			//			and forces it to relayout its contents accordingly.
			//			changeSize may specify height, width, or both.
			//
			//			If resultSize is specified it indicates the size the widget will
			//			become after changeSize has been applied.
			//
			//		Notification mode:
			//			When changeSize is null, indicates that the caller has already changed
			//			the size of the widget, or perhaps it changed because the browser
			//			window was resized.  Tells widget to relayout its contents accordingly.
			//
			//			If resultSize is also specified it indicates the size the widget has
			//			become.
			//
			//		In either mode, this method also:
			//			1. Sets this._borderBox and this._contentBox to the new size of
			//				the widget.  Queries the current domNode size if necessary.
			//			2. Calls layout() to resize contents (and maybe adjust child widgets).
			//
			// changeSize: Object?
			//		Sets the widget to this margin-box size and position.
			//		May include any/all of the following properties:
			//	|	{w: int, h: int, l: int, t: int}
			//
			// resultSize: Object?
			//		The margin-box size of this widget after applying changeSize (if
			//		changeSize is specified).  If caller knows this size and
			//		passes it in, we don't need to query the browser to get the size.
			//	|	{w: int, h: int}

			var node = this.domNode;

			// set margin box size, unless it wasn't specified, in which case use current size
			if(changeSize){
				dojo.marginBox(node, changeSize);

				// set offset of the node
				if(changeSize.t){ node.style.top = changeSize.t + "px"; }
				if(changeSize.l){ node.style.left = changeSize.l + "px"; }
			}

			// If either height or width wasn't specified by the user, then query node for it.
			// But note that setting the margin box and then immediately querying dimensions may return
			// inaccurate results, so try not to depend on it.
			var mb = resultSize || {};
			dojo.mixin(mb, changeSize || {});	// changeSize overrides resultSize
			if( !("h" in mb) || !("w" in mb) ){
				mb = dojo.mixin(dojo.marginBox(node), mb);	// just use dojo.marginBox() to fill in missing values
			}

			// Compute and save the size of my border box and content box
			// (w/out calling dojo.contentBox() since that may fail if size was recently set)
			var cs = dojo.getComputedStyle(node);
			var me = dojo._getMarginExtents(node, cs);
			var be = dojo._getBorderExtents(node, cs);
			var bb = (this._borderBox = {
				w: mb.w - (me.w + be.w),
				h: mb.h - (me.h + be.h)
			});
			var pe = dojo._getPadExtents(node, cs);
			this._contentBox = {
				l: dojo._toPixelValue(node, cs.paddingLeft),
				t: dojo._toPixelValue(node, cs.paddingTop),
				w: bb.w - pe.w,
				h: bb.h - pe.h
			};

			// Callback for widget to adjust size of its children
			this.layout();
		},

		layout: function(){
			// summary:
			//		Widgets override this method to size and position their contents/children.
			//		When this is called this._contentBox is guaranteed to be set (see resize()).
			//
			//		This is called after startup(), and also when the widget's size has been
			//		changed.
			// tags:
			//		protected extension
		},

		_setupChild: function(/*dijit._Widget*/child){
			// summary:
			//		Common setup for initial children and children which are added after startup
			// tags:
			//		protected extension

			var cls = this.baseClass + "-child "
				+ (child.baseClass ? this.baseClass + "-" + child.baseClass : "");
			dojo.addClass(child.domNode, cls);
		},

		addChild: function(/*dijit._Widget*/ child, /*Integer?*/ insertIndex){
			// Overrides _Container.addChild() to call _setupChild()
			this.inherited(arguments);
			if(this._started){
				this._setupChild(child);
			}
		},

		removeChild: function(/*dijit._Widget*/ child){
			// Overrides _Container.removeChild() to remove class added by _setupChild()
			var cls = this.baseClass + "-child"
					+ (child.baseClass ?
						" " + this.baseClass + "-" + child.baseClass : "");
			dojo.removeClass(child.domNode, cls);
			
			this.inherited(arguments);
		}
	}
);

dijit.layout.marginBox2contentBox = function(/*DomNode*/ node, /*Object*/ mb){
	// summary:
	//		Given the margin-box size of a node, return its content box size.
	//		Functions like dojo.contentBox() but is more reliable since it doesn't have
	//		to wait for the browser to compute sizes.
	var cs = dojo.getComputedStyle(node);
	var me = dojo._getMarginExtents(node, cs);
	var pb = dojo._getPadBorderExtents(node, cs);
	return {
		l: dojo._toPixelValue(node, cs.paddingLeft),
		t: dojo._toPixelValue(node, cs.paddingTop),
		w: mb.w - (me.w + pb.w),
		h: mb.h - (me.h + pb.h)
	};
};

(function(){
	var capitalize = function(word){
		return word.substring(0,1).toUpperCase() + word.substring(1);
	};

	var size = function(widget, dim){
		// size the child
		var newSize = widget.resize ? widget.resize(dim) : dojo.marginBox(widget.domNode, dim);

		// record child's size
		if(newSize){
			// if the child returned it's new size then use that
			dojo.mixin(widget, newSize);
		}else{
			// otherwise, call marginBox(), but favor our own numbers when we have them.
			// the browser lies sometimes
			dojo.mixin(widget, dojo.marginBox(widget.domNode));
			dojo.mixin(widget, dim);
		}
	};

	dijit.layout.layoutChildren = function(/*DomNode*/ container, /*Object*/ dim, /*Widget[]*/ children,
			/*String?*/ changedRegionId, /*Number?*/ changedRegionSize){
		// summary
		//		Layout a bunch of child dom nodes within a parent dom node
		// container:
		//		parent node
		// dim:
		//		{l, t, w, h} object specifying dimensions of container into which to place children
		// children:
		//		an array of Widgets or at least objects containing:
		//			* domNode: pointer to DOM node to position
		//			* region or layoutAlign: position to place DOM node
		//			* resize(): (optional) method to set size of node
		//			* id: (optional) Id of widgets, referenced from resize object, below.
		// changedRegionId:
		//		If specified, the slider for the region with the specified id has been dragged, and thus
		//		the region's height or width should be adjusted according to changedRegionSize
		// changedRegionSize:
		//		See changedRegionId.

		// copy dim because we are going to modify it
		dim = dojo.mixin({}, dim);

		dojo.addClass(container, "dijitLayoutContainer");

		// Move "client" elements to the end of the array for layout.  a11y dictates that the author
		// needs to be able to put them in the document in tab-order, but this algorithm requires that
		// client be last.    TODO: move these lines to LayoutContainer?   Unneeded other places I think.
		children = dojo.filter(children, function(item){ return item.region != "center" && item.layoutAlign != "client"; })
			.concat(dojo.filter(children, function(item){ return item.region == "center" || item.layoutAlign == "client"; }));

		// set positions/sizes
		dojo.forEach(children, function(child){
			var elm = child.domNode,
				pos = (child.region || child.layoutAlign);

			// set elem to upper left corner of unused space; may move it later
			var elmStyle = elm.style;
			elmStyle.left = dim.l+"px";
			elmStyle.top = dim.t+"px";
			elmStyle.position = "absolute";

			dojo.addClass(elm, "dijitAlign" + capitalize(pos));

			// Size adjustments to make to this child widget
			var sizeSetting = {};

			// Check for optional size adjustment due to splitter drag (height adjustment for top/bottom align
			// panes and width adjustment for left/right align panes.
			if(changedRegionId && changedRegionId == child.id){
				sizeSetting[child.region == "top" || child.region == "bottom" ? "h" : "w"] = changedRegionSize;
			}

			// set size && adjust record of remaining space.
			// note that setting the width of a <div> may affect its height.
			if(pos == "top" || pos == "bottom"){
				sizeSetting.w = dim.w;
				size(child, sizeSetting);
				dim.h -= child.h;
				if(pos == "top"){
					dim.t += child.h;
				}else{
					elmStyle.top = dim.t + dim.h + "px";
				}
			}else if(pos == "left" || pos == "right"){
				sizeSetting.h = dim.h;
				size(child, sizeSetting);
				dim.w -= child.w;
				if(pos == "left"){
					dim.l += child.w;
				}else{
					elmStyle.left = dim.l + dim.w + "px";
				}
			}else if(pos == "client" || pos == "center"){
				size(child, dim);
			}
		});
	};

})();

}

if(!dojo._hasResource["dijit.layout._ContentPaneResizeMixin"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.layout._ContentPaneResizeMixin"] = true;
dojo.provide("dijit.layout._ContentPaneResizeMixin");




dojo.declare("dijit.layout._ContentPaneResizeMixin", null, {
	// summary:
	//		Resize() functionality of ContentPane.   If there's a single layout widget
	//		child then it will call resize() with the same dimensions as the ContentPane.
	//		Otherwise just calls resize on each child.
	//
	//		Also implements basic startup() functionality, where starting the parent
	//		will start the children

	// doLayout: Boolean
	//		- false - don't adjust size of children
	//		- true - if there is a single visible child widget, set it's size to
	//				however big the ContentPane is
	doLayout: true,

	// isContainer: [protected] Boolean
	//		Indicates that this widget acts as a "parent" to the descendant widgets.
	//		When the parent is started it will call startup() on the child widgets.
	//		See also `isLayoutContainer`.
	isContainer: true,

	// isLayoutContainer: [protected] Boolean
	//		Indicates that this widget will call resize() on it's child widgets
	//		when they become visible.
	isLayoutContainer: true,

	_startChildren: function(){
		// summary:
		//		Call startup() on all children including non _Widget ones like dojo.dnd.Source objects

		// This starts all the widgets
		dojo.forEach(this.getChildren(), function(child){
			child.startup();
			child._started = true;
		});
	},

	startup: function(){
		// summary:
		//		See `dijit.layout._LayoutWidget.startup` for description.
		//		Although ContentPane doesn't extend _LayoutWidget, it does implement
		//		the same API.

		if(this._started){ return; }

		var parent = dijit._Contained.prototype.getParent.call(this);
		this._childOfLayoutWidget = parent && parent.isLayoutContainer;

		// I need to call resize() on my child/children (when I become visible), unless
		// I'm the child of a layout widget in which case my parent will call resize() on me and I'll do it then.
		this._needLayout = !this._childOfLayoutWidget;

		this.inherited(arguments);

		this._startChildren();

		if(this._isShown()){
			this._onShow();
		}

		if(!this._childOfLayoutWidget){
			// If my parent isn't a layout container, since my style *may be* width=height=100%
			// or something similar (either set directly or via a CSS class),
			// monitor when my size changes so that I can re-layout.
			// For browsers where I can't directly monitor when my size changes,
			// monitor when the viewport changes size, which *may* indicate a size change for me.
			this.connect(dojo.isIE ? this.domNode : dojo.global, 'onresize', function(){
				// Using function(){} closure to ensure no arguments to resize.
				this._needLayout = !this._childOfLayoutWidget;
				this.resize();
			});
		}
	},

	_checkIfSingleChild: function(){
		// summary:
		//		Test if we have exactly one visible widget as a child,
		//		and if so assume that we are a container for that widget,
		//		and should propagate startup() and resize() calls to it.
		//		Skips over things like data stores since they aren't visible.

		var childNodes = dojo.query("> *", this.containerNode).filter(function(node){
				return node.tagName !== "SCRIPT"; // or a regexp for hidden elements like script|area|map|etc..
			}),
			childWidgetNodes = childNodes.filter(function(node){
				return dojo.hasAttr(node, "data-dojo-type") || dojo.hasAttr(node, "dojoType") || dojo.hasAttr(node, "widgetId");
			}),
			candidateWidgets = dojo.filter(childWidgetNodes.map(dijit.byNode), function(widget){
				return widget && widget.domNode && widget.resize;
			});

		if(
			// all child nodes are widgets
			childNodes.length == childWidgetNodes.length &&

			// all but one are invisible (like dojo.data)
			candidateWidgets.length == 1
		){
			this._singleChild = candidateWidgets[0];
		}else{
			delete this._singleChild;
		}

		// So we can set overflow: hidden to avoid a safari bug w/scrollbars showing up (#9449)
		dojo.toggleClass(this.containerNode, this.baseClass + "SingleChild", !!this._singleChild);
	},

	resize: function(changeSize, resultSize){
		// summary:
		//		See `dijit.layout._LayoutWidget.resize` for description.
		//		Although ContentPane doesn't extend _LayoutWidget, it does implement
		//		the same API.

		// For the TabContainer --> BorderContainer --> ContentPane case, _onShow() is
		// never called, so resize() is our trigger to do the initial href download (see [20099]).
		// However, don't load href for closed TitlePanes.
		if(!this._wasShown && this.open !== false){
			this._onShow();
		}

		this._resizeCalled = true;

		this._scheduleLayout(changeSize, resultSize);
	},

	_scheduleLayout: function(changeSize, resultSize){
		// summary:
		//		Resize myself, and call resize() on each of my child layout widgets, either now
		//		(if I'm currently visible) or when I become visible
		if(this._isShown()){
			this._layout(changeSize, resultSize);
		}else{
			this._needLayout = true;
			this._changeSize = changeSize;
			this._resultSize = resultSize;
		}
	},

	_layout: function(changeSize, resultSize){
		// summary:
		//		Resize myself according to optional changeSize/resultSize parameters, like a layout widget.
		//		Also, since I am a Container widget, each of my children expects me to
		//		call resize() or layout() on them.
		//
		//		Should be called on initialization and also whenever we get new content
		//		(from an href, or from set('content', ...))... but deferred until
		//		the ContentPane is visible

		// Set margin box size, unless it wasn't specified, in which case use current size.
		if(changeSize){
			dojo.marginBox(this.domNode, changeSize);
		}

		// Compute content box size of containerNode in case we [later] need to size our single child.
		var cn = this.containerNode;
		if(cn === this.domNode){
			// If changeSize or resultSize was passed to this method and this.containerNode ==
			// this.domNode then we can compute the content-box size without querying the node,
			// which is more reliable (similar to LayoutWidget.resize) (see for example #9449).
			var mb = resultSize || {};
			dojo.mixin(mb, changeSize || {}); // changeSize overrides resultSize
			if(!("h" in mb) || !("w" in mb)){
				mb = dojo.mixin(dojo.marginBox(cn), mb); // just use dojo.marginBox() to fill in missing values
			}
			this._contentBox = dijit.layout.marginBox2contentBox(cn, mb);
		}else{
			this._contentBox = dojo.contentBox(cn);
		}

		this._layoutChildren();

		delete this._needLayout;
	},
	
	_layoutChildren: function(){
		// Call _checkIfSingleChild() again in case app has manually mucked w/the content
		// of the ContentPane (rather than changing it through the set("content", ...) API.
		if(this.doLayout){
			this._checkIfSingleChild();
		}

		if(this._singleChild && this._singleChild.resize){
			var cb = this._contentBox || dojo.contentBox(this.containerNode);

			// note: if widget has padding this._contentBox will have l and t set,
			// but don't pass them to resize() or it will doubly-offset the child
			this._singleChild.resize({w: cb.w, h: cb.h});
		}else{
			// All my child widgets are independently sized (rather than matching my size),
			// but I still need to call resize() on each child to make it layout.
			dojo.forEach(this.getChildren(), function(widget){
				if(widget.resize){
					widget.resize();
				}
			});
		}
	},

	_isShown: function(){
		// summary:
		//		Returns true if the content is currently shown.
		// description:
		//		If I am a child of a layout widget then it actually returns true if I've ever been visible,
		//		not whether I'm currently visible, since that's much faster than tracing up the DOM/widget
		//		tree every call, and at least solves the performance problem on page load by deferring loading
		//		hidden ContentPanes until they are first shown

		if(this._childOfLayoutWidget){
			// If we are TitlePane, etc - we return that only *IF* we've been resized
			if(this._resizeCalled && "open" in this){
				return this.open;
			}
			return this._resizeCalled;
		}else if("open" in this){
			return this.open;		// for TitlePane, etc.
		}else{
			var node = this.domNode, parent = this.domNode.parentNode;
			return (node.style.display != 'none') && (node.style.visibility != 'hidden') && !dojo.hasClass(node, "dijitHidden") &&
					parent && parent.style && (parent.style.display != 'none');
		}
	},

	_onShow: function(){
		// summary:
		//		Called when the ContentPane is made visible
		// description:
		//		For a plain ContentPane, this is called on initialization, from startup().
		//		If the ContentPane is a hidden pane of a TabContainer etc., then it's
		//		called whenever the pane is made visible.
		//
		//		Does layout/resize of child widget(s)

		if(this._needLayout){
			// If a layout has been scheduled for when we become visible, do it now
			this._layout(this._changeSize, this._resultSize);
		}

		this.inherited(arguments);

		// Need to keep track of whether ContentPane has been shown (which is different than
		// whether or not it's currently visible).
		this._wasShown = true;
	}
});

}

if(!dojo._hasResource["dojo.string"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.string"] = true;
dojo.provide("dojo.string");

dojo.getObject("string", true, dojo);

/*=====
dojo.string = {
	// summary: String utilities for Dojo
};
=====*/

dojo.string.rep = function(/*String*/str, /*Integer*/num){
	//	summary:
	//		Efficiently replicate a string `n` times.
	//	str:
	//		the string to replicate
	//	num:
	//		number of times to replicate the string
	
	if(num <= 0 || !str){ return ""; }
	
	var buf = [];
	for(;;){
		if(num & 1){
			buf.push(str);
		}
		if(!(num >>= 1)){ break; }
		str += str;
	}
	return buf.join("");	// String
};

dojo.string.pad = function(/*String*/text, /*Integer*/size, /*String?*/ch, /*Boolean?*/end){
	//	summary:
	//		Pad a string to guarantee that it is at least `size` length by
	//		filling with the character `ch` at either the start or end of the
	//		string. Pads at the start, by default.
	//	text:
	//		the string to pad
	//	size:
	//		length to provide padding
	//	ch:
	//		character to pad, defaults to '0'
	//	end:
	//		adds padding at the end if true, otherwise pads at start
	//	example:
	//	|	// Fill the string to length 10 with "+" characters on the right.  Yields "Dojo++++++".
	//	|	dojo.string.pad("Dojo", 10, "+", true);

	if(!ch){
		ch = '0';
	}
	var out = String(text),
		pad = dojo.string.rep(ch, Math.ceil((size - out.length) / ch.length));
	return end ? out + pad : pad + out;	// String
};

dojo.string.substitute = function(	/*String*/		template,
									/*Object|Array*/map,
									/*Function?*/	transform,
									/*Object?*/		thisObject){
	//	summary:
	//		Performs parameterized substitutions on a string. Throws an
	//		exception if any parameter is unmatched.
	//	template:
	//		a string with expressions in the form `${key}` to be replaced or
	//		`${key:format}` which specifies a format function. keys are case-sensitive.
	//	map:
	//		hash to search for substitutions
	//	transform:
	//		a function to process all parameters before substitution takes
	//		place, e.g. mylib.encodeXML
	//	thisObject:
	//		where to look for optional format function; default to the global
	//		namespace
	//	example:
	//		Substitutes two expressions in a string from an Array or Object
	//	|	// returns "File 'foo.html' is not found in directory '/temp'."
	//	|	// by providing substitution data in an Array
	//	|	dojo.string.substitute(
	//	|		"File '${0}' is not found in directory '${1}'.",
	//	|		["foo.html","/temp"]
	//	|	);
	//	|
	//	|	// also returns "File 'foo.html' is not found in directory '/temp'."
	//	|	// but provides substitution data in an Object structure.  Dotted
	//	|	// notation may be used to traverse the structure.
	//	|	dojo.string.substitute(
	//	|		"File '${name}' is not found in directory '${info.dir}'.",
	//	|		{ name: "foo.html", info: { dir: "/temp" } }
	//	|	);
	//	example:
	//		Use a transform function to modify the values:
	//	|	// returns "file 'foo.html' is not found in directory '/temp'."
	//	|	dojo.string.substitute(
	//	|		"${0} is not found in ${1}.",
	//	|		["foo.html","/temp"],
	//	|		function(str){
	//	|			// try to figure out the type
	//	|			var prefix = (str.charAt(0) == "/") ? "directory": "file";
	//	|			return prefix + " '" + str + "'";
	//	|		}
	//	|	);
	//	example:
	//		Use a formatter
	//	|	// returns "thinger -- howdy"
	//	|	dojo.string.substitute(
	//	|		"${0:postfix}", ["thinger"], null, {
	//	|			postfix: function(value, key){
	//	|				return value + " -- howdy";
	//	|			}
	//	|		}
	//	|	);

	thisObject = thisObject || dojo.global;
	transform = transform ?
		dojo.hitch(thisObject, transform) : function(v){ return v; };

	return template.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g,
		function(match, key, format){
			var value = dojo.getObject(key, false, map);
			if(format){
				value = dojo.getObject(format, false, thisObject).call(thisObject, value, key);
			}
			return transform(value, key).toString();
		}); // String
};

/*=====
dojo.string.trim = function(str){
	//	summary:
	//		Trims whitespace from both sides of the string
	//	str: String
	//		String to be trimmed
	//	returns: String
	//		Returns the trimmed string
	//	description:
	//		This version of trim() was taken from [Steven Levithan's blog](http://blog.stevenlevithan.com/archives/faster-trim-javascript).
	//		The short yet performant version of this function is dojo.trim(),
	//		which is part of Dojo base.  Uses String.prototype.trim instead, if available.
	return "";	// String
}
=====*/

dojo.string.trim = String.prototype.trim ?
	dojo.trim : // aliasing to the native function
	function(str){
		str = str.replace(/^\s+/, '');
		for(var i = str.length - 1; i >= 0; i--){
			if(/\S/.test(str.charAt(i))){
				str = str.substring(0, i + 1);
				break;
			}
		}
		return str;
	};

}

if(!dojo._hasResource["dojo.html"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.html"] = true;
dojo.provide("dojo.html");


dojo.getObject("html", true, dojo);

// the parser might be needed..
(function(){ // private scope, sort of a namespace

	// idCounter is incremented with each instantiation to allow asignment of a unique id for tracking, logging purposes
	var idCounter = 0,
		d = dojo;
	
	dojo.html._secureForInnerHtml = function(/*String*/ cont){
		// summary:
		//		removes !DOCTYPE and title elements from the html string.
		//
		//		khtml is picky about dom faults, you can't attach a style or <title> node as child of body
		//		must go into head, so we need to cut out those tags
		//	cont:
		//		An html string for insertion into the dom
		//
		return cont.replace(/(?:\s*<!DOCTYPE\s[^>]+>|<title[^>]*>[\s\S]*?<\/title>)/ig, ""); // String
	};

/*====
	dojo.html._emptyNode = function(node){
		// summary:
		//		removes all child nodes from the given node
		//	node: DOMNode
		//		the parent element
	};
=====*/
	dojo.html._emptyNode = dojo.empty;

	dojo.html._setNodeContent = function(/* DomNode */ node, /* String|DomNode|NodeList */ cont){
		// summary:
		//		inserts the given content into the given node
		//	node:
		//		the parent element
		//	content:
		//		the content to be set on the parent element.
		//		This can be an html string, a node reference or a NodeList, dojo.NodeList, Array or other enumerable list of nodes
		
		// always empty
		d.empty(node);

		if(cont) {
			if(typeof cont == "string") {
				cont = d._toDom(cont, node.ownerDocument);
			}
			if(!cont.nodeType && d.isArrayLike(cont)) {
				// handle as enumerable, but it may shrink as we enumerate it
				for(var startlen=cont.length, i=0; i<cont.length; i=startlen==cont.length ? i+1 : 0) {
					d.place( cont[i], node, "last");
				}
			} else {
				// pass nodes, documentFragments and unknowns through to dojo.place
				d.place(cont, node, "last");
			}
		}

		// return DomNode
		return node;
	};

	// we wrap up the content-setting operation in a object
	dojo.declare("dojo.html._ContentSetter", null,
		{
			// node: DomNode|String
			//		An node which will be the parent element that we set content into
			node: "",

			// content: String|DomNode|DomNode[]
			//		The content to be placed in the node. Can be an HTML string, a node reference, or a enumerable list of nodes
			content: "",
			
			// id: String?
			//		Usually only used internally, and auto-generated with each instance
			id: "",

			// cleanContent: Boolean
			//		Should the content be treated as a full html document,
			//		and the real content stripped of <html>, <body> wrapper before injection
			cleanContent: false,
			
			// extractContent: Boolean
			//		Should the content be treated as a full html document, and the real content stripped of <html>, <body> wrapper before injection
			extractContent: false,

			// parseContent: Boolean
			//		Should the node by passed to the parser after the new content is set
			parseContent: false,

			// parserScope: String
			//		Flag passed to parser.  Root for attribute names to search for.   If scopeName is dojo,
			//		will search for data-dojo-type (or dojoType).  For backwards compatibility
			//		reasons defaults to dojo._scopeName (which is "dojo" except when
			//		multi-version support is used, when it will be something like dojo16, dojo20, etc.)
			parserScope: dojo._scopeName,

			// startup: Boolean
			//		Start the child widgets after parsing them.   Only obeyed if parseContent is true.
			startup: true,
			
			// lifecyle methods
			constructor: function(/* Object */params, /* String|DomNode */node){
				//	summary:
				//		Provides a configurable, extensible object to wrap the setting on content on a node
				//		call the set() method to actually set the content..
 
				// the original params are mixed directly into the instance "this"
				dojo.mixin(this, params || {});

				// give precedence to params.node vs. the node argument
				// and ensure its a node, not an id string
				node = this.node = dojo.byId( this.node || node );
	
				if(!this.id){
					this.id = [
						"Setter",
						(node) ? node.id || node.tagName : "",
						idCounter++
					].join("_");
				}
			},
			set: function(/* String|DomNode|NodeList? */ cont, /* Object? */ params){
				// summary:
				//		front-end to the set-content sequence
				//	cont:
				//		An html string, node or enumerable list of nodes for insertion into the dom
				//		If not provided, the object's content property will be used
				if(undefined !== cont){
					this.content = cont;
				}
				// in the re-use scenario, set needs to be able to mixin new configuration
				if(params){
					this._mixin(params);
				}

				this.onBegin();
				this.setContent();
				this.onEnd();

				return this.node;
			},
			setContent: function(){
				// summary:
				//		sets the content on the node

				var node = this.node;
				if(!node) {
				    // can't proceed
					throw new Error(this.declaredClass + ": setContent given no node");
				}
				try{
					node = dojo.html._setNodeContent(node, this.content);
				}catch(e){
					// check if a domfault occurs when we are appending this.errorMessage
					// like for instance if domNode is a UL and we try append a DIV
	
					// FIXME: need to allow the user to provide a content error message string
					var errMess = this.onContentError(e);
					try{
						node.innerHTML = errMess;
					}catch(e){
						console.error('Fatal ' + this.declaredClass + '.setContent could not change content due to '+e.message, e);
					}
				}
				// always put back the node for the next method
				this.node = node; // DomNode
			},
			
			empty: function() {
				// summary
				//	cleanly empty out existing content

				// destroy any widgets from a previous run
				// NOTE: if you dont want this you'll need to empty
				// the parseResults array property yourself to avoid bad things happenning
				if(this.parseResults && this.parseResults.length) {
					dojo.forEach(this.parseResults, function(w) {
						if(w.destroy){
							w.destroy();
						}
					});
					delete this.parseResults;
				}
				// this is fast, but if you know its already empty or safe, you could
				// override empty to skip this step
				dojo.html._emptyNode(this.node);
			},
	
			onBegin: function(){
				// summary
				//		Called after instantiation, but before set();
				//		It allows modification of any of the object properties
				//		- including the node and content provided - before the set operation actually takes place
				//		This default implementation checks for cleanContent and extractContent flags to
				//		optionally pre-process html string content
				var cont = this.content;
	
				if(dojo.isString(cont)){
					if(this.cleanContent){
						cont = dojo.html._secureForInnerHtml(cont);
					}
  
					if(this.extractContent){
						var match = cont.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
						if(match){ cont = match[1]; }
					}
				}

				// clean out the node and any cruft associated with it - like widgets
				this.empty();
				
				this.content = cont;
				return this.node; /* DomNode */
			},
	
			onEnd: function(){
				// summary
				//		Called after set(), when the new content has been pushed into the node
				//		It provides an opportunity for post-processing before handing back the node to the caller
				//		This default implementation checks a parseContent flag to optionally run the dojo parser over the new content
				if(this.parseContent){
					// populates this.parseResults if you need those..
					this._parse();
				}
				return this.node; /* DomNode */
			},
	
			tearDown: function(){
				// summary
				//		manually reset the Setter instance if its being re-used for example for another set()
				// description
				//		tearDown() is not called automatically.
				//		In normal use, the Setter instance properties are simply allowed to fall out of scope
				//		but the tearDown method can be called to explicitly reset this instance.
				delete this.parseResults;
				delete this.node;
				delete this.content;
			},
  
			onContentError: function(err){
				return "Error occured setting content: " + err;
			},
			
			_mixin: function(params){
				// mix properties/methods into the instance
				// TODO: the intention with tearDown is to put the Setter's state
				// back to that of the original constructor (vs. deleting/resetting everything regardless of ctor params)
				// so we could do something here to move the original properties aside for later restoration
				var empty = {}, key;
				for(key in params){
					if(key in empty){ continue; }
					// TODO: here's our opportunity to mask the properties we dont consider configurable/overridable
					// .. but history shows we'll almost always guess wrong
					this[key] = params[key];
				}
			},
			_parse: function(){
				// summary:
				//		runs the dojo parser over the node contents, storing any results in this.parseResults
				//		Any errors resulting from parsing are passed to _onError for handling

				var rootNode = this.node;
				try{
					// store the results (widgets, whatever) for potential retrieval
					var inherited = {};
					dojo.forEach(["dir", "lang", "textDir"], function(name){
						if(this[name]){
							inherited[name] = this[name];
						}
					}, this);
					this.parseResults = dojo.parser.parse({
						rootNode: rootNode,
						noStart: !this.startup,
						inherited: inherited,
						scope: this.parserScope
					});
				}catch(e){
					this._onError('Content', e, "Error parsing in _ContentSetter#"+this.id);
				}
			},
  
			_onError: function(type, err, consoleText){
				// summary:
				//		shows user the string that is returned by on[type]Error
				//		overide/implement on[type]Error and return your own string to customize
				var errText = this['on' + type + 'Error'].call(this, err);
				if(consoleText){
					console.error(consoleText, err);
				}else if(errText){ // a empty string won't change current content
					dojo.html._setNodeContent(this.node, errText, true);
				}
			}
	}); // end dojo.declare()

	dojo.html.set = function(/* DomNode */ node, /* String|DomNode|NodeList */ cont, /* Object? */ params){
			// summary:
			//		inserts (replaces) the given content into the given node. dojo.place(cont, node, "only")
			//		may be a better choice for simple HTML insertion.
			// description:
			//		Unless you need to use the params capabilities of this method, you should use
			//		dojo.place(cont, node, "only"). dojo.place() has more robust support for injecting
			//		an HTML string into the DOM, but it only handles inserting an HTML string as DOM
			//		elements, or inserting a DOM node. dojo.place does not handle NodeList insertions
			//		or the other capabilities as defined by the params object for this method.
			//	node:
			//		the parent element that will receive the content
			//	cont:
			//		the content to be set on the parent element.
			//		This can be an html string, a node reference or a NodeList, dojo.NodeList, Array or other enumerable list of nodes
			//	params:
			//		Optional flags/properties to configure the content-setting. See dojo.html._ContentSetter
			//	example:
			//		A safe string/node/nodelist content replacement/injection with hooks for extension
			//		Example Usage:
			//		dojo.html.set(node, "some string");
			//		dojo.html.set(node, contentNode, {options});
			//		dojo.html.set(node, myNode.childNodes, {options});
		if(undefined == cont){
			console.warn("dojo.html.set: no cont argument provided, using empty string");
			cont = "";
		}
		if(!params){
			// simple and fast
			return dojo.html._setNodeContent(node, cont, true);
		}else{
			// more options but slower
			// note the arguments are reversed in order, to match the convention for instantiation via the parser
			var op = new dojo.html._ContentSetter(dojo.mixin(
					params,
					{ content: cont, node: node }
			));
			return op.set();
		}
	};
})();

}

if(!dojo._hasResource["dojo.i18n"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.i18n"] = true;
dojo.provide("dojo.i18n");

dojo.getObject("i18n", true, dojo);

/*=====
dojo.i18n = {
	// summary: Utility classes to enable loading of resources for internationalization (i18n)
};
=====*/

// when using a real AMD loader, dojo.i18n.getLocalization is already defined by dojo/lib/backCompat
dojo.i18n.getLocalization = dojo.i18n.getLocalization || function(/*String*/packageName, /*String*/bundleName, /*String?*/locale){
	//	summary:
	//		Returns an Object containing the localization for a given resource
	//		bundle in a package, matching the specified locale.
	//	description:
	//		Returns a hash containing name/value pairs in its prototypesuch
	//		that values can be easily overridden.  Throws an exception if the
	//		bundle is not found.  Bundle must have already been loaded by
	//		`dojo.requireLocalization()` or by a build optimization step.  NOTE:
	//		try not to call this method as part of an object property
	//		definition (`var foo = { bar: dojo.i18n.getLocalization() }`).  In
	//		some loading situations, the bundle may not be available in time
	//		for the object definition.  Instead, call this method inside a
	//		function that is run after all modules load or the page loads (like
	//		in `dojo.addOnLoad()`), or in a widget lifecycle method.
	//	packageName:
	//		package which is associated with this resource
	//	bundleName:
	//		the base filename of the resource bundle (without the ".js" suffix)
	//	locale:
	//		the variant to load (optional).  By default, the locale defined by
	//		the host environment: dojo.locale

	locale = dojo.i18n.normalizeLocale(locale);

	// look for nearest locale match
	var elements = locale.split('-');
	var module = [packageName,"nls",bundleName].join('.');
		var bundle = dojo._loadedModules[module];
	if(bundle){
		var localization;
		for(var i = elements.length; i > 0; i--){
			var loc = elements.slice(0, i).join('_');
			if(bundle[loc]){
				localization = bundle[loc];
				break;
			}
		}
		if(!localization){
			localization = bundle.ROOT;
		}

		// make a singleton prototype so that the caller won't accidentally change the values globally
		if(localization){
			var clazz = function(){};
			clazz.prototype = localization;
			return new clazz(); // Object
		}
	}

	throw new Error("Bundle not found: " + bundleName + " in " + packageName+" , locale=" + locale);
};

dojo.i18n.normalizeLocale = function(/*String?*/locale){
	//	summary:
	//		Returns canonical form of locale, as used by Dojo.
	//
	//  description:
	//		All variants are case-insensitive and are separated by '-' as specified in [RFC 3066](http://www.ietf.org/rfc/rfc3066.txt).
	//		If no locale is specified, the dojo.locale is returned.  dojo.locale is defined by
	//		the user agent's locale unless overridden by djConfig.

	var result = locale ? locale.toLowerCase() : dojo.locale;
	if(result == "root"){
		result = "ROOT";
	}
	return result; // String
};

dojo.i18n._requireLocalization = function(/*String*/moduleName, /*String*/bundleName, /*String?*/locale, /*String?*/availableFlatLocales){
	//	summary:
	//		See dojo.requireLocalization()
	//	description:
	// 		Called by the bootstrap, but factored out so that it is only
	// 		included in the build when needed.

	var targetLocale = dojo.i18n.normalizeLocale(locale);
 	var bundlePackage = [moduleName, "nls", bundleName].join(".");
	// NOTE:
	//		When loading these resources, the packaging does not match what is
	//		on disk.  This is an implementation detail, as this is just a
	//		private data structure to hold the loaded resources.  e.g.
	//		`tests/hello/nls/en-us/salutations.js` is loaded as the object
	//		`tests.hello.nls.salutations.en_us={...}` The structure on disk is
	//		intended to be most convenient for developers and translators, but
	//		in memory it is more logical and efficient to store in a different
	//		order.  Locales cannot use dashes, since the resulting path will
	//		not evaluate as valid JS, so we translate them to underscores.

	//Find the best-match locale to load if we have available flat locales.
	var bestLocale = "";
	if(availableFlatLocales){
		var flatLocales = availableFlatLocales.split(",");
		for(var i = 0; i < flatLocales.length; i++){
			//Locale must match from start of string.
			//Using ["indexOf"] so customBase builds do not see
			//this as a dojo._base.array dependency.
			if(targetLocale["indexOf"](flatLocales[i]) == 0){
				if(flatLocales[i].length > bestLocale.length){
					bestLocale = flatLocales[i];
				}
			}
		}
		if(!bestLocale){
			bestLocale = "ROOT";
		}
	}

	//See if the desired locale is already loaded.
	var tempLocale = availableFlatLocales ? bestLocale : targetLocale;
	var bundle = dojo._loadedModules[bundlePackage];
	var localizedBundle = null;
	if(bundle){
		if(dojo.config.localizationComplete && bundle._built){return;}
		var jsLoc = tempLocale.replace(/-/g, '_');
		var translationPackage = bundlePackage+"."+jsLoc;
		localizedBundle = dojo._loadedModules[translationPackage];
	}

	if(!localizedBundle){
		bundle = dojo["provide"](bundlePackage);
		var syms = dojo._getModuleSymbols(moduleName);
		var modpath = syms.concat("nls").join("/");
		var parent;

		dojo.i18n._searchLocalePath(tempLocale, availableFlatLocales, function(loc){
			var jsLoc = loc.replace(/-/g, '_');
			var translationPackage = bundlePackage + "." + jsLoc;
			var loaded = false;
			if(!dojo._loadedModules[translationPackage]){
				// Mark loaded whether it's found or not, so that further load attempts will not be made
				dojo["provide"](translationPackage);
				var module = [modpath];
				if(loc != "ROOT"){module.push(loc);}
				module.push(bundleName);
				var filespec = module.join("/") + '.js';
				loaded = dojo._loadPath(filespec, null, function(hash){
					hash = hash.root || hash;
					// Use singleton with prototype to point to parent bundle, then mix-in result from loadPath
					var clazz = function(){};
					clazz.prototype = parent;
					bundle[jsLoc] = new clazz();
					for(var j in hash){ bundle[jsLoc][j] = hash[j]; }
				});
			}else{
				loaded = true;
			}
			if(loaded && bundle[jsLoc]){
				parent = bundle[jsLoc];
			}else{
				bundle[jsLoc] = parent;
			}

			if(availableFlatLocales){
				//Stop the locale path searching if we know the availableFlatLocales, since
				//the first call to this function will load the only bundle that is needed.
				return true;
			}
		});
	}

	//Save the best locale bundle as the target locale bundle when we know the
	//the available bundles.
	if(availableFlatLocales && targetLocale != bestLocale){
		bundle[targetLocale.replace(/-/g, '_')] = bundle[bestLocale.replace(/-/g, '_')];
	}
};

(function(){
	// If other locales are used, dojo.requireLocalization should load them as
	// well, by default.
	//
	// Override dojo.requireLocalization to do load the default bundle, then
	// iterate through the extraLocale list and load those translations as
	// well, unless a particular locale was requested.

	var extra = dojo.config.extraLocale;
	if(extra){
		if(!extra instanceof Array){
			extra = [extra];
		}

		var req = dojo.i18n._requireLocalization;
		dojo.i18n._requireLocalization = function(m, b, locale, availableFlatLocales){
			req(m,b,locale, availableFlatLocales);
			if(locale){return;}
			for(var i=0; i<extra.length; i++){
				req(m,b,extra[i], availableFlatLocales);
			}
		};
	}
})();

dojo.i18n._searchLocalePath = function(/*String*/locale, /*Boolean*/down, /*Function*/searchFunc){
	//	summary:
	//		A helper method to assist in searching for locale-based resources.
	//		Will iterate through the variants of a particular locale, either up
	//		or down, executing a callback function.  For example, "en-us" and
	//		true will try "en-us" followed by "en" and finally "ROOT".

	locale = dojo.i18n.normalizeLocale(locale);

	var elements = locale.split('-');
	var searchlist = [];
	for(var i = elements.length; i > 0; i--){
		searchlist.push(elements.slice(0, i).join('-'));
	}
	searchlist.push(false);
	if(down){searchlist.reverse();}

	for(var j = searchlist.length - 1; j >= 0; j--){
		var loc = searchlist[j] || "ROOT";
		var stop = searchFunc(loc);
		if(stop){ break; }
	}
};

dojo.i18n._preloadLocalizations = function(/*String*/bundlePrefix, /*Array*/localesGenerated){
	//	summary:
	//		Load built, flattened resource bundles, if available for all
	//		locales used in the page. Only called by built layer files.

	function preload(locale){
		locale = dojo.i18n.normalizeLocale(locale);
		dojo.i18n._searchLocalePath(locale, true, function(loc){
			for(var i=0; i<localesGenerated.length;i++){
				if(localesGenerated[i] == loc){
					dojo["require"](bundlePrefix+"_"+loc);
					return true; // Boolean
				}
			}
			return false; // Boolean
		});
	}
	preload();
	var extra = dojo.config.extraLocale||[];
	for(var i=0; i<extra.length; i++){
		preload(extra[i]);
	}
};

}

if(!dojo._hasResource["dijit.layout.ContentPane"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.layout.ContentPane"] = true;
dojo.provide("dijit.layout.ContentPane");







dojo.declare(
	"dijit.layout.ContentPane", [dijit._Widget, dijit.layout._ContentPaneResizeMixin],
{
	// summary:
	//		A widget containing an HTML fragment, specified inline
	//		or by uri.  Fragment may include widgets.
	//
	// description:
	//		This widget embeds a document fragment in the page, specified
	//		either by uri, javascript generated markup or DOM reference.
	//		Any widgets within this content are instantiated and managed,
	//		but laid out according to the HTML structure.  Unlike IFRAME,
	//		ContentPane embeds a document fragment as would be found
	//		inside the BODY tag of a full HTML document.  It should not
	//		contain the HTML, HEAD, or BODY tags.
	//		For more advanced functionality with scripts and
	//		stylesheets, see dojox.layout.ContentPane.  This widget may be
	//		used stand alone or as a base class for other widgets.
	//		ContentPane is useful as a child of other layout containers
	//		such as BorderContainer or TabContainer, but note that those
	//		widgets can contain any widget as a child.
	//
	// example:
	//		Some quick samples:
	//		To change the innerHTML: cp.set('content', '<b>new content</b>')
	//
	//		Or you can send it a NodeList: cp.set('content', dojo.query('div [class=selected]', userSelection))
	//
	//		To do an ajax update: cp.set('href', url)

	// href: String
	//		The href of the content that displays now.
	//		Set this at construction if you want to load data externally when the
	//		pane is shown.  (Set preload=true to load it immediately.)
	//		Changing href after creation doesn't have any effect; Use set('href', ...);
	href: "",

/*=====
	// content: String || DomNode || NodeList || dijit._Widget
	//		The innerHTML of the ContentPane.
	//		Note that the initialization parameter / argument to set("content", ...)
	//		can be a String, DomNode, Nodelist, or _Widget.
	content: "",
=====*/

	// extractContent: Boolean
	//		Extract visible content from inside of <body> .... </body>.
	//		I.e., strip <html> and <head> (and it's contents) from the href
	extractContent: false,

	// parseOnLoad: Boolean
	//		Parse content and create the widgets, if any.
	parseOnLoad: true,

	// parserScope: String
	//		Flag passed to parser.  Root for attribute names to search for.   If scopeName is dojo,
	//		will search for data-dojo-type (or dojoType).  For backwards compatibility
	//		reasons defaults to dojo._scopeName (which is "dojo" except when
	//		multi-version support is used, when it will be something like dojo16, dojo20, etc.)
	parserScope: dojo._scopeName,

	// preventCache: Boolean
	//		Prevent caching of data from href's by appending a timestamp to the href.
	preventCache: false,

	// preload: Boolean
	//		Force load of data on initialization even if pane is hidden.
	preload: false,

	// refreshOnShow: Boolean
	//		Refresh (re-download) content when pane goes from hidden to shown
	refreshOnShow: false,

	// loadingMessage: String
	//		Message that shows while downloading
	loadingMessage: "<span class='dijitContentPaneLoading'>${loadingState}</span>",

	// errorMessage: String
	//		Message that shows if an error occurs
	errorMessage: "<span class='dijitContentPaneError'>${errorState}</span>",

	// isLoaded: [readonly] Boolean
	//		True if the ContentPane has data in it, either specified
	//		during initialization (via href or inline content), or set
	//		via set('content', ...) / set('href', ...)
	//
	//		False if it doesn't have any content, or if ContentPane is
	//		still in the process of downloading href.
	isLoaded: false,

	baseClass: "dijitContentPane",

	// ioArgs: Object
	//		Parameters to pass to xhrGet() request, for example:
	// |	<div dojoType="dijit.layout.ContentPane" href="./bar" ioArgs="{timeout: 500}">
	ioArgs: {},

	// onLoadDeferred: [readonly] dojo.Deferred
	//		This is the `dojo.Deferred` returned by set('href', ...) and refresh().
	//		Calling onLoadDeferred.addCallback() or addErrback() registers your
	//		callback to be called only once, when the prior set('href', ...) call or
	//		the initial href parameter to the constructor finishes loading.
	//
	//		This is different than an onLoad() handler which gets called any time any href
	//		or content is loaded.
	onLoadDeferred: null,

	// Override _Widget's attributeMap because we don't want the title attribute (used to specify
	// tab labels) to be copied to ContentPane.domNode... otherwise a tooltip shows up over the
	// entire pane.
	attributeMap: dojo.delegate(dijit._Widget.prototype.attributeMap, {
		title: []
	}),

	// Flag to parser that I'll parse my contents, so it shouldn't.
	stopParser: true,

	// template: [private] Boolean
	//		Flag from the parser that this ContentPane is inside a template
	//		so the contents are pre-parsed.
	// (TODO: this declaration can be commented out in 2.0)
	template: false,

	create: function(params, srcNodeRef){
		// Convert a srcNodeRef argument into a content parameter, so that the original contents are
		// processed in the same way as contents set via set("content", ...), calling the parser etc.
		// Avoid modifying original params object since that breaks NodeList instantiation, see #11906.
		if((!params || !params.template) && srcNodeRef && !("href" in params) && !("content" in params)){
			var df = dojo.doc.createDocumentFragment();
			srcNodeRef = dojo.byId(srcNodeRef)
			while(srcNodeRef.firstChild){
				df.appendChild(srcNodeRef.firstChild);
			}
			params = dojo.delegate(params, {content: df});
		}
		this.inherited(arguments, [params, srcNodeRef]);
	},

	postMixInProperties: function(){
		this.inherited(arguments);
		var messages = dojo.i18n.getLocalization("dijit", "loading", this.lang);
		this.loadingMessage = dojo.string.substitute(this.loadingMessage, messages);
		this.errorMessage = dojo.string.substitute(this.errorMessage, messages);
	},

	buildRendering: function(){
		this.inherited(arguments);

		// Since we have no template we need to set this.containerNode ourselves, to make getChildren() work.
		// For subclasses of ContentPane that do have a template, does nothing.
		if(!this.containerNode){
			this.containerNode = this.domNode;
		}

		// remove the title attribute so it doesn't show up when hovering
		// over a node  (TODO: remove in 2.0, no longer needed after #11490)
		this.domNode.title = "";

		if(!dojo.attr(this.domNode,"role")){
			dijit.setWaiRole(this.domNode, "group");
		}
	},

	_startChildren: function(){
		// summary:
		//		Call startup() on all children including non _Widget ones like dojo.dnd.Source objects

		// This starts all the widgets
		this.inherited(arguments);

		// And this catches stuff like dojo.dnd.Source
		if(this._contentSetter){
			dojo.forEach(this._contentSetter.parseResults, function(obj){
				if(!obj._started && !obj._destroyed && dojo.isFunction(obj.startup)){
					obj.startup();
					obj._started = true;
				}
			}, this);
		}
	},

	setHref: function(/*String|Uri*/ href){
		// summary:
		//		Deprecated.   Use set('href', ...) instead.
		dojo.deprecated("dijit.layout.ContentPane.setHref() is deprecated. Use set('href', ...) instead.", "", "2.0");
		return this.set("href", href);
	},
	_setHrefAttr: function(/*String|Uri*/ href){
		// summary:
		//		Hook so set("href", ...) works.
		// description:
		//		Reset the (external defined) content of this pane and replace with new url
		//		Note: It delays the download until widget is shown if preload is false.
		//	href:
		//		url to the page you want to get, must be within the same domain as your mainpage

		// Cancel any in-flight requests (a set('href', ...) will cancel any in-flight set('href', ...))
		this.cancel();

		this.onLoadDeferred = new dojo.Deferred(dojo.hitch(this, "cancel"));
		this.onLoadDeferred.addCallback(dojo.hitch(this, "onLoad"));

		this._set("href", href);

		// _setHrefAttr() is called during creation and by the user, after creation.
		// Assuming preload == false, only in the second case do we actually load the URL;
		// otherwise it's done in startup(), and only if this widget is shown.
		if(this.preload || (this._created && this._isShown())){
			this._load();
		}else{
			// Set flag to indicate that href needs to be loaded the next time the
			// ContentPane is made visible
			this._hrefChanged = true;
		}

		return this.onLoadDeferred;		// dojo.Deferred
	},

	setContent: function(/*String|DomNode|Nodelist*/data){
		// summary:
		//		Deprecated.   Use set('content', ...) instead.
		dojo.deprecated("dijit.layout.ContentPane.setContent() is deprecated.  Use set('content', ...) instead.", "", "2.0");
		this.set("content", data);
	},
	_setContentAttr: function(/*String|DomNode|Nodelist*/data){
		// summary:
		//		Hook to make set("content", ...) work.
		//		Replaces old content with data content, include style classes from old content
		//	data:
		//		the new Content may be String, DomNode or NodeList
		//
		//		if data is a NodeList (or an array of nodes) nodes are copied
		//		so you can import nodes from another document implicitly

		// clear href so we can't run refresh and clear content
		// refresh should only work if we downloaded the content
		this._set("href", "");

		// Cancel any in-flight requests (a set('content', ...) will cancel any in-flight set('href', ...))
		this.cancel();

		// Even though user is just setting content directly, still need to define an onLoadDeferred
		// because the _onLoadHandler() handler is still getting called from setContent()
		this.onLoadDeferred = new dojo.Deferred(dojo.hitch(this, "cancel"));
		if(this._created){
			// For back-compat reasons, call onLoad() for set('content', ...)
			// calls but not for content specified in srcNodeRef (ie: <div dojoType=ContentPane>...</div>)
			// or as initialization parameter (ie: new ContentPane({content: ...})
			this.onLoadDeferred.addCallback(dojo.hitch(this, "onLoad"));
		}

		this._setContent(data || "");

		this._isDownloaded = false; // mark that content is from a set('content') not a set('href')

		return this.onLoadDeferred; 	// dojo.Deferred
	},
	_getContentAttr: function(){
		// summary:
		//		Hook to make get("content") work
		return this.containerNode.innerHTML;
	},

	cancel: function(){
		// summary:
		//		Cancels an in-flight download of content
		if(this._xhrDfd && (this._xhrDfd.fired == -1)){
			this._xhrDfd.cancel();
		}
		delete this._xhrDfd; // garbage collect

		this.onLoadDeferred = null;
	},

	uninitialize: function(){
		if(this._beingDestroyed){
			this.cancel();
		}
		this.inherited(arguments);
	},

	destroyRecursive: function(/*Boolean*/ preserveDom){
		// summary:
		//		Destroy the ContentPane and its contents

		// if we have multiple controllers destroying us, bail after the first
		if(this._beingDestroyed){
			return;
		}
		this.inherited(arguments);
	},

	_onShow: function(){
		// summary:
		//		Called when the ContentPane is made visible
		// description:
		//		For a plain ContentPane, this is called on initialization, from startup().
		//		If the ContentPane is a hidden pane of a TabContainer etc., then it's
		//		called whenever the pane is made visible.
		//
		//		Does necessary processing, including href download and layout/resize of
		//		child widget(s)

		this.inherited(arguments);

		if(this.href){
			if(!this._xhrDfd && // if there's an href that isn't already being loaded
				(!this.isLoaded || this._hrefChanged || this.refreshOnShow)
			){
				return this.refresh();	// If child has an href, promise that fires when the load is complete
			}
		}
	},

	refresh: function(){
		// summary:
		//		[Re]download contents of href and display
		// description:
		//		1. cancels any currently in-flight requests
		//		2. posts "loading..." message
		//		3. sends XHR to download new data

		// Cancel possible prior in-flight request
		this.cancel();

		this.onLoadDeferred = new dojo.Deferred(dojo.hitch(this, "cancel"));
		this.onLoadDeferred.addCallback(dojo.hitch(this, "onLoad"));
		this._load();
		return this.onLoadDeferred;		// If child has an href, promise that fires when refresh is complete
	},

	_load: function(){
		// summary:
		//		Load/reload the href specified in this.href

		// display loading message
		this._setContent(this.onDownloadStart(), true);

		var self = this;
		var getArgs = {
			preventCache: (this.preventCache || this.refreshOnShow),
			url: this.href,
			handleAs: "text"
		};
		if(dojo.isObject(this.ioArgs)){
			dojo.mixin(getArgs, this.ioArgs);
		}

		var hand = (this._xhrDfd = (this.ioMethod || dojo.xhrGet)(getArgs));

		hand.addCallback(function(html){
			try{
				self._isDownloaded = true;
				self._setContent(html, false);
				self.onDownloadEnd();
			}catch(err){
				self._onError('Content', err); // onContentError
			}
			delete self._xhrDfd;
			return html;
		});

		hand.addErrback(function(err){
			if(!hand.canceled){
				// show error message in the pane
				self._onError('Download', err); // onDownloadError
			}
			delete self._xhrDfd;
			return err;
		});

		// Remove flag saying that a load is needed
		delete this._hrefChanged;
	},

	_onLoadHandler: function(data){
		// summary:
		//		This is called whenever new content is being loaded
		this._set("isLoaded", true);
		try{
			this.onLoadDeferred.callback(data);
		}catch(e){
			console.error('Error '+this.widgetId+' running custom onLoad code: ' + e.message);
		}
	},

	_onUnloadHandler: function(){
		// summary:
		//		This is called whenever the content is being unloaded
		this._set("isLoaded", false);
		try{
			this.onUnload();
		}catch(e){
			console.error('Error '+this.widgetId+' running custom onUnload code: ' + e.message);
		}
	},

	destroyDescendants: function(){
		// summary:
		//		Destroy all the widgets inside the ContentPane and empty containerNode

		// Make sure we call onUnload (but only when the ContentPane has real content)
		if(this.isLoaded){
			this._onUnloadHandler();
		}

		// Even if this.isLoaded == false there might still be a "Loading..." message
		// to erase, so continue...

		// For historical reasons we need to delete all widgets under this.containerNode,
		// even ones that the user has created manually.
		var setter = this._contentSetter;
		dojo.forEach(this.getChildren(), function(widget){
			if(widget.destroyRecursive){
				widget.destroyRecursive();
			}
		});
		if(setter){
			// Most of the widgets in setter.parseResults have already been destroyed, but
			// things like Menu that have been moved to <body> haven't yet
			dojo.forEach(setter.parseResults, function(widget){
				if(widget.destroyRecursive && widget.domNode && widget.domNode.parentNode == dojo.body()){
					widget.destroyRecursive();
				}
			});
			delete setter.parseResults;
		}

		// And then clear away all the DOM nodes
		dojo.html._emptyNode(this.containerNode);

		// Delete any state information we have about current contents
		delete this._singleChild;
	},

	_setContent: function(/*String|DocumentFragment*/ cont, /*Boolean*/ isFakeContent){
		// summary:
		//		Insert the content into the container node

		// first get rid of child widgets
		this.destroyDescendants();

		// dojo.html.set will take care of the rest of the details
		// we provide an override for the error handling to ensure the widget gets the errors
		// configure the setter instance with only the relevant widget instance properties
		// NOTE: unless we hook into attr, or provide property setters for each property,
		// we need to re-configure the ContentSetter with each use
		var setter = this._contentSetter;
		if(! (setter && setter instanceof dojo.html._ContentSetter)){
			setter = this._contentSetter = new dojo.html._ContentSetter({
				node: this.containerNode,
				_onError: dojo.hitch(this, this._onError),
				onContentError: dojo.hitch(this, function(e){
					// fires if a domfault occurs when we are appending this.errorMessage
					// like for instance if domNode is a UL and we try append a DIV
					var errMess = this.onContentError(e);
					try{
						this.containerNode.innerHTML = errMess;
					}catch(e){
						console.error('Fatal '+this.id+' could not change content due to '+e.message, e);
					}
				})/*,
				_onError */
			});
		};

		var setterParams = dojo.mixin({
			cleanContent: this.cleanContent,
			extractContent: this.extractContent,
			parseContent: this.parseOnLoad,
			parserScope: this.parserScope,
			startup: false,
			dir: this.dir,
			lang: this.lang
		}, this._contentSetterParams || {});

		setter.set( (dojo.isObject(cont) && cont.domNode) ? cont.domNode : cont, setterParams );

		// setter params must be pulled afresh from the ContentPane each time
		delete this._contentSetterParams;

		if(this.doLayout){
			this._checkIfSingleChild();
		}

		if(!isFakeContent){
			if(this._started){
				// Startup each top level child widget (and they will start their children, recursively)
				this._startChildren();
	
				// Call resize() on each of my child layout widgets,
				// or resize() on my single child layout widget...
				// either now (if I'm currently visible) or when I become visible
				this._scheduleLayout();
			}

			this._onLoadHandler(cont);
		}
	},

	_onError: function(type, err, consoleText){
		this.onLoadDeferred.errback(err);

		// shows user the string that is returned by on[type]Error
		// override on[type]Error and return your own string to customize
		var errText = this['on' + type + 'Error'].call(this, err);
		if(consoleText){
			console.error(consoleText, err);
		}else if(errText){// a empty string won't change current content
			this._setContent(errText, true);
		}
	},

	// EVENT's, should be overide-able
	onLoad: function(data){
		// summary:
		//		Event hook, is called after everything is loaded and widgetified
		// tags:
		//		callback
	},

	onUnload: function(){
		// summary:
		//		Event hook, is called before old content is cleared
		// tags:
		//		callback
	},

	onDownloadStart: function(){
		// summary:
		//		Called before download starts.
		// description:
		//		The string returned by this function will be the html
		//		that tells the user we are loading something.
		//		Override with your own function if you want to change text.
		// tags:
		//		extension
		return this.loadingMessage;
	},

	onContentError: function(/*Error*/ error){
		// summary:
		//		Called on DOM faults, require faults etc. in content.
		//
		//		In order to display an error message in the pane, return
		//		the error message from this method, as an HTML string.
		//
		//		By default (if this method is not overriden), it returns
		//		nothing, so the error message is just printed to the console.
		// tags:
		//		extension
	},

	onDownloadError: function(/*Error*/ error){
		// summary:
		//		Called when download error occurs.
		//
		//		In order to display an error message in the pane, return
		//		the error message from this method, as an HTML string.
		//
		//		Default behavior (if this method is not overriden) is to display
		//		the error message inside the pane.
		// tags:
		//		extension
		return this.errorMessage;
	},

	onDownloadEnd: function(){
		// summary:
		//		Called when download is finished.
		// tags:
		//		callback
	}
});

}

if(!dojo._hasResource["dojo.regexp"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.regexp"] = true;
dojo.provide("dojo.regexp");

dojo.getObject("regexp", true, dojo);

/*=====
dojo.regexp = {
	// summary: Regular expressions and Builder resources
};
=====*/

dojo.regexp.escapeString = function(/*String*/str, /*String?*/except){
	//	summary:
	//		Adds escape sequences for special characters in regular expressions
	// except:
	//		a String with special characters to be left unescaped

	return str.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, function(ch){
		if(except && except.indexOf(ch) != -1){
			return ch;
		}
		return "\\" + ch;
	}); // String
};

dojo.regexp.buildGroupRE = function(/*Object|Array*/arr, /*Function*/re, /*Boolean?*/nonCapture){
	//	summary:
	//		Builds a regular expression that groups subexpressions
	//	description:
	//		A utility function used by some of the RE generators. The
	//		subexpressions are constructed by the function, re, in the second
	//		parameter.  re builds one subexpression for each elem in the array
	//		a, in the first parameter. Returns a string for a regular
	//		expression that groups all the subexpressions.
	// arr:
	//		A single value or an array of values.
	// re:
	//		A function. Takes one parameter and converts it to a regular
	//		expression.
	// nonCapture:
	//		If true, uses non-capturing match, otherwise matches are retained
	//		by regular expression. Defaults to false

	// case 1: a is a single value.
	if(!(arr instanceof Array)){
		return re(arr); // String
	}

	// case 2: a is an array
	var b = [];
	for(var i = 0; i < arr.length; i++){
		// convert each elem to a RE
		b.push(re(arr[i]));
	}

	 // join the REs as alternatives in a RE group.
	return dojo.regexp.group(b.join("|"), nonCapture); // String
};

dojo.regexp.group = function(/*String*/expression, /*Boolean?*/nonCapture){
	// summary:
	//		adds group match to expression
	// nonCapture:
	//		If true, uses non-capturing match, otherwise matches are retained
	//		by regular expression.
	return "(" + (nonCapture ? "?:":"") + expression + ")"; // String
};

}

if(!dojo._hasResource["dojo.cookie"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.cookie"] = true;
dojo.provide("dojo.cookie");



/*=====
dojo.__cookieProps = function(){
	//	expires: Date|String|Number?
	//		If a number, the number of days from today at which the cookie
	//		will expire. If a date, the date past which the cookie will expire.
	//		If expires is in the past, the cookie will be deleted.
	//		If expires is omitted or is 0, the cookie will expire when the browser closes. << FIXME: 0 seems to disappear right away? FF3.
	//	path: String?
	//		The path to use for the cookie.
	//	domain: String?
	//		The domain to use for the cookie.
	//	secure: Boolean?
	//		Whether to only send the cookie on secure connections
	this.expires = expires;
	this.path = path;
	this.domain = domain;
	this.secure = secure;
}
=====*/


dojo.cookie = function(/*String*/name, /*String?*/value, /*dojo.__cookieProps?*/props){
	//	summary:
	//		Get or set a cookie.
	//	description:
	// 		If one argument is passed, returns the value of the cookie
	// 		For two or more arguments, acts as a setter.
	//	name:
	//		Name of the cookie
	//	value:
	//		Value for the cookie
	//	props:
	//		Properties for the cookie
	//	example:
	//		set a cookie with the JSON-serialized contents of an object which
	//		will expire 5 days from now:
	//	|	dojo.cookie("configObj", dojo.toJson(config), { expires: 5 });
	//
	//	example:
	//		de-serialize a cookie back into a JavaScript object:
	//	|	var config = dojo.fromJson(dojo.cookie("configObj"));
	//
	//	example:
	//		delete a cookie:
	//	|	dojo.cookie("configObj", null, {expires: -1});
	var c = document.cookie;
	if(arguments.length == 1){
		var matches = c.match(new RegExp("(?:^|; )" + dojo.regexp.escapeString(name) + "=([^;]*)"));
		return matches ? decodeURIComponent(matches[1]) : undefined; // String or undefined
	}else{
		props = props || {};
// FIXME: expires=0 seems to disappear right away, not on close? (FF3)  Change docs?
		var exp = props.expires;
		if(typeof exp == "number"){
			var d = new Date();
			d.setTime(d.getTime() + exp*24*60*60*1000);
			exp = props.expires = d;
		}
		if(exp && exp.toUTCString){ props.expires = exp.toUTCString(); }

		value = encodeURIComponent(value);
		var updatedCookie = name + "=" + value, propName;
		for(propName in props){
			updatedCookie += "; " + propName;
			var propValue = props[propName];
			if(propValue !== true){ updatedCookie += "=" + propValue; }
		}
		document.cookie = updatedCookie;
	}
};

dojo.cookie.isSupported = function(){
	//	summary:
	//		Use to determine if the current browser supports cookies or not.
	//
	//		Returns true if user allows cookies.
	//		Returns false if user doesn't allow cookies.

	if(!("cookieEnabled" in navigator)){
		this("__djCookieTest__", "CookiesAllowed");
		navigator.cookieEnabled = this("__djCookieTest__") == "CookiesAllowed";
		if(navigator.cookieEnabled){
			this("__djCookieTest__", "", {expires: -1});
		}
	}
	return navigator.cookieEnabled;
};

}

if(!dojo._hasResource["dojo.cache"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.cache"] = true;
dojo.provide("dojo.cache");


/*=====
dojo.cache = {
	// summary:
	// 		A way to cache string content that is fetchable via `dojo.moduleUrl`.
};
=====*/

	var cache = {};
	dojo.cache = function(/*String||Object*/module, /*String*/url, /*String||Object?*/value){
		// summary:
		// 		A getter and setter for storing the string content associated with the
		// 		module and url arguments.
		// description:
		// 		module and url are used to call `dojo.moduleUrl()` to generate a module URL.
		// 		If value is specified, the cache value for the moduleUrl will be set to
		// 		that value. Otherwise, dojo.cache will fetch the moduleUrl and store it
		// 		in its internal cache and return that cached value for the URL. To clear
		// 		a cache value pass null for value. Since XMLHttpRequest (XHR) is used to fetch the
		// 		the URL contents, only modules on the same domain of the page can use this capability.
		// 		The build system can inline the cache values though, to allow for xdomain hosting.
		// module: String||Object
		// 		If a String, the module name to use for the base part of the URL, similar to module argument
		// 		to `dojo.moduleUrl`. If an Object, something that has a .toString() method that
		// 		generates a valid path for the cache item. For example, a dojo._Url object.
		// url: String
		// 		The rest of the path to append to the path derived from the module argument. If
		// 		module is an object, then this second argument should be the "value" argument instead.
		// value: String||Object?
		// 		If a String, the value to use in the cache for the module/url combination.
		// 		If an Object, it can have two properties: value and sanitize. The value property
		// 		should be the value to use in the cache, and sanitize can be set to true or false,
		// 		to indicate if XML declarations should be removed from the value and if the HTML
		// 		inside a body tag in the value should be extracted as the real value. The value argument
		// 		or the value property on the value argument are usually only used by the build system
		// 		as it inlines cache content.
		//	example:
		//		To ask dojo.cache to fetch content and store it in the cache (the dojo["cache"] style
		// 		of call is used to avoid an issue with the build system erroneously trying to intern
		// 		this example. To get the build system to intern your dojo.cache calls, use the
		// 		"dojo.cache" style of call):
		// 		|	//If template.html contains "<h1>Hello</h1>" that will be
		// 		|	//the value for the text variable.
		//		|	var text = dojo["cache"]("my.module", "template.html");
		//	example:
		//		To ask dojo.cache to fetch content and store it in the cache, and sanitize the input
		// 		 (the dojo["cache"] style of call is used to avoid an issue with the build system
		// 		erroneously trying to intern this example. To get the build system to intern your
		// 		dojo.cache calls, use the "dojo.cache" style of call):
		// 		|	//If template.html contains "<html><body><h1>Hello</h1></body></html>", the
		// 		|	//text variable will contain just "<h1>Hello</h1>".
		//		|	var text = dojo["cache"]("my.module", "template.html", {sanitize: true});
		//	example:
		//		Same example as previous, but demostrates how an object can be passed in as
		//		the first argument, then the value argument can then be the second argument.
		// 		|	//If template.html contains "<html><body><h1>Hello</h1></body></html>", the
		// 		|	//text variable will contain just "<h1>Hello</h1>".
		//		|	var text = dojo["cache"](new dojo._Url("my/module/template.html"), {sanitize: true});

		//Module could be a string, or an object that has a toString() method
		//that will return a useful path. If it is an object, then the "url" argument
		//will actually be the value argument.
		if(typeof module == "string"){
			var pathObj = dojo.moduleUrl(module, url);
		}else{
			pathObj = module;
			value = url;
		}
		var key = pathObj.toString();

		var val = value;
		if(value != undefined && !dojo.isString(value)){
			val = ("value" in value ? value.value : undefined);
		}

		var sanitize = value && value.sanitize ? true : false;

		if(typeof val == "string"){
			//We have a string, set cache value
			val = cache[key] = sanitize ? dojo.cache._sanitize(val) : val;
		}else if(val === null){
			//Remove cached value
			delete cache[key];
		}else{
			//Allow cache values to be empty strings. If key property does
			//not exist, fetch it.
			if(!(key in cache)){
				val = dojo._getText(key);
				cache[key] = sanitize ? dojo.cache._sanitize(val) : val;
			}
			val = cache[key];
		}
		return val; //String
	};

	dojo.cache._sanitize = function(/*String*/val){
		// summary:
		//		Strips <?xml ...?> declarations so that external SVG and XML
		// 		documents can be added to a document without worry. Also, if the string
		//		is an HTML document, only the part inside the body tag is returned.
		// description:
		// 		Copied from dijit._Templated._sanitizeTemplateString.
		if(val){
			val = val.replace(/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im, "");
			var matches = val.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
			if(matches){
				val = matches[1];
			}
		}else{
			val = "";
		}
		return val; //String
	};

}

if(!dojo._hasResource["dijit._Templated"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._Templated"] = true;
dojo.provide("dijit._Templated");






dojo.declare("dijit._Templated",
	null,
	{
		// summary:
		//		Mixin for widgets that are instantiated from a template

		// templateString: [protected] String
		//		A string that represents the widget template. Pre-empts the
		//		templatePath. In builds that have their strings "interned", the
		//		templatePath is converted to an inline templateString, thereby
		//		preventing a synchronous network call.
		//
		//		Use in conjunction with dojo.cache() to load from a file.
		templateString: null,

		// templatePath: [protected deprecated] String
		//		Path to template (HTML file) for this widget relative to dojo.baseUrl.
		//		Deprecated: use templateString with dojo.cache() instead.
		templatePath: null,

		// widgetsInTemplate: [protected] Boolean
		//		Should we parse the template to find widgets that might be
		//		declared in markup inside it?  False by default.
		widgetsInTemplate: false,

		// skipNodeCache: [protected] Boolean
		//		If using a cached widget template node poses issues for a
		//		particular widget class, it can set this property to ensure
		//		that its template is always re-built from a string
		_skipNodeCache: false,

		// _earlyTemplatedStartup: Boolean
		//		A fallback to preserve the 1.0 - 1.3 behavior of children in
		//		templates having their startup called before the parent widget
		//		fires postCreate. Defaults to 'false', causing child widgets to
		//		have their .startup() called immediately before a parent widget
		//		.startup(), but always after the parent .postCreate(). Set to
		//		'true' to re-enable to previous, arguably broken, behavior.
		_earlyTemplatedStartup: false,

/*=====
		// _attachPoints: [private] String[]
		//		List of widget attribute names associated with dojoAttachPoint=... in the
		//		template, ex: ["containerNode", "labelNode"]
 		_attachPoints: [],
 =====*/

/*=====
		// _attachEvents: [private] Handle[]
		//		List of connections associated with dojoAttachEvent=... in the
		//		template
 		_attachEvents: [],
 =====*/

		constructor: function(){
			this._attachPoints = [];
			this._attachEvents = [];
		},

		_stringRepl: function(tmpl){
			// summary:
			//		Does substitution of ${foo} type properties in template string
			// tags:
			//		private
			var className = this.declaredClass, _this = this;
			// Cache contains a string because we need to do property replacement
			// do the property replacement
			return dojo.string.substitute(tmpl, this, function(value, key){
				if(key.charAt(0) == '!'){ value = dojo.getObject(key.substr(1), false, _this); }
				if(typeof value == "undefined"){ throw new Error(className+" template:"+key); } // a debugging aide
				if(value == null){ return ""; }

				// Substitution keys beginning with ! will skip the transform step,
				// in case a user wishes to insert unescaped markup, e.g. ${!foo}
				return key.charAt(0) == "!" ? value :
					// Safer substitution, see heading "Attribute values" in
					// http://www.w3.org/TR/REC-html40/appendix/notes.html#h-B.3.2
					value.toString().replace(/"/g,"&quot;"); //TODO: add &amp? use encodeXML method?
			}, this);
		},

		buildRendering: function(){
			// summary:
			//		Construct the UI for this widget from a template, setting this.domNode.
			// tags:
			//		protected

			// Lookup cached version of template, and download to cache if it
			// isn't there already.  Returns either a DomNode or a string, depending on
			// whether or not the template contains ${foo} replacement parameters.
			var cached = dijit._Templated.getCachedTemplate(this.templatePath, this.templateString, this._skipNodeCache);

			var node;
			if(dojo.isString(cached)){
				node = dojo._toDom(this._stringRepl(cached));
				if(node.nodeType != 1){
					// Flag common problems such as templates with multiple top level nodes (nodeType == 11)
					throw new Error("Invalid template: " + cached);
				}
			}else{
				// if it's a node, all we have to do is clone it
				node = cached.cloneNode(true);
			}

			this.domNode = node;

			// Call down to _Widget.buildRendering() to get base classes assigned
			// TODO: change the baseClass assignment to attributeMap
			this.inherited(arguments);

			// recurse through the node, looking for, and attaching to, our
			// attachment points and events, which should be defined on the template node.
			this._attachTemplateNodes(node);

			if(this.widgetsInTemplate){
				// Store widgets that we need to start at a later point in time
				var cw = (this._startupWidgets = dojo.parser.parse(node, {
					noStart: !this._earlyTemplatedStartup,
					template: true,
					inherited: {dir: this.dir, lang: this.lang},
					propsThis: this,	// so data-dojo-props of widgets in the template can reference "this" to refer to me
					scope: "dojo"	// even in multi-version mode templates use dojoType/data-dojo-type
				}));

				this._supportingWidgets = dijit.findWidgets(node);

				this._attachTemplateNodes(cw, function(n,p){
					return n[p];
				});
			}

			this._fillContent(this.srcNodeRef);
		},

		_fillContent: function(/*DomNode*/ source){
			// summary:
			//		Relocate source contents to templated container node.
			//		this.containerNode must be able to receive children, or exceptions will be thrown.
			// tags:
			//		protected
			var dest = this.containerNode;
			if(source && dest){
				while(source.hasChildNodes()){
					dest.appendChild(source.firstChild);
				}
			}
		},

		_attachTemplateNodes: function(rootNode, getAttrFunc){
			// summary:
			//		Iterate through the template and attach functions and nodes accordingly.
			//		Alternately, if rootNode is an array of widgets, then will process dojoAttachPoint
			//		etc. for those widgets.
			// description:
			//		Map widget properties and functions to the handlers specified in
			//		the dom node and it's descendants. This function iterates over all
			//		nodes and looks for these properties:
			//			* dojoAttachPoint
			//			* dojoAttachEvent
			//			* waiRole
			//			* waiState
			// rootNode: DomNode|Array[Widgets]
			//		the node to search for properties. All children will be searched.
			// getAttrFunc: Function?
			//		a function which will be used to obtain property for a given
			//		DomNode/Widget
			// tags:
			//		private

			getAttrFunc = getAttrFunc || function(n,p){ return n.getAttribute(p); };

			var nodes = dojo.isArray(rootNode) ? rootNode : (rootNode.all || rootNode.getElementsByTagName("*"));
			var x = dojo.isArray(rootNode) ? 0 : -1;
			for(; x<nodes.length; x++){
				var baseNode = (x == -1) ? rootNode : nodes[x];
				if(this.widgetsInTemplate && (getAttrFunc(baseNode, "dojoType") || getAttrFunc(baseNode, "data-dojo-type"))){
					continue;
				}
				// Process dojoAttachPoint
				var attachPoint = getAttrFunc(baseNode, "dojoAttachPoint") || getAttrFunc(baseNode, "data-dojo-attach-point");
				if(attachPoint){
					var point, points = attachPoint.split(/\s*,\s*/);
					while((point = points.shift())){
						if(dojo.isArray(this[point])){
							this[point].push(baseNode);
						}else{
							this[point]=baseNode;
						}
						this._attachPoints.push(point);
					}
				}

				// Process dojoAttachEvent
				var attachEvent = getAttrFunc(baseNode, "dojoAttachEvent") || getAttrFunc(baseNode, "data-dojo-attach-event");;
				if(attachEvent){
					// NOTE: we want to support attributes that have the form
					// "domEvent: nativeEvent; ..."
					var event, events = attachEvent.split(/\s*,\s*/);
					var trim = dojo.trim;
					while((event = events.shift())){
						if(event){
							var thisFunc = null;
							if(event.indexOf(":") != -1){
								// oh, if only JS had tuple assignment
								var funcNameArr = event.split(":");
								event = trim(funcNameArr[0]);
								thisFunc = trim(funcNameArr[1]);
							}else{
								event = trim(event);
							}
							if(!thisFunc){
								thisFunc = event;
							}
							this._attachEvents.push(this.connect(baseNode, event, thisFunc));
						}
					}
				}

				// waiRole, waiState
				// TODO: remove this in 2.0, templates are now using role=... and aria-XXX=... attributes directicly
				var role = getAttrFunc(baseNode, "waiRole");
				if(role){
					dijit.setWaiRole(baseNode, role);
				}
				var values = getAttrFunc(baseNode, "waiState");
				if(values){
					dojo.forEach(values.split(/\s*,\s*/), function(stateValue){
						if(stateValue.indexOf('-') != -1){
							var pair = stateValue.split('-');
							dijit.setWaiState(baseNode, pair[0], pair[1]);
						}
					});
				}
			}
		},

		startup: function(){
			dojo.forEach(this._startupWidgets, function(w){
				if(w && !w._started && w.startup){
					w.startup();
				}
			});
			this.inherited(arguments);
		},

		destroyRendering: function(){
			// Delete all attach points to prevent IE6 memory leaks.
			dojo.forEach(this._attachPoints, function(point){
				delete this[point];
			}, this);
			this._attachPoints = [];

			// And same for event handlers
			dojo.forEach(this._attachEvents, this.disconnect, this);
			this._attachEvents = [];
			
			this.inherited(arguments);
		}
	}
);

// key is either templatePath or templateString; object is either string or DOM tree
dijit._Templated._templateCache = {};

dijit._Templated.getCachedTemplate = function(templatePath, templateString, alwaysUseString){
	// summary:
	//		Static method to get a template based on the templatePath or
	//		templateString key
	// templatePath: String||dojo.uri.Uri
	//		The URL to get the template from.
	// templateString: String?
	//		a string to use in lieu of fetching the template from a URL. Takes precedence
	//		over templatePath
	// returns: Mixed
	//		Either string (if there are ${} variables that need to be replaced) or just
	//		a DOM tree (if the node can be cloned directly)

	// is it already cached?
	var tmplts = dijit._Templated._templateCache;
	var key = templateString || templatePath;
	var cached = tmplts[key];
	if(cached){
		try{
			// if the cached value is an innerHTML string (no ownerDocument) or a DOM tree created within the current document, then use the current cached value
			if(!cached.ownerDocument || cached.ownerDocument == dojo.doc){
				// string or node of the same document
				return cached;
			}
		}catch(e){ /* squelch */ } // IE can throw an exception if cached.ownerDocument was reloaded
		dojo.destroy(cached);
	}

	// If necessary, load template string from template path
	if(!templateString){
		templateString = dojo.cache(templatePath, {sanitize: true});
	}
	templateString = dojo.string.trim(templateString);

	if(alwaysUseString || templateString.match(/\$\{([^\}]+)\}/g)){
		// there are variables in the template so all we can do is cache the string
		return (tmplts[key] = templateString); //String
	}else{
		// there are no variables in the template so we can cache the DOM tree
		var node = dojo._toDom(templateString);
		if(node.nodeType != 1){
			throw new Error("Invalid template: " + templateString);
		}
		return (tmplts[key] = node); //Node
	}
};

if(dojo.isIE){
	dojo.addOnWindowUnload(function(){
		var cache = dijit._Templated._templateCache;
		for(var key in cache){
			var value = cache[key];
			if(typeof value == "object"){ // value is either a string or a DOM node template
				dojo.destroy(value);
			}
			delete cache[key];
		}
	});
}

// These arguments can be specified for widgets which are used in templates.
// Since any widget can be specified as sub widgets in template, mix it
// into the base widget class.  (This is a hack, but it's effective.)
dojo.extend(dijit._Widget,{
	dojoAttachEvent: "",
	dojoAttachPoint: "",
	waiRole: "",
	waiState:""
});

}

if(!dojo._hasResource["dijit.layout.BorderContainer"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.layout.BorderContainer"] = true;
dojo.provide("dijit.layout.BorderContainer");





dojo.declare(
	"dijit.layout.BorderContainer",
	dijit.layout._LayoutWidget,
{
	// summary:
	//		Provides layout in up to 5 regions, a mandatory center with optional borders along its 4 sides.
	//
	// description:
	//		A BorderContainer is a box with a specified size, such as style="width: 500px; height: 500px;",
	//		that contains a child widget marked region="center" and optionally children widgets marked
	//		region equal to "top", "bottom", "leading", "trailing", "left" or "right".
	//		Children along the edges will be laid out according to width or height dimensions and may
	//		include optional splitters (splitter="true") to make them resizable by the user.  The remaining
	//		space is designated for the center region.
	//
	//		The outer size must be specified on the BorderContainer node.  Width must be specified for the sides
	//		and height for the top and bottom, respectively.  No dimensions should be specified on the center;
	//		it will fill the remaining space.  Regions named "leading" and "trailing" may be used just like
	//		"left" and "right" except that they will be reversed in right-to-left environments.
	//
	//		For complex layouts, multiple children can be specified for a single region.   In this case, the
	//		layoutPriority flag on the children determines which child is closer to the edge (low layoutPriority)
	//		and which child is closer to the center (high layoutPriority).   layoutPriority can also be used
	//		instead of the design attribute to conrol layout precedence of horizontal vs. vertical panes.
	// example:
	// |	<div dojoType="dijit.layout.BorderContainer" design="sidebar" gutters="false"
	// |            style="width: 400px; height: 300px;">
	// |		<div dojoType="dijit.layout.ContentPane" region="top">header text</div>
	// |		<div dojoType="dijit.layout.ContentPane" region="right" splitter="true" style="width: 200px;">table of contents</div>
	// |		<div dojoType="dijit.layout.ContentPane" region="center">client area</div>
	// |	</div>

	// design: String
	//		Which design is used for the layout:
	//			- "headline" (default) where the top and bottom extend
	//				the full width of the container
	//			- "sidebar" where the left and right sides extend from top to bottom.
	design: "headline",

	// gutters: [const] Boolean
	//		Give each pane a border and margin.
	//		Margin determined by domNode.paddingLeft.
	//		When false, only resizable panes have a gutter (i.e. draggable splitter) for resizing.
	gutters: true,

	// liveSplitters: [const] Boolean
	//		Specifies whether splitters resize as you drag (true) or only upon mouseup (false)
	liveSplitters: true,

	// persist: Boolean
	//		Save splitter positions in a cookie.
	persist: false,

	baseClass: "dijitBorderContainer",

	// _splitterClass: String
	// 		Optional hook to override the default Splitter widget used by BorderContainer
	_splitterClass: "dijit.layout._Splitter",

	postMixInProperties: function(){
		// change class name to indicate that BorderContainer is being used purely for
		// layout (like LayoutContainer) rather than for pretty formatting.
		if(!this.gutters){
			this.baseClass += "NoGutter";
		}
		this.inherited(arguments);
	},

	startup: function(){
		if(this._started){ return; }
		dojo.forEach(this.getChildren(), this._setupChild, this);
		this.inherited(arguments);
	},

	_setupChild: function(/*dijit._Widget*/ child){
		// Override _LayoutWidget._setupChild().

		var region = child.region;
		if(region){
			this.inherited(arguments);

			dojo.addClass(child.domNode, this.baseClass+"Pane");

			var ltr = this.isLeftToRight();
			if(region == "leading"){ region = ltr ? "left" : "right"; }
			if(region == "trailing"){ region = ltr ? "right" : "left"; }

			// Create draggable splitter for resizing pane,
			// or alternately if splitter=false but BorderContainer.gutters=true then
			// insert dummy div just for spacing
			if(region != "center" && (child.splitter || this.gutters) && !child._splitterWidget){
				var _Splitter = dojo.getObject(child.splitter ? this._splitterClass : "dijit.layout._Gutter");
				var splitter = new _Splitter({
					id: child.id + "_splitter",
					container: this,
					child: child,
					region: region,
					live: this.liveSplitters
				});
				splitter.isSplitter = true;
				child._splitterWidget = splitter;

				dojo.place(splitter.domNode, child.domNode, "after");

				// Splitters aren't added as Contained children, so we need to call startup explicitly
				splitter.startup();
			}
			child.region = region;	// TODO: technically wrong since it overwrites "trailing" with "left" etc.
		}
	},

	layout: function(){
		// Implement _LayoutWidget.layout() virtual method.
		this._layoutChildren();
	},

	addChild: function(/*dijit._Widget*/ child, /*Integer?*/ insertIndex){
		// Override _LayoutWidget.addChild().
		this.inherited(arguments);
		if(this._started){
			this.layout(); //OPT
		}
	},

	removeChild: function(/*dijit._Widget*/ child){
		// Override _LayoutWidget.removeChild().

		var region = child.region;
		var splitter = child._splitterWidget
		if(splitter){
			splitter.destroy();
			delete child._splitterWidget;
		}
		this.inherited(arguments);
		
		if(this._started){
			this._layoutChildren();
		}
		// Clean up whatever style changes we made to the child pane.
		// Unclear how height and width should be handled.
		dojo.removeClass(child.domNode, this.baseClass+"Pane");
		dojo.style(child.domNode, {
			top: "auto",
			bottom: "auto",
			left: "auto",
			right: "auto",
			position: "static"
		});
		dojo.style(child.domNode, region == "top" || region == "bottom" ? "width" : "height", "auto");
	},

	getChildren: function(){
		// Override _LayoutWidget.getChildren() to only return real children, not the splitters.
		return dojo.filter(this.inherited(arguments), function(widget){
			return !widget.isSplitter;
		});
	},

	// TODO: remove in 2.0
	getSplitter: function(/*String*/region){
		// summary:
		//		Returns the widget responsible for rendering the splitter associated with region
		// tags:
		//		deprecated
		return dojo.filter(this.getChildren(), function(child){
			return child.region == region;
		})[0]._splitterWidget;
	},

	resize: function(newSize, currentSize){
		// Overrides _LayoutWidget.resize().

		// resetting potential padding to 0px to provide support for 100% width/height + padding
		// TODO: this hack doesn't respect the box model and is a temporary fix
		if(!this.cs || !this.pe){
			var node = this.domNode;
			this.cs = dojo.getComputedStyle(node);
			this.pe = dojo._getPadExtents(node, this.cs);
			this.pe.r = dojo._toPixelValue(node, this.cs.paddingRight);
			this.pe.b = dojo._toPixelValue(node, this.cs.paddingBottom);

			dojo.style(node, "padding", "0px");
		}

		this.inherited(arguments);
	},

	_layoutChildren: function(/*String?*/ changedChildId, /*Number?*/ changedChildSize){
		// summary:
		//		This is the main routine for setting size/position of each child.
		// description:
		//		With no arguments, measures the height of top/bottom panes, the width
		//		of left/right panes, and then sizes all panes accordingly.
		//
		//		With changedRegion specified (as "left", "top", "bottom", or "right"),
		//		it changes that region's width/height to changedRegionSize and
		//		then resizes other regions that were affected.
		// changedChildId:
		//		Id of the child which should be resized because splitter was dragged.
		// changedChildSize:
		//		The new width/height (in pixels) to make specified child

		if(!this._borderBox || !this._borderBox.h){
			// We are currently hidden, or we haven't been sized by our parent yet.
			// Abort.   Someone will resize us later.
			return;
		}

		// Generate list of wrappers of my children in the order that I want layoutChildren()
		// to process them (i.e. from the outside to the inside)
		var wrappers = dojo.map(this.getChildren(), function(child, idx){
			return {
				pane: child,
				weight: [
					child.region == "center" ? Infinity : 0,
					child.layoutPriority,
					(this.design == "sidebar" ? 1 : -1) * (/top|bottom/.test(child.region) ? 1 : -1),
					idx
				]
			};
		}, this);
		wrappers.sort(function(a, b){
			var aw = a.weight, bw = b.weight;
			for(var i=0; i<aw.length; i++){
				if(aw[i] != bw[i]){
					return aw[i] - bw[i];
				}
			}
			return 0;
		});

		// Make new list, combining the externally specified children with splitters and gutters
		var childrenAndSplitters = [];
		dojo.forEach(wrappers, function(wrapper){
			var pane = wrapper.pane;
			childrenAndSplitters.push(pane);
			if(pane._splitterWidget){
				childrenAndSplitters.push(pane._splitterWidget);
			}
		});

		// Compute the box in which to lay out my children
		var dim = {
			l: this.pe.l,
			t: this.pe.t,
			w: this._borderBox.w - this.pe.w,
			h: this._borderBox.h - this.pe.h
		};

		// Layout the children, possibly changing size due to a splitter drag
		dijit.layout.layoutChildren(this.domNode, dim, childrenAndSplitters,
			changedChildId, changedChildSize);
	},

	destroyRecursive: function(){
		// Destroy splitters first, while getChildren() still works
		dojo.forEach(this.getChildren(), function(child){
			var splitter = child._splitterWidget;
			if(splitter){
				splitter.destroy();
			}
			delete child._splitterWidget;
		});

		// Then destroy the real children, and myself
		this.inherited(arguments);
	}
});

// This argument can be specified for the children of a BorderContainer.
// Since any widget can be specified as a LayoutContainer child, mix it
// into the base widget class.  (This is a hack, but it's effective.)
dojo.extend(dijit._Widget, {
	// region: [const] String
	//		Parameter for children of `dijit.layout.BorderContainer`.
	//		Values: "top", "bottom", "leading", "trailing", "left", "right", "center".
	//		See the `dijit.layout.BorderContainer` description for details.
	region: '',

	// layoutPriority: [const] Number
	//		Parameter for children of `dijit.layout.BorderContainer`.
	//		Children with a higher layoutPriority will be placed closer to the BorderContainer center,
	//		between children with a lower layoutPriority.
	layoutPriority: 0,

	// splitter: [const] Boolean
	//		Parameter for child of `dijit.layout.BorderContainer` where region != "center".
	//		If true, enables user to resize the widget by putting a draggable splitter between
	//		this widget and the region=center widget.
	splitter: false,

	// minSize: [const] Number
	//		Parameter for children of `dijit.layout.BorderContainer`.
	//		Specifies a minimum size (in pixels) for this widget when resized by a splitter.
	minSize: 0,

	// maxSize: [const] Number
	//		Parameter for children of `dijit.layout.BorderContainer`.
	//		Specifies a maximum size (in pixels) for this widget when resized by a splitter.
	maxSize: Infinity
});

dojo.declare("dijit.layout._Splitter", [ dijit._Widget, dijit._Templated ],
{
	// summary:
	//		A draggable spacer between two items in a `dijit.layout.BorderContainer`.
	// description:
	//		This is instantiated by `dijit.layout.BorderContainer`.  Users should not
	//		create it directly.
	// tags:
	//		private

/*=====
 	// container: [const] dijit.layout.BorderContainer
 	//		Pointer to the parent BorderContainer
	container: null,

	// child: [const] dijit.layout._LayoutWidget
	//		Pointer to the pane associated with this splitter
	child: null,

	// region: [const] String
	//		Region of pane associated with this splitter.
	//		"top", "bottom", "left", "right".
	region: null,
=====*/

	// live: [const] Boolean
	//		If true, the child's size changes and the child widget is redrawn as you drag the splitter;
	//		otherwise, the size doesn't change until you drop the splitter (by mouse-up)
	live: true,

	templateString: '<div class="dijitSplitter" dojoAttachEvent="onkeypress:_onKeyPress,onmousedown:_startDrag,onmouseenter:_onMouse,onmouseleave:_onMouse" tabIndex="0" role="separator"><div class="dijitSplitterThumb"></div></div>',

	postMixInProperties: function(){
		this.inherited(arguments);

		this.horizontal = /top|bottom/.test(this.region);
		this._factor = /top|left/.test(this.region) ? 1 : -1;
		this._cookieName = this.container.id + "_" + this.region;
	},

	buildRendering: function(){
		this.inherited(arguments);

		dojo.addClass(this.domNode, "dijitSplitter" + (this.horizontal ? "H" : "V"));

		if(this.container.persist){
			// restore old size
			var persistSize = dojo.cookie(this._cookieName);
			if(persistSize){
				this.child.domNode.style[this.horizontal ? "height" : "width"] = persistSize;
			}
		}
	},

	_computeMaxSize: function(){
		// summary:
		//		Return the maximum size that my corresponding pane can be set to

		var dim = this.horizontal ? 'h' : 'w',
			childSize = dojo.marginBox(this.child.domNode)[dim],
			center = dojo.filter(this.container.getChildren(), function(child){ return child.region == "center";})[0],
			spaceAvailable = dojo.marginBox(center.domNode)[dim];	// can expand until center is crushed to 0

		return Math.min(this.child.maxSize, childSize + spaceAvailable);
	},

	_startDrag: function(e){
		if(!this.cover){
			this.cover = dojo.doc.createElement('div');
			dojo.addClass(this.cover, "dijitSplitterCover");
			dojo.place(this.cover, this.child.domNode, "after");
		}
		dojo.addClass(this.cover, "dijitSplitterCoverActive");

		// Safeguard in case the stop event was missed.  Shouldn't be necessary if we always get the mouse up.
		if(this.fake){ dojo.destroy(this.fake); }
		if(!(this._resize = this.live)){ //TODO: disable live for IE6?
			// create fake splitter to display at old position while we drag
			(this.fake = this.domNode.cloneNode(true)).removeAttribute("id");
			dojo.addClass(this.domNode, "dijitSplitterShadow");
			dojo.place(this.fake, this.domNode, "after");
		}
		dojo.addClass(this.domNode, "dijitSplitterActive dijitSplitter" + (this.horizontal ? "H" : "V") + "Active");
		if(this.fake){
			dojo.removeClass(this.fake, "dijitSplitterHover dijitSplitter" + (this.horizontal ? "H" : "V") + "Hover");
		}

		//Performance: load data info local vars for onmousevent function closure
		var factor = this._factor,
			isHorizontal = this.horizontal,
			axis = isHorizontal ? "pageY" : "pageX",
			pageStart = e[axis],
			splitterStyle = this.domNode.style,
			dim = isHorizontal ? 'h' : 'w',
			childStart = dojo.marginBox(this.child.domNode)[dim],
			max = this._computeMaxSize(),
			min = this.child.minSize || 20,
			region = this.region,
			splitterAttr = region == "top" || region == "bottom" ? "top" : "left",	// style attribute of splitter to adjust
			splitterStart = parseInt(splitterStyle[splitterAttr], 10),
			resize = this._resize,
			layoutFunc = dojo.hitch(this.container, "_layoutChildren", this.child.id),
			de = dojo.doc;

		this._handlers = (this._handlers || []).concat([
			dojo.connect(de, "onmousemove", this._drag = function(e, forceResize){
				var delta = e[axis] - pageStart,
					childSize = factor * delta + childStart,
					boundChildSize = Math.max(Math.min(childSize, max), min);

				if(resize || forceResize){
					layoutFunc(boundChildSize);
				}
				// TODO: setting style directly (usually) sets content box size, need to set margin box size
				splitterStyle[splitterAttr] = delta + splitterStart + factor*(boundChildSize - childSize) + "px";
			}),
			dojo.connect(de, "ondragstart", dojo.stopEvent),
			dojo.connect(dojo.body(), "onselectstart", dojo.stopEvent),
			dojo.connect(de, "onmouseup", this, "_stopDrag")
		]);
		dojo.stopEvent(e);
	},

	_onMouse: function(e){
		var o = (e.type == "mouseover" || e.type == "mouseenter");
		dojo.toggleClass(this.domNode, "dijitSplitterHover", o);
		dojo.toggleClass(this.domNode, "dijitSplitter" + (this.horizontal ? "H" : "V") + "Hover", o);
	},

	_stopDrag: function(e){
		try{
			if(this.cover){
				dojo.removeClass(this.cover, "dijitSplitterCoverActive");
			}
			if(this.fake){ dojo.destroy(this.fake); }
			dojo.removeClass(this.domNode, "dijitSplitterActive dijitSplitter"
				+ (this.horizontal ? "H" : "V") + "Active dijitSplitterShadow");
			this._drag(e); //TODO: redundant with onmousemove?
			this._drag(e, true);
		}finally{
			this._cleanupHandlers();
			delete this._drag;
		}

		if(this.container.persist){
			dojo.cookie(this._cookieName, this.child.domNode.style[this.horizontal ? "height" : "width"], {expires:365});
		}
	},

	_cleanupHandlers: function(){
		dojo.forEach(this._handlers, dojo.disconnect);
		delete this._handlers;
	},

	_onKeyPress: function(/*Event*/ e){
		// should we apply typematic to this?
		this._resize = true;
		var horizontal = this.horizontal;
		var tick = 1;
		var dk = dojo.keys;
		switch(e.charOrCode){
			case horizontal ? dk.UP_ARROW : dk.LEFT_ARROW:
				tick *= -1;
//				break;
			case horizontal ? dk.DOWN_ARROW : dk.RIGHT_ARROW:
				break;
			default:
//				this.inherited(arguments);
				return;
		}
		var childSize = dojo._getMarginSize(this.child.domNode)[ horizontal ? 'h' : 'w' ] + this._factor * tick;
		this.container._layoutChildren(this.child.id, Math.max(Math.min(childSize, this._computeMaxSize()), this.child.minSize));
		dojo.stopEvent(e);
	},

	destroy: function(){
		this._cleanupHandlers();
		delete this.child;
		delete this.container;
		delete this.cover;
		delete this.fake;
		this.inherited(arguments);
	}
});

dojo.declare("dijit.layout._Gutter", [dijit._Widget, dijit._Templated],
{
	// summary:
	// 		Just a spacer div to separate side pane from center pane.
	//		Basically a trick to lookup the gutter/splitter width from the theme.
	// description:
	//		Instantiated by `dijit.layout.BorderContainer`.  Users should not
	//		create directly.
	// tags:
	//		private

	templateString: '<div class="dijitGutter" role="presentation"></div>',

	postMixInProperties: function(){
		this.inherited(arguments);
		this.horizontal = /top|bottom/.test(this.region);
	},

	buildRendering: function(){
		this.inherited(arguments);
		dojo.addClass(this.domNode, "dijitGutter" + (this.horizontal ? "H" : "V"));
	}
});

}

if(!dojo._hasResource["dojo.dnd.TimedMoveable"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.dnd.TimedMoveable"] = true;
dojo.provide("dojo.dnd.TimedMoveable");



/*=====
dojo.declare("dojo.dnd.__TimedMoveableArgs", [dojo.dnd.__MoveableArgs], {
	// timeout: Number
	//		delay move by this number of ms,
	//		accumulating position changes during the timeout
	timeout: 0
});
=====*/

(function(){
	// precalculate long expressions
	var oldOnMove = dojo.dnd.Moveable.prototype.onMove;
		
	dojo.declare("dojo.dnd.TimedMoveable", dojo.dnd.Moveable, {
		// summary:
		//		A specialized version of Moveable to support an FPS throttling.
		//		This class puts an upper restriction on FPS, which may reduce
		//		the CPU load. The additional parameter "timeout" regulates
		//		the delay before actually moving the moveable object.
		
		// object attributes (for markup)
		timeout: 40,	// in ms, 40ms corresponds to 25 fps
	
		constructor: function(node, params){
			// summary:
			//		an object that makes a node moveable with a timer
			// node: Node||String
			//		a node (or node's id) to be moved
			// params: dojo.dnd.__TimedMoveableArgs
			//		object with additional parameters.
			
			// sanitize parameters
			if(!params){ params = {}; }
			if(params.timeout && typeof params.timeout == "number" && params.timeout >= 0){
				this.timeout = params.timeout;
			}
		},
	
		// markup methods
		markupFactory: function(params, node){
			return new dojo.dnd.TimedMoveable(node, params);
		},
	
		onMoveStop: function(/* dojo.dnd.Mover */ mover){
			if(mover._timer){
				// stop timer
				clearTimeout(mover._timer)
				// reflect the last received position
				oldOnMove.call(this, mover, mover._leftTop)
			}
			dojo.dnd.Moveable.prototype.onMoveStop.apply(this, arguments);
		},
		onMove: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop){
			mover._leftTop = leftTop;
			if(!mover._timer){
				var _t = this;	// to avoid using dojo.hitch()
				mover._timer = setTimeout(function(){
					// we don't have any pending requests
					mover._timer = null;
					// reflect the last received position
					oldOnMove.call(_t, mover, mover._leftTop);
				}, this.timeout);
			}
		}
	});
})();

}

if(!dojo._hasResource["dojo.fx.Toggler"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.fx.Toggler"] = true;
dojo.provide("dojo.fx.Toggler");


dojo.declare("dojo.fx.Toggler", null, {
	// summary:
	//		A simple `dojo.Animation` toggler API.
	//
	// description:
	//		class constructor for an animation toggler. It accepts a packed
	//		set of arguments about what type of animation to use in each
	//		direction, duration, etc. All available members are mixed into
	//		these animations from the constructor (for example, `node`,
	//		`showDuration`, `hideDuration`).
	//
	// example:
	//	|	var t = new dojo.fx.Toggler({
	//	|		node: "nodeId",
	//	|		showDuration: 500,
	//	|		// hideDuration will default to "200"
	//	|		showFunc: dojo.fx.wipeIn,
	//	|		// hideFunc will default to "fadeOut"
	//	|	});
	//	|	t.show(100); // delay showing for 100ms
	//	|	// ...time passes...
	//	|	t.hide();

	// node: DomNode
	//		the node to target for the showing and hiding animations
	node: null,

	// showFunc: Function
	//		The function that returns the `dojo.Animation` to show the node
	showFunc: dojo.fadeIn,

	// hideFunc: Function
	//		The function that returns the `dojo.Animation` to hide the node
	hideFunc: dojo.fadeOut,

	// showDuration:
	//		Time in milliseconds to run the show Animation
	showDuration: 200,

	// hideDuration:
	//		Time in milliseconds to run the hide Animation
	hideDuration: 200,

	// FIXME: need a policy for where the toggler should "be" the next
	// time show/hide are called if we're stopped somewhere in the
	// middle.
	// FIXME: also would be nice to specify individual showArgs/hideArgs mixed into
	// each animation individually.
	// FIXME: also would be nice to have events from the animations exposed/bridged

	/*=====
	_showArgs: null,
	_showAnim: null,

	_hideArgs: null,
	_hideAnim: null,

	_isShowing: false,
	_isHiding: false,
	=====*/

	constructor: function(args){
		var _t = this;

		dojo.mixin(_t, args);
		_t.node = args.node;
		_t._showArgs = dojo.mixin({}, args);
		_t._showArgs.node = _t.node;
		_t._showArgs.duration = _t.showDuration;
		_t.showAnim = _t.showFunc(_t._showArgs);

		_t._hideArgs = dojo.mixin({}, args);
		_t._hideArgs.node = _t.node;
		_t._hideArgs.duration = _t.hideDuration;
		_t.hideAnim = _t.hideFunc(_t._hideArgs);

		dojo.connect(_t.showAnim, "beforeBegin", dojo.hitch(_t.hideAnim, "stop", true));
		dojo.connect(_t.hideAnim, "beforeBegin", dojo.hitch(_t.showAnim, "stop", true));
	},

	show: function(delay){
		// summary: Toggle the node to showing
		// delay: Integer?
		//		Ammount of time to stall playing the show animation
		return this.showAnim.play(delay || 0);
	},

	hide: function(delay){
		// summary: Toggle the node to hidden
		// delay: Integer?
		//		Ammount of time to stall playing the hide animation
		return this.hideAnim.play(delay || 0);
	}
});

}

if(!dojo._hasResource["dojo.fx"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.fx"] = true;
dojo.provide("dojo.fx");



/*=====
dojo.fx = {
	// summary: Effects library on top of Base animations
};
=====*/
(function(){
	
	var d = dojo,
		_baseObj = {
			_fire: function(evt, args){
				if(this[evt]){
					this[evt].apply(this, args||[]);
				}
				return this;
			}
		};

	var _chain = function(animations){
		this._index = -1;
		this._animations = animations||[];
		this._current = this._onAnimateCtx = this._onEndCtx = null;

		this.duration = 0;
		d.forEach(this._animations, function(a){
			this.duration += a.duration;
			if(a.delay){ this.duration += a.delay; }
		}, this);
	};
	d.extend(_chain, {
		_onAnimate: function(){
			this._fire("onAnimate", arguments);
		},
		_onEnd: function(){
			d.disconnect(this._onAnimateCtx);
			d.disconnect(this._onEndCtx);
			this._onAnimateCtx = this._onEndCtx = null;
			if(this._index + 1 == this._animations.length){
				this._fire("onEnd");
			}else{
				// switch animations
				this._current = this._animations[++this._index];
				this._onAnimateCtx = d.connect(this._current, "onAnimate", this, "_onAnimate");
				this._onEndCtx = d.connect(this._current, "onEnd", this, "_onEnd");
				this._current.play(0, true);
			}
		},
		play: function(/*int?*/ delay, /*Boolean?*/ gotoStart){
			if(!this._current){ this._current = this._animations[this._index = 0]; }
			if(!gotoStart && this._current.status() == "playing"){ return this; }
			var beforeBegin = d.connect(this._current, "beforeBegin", this, function(){
					this._fire("beforeBegin");
				}),
				onBegin = d.connect(this._current, "onBegin", this, function(arg){
					this._fire("onBegin", arguments);
				}),
				onPlay = d.connect(this._current, "onPlay", this, function(arg){
					this._fire("onPlay", arguments);
					d.disconnect(beforeBegin);
					d.disconnect(onBegin);
					d.disconnect(onPlay);
				});
			if(this._onAnimateCtx){
				d.disconnect(this._onAnimateCtx);
			}
			this._onAnimateCtx = d.connect(this._current, "onAnimate", this, "_onAnimate");
			if(this._onEndCtx){
				d.disconnect(this._onEndCtx);
			}
			this._onEndCtx = d.connect(this._current, "onEnd", this, "_onEnd");
			this._current.play.apply(this._current, arguments);
			return this;
		},
		pause: function(){
			if(this._current){
				var e = d.connect(this._current, "onPause", this, function(arg){
						this._fire("onPause", arguments);
						d.disconnect(e);
					});
				this._current.pause();
			}
			return this;
		},
		gotoPercent: function(/*Decimal*/percent, /*Boolean?*/ andPlay){
			this.pause();
			var offset = this.duration * percent;
			this._current = null;
			d.some(this._animations, function(a){
				if(a.duration <= offset){
					this._current = a;
					return true;
				}
				offset -= a.duration;
				return false;
			});
			if(this._current){
				this._current.gotoPercent(offset / this._current.duration, andPlay);
			}
			return this;
		},
		stop: function(/*boolean?*/ gotoEnd){
			if(this._current){
				if(gotoEnd){
					for(; this._index + 1 < this._animations.length; ++this._index){
						this._animations[this._index].stop(true);
					}
					this._current = this._animations[this._index];
				}
				var e = d.connect(this._current, "onStop", this, function(arg){
						this._fire("onStop", arguments);
						d.disconnect(e);
					});
				this._current.stop();
			}
			return this;
		},
		status: function(){
			return this._current ? this._current.status() : "stopped";
		},
		destroy: function(){
			if(this._onAnimateCtx){ d.disconnect(this._onAnimateCtx); }
			if(this._onEndCtx){ d.disconnect(this._onEndCtx); }
		}
	});
	d.extend(_chain, _baseObj);

	dojo.fx.chain = function(/*dojo.Animation[]*/ animations){
		// summary:
		//		Chain a list of `dojo.Animation`s to run in sequence
		//
		// description:
		//		Return a `dojo.Animation` which will play all passed
		//		`dojo.Animation` instances in sequence, firing its own
		//		synthesized events simulating a single animation. (eg:
		//		onEnd of this animation means the end of the chain,
		//		not the individual animations within)
		//
		// example:
		//	Once `node` is faded out, fade in `otherNode`
		//	|	dojo.fx.chain([
		//	|		dojo.fadeIn({ node:node }),
		//	|		dojo.fadeOut({ node:otherNode })
		//	|	]).play();
		//
		return new _chain(animations) // dojo.Animation
	};

	var _combine = function(animations){
		this._animations = animations||[];
		this._connects = [];
		this._finished = 0;

		this.duration = 0;
		d.forEach(animations, function(a){
			var duration = a.duration;
			if(a.delay){ duration += a.delay; }
			if(this.duration < duration){ this.duration = duration; }
			this._connects.push(d.connect(a, "onEnd", this, "_onEnd"));
		}, this);
		
		this._pseudoAnimation = new d.Animation({curve: [0, 1], duration: this.duration});
		var self = this;
		d.forEach(["beforeBegin", "onBegin", "onPlay", "onAnimate", "onPause", "onStop", "onEnd"],
			function(evt){
				self._connects.push(d.connect(self._pseudoAnimation, evt,
					function(){ self._fire(evt, arguments); }
				));
			}
		);
	};
	d.extend(_combine, {
		_doAction: function(action, args){
			d.forEach(this._animations, function(a){
				a[action].apply(a, args);
			});
			return this;
		},
		_onEnd: function(){
			if(++this._finished > this._animations.length){
				this._fire("onEnd");
			}
		},
		_call: function(action, args){
			var t = this._pseudoAnimation;
			t[action].apply(t, args);
		},
		play: function(/*int?*/ delay, /*Boolean?*/ gotoStart){
			this._finished = 0;
			this._doAction("play", arguments);
			this._call("play", arguments);
			return this;
		},
		pause: function(){
			this._doAction("pause", arguments);
			this._call("pause", arguments);
			return this;
		},
		gotoPercent: function(/*Decimal*/percent, /*Boolean?*/ andPlay){
			var ms = this.duration * percent;
			d.forEach(this._animations, function(a){
				a.gotoPercent(a.duration < ms ? 1 : (ms / a.duration), andPlay);
			});
			this._call("gotoPercent", arguments);
			return this;
		},
		stop: function(/*boolean?*/ gotoEnd){
			this._doAction("stop", arguments);
			this._call("stop", arguments);
			return this;
		},
		status: function(){
			return this._pseudoAnimation.status();
		},
		destroy: function(){
			d.forEach(this._connects, dojo.disconnect);
		}
	});
	d.extend(_combine, _baseObj);

	dojo.fx.combine = function(/*dojo.Animation[]*/ animations){
		// summary:
		//		Combine a list of `dojo.Animation`s to run in parallel
		//
		// description:
		//		Combine an array of `dojo.Animation`s to run in parallel,
		//		providing a new `dojo.Animation` instance encompasing each
		//		animation, firing standard animation events.
		//
		// example:
		//	Fade out `node` while fading in `otherNode` simultaneously
		//	|	dojo.fx.combine([
		//	|		dojo.fadeIn({ node:node }),
		//	|		dojo.fadeOut({ node:otherNode })
		//	|	]).play();
		//
		// example:
		//	When the longest animation ends, execute a function:
		//	|	var anim = dojo.fx.combine([
		//	|		dojo.fadeIn({ node: n, duration:700 }),
		//	|		dojo.fadeOut({ node: otherNode, duration: 300 })
		//	|	]);
		//	|	dojo.connect(anim, "onEnd", function(){
		//	|		// overall animation is done.
		//	|	});
		//	|	anim.play(); // play the animation
		//
		return new _combine(animations); // dojo.Animation
	};

	dojo.fx.wipeIn = function(/*Object*/ args){
		// summary:
		//		Expand a node to it's natural height.
		//
		// description:
		//		Returns an animation that will expand the
		//		node defined in 'args' object from it's current height to
		//		it's natural height (with no scrollbar).
		//		Node must have no margin/border/padding.
		//
		// args: Object
		//		A hash-map of standard `dojo.Animation` constructor properties
		//		(such as easing: node: duration: and so on)
		//
		// example:
		//	|	dojo.fx.wipeIn({
		//	|		node:"someId"
		//	|	}).play()
		var node = args.node = d.byId(args.node), s = node.style, o;

		var anim = d.animateProperty(d.mixin({
			properties: {
				height: {
					// wrapped in functions so we wait till the last second to query (in case value has changed)
					start: function(){
						// start at current [computed] height, but use 1px rather than 0
						// because 0 causes IE to display the whole panel
						o = s.overflow;
						s.overflow = "hidden";
						if(s.visibility == "hidden" || s.display == "none"){
							s.height = "1px";
							s.display = "";
							s.visibility = "";
							return 1;
						}else{
							var height = d.style(node, "height");
							return Math.max(height, 1);
						}
					},
					end: function(){
						return node.scrollHeight;
					}
				}
			}
		}, args));

		d.connect(anim, "onEnd", function(){
			s.height = "auto";
			s.overflow = o;
		});

		return anim; // dojo.Animation
	};

	dojo.fx.wipeOut = function(/*Object*/ args){
		// summary:
		//		Shrink a node to nothing and hide it.
		//
		// description:
		//		Returns an animation that will shrink node defined in "args"
		//		from it's current height to 1px, and then hide it.
		//
		// args: Object
		//		A hash-map of standard `dojo.Animation` constructor properties
		//		(such as easing: node: duration: and so on)
		//
		// example:
		//	|	dojo.fx.wipeOut({ node:"someId" }).play()
		
		var node = args.node = d.byId(args.node), s = node.style, o;
		
		var anim = d.animateProperty(d.mixin({
			properties: {
				height: {
					end: 1 // 0 causes IE to display the whole panel
				}
			}
		}, args));

		d.connect(anim, "beforeBegin", function(){
			o = s.overflow;
			s.overflow = "hidden";
			s.display = "";
		});
		d.connect(anim, "onEnd", function(){
			s.overflow = o;
			s.height = "auto";
			s.display = "none";
		});

		return anim; // dojo.Animation
	};

	dojo.fx.slideTo = function(/*Object*/ args){
		// summary:
		//		Slide a node to a new top/left position
		//
		// description:
		//		Returns an animation that will slide "node"
		//		defined in args Object from its current position to
		//		the position defined by (args.left, args.top).
		//
		// args: Object
		//		A hash-map of standard `dojo.Animation` constructor properties
		//		(such as easing: node: duration: and so on). Special args members
		//		are `top` and `left`, which indicate the new position to slide to.
		//
		// example:
		//	|	dojo.fx.slideTo({ node: node, left:"40", top:"50", units:"px" }).play()

		var node = args.node = d.byId(args.node),
			top = null, left = null;

		var init = (function(n){
			return function(){
				var cs = d.getComputedStyle(n);
				var pos = cs.position;
				top = (pos == 'absolute' ? n.offsetTop : parseInt(cs.top) || 0);
				left = (pos == 'absolute' ? n.offsetLeft : parseInt(cs.left) || 0);
				if(pos != 'absolute' && pos != 'relative'){
					var ret = d.position(n, true);
					top = ret.y;
					left = ret.x;
					n.style.position="absolute";
					n.style.top=top+"px";
					n.style.left=left+"px";
				}
			};
		})(node);
		init();

		var anim = d.animateProperty(d.mixin({
			properties: {
				top: args.top || 0,
				left: args.left || 0
			}
		}, args));
		d.connect(anim, "beforeBegin", anim, init);

		return anim; // dojo.Animation
	};

})();

}

if(!dojo._hasResource["dijit._CssStateMixin"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._CssStateMixin"] = true;
dojo.provide("dijit._CssStateMixin");


dojo.declare("dijit._CssStateMixin", [], {
	// summary:
	//		Mixin for widgets to set CSS classes on the widget DOM nodes depending on hover/mouse press/focus
	//		state changes, and also higher-level state changes such becoming disabled or selected.
	//
	// description:
	//		By mixing this class into your widget, and setting the this.baseClass attribute, it will automatically
	//		maintain CSS classes on the widget root node (this.domNode) depending on hover,
	//		active, focus, etc. state.   Ex: with a baseClass of dijitButton, it will apply the classes
	//		dijitButtonHovered and dijitButtonActive, as the user moves the mouse over the widget and clicks it.
	//
	//		It also sets CSS like dijitButtonDisabled based on widget semantic state.
	//
	//		By setting the cssStateNodes attribute, a widget can also track events on subnodes (like buttons
	//		within the widget).

	// cssStateNodes: [protected] Object
	//		List of sub-nodes within the widget that need CSS classes applied on mouse hover/press and focus
	//.
	//		Each entry in the hash is a an attachpoint names (like "upArrowButton") mapped to a CSS class names
	//		(like "dijitUpArrowButton"). Example:
	//	|		{
	//	|			"upArrowButton": "dijitUpArrowButton",
	//	|			"downArrowButton": "dijitDownArrowButton"
	//	|		}
	//		The above will set the CSS class dijitUpArrowButton to the this.upArrowButton DOMNode when it
	//		is hovered, etc.
	cssStateNodes: {},

	// hovering: [readonly] Boolean
	//		True if cursor is over this widget
	hovering: false,
	
	// active: [readonly] Boolean
	//		True if mouse was pressed while over this widget, and hasn't been released yet
	active: false,

	_applyAttributes: function(){
		// This code would typically be in postCreate(), but putting in _applyAttributes() for
		// performance: so the class changes happen before DOM is inserted into the document.
		// Change back to postCreate() in 2.0.  See #11635.

		this.inherited(arguments);

		// Automatically monitor mouse events (essentially :hover and :active) on this.domNode
		dojo.forEach(["onmouseenter", "onmouseleave", "onmousedown"], function(e){
			this.connect(this.domNode, e, "_cssMouseEvent");
		}, this);
		
		// Monitoring changes to disabled, readonly, etc. state, and update CSS class of root node
		dojo.forEach(["disabled", "readOnly", "checked", "selected", "focused", "state", "hovering", "active"], function(attr){
			this.watch(attr, dojo.hitch(this, "_setStateClass"));
		}, this);

		// Events on sub nodes within the widget
		for(var ap in this.cssStateNodes){
			this._trackMouseState(this[ap], this.cssStateNodes[ap]);
		}
		// Set state initially; there's probably no hover/active/focus state but widget might be
		// disabled/readonly/checked/selected so we want to set CSS classes for those conditions.
		this._setStateClass();
	},

	_cssMouseEvent: function(/*Event*/ event){
		// summary:
		//	Sets hovering and active properties depending on mouse state,
		//	which triggers _setStateClass() to set appropriate CSS classes for this.domNode.

		if(!this.disabled){
			switch(event.type){
				case "mouseenter":
				case "mouseover":	// generated on non-IE browsers even though we connected to mouseenter
					this._set("hovering", true);
					this._set("active", this._mouseDown);
					break;

				case "mouseleave":
				case "mouseout":	// generated on non-IE browsers even though we connected to mouseleave
					this._set("hovering", false);
					this._set("active", false);
					break;

				case "mousedown" :
					this._set("active", true);
					this._mouseDown = true;
					// Set a global event to handle mouseup, so it fires properly
					// even if the cursor leaves this.domNode before the mouse up event.
					// Alternately could set active=false on mouseout.
					var mouseUpConnector = this.connect(dojo.body(), "onmouseup", function(){
						this._mouseDown = false;
						this._set("active", false);
						this.disconnect(mouseUpConnector);
					});
					break;
			}
		}
	},

	_setStateClass: function(){
		// summary:
		//		Update the visual state of the widget by setting the css classes on this.domNode
		//		(or this.stateNode if defined) by combining this.baseClass with
		//		various suffixes that represent the current widget state(s).
		//
		// description:
		//		In the case where a widget has multiple
		//		states, it sets the class based on all possible
		//	 	combinations.  For example, an invalid form widget that is being hovered
		//		will be "dijitInput dijitInputInvalid dijitInputHover dijitInputInvalidHover".
		//
		//		The widget may have one or more of the following states, determined
		//		by this.state, this.checked, this.valid, and this.selected:
		//			- Error - ValidationTextBox sets this.state to "Error" if the current input value is invalid
		//			- Incomplete - ValidationTextBox sets this.state to "Incomplete" if the current input value is not finished yet
		//			- Checked - ex: a checkmark or a ToggleButton in a checked state, will have this.checked==true
		//			- Selected - ex: currently selected tab will have this.selected==true
		//
		//		In addition, it may have one or more of the following states,
		//		based on this.disabled and flags set in _onMouse (this.active, this.hovering) and from focus manager (this.focused):
		//			- Disabled	- if the widget is disabled
		//			- Active		- if the mouse (or space/enter key?) is being pressed down
		//			- Focused		- if the widget has focus
		//			- Hover		- if the mouse is over the widget

		// Compute new set of classes
		var newStateClasses = this.baseClass.split(" ");

		function multiply(modifier){
			newStateClasses = newStateClasses.concat(dojo.map(newStateClasses, function(c){ return c+modifier; }), "dijit"+modifier);
		}

		if(!this.isLeftToRight()){
			// For RTL mode we need to set an addition class like dijitTextBoxRtl.
			multiply("Rtl");
		}

		if(this.checked){
			multiply("Checked");
		}
		if(this.state){
			multiply(this.state);
		}
		if(this.selected){
			multiply("Selected");
		}

		if(this.disabled){
			multiply("Disabled");
		}else if(this.readOnly){
			multiply("ReadOnly");
		}else{
			if(this.active){
				multiply("Active");
			}else if(this.hovering){
				multiply("Hover");
			}
		}

		if(this._focused){
			multiply("Focused");
		}

		// Remove old state classes and add new ones.
		// For performance concerns we only write into domNode.className once.
		var tn = this.stateNode || this.domNode,
			classHash = {};	// set of all classes (state and otherwise) for node

		dojo.forEach(tn.className.split(" "), function(c){ classHash[c] = true; });

		if("_stateClasses" in this){
			dojo.forEach(this._stateClasses, function(c){ delete classHash[c]; });
		}

		dojo.forEach(newStateClasses, function(c){ classHash[c] = true; });

		var newClasses = [];
		for(var c in classHash){
			newClasses.push(c);
		}
		tn.className = newClasses.join(" ");

		this._stateClasses = newStateClasses;
	},

	_trackMouseState: function(/*DomNode*/ node, /*String*/ clazz){
		// summary:
		//		Track mouse/focus events on specified node and set CSS class on that node to indicate
		//		current state.   Usually not called directly, but via cssStateNodes attribute.
		// description:
		//		Given class=foo, will set the following CSS class on the node
		//			- fooActive: if the user is currently pressing down the mouse button while over the node
		//			- fooHover: if the user is hovering the mouse over the node, but not pressing down a button
		//			- fooFocus: if the node is focused
		//
		//		Note that it won't set any classes if the widget is disabled.
		// node: DomNode
		//		Should be a sub-node of the widget, not the top node (this.domNode), since the top node
		//		is handled specially and automatically just by mixing in this class.
		// clazz: String
		//		CSS class name (ex: dijitSliderUpArrow).

		// Current state of node (initially false)
		// NB: setting specifically to false because dojo.toggleClass() needs true boolean as third arg
		var hovering=false, active=false, focused=false;

		var self = this,
			cn = dojo.hitch(this, "connect", node);

		function setClass(){
			var disabled = ("disabled" in self && self.disabled) || ("readonly" in self && self.readonly);
			dojo.toggleClass(node, clazz+"Hover", hovering && !active && !disabled);
			dojo.toggleClass(node, clazz+"Active", active && !disabled);
			dojo.toggleClass(node, clazz+"Focused", focused && !disabled);
		}

		// Mouse
		cn("onmouseenter", function(){
			hovering = true;
			setClass();
		});
		cn("onmouseleave", function(){
			hovering = false;
			active = false;
			setClass();
		});
		cn("onmousedown", function(){
			active = true;
			setClass();
		});
		cn("onmouseup", function(){
			active = false;
			setClass();
		});

		// Focus
		cn("onfocus", function(){
			focused = true;
			setClass();
		});
		cn("onblur", function(){
			focused = false;
			setClass();
		});

		// Just in case widget is enabled/disabled while it has focus/hover/active state.
		// Maybe this is overkill.
		this.watch("disabled", setClass);
		this.watch("readOnly", setClass);
	}
});

}

if(!dojo._hasResource["dijit.form._FormMixin"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.form._FormMixin"] = true;
dojo.provide("dijit.form._FormMixin");



dojo.declare("dijit.form._FormMixin", null, {
	// summary:
	//		Mixin for containers of form widgets (i.e. widgets that represent a single value
	//		and can be children of a <form> node or dijit.form.Form widget)
	// description:
	//		Can extract all the form widgets
	//		values and combine them into a single javascript object, or alternately
	//		take such an object and set the values for all the contained
	//		form widgets

/*=====
	// value: Object
	//		Name/value hash for each child widget with a name and value.
	//		Child widgets without names are not part of the hash.
	//
	//		If there are multiple child widgets w/the same name, value is an array,
	//		unless they are radio buttons in which case value is a scalar (since only
	//		one radio button can be checked at a time).
	//
	//		If a child widget's name is a dot separated list (like a.b.c.d), it's a nested structure.
	//
	//		Example:
	//	|	{ name: "John Smith", interests: ["sports", "movies"] }
=====*/

	// state: [readonly] String
	//		Will be "Error" if one or more of the child widgets has an invalid value,
	//		"Incomplete" if not all of the required child widgets are filled in.  Otherwise, "",
	//		which indicates that the form is ready to be submitted.
	state: "",

	//	TODO:
	//	* Repeater
	//	* better handling for arrays.  Often form elements have names with [] like
	//	* people[3].sex (for a list of people [{name: Bill, sex: M}, ...])
	//
	//

		reset: function(){
			dojo.forEach(this.getDescendants(), function(widget){
				if(widget.reset){
					widget.reset();
				}
			});
		},

		validate: function(){
			// summary:
			//		returns if the form is valid - same as isValid - but
			//		provides a few additional (ui-specific) features.
			//		1 - it will highlight any sub-widgets that are not
			//			valid
			//		2 - it will call focus() on the first invalid
			//			sub-widget
			var didFocus = false;
			return dojo.every(dojo.map(this.getDescendants(), function(widget){
				// Need to set this so that "required" widgets get their
				// state set.
				widget._hasBeenBlurred = true;
				var valid = widget.disabled || !widget.validate || widget.validate();
				if(!valid && !didFocus){
					// Set focus of the first non-valid widget
					dojo.window.scrollIntoView(widget.containerNode || widget.domNode);
					widget.focus();
					didFocus = true;
				}
	 			return valid;
	 		}), function(item){ return item; });
		},

		setValues: function(val){
			dojo.deprecated(this.declaredClass+"::setValues() is deprecated. Use set('value', val) instead.", "", "2.0");
			return this.set('value', val);
		},
		_setValueAttr: function(/*Object*/ obj){
			// summary:
			//		Fill in form values from according to an Object (in the format returned by get('value'))

			// generate map from name --> [list of widgets with that name]
			var map = { };
			dojo.forEach(this.getDescendants(), function(widget){
				if(!widget.name){ return; }
				var entry = map[widget.name] || (map[widget.name] = [] );
				entry.push(widget);
			});

			for(var name in map){
				if(!map.hasOwnProperty(name)){
					continue;
				}
				var widgets = map[name],						// array of widgets w/this name
					values = dojo.getObject(name, false, obj);	// list of values for those widgets

				if(values === undefined){
					continue;
				}
				if(!dojo.isArray(values)){
					values = [ values ];
				}
				if(typeof widgets[0].checked == 'boolean'){
					// for checkbox/radio, values is a list of which widgets should be checked
					dojo.forEach(widgets, function(w, i){
						w.set('value', dojo.indexOf(values, w.value) != -1);
					});
				}else if(widgets[0].multiple){
					// it takes an array (e.g. multi-select)
					widgets[0].set('value', values);
				}else{
					// otherwise, values is a list of values to be assigned sequentially to each widget
					dojo.forEach(widgets, function(w, i){
						w.set('value', values[i]);
					});
				}
			}

			/***
			 * 	TODO: code for plain input boxes (this shouldn't run for inputs that are part of widgets)

			dojo.forEach(this.containerNode.elements, function(element){
				if(element.name == ''){return};	// like "continue"
				var namePath = element.name.split(".");
				var myObj=obj;
				var name=namePath[namePath.length-1];
				for(var j=1,len2=namePath.length;j<len2;++j){
					var p=namePath[j - 1];
					// repeater support block
					var nameA=p.split("[");
					if(nameA.length > 1){
						if(typeof(myObj[nameA[0]]) == "undefined"){
							myObj[nameA[0]]=[ ];
						} // if

						nameIndex=parseInt(nameA[1]);
						if(typeof(myObj[nameA[0]][nameIndex]) == "undefined"){
							myObj[nameA[0]][nameIndex] = { };
						}
						myObj=myObj[nameA[0]][nameIndex];
						continue;
					} // repeater support ends

					if(typeof(myObj[p]) == "undefined"){
						myObj=undefined;
						break;
					};
					myObj=myObj[p];
				}

				if(typeof(myObj) == "undefined"){
					return;		// like "continue"
				}
				if(typeof(myObj[name]) == "undefined" && this.ignoreNullValues){
					return;		// like "continue"
				}

				// TODO: widget values (just call set('value', ...) on the widget)

				// TODO: maybe should call dojo.getNodeProp() instead
				switch(element.type){
					case "checkbox":
						element.checked = (name in myObj) &&
							dojo.some(myObj[name], function(val){ return val == element.value; });
						break;
					case "radio":
						element.checked = (name in myObj) && myObj[name] == element.value;
						break;
					case "select-multiple":
						element.selectedIndex=-1;
						dojo.forEach(element.options, function(option){
							option.selected = dojo.some(myObj[name], function(val){ return option.value == val; });
						});
						break;
					case "select-one":
						element.selectedIndex="0";
						dojo.forEach(element.options, function(option){
							option.selected = option.value == myObj[name];
						});
						break;
					case "hidden":
					case "text":
					case "textarea":
					case "password":
						element.value = myObj[name] || "";
						break;
				}
	  		});
	  		*/
			
			// Note: no need to call this._set("value", ...) as the child updates will trigger onChange events
			// which I am monitoring.
		},

		getValues: function(){
			dojo.deprecated(this.declaredClass+"::getValues() is deprecated. Use get('value') instead.", "", "2.0");
			return this.get('value');
		},
		_getValueAttr: function(){
			// summary:
			// 		Returns Object representing form values.   See description of `value` for details.
			// description:

			// The value is updated into this.value every time a child has an onChange event,
			// so in the common case this function could just return this.value.   However,
			// that wouldn't work when:
			//
			// 1. User presses return key to submit a form.  That doesn't fire an onchange event,
			// and even if it did it would come too late due to the setTimout(..., 0) in _handleOnChange()
			//
			// 2. app for some reason calls this.get("value") while the user is typing into a
			// form field.   Not sure if that case needs to be supported or not.

			// get widget values
			var obj = { };
			dojo.forEach(this.getDescendants(), function(widget){
				var name = widget.name;
				if(!name || widget.disabled){ return; }

				// Single value widget (checkbox, radio, or plain <input> type widget)
				var value = widget.get('value');

				// Store widget's value(s) as a scalar, except for checkboxes which are automatically arrays
				if(typeof widget.checked == 'boolean'){
					if(/Radio/.test(widget.declaredClass)){
						// radio button
						if(value !== false){
							dojo.setObject(name, value, obj);
						}else{
							// give radio widgets a default of null
							value = dojo.getObject(name, false, obj);
							if(value === undefined){
								dojo.setObject(name, null, obj);
							}
						}
					}else{
						// checkbox/toggle button
						var ary=dojo.getObject(name, false, obj);
						if(!ary){
							ary=[];
							dojo.setObject(name, ary, obj);
						}
						if(value !== false){
							ary.push(value);
						}
					}
				}else{
					var prev=dojo.getObject(name, false, obj);
					if(typeof prev != "undefined"){
						if(dojo.isArray(prev)){
							prev.push(value);
						}else{
							dojo.setObject(name, [prev, value], obj);
						}
					}else{
						// unique name
						dojo.setObject(name, value, obj);
					}
				}
			});

			/***
			 * code for plain input boxes (see also dojo.formToObject, can we use that instead of this code?
			 * but it doesn't understand [] notation, presumably)
			var obj = { };
			dojo.forEach(this.containerNode.elements, function(elm){
				if(!elm.name)	{
					return;		// like "continue"
				}
				var namePath = elm.name.split(".");
				var myObj=obj;
				var name=namePath[namePath.length-1];
				for(var j=1,len2=namePath.length;j<len2;++j){
					var nameIndex = null;
					var p=namePath[j - 1];
					var nameA=p.split("[");
					if(nameA.length > 1){
						if(typeof(myObj[nameA[0]]) == "undefined"){
							myObj[nameA[0]]=[ ];
						} // if
						nameIndex=parseInt(nameA[1]);
						if(typeof(myObj[nameA[0]][nameIndex]) == "undefined"){
							myObj[nameA[0]][nameIndex] = { };
						}
					} else if(typeof(myObj[nameA[0]]) == "undefined"){
						myObj[nameA[0]] = { }
					} // if

					if(nameA.length == 1){
						myObj=myObj[nameA[0]];
					} else{
						myObj=myObj[nameA[0]][nameIndex];
					} // if
				} // for

				if((elm.type != "select-multiple" && elm.type != "checkbox" && elm.type != "radio") || (elm.type == "radio" && elm.checked)){
					if(name == name.split("[")[0]){
						myObj[name]=elm.value;
					} else{
						// can not set value when there is no name
					}
				} else if(elm.type == "checkbox" && elm.checked){
					if(typeof(myObj[name]) == 'undefined'){
						myObj[name]=[ ];
					}
					myObj[name].push(elm.value);
				} else if(elm.type == "select-multiple"){
					if(typeof(myObj[name]) == 'undefined'){
						myObj[name]=[ ];
					}
					for(var jdx=0,len3=elm.options.length; jdx<len3; ++jdx){
						if(elm.options[jdx].selected){
							myObj[name].push(elm.options[jdx].value);
						}
					}
				} // if
				name=undefined;
			}); // forEach
			***/
			return obj;
		},

	 	isValid: function(){
	 		// summary:
	 		//		Returns true if all of the widgets are valid.
			//		Deprecated, will be removed in 2.0.  Use get("state") instead.

			return this.state == "";
		},

		onValidStateChange: function(isValid){
			// summary:
			//		Stub function to connect to if you want to do something
			//		(like disable/enable a submit button) when the valid
			//		state changes on the form as a whole.
			//
			//		Deprecated.  Will be removed in 2.0.  Use watch("state", ...) instead.
		},

		_getState: function(){
			// summary:
			//		Compute what this.state should be based on state of children
			var states = dojo.map(this._descendants, function(w){
				return w.get("state") || "";
			});

			return dojo.indexOf(states, "Error") >= 0 ? "Error" :
				dojo.indexOf(states, "Incomplete") >= 0 ? "Incomplete" : "";
		},

		disconnectChildren: function(){
			// summary:
			//		Remove connections to monitor changes to children's value, error state, and disabled state,
			//		in order to update Form.value and Form.state.
			dojo.forEach(this._childConnections || [], dojo.hitch(this, "disconnect"));
			dojo.forEach(this._childWatches || [], function(w){ w.unwatch(); });
		},

		connectChildren: function(/*Boolean*/ inStartup){
			// summary:
			//		Setup connections to monitor changes to children's value, error state, and disabled state,
			//		in order to update Form.value and Form.state.
			//
			//		You can call this function directly, ex. in the event that you
			//		programmatically add a widget to the form *after* the form has been
			//		initialized.

			var _this = this;

			// Remove old connections, if any
			this.disconnectChildren();

			this._descendants = this.getDescendants();

			// (Re)set this.value and this.state.   Send watch() notifications but not on startup.
			var set = inStartup ? function(name, val){ _this[name] = val; } : dojo.hitch(this, "_set");
			set("value", this.get("value"));
			set("state", this._getState());

			// Monitor changes to error state and disabled state in order to update
			// Form.state
			var conns = (this._childConnections = []),
				watches = (this._childWatches = []);
			dojo.forEach(dojo.filter(this._descendants,
				function(item){ return item.validate; }
			),
			function(widget){
				// We are interested in whenever the widget changes validity state - or
				// whenever the disabled attribute on that widget is changed.
				dojo.forEach(["state", "disabled"], function(attr){
					watches.push(widget.watch(attr, function(attr, oldVal, newVal){
						_this.set("state", _this._getState());
					}));
				});
			});

			// And monitor calls to child.onChange so we can update this.value
			var onChange = function(){
				// summary:
				//		Called when child's value or disabled state changes
				
				// Use setTimeout() to collapse value changes in multiple children into a single
				// update to my value.   Multiple updates will occur on:
				//	1. Form.set()
				//	2. Form.reset()
				//	3. user selecting a radio button (which will de-select another radio button,
				//		 causing two onChange events)
				if(_this._onChangeDelayTimer){
					clearTimeout(_this._onChangeDelayTimer);
				}
				_this._onChangeDelayTimer = setTimeout(function(){
					delete _this._onChangeDelayTimer;
					_this._set("value", _this.get("value"));
				}, 10);
			};
			dojo.forEach(
				dojo.filter(this._descendants, function(item){ return item.onChange; } ),
				function(widget){
					// When a child widget's value changes,
					// the efficient thing to do is to just update that one attribute in this.value,
					// but that gets a little complicated when a checkbox is checked/unchecked
					// since this.value["checkboxName"] contains an array of all the checkboxes w/the same name.
					// Doing simple thing for now.
					conns.push(_this.connect(widget, "onChange", onChange));

					// Disabling/enabling a child widget should remove it's value from this.value.
					// Again, this code could be more efficient, doing simple thing for now.
					watches.push(widget.watch("disabled", onChange));
				}
			);
		},

		startup: function(){
			this.inherited(arguments);

			// Initialize value and valid/invalid state tracking.  Needs to be done in startup()
			// so that children are initialized.
			this.connectChildren(true);

			// Make state change call onValidStateChange(), will be removed in 2.0
			this.watch("state", function(attr, oldVal, newVal){ this.onValidStateChange(newVal == ""); });
		},

		destroy: function(){
			this.disconnectChildren();
			this.inherited(arguments);
		}

	});

}

if(!dojo._hasResource["dijit._DialogMixin"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._DialogMixin"] = true;
dojo.provide("dijit._DialogMixin");



dojo.declare("dijit._DialogMixin", null,
	{
		// summary:
		//		This provides functions useful to Dialog and TooltipDialog

		attributeMap: dijit._Widget.prototype.attributeMap,

		execute: function(/*Object*/ formContents){
			// summary:
			//		Callback when the user hits the submit button.
			//		Override this method to handle Dialog execution.
			// description:
			//		After the user has pressed the submit button, the Dialog
			//		first calls onExecute() to notify the container to hide the
			//		dialog and restore focus to wherever it used to be.
			//
			//		*Then* this method is called.
			// type:
			//		callback
		},

		onCancel: function(){
			// summary:
			//	    Called when user has pressed the Dialog's cancel button, to notify container.
			// description:
			//	    Developer shouldn't override or connect to this method;
			//		it's a private communication device between the TooltipDialog
			//		and the thing that opened it (ex: `dijit.form.DropDownButton`)
			// type:
			//		protected
		},

		onExecute: function(){
			// summary:
			//	    Called when user has pressed the dialog's OK button, to notify container.
			// description:
			//	    Developer shouldn't override or connect to this method;
			//		it's a private communication device between the TooltipDialog
			//		and the thing that opened it (ex: `dijit.form.DropDownButton`)
			// type:
			//		protected
		},

		_onSubmit: function(){
			// summary:
			//		Callback when user hits submit button
			// type:
			//		protected
			this.onExecute();	// notify container that we are about to execute
			this.execute(this.get('value'));
		},

		_getFocusItems: function(){
			// summary:
			//		Finds focusable items in dialog,
			//		and sets this._firstFocusItem and this._lastFocusItem
			// tags:
			//		protected

			var elems = dijit._getTabNavigable(this.containerNode);
			this._firstFocusItem = elems.lowest || elems.first || this.closeButtonNode || this.domNode;
			this._lastFocusItem = elems.last || elems.highest || this._firstFocusItem;
		}
	}
);

}

if(!dojo._hasResource["dijit.DialogUnderlay"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.DialogUnderlay"] = true;
dojo.provide("dijit.DialogUnderlay");





dojo.declare(
	"dijit.DialogUnderlay",
	[dijit._Widget, dijit._Templated],
	{
		// summary:
		//		The component that blocks the screen behind a `dijit.Dialog`
		//
		// description:
		// 		A component used to block input behind a `dijit.Dialog`. Only a single
		//		instance of this widget is created by `dijit.Dialog`, and saved as
		//		a reference to be shared between all Dialogs as `dijit._underlay`
		//
		//		The underlay itself can be styled based on and id:
		//	|	#myDialog_underlay { background-color:red; }
		//
		//		In the case of `dijit.Dialog`, this id is based on the id of the Dialog,
		//		suffixed with _underlay.

		// Template has two divs; outer div is used for fade-in/fade-out, and also to hold background iframe.
		// Inner div has opacity specified in CSS file.
		templateString: "<div class='dijitDialogUnderlayWrapper'><div class='dijitDialogUnderlay' dojoAttachPoint='node'></div></div>",

		// Parameters on creation or updatable later

		// dialogId: String
		//		Id of the dialog.... DialogUnderlay's id is based on this id
		dialogId: "",

		// class: String
		//		This class name is used on the DialogUnderlay node, in addition to dijitDialogUnderlay
		"class": "",

		attributeMap: { id: "domNode" },

		_setDialogIdAttr: function(id){
			dojo.attr(this.node, "id", id + "_underlay");
			this._set("dialogId", id);
		},

		_setClassAttr: function(clazz){
			this.node.className = "dijitDialogUnderlay " + clazz;
			this._set("class", clazz);
		},

		postCreate: function(){
			// summary:
			//		Append the underlay to the body
			dojo.body().appendChild(this.domNode);
		},

		layout: function(){
			// summary:
			//		Sets the background to the size of the viewport
			//
			// description:
			//		Sets the background to the size of the viewport (rather than the size
			//		of the document) since we need to cover the whole browser window, even
			//		if the document is only a few lines long.
			// tags:
			//		private

			var is = this.node.style,
				os = this.domNode.style;

			// hide the background temporarily, so that the background itself isn't
			// causing scrollbars to appear (might happen when user shrinks browser
			// window and then we are called to resize)
			os.display = "none";

			// then resize and show
			var viewport = dojo.window.getBox();
			os.top = viewport.t + "px";
			os.left = viewport.l + "px";
			is.width = viewport.w + "px";
			is.height = viewport.h + "px";
			os.display = "block";
		},

		show: function(){
			// summary:
			//		Show the dialog underlay
			this.domNode.style.display = "block";
			this.layout();
			this.bgIframe = new dijit.BackgroundIframe(this.domNode);
		},

		hide: function(){
			// summary:
			//		Hides the dialog underlay
			this.bgIframe.destroy();
			delete this.bgIframe;
			this.domNode.style.display = "none";
		}
	}
);

}

if(!dojo._hasResource["dijit.TooltipDialog"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.TooltipDialog"] = true;
dojo.provide("dijit.TooltipDialog");






dojo.declare(
		"dijit.TooltipDialog",
		[dijit.layout.ContentPane, dijit._Templated, dijit.form._FormMixin, dijit._DialogMixin],
		{
			// summary:
			//		Pops up a dialog that appears like a Tooltip

			// title: String
			// 		Description of tooltip dialog (required for a11y)
			title: "",

			// doLayout: [protected] Boolean
			//		Don't change this parameter from the default value.
			//		This ContentPane parameter doesn't make sense for TooltipDialog, since TooltipDialog
			//		is never a child of a layout container, nor can you specify the size of
			//		TooltipDialog in order to control the size of an inner widget.
			doLayout: false,

			// autofocus: Boolean
			// 		A Toggle to modify the default focus behavior of a Dialog, which
			// 		is to focus on the first dialog element after opening the dialog.
			//		False will disable autofocusing. Default: true
			autofocus: true,

			// baseClass: [protected] String
			//		The root className to use for the various states of this widget
			baseClass: "dijitTooltipDialog",

			// _firstFocusItem: [private] [readonly] DomNode
			//		The pointer to the first focusable node in the dialog.
			//		Set by `dijit._DialogMixin._getFocusItems`.
			_firstFocusItem: null,

			// _lastFocusItem: [private] [readonly] DomNode
			//		The pointer to which node has focus prior to our dialog.
			//		Set by `dijit._DialogMixin._getFocusItems`.
			_lastFocusItem: null,

			templateString: dojo.cache("dijit", "templates/TooltipDialog.html", "<div role=\"presentation\" tabIndex=\"-1\">\n\t<div class=\"dijitTooltipContainer\" role=\"presentation\">\n\t\t<div class =\"dijitTooltipContents dijitTooltipFocusNode\" dojoAttachPoint=\"containerNode\" role=\"dialog\"></div>\n\t</div>\n\t<div class=\"dijitTooltipConnector\" role=\"presentation\"></div>\n</div>\n"),

			_setTitleAttr: function(/*String*/ title){
				this.containerNode.title = title;
				this._set("title", title)
			},

			postCreate: function(){
				this.inherited(arguments);
				this.connect(this.containerNode, "onkeypress", "_onKey");
			},

			orient: function(/*DomNode*/ node, /*String*/ aroundCorner, /*String*/ corner){
				// summary:
				//		Configure widget to be displayed in given position relative to the button.
				//		This is called from the dijit.popup code, and should not be called
				//		directly.
				// tags:
				//		protected
				var newC = "dijitTooltipAB" + (corner.charAt(1) == 'L' ? "Left" : "Right")
						+ " dijitTooltip"
						+ (corner.charAt(0) == 'T' ? "Below" : "Above");
				
				dojo.replaceClass(this.domNode, newC, this._currentOrientClass || "");
				this._currentOrientClass = newC;
			},

			focus: function(){
				// summary:
				//		Focus on first field
				this._getFocusItems(this.containerNode);
				dijit.focus(this._firstFocusItem);
			},

			onOpen: function(/*Object*/ pos){
				// summary:
				//		Called when dialog is displayed.
				//		This is called from the dijit.popup code, and should not be called directly.
				// tags:
				//		protected

				this.orient(this.domNode,pos.aroundCorner, pos.corner);
				this._onShow(); // lazy load trigger
			},

			onClose: function(){
				// summary:
				//		Called when dialog is hidden.
				//		This is called from the dijit.popup code, and should not be called directly.
				// tags:
				//		protected
				this.onHide();
			},

			_onKey: function(/*Event*/ evt){
				// summary:
				//		Handler for keyboard events
				// description:
				//		Keep keyboard focus in dialog; close dialog on escape key
				// tags:
				//		private

				var node = evt.target;
				var dk = dojo.keys;
				if(evt.charOrCode === dk.TAB){
					this._getFocusItems(this.containerNode);
				}
				var singleFocusItem = (this._firstFocusItem == this._lastFocusItem);
				if(evt.charOrCode == dk.ESCAPE){
					// Use setTimeout to avoid crash on IE, see #10396.
					setTimeout(dojo.hitch(this, "onCancel"), 0);
					dojo.stopEvent(evt);
				}else if(node == this._firstFocusItem && evt.shiftKey && evt.charOrCode === dk.TAB){
					if(!singleFocusItem){
						dijit.focus(this._lastFocusItem); // send focus to last item in dialog
					}
					dojo.stopEvent(evt);
				}else if(node == this._lastFocusItem && evt.charOrCode === dk.TAB && !evt.shiftKey){
					if(!singleFocusItem){
						dijit.focus(this._firstFocusItem); // send focus to first item in dialog
					}
					dojo.stopEvent(evt);
				}else if(evt.charOrCode === dk.TAB){
					// we want the browser's default tab handling to move focus
					// but we don't want the tab to propagate upwards
					evt.stopPropagation();
				}
			}
		}
	);

}

if(!dojo._hasResource["dijit.Dialog"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit.Dialog"] = true;
dojo.provide("dijit.Dialog");















// dijit/TooltipDialog required for back-compat.  TODO: remove in 2.0

/*=====
dijit._underlay = function(kwArgs){
	// summary:
	//		A shared instance of a `dijit.DialogUnderlay`
	//
	// description:
	//		A shared instance of a `dijit.DialogUnderlay` created and
	//		used by `dijit.Dialog`, though never created until some Dialog
	//		or subclass thereof is shown.
};
=====*/
dojo.declare(
	"dijit._DialogBase",
	[dijit._Templated, dijit.form._FormMixin, dijit._DialogMixin, dijit._CssStateMixin],
	{
		// summary:
		//		A modal dialog Widget
		//
		// description:
		//		Pops up a modal dialog window, blocking access to the screen
		//		and also graying out the screen Dialog is extended from
		//		ContentPane so it supports all the same parameters (href, etc.)
		//
		// example:
		// |	<div dojoType="dijit.Dialog" href="test.html"></div>
		//
		// example:
		// |	var foo = new dijit.Dialog({ title: "test dialog", content: "test content" };
		// |	dojo.body().appendChild(foo.domNode);
		// |	foo.startup();

		templateString: dojo.cache("dijit", "templates/Dialog.html", "<div class=\"dijitDialog\" role=\"dialog\" aria-labelledby=\"${id}_title\">\n\t<div dojoAttachPoint=\"titleBar\" class=\"dijitDialogTitleBar\">\n\t<span dojoAttachPoint=\"titleNode\" class=\"dijitDialogTitle\" id=\"${id}_title\"></span>\n\t<span dojoAttachPoint=\"closeButtonNode\" class=\"dijitDialogCloseIcon\" dojoAttachEvent=\"ondijitclick: onCancel\" title=\"${buttonCancel}\" role=\"button\" tabIndex=\"-1\">\n\t\t<span dojoAttachPoint=\"closeText\" class=\"closeText\" title=\"${buttonCancel}\">x</span>\n\t</span>\n\t</div>\n\t\t<div dojoAttachPoint=\"containerNode\" class=\"dijitDialogPaneContent\"></div>\n</div>\n"),
		
		baseClass: "dijitDialog",
		
		cssStateNodes: {
			closeButtonNode: "dijitDialogCloseIcon"
		},

		attributeMap: dojo.delegate(dijit._Widget.prototype.attributeMap, {
			title: [
				{ node: "titleNode", type: "innerHTML" },
				{ node: "titleBar", type: "attribute" }
			],
			"aria-describedby":""
		}),

		// open: [readonly] Boolean
		//		True if Dialog is currently displayed on screen.
		open: false,

		// duration: Integer
		//		The time in milliseconds it takes the dialog to fade in and out
		duration: dijit.defaultDuration,

		// refocus: Boolean
		// 		A Toggle to modify the default focus behavior of a Dialog, which
		// 		is to re-focus the element which had focus before being opened.
		//		False will disable refocusing. Default: true
		refocus: true,

		// autofocus: Boolean
		// 		A Toggle to modify the default focus behavior of a Dialog, which
		// 		is to focus on the first dialog element after opening the dialog.
		//		False will disable autofocusing. Default: true
		autofocus: true,

		// _firstFocusItem: [private readonly] DomNode
		//		The pointer to the first focusable node in the dialog.
		//		Set by `dijit._DialogMixin._getFocusItems`.
		_firstFocusItem: null,

		// _lastFocusItem: [private readonly] DomNode
		//		The pointer to which node has focus prior to our dialog.
		//		Set by `dijit._DialogMixin._getFocusItems`.
		_lastFocusItem: null,

		// doLayout: [protected] Boolean
		//		Don't change this parameter from the default value.
		//		This ContentPane parameter doesn't make sense for Dialog, since Dialog
		//		is never a child of a layout container, nor can you specify the size of
		//		Dialog in order to control the size of an inner widget.
		doLayout: false,

		// draggable: Boolean
		//		Toggles the moveable aspect of the Dialog. If true, Dialog
		//		can be dragged by it's title. If false it will remain centered
		//		in the viewport.
		draggable: true,

		//aria-describedby: String
		//		Allows the user to add an aria-describedby attribute onto the dialog.   The value should
		//		be the id of the container element of text that describes the dialog purpose (usually
		//		the first text in the dialog).
		//		<div dojoType="dijit.Dialog" aria-describedby="intro" .....>
		//			<div id="intro">Introductory text</div>
		//			<div>rest of dialog contents</div>
		//		</div>
		"aria-describedby":"",

		postMixInProperties: function(){
			var _nlsResources = dojo.i18n.getLocalization("dijit", "common");
			dojo.mixin(this, _nlsResources);
			this.inherited(arguments);
		},

		postCreate: function(){
			dojo.style(this.domNode, {
				display: "none",
				position:"absolute"
			});
			dojo.body().appendChild(this.domNode);

			this.inherited(arguments);

			this.connect(this, "onExecute", "hide");
			this.connect(this, "onCancel", "hide");
			this._modalconnects = [];
		},

		onLoad: function(){
			// summary:
			//		Called when data has been loaded from an href.
			//		Unlike most other callbacks, this function can be connected to (via `dojo.connect`)
			//		but should *not* be overridden.
			// tags:
			//		callback

			// when href is specified we need to reposition the dialog after the data is loaded
			// and find the focusable elements
			this._position();
			if(this.autofocus && dijit._DialogLevelManager.isTop(this)){
				this._getFocusItems(this.domNode);
				dijit.focus(this._firstFocusItem);
			}
			this.inherited(arguments);
		},

		_endDrag: function(e){
			// summary:
			//		Called after dragging the Dialog. Saves the position of the dialog in the viewport.
			// tags:
			//		private
			if(e && e.node && e.node === this.domNode){
				this._relativePosition = dojo.position(e.node);
			}
		},

		_setup: function(){
			// summary:
			//		Stuff we need to do before showing the Dialog for the first
			//		time (but we defer it until right beforehand, for
			//		performance reasons).
			// tags:
			//		private

			var node = this.domNode;

			if(this.titleBar && this.draggable){
				this._moveable = (dojo.isIE == 6) ?
					new dojo.dnd.TimedMoveable(node, { handle: this.titleBar }) :	// prevent overload, see #5285
					new dojo.dnd.Moveable(node, { handle: this.titleBar, timeout: 0 });
				this._dndListener = dojo.subscribe("/dnd/move/stop",this,"_endDrag");
			}else{
				dojo.addClass(node,"dijitDialogFixed");
			}

			this.underlayAttrs = {
				dialogId: this.id,
				"class": dojo.map(this["class"].split(/\s/), function(s){ return s+"_underlay"; }).join(" ")
			};
		},

		_size: function(){
			// summary:
			// 		If necessary, shrink dialog contents so dialog fits in viewport
			// tags:
			//		private

			this._checkIfSingleChild();

			// If we resized the dialog contents earlier, reset them back to original size, so
			// that if the user later increases the viewport size, the dialog can display w/out a scrollbar.
			// Need to do this before the dojo.marginBox(this.domNode) call below.
			if(this._singleChild){
				if(this._singleChildOriginalStyle){
					this._singleChild.domNode.style.cssText = this._singleChildOriginalStyle;
				}
				delete this._singleChildOriginalStyle;
			}else{
				dojo.style(this.containerNode, {
					width:"auto",
					height:"auto"
				});
			}

			var mb = dojo._getMarginSize(this.domNode);
			var viewport = dojo.window.getBox();
			if(mb.w >= viewport.w || mb.h >= viewport.h){
				// Reduce size of dialog contents so that dialog fits in viewport

				var w = Math.min(mb.w, Math.floor(viewport.w * 0.75)),
					h = Math.min(mb.h, Math.floor(viewport.h * 0.75));

				if(this._singleChild && this._singleChild.resize){
					this._singleChildOriginalStyle = this._singleChild.domNode.style.cssText;
					this._singleChild.resize({w: w, h: h});
				}else{
					dojo.style(this.containerNode, {
						width: w + "px",
						height: h + "px",
						overflow: "auto",
						position: "relative"	// workaround IE bug moving scrollbar or dragging dialog
					});
				}
			}else{
				if(this._singleChild && this._singleChild.resize){
					this._singleChild.resize();
				}
			}
		},

		_position: function(){
			// summary:
			//		Position modal dialog in the viewport. If no relative offset
			//		in the viewport has been determined (by dragging, for instance),
			//		center the node. Otherwise, use the Dialog's stored relative offset,
			//		and position the node to top: left: values based on the viewport.
			// tags:
			//		private
			if(!dojo.hasClass(dojo.body(),"dojoMove")){
				var node = this.domNode,
					viewport = dojo.window.getBox(),
					p = this._relativePosition,
					bb = p ? null : dojo._getBorderBox(node),
					l = Math.floor(viewport.l + (p ? p.x : (viewport.w - bb.w) / 2)),
					t = Math.floor(viewport.t + (p ? p.y : (viewport.h - bb.h) / 2))
				;
				dojo.style(node,{
					left: l + "px",
					top: t + "px"
				});
			}
		},

		_onKey: function(/*Event*/ evt){
			// summary:
			//		Handles the keyboard events for accessibility reasons
			// tags:
			//		private

			if(evt.charOrCode){
				var dk = dojo.keys;
				var node = evt.target;
				if(evt.charOrCode === dk.TAB){
					this._getFocusItems(this.domNode);
				}
				var singleFocusItem = (this._firstFocusItem == this._lastFocusItem);
				// see if we are shift-tabbing from first focusable item on dialog
				if(node == this._firstFocusItem && evt.shiftKey && evt.charOrCode === dk.TAB){
					if(!singleFocusItem){
						dijit.focus(this._lastFocusItem); // send focus to last item in dialog
					}
					dojo.stopEvent(evt);
				}else if(node == this._lastFocusItem && evt.charOrCode === dk.TAB && !evt.shiftKey){
					if(!singleFocusItem){
						dijit.focus(this._firstFocusItem); // send focus to first item in dialog
					}
					dojo.stopEvent(evt);
				}else{
					// see if the key is for the dialog
					while(node){
						if(node == this.domNode || dojo.hasClass(node, "dijitPopup")){
							if(evt.charOrCode == dk.ESCAPE){
								this.onCancel();
							}else{
								return; // just let it go
							}
						}
						node = node.parentNode;
					}
					// this key is for the disabled document window
					if(evt.charOrCode !== dk.TAB){ // allow tabbing into the dialog for a11y
						dojo.stopEvent(evt);
					// opera won't tab to a div
					}else if(!dojo.isOpera){
						try{
							this._firstFocusItem.focus();
						}catch(e){ /*squelch*/ }
					}
				}
			}
		},

		show: function(){
			// summary:
			//		Display the dialog
			// returns: dojo.Deferred
			//		Deferred object that resolves when the display animation is complete

			if(this.open){ return; }

			if(!this._started){
				this.startup();
			}

			// first time we show the dialog, there's some initialization stuff to do
			if(!this._alreadyInitialized){
				this._setup();
				this._alreadyInitialized=true;
			}

			if(this._fadeOutDeferred){
				this._fadeOutDeferred.cancel();
			}

			this._modalconnects.push(dojo.connect(window, "onscroll", this, "layout"));
			this._modalconnects.push(dojo.connect(window, "onresize", this, function(){
				// IE gives spurious resize events and can actually get stuck
				// in an infinite loop if we don't ignore them
				var viewport = dojo.window.getBox();
				if(!this._oldViewport ||
						viewport.h != this._oldViewport.h ||
						viewport.w != this._oldViewport.w){
					this.layout();
					this._oldViewport = viewport;
				}
			}));
			this._modalconnects.push(dojo.connect(this.domNode, "onkeypress", this, "_onKey"));

			dojo.style(this.domNode, {
				opacity:0,
				display:""
			});

			this._set("open", true);
			this._onShow(); // lazy load trigger

			this._size();
			this._position();

			// fade-in Animation object, setup below
			var fadeIn;

			this._fadeInDeferred = new dojo.Deferred(dojo.hitch(this, function(){
				fadeIn.stop();
				delete this._fadeInDeferred;
			}));

			fadeIn = dojo.fadeIn({
				node: this.domNode,
				duration: this.duration,
				beforeBegin: dojo.hitch(this, function(){
					dijit._DialogLevelManager.show(this, this.underlayAttrs);
				}),
				onEnd: dojo.hitch(this, function(){
					if(this.autofocus && dijit._DialogLevelManager.isTop(this)){
						// find focusable items each time dialog is shown since if dialog contains a widget the
						// first focusable items can change
						this._getFocusItems(this.domNode);
						dijit.focus(this._firstFocusItem);
					}
					this._fadeInDeferred.callback(true);
					delete this._fadeInDeferred;
				})
			}).play();
			
			return this._fadeInDeferred;
		},

		hide: function(){
			// summary:
			//		Hide the dialog
			// returns: dojo.Deferred
			//		Deferred object that resolves when the hide animation is complete

			// if we haven't been initialized yet then we aren't showing and we can just return
			if(!this._alreadyInitialized){
				return;
			}
			if(this._fadeInDeferred){
				this._fadeInDeferred.cancel();
			}

			// fade-in Animation object, setup below
			var fadeOut;

			this._fadeOutDeferred = new dojo.Deferred(dojo.hitch(this, function(){
				fadeOut.stop();
				delete this._fadeOutDeferred;
			}));

			fadeOut = dojo.fadeOut({
				node: this.domNode,
				duration: this.duration,
				onEnd: dojo.hitch(this, function(){
					this.domNode.style.display = "none";
					dijit._DialogLevelManager.hide(this);
					this.onHide();
					this._fadeOutDeferred.callback(true);
					delete this._fadeOutDeferred;
				})
			 }).play();

			if(this._scrollConnected){
				this._scrollConnected = false;
			}
			dojo.forEach(this._modalconnects, dojo.disconnect);
			this._modalconnects = [];

			if(this._relativePosition){
				delete this._relativePosition;
			}
			this._set("open", false);

			return this._fadeOutDeferred;
		},

		layout: function(){
			// summary:
			//		Position the Dialog and the underlay
			// tags:
			//		private
			if(this.domNode.style.display != "none"){
				if(dijit._underlay){	// avoid race condition during show()
					dijit._underlay.layout();
				}
				this._position();
			}
		},

		destroy: function(){
			if(this._fadeInDeferred){
				this._fadeInDeferred.cancel();
			}
			if(this._fadeOutDeferred){
				this._fadeOutDeferred.cancel();
			}
			if(this._moveable){
				this._moveable.destroy();
			}
			if(this._dndListener){
				dojo.unsubscribe(this._dndListener);
			}
			dojo.forEach(this._modalconnects, dojo.disconnect);

			dijit._DialogLevelManager.hide(this);

			this.inherited(arguments);
		}
	}
);

dojo.declare(
	"dijit.Dialog",
	[dijit.layout.ContentPane, dijit._DialogBase],
	{}
);

dijit._DialogLevelManager = {
	// summary:
	//		Controls the various active "levels" on the page, starting with the
	//		stuff initially visible on the page (at z-index 0), and then having an entry for
	//		each Dialog shown.

	show: function(/*dijit._Widget*/ dialog, /*Object*/ underlayAttrs){
		// summary:
		//		Call right before fade-in animation for new dialog.
		//		Saves current focus, displays/adjusts underlay for new dialog,
		//		and sets the z-index of the dialog itself.
		//
		//		New dialog will be displayed on top of all currently displayed dialogs.
		//
		//		Caller is responsible for setting focus in new dialog after the fade-in
		//		animation completes.

		var ds = dijit._dialogStack;

		// Save current focus
		ds[ds.length-1].focus = dijit.getFocus(dialog);

		// Display the underlay, or if already displayed then adjust for this new dialog
		var underlay = dijit._underlay;
		if(!underlay || underlay._destroyed){
			underlay = dijit._underlay = new dijit.DialogUnderlay(underlayAttrs);
		}else{
			underlay.set(dialog.underlayAttrs);
		}

		// Set z-index a bit above previous dialog
		var zIndex = ds[ds.length-1].dialog ? ds[ds.length-1].zIndex + 2 : 950;
		if(ds.length == 1){	// first dialog
			underlay.show();
		}
		dojo.style(dijit._underlay.domNode, 'zIndex', zIndex - 1);

		// Dialog
		dojo.style(dialog.domNode, 'zIndex', zIndex);

		ds.push({dialog: dialog, underlayAttrs: underlayAttrs, zIndex: zIndex});
	},

	hide: function(/*dijit._Widget*/ dialog){
		// summary:
		//		Called when the specified dialog is hidden/destroyed, after the fade-out
		//		animation ends, in order to reset page focus, fix the underlay, etc.
		//		If the specified dialog isn't open then does nothing.
		//
		//		Caller is responsible for either setting display:none on the dialog domNode,
		//		or calling dijit.popup.hide(), or removing it from the page DOM.

		var ds = dijit._dialogStack;

		if(ds[ds.length-1].dialog == dialog){
			// Removing the top (or only) dialog in the stack, return focus
			// to previous dialog

			ds.pop();

			var pd = ds[ds.length-1];	// the new active dialog (or the base page itself)

			// Adjust underlay
			if(ds.length == 1){
				// Returning to original page.
				// Hide the underlay, unless the underlay widget has already been destroyed
				// because we are being called during page unload (when all widgets are destroyed)
				if(!dijit._underlay._destroyed){
					dijit._underlay.hide();
				}
			}else{
				// Popping back to previous dialog, adjust underlay
				dojo.style(dijit._underlay.domNode, 'zIndex', pd.zIndex - 1);
				dijit._underlay.set(pd.underlayAttrs);
			}

			// Adjust focus
			if(dialog.refocus){
				// If we are returning control to a previous dialog but for some reason
				// that dialog didn't have a focused field, set focus to first focusable item.
				// This situation could happen if two dialogs appeared at nearly the same time,
				// since a dialog doesn't set it's focus until the fade-in is finished.
				var focus = pd.focus;
				if(!focus || (pd.dialog && !dojo.isDescendant(focus.node, pd.dialog.domNode))){
					pd.dialog._getFocusItems(pd.dialog.domNode);
					focus = pd.dialog._firstFocusItem;
				}
	
				try{
					dijit.focus(focus);
				}catch(e){
					/* focus() will fail if user opened the dialog by clicking a non-focusable element */
				}
			}
		}else{
			// Removing a dialog out of order (#9944, #10705).
			// Don't need to mess with underlay or z-index or anything.
			var idx = dojo.indexOf(dojo.map(ds, function(elem){return elem.dialog}), dialog);
			if(idx != -1){
				ds.splice(idx, 1);
			}
		}
	},

	isTop: function(/*dijit._Widget*/ dialog){
		// summary:
		//		Returns true if specified Dialog is the top in the task
		var ds = dijit._dialogStack;
		return ds[ds.length-1].dialog == dialog;
	}
};

// Stack representing the various active "levels" on the page, starting with the
// stuff initially visible on the page (at z-index 0), and then having an entry for
// each Dialog shown.
// Each element in stack has form {
//		dialog: dialogWidget,
//		focus: returnFromGetFocus(),
//		underlayAttrs: attributes to set on underlay (when this widget is active)
// }
dijit._dialogStack = [
	{dialog: null, focus: null, underlayAttrs: null}	// entry for stuff at z-index: 0
];

}

if(!dojo._hasResource["dojox.gfx._base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.gfx._base"] = true;
dojo.provide("dojox.gfx._base");

(function(){
	var g = dojox.gfx, b = g._base;

	// candidates for dojox.style (work on VML and SVG nodes)
	g._hasClass = function(/*DomNode*/node, /*String*/classStr){
		//	summary:
		//		Returns whether or not the specified classes are a portion of the
		//		class list currently applied to the node.
		// return (new RegExp('(^|\\s+)'+classStr+'(\\s+|$)')).test(node.className)	// Boolean
		var cls = node.getAttribute("className");
		return cls && (" " + cls + " ").indexOf(" " + classStr + " ") >= 0;  // Boolean
	};
	g._addClass = function(/*DomNode*/node, /*String*/classStr){
		//	summary:
		//		Adds the specified classes to the end of the class list on the
		//		passed node.
		var cls = node.getAttribute("className") || "";
		if(!cls || (" " + cls + " ").indexOf(" " + classStr + " ") < 0){
			node.setAttribute("className", cls + (cls ? " " : "") + classStr);
		}
	};
	g._removeClass = function(/*DomNode*/node, /*String*/classStr){
		//	summary: Removes classes from node.
		var cls = node.getAttribute("className");
		if(cls){
			node.setAttribute(
				"className",
				cls.replace(new RegExp('(^|\\s+)' + classStr + '(\\s+|$)'), "$1$2")
			);
		}
	};

	// candidate for dojox.html.metrics (dynamic font resize handler is not implemented here)

	//	derived from Morris John's emResized measurer
	b._getFontMeasurements = function(){
		//	summary:
		//		Returns an object that has pixel equivilents of standard font
		//		size values.
		var heights = {
			'1em': 0, '1ex': 0, '100%': 0, '12pt': 0, '16px': 0, 'xx-small': 0,
			'x-small': 0, 'small': 0, 'medium': 0, 'large': 0, 'x-large': 0,
			'xx-large': 0
		};

		if(dojo.isIE){
			//	we do a font-size fix if and only if one isn't applied already.
			//	NOTE: If someone set the fontSize on the HTML Element, this will kill it.
			dojo.doc.documentElement.style.fontSize="100%";
		}

		//	set up the measuring node.
		var div = dojo.create("div", {style: {
				position: "absolute",
				left: "0",
				top: "-100px",
				width: "30px",
				height: "1000em",
				borderWidth: "0",
				margin: "0",
				padding: "0",
				outline: "none",
				lineHeight: "1",
				overflow: "hidden"
			}}, dojo.body());

		//	do the measurements.
		for(var p in heights){
			div.style.fontSize = p;
			heights[p] = Math.round(div.offsetHeight * 12/16) * 16/12 / 1000;
		}

		dojo.body().removeChild(div);
		return heights; 	//	object
	};

	var fontMeasurements = null;

	b._getCachedFontMeasurements = function(recalculate){
		if(recalculate || !fontMeasurements){
			fontMeasurements = b._getFontMeasurements();
		}
		return fontMeasurements;
	};

	// candidate for dojox.html.metrics

	var measuringNode = null, empty = {};
	b._getTextBox = function(	/*String*/ text,
								/*Object*/ style,
								/*String?*/ className){
		var m, s, al = arguments.length;
		if(!measuringNode){
			measuringNode = dojo.create("div", {style: {
				position: "absolute",
				top: "-10000px",
				left: "0"
			}}, dojo.body());
		}
		m = measuringNode;
		// reset styles
		m.className = "";
		s = m.style;
		s.borderWidth = "0";
		s.margin = "0";
		s.padding = "0";
		s.outline = "0";
		// set new style
		if(al > 1 && style){
			for(var i in style){
				if(i in empty){ continue; }
				s[i] = style[i];
			}
		}
		// set classes
		if(al > 2 && className){
			m.className = className;
		}
		// take a measure
		m.innerHTML = text;

		if(m["getBoundingClientRect"]){
			var bcr = m.getBoundingClientRect();
			return {l: bcr.left, t: bcr.top, w: bcr.width || (bcr.right - bcr.left), h: bcr.height || (bcr.bottom - bcr.top)};
		}else{
			return dojo.marginBox(m);
		}
	};

	// candidate for dojo.dom

	var uniqueId = 0;
	b._getUniqueId = function(){
		// summary: returns a unique string for use with any DOM element
		var id;
		do{
			id = dojo._scopeName + "Unique" + (++uniqueId);
		}while(dojo.byId(id));
		return id;
	};
})();

dojo.mixin(dojox.gfx, {
	//	summary:
	// 		defines constants, prototypes, and utility functions

	// default shapes, which are used to fill in missing parameters
	defaultPath: {
		type: "path", path: ""
	},
	defaultPolyline: {
		type: "polyline", points: []
	},
	defaultRect: {
		type: "rect", x: 0, y: 0, width: 100, height: 100, r: 0
	},
	defaultEllipse: {
		type: "ellipse", cx: 0, cy: 0, rx: 200, ry: 100
	},
	defaultCircle: {
		type: "circle", cx: 0, cy: 0, r: 100
	},
	defaultLine: {
		type: "line", x1: 0, y1: 0, x2: 100, y2: 100
	},
	defaultImage: {
		type: "image", x: 0, y: 0, width: 0, height: 0, src: ""
	},
	defaultText: {
		type: "text", x: 0, y: 0, text: "", align: "start",
		decoration: "none", rotated: false, kerning: true
	},
	defaultTextPath: {
		type: "textpath", text: "", align: "start",
		decoration: "none", rotated: false, kerning: true
	},

	// default geometric attributes
	defaultStroke: {
		type: "stroke", color: "black", style: "solid", width: 1,
		cap: "butt", join: 4
	},
	defaultLinearGradient: {
		type: "linear", x1: 0, y1: 0, x2: 100, y2: 100,
		colors: [
			{ offset: 0, color: "black" }, { offset: 1, color: "white" }
		]
	},
	defaultRadialGradient: {
		type: "radial", cx: 0, cy: 0, r: 100,
		colors: [
			{ offset: 0, color: "black" }, { offset: 1, color: "white" }
		]
	},
	defaultPattern: {
		type: "pattern", x: 0, y: 0, width: 0, height: 0, src: ""
	},
	defaultFont: {
		type: "font", style: "normal", variant: "normal",
		weight: "normal", size: "10pt", family: "serif"
	},

	getDefault: (function(){
		var typeCtorCache = {};
		// a memoized delegate()
		return function(/*String*/ type){
			var t = typeCtorCache[type];
			if(t){
				return new t();
			}
			t = typeCtorCache[type] = new Function;
			t.prototype = dojox.gfx[ "default" + type ];
			return new t();
		}
	})(),

	normalizeColor: function(/*Color*/ color){
		//	summary:
		// 		converts any legal color representation to normalized
		// 		dojo.Color object
		return (color instanceof dojo.Color) ? color : new dojo.Color(color); // dojo.Color
	},
	normalizeParameters: function(existed, update){
		//	summary:
		// 		updates an existing object with properties from an "update"
		// 		object
		//	existed: Object
		//		the "target" object to be updated
		//	update:  Object
		//		the "update" object, whose properties will be used to update
		//		the existed object
		if(update){
			var empty = {};
			for(var x in existed){
				if(x in update && !(x in empty)){
					existed[x] = update[x];
				}
			}
		}
		return existed;	// Object
	},
	makeParameters: function(defaults, update){
		//	summary:
		// 		copies the original object, and all copied properties from the
		// 		"update" object
		//	defaults: Object
		//		the object to be cloned before updating
		//	update:   Object
		//		the object, which properties are to be cloned during updating
		if(!update){
			// return dojo.clone(defaults);
			return dojo.delegate(defaults);
		}
		var result = {};
		for(var i in defaults){
			if(!(i in result)){
				result[i] = dojo.clone((i in update) ? update[i] : defaults[i]);
			}
		}
		return result; // Object
	},
	formatNumber: function(x, addSpace){
		// summary: converts a number to a string using a fixed notation
		// x:			Number:		number to be converted
		// addSpace:	Boolean?:	if it is true, add a space before a positive number
		var val = x.toString();
		if(val.indexOf("e") >= 0){
			val = x.toFixed(4);
		}else{
			var point = val.indexOf(".");
			if(point >= 0 && val.length - point > 5){
				val = x.toFixed(4);
			}
		}
		if(x < 0){
			return val; // String
		}
		return addSpace ? " " + val : val; // String
	},
	// font operations
	makeFontString: function(font){
		// summary: converts a font object to a CSS font string
		// font:	Object:	font object (see dojox.gfx.defaultFont)
		return font.style + " " + font.variant + " " + font.weight + " " + font.size + " " + font.family; // Object
	},
	splitFontString: function(str){
		// summary:
		//		converts a CSS font string to a font object
		// description:
		//		Converts a CSS font string to a gfx font object. The CSS font
		//		string components should follow the W3C specified order
		//		(see http://www.w3.org/TR/CSS2/fonts.html#font-shorthand):
		//		style, variant, weight, size, optional line height (will be
		//		ignored), and family.
		// str: String
		//		a CSS font string
		var font = dojox.gfx.getDefault("Font");
		var t = str.split(/\s+/);
		do{
			if(t.length < 5){ break; }
			font.style   = t[0];
			font.variant = t[1];
			font.weight  = t[2];
			var i = t[3].indexOf("/");
			font.size = i < 0 ? t[3] : t[3].substring(0, i);
			var j = 4;
			if(i < 0){
				if(t[4] == "/"){
					j = 6;
				}else if(t[4].charAt(0) == "/"){
					j = 5;
				}
			}
			if(j < t.length){
				font.family = t.slice(j).join(" ");
			}
		}while(false);
		return font;	// Object
	},
	// length operations
	cm_in_pt: 72 / 2.54,	// Number: points per centimeter
	mm_in_pt: 7.2 / 2.54,	// Number: points per millimeter
	px_in_pt: function(){
		// summary: returns a number of pixels per point
		return dojox.gfx._base._getCachedFontMeasurements()["12pt"] / 12;	// Number
	},
	pt2px: function(len){
		// summary: converts points to pixels
		// len: Number: a value in points
		return len * dojox.gfx.px_in_pt();	// Number
	},
	px2pt: function(len){
		// summary: converts pixels to points
		// len: Number: a value in pixels
		return len / dojox.gfx.px_in_pt();	// Number
	},
	normalizedLength: function(len) {
		// summary: converts any length value to pixels
		// len: String: a length, e.g., "12pc"
		if(len.length == 0) return 0;
		if(len.length > 2){
			var px_in_pt = dojox.gfx.px_in_pt();
			var val = parseFloat(len);
			switch(len.slice(-2)){
				case "px": return val;
				case "pt": return val * px_in_pt;
				case "in": return val * 72 * px_in_pt;
				case "pc": return val * 12 * px_in_pt;
				case "mm": return val * dojox.gfx.mm_in_pt * px_in_pt;
				case "cm": return val * dojox.gfx.cm_in_pt * px_in_pt;
			}
		}
		return parseFloat(len);	// Number
	},

	// a constant used to split a SVG/VML path into primitive components
	pathVmlRegExp: /([A-Za-z]+)|(\d+(\.\d+)?)|(\.\d+)|(-\d+(\.\d+)?)|(-\.\d+)/g,
	pathSvgRegExp: /([A-Za-z])|(\d+(\.\d+)?)|(\.\d+)|(-\d+(\.\d+)?)|(-\.\d+)/g,

	equalSources: function(a, b){
		// summary: compares event sources, returns true if they are equal
		return a && b && a == b;
	},
	
	switchTo: function(renderer){
		var ns = dojox.gfx[renderer];
		if(ns){
			dojo.forEach(["Group", "Rect", "Ellipse", "Circle", "Line",
					"Polyline", "Image", "Text", "Path", "TextPath",
					"Surface", "createSurface"], function(name){
				dojox.gfx[name] = ns[name];
			});
		}
	}
});

}

if(!dojo._hasResource["dojox.gfx.shape"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.gfx.shape"] = true;
dojo.provide("dojox.gfx.shape");



dojo.declare("dojox.gfx.shape.Shape", null, {
	// summary: a Shape object, which knows how to apply
	// graphical attributes and transformations

	constructor: function(){
		// rawNode: Node: underlying node
		this.rawNode = null;

		// shape: Object: an abstract shape object
		//	(see dojox.gfx.defaultPath,
		//	dojox.gfx.defaultPolyline,
		//	dojox.gfx.defaultRect,
		//	dojox.gfx.defaultEllipse,
		//	dojox.gfx.defaultCircle,
		//	dojox.gfx.defaultLine,
		//	or dojox.gfx.defaultImage)
		this.shape = null;

		// matrix: dojox.gfx.Matrix2D: a transformation matrix
		this.matrix = null;

		// fillStyle: Object: a fill object
		//	(see dojox.gfx.defaultLinearGradient,
		//	dojox.gfx.defaultRadialGradient,
		//	dojox.gfx.defaultPattern,
		//	or dojo.Color)
		this.fillStyle = null;

		// strokeStyle: Object: a stroke object
		//	(see dojox.gfx.defaultStroke)
		this.strokeStyle = null;

		// bbox: dojox.gfx.Rectangle: a bounding box of this shape
		//	(see dojox.gfx.defaultRect)
		this.bbox = null;

		// virtual group structure

		// parent: Object: a parent or null
		//	(see dojox.gfx.Surface,
		//	dojox.gfx.shape.VirtualGroup,
		//	or dojox.gfx.Group)
		this.parent = null;

		// parentMatrix: dojox.gfx.Matrix2D
		//	a transformation matrix inherited from the parent
		this.parentMatrix = null;
	},

	// trivial getters

	getNode: function(){
		// summary: returns the current DOM Node or null
		return this.rawNode; // Node
	},
	getShape: function(){
		// summary: returns the current shape object or null
		//	(see dojox.gfx.defaultPath,
		//	dojox.gfx.defaultPolyline,
		//	dojox.gfx.defaultRect,
		//	dojox.gfx.defaultEllipse,
		//	dojox.gfx.defaultCircle,
		//	dojox.gfx.defaultLine,
		//	or dojox.gfx.defaultImage)
		return this.shape; // Object
	},
	getTransform: function(){
		// summary: returns the current transformation matrix or null
		return this.matrix;	// dojox.gfx.Matrix2D
	},
	getFill: function(){
		// summary: returns the current fill object or null
		//	(see dojox.gfx.defaultLinearGradient,
		//	dojox.gfx.defaultRadialGradient,
		//	dojox.gfx.defaultPattern,
		//	or dojo.Color)
		return this.fillStyle;	// Object
	},
	getStroke: function(){
		// summary: returns the current stroke object or null
		//	(see dojox.gfx.defaultStroke)
		return this.strokeStyle;	// Object
	},
	getParent: function(){
		// summary: returns the parent or null
		//	(see dojox.gfx.Surface,
		//	dojox.gfx.shape.VirtualGroup,
		//	or dojox.gfx.Group)
		return this.parent;	// Object
	},
	getBoundingBox: function(){
		// summary: returns the bounding box or null
		//	(see dojox.gfx.defaultRect)
		return this.bbox;	// dojox.gfx.Rectangle
	},
	getTransformedBoundingBox: function(){
		// summary: returns an array of four points or null
		//	four points represent four corners of the untransformed bounding box
		var b = this.getBoundingBox();
		if(!b){
			return null;	// null
		}
		var m = this._getRealMatrix();
			gm = dojox.gfx.matrix;
		return [	// Array
				gm.multiplyPoint(m, b.x, b.y),
				gm.multiplyPoint(m, b.x + b.width, b.y),
				gm.multiplyPoint(m, b.x + b.width, b.y + b.height),
				gm.multiplyPoint(m, b.x, b.y + b.height)
			];
	},
	getEventSource: function(){
		// summary: returns a Node, which is used as
		//	a source of events for this shape

		// COULD BE RE-IMPLEMENTED BY THE RENDERER!

		return this.rawNode;	// Node
	},

	// empty settings

	setShape: function(shape){
		// summary: sets a shape object
		//	(the default implementation simply ignores it)
		// shape: Object: a shape object
		//	(see dojox.gfx.defaultPath,
		//	dojox.gfx.defaultPolyline,
		//	dojox.gfx.defaultRect,
		//	dojox.gfx.defaultEllipse,
		//	dojox.gfx.defaultCircle,
		//	dojox.gfx.defaultLine,
		//	or dojox.gfx.defaultImage)

		// COULD BE RE-IMPLEMENTED BY THE RENDERER!

		this.shape = dojox.gfx.makeParameters(this.shape, shape);
		this.bbox = null;
		return this;	// self
	},
	setFill: function(fill){
		// summary: sets a fill object
		//	(the default implementation simply ignores it)
		// fill: Object: a fill object
		//	(see dojox.gfx.defaultLinearGradient,
		//	dojox.gfx.defaultRadialGradient,
		//	dojox.gfx.defaultPattern,
		//	or dojo.Color)

		// COULD BE RE-IMPLEMENTED BY THE RENDERER!

		if(!fill){
			// don't fill
			this.fillStyle = null;
			return this;	// self
		}
		var f = null;
		if(typeof(fill) == "object" && "type" in fill){
			// gradient or pattern
			switch(fill.type){
				case "linear":
					f = dojox.gfx.makeParameters(dojox.gfx.defaultLinearGradient, fill);
					break;
				case "radial":
					f = dojox.gfx.makeParameters(dojox.gfx.defaultRadialGradient, fill);
					break;
				case "pattern":
					f = dojox.gfx.makeParameters(dojox.gfx.defaultPattern, fill);
					break;
			}
		}else{
			// color object
			f = dojox.gfx.normalizeColor(fill);
		}
		this.fillStyle = f;
		return this;	// self
	},
	setStroke: function(stroke){
		// summary: sets a stroke object
		//	(the default implementation simply ignores it)
		// stroke: Object: a stroke object
		//	(see dojox.gfx.defaultStroke)

		// COULD BE RE-IMPLEMENTED BY THE RENDERER!

		if(!stroke){
			// don't stroke
			this.strokeStyle = null;
			return this;	// self
		}
		// normalize the stroke
		if(typeof stroke == "string" || dojo.isArray(stroke) || stroke instanceof dojo.Color){
			stroke = {color: stroke};
		}
		var s = this.strokeStyle = dojox.gfx.makeParameters(dojox.gfx.defaultStroke, stroke);
		s.color = dojox.gfx.normalizeColor(s.color);
		return this;	// self
	},
	setTransform: function(matrix){
		// summary: sets a transformation matrix
		// matrix: dojox.gfx.Matrix2D: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx.Matrix2D
		//	constructor for a list of acceptable arguments)

		// COULD BE RE-IMPLEMENTED BY THE RENDERER!

		this.matrix = dojox.gfx.matrix.clone(matrix ? dojox.gfx.matrix.normalize(matrix) : dojox.gfx.matrix.identity);
		return this._applyTransform();	// self
	},

	_applyTransform: function(){
		// summary: physically sets a matrix

		// COULD BE RE-IMPLEMENTED BY THE RENDERER!

		return this;	// self
	},

	// z-index

	moveToFront: function(){
		// summary: moves a shape to front of its parent's list of shapes
		var p = this.getParent();
		if(p){
			p._moveChildToFront(this);
			this._moveToFront();	// execute renderer-specific action
		}
		return this;	// self
	},
	moveToBack: function(){
		// summary: moves a shape to back of its parent's list of shapes
		var p = this.getParent();
		if(p){
			p._moveChildToBack(this);
			this._moveToBack();	// execute renderer-specific action
		}
		return this;
	},
	_moveToFront: function(){
		// summary: renderer-specific hook, see dojox.gfx.shape.Shape.moveToFront()

		// COULD BE RE-IMPLEMENTED BY THE RENDERER!
	},
	_moveToBack: function(){
		// summary: renderer-specific hook, see dojox.gfx.shape.Shape.moveToFront()

		// COULD BE RE-IMPLEMENTED BY THE RENDERER!
	},

	// apply left & right transformation

	applyRightTransform: function(matrix){
		// summary: multiplies the existing matrix with an argument on right side
		//	(this.matrix * matrix)
		// matrix: dojox.gfx.Matrix2D: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx.Matrix2D
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setTransform([this.matrix, matrix]) : this;	// self
	},
	applyLeftTransform: function(matrix){
		// summary: multiplies the existing matrix with an argument on left side
		//	(matrix * this.matrix)
		// matrix: dojox.gfx.Matrix2D: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx.Matrix2D
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setTransform([matrix, this.matrix]) : this;	// self
	},
	applyTransform: function(matrix){
		// summary: a shortcut for dojox.gfx.Shape.applyRightTransform
		// matrix: dojox.gfx.Matrix2D: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx.Matrix2D
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setTransform([this.matrix, matrix]) : this;	// self
	},

	// virtual group methods

	removeShape: function(silently){
		// summary: removes the shape from its parent's list of shapes
		// silently: Boolean?: if true, do not redraw a picture yet
		if(this.parent){
			this.parent.remove(this, silently);
		}
		return this;	// self
	},
	_setParent: function(parent, matrix){
		// summary: sets a parent
		// parent: Object: a parent or null
		//	(see dojox.gfx.Surface,
		//	dojox.gfx.shape.VirtualGroup,
		//	or dojox.gfx.Group)
		// matrix: dojox.gfx.Matrix2D:
		//	a 2D matrix or a matrix-like object
		this.parent = parent;
		return this._updateParentMatrix(matrix);	// self
	},
	_updateParentMatrix: function(matrix){
		// summary: updates the parent matrix with new matrix
		// matrix: dojox.gfx.Matrix2D:
		//	a 2D matrix or a matrix-like object
		this.parentMatrix = matrix ? dojox.gfx.matrix.clone(matrix) : null;
		return this._applyTransform();	// self
	},
	_getRealMatrix: function(){
		// summary: returns the cumulative ("real") transformation matrix
		//	by combining the shape's matrix with its parent's matrix
		var m = this.matrix;
		var p = this.parent;
		while(p){
			if(p.matrix){
				m = dojox.gfx.matrix.multiply(p.matrix, m);
			}
			p = p.parent;
		}
		return m;	// dojox.gfx.Matrix2D
	}
});

dojox.gfx.shape._eventsProcessing = {
	connect: function(name, object, method){
		// summary: connects a handler to an event on this shape

		// COULD BE RE-IMPLEMENTED BY THE RENDERER!

		return arguments.length > 2 ?	// Object
			dojo.connect(this.getEventSource(), name, object, method) :
			dojo.connect(this.getEventSource(), name, object);
	},
	disconnect: function(token){
		// summary: connects a handler by token from an event on this shape

		// COULD BE RE-IMPLEMENTED BY THE RENDERER!

		dojo.disconnect(token);
	}
};

dojo.extend(dojox.gfx.shape.Shape, dojox.gfx.shape._eventsProcessing);

dojox.gfx.shape.Container = {
	// summary: a container of shapes, which can be used
	//	as a foundation for renderer-specific groups, or as a way
	//	to logically group shapes (e.g, to propagate matricies)

	_init: function() {
		// children: Array: a list of children
		this.children = [];
	},

	// group management

	openBatch: function() {
		// summary: starts a new batch, subsequent new child shapes will be held in
		//	the batch instead of appending to the container directly
	},
	closeBatch: function() {
		// summary: submits the current batch, append all pending child shapes to DOM
	},
	add: function(shape){
		// summary: adds a shape to the list
		// shape: dojox.gfx.Shape: a shape
		var oldParent = shape.getParent();
		if(oldParent){
			oldParent.remove(shape, true);
		}
		this.children.push(shape);
		return shape._setParent(this, this._getRealMatrix());	// self
	},
	remove: function(shape, silently){
		// summary: removes a shape from the list
		// silently: Boolean?: if true, do not redraw a picture yet
		for(var i = 0; i < this.children.length; ++i){
			if(this.children[i] == shape){
				if(silently){
					// skip for now
				}else{
					shape.parent = null;
					shape.parentMatrix = null;
				}
				this.children.splice(i, 1);
				break;
			}
		}
		return this;	// self
	},
	clear: function(){
		// summary: removes all shapes from a group/surface
		this.children = [];
		return this;	// self
	},

	// moving child nodes

	_moveChildToFront: function(shape){
		// summary: moves a shape to front of the list of shapes
		for(var i = 0; i < this.children.length; ++i){
			if(this.children[i] == shape){
				this.children.splice(i, 1);
				this.children.push(shape);
				break;
			}
		}
		return this;	// self
	},
	_moveChildToBack: function(shape){
		// summary: moves a shape to back of the list of shapes
		for(var i = 0; i < this.children.length; ++i){
			if(this.children[i] == shape){
				this.children.splice(i, 1);
				this.children.unshift(shape);
				break;
			}
		}
		return this;	// self
	}
};

dojo.declare("dojox.gfx.shape.Surface", null, {
	// summary: a surface object to be used for drawings
	constructor: function(){
		// underlying node
		this.rawNode = null;
		// the parent node
		this._parent = null;
		// the list of DOM nodes to be deleted in the case of destruction
		this._nodes = [];
		// the list of events to be detached in the case of destruction
		this._events = [];
	},
	destroy: function(){
		// summary: destroy all relevant external resources and release all
		//	external references to make this object garbage-collectible
		dojo.forEach(this._nodes, dojo.destroy);
		this._nodes = [];
		dojo.forEach(this._events, dojo.disconnect);
		this._events = [];
		this.rawNode = null;	// recycle it in _nodes, if it needs to be recycled
		if(dojo.isIE){
			while(this._parent.lastChild){
				dojo.destroy(this._parent.lastChild);
			}
		}else{
			this._parent.innerHTML = "";
		}
		this._parent = null;
	},
	getEventSource: function(){
		// summary: returns a node, which can be used to attach event listeners
		return this.rawNode; // Node
	},
	_getRealMatrix: function(){
		// summary: always returns the identity matrix
		return null;	// dojox.gfx.Matrix2D
	},
	isLoaded: true,
	onLoad: function(/*dojox.gfx.Surface*/ surface){
		// summary: local event, fired once when the surface is created
		// asynchronously, used only when isLoaded is false, required
		// only for Silverlight.
	},
	whenLoaded: function(
		/*Object?*/ context,
		/*Function|String*/ method
	){
		var f = dojo.hitch(context, method);
		if(this.isLoaded){
			f(this);
		}else{
			var h = dojo.connect(this, "onLoad", function(surface){
				dojo.disconnect(h);
				f(surface);
			});
		}
	}
});

dojo.extend(dojox.gfx.shape.Surface, dojox.gfx.shape._eventsProcessing);

dojo.declare("dojox.gfx.Point", null, {
	// summary: a hypothetical 2D point to be used for drawings - {x, y}
	// description: This object is defined for documentation purposes.
	//	You should use the naked object instead: {x: 1, y: 2}.
});

dojo.declare("dojox.gfx.Rectangle", null, {
	// summary: a hypothetical rectangle - {x, y, width, height}
	// description: This object is defined for documentation purposes.
	//	You should use the naked object instead: {x: 1, y: 2, width: 100, height: 200}.
});

dojo.declare("dojox.gfx.shape.Rect", dojox.gfx.shape.Shape, {
	// summary: a generic rectangle
	constructor: function(rawNode){
		// rawNode: Node: a DOM Node
		this.shape = dojox.gfx.getDefault("Rect");
		this.rawNode = rawNode;
	},
	getBoundingBox: function(){
		// summary: returns the bounding box (its shape in this case)
		return this.shape;	// dojox.gfx.Rectangle
	}
});

dojo.declare("dojox.gfx.shape.Ellipse", dojox.gfx.shape.Shape, {
	// summary: a generic ellipse
	constructor: function(rawNode){
		// rawNode: Node: a DOM Node
		this.shape = dojox.gfx.getDefault("Ellipse");
		this.rawNode = rawNode;
	},
	getBoundingBox: function(){
		// summary: returns the bounding box
		if(!this.bbox){
			var shape = this.shape;
			this.bbox = {x: shape.cx - shape.rx, y: shape.cy - shape.ry,
				width: 2 * shape.rx, height: 2 * shape.ry};
		}
		return this.bbox;	// dojox.gfx.Rectangle
	}
});

dojo.declare("dojox.gfx.shape.Circle", dojox.gfx.shape.Shape, {
	// summary: a generic circle
	//	(this is a helper object, which is defined for convenience)
	constructor: function(rawNode){
		// rawNode: Node: a DOM Node
		this.shape = dojox.gfx.getDefault("Circle");
		this.rawNode = rawNode;
	},
	getBoundingBox: function(){
		// summary: returns the bounding box
		if(!this.bbox){
			var shape = this.shape;
			this.bbox = {x: shape.cx - shape.r, y: shape.cy - shape.r,
				width: 2 * shape.r, height: 2 * shape.r};
		}
		return this.bbox;	// dojox.gfx.Rectangle
	}
});

dojo.declare("dojox.gfx.shape.Line", dojox.gfx.shape.Shape, {
	// summary: a generic line
	//	(this is a helper object, which is defined for convenience)
	constructor: function(rawNode){
		// rawNode: Node: a DOM Node
		this.shape = dojox.gfx.getDefault("Line");
		this.rawNode = rawNode;
	},
	getBoundingBox: function(){
		// summary: returns the bounding box
		if(!this.bbox){
			var shape = this.shape;
			this.bbox = {
				x:		Math.min(shape.x1, shape.x2),
				y:		Math.min(shape.y1, shape.y2),
				width:	Math.abs(shape.x2 - shape.x1),
				height:	Math.abs(shape.y2 - shape.y1)
			};
		}
		return this.bbox;	// dojox.gfx.Rectangle
	}
});

dojo.declare("dojox.gfx.shape.Polyline", dojox.gfx.shape.Shape, {
	// summary: a generic polyline/polygon
	//	(this is a helper object, which is defined for convenience)
	constructor: function(rawNode){
		// rawNode: Node: a DOM Node
		this.shape = dojox.gfx.getDefault("Polyline");
		this.rawNode = rawNode;
	},
	setShape: function(points, closed){
		// summary: sets a polyline/polygon shape object
		// points: Object: a polyline/polygon shape object
		// closed: Boolean: close the polyline to make a polygon
		if(points && points instanceof Array){
			// points: Array: an array of points
			this.inherited(arguments, [{points: points}]);
			if(closed && this.shape.points.length){
				this.shape.points.push(this.shape.points[0]);
			}
		}else{
			this.inherited(arguments, [points]);
		}
		return this;	// self
	},
	_normalizePoints: function(){
		// summary: normalize points to array of {x:number, y:number}
		var p = this.shape.points, l = p && p.length;
		if(l && typeof p[0] == "number"){
			var points = [];
			for(var i = 0; i < l; i += 2){
				points.push({x: p[i], y: p[i + 1]});
			}
			this.shape.points = points;
		}
	},
	getBoundingBox: function(){
		// summary: returns the bounding box
		if(!this.bbox && this.shape.points.length){
			var p = this.shape.points;
			var l = p.length;
			var t = p[0];
			var bbox = {l: t.x, t: t.y, r: t.x, b: t.y};
			for(var i = 1; i < l; ++i){
				t = p[i];
				if(bbox.l > t.x) bbox.l = t.x;
				if(bbox.r < t.x) bbox.r = t.x;
				if(bbox.t > t.y) bbox.t = t.y;
				if(bbox.b < t.y) bbox.b = t.y;
			}
			this.bbox = {
				x:		bbox.l,
				y:		bbox.t,
				width:	bbox.r - bbox.l,
				height:	bbox.b - bbox.t
			};
		}
		return this.bbox;	// dojox.gfx.Rectangle
	}
});

dojo.declare("dojox.gfx.shape.Image", dojox.gfx.shape.Shape, {
	// summary: a generic image
	//	(this is a helper object, which is defined for convenience)
	constructor: function(rawNode){
		// rawNode: Node: a DOM Node
		this.shape = dojox.gfx.getDefault("Image");
		this.rawNode = rawNode;
	},
	getBoundingBox: function(){
		// summary: returns the bounding box (its shape in this case)
		return this.shape;	// dojox.gfx.Rectangle
	},
	setStroke: function(){
		// summary: ignore setting a stroke style
		return this;	// self
	},
	setFill: function(){
		// summary: ignore setting a fill style
		return this;	// self
	}
});

dojo.declare("dojox.gfx.shape.Text", dojox.gfx.shape.Shape, {
	// summary: a generic text
	constructor: function(rawNode){
		// rawNode: Node: a DOM Node
		this.fontStyle = null;
		this.shape = dojox.gfx.getDefault("Text");
		this.rawNode = rawNode;
	},
	getFont: function(){
		// summary: returns the current font object or null
		return this.fontStyle;	// Object
	},
	setFont: function(newFont){
		// summary: sets a font for text
		// newFont: Object: a font object (see dojox.gfx.defaultFont) or a font string
		this.fontStyle = typeof newFont == "string" ? dojox.gfx.splitFontString(newFont) :
			dojox.gfx.makeParameters(dojox.gfx.defaultFont, newFont);
		this._setFont();
		return this;	// self
	}
});

dojox.gfx.shape.Creator = {
	// summary: shape creators
	createShape: function(shape){
		// summary: creates a shape object based on its type; it is meant to be used
		//	by group-like objects
		// shape: Object: a shape descriptor object
		var gfx = dojox.gfx;
		switch(shape.type){
			case gfx.defaultPath.type:		return this.createPath(shape);
			case gfx.defaultRect.type:		return this.createRect(shape);
			case gfx.defaultCircle.type:	return this.createCircle(shape);
			case gfx.defaultEllipse.type:	return this.createEllipse(shape);
			case gfx.defaultLine.type:		return this.createLine(shape);
			case gfx.defaultPolyline.type:	return this.createPolyline(shape);
			case gfx.defaultImage.type:		return this.createImage(shape);
			case gfx.defaultText.type:		return this.createText(shape);
			case gfx.defaultTextPath.type:	return this.createTextPath(shape);
		}
		return null;
	},
	createGroup: function(){
		// summary: creates a group shape
		return this.createObject(dojox.gfx.Group);	// dojox.gfx.Group
	},
	createRect: function(rect){
		// summary: creates a rectangle shape
		// rect: Object: a path object (see dojox.gfx.defaultRect)
		return this.createObject(dojox.gfx.Rect, rect);	// dojox.gfx.Rect
	},
	createEllipse: function(ellipse){
		// summary: creates an ellipse shape
		// ellipse: Object: an ellipse object (see dojox.gfx.defaultEllipse)
		return this.createObject(dojox.gfx.Ellipse, ellipse);	// dojox.gfx.Ellipse
	},
	createCircle: function(circle){
		// summary: creates a circle shape
		// circle: Object: a circle object (see dojox.gfx.defaultCircle)
		return this.createObject(dojox.gfx.Circle, circle);	// dojox.gfx.Circle
	},
	createLine: function(line){
		// summary: creates a line shape
		// line: Object: a line object (see dojox.gfx.defaultLine)
		return this.createObject(dojox.gfx.Line, line);	// dojox.gfx.Line
	},
	createPolyline: function(points){
		// summary: creates a polyline/polygon shape
		// points: Object: a points object (see dojox.gfx.defaultPolyline)
		//	or an Array of points
		return this.createObject(dojox.gfx.Polyline, points);	// dojox.gfx.Polyline
	},
	createImage: function(image){
		// summary: creates a image shape
		// image: Object: an image object (see dojox.gfx.defaultImage)
		return this.createObject(dojox.gfx.Image, image);	// dojox.gfx.Image
	},
	createText: function(text){
		// summary: creates a text shape
		// text: Object: a text object (see dojox.gfx.defaultText)
		return this.createObject(dojox.gfx.Text, text);	// dojox.gfx.Text
	},
	createPath: function(path){
		// summary: creates a path shape
		// path: Object: a path object (see dojox.gfx.defaultPath)
		return this.createObject(dojox.gfx.Path, path);	// dojox.gfx.Path
	},
	createTextPath: function(text){
		// summary: creates a text shape
		// text: Object: a textpath object (see dojox.gfx.defaultTextPath)
		return this.createObject(dojox.gfx.TextPath, {}).setText(text);	// dojox.gfx.TextPath
	},
	createObject: function(shapeType, rawShape){
		// summary: creates an instance of the passed shapeType class
		// shapeType: Function: a class constructor to create an instance of
		// rawShape: Object: properties to be passed in to the classes "setShape" method

		// SHOULD BE RE-IMPLEMENTED BY THE RENDERER!

		return null;	// dojox.gfx.Shape
	}
};

}

if(!dojo._hasResource["dojox.gfx.matrix"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.gfx.matrix"] = true;
dojo.provide("dojox.gfx.matrix");

(function(){
	var m = dojox.gfx.matrix;

	// candidates for dojox.math:
	var _degToRadCache = {};
	m._degToRad = function(degree){
		return _degToRadCache[degree] || (_degToRadCache[degree] = (Math.PI * degree / 180));
	};
	m._radToDeg = function(radian){ return radian / Math.PI * 180; };

	m.Matrix2D = function(arg){
		// summary: a 2D matrix object
		// description: Normalizes a 2D matrix-like object. If arrays is passed,
		//		all objects of the array are normalized and multiplied sequentially.
		// arg: Object
		//		a 2D matrix-like object, a number, or an array of such objects
		if(arg){
			if(typeof arg == "number"){
				this.xx = this.yy = arg;
			}else if(arg instanceof Array){
				if(arg.length > 0){
					var matrix = m.normalize(arg[0]);
					// combine matrices
					for(var i = 1; i < arg.length; ++i){
						var l = matrix, r = dojox.gfx.matrix.normalize(arg[i]);
						matrix = new m.Matrix2D();
						matrix.xx = l.xx * r.xx + l.xy * r.yx;
						matrix.xy = l.xx * r.xy + l.xy * r.yy;
						matrix.yx = l.yx * r.xx + l.yy * r.yx;
						matrix.yy = l.yx * r.xy + l.yy * r.yy;
						matrix.dx = l.xx * r.dx + l.xy * r.dy + l.dx;
						matrix.dy = l.yx * r.dx + l.yy * r.dy + l.dy;
					}
					dojo.mixin(this, matrix);
				}
			}else{
				dojo.mixin(this, arg);
			}
		}
	};

	// the default (identity) matrix, which is used to fill in missing values
	dojo.extend(m.Matrix2D, {xx: 1, xy: 0, yx: 0, yy: 1, dx: 0, dy: 0});

	dojo.mixin(m, {
		// summary: class constants, and methods of dojox.gfx.matrix

		// matrix constants

		// identity: dojox.gfx.matrix.Matrix2D
		//		an identity matrix constant: identity * (x, y) == (x, y)
		identity: new m.Matrix2D(),

		// flipX: dojox.gfx.matrix.Matrix2D
		//		a matrix, which reflects points at x = 0 line: flipX * (x, y) == (-x, y)
		flipX:    new m.Matrix2D({xx: -1}),

		// flipY: dojox.gfx.matrix.Matrix2D
		//		a matrix, which reflects points at y = 0 line: flipY * (x, y) == (x, -y)
		flipY:    new m.Matrix2D({yy: -1}),

		// flipXY: dojox.gfx.matrix.Matrix2D
		//		a matrix, which reflects points at the origin of coordinates: flipXY * (x, y) == (-x, -y)
		flipXY:   new m.Matrix2D({xx: -1, yy: -1}),

		// matrix creators

		translate: function(a, b){
			// summary: forms a translation matrix
			// description: The resulting matrix is used to translate (move) points by specified offsets.
			// a: Number: an x coordinate value
			// b: Number: a y coordinate value
			if(arguments.length > 1){
				return new m.Matrix2D({dx: a, dy: b}); // dojox.gfx.matrix.Matrix2D
			}
			// branch
			// a: dojox.gfx.Point: a point-like object, which specifies offsets for both dimensions
			// b: null
			return new m.Matrix2D({dx: a.x, dy: a.y}); // dojox.gfx.matrix.Matrix2D
		},
		scale: function(a, b){
			// summary: forms a scaling matrix
			// description: The resulting matrix is used to scale (magnify) points by specified offsets.
			// a: Number: a scaling factor used for the x coordinate
			// b: Number: a scaling factor used for the y coordinate
			if(arguments.length > 1){
				return new m.Matrix2D({xx: a, yy: b}); // dojox.gfx.matrix.Matrix2D
			}
			if(typeof a == "number"){
				// branch
				// a: Number: a uniform scaling factor used for the both coordinates
				// b: null
				return new m.Matrix2D({xx: a, yy: a}); // dojox.gfx.matrix.Matrix2D
			}
			// branch
			// a: dojox.gfx.Point: a point-like object, which specifies scale factors for both dimensions
			// b: null
			return new m.Matrix2D({xx: a.x, yy: a.y}); // dojox.gfx.matrix.Matrix2D
		},
		rotate: function(angle){
			// summary: forms a rotating matrix
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			return new m.Matrix2D({xx: c, xy: -s, yx: s, yy: c}); // dojox.gfx.matrix.Matrix2D
		},
		rotateg: function(degree){
			// summary: forms a rotating matrix
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx.matrix.rotate() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return m.rotate(m._degToRad(degree)); // dojox.gfx.matrix.Matrix2D
		},
		skewX: function(angle) {
			// summary: forms an x skewing matrix
			// description: The resulting matrix is used to skew points in the x dimension
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an skewing angle in radians
			return new m.Matrix2D({xy: Math.tan(angle)}); // dojox.gfx.matrix.Matrix2D
		},
		skewXg: function(degree){
			// summary: forms an x skewing matrix
			// description: The resulting matrix is used to skew points in the x dimension
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx.matrix.skewX() for comparison.
			// degree: Number: an skewing angle in degrees
			return m.skewX(m._degToRad(degree)); // dojox.gfx.matrix.Matrix2D
		},
		skewY: function(angle){
			// summary: forms a y skewing matrix
			// description: The resulting matrix is used to skew points in the y dimension
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an skewing angle in radians
			return new m.Matrix2D({yx: Math.tan(angle)}); // dojox.gfx.matrix.Matrix2D
		},
		skewYg: function(degree){
			// summary: forms a y skewing matrix
			// description: The resulting matrix is used to skew points in the y dimension
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx.matrix.skewY() for comparison.
			// degree: Number: an skewing angle in degrees
			return m.skewY(m._degToRad(degree)); // dojox.gfx.matrix.Matrix2D
		},
		reflect: function(a, b){
			// summary: forms a reflection matrix
			// description: The resulting matrix is used to reflect points around a vector,
			//		which goes through the origin.
			// a: dojox.gfx.Point: a point-like object, which specifies a vector of reflection
			// b: null
			if(arguments.length == 1){
				b = a.y;
				a = a.x;
			}
			// branch
			// a: Number: an x coordinate value
			// b: Number: a y coordinate value

			// make a unit vector
			var a2 = a * a, b2 = b * b, n2 = a2 + b2, xy = 2 * a * b / n2;
			return new m.Matrix2D({xx: 2 * a2 / n2 - 1, xy: xy, yx: xy, yy: 2 * b2 / n2 - 1}); // dojox.gfx.matrix.Matrix2D
		},
		project: function(a, b){
			// summary: forms an orthogonal projection matrix
			// description: The resulting matrix is used to project points orthogonally on a vector,
			//		which goes through the origin.
			// a: dojox.gfx.Point: a point-like object, which specifies a vector of projection
			// b: null
			if(arguments.length == 1){
				b = a.y;
				a = a.x;
			}
			// branch
			// a: Number: an x coordinate value
			// b: Number: a y coordinate value

			// make a unit vector
			var a2 = a * a, b2 = b * b, n2 = a2 + b2, xy = a * b / n2;
			return new m.Matrix2D({xx: a2 / n2, xy: xy, yx: xy, yy: b2 / n2}); // dojox.gfx.matrix.Matrix2D
		},

		// ensure matrix 2D conformance
		normalize: function(matrix){
			// summary: converts an object to a matrix, if necessary
			// description: Converts any 2D matrix-like object or an array of
			//		such objects to a valid dojox.gfx.matrix.Matrix2D object.
			// matrix: Object: an object, which is converted to a matrix, if necessary
			return (matrix instanceof m.Matrix2D) ? matrix : new m.Matrix2D(matrix); // dojox.gfx.matrix.Matrix2D
		},

		// common operations

		clone: function(matrix){
			// summary: creates a copy of a 2D matrix
			// matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix-like object to be cloned
			var obj = new m.Matrix2D();
			for(var i in matrix){
				if(typeof(matrix[i]) == "number" && typeof(obj[i]) == "number" && obj[i] != matrix[i]) obj[i] = matrix[i];
			}
			return obj; // dojox.gfx.matrix.Matrix2D
		},
		invert: function(matrix){
			// summary: inverts a 2D matrix
			// matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix-like object to be inverted
			var M = m.normalize(matrix),
				D = M.xx * M.yy - M.xy * M.yx,
				M = new m.Matrix2D({
					xx: M.yy/D, xy: -M.xy/D,
					yx: -M.yx/D, yy: M.xx/D,
					dx: (M.xy * M.dy - M.yy * M.dx) / D,
					dy: (M.yx * M.dx - M.xx * M.dy) / D
				});
			return M; // dojox.gfx.matrix.Matrix2D
		},
		_multiplyPoint: function(matrix, x, y){
			// summary: applies a matrix to a point
			// matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix object to be applied
			// x: Number: an x coordinate of a point
			// y: Number: a y coordinate of a point
			return {x: matrix.xx * x + matrix.xy * y + matrix.dx, y: matrix.yx * x + matrix.yy * y + matrix.dy}; // dojox.gfx.Point
		},
		multiplyPoint: function(matrix, /* Number||Point */ a, /* Number, optional */ b){
			// summary: applies a matrix to a point
			// matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix object to be applied
			// a: Number: an x coordinate of a point
			// b: Number: a y coordinate of a point
			var M = m.normalize(matrix);
			if(typeof a == "number" && typeof b == "number"){
				return m._multiplyPoint(M, a, b); // dojox.gfx.Point
			}
			// branch
			// matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix object to be applied
			// a: dojox.gfx.Point: a point
			// b: null
			return m._multiplyPoint(M, a.x, a.y); // dojox.gfx.Point
		},
		multiply: function(matrix){
			// summary: combines matrices by multiplying them sequentially in the given order
			// matrix: dojox.gfx.matrix.Matrix2D...: a 2D matrix-like object,
			//		all subsequent arguments are matrix-like objects too
			var M = m.normalize(matrix);
			// combine matrices
			for(var i = 1; i < arguments.length; ++i){
				var l = M, r = m.normalize(arguments[i]);
				M = new m.Matrix2D();
				M.xx = l.xx * r.xx + l.xy * r.yx;
				M.xy = l.xx * r.xy + l.xy * r.yy;
				M.yx = l.yx * r.xx + l.yy * r.yx;
				M.yy = l.yx * r.xy + l.yy * r.yy;
				M.dx = l.xx * r.dx + l.xy * r.dy + l.dx;
				M.dy = l.yx * r.dx + l.yy * r.dy + l.dy;
			}
			return M; // dojox.gfx.matrix.Matrix2D
		},

		// high level operations

		_sandwich: function(matrix, x, y){
			// summary: applies a matrix at a centrtal point
			// matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix-like object, which is applied at a central point
			// x: Number: an x component of the central point
			// y: Number: a y component of the central point
			return m.multiply(m.translate(x, y), matrix, m.translate(-x, -y)); // dojox.gfx.matrix.Matrix2D
		},
		scaleAt: function(a, b, c, d){
			// summary: scales a picture using a specified point as a center of scaling
			// description: Compare with dojox.gfx.matrix.scale().
			// a: Number: a scaling factor used for the x coordinate
			// b: Number: a scaling factor used for the y coordinate
			// c: Number: an x component of a central point
			// d: Number: a y component of a central point

			// accepts several signatures:
			//	1) uniform scale factor, Point
			//	2) uniform scale factor, x, y
			//	3) x scale, y scale, Point
			//	4) x scale, y scale, x, y

			switch(arguments.length){
				case 4:
					// a and b are scale factor components, c and d are components of a point
					return m._sandwich(m.scale(a, b), c, d); // dojox.gfx.matrix.Matrix2D
				case 3:
					if(typeof c == "number"){
						// branch
						// a: Number: a uniform scaling factor used for both coordinates
						// b: Number: an x component of a central point
						// c: Number: a y component of a central point
						// d: null
						return m._sandwich(m.scale(a), b, c); // dojox.gfx.matrix.Matrix2D
					}
					// branch
					// a: Number: a scaling factor used for the x coordinate
					// b: Number: a scaling factor used for the y coordinate
					// c: dojox.gfx.Point: a central point
					// d: null
					return m._sandwich(m.scale(a, b), c.x, c.y); // dojox.gfx.matrix.Matrix2D
			}
			// branch
			// a: Number: a uniform scaling factor used for both coordinates
			// b: dojox.gfx.Point: a central point
			// c: null
			// d: null
			return m._sandwich(m.scale(a), b.x, b.y); // dojox.gfx.matrix.Matrix2D
		},
		rotateAt: function(angle, a, b){
			// summary: rotates a picture using a specified point as a center of rotation
			// description: Compare with dojox.gfx.matrix.rotate().
			// angle: Number: an angle of rotation in radians (>0 for CW)
			// a: Number: an x component of a central point
			// b: Number: a y component of a central point

			// accepts several signatures:
			//	1) rotation angle in radians, Point
			//	2) rotation angle in radians, x, y

			if(arguments.length > 2){
				return m._sandwich(m.rotate(angle), a, b); // dojox.gfx.matrix.Matrix2D
			}

			// branch
			// angle: Number: an angle of rotation in radians (>0 for CCW)
			// a: dojox.gfx.Point: a central point
			// b: null
			return m._sandwich(m.rotate(angle), a.x, a.y); // dojox.gfx.matrix.Matrix2D
		},
		rotategAt: function(degree, a, b){
			// summary: rotates a picture using a specified point as a center of rotation
			// description: Compare with dojox.gfx.matrix.rotateg().
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			// a: Number: an x component of a central point
			// b: Number: a y component of a central point

			// accepts several signatures:
			//	1) rotation angle in degrees, Point
			//	2) rotation angle in degrees, x, y

			if(arguments.length > 2){
				return m._sandwich(m.rotateg(degree), a, b); // dojox.gfx.matrix.Matrix2D
			}

			// branch
			// degree: Number: an angle of rotation in degrees (>0 for CCW)
			// a: dojox.gfx.Point: a central point
			// b: null
			return m._sandwich(m.rotateg(degree), a.x, a.y); // dojox.gfx.matrix.Matrix2D
		},
		skewXAt: function(angle, a, b){
			// summary: skews a picture along the x axis using a specified point as a center of skewing
			// description: Compare with dojox.gfx.matrix.skewX().
			// angle: Number: an skewing angle in radians
			// a: Number: an x component of a central point
			// b: Number: a y component of a central point

			// accepts several signatures:
			//	1) skew angle in radians, Point
			//	2) skew angle in radians, x, y

			if(arguments.length > 2){
				return m._sandwich(m.skewX(angle), a, b); // dojox.gfx.matrix.Matrix2D
			}

			// branch
			// angle: Number: an skewing angle in radians
			// a: dojox.gfx.Point: a central point
			// b: null
			return m._sandwich(m.skewX(angle), a.x, a.y); // dojox.gfx.matrix.Matrix2D
		},
		skewXgAt: function(degree, a, b){
			// summary: skews a picture along the x axis using a specified point as a center of skewing
			// description: Compare with dojox.gfx.matrix.skewXg().
			// degree: Number: an skewing angle in degrees
			// a: Number: an x component of a central point
			// b: Number: a y component of a central point

			// accepts several signatures:
			//	1) skew angle in degrees, Point
			//	2) skew angle in degrees, x, y

			if(arguments.length > 2){
				return m._sandwich(m.skewXg(degree), a, b); // dojox.gfx.matrix.Matrix2D
			}

			// branch
			// degree: Number: an skewing angle in degrees
			// a: dojox.gfx.Point: a central point
			// b: null
			return m._sandwich(m.skewXg(degree), a.x, a.y); // dojox.gfx.matrix.Matrix2D
		},
		skewYAt: function(angle, a, b){
			// summary: skews a picture along the y axis using a specified point as a center of skewing
			// description: Compare with dojox.gfx.matrix.skewY().
			// angle: Number: an skewing angle in radians
			// a: Number: an x component of a central point
			// b: Number: a y component of a central point

			// accepts several signatures:
			//	1) skew angle in radians, Point
			//	2) skew angle in radians, x, y

			if(arguments.length > 2){
				return m._sandwich(m.skewY(angle), a, b); // dojox.gfx.matrix.Matrix2D
			}

			// branch
			// angle: Number: an skewing angle in radians
			// a: dojox.gfx.Point: a central point
			// b: null
			return m._sandwich(m.skewY(angle), a.x, a.y); // dojox.gfx.matrix.Matrix2D
		},
		skewYgAt: function(/* Number */ degree, /* Number||Point */ a, /* Number, optional */ b){
			// summary: skews a picture along the y axis using a specified point as a center of skewing
			// description: Compare with dojox.gfx.matrix.skewYg().
			// degree: Number: an skewing angle in degrees
			// a: Number: an x component of a central point
			// b: Number: a y component of a central point

			// accepts several signatures:
			//	1) skew angle in degrees, Point
			//	2) skew angle in degrees, x, y

			if(arguments.length > 2){
				return m._sandwich(m.skewYg(degree), a, b); // dojox.gfx.matrix.Matrix2D
			}

			// branch
			// degree: Number: an skewing angle in degrees
			// a: dojox.gfx.Point: a central point
			// b: null
			return m._sandwich(m.skewYg(degree), a.x, a.y); // dojox.gfx.matrix.Matrix2D
		}

		//TODO: rect-to-rect mapping, scale-to-fit (isotropic and anisotropic versions)

	});
})();

// propagate Matrix2D up
dojox.gfx.Matrix2D = dojox.gfx.matrix.Matrix2D;

}

if(!dojo._hasResource["dojox.gfx.path"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.gfx.path"] = true;
dojo.provide("dojox.gfx.path");




dojo.declare("dojox.gfx.path.Path", dojox.gfx.shape.Shape, {
	// summary: a generalized path shape

	constructor: function(rawNode){
		// summary: a path constructor
		// rawNode: Node: a DOM node to be used by this path object
		this.shape = dojo.clone(dojox.gfx.defaultPath);
		this.segments = [];
		this.tbbox = null;
		this.absolute = true;
		this.last = {};
		this.rawNode = rawNode;
		this.segmented = false;
	},

	// mode manipulations
	setAbsoluteMode: function(mode){
		// summary: sets an absolute or relative mode for path points
		// mode: Boolean: true/false or "absolute"/"relative" to specify the mode
		this._confirmSegmented();
		this.absolute = typeof mode == "string" ? (mode == "absolute") : mode;
		return this; // self
	},
	getAbsoluteMode: function(){
		// summary: returns a current value of the absolute mode
		this._confirmSegmented();
		return this.absolute; // Boolean
	},

	getBoundingBox: function(){
		// summary: returns the bounding box {x, y, width, height} or null
		this._confirmSegmented();
		return (this.bbox && ("l" in this.bbox)) ? {x: this.bbox.l, y: this.bbox.t, width: this.bbox.r - this.bbox.l, height: this.bbox.b - this.bbox.t} : null; // dojox.gfx.Rectangle
	},

	_getRealBBox: function(){
		// summary: returns an array of four points or null
		//	four points represent four corners of the untransformed bounding box
		this._confirmSegmented();
		if(this.tbbox){
			return this.tbbox;	// Array
		}
		var bbox = this.bbox, matrix = this._getRealMatrix();
		this.bbox = null;
		for(var i = 0, len = this.segments.length; i < len; ++i){
			this._updateWithSegment(this.segments[i], matrix);
		}
		var t = this.bbox;
		this.bbox = bbox;
		this.tbbox = t ? [
			{x: t.l, y: t.t},
			{x: t.r, y: t.t},
			{x: t.r, y: t.b},
			{x: t.l, y: t.b}
		] : null;
		return this.tbbox;	// Array
	},

	getLastPosition: function(){
		// summary: returns the last point in the path, or null
		this._confirmSegmented();
		return "x" in this.last ? this.last : null; // Object
	},

	_applyTransform: function(){
		this.tbbox = null;
		return this.inherited(arguments);
	},

	// segment interpretation
	_updateBBox: function(x, y, matrix){
		// summary: updates the bounding box of path with new point
		// x: Number: an x coordinate
		// y: Number: a y coordinate
		
		if(matrix){
			var t = dojox.gfx.matrix.multiplyPoint(matrix, x, y);
			x = t.x;
			y = t.y;
		}

		// we use {l, b, r, t} representation of a bbox
		if(this.bbox && ("l" in this.bbox)){
			if(this.bbox.l > x) this.bbox.l = x;
			if(this.bbox.r < x) this.bbox.r = x;
			if(this.bbox.t > y) this.bbox.t = y;
			if(this.bbox.b < y) this.bbox.b = y;
		}else{
			this.bbox = {l: x, b: y, r: x, t: y};
		}
	},
	_updateWithSegment: function(segment, matrix){
		// summary: updates the bounding box of path with new segment
		// segment: Object: a segment
		var n = segment.args, l = n.length;
		// update internal variables: bbox, absolute, last
		switch(segment.action){
			case "M":
			case "L":
			case "C":
			case "S":
			case "Q":
			case "T":
				for(var i = 0; i < l; i += 2){
					this._updateBBox(n[i], n[i + 1], matrix);
				}
				this.last.x = n[l - 2];
				this.last.y = n[l - 1];
				this.absolute = true;
				break;
			case "H":
				for(var i = 0; i < l; ++i){
					this._updateBBox(n[i], this.last.y, matrix);
				}
				this.last.x = n[l - 1];
				this.absolute = true;
				break;
			case "V":
				for(var i = 0; i < l; ++i){
					this._updateBBox(this.last.x, n[i], matrix);
				}
				this.last.y = n[l - 1];
				this.absolute = true;
				break;
			case "m":
				var start = 0;
				if(!("x" in this.last)){
					this._updateBBox(this.last.x = n[0], this.last.y = n[1], matrix);
					start = 2;
				}
				for(var i = start; i < l; i += 2){
					this._updateBBox(this.last.x += n[i], this.last.y += n[i + 1], matrix);
				}
				this.absolute = false;
				break;
			case "l":
			case "t":
				for(var i = 0; i < l; i += 2){
					this._updateBBox(this.last.x += n[i], this.last.y += n[i + 1], matrix);
				}
				this.absolute = false;
				break;
			case "h":
				for(var i = 0; i < l; ++i){
					this._updateBBox(this.last.x += n[i], this.last.y, matrix);
				}
				this.absolute = false;
				break;
			case "v":
				for(var i = 0; i < l; ++i){
					this._updateBBox(this.last.x, this.last.y += n[i], matrix);
				}
				this.absolute = false;
				break;
			case "c":
				for(var i = 0; i < l; i += 6){
					this._updateBBox(this.last.x + n[i], this.last.y + n[i + 1], matrix);
					this._updateBBox(this.last.x + n[i + 2], this.last.y + n[i + 3], matrix);
					this._updateBBox(this.last.x += n[i + 4], this.last.y += n[i + 5], matrix);
				}
				this.absolute = false;
				break;
			case "s":
			case "q":
				for(var i = 0; i < l; i += 4){
					this._updateBBox(this.last.x + n[i], this.last.y + n[i + 1], matrix);
					this._updateBBox(this.last.x += n[i + 2], this.last.y += n[i + 3], matrix);
				}
				this.absolute = false;
				break;
			case "A":
				for(var i = 0; i < l; i += 7){
					this._updateBBox(n[i + 5], n[i + 6], matrix);
				}
				this.last.x = n[l - 2];
				this.last.y = n[l - 1];
				this.absolute = true;
				break;
			case "a":
				for(var i = 0; i < l; i += 7){
					this._updateBBox(this.last.x += n[i + 5], this.last.y += n[i + 6], matrix);
				}
				this.absolute = false;
				break;
		}
		// add an SVG path segment
		var path = [segment.action];
		for(var i = 0; i < l; ++i){
			path.push(dojox.gfx.formatNumber(n[i], true));
		}
		if(typeof this.shape.path == "string"){
			this.shape.path += path.join("");
		}else{
			Array.prototype.push.apply(this.shape.path, path); //FIXME: why not simple push()?
		}
	},

	// a dictionary, which maps segment type codes to a number of their arguments
	_validSegments: {m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0},

	_pushSegment: function(action, args){
		// summary: adds a segment
		// action: String: valid SVG code for a segment's type
		// args: Array: a list of parameters for this segment
		this.tbbox = null;
		var group = this._validSegments[action.toLowerCase()];
		if(typeof group == "number"){
			if(group){
				if(args.length >= group){
					var segment = {action: action, args: args.slice(0, args.length - args.length % group)};
					this.segments.push(segment);
					this._updateWithSegment(segment);
				}
			}else{
				var segment = {action: action, args: []};
				this.segments.push(segment);
				this._updateWithSegment(segment);
			}
		}
	},

	_collectArgs: function(array, args){
		// summary: converts an array of arguments to plain numeric values
		// array: Array: an output argument (array of numbers)
		// args: Array: an input argument (can be values of Boolean, Number, dojox.gfx.Point, or an embedded array of them)
		for(var i = 0; i < args.length; ++i){
			var t = args[i];
			if(typeof t == "boolean"){
				array.push(t ? 1 : 0);
			}else if(typeof t == "number"){
				array.push(t);
			}else if(t instanceof Array){
				this._collectArgs(array, t);
			}else if("x" in t && "y" in t){
				array.push(t.x, t.y);
			}
		}
	},

	// segments
	moveTo: function(){
		// summary: formes a move segment
		this._confirmSegmented();
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "M" : "m", args);
		return this; // self
	},
	lineTo: function(){
		// summary: formes a line segment
		this._confirmSegmented();
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "L" : "l", args);
		return this; // self
	},
	hLineTo: function(){
		// summary: formes a horizontal line segment
		this._confirmSegmented();
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "H" : "h", args);
		return this; // self
	},
	vLineTo: function(){
		// summary: formes a vertical line segment
		this._confirmSegmented();
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "V" : "v", args);
		return this; // self
	},
	curveTo: function(){
		// summary: formes a curve segment
		this._confirmSegmented();
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "C" : "c", args);
		return this; // self
	},
	smoothCurveTo: function(){
		// summary: formes a smooth curve segment
		this._confirmSegmented();
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "S" : "s", args);
		return this; // self
	},
	qCurveTo: function(){
		// summary: formes a quadratic curve segment
		this._confirmSegmented();
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "Q" : "q", args);
		return this; // self
	},
	qSmoothCurveTo: function(){
		// summary: formes a quadratic smooth curve segment
		this._confirmSegmented();
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "T" : "t", args);
		return this; // self
	},
	arcTo: function(){
		// summary: formes an elliptic arc segment
		this._confirmSegmented();
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "A" : "a", args);
		return this; // self
	},
	closePath: function(){
		// summary: closes a path
		this._confirmSegmented();
		this._pushSegment("Z", []);
		return this; // self
	},

	_confirmSegmented: function() {
		if (!this.segmented) {
			var path = this.shape.path;
			// switch to non-updating version of path building
			this.shape.path = [];
			this._setPath(path);
			// switch back to the string path
			this.shape.path = this.shape.path.join("");
			// become segmented
			this.segmented = true;
		}
	},

	// setShape
	_setPath: function(path){
		// summary: forms a path using an SVG path string
		// path: String: an SVG path string
		var p = dojo.isArray(path) ? path : path.match(dojox.gfx.pathSvgRegExp);
		this.segments = [];
		this.absolute = true;
		this.bbox = {};
		this.last = {};
		if(!p) return;
		// create segments
		var action = "",	// current action
			args = [],		// current arguments
			l = p.length;
		for(var i = 0; i < l; ++i){
			var t = p[i], x = parseFloat(t);
			if(isNaN(x)){
				if(action){
					this._pushSegment(action, args);
				}
				args = [];
				action = t;
			}else{
				args.push(x);
			}
		}
		this._pushSegment(action, args);
	},
	setShape: function(newShape){
		// summary: forms a path using a shape
		// newShape: Object: an SVG path string or a path object (see dojox.gfx.defaultPath)
		this.inherited(arguments, [typeof newShape == "string" ? {path: newShape} : newShape]);
		
		this.segmented = false;
		this.segments = [];
		if(!dojox.gfx.lazyPathSegmentation){
			this._confirmSegmented();
		}
		return this; // self
	},

	// useful constant for descendants
	_2PI: Math.PI * 2
});

dojo.declare("dojox.gfx.path.TextPath", dojox.gfx.path.Path, {
	// summary: a generalized TextPath shape

	constructor: function(rawNode){
		// summary: a TextPath shape constructor
		// rawNode: Node: a DOM node to be used by this TextPath object
		if(!("text" in this)){
			this.text = dojo.clone(dojox.gfx.defaultTextPath);
		}
		if(!("fontStyle" in this)){
			this.fontStyle = dojo.clone(dojox.gfx.defaultFont);
		}
	},
	getText: function(){
		// summary: returns the current text object or null
		return this.text;	// Object
	},
	setText: function(newText){
		// summary: sets a text to be drawn along the path
		this.text = dojox.gfx.makeParameters(this.text,
			typeof newText == "string" ? {text: newText} : newText);
		this._setText();
		return this;	// self
	},
	getFont: function(){
		// summary: returns the current font object or null
		return this.fontStyle;	// Object
	},
	setFont: function(newFont){
		// summary: sets a font for text
		this.fontStyle = typeof newFont == "string" ?
			dojox.gfx.splitFontString(newFont) :
			dojox.gfx.makeParameters(dojox.gfx.defaultFont, newFont);
		this._setFont();
		return this;	// self
	}
});

}

if(!dojo._hasResource["dojox.gfx.svg"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.gfx.svg"] = true;
dojo.provide("dojox.gfx.svg");





(function(){
	var d = dojo, g = dojox.gfx, gs = g.shape, svg = g.svg;
	svg.useSvgWeb = (typeof window.svgweb != "undefined");
	
	function _createElementNS(ns, nodeType){
		// summary:
		//		Internal helper to deal with creating elements that
		//		are namespaced.  Mainly to get SVG markup output
		//		working on IE.
		if(dojo.doc.createElementNS){
			return dojo.doc.createElementNS(ns,nodeType);
		}else{
			return dojo.doc.createElement(nodeType);
		}
	}
	
	function _createTextNode(text){
		if(svg.useSvgWeb){
			return dojo.doc.createTextNode(text, true);
		}else{
			return dojo.doc.createTextNode(text);
		}
	}
	
	function _createFragment(){
		if(svg.useSvgWeb){
			return dojo.doc.createDocumentFragment(true);
		}else{
			return dojo.doc.createDocumentFragment();
		}
	}

	svg.xmlns = {
		xlink: "http://www.w3.org/1999/xlink",
		svg:   "http://www.w3.org/2000/svg"
	};

	svg.getRef = function(name){
		// summary: returns a DOM Node specified by the name argument or null
		// name: String: an SVG external reference
		if(!name || name == "none") return null;
		if(name.match(/^url\(#.+\)$/)){
			return d.byId(name.slice(5, -1));	// Node
		}
		// alternative representation of a reference
		if(name.match(/^#dojoUnique\d+$/)){
			// we assume here that a reference was generated by dojox.gfx
			return d.byId(name.slice(1));	// Node
		}
		return null;	// Node
	};

	svg.dasharray = {
		solid:				"none",
		shortdash:			[4, 1],
		shortdot:			[1, 1],
		shortdashdot:		[4, 1, 1, 1],
		shortdashdotdot:	[4, 1, 1, 1, 1, 1],
		dot:				[1, 3],
		dash:				[4, 3],
		longdash:			[8, 3],
		dashdot:			[4, 3, 1, 3],
		longdashdot:		[8, 3, 1, 3],
		longdashdotdot:		[8, 3, 1, 3, 1, 3]
	};

	d.declare("dojox.gfx.svg.Shape", gs.Shape, {
		// summary: SVG-specific implementation of dojox.gfx.Shape methods

		setFill: function(fill){
			// summary: sets a fill object (SVG)
			// fill: Object: a fill object
			//	(see dojox.gfx.defaultLinearGradient,
			//	dojox.gfx.defaultRadialGradient,
			//	dojox.gfx.defaultPattern,
			//	or dojo.Color)

			if(!fill){
				// don't fill
				this.fillStyle = null;
				this.rawNode.setAttribute("fill", "none");
				this.rawNode.setAttribute("fill-opacity", 0);
				return this;
			}
			var f;
			// FIXME: slightly magical. We're using the outer scope's "f", but setting it later
			var setter = function(x){
					// we assume that we're executing in the scope of the node to mutate
					this.setAttribute(x, f[x].toFixed(8));
				};
			if(typeof(fill) == "object" && "type" in fill){
				// gradient
				switch(fill.type){
					case "linear":
						f = g.makeParameters(g.defaultLinearGradient, fill);
						var gradient = this._setFillObject(f, "linearGradient");
						d.forEach(["x1", "y1", "x2", "y2"], setter, gradient);
						break;
					case "radial":
						f = g.makeParameters(g.defaultRadialGradient, fill);
						var gradient = this._setFillObject(f, "radialGradient");
						d.forEach(["cx", "cy", "r"], setter, gradient);
						break;
					case "pattern":
						f = g.makeParameters(g.defaultPattern, fill);
						var pattern = this._setFillObject(f, "pattern");
						d.forEach(["x", "y", "width", "height"], setter, pattern);
						break;
				}
				this.fillStyle = f;
				return this;
			}
			// color object
			var f = g.normalizeColor(fill);
			this.fillStyle = f;
			this.rawNode.setAttribute("fill", f.toCss());
			this.rawNode.setAttribute("fill-opacity", f.a);
			this.rawNode.setAttribute("fill-rule", "evenodd");
			return this;	// self
		},

		setStroke: function(stroke){
			//	summary:
			//		sets a stroke object (SVG)
			//	stroke: Object
			// 		a stroke object (see dojox.gfx.defaultStroke)

			var rn = this.rawNode;
			if(!stroke){
				// don't stroke
				this.strokeStyle = null;
				rn.setAttribute("stroke", "none");
				rn.setAttribute("stroke-opacity", 0);
				return this;
			}
			// normalize the stroke
			if(typeof stroke == "string" || d.isArray(stroke) || stroke instanceof d.Color){
				stroke = { color: stroke };
			}
			var s = this.strokeStyle = g.makeParameters(g.defaultStroke, stroke);
			s.color = g.normalizeColor(s.color);
			// generate attributes
			if(s){
				rn.setAttribute("stroke", s.color.toCss());
				rn.setAttribute("stroke-opacity", s.color.a);
				rn.setAttribute("stroke-width",   s.width);
				rn.setAttribute("stroke-linecap", s.cap);
				if(typeof s.join == "number"){
					rn.setAttribute("stroke-linejoin",   "miter");
					rn.setAttribute("stroke-miterlimit", s.join);
				}else{
					rn.setAttribute("stroke-linejoin",   s.join);
				}
				var da = s.style.toLowerCase();
				if(da in svg.dasharray){
					da = svg.dasharray[da];
				}
				if(da instanceof Array){
					da = d._toArray(da);
					for(var i = 0; i < da.length; ++i){
						da[i] *= s.width;
					}
					if(s.cap != "butt"){
						for(var i = 0; i < da.length; i += 2){
							da[i] -= s.width;
							if(da[i] < 1){ da[i] = 1; }
						}
						for(var i = 1; i < da.length; i += 2){
							da[i] += s.width;
						}
					}
					da = da.join(",");
				}
				rn.setAttribute("stroke-dasharray", da);
				rn.setAttribute("dojoGfxStrokeStyle", s.style);
			}
			return this;	// self
		},

		_getParentSurface: function(){
			var surface = this.parent;
			for(; surface && !(surface instanceof g.Surface); surface = surface.parent);
			return surface;
		},

		_setFillObject: function(f, nodeType){
			var svgns = svg.xmlns.svg;
			this.fillStyle = f;
			var surface = this._getParentSurface(),
				defs = surface.defNode,
				fill = this.rawNode.getAttribute("fill"),
				ref  = svg.getRef(fill);
			if(ref){
				fill = ref;
				if(fill.tagName.toLowerCase() != nodeType.toLowerCase()){
					var id = fill.id;
					fill.parentNode.removeChild(fill);
					fill = _createElementNS(svgns, nodeType);
					fill.setAttribute("id", id);
					defs.appendChild(fill);
				}else{
					while(fill.childNodes.length){
						fill.removeChild(fill.lastChild);
					}
				}
			}else{
				fill = _createElementNS(svgns, nodeType);
				fill.setAttribute("id", g._base._getUniqueId());
				defs.appendChild(fill);
			}
			if(nodeType == "pattern"){
				fill.setAttribute("patternUnits", "userSpaceOnUse");
				var img = _createElementNS(svgns, "image");
				img.setAttribute("x", 0);
				img.setAttribute("y", 0);
				img.setAttribute("width",  f.width .toFixed(8));
				img.setAttribute("height", f.height.toFixed(8));
				img.setAttributeNS(svg.xmlns.xlink, "xlink:href", f.src);
				fill.appendChild(img);
			}else{
				fill.setAttribute("gradientUnits", "userSpaceOnUse");
				for(var i = 0; i < f.colors.length; ++i){
					var c = f.colors[i], t = _createElementNS(svgns, "stop"),
						cc = c.color = g.normalizeColor(c.color);
					t.setAttribute("offset",       c.offset.toFixed(8));
					t.setAttribute("stop-color",   cc.toCss());
					t.setAttribute("stop-opacity", cc.a);
					fill.appendChild(t);
				}
			}
			this.rawNode.setAttribute("fill", "url(#" + fill.getAttribute("id") +")");
			this.rawNode.removeAttribute("fill-opacity");
			this.rawNode.setAttribute("fill-rule", "evenodd");
			return fill;
		},

		_applyTransform: function() {
			var matrix = this.matrix;
			if(matrix){
				var tm = this.matrix;
				this.rawNode.setAttribute("transform", "matrix(" +
					tm.xx.toFixed(8) + "," + tm.yx.toFixed(8) + "," +
					tm.xy.toFixed(8) + "," + tm.yy.toFixed(8) + "," +
					tm.dx.toFixed(8) + "," + tm.dy.toFixed(8) + ")");
			}else{
				this.rawNode.removeAttribute("transform");
			}
			return this;
		},

		setRawNode: function(rawNode){
			// summary:
			//	assigns and clears the underlying node that will represent this
			//	shape. Once set, transforms, gradients, etc, can be applied.
			//	(no fill & stroke by default)
			var r = this.rawNode = rawNode;
			if(this.shape.type!="image"){
				r.setAttribute("fill", "none");
			}
			r.setAttribute("fill-opacity", 0);
			r.setAttribute("stroke", "none");
			r.setAttribute("stroke-opacity", 0);
			r.setAttribute("stroke-width", 1);
			r.setAttribute("stroke-linecap", "butt");
			r.setAttribute("stroke-linejoin", "miter");
			r.setAttribute("stroke-miterlimit", 4);
		},

		setShape: function(newShape){
			// summary: sets a shape object (SVG)
			// newShape: Object: a shape object
			//	(see dojox.gfx.defaultPath,
			//	dojox.gfx.defaultPolyline,
			//	dojox.gfx.defaultRect,
			//	dojox.gfx.defaultEllipse,
			//	dojox.gfx.defaultCircle,
			//	dojox.gfx.defaultLine,
			//	or dojox.gfx.defaultImage)
			this.shape = g.makeParameters(this.shape, newShape);
			for(var i in this.shape){
				if(i != "type"){
					this.rawNode.setAttribute(i, this.shape[i]);
				}
			}
			this.bbox = null;
			return this;	// self
		},

		// move family

		_moveToFront: function(){
			// summary: moves a shape to front of its parent's list of shapes (SVG)
			this.rawNode.parentNode.appendChild(this.rawNode);
			return this;	// self
		},
		_moveToBack: function(){
			// summary: moves a shape to back of its parent's list of shapes (SVG)
			this.rawNode.parentNode.insertBefore(this.rawNode, this.rawNode.parentNode.firstChild);
			return this;	// self
		}
	});

	dojo.declare("dojox.gfx.svg.Group", svg.Shape, {
		// summary: a group shape (SVG), which can be used
		//	to logically group shapes (e.g, to propagate matricies)
		constructor: function(){
			gs.Container._init.call(this);
		},
		setRawNode: function(rawNode){
			// summary: sets a raw SVG node to be used by this shape
			// rawNode: Node: an SVG node
			this.rawNode = rawNode;
		}
	});
	svg.Group.nodeType = "g";

	dojo.declare("dojox.gfx.svg.Rect", [svg.Shape, gs.Rect], {
		// summary: a rectangle shape (SVG)
		setShape: function(newShape){
			// summary: sets a rectangle shape object (SVG)
			// newShape: Object: a rectangle shape object
			this.shape = g.makeParameters(this.shape, newShape);
			this.bbox = null;
			for(var i in this.shape){
				if(i != "type" && i != "r"){
					this.rawNode.setAttribute(i, this.shape[i]);
				}
			}
			if(this.shape.r){
				this.rawNode.setAttribute("ry", this.shape.r);
				this.rawNode.setAttribute("rx", this.shape.r);
			}
			return this;	// self
		}
	});
	svg.Rect.nodeType = "rect";

	dojo.declare("dojox.gfx.svg.Ellipse", [svg.Shape, gs.Ellipse], {});
	svg.Ellipse.nodeType = "ellipse";

	dojo.declare("dojox.gfx.svg.Circle", [svg.Shape, gs.Circle], {});
	svg.Circle.nodeType = "circle";

	dojo.declare("dojox.gfx.svg.Line", [svg.Shape, gs.Line], {});
	svg.Line.nodeType = "line";

	dojo.declare("dojox.gfx.svg.Polyline", [svg.Shape, gs.Polyline], {
		// summary: a polyline/polygon shape (SVG)
		setShape: function(points, closed){
			// summary: sets a polyline/polygon shape object (SVG)
			// points: Object: a polyline/polygon shape object
			if(points && points instanceof Array){
				// branch
				// points: Array: an array of points
				this.shape = g.makeParameters(this.shape, { points: points });
				if(closed && this.shape.points.length){
					this.shape.points.push(this.shape.points[0]);
				}
			}else{
				this.shape = g.makeParameters(this.shape, points);
			}
			this.bbox = null;
			this._normalizePoints();
			var attr = [], p = this.shape.points;
			for(var i = 0; i < p.length; ++i){
				attr.push(p[i].x.toFixed(8), p[i].y.toFixed(8));
			}
			this.rawNode.setAttribute("points", attr.join(" "));
			return this;	// self
		}
	});
	svg.Polyline.nodeType = "polyline";

	dojo.declare("dojox.gfx.svg.Image", [svg.Shape, gs.Image], {
		// summary: an image (SVG)
		setShape: function(newShape){
			// summary: sets an image shape object (SVG)
			// newShape: Object: an image shape object
			this.shape = g.makeParameters(this.shape, newShape);
			this.bbox = null;
			var rawNode = this.rawNode;
			for(var i in this.shape){
				if(i != "type" && i != "src"){
					rawNode.setAttribute(i, this.shape[i]);
				}
			}
			rawNode.setAttribute("preserveAspectRatio", "none");
			rawNode.setAttributeNS(svg.xmlns.xlink, "xlink:href", this.shape.src);
			return this;	// self
		}
	});
	svg.Image.nodeType = "image";

	dojo.declare("dojox.gfx.svg.Text", [svg.Shape, gs.Text], {
		// summary: an anchored text (SVG)
		setShape: function(newShape){
			// summary: sets a text shape object (SVG)
			// newShape: Object: a text shape object
			this.shape = g.makeParameters(this.shape, newShape);
			this.bbox = null;
			var r = this.rawNode, s = this.shape;
			r.setAttribute("x", s.x);
			r.setAttribute("y", s.y);
			r.setAttribute("text-anchor", s.align);
			r.setAttribute("text-decoration", s.decoration);
			r.setAttribute("rotate", s.rotated ? 90 : 0);
			r.setAttribute("kerning", s.kerning ? "auto" : 0);
			r.setAttribute("text-rendering", "optimizeLegibility");
			
			// update the text content
			if(r.firstChild){
				r.firstChild.nodeValue = s.text;
			}else{
				r.appendChild(_createTextNode(s.text));
			}
			return this;	// self
		},
		getTextWidth: function(){
			// summary: get the text width in pixels
			var rawNode = this.rawNode,
				oldParent = rawNode.parentNode,
				_measurementNode = rawNode.cloneNode(true);
			_measurementNode.style.visibility = "hidden";

			// solution to the "orphan issue" in FF
			var _width = 0, _text = _measurementNode.firstChild.nodeValue;
			oldParent.appendChild(_measurementNode);

			// solution to the "orphan issue" in Opera
			// (nodeValue == "" hangs firefox)
			if(_text!=""){
				while(!_width){
//Yang: work around svgweb bug 417 -- http://code.google.com/p/svgweb/issues/detail?id=417
if (_measurementNode.getBBox)
					_width = parseInt(_measurementNode.getBBox().width);
else
	_width = 68;
				}
			}
			oldParent.removeChild(_measurementNode);
			return _width;
		}
	});
	svg.Text.nodeType = "text";

	dojo.declare("dojox.gfx.svg.Path", [svg.Shape, g.path.Path], {
		// summary: a path shape (SVG)
		_updateWithSegment: function(segment){
			// summary: updates the bounding box of path with new segment
			// segment: Object: a segment
			this.inherited(arguments);
			if(typeof(this.shape.path) == "string"){
				this.rawNode.setAttribute("d", this.shape.path);
			}
		},
		setShape: function(newShape){
			// summary: forms a path using a shape (SVG)
			// newShape: Object: an SVG path string or a path object (see dojox.gfx.defaultPath)
			this.inherited(arguments);
			if(this.shape.path){
				this.rawNode.setAttribute("d", this.shape.path);
			}else{
				this.rawNode.removeAttribute("d");
			}
			return this;	// self
		}
	});
	svg.Path.nodeType = "path";

	dojo.declare("dojox.gfx.svg.TextPath", [svg.Shape, g.path.TextPath], {
		// summary: a textpath shape (SVG)
		_updateWithSegment: function(segment){
			// summary: updates the bounding box of path with new segment
			// segment: Object: a segment
			this.inherited(arguments);
			this._setTextPath();
		},
		setShape: function(newShape){
			// summary: forms a path using a shape (SVG)
			// newShape: Object: an SVG path string or a path object (see dojox.gfx.defaultPath)
			this.inherited(arguments);
			this._setTextPath();
			return this;	// self
		},
		_setTextPath: function(){
			if(typeof this.shape.path != "string"){ return; }
			var r = this.rawNode;
			if(!r.firstChild){
				var tp = _createElementNS(svg.xmlns.svg, "textPath"),
					tx = _createTextNode("");
				tp.appendChild(tx);
				r.appendChild(tp);
			}
			var ref  = r.firstChild.getAttributeNS(svg.xmlns.xlink, "href"),
				path = ref && svg.getRef(ref);
			if(!path){
				var surface = this._getParentSurface();
				if(surface){
					var defs = surface.defNode;
					path = _createElementNS(svg.xmlns.svg, "path");
					var id = g._base._getUniqueId();
					path.setAttribute("id", id);
					defs.appendChild(path);
					r.firstChild.setAttributeNS(svg.xmlns.xlink, "xlink:href", "#" + id);
				}
			}
			if(path){
				path.setAttribute("d", this.shape.path);
			}
		},
		_setText: function(){
			var r = this.rawNode;
			if(!r.firstChild){
				var tp = _createElementNS(svg.xmlns.svg, "textPath"),
					tx = _createTextNode("");
				tp.appendChild(tx);
				r.appendChild(tp);
			}
			r = r.firstChild;
			var t = this.text;
			r.setAttribute("alignment-baseline", "middle");
			switch(t.align){
				case "middle":
					r.setAttribute("text-anchor", "middle");
					r.setAttribute("startOffset", "50%");
					break;
				case "end":
					r.setAttribute("text-anchor", "end");
					r.setAttribute("startOffset", "100%");
					break;
				default:
					r.setAttribute("text-anchor", "start");
					r.setAttribute("startOffset", "0%");
					break;
			}
			//r.parentNode.setAttribute("alignment-baseline", "central");
			//r.setAttribute("dominant-baseline", "central");
			r.setAttribute("baseline-shift", "0.5ex");
			r.setAttribute("text-decoration", t.decoration);
			r.setAttribute("rotate", t.rotated ? 90 : 0);
			r.setAttribute("kerning", t.kerning ? "auto" : 0);
			r.firstChild.data = t.text;
		}
	});
	svg.TextPath.nodeType = "text";

	dojo.declare("dojox.gfx.svg.Surface", gs.Surface, {
		// summary: a surface object to be used for drawings (SVG)
		constructor: function(){
			gs.Container._init.call(this);
		},
		destroy: function(){
			this.defNode = null;	// release the external reference
			this.inherited(arguments);
		},
		setDimensions: function(width, height){
			// summary: sets the width and height of the rawNode
			// width: String: width of surface, e.g., "100px"
			// height: String: height of surface, e.g., "100px"
			if(!this.rawNode){ return this; }
			this.rawNode.setAttribute("width",  width);
			this.rawNode.setAttribute("height", height);
			return this;	// self
		},
		getDimensions: function(){
			// summary: returns an object with properties "width" and "height"
			var t = this.rawNode ? {
				width:  g.normalizedLength(this.rawNode.getAttribute("width")),
				height: g.normalizedLength(this.rawNode.getAttribute("height"))} : null;
			return t;	// Object
		}
	});

	svg.createSurface = function(parentNode, width, height){
		// summary: creates a surface (SVG)
		// parentNode: Node: a parent node
		// width: String: width of surface, e.g., "100px"
		// height: String: height of surface, e.g., "100px"

		var s = new svg.Surface();
		s.rawNode = _createElementNS(svg.xmlns.svg, "svg");
		if(width){
			s.rawNode.setAttribute("width",  width);
		}
		if(height){
			s.rawNode.setAttribute("height", height);
		}

		var defNode = _createElementNS(svg.xmlns.svg, "defs");
		s.rawNode.appendChild(defNode);
		s.defNode = defNode;

		s._parent = d.byId(parentNode);
		s._parent.appendChild(s.rawNode);

		return s;	// dojox.gfx.Surface
	};

	// Extenders

	var Font = {
		_setFont: function(){
			// summary: sets a font object (SVG)
			var f = this.fontStyle;
			// next line doesn't work in Firefox 2 or Opera 9
			//this.rawNode.setAttribute("font", dojox.gfx.makeFontString(this.fontStyle));
			this.rawNode.setAttribute("font-style", f.style);
			this.rawNode.setAttribute("font-variant", f.variant);
			this.rawNode.setAttribute("font-weight", f.weight);
			this.rawNode.setAttribute("font-size", f.size);
			this.rawNode.setAttribute("font-family", f.family);
		}
	};

	var C = gs.Container, Container = {
		openBatch: function() {
			// summary: starts a new batch, subsequent new child shapes will be held in
			//	the batch instead of appending to the container directly
			this.fragment = _createFragment();
		},
		closeBatch: function() {
			// summary: submits the current batch, append all pending child shapes to DOM
			if (this.fragment) {
				this.rawNode.appendChild(this.fragment);
				delete this.fragment;
			}
		},
		add: function(shape){
			// summary: adds a shape to a group/surface
			// shape: dojox.gfx.Shape: an VML shape object
			if(this != shape.getParent()){
				if (this.fragment) {
					this.fragment.appendChild(shape.rawNode);
				} else {
					this.rawNode.appendChild(shape.rawNode);
				}
				C.add.apply(this, arguments);
			}
			return this;	// self
		},
		remove: function(shape, silently){
			// summary: remove a shape from a group/surface
			// shape: dojox.gfx.Shape: an VML shape object
			// silently: Boolean?: if true, regenerate a picture
			if(this == shape.getParent()){
				if(this.rawNode == shape.rawNode.parentNode){
					this.rawNode.removeChild(shape.rawNode);
				}
				if(this.fragment && this.fragment == shape.rawNode.parentNode){
					this.fragment.removeChild(shape.rawNode);
				}
				C.remove.apply(this, arguments);
			}
			return this;	// self
		},
		clear: function(){
			// summary: removes all shapes from a group/surface
			var r = this.rawNode;
			while(r.lastChild){
				r.removeChild(r.lastChild);
			}
			var defNode = this.defNode;
			if(defNode){
				while(defNode.lastChild){
					defNode.removeChild(defNode.lastChild);
				}
				r.appendChild(defNode);
			}
			return C.clear.apply(this, arguments);
		},
		_moveChildToFront: C._moveChildToFront,
		_moveChildToBack:  C._moveChildToBack
	};

	var Creator = {
		// summary: SVG shape creators
		createObject: function(shapeType, rawShape){
			// summary: creates an instance of the passed shapeType class
			// shapeType: Function: a class constructor to create an instance of
			// rawShape: Object: properties to be passed in to the classes "setShape" method
			if(!this.rawNode){ return null; }
			var shape = new shapeType(),
				node = _createElementNS(svg.xmlns.svg, shapeType.nodeType);

			shape.setRawNode(node);
			shape.setShape(rawShape);
			// rawNode.appendChild() will be done inside this.add(shape) below
			this.add(shape);
			return shape;	// dojox.gfx.Shape
		}
	};

	d.extend(svg.Text, Font);
	d.extend(svg.TextPath, Font);

	d.extend(svg.Group, Container);
	d.extend(svg.Group, gs.Creator);
	d.extend(svg.Group, Creator);

	d.extend(svg.Surface, Container);
	d.extend(svg.Surface, gs.Creator);
	d.extend(svg.Surface, Creator);


	// some specific override for svgweb + flash
	if(svg.useSvgWeb){
		// override createSurface()
		svg.createSurface = function(parentNode, width, height){
			var s = new svg.Surface();

			// ensure width / height
			if(!width || !height){
				var pos = d.position(parentNode);
				width  = width  || pos.w;
				height = height || pos.h;
			}

			// ensure id
			parentNode = d.byId(parentNode);
			var id = parentNode.id ? parentNode.id+'_svgweb' : g._base._getUniqueId();
			
			// create dynamic svg root
			var mockSvg = _createElementNS(svg.xmlns.svg, 'svg');
			mockSvg.id = id;
			mockSvg.setAttribute('width', width);
			mockSvg.setAttribute('height', height);
			svgweb.appendChild(mockSvg, parentNode);

			// notice: any call to the raw node before flash init will fail.
			mockSvg.addEventListener('SVGLoad', function(){
				// become loaded
				s.rawNode = this;
				s.isLoaded = true;
				
				// init defs
				var defNode = _createElementNS(svg.xmlns.svg, "defs");
				s.rawNode.appendChild(defNode);
				s.defNode = defNode;
				
				// notify application
				if (s.onLoad)
					s.onLoad(s);
			}, false);

			// flash not loaded yet
			s.isLoaded = false;
			return s;
		};
		
		// override Surface.destroy()
		svg.Surface.extend({
			destroy: function(){
				var mockSvg = this.rawNode;
				svgweb.removeChild(mockSvg, mockSvg.parentNode);
			}
		});

		// override connect() & disconnect() for Shape & Surface event processing
		var _eventsProcessing = {
			connect: function(name, object, method){
				// connect events using the mock addEventListener() provided by svgweb
				if (name.substring(0, 2)==='on') { name = name.substring(2); }
				if (arguments.length == 2) {
					method = object;
				} else {
					method = d.hitch(object, method);
				}
				this.getEventSource().addEventListener(name, method, false);
				return [this, name, method];
			},
			disconnect: function(token){
				// disconnect events using the mock removeEventListener() provided by svgweb
				this.getEventSource().removeEventListener(token[1], token[2], false);
				delete token[0];
			}
		};
		
		dojo.extend(svg.Shape, _eventsProcessing);
		dojo.extend(svg.Surface, _eventsProcessing);
	}

	// see if we are required to initilize
	if(g.loadAndSwitch === "svg"){
		g.switchTo("svg");
		delete g.loadAndSwitch;
	}
})();

}

if(!dojo._hasResource["dojox.charting.scaler.common"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.scaler.common"] = true;
dojo.provide("dojox.charting.scaler.common");

(function(){
	var eq = function(/*Number*/ a, /*Number*/ b){
		// summary: compare two FP numbers for equality
		return Math.abs(a - b) <= 1e-6 * (Math.abs(a) + Math.abs(b));	// Boolean
	};
	
	dojo.mixin(dojox.charting.scaler.common, {
		findString: function(/*String*/ val, /*Array*/ text){
			val = val.toLowerCase();
			for(var i = 0; i < text.length; ++i){
				if(val == text[i]){ return true; }
			}
			return false;
		},
		getNumericLabel: function(/*Number*/ number, /*Number*/ precision, /*Object*/ kwArgs){
			var def = "";
			if(dojo.number){
				def = (kwArgs.fixed ? dojo.number.format(number, {places : precision < 0 ? -precision : 0}) :
					dojo.number.format(number)) || "";
			}else{
				def = kwArgs.fixed ? number.toFixed(precision < 0 ? -precision : 0) : number.toString();
			}
			if(kwArgs.labelFunc){
				var r = kwArgs.labelFunc(def, number, precision);
				if(r){ return r; }
				// else fall through to the regular labels search
			}
			if(kwArgs.labels){
				// classic binary search
				var l = kwArgs.labels, lo = 0, hi = l.length;
				while(lo < hi){
					var mid = Math.floor((lo + hi) / 2), val = l[mid].value;
					if(val < number){
						lo = mid + 1;
					}else{
						hi = mid;
					}
				}
				// lets take into account FP errors
				if(lo < l.length && eq(l[lo].value, number)){
					return l[lo].text;
				}
				--lo;
				if(lo >= 0 && lo < l.length && eq(l[lo].value, number)){
					return l[lo].text;
				}
				lo += 2;
				if(lo < l.length && eq(l[lo].value, number)){
					return l[lo].text;
				}
				// otherwise we will produce a number
			}
			return def;
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.scaler.linear"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.scaler.linear"] = true;
dojo.provide("dojox.charting.scaler.linear");


(function(){
	var deltaLimit = 3,	// pixels
		dc = dojox.charting, dcs = dc.scaler, dcsc = dcs.common,
		findString = dcsc.findString,
		getLabel = dcsc.getNumericLabel;
	
	var calcTicks = function(min, max, kwArgs, majorTick, minorTick, microTick, span){
		kwArgs = dojo.delegate(kwArgs);
		if(!majorTick){
			if(kwArgs.fixUpper == "major"){ kwArgs.fixUpper = "minor"; }
			if(kwArgs.fixLower == "major"){ kwArgs.fixLower = "minor"; }
		}
		if(!minorTick){
			if(kwArgs.fixUpper == "minor"){ kwArgs.fixUpper = "micro"; }
			if(kwArgs.fixLower == "minor"){ kwArgs.fixLower = "micro"; }
		}
		if(!microTick){
			if(kwArgs.fixUpper == "micro"){ kwArgs.fixUpper = "none"; }
			if(kwArgs.fixLower == "micro"){ kwArgs.fixLower = "none"; }
		}
		var lowerBound = findString(kwArgs.fixLower, ["major"]) ?
				Math.floor(kwArgs.min / majorTick) * majorTick :
					findString(kwArgs.fixLower, ["minor"]) ?
						Math.floor(kwArgs.min / minorTick) * minorTick :
							findString(kwArgs.fixLower, ["micro"]) ?
								Math.floor(kwArgs.min / microTick) * microTick : kwArgs.min,
			upperBound = findString(kwArgs.fixUpper, ["major"]) ?
				Math.ceil(kwArgs.max / majorTick) * majorTick :
					findString(kwArgs.fixUpper, ["minor"]) ?
						Math.ceil(kwArgs.max / minorTick) * minorTick :
							findString(kwArgs.fixUpper, ["micro"]) ?
								Math.ceil(kwArgs.max / microTick) * microTick : kwArgs.max;
								
		if(kwArgs.useMin){ min = lowerBound; }
		if(kwArgs.useMax){ max = upperBound; }
		
		var majorStart = (!majorTick || kwArgs.useMin && findString(kwArgs.fixLower, ["major"])) ?
				min : Math.ceil(min / majorTick) * majorTick,
			minorStart = (!minorTick || kwArgs.useMin && findString(kwArgs.fixLower, ["major", "minor"])) ?
				min : Math.ceil(min / minorTick) * minorTick,
			microStart = (! microTick || kwArgs.useMin && findString(kwArgs.fixLower, ["major", "minor", "micro"])) ?
				min : Math.ceil(min / microTick) * microTick,
			majorCount = !majorTick ? 0 : (kwArgs.useMax && findString(kwArgs.fixUpper, ["major"]) ?
				Math.round((max - majorStart) / majorTick) :
				Math.floor((max - majorStart) / majorTick)) + 1,
			minorCount = !minorTick ? 0 : (kwArgs.useMax && findString(kwArgs.fixUpper, ["major", "minor"]) ?
				Math.round((max - minorStart) / minorTick) :
				Math.floor((max - minorStart) / minorTick)) + 1,
			microCount = !microTick ? 0 : (kwArgs.useMax && findString(kwArgs.fixUpper, ["major", "minor", "micro"]) ?
				Math.round((max - microStart) / microTick) :
				Math.floor((max - microStart) / microTick)) + 1,
			minorPerMajor  = minorTick ? Math.round(majorTick / minorTick) : 0,
			microPerMinor  = microTick ? Math.round(minorTick / microTick) : 0,
			majorPrecision = majorTick ? Math.floor(Math.log(majorTick) / Math.LN10) : 0,
			minorPrecision = minorTick ? Math.floor(Math.log(minorTick) / Math.LN10) : 0,
			scale = span / (max - min);
		if(!isFinite(scale)){ scale = 1; }
		
		return {
			bounds: {
				lower:	lowerBound,
				upper:	upperBound,
				from:	min,
				to:		max,
				scale:	scale,
				span:	span
			},
			major: {
				tick:	majorTick,
				start:	majorStart,
				count:	majorCount,
				prec:	majorPrecision
			},
			minor: {
				tick:	minorTick,
				start:	minorStart,
				count:	minorCount,
				prec:	minorPrecision
			},
			micro: {
				tick:	microTick,
				start:	microStart,
				count:	microCount,
				prec:	0
			},
			minorPerMajor:	minorPerMajor,
			microPerMinor:	microPerMinor,
			scaler:			dcs.linear
		};
	};
	
	dojo.mixin(dojox.charting.scaler.linear, {
		buildScaler: function(/*Number*/ min, /*Number*/ max, /*Number*/ span, /*Object*/ kwArgs){
			var h = {fixUpper: "none", fixLower: "none", natural: false};
			if(kwArgs){
				if("fixUpper" in kwArgs){ h.fixUpper = String(kwArgs.fixUpper); }
				if("fixLower" in kwArgs){ h.fixLower = String(kwArgs.fixLower); }
				if("natural"  in kwArgs){ h.natural  = Boolean(kwArgs.natural); }
			}
			
			// update bounds
			if("min" in kwArgs){ min = kwArgs.min; }
			if("max" in kwArgs){ max = kwArgs.max; }
			if(kwArgs.includeZero){
				if(min > 0){ min = 0; }
				if(max < 0){ max = 0; }
			}
			h.min = min;
			h.useMin = true;
			h.max = max;
			h.useMax = true;
			
			if("from" in kwArgs){
				min = kwArgs.from;
				h.useMin = false;
			}
			if("to" in kwArgs){
				max = kwArgs.to;
				h.useMax = false;
			}
			
			// check for erroneous condition
			if(max <= min){
				return calcTicks(min, max, h, 0, 0, 0, span);	// Object
			}
			
			var mag = Math.floor(Math.log(max - min) / Math.LN10),
				major = kwArgs && ("majorTickStep" in kwArgs) ? kwArgs.majorTickStep : Math.pow(10, mag),
				minor = 0, micro = 0, ticks;
				
			// calculate minor ticks
			if(kwArgs && ("minorTickStep" in kwArgs)){
				minor = kwArgs.minorTickStep;
			}else{
				do{
					minor = major / 10;
					if(!h.natural || minor > 0.9){
						ticks = calcTicks(min, max, h, major, minor, 0, span);
						if(ticks.bounds.scale * ticks.minor.tick > deltaLimit){ break; }
					}
					minor = major / 5;
					if(!h.natural || minor > 0.9){
						ticks = calcTicks(min, max, h, major, minor, 0, span);
						if(ticks.bounds.scale * ticks.minor.tick > deltaLimit){ break; }
					}
					minor = major / 2;
					if(!h.natural || minor > 0.9){
						ticks = calcTicks(min, max, h, major, minor, 0, span);
						if(ticks.bounds.scale * ticks.minor.tick > deltaLimit){ break; }
					}
					return calcTicks(min, max, h, major, 0, 0, span);	// Object
				}while(false);
			}
	
			// calculate micro ticks
			if(kwArgs && ("microTickStep" in kwArgs)){
				micro = kwArgs.microTickStep;
				ticks = calcTicks(min, max, h, major, minor, micro, span);
			}else{
				do{
					micro = minor / 10;
					if(!h.natural || micro > 0.9){
						ticks = calcTicks(min, max, h, major, minor, micro, span);
						if(ticks.bounds.scale * ticks.micro.tick > deltaLimit){ break; }
					}
					micro = minor / 5;
					if(!h.natural || micro > 0.9){
						ticks = calcTicks(min, max, h, major, minor, micro, span);
						if(ticks.bounds.scale * ticks.micro.tick > deltaLimit){ break; }
					}
					micro = minor / 2;
					if(!h.natural || micro > 0.9){
						ticks = calcTicks(min, max, h, major, minor, micro, span);
						if(ticks.bounds.scale * ticks.micro.tick > deltaLimit){ break; }
					}
					micro = 0;
				}while(false);
			}
	
			return micro ? ticks : calcTicks(min, max, h, major, minor, 0, span);	// Object
		},
		buildTicks: function(/*Object*/ scaler, /*Object*/ kwArgs){
			var step, next, tick,
				nextMajor = scaler.major.start,
				nextMinor = scaler.minor.start,
				nextMicro = scaler.micro.start;
			if(kwArgs.microTicks && scaler.micro.tick){
				step = scaler.micro.tick, next = nextMicro;
			}else if(kwArgs.minorTicks && scaler.minor.tick){
				step = scaler.minor.tick, next = nextMinor;
			}else if(scaler.major.tick){
				step = scaler.major.tick, next = nextMajor;
			}else{
				// no ticks
				return null;
			}
			// make sure that we have finite bounds
			var revScale = 1 / scaler.bounds.scale;
			if(scaler.bounds.to <= scaler.bounds.from || isNaN(revScale) || !isFinite(revScale) ||
					step <= 0 || isNaN(step) || !isFinite(step)){
				// no ticks
				return null;
			}
			// loop over all ticks
			var majorTicks = [], minorTicks = [], microTicks = [];
			while(next <= scaler.bounds.to + revScale){
				if(Math.abs(nextMajor - next) < step / 2){
					// major tick
					tick = {value: nextMajor};
					if(kwArgs.majorLabels){
						tick.label = getLabel(nextMajor, scaler.major.prec, kwArgs);
					}
					majorTicks.push(tick);
					nextMajor += scaler.major.tick;
					nextMinor += scaler.minor.tick;
					nextMicro += scaler.micro.tick;
				}else if(Math.abs(nextMinor - next) < step / 2){
					// minor tick
					if(kwArgs.minorTicks){
						tick = {value: nextMinor};
						if(kwArgs.minorLabels && (scaler.minMinorStep <= scaler.minor.tick * scaler.bounds.scale)){
							tick.label = getLabel(nextMinor, scaler.minor.prec, kwArgs);
						}
						minorTicks.push(tick);
					}
					nextMinor += scaler.minor.tick;
					nextMicro += scaler.micro.tick;
				}else{
					// micro tick
					if(kwArgs.microTicks){
						microTicks.push({value: nextMicro});
					}
					nextMicro += scaler.micro.tick;
				}
				next += step;
			}
			return {major: majorTicks, minor: minorTicks, micro: microTicks};	// Object
		},
		getTransformerFromModel: function(/*Object*/ scaler){
			var offset = scaler.bounds.from, scale = scaler.bounds.scale;
			return function(x){ return (x - offset) * scale; };	// Function
		},
		getTransformerFromPlot: function(/*Object*/ scaler){
			var offset = scaler.bounds.from, scale = scaler.bounds.scale;
			return function(x){ return x / scale + offset; };	// Function
		}
	});
})();

}

if(!dojo._hasResource["dojox.gfx"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.gfx"] = true;
dojo.provide("dojox.gfx");




dojo.loadInit(function(){
	// Since loaderInit can be fired before any dojo.provide/require calls,
	// make sure the dojox.gfx object exists and only run this logic if dojox.gfx.renderer
	// has not been defined yet.
	var gfx = dojo.getObject("dojox.gfx", true), sl, flag, match;
	while(!gfx.renderer){
		// Have a way to force a GFX renderer, if so desired.
		// Useful for being able to serialize GFX data in a particular format.
		if(dojo.config.forceGfxRenderer){
			dojox.gfx.renderer = dojo.config.forceGfxRenderer;
			break;
		}
		var renderers = (typeof dojo.config.gfxRenderer == "string" ?
			dojo.config.gfxRenderer : "svg,vml,canvas,silverlight").split(",");
		for(var i = 0; i < renderers.length; ++i){
			switch(renderers[i]){
				case "svg":
					// the next test is from https://github.com/phiggins42/has.js
					if("SVGAngle" in dojo.global){
						dojox.gfx.renderer = "svg";
					}
					break;
				case "vml":
					if(dojo.isIE){
						dojox.gfx.renderer = "vml";
					}
					break;
				case "silverlight":
					try{
						if(dojo.isIE){
							sl = new ActiveXObject("AgControl.AgControl");
							if(sl && sl.IsVersionSupported("1.0")){
								flag = true;
							}
						}else{
							if(navigator.plugins["Silverlight Plug-In"]){
								flag = true;
							}
						}
					}catch(e){
						flag = false;
					}finally{
						sl = null;
					}
					if(flag){
						dojox.gfx.renderer = "silverlight";
					}
					break;
				case "canvas":
					if(dojo.global.CanvasRenderingContext2D){
						dojox.gfx.renderer = "canvas";
					}
					break;
			}
			if(gfx.renderer){
				break;
			}
		}
		break;
	}
	
	if(dojo.config.isDebug){
		console.log("gfx renderer = " + gfx.renderer);
	}

	// load & initialize renderer
	if(gfx[gfx.renderer]){
		// already loaded
		gfx.switchTo(gfx.renderer);
	}else{
		// load
		gfx.loadAndSwitch = gfx.renderer;
		dojo["require"]("dojox.gfx." + gfx.renderer);
	}
});

}

if(!dojo._hasResource["dojox.charting.axis2d.common"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.axis2d.common"] = true;
dojo.provide("dojox.charting.axis2d.common");



(function(){
	var g = dojox.gfx;

	var clearNode = function(s){
		s.marginLeft   = "0px";
		s.marginTop    = "0px";
		s.marginRight  = "0px";
		s.marginBottom = "0px";
		s.paddingLeft   = "0px";
		s.paddingTop    = "0px";
		s.paddingRight  = "0px";
		s.paddingBottom = "0px";
		s.borderLeftWidth   = "0px";
		s.borderTopWidth    = "0px";
		s.borderRightWidth  = "0px";
		s.borderBottomWidth = "0px";
	};

	var getBoxWidth = function(n){
		// marginBox is incredibly slow, so avoid it if we can
		if(n["getBoundingClientRect"]){
			var bcr = n.getBoundingClientRect();
			return bcr.width || (bcr.right - bcr.left);
		}else{
			return dojo.marginBox(n).w;
		}
	};

	dojo.mixin(dojox.charting.axis2d.common, {
		//	summary:
		//		Common methods to be used by any axis.  This is considered "static".
		createText: {
			gfx: function(chart, creator, x, y, align, text, font, fontColor){
				//	summary:
				//		Use dojox.gfx to create any text.
				//	chart: dojox.charting.Chart2D
				//		The chart to create the text into.
				//	creator: dojox.gfx.Surface
				//		The graphics surface to use for creating the text.
				//	x: Number
				//		Where to create the text along the x axis (CSS left).
				//	y: Number
				//		Where to create the text along the y axis (CSS top).
				//	align: String
				//		How to align the text.  Can be "left", "right", "center".
				//	text: String
				//		The text to render.
				//	font: String
				//		The font definition, a la CSS "font".
				//	fontColor: String|dojo.Color
				//		The color of the resultant text.
				//	returns: dojox.gfx.Text
				//		The resultant GFX object.
				return creator.createText({
					x: x, y: y, text: text, align: align
				}).setFont(font).setFill(fontColor);	//	dojox.gfx.Text
			},
			html: function(chart, creator, x, y, align, text, font, fontColor, labelWidth){
				//	summary:
				//		Use the HTML DOM to create any text.
				//	chart: dojox.charting.Chart2D
				//		The chart to create the text into.
				//	creator: dojox.gfx.Surface
				//		The graphics surface to use for creating the text.
				//	x: Number
				//		Where to create the text along the x axis (CSS left).
				//	y: Number
				//		Where to create the text along the y axis (CSS top).
				//	align: String
				//		How to align the text.  Can be "left", "right", "center".
				//	text: String
				//		The text to render.
				//	font: String
				//		The font definition, a la CSS "font".
				//	fontColor: String|dojo.Color
				//		The color of the resultant text.
				//	labelWidth: Number?
				//		The maximum width of the resultant DOM node.
				//	returns: DOMNode
				//		The resultant DOMNode (a "div" element).

				// setup the text node
				var p = dojo.doc.createElement("div"), s = p.style, boxWidth;
				clearNode(s);
				s.font = font;
				p.innerHTML = String(text).replace(/\s/g, "&nbsp;");
				s.color = fontColor;
				// measure the size
				s.position = "absolute";
				s.left = "-10000px";
				dojo.body().appendChild(p);
				var size = g.normalizedLength(g.splitFontString(font).size);

				// do we need to calculate the label width?
				if(!labelWidth){
					boxWidth = getBoxWidth(p);
				}

				// new settings for the text node
				dojo.body().removeChild(p);

				s.position = "relative";
				if(labelWidth){
					s.width = labelWidth + "px";
					// s.border = "1px dotted grey";
					switch(align){
						case "middle":
							s.textAlign = "center";
							s.left = (x - labelWidth / 2) + "px";
							break;
						case "end":
							s.textAlign = "right";
							s.left = (x - labelWidth) + "px";
							break;
						default:
							s.left = x + "px";
							s.textAlign = "left";
							break;
					}
				}else{
					switch(align){
						case "middle":
							s.left = Math.floor(x - boxWidth / 2) + "px";
							// s.left = Math.floor(x - p.offsetWidth / 2) + "px";
							break;
						case "end":
							s.left = Math.floor(x - boxWidth) + "px";
							// s.left = Math.floor(x - p.offsetWidth) + "px";
							break;
						//case "start":
						default:
							s.left = Math.floor(x) + "px";
							break;
					}
				}
				s.top = Math.floor(y - size) + "px";
				s.whiteSpace = "nowrap";	// hack for WebKit
				// setup the wrapper node
				var wrap = dojo.doc.createElement("div"), w = wrap.style;
				clearNode(w);
				w.width = "0px";
				w.height = "0px";
				// insert nodes
				wrap.appendChild(p)
				chart.node.insertBefore(wrap, chart.node.firstChild);
				return wrap;	//	DOMNode
			}
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.Element"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.Element"] = true;
dojo.provide("dojox.charting.Element");



dojo.declare("dojox.charting.Element", null, {
	//	summary:
	//		A base class that is used to build other elements of a chart, such as
	//		a series.
	//	chart: dojox.charting.Chart2D
	//		The parent chart for this element.
	//	group: dojox.gfx.Group
	//		The visual GFX group representing this element.
	//	htmlElement: Array
	//		Any DOMNodes used as a part of this element (such as HTML-based labels).
	//	dirty: Boolean
	//		A flag indicating whether or not this element needs to be rendered.

	chart: null,
	group: null,
	htmlElements: null,
	dirty: true,

	constructor: function(chart){
		//	summary:
		//		Creates a new charting element.
		//	chart: dojox.charting.Chart2D
		//		The chart that this element belongs to.
		this.chart = chart;
		this.group = null;
		this.htmlElements = [];
		this.dirty = true;
		this.trailingSymbol = "...";
		this._events = [];
	},
	createGroup: function(creator){
		//	summary:
		//		Convenience function to create a new dojox.gfx.Group.
		//	creator: dojox.gfx.Surface?
		//		An optional surface in which to create this group.
		//	returns: dojox.charting.Element
		//		A reference to this object for functional chaining.
		if(!creator){ creator = this.chart.surface; }
		if(!this.group){
			this.group = creator.createGroup();
		}
		return this;	//	dojox.charting.Element
	},
	purgeGroup: function(){
		//	summary:
		//		Clear any elements out of our group, and destroy the group.
		//	returns: dojox.charting.Element
		//		A reference to this object for functional chaining.
		this.destroyHtmlElements();
		if(this.group){
			this.group.clear();
			this.group.removeShape();
			this.group = null;
		}
		this.dirty = true;
		if(this._events.length){
			dojo.forEach(this._events, function(item){
				item.shape.disconnect(item.handle);
			});
			this._events = [];
		}
		return this;	//	dojox.charting.Element
	},
	cleanGroup: function(creator){
		//	summary:
		//		Clean any elements (HTML or GFX-based) out of our group, and create a new one.
		//	creator: dojox.gfx.Surface?
		//		An optional surface to work with.
		//	returns: dojox.charting.Element
		//		A reference to this object for functional chaining.
		this.destroyHtmlElements();
		if(!creator){ creator = this.chart.surface; }
		if(this.group){
			this.group.clear();
		}else{
			this.group = creator.createGroup();
		}
		this.dirty = true;
		return this;	//	dojox.charting.Element
	},
	destroyHtmlElements: function(){
		//	summary:
		//		Destroy any DOMNodes that may have been created as a part of this element.
		if(this.htmlElements.length){
			dojo.forEach(this.htmlElements, dojo.destroy);
			this.htmlElements = [];
		}
	},
	destroy: function(){
		//	summary:
		//		API addition to conform to the rest of the Dojo Toolkit's standard.
		this.purgeGroup();
	},
	//text utilities
	getTextWidth: function(s, font){
		return dojox.gfx._base._getTextBox(s, {font: font}).w || 0;
	},
	getTextWithLimitLength: function(s, font, limitWidth, truncated){
		//	summary:
		//		Get the truncated string based on the limited width in px(dichotomy algorithm)
		//	s: String?
		//		candidate text.
		//	font: String?
		//		text's font style.
		//	limitWidth: Number?
		//		text limited width in px.
		//	truncated: Boolean?
		//		whether the input text(s) has already been truncated.
		//	returns: Object
		//		{
		//			text: processed text, maybe truncated or not
		//			truncated: whether text has been truncated
		//		}
		if (!s || s.length <= 0) {
			return {
				text: "",
				truncated: truncated || false
			};
		}
		if(!limitWidth || limitWidth <= 0){
			return {
				text: s,
				truncated: truncated || false
			};
		}
		var delta = 2,
			//golden section for dichotomy algorithm
			trucPercentage = 0.618,
			minStr = s.substring(0,1) + this.trailingSymbol,
			minWidth = this.getTextWidth(minStr, font);
		if (limitWidth <= minWidth) {
			return {
				text: minStr,
				truncated: true
			};
		}
		var width = this.getTextWidth(s, font);
		if(width <= limitWidth){
			return {
				text: s,
				truncated: truncated || false
			};
		}else{
			var begin = 0,
				end = s.length;
			while(begin < end){
				if(end - begin <= delta ){
					while (this.getTextWidth(s.substring(0, begin) + this.trailingSymbol, font) > limitWidth) {
						begin -= 1;
					}
					return {
						text: (s.substring(0,begin) + this.trailingSymbol),
						truncated: true
					};
				}
				var index = begin + Math.round((end - begin) * trucPercentage),
					widthIntercepted = this.getTextWidth(s.substring(0, index), font);
				if(widthIntercepted < limitWidth){
					begin = index;
					end = end;
				}else{
					begin = begin;
					end = index;
				}
			}
		}
	},
	getTextWithLimitCharCount: function(s, font, wcLimit, truncated){
		//	summary:
		//		Get the truncated string based on the limited character count(dichotomy algorithm)
		//	s: String?
		//		candidate text.
		//	font: String?
		//		text's font style.
		//	wcLimit: Number?
		//		text limited character count.
		//	truncated: Boolean?
		//		whether the input text(s) has already been truncated.
		//	returns: Object
		//		{
		//			text: processed text, maybe truncated or not
		//			truncated: whether text has been truncated
		//		}
		if (!s || s.length <= 0) {
			return {
				text: "",
				truncated: truncated || false
			};
		}
		if(!wcLimit || wcLimit <= 0 || s.length <= wcLimit){
			return {
				text: s,
				truncated: truncated || false
			};
		}
		return {
			text: s.substring(0, wcLimit) + this.trailingSymbol,
			truncated: true
		};
	},
	// fill utilities
	_plotFill: function(fill, dim, offsets){
		// process a plot-wide fill
		if(!fill || !fill.type || !fill.space){
			return fill;
		}
		var space = fill.space;
		switch(fill.type){
			case "linear":
				if(space === "plot" || space === "shapeX" || space === "shapeY"){
					// clone a fill so we can modify properly directly
					fill = dojox.gfx.makeParameters(dojox.gfx.defaultLinearGradient, fill);
					fill.space = space;
					// process dimensions
					if(space === "plot" || space === "shapeX"){
						// process Y
						var span = dim.height - offsets.t - offsets.b;
						fill.y1 = offsets.t + span * fill.y1 / 100;
						fill.y2 = offsets.t + span * fill.y2 / 100;
					}
					if(space === "plot" || space === "shapeY"){
						// process X
						var span = dim.width - offsets.l - offsets.r;
						fill.x1 = offsets.l + span * fill.x1 / 100;
						fill.x2 = offsets.l + span * fill.x2 / 100;
					}
				}
				break;
			case "radial":
				if(space === "plot"){
					// this one is used exclusively for scatter charts
					// clone a fill so we can modify properly directly
					fill = dojox.gfx.makeParameters(dojox.gfx.defaultRadialGradient, fill);
					fill.space = space;
					// process both dimensions
					var spanX = dim.width  - offsets.l - offsets.r,
						spanY = dim.height - offsets.t - offsets.b;
					fill.cx = offsets.l + spanX * fill.cx / 100;
					fill.cy = offsets.t + spanY * fill.cy / 100;
					fill.r  = fill.r * Math.sqrt(spanX * spanX + spanY * spanY) / 200;
				}
				break;
			case "pattern":
				if(space === "plot" || space === "shapeX" || space === "shapeY"){
					// clone a fill so we can modify properly directly
					fill = dojox.gfx.makeParameters(dojox.gfx.defaultPattern, fill);
					fill.space = space;
					// process dimensions
					if(space === "plot" || space === "shapeX"){
						// process Y
						var span = dim.height - offsets.t - offsets.b;
						fill.y = offsets.t + span * fill.y / 100;
						fill.height = span * fill.height / 100;
					}
					if(space === "plot" || space === "shapeY"){
						// process X
						var span = dim.width - offsets.l - offsets.r;
						fill.x = offsets.l + span * fill.x / 100;
						fill.width = span * fill.width / 100;
					}
				}
				break;
		}
		return fill;
	},
	_shapeFill: function(fill, bbox){
		// process shape-specific fill
		if(!fill || !fill.space){
			return fill;
		}
		var space = fill.space;
		switch(fill.type){
			case "linear":
				if(space === "shape" || space === "shapeX" || space === "shapeY"){
					// clone a fill so we can modify properly directly
					fill = dojox.gfx.makeParameters(dojox.gfx.defaultLinearGradient, fill);
					fill.space = space;
					// process dimensions
					if(space === "shape" || space === "shapeX"){
						// process X
						var span = bbox.width;
						fill.x1 = bbox.x + span * fill.x1 / 100;
						fill.x2 = bbox.x + span * fill.x2 / 100;
					}
					if(space === "shape" || space === "shapeY"){
						// process Y
						var span = bbox.height;
						fill.y1 = bbox.y + span * fill.y1 / 100;
						fill.y2 = bbox.y + span * fill.y2 / 100;
					}
				}
				break;
			case "radial":
				if(space === "shape"){
					// this one is used exclusively for bubble charts and pie charts
					// clone a fill so we can modify properly directly
					fill = dojox.gfx.makeParameters(dojox.gfx.defaultRadialGradient, fill);
					fill.space = space;
					// process both dimensions
					fill.cx = bbox.x + bbox.width  / 2;
					fill.cy = bbox.y + bbox.height / 2;
					fill.r  = fill.r * bbox.width  / 200;
				}
				break;
			case "pattern":
				if(space === "shape" || space === "shapeX" || space === "shapeY"){
					// clone a fill so we can modify properly directly
					fill = dojox.gfx.makeParameters(dojox.gfx.defaultPattern, fill);
					fill.space = space;
					// process dimensions
					if(space === "shape" || space === "shapeX"){
						// process X
						var span = bbox.width;
						fill.x = bbox.x + span * fill.x / 100;
						fill.width = span * fill.width / 100;
					}
					if(space === "shape" || space === "shapeY"){
						// process Y
						var span = bbox.height;
						fill.y = bbox.y + span * fill.y / 100;
						fill.height = span * fill.height / 100;
					}
				}
				break;
		}
		return fill;
	},
	_pseudoRadialFill: function(fill, center, radius, start, end){
		// process pseudo-radial fills
		if(!fill || fill.type !== "radial" || fill.space !== "shape"){
			return fill;
		}
		// clone and normalize fill
		var space = fill.space;
		fill = dojox.gfx.makeParameters(dojox.gfx.defaultRadialGradient, fill);
		fill.space = space;
		if(arguments.length < 4){
			// process both dimensions
			fill.cx = center.x;
			fill.cy = center.y;
			fill.r  = fill.r * radius / 100;
			return fill;
		}
		// convert to a linear gradient
		var angle = arguments.length < 5 ? start : (end + start) / 2;
		return {
			type: "linear",
			x1: center.x,
			y1: center.y,
			x2: center.x + fill.r * radius * Math.cos(angle) / 100,
			y2: center.y + fill.r * radius * Math.sin(angle) / 100,
			colors: fill.colors
		};
		return fill;
	}
});

}

if(!dojo._hasResource["dojox.charting.axis2d.Base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.axis2d.Base"] = true;
dojo.provide("dojox.charting.axis2d.Base");



dojo.declare("dojox.charting.axis2d.Base", dojox.charting.Element, {
	//	summary:
	//		The base class for any axis.  This is more of an interface/API
	//		definition than anything else; see dojox.charting.axis2d.Default
	//		for more details.
	constructor: function(chart, kwArgs){
		//	summary:
		//		Return a new base axis.
		//	chart: dojox.charting.Chart2D
		//		The chart this axis belongs to.
		//	kwArgs: dojox.charting.axis2d.__AxisCtorArgs?
		//		An optional arguments object to define the axis parameters.
		this.vertical = kwArgs && kwArgs.vertical;
	},
	clear: function(){
		//	summary:
		//		Stub function for clearing the axis.
		//	returns: dojox.charting.axis2d.Base
		//		A reference to the axis for functional chaining.
		return this;	//	dojox.charting.axis2d.Base
	},
	initialized: function(){
		//	summary:
		//		Return a flag as to whether or not this axis has been initialized.
		//	returns: Boolean
		//		If the axis is initialized or not.
		return false;	//	Boolean
	},
	calculate: function(min, max, span){
		//	summary:
		//		Stub function to run the calcuations needed for drawing this axis.
		//	returns: dojox.charting.axis2d.Base
		//		A reference to the axis for functional chaining.
		return this;	//	dojox.charting.axis2d.Base
	},
	getScaler: function(){
		//	summary:
		//		A stub function to return the scaler object created during calculate.
		//	returns: Object
		//		The scaler object (see dojox.charting.scaler.linear for more information)
		return null;	//	Object
	},
	getTicks: function(){
		//	summary:
		//		A stub function to return the object that helps define how ticks are rendered.
		//	returns: Object
		//		The ticks object.
		return null;	//	Object
	},
	getOffsets: function(){
		//	summary:
		//		A stub function to return any offsets needed for axis and series rendering.
		//	returns: Object
		//		An object of the form { l, r, t, b }.
		return {l: 0, r: 0, t: 0, b: 0};	//	Object
	},
	render: function(dim, offsets){
		//	summary:
		//		Stub function to render this axis.
		//	returns: dojox.charting.axis2d.Base
		//		A reference to the axis for functional chaining.
		this.dirty = false;
		return this;	//	dojox.charting.axis2d.Base
	}
});

}

if(!dojo._hasResource["dojox.lang.functional.lambda"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.functional.lambda"] = true;
dojo.provide("dojox.lang.functional.lambda");

// This module adds high-level functions and related constructs:
//	- anonymous functions built from the string

// Acknoledgements:
//	- lambda() is based on work by Oliver Steele
//		(http://osteele.com/sources/javascript/functional/functional.js)
//		which was published under MIT License

// Notes:
//	- lambda() produces functions, which after the compilation step are
//		as fast as regular JS functions (at least theoretically).

// Lambda input values:
//	- returns functions unchanged
//	- converts strings to functions
//	- converts arrays to a functional composition

(function(){
	var df = dojox.lang.functional, lcache = {};

	// split() is augmented on IE6 to ensure the uniform behavior
	var split = "ab".split(/a*/).length > 1 ? String.prototype.split :
			function(sep){
				 var r = this.split.call(this, sep),
					 m = sep.exec(this);
				 if(m && m.index == 0){ r.unshift(""); }
				 return r;
			};
			
	var lambda = function(/*String*/ s){
		var args = [], sects = split.call(s, /\s*->\s*/m);
		if(sects.length > 1){
			while(sects.length){
				s = sects.pop();
				args = sects.pop().split(/\s*,\s*|\s+/m);
				if(sects.length){ sects.push("(function(" + args + "){return (" + s + ")})"); }
			}
		}else if(s.match(/\b_\b/)){
			args = ["_"];
		}else{
			var l = s.match(/^\s*(?:[+*\/%&|\^\.=<>]|!=)/m),
				r = s.match(/[+\-*\/%&|\^\.=<>!]\s*$/m);
			if(l || r){
				if(l){
					args.push("$1");
					s = "$1" + s;
				}
				if(r){
					args.push("$2");
					s = s + "$2";
				}
			}else{
				// the point of the long regex below is to exclude all well-known
				// lower-case words from the list of potential arguments
				var vars = s.
					replace(/(?:\b[A-Z]|\.[a-zA-Z_$])[a-zA-Z_$\d]*|[a-zA-Z_$][a-zA-Z_$\d]*:|this|true|false|null|undefined|typeof|instanceof|in|delete|new|void|arguments|decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|escape|eval|isFinite|isNaN|parseFloat|parseInt|unescape|dojo|dijit|dojox|window|document|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "").
					match(/([a-z_$][a-z_$\d]*)/gi) || [], t = {};
				dojo.forEach(vars, function(v){
					if(!(v in t)){
						args.push(v);
						t[v] = 1;
					}
				});
			}
		}
		return {args: args, body: s};	// Object
	};

	var compose = function(/*Array*/ a){
		return a.length ?
					function(){
						var i = a.length - 1, x = df.lambda(a[i]).apply(this, arguments);
						for(--i; i >= 0; --i){ x = df.lambda(a[i]).call(this, x); }
						return x;
					}
				:
					// identity
					function(x){ return x; };
	};

	dojo.mixin(df, {
		// lambda
		rawLambda: function(/*String*/ s){
			// summary:
			//		builds a function from a snippet, or array (composing),
			//		returns an object describing the function; functions are
			//		passed through unmodified.
			// description:
			//		This method is to normalize a functional representation (a
			//		text snippet) to an object that contains an array of
			//		arguments, and a body , which is used to calculate the
			//		returning value.
			return lambda(s);	// Object
		},
		buildLambda: function(/*String*/ s){
			// summary:
			//		builds a function from a snippet, returns a string, which
			//		represents the function.
			// description:
			//		This method returns a textual representation of a function
			//		built from the snippet. It is meant to be evaled in the
			//		proper context, so local variables can be pulled from the
			//		environment.
			s = lambda(s);
			return "function(" + s.args.join(",") + "){return (" + s.body + ");}";	// String
		},
		lambda: function(/*Function|String|Array*/ s){
			// summary:
			//		builds a function from a snippet, or array (composing),
			//		returns a function object; functions are passed through
			//		unmodified.
			// description:
			//		This method is used to normalize a functional
			//		representation (a text snippet, an array, or a function) to
			//		a function object.
			if(typeof s == "function"){ return s; }
			if(s instanceof Array){ return compose(s); }
			if(s in lcache){ return lcache[s]; }
			s = lambda(s);
			return lcache[s] = new Function(s.args, "return (" + s.body + ");");	// Function
		},
		clearLambdaCache: function(){
			// summary:
			//		clears internal cache of lambdas
			lcache = {};
		}
	});
})();

}

if(!dojo._hasResource["dojox.lang.functional.array"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.functional.array"] = true;
dojo.provide("dojox.lang.functional.array");



// This module adds high-level functions and related constructs:
//	- array-processing functions similar to standard JS functions

// Notes:
//	- this module provides JS standard methods similar to high-level functions in dojo/_base/array.js:
//		forEach, map, filter, every, some

// Defined methods:
//	- take any valid lambda argument as the functional argument
//	- operate on dense arrays
//	- take a string as the array argument
//	- take an iterator objects as the array argument

(function(){
	var d = dojo, df = dojox.lang.functional, empty = {};

	d.mixin(df, {
		// JS 1.6 standard array functions, which can take a lambda as a parameter.
		// Consider using dojo._base.array functions, if you don't need the lambda support.
		filter: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: creates a new array with all elements that pass the test
			//	implemented by the provided function.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var t = [], v, i, n;
			if(d.isArray(a)){
				// array
				for(i = 0, n = a.length; i < n; ++i){
					v = a[i];
					if(f.call(o, v, i, a)){ t.push(v); }
				}
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				for(i = 0; a.hasNext();){
					v = a.next();
					if(f.call(o, v, i++, a)){ t.push(v); }
				}
			}else{
				// object/dictionary
				for(i in a){
					if(!(i in empty)){
						v = a[i];
						if(f.call(o, v, i, a)){ t.push(v); }
					}
				}
			}
			return t;	// Array
		},
		forEach: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: executes a provided function once per array element.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var i, n;
			if(d.isArray(a)){
				// array
				for(i = 0, n = a.length; i < n; f.call(o, a[i], i, a), ++i);
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				for(i = 0; a.hasNext(); f.call(o, a.next(), i++, a));
			}else{
				// object/dictionary
				for(i in a){
					if(!(i in empty)){
						f.call(o, a[i], i, a);
					}
				}
			}
			return o;	// Object
		},
		map: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: creates a new array with the results of calling
			//	a provided function on every element in this array.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var t, n, i;
			if(d.isArray(a)){
				// array
				t = new Array(n = a.length);
				for(i = 0; i < n; t[i] = f.call(o, a[i], i, a), ++i);
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				t = [];
				for(i = 0; a.hasNext(); t.push(f.call(o, a.next(), i++, a)));
			}else{
				// object/dictionary
				t = [];
				for(i in a){
					if(!(i in empty)){
						t.push(f.call(o, a[i], i, a));
					}
				}
			}
			return t;	// Array
		},
		every: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: tests whether all elements in the array pass the test
			//	implemented by the provided function.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var i, n;
			if(d.isArray(a)){
				// array
				for(i = 0, n = a.length; i < n; ++i){
					if(!f.call(o, a[i], i, a)){
						return false;	// Boolean
					}
				}
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				for(i = 0; a.hasNext();){
					if(!f.call(o, a.next(), i++, a)){
						return false;	// Boolean
					}
				}
			}else{
				// object/dictionary
				for(i in a){
					if(!(i in empty)){
						if(!f.call(o, a[i], i, a)){
							return false;	// Boolean
						}
					}
				}
			}
			return true;	// Boolean
		},
		some: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: tests whether some element in the array passes the test
			//	implemented by the provided function.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var i, n;
			if(d.isArray(a)){
				// array
				for(i = 0, n = a.length; i < n; ++i){
					if(f.call(o, a[i], i, a)){
						return true;	// Boolean
					}
				}
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				for(i = 0; a.hasNext();){
					if(f.call(o, a.next(), i++, a)){
						return true;	// Boolean
					}
				}
			}else{
				// object/dictionary
				for(i in a){
					if(!(i in empty)){
						if(f.call(o, a[i], i, a)){
							return true;	// Boolean
						}
					}
				}
			}
			return false;	// Boolean
		}
	});
})();

}

if(!dojo._hasResource["dojox.lang.functional.object"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.functional.object"] = true;
dojo.provide("dojox.lang.functional.object");



// This module adds high-level functions and related constructs:
//	- object/dictionary helpers

// Defined methods:
//	- take any valid lambda argument as the functional argument
//	- skip all attributes that are present in the empty object
//		(IE and/or 3rd-party libraries).

(function(){
	var d = dojo, df = dojox.lang.functional, empty = {};

	d.mixin(df, {
		// object helpers
		keys: function(/*Object*/ obj){
			// summary: returns an array of all keys in the object
			var t = [];
			for(var i in obj){
				if(!(i in empty)){
					t.push(i);
				}
			}
			return	t; // Array
		},
		values: function(/*Object*/ obj){
			// summary: returns an array of all values in the object
			var t = [];
			for(var i in obj){
				if(!(i in empty)){
					t.push(obj[i]);
				}
			}
			return	t; // Array
		},
		filterIn: function(/*Object*/ obj, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: creates new object with all attributes that pass the test
			//	implemented by the provided function.
			o = o || d.global; f = df.lambda(f);
			var t = {}, v, i;
			for(i in obj){
				if(!(i in empty)){
					v = obj[i];
					if(f.call(o, v, i, obj)){ t[i] = v; }
				}
			}
			return t;	// Object
		},
		forIn: function(/*Object*/ obj, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: iterates over all object attributes.
			o = o || d.global; f = df.lambda(f);
			for(var i in obj){
				if(!(i in empty)){
					f.call(o, obj[i], i, obj);
				}
			}
			return o;	// Object
		},
		mapIn: function(/*Object*/ obj, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: creates new object with the results of calling
			//	a provided function on every attribute in this object.
			o = o || d.global; f = df.lambda(f);
			var t = {}, i;
			for(i in obj){
				if(!(i in empty)){
					t[i] = f.call(o, obj[i], i, obj);
				}
			}
			return t;	// Object
		}
	});
})();

}

if(!dojo._hasResource["dojox.lang.functional"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.functional"] = true;
dojo.provide("dojox.lang.functional");





}

if(!dojo._hasResource["dojox.lang.utils"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.utils"] = true;
dojo.provide("dojox.lang.utils");

(function(){
	var empty = {}, du = dojox.lang.utils, opts = Object.prototype.toString;

	var clone = function(o){
		if(o){
			switch(opts.call(o)){
				case "[object Array]":
					return o.slice(0);
				case "[object Object]":
					return dojo.delegate(o);
			}
		}
		return o;
	}
	
	dojo.mixin(du, {
		coerceType: function(target, source){
			// summary: Coerces one object to the type of another.
			// target: Object: object, which typeof result is used to coerce "source" object.
			// source: Object: object, which will be forced to change type.
			switch(typeof target){
				case "number":	return Number(eval("(" + source + ")"));
				case "string":	return String(source);
				case "boolean":	return Boolean(eval("(" + source + ")"));
			}
			return eval("(" + source + ")");
		},
		
		updateWithObject: function(target, source, conv){
			// summary: Updates an existing object in place with properties from an "source" object.
			// target: Object: the "target" object to be updated
			// source: Object: the "source" object, whose properties will be used to source the existed object.
			// conv: Boolean?: force conversion to the original type
			if(!source){ return target; }
			for(var x in target){
				if(x in source && !(x in empty)){
					var t = target[x];
					if(t && typeof t == "object"){
						du.updateWithObject(t, source[x], conv);
					}else{
						target[x] = conv ? du.coerceType(t, source[x]) : clone(source[x]);
					}
				}
			}
			return target;	// Object
		},
	
		updateWithPattern: function(target, source, pattern, conv){
			// summary: Updates an existing object in place with properties from an "source" object.
			// target: Object: the "target" object to be updated
			// source: Object: the "source" object, whose properties will be used to source the existed object.
			// pattern: Object: object, whose properties will be used to pull values from the "source"
			// conv: Boolean?: force conversion to the original type
			if(!source || !pattern){ return target; }
			for(var x in pattern){
				if(x in source && !(x in empty)){
					target[x] = conv ? du.coerceType(pattern[x], source[x]) : clone(source[x]);
				}
			}
			return target;	// Object
		},
		
		merge: function(object, mixin){
			// summary: Merge two objects structurally, mixin properties will override object's properties.
			// object: Object: original object.
			// mixin: Object: additional object, which properties will override object's properties.
			if(mixin){
				var otype = opts.call(object), mtype = opts.call(mixin), t, i, l, m;
				switch(mtype){
					case "[object Array]":
						if(mtype == otype){
							t = new Array(Math.max(object.length, mixin.length));
							for(i = 0, l = t.length; i < l; ++i){
								t[i] = du.merge(object[i], mixin[i]);
							}
							return t;
						}
						return mixin.slice(0);
					case "[object Object]":
						if(mtype == otype && object){
							t = dojo.delegate(object);
							for(i in mixin){
								if(i in object){
									l = object[i];
									m = mixin[i];
									if(m !== l){
										t[i] = du.merge(l, m);
									}
								}else{
									t[i] = dojo.clone(mixin[i]);
								}
							}
							return t;
						}
						return dojo.clone(mixin);
				}
			}
			return mixin;
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.axis2d.Invisible"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.axis2d.Invisible"] = true;
dojo.provide("dojox.charting.axis2d.Invisible");










(function(){
	var dc = dojox.charting,
		df = dojox.lang.functional,
		du = dojox.lang.utils,
		g = dojox.gfx,
		lin = dc.scaler.linear,
		merge = du.merge,
		labelGap = 4,			// in pixels
		centerAnchorLimit = 45;	// in degrees

	dojo.declare("dojox.charting.axis2d.Invisible", dojox.charting.axis2d.Base, {
		//	summary:
		//		The default axis object used in dojox.charting.  See dojox.charting.Chart2D.addAxis for details.
		//
		//	defaultParams: Object
		//		The default parameters used to define any axis.
		//	optionalParams: Object
		//		Any optional parameters needed to define an axis.

		/*
		//	TODO: the documentation tools need these to be pre-defined in order to pick them up
		//	correctly, but the code here is partially predicated on whether or not the properties
		//	actually exist.  For now, we will leave these undocumented but in the code for later. -- TRT

		//	opt: Object
		//		The actual options used to define this axis, created at initialization.
		//	scalar: Object
		//		The calculated helper object to tell charts how to draw an axis and any data.
		//	ticks: Object
		//		The calculated tick object that helps a chart draw the scaling on an axis.
		//	dirty: Boolean
		//		The state of the axis (whether it needs to be redrawn or not)
		//	scale: Number
		//		The current scale of the axis.
		//	offset: Number
		//		The current offset of the axis.

		opt: null,
		scalar: null,
		ticks: null,
		dirty: true,
		scale: 1,
		offset: 0,
		*/
		defaultParams: {
			vertical:    false,		// true for vertical axis
			fixUpper:    "none",	// align the upper on ticks: "major", "minor", "micro", "none"
			fixLower:    "none",	// align the lower on ticks: "major", "minor", "micro", "none"
			natural:     false,		// all tick marks should be made on natural numbers
			leftBottom:  true,		// position of the axis, used with "vertical"
			includeZero: false,		// 0 should be included
			fixed:       true,		// all labels are fixed numbers
			majorLabels: true,		// draw major labels
			minorTicks:  true,		// draw minor ticks
			minorLabels: true,		// draw minor labels
			microTicks:  false,		// draw micro ticks
			rotation:    0			// label rotation angle in degrees
		},
		optionalParams: {
			min:			0,	// minimal value on this axis
			max:			1,	// maximal value on this axis
			from:			0,	// visible from this value
			to:				1,	// visible to this value
			majorTickStep:	4,	// major tick step
			minorTickStep:	2,	// minor tick step
			microTickStep:	1,	// micro tick step
			labels:			[],	// array of labels for major ticks
								// with corresponding numeric values
								// ordered by values
			labelFunc:		null, // function to compute label values
			maxLabelSize:	0,	// size in px. For use with labelFunc
			maxLabelCharCount:	0,	// size in word count.
			trailingSymbol:			null

			// TODO: add support for minRange!
			// minRange:		1,	// smallest distance from min allowed on the axis
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for an axis.
			//	chart: dojox.charting.Chart2D
			//		The chart the axis belongs to.
			//	kwArgs: dojox.charting.axis2d.__AxisCtorArgs?
			//		Any optional keyword arguments to be used to define this axis.
			this.opt = dojo.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
		},
		dependOnData: function(){
			//	summary:
			//		Find out whether or not the axis options depend on the data in the axis.
			return !("min" in this.opt) || !("max" in this.opt);	//	Boolean
		},
		clear: function(){
			//	summary:
			//		Clear out all calculated properties on this axis;
			//	returns: dojox.charting.axis2d.Default
			//		The reference to the axis for functional chaining.
			delete this.scaler;
			delete this.ticks;
			this.dirty = true;
			return this;	//	dojox.charting.axis2d.Default
		},
		initialized: function(){
			//	summary:
			//		Finds out if this axis has been initialized or not.
			//	returns: Boolean
			//		Whether a scaler has been calculated and if the axis is not dirty.
			return "scaler" in this && !(this.dirty && this.dependOnData());
		},
		setWindow: function(scale, offset){
			//	summary:
			//		Set the drawing "window" for the axis.
			//	scale: Number
			//		The new scale for the axis.
			//	offset: Number
			//		The new offset for the axis.
			//	returns: dojox.charting.axis2d.Default
			//		The reference to the axis for functional chaining.
			this.scale  = scale;
			this.offset = offset;
			return this.clear();	//	dojox.charting.axis2d.Default
		},
		getWindowScale: function(){
			//	summary:
			//		Get the current windowing scale of the axis.
			return "scale" in this ? this.scale : 1;	//	Number
		},
		getWindowOffset: function(){
			//	summary:
			//		Get the current windowing offset for the axis.
			return "offset" in this ? this.offset : 0;	//	Number
		},
		_groupLabelWidth: function(labels, font, wcLimit){
			if(!labels.length){
				return 0;
			}
			if(dojo.isObject(labels[0])){
				labels = df.map(labels, function(label){ return label.text; });
			}
			if (wcLimit) {
				labels = df.map(labels, function(label){
					return dojo.trim(label).length == 0 ? "" : label.substring(0, wcLimit) + this.trailingSymbol;
				}, this);
			}
			var s = labels.join("<br>");
			return dojox.gfx._base._getTextBox(s, {font: font}).w || 0;
		},
		calculate: function(min, max, span, labels){
			//	summary:
			//		Perform all calculations needed to render this axis.
			//	min: Number
			//		The smallest value represented on this axis.
			//	max: Number
			//		The largest value represented on this axis.
			//	span: Number
			//		The span in pixels over which axis calculations are made.
			//	labels: String[]
			//		Optional list of labels.
			//	returns: dojox.charting.axis2d.Default
			//		The reference to the axis for functional chaining.
			if(this.initialized()){
				return this;
			}
			var o = this.opt;
			this.labels = "labels" in o  ? o.labels : labels;
			this.scaler = lin.buildScaler(min, max, span, o);
			var tsb = this.scaler.bounds;
			if("scale" in this){
				// calculate new range
				o.from = tsb.lower + this.offset;
				o.to   = (tsb.upper - tsb.lower) / this.scale + o.from;
				// make sure that bounds are correct
				if( !isFinite(o.from) ||
					isNaN(o.from) ||
					!isFinite(o.to) ||
					isNaN(o.to) ||
					o.to - o.from >= tsb.upper - tsb.lower
				){
					// any error --- remove from/to bounds
					delete o.from;
					delete o.to;
					delete this.scale;
					delete this.offset;
				}else{
					// shift the window, if we are out of bounds
					if(o.from < tsb.lower){
						o.to += tsb.lower - o.from;
						o.from = tsb.lower;
					}else if(o.to > tsb.upper){
						o.from += tsb.upper - o.to;
						o.to = tsb.upper;
					}
					// update the offset
					this.offset = o.from - tsb.lower;
				}
				// re-calculate the scaler
				this.scaler = lin.buildScaler(min, max, span, o);
				tsb = this.scaler.bounds;
				// cleanup
				if(this.scale == 1 && this.offset == 0){
					delete this.scale;
					delete this.offset;
				}
			}

			var ta = this.chart.theme.axis, labelWidth = 0, rotation = o.rotation % 360,
				// TODO: we use one font --- of major tick, we need to use major and minor fonts
				taFont = o.font || (ta.majorTick && ta.majorTick.font) || (ta.tick && ta.tick.font),
				size = taFont ? g.normalizedLength(g.splitFontString(taFont).size) : 0,
				cosr = Math.abs(Math.cos(rotation * Math.PI / 180)),
				sinr = Math.abs(Math.sin(rotation * Math.PI / 180));

			if(rotation < 0){
				rotation += 360;
			}

			if(size){
				if(this.vertical ? rotation != 0 && rotation != 180 : rotation != 90 && rotation != 270){
					// we need width of all labels
					if(this.labels){
						labelWidth = this._groupLabelWidth(this.labels, taFont, o.maxLabelCharCount);
					}else{
						var labelLength = Math.ceil(
								Math.log(
									Math.max(
										Math.abs(tsb.from),
										Math.abs(tsb.to)
									)
								) / Math.LN10
							),
							t = [];
						if(tsb.from < 0 || tsb.to < 0){
							t.push("-");
						}
						t.push(dojo.string.rep("9", labelLength));
						var precision = Math.floor(
							Math.log( tsb.to - tsb.from ) / Math.LN10
						);
						if(precision > 0){
							t.push(".");
							t.push(dojo.string.rep("9", precision));
						}
						labelWidth = dojox.gfx._base._getTextBox(
							t.join(""),
							{ font: taFont }
						).w;
					}
					labelWidth = o.maxLabelSize ? Math.min(o.maxLabelSize, labelWidth) : labelWidth;
				}else{
					labelWidth = size;
				}
				switch(rotation){
					case 0:
					case 90:
					case 180:
					case 270:
						// trivial cases: use labelWidth
						break;
					default:
						// rotated labels
						var gap1 = Math.sqrt(labelWidth * labelWidth + size * size),									// short labels
							gap2 = this.vertical ? size * cosr + labelWidth * sinr : labelWidth * cosr + size * sinr;	// slanted labels
						labelWidth = Math.min(gap1, gap2);
						break;
				}
			}

			this.scaler.minMinorStep = labelWidth + labelGap;
			this.ticks = lin.buildTicks(this.scaler, o);
			return this;	//	dojox.charting.axis2d.Default
		},
		getScaler: function(){
			//	summary:
			//		Get the pre-calculated scaler object.
			return this.scaler;	//	Object
		},
		getTicks: function(){
			//	summary:
			//		Get the pre-calculated ticks object.
			return this.ticks;	//	Object
		}
	});
})();

}

if(!dojo._hasResource["dojo.colors"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.colors"] = true;
dojo.provide("dojo.colors");

dojo.getObject("colors", true, dojo);

//TODO: this module appears to break naming conventions

/*=====
dojo.colors = {
	// summary: Color utilities
}
=====*/

(function(){
	// this is a standard conversion prescribed by the CSS3 Color Module
	var hue2rgb = function(m1, m2, h){
		if(h < 0){ ++h; }
		if(h > 1){ --h; }
		var h6 = 6 * h;
		if(h6 < 1){ return m1 + (m2 - m1) * h6; }
		if(2 * h < 1){ return m2; }
		if(3 * h < 2){ return m1 + (m2 - m1) * (2 / 3 - h) * 6; }
		return m1;
	};
	
	dojo.colorFromRgb = function(/*String*/ color, /*dojo.Color?*/ obj){
		// summary:
		//		get rgb(a) array from css-style color declarations
		// description:
		//		this function can handle all 4 CSS3 Color Module formats: rgb,
		//		rgba, hsl, hsla, including rgb(a) with percentage values.
		var m = color.toLowerCase().match(/^(rgba?|hsla?)\(([\s\.\-,%0-9]+)\)/);
		if(m){
			var c = m[2].split(/\s*,\s*/), l = c.length, t = m[1], a;
			if((t == "rgb" && l == 3) || (t == "rgba" && l == 4)){
				var r = c[0];
				if(r.charAt(r.length - 1) == "%"){
					// 3 rgb percentage values
					a = dojo.map(c, function(x){
						return parseFloat(x) * 2.56;
					});
					if(l == 4){ a[3] = c[3]; }
					return dojo.colorFromArray(a, obj);	// dojo.Color
				}
				return dojo.colorFromArray(c, obj);	// dojo.Color
			}
			if((t == "hsl" && l == 3) || (t == "hsla" && l == 4)){
				// normalize hsl values
				var H = ((parseFloat(c[0]) % 360) + 360) % 360 / 360,
					S = parseFloat(c[1]) / 100,
					L = parseFloat(c[2]) / 100,
					// calculate rgb according to the algorithm
					// recommended by the CSS3 Color Module
					m2 = L <= 0.5 ? L * (S + 1) : L + S - L * S,
					m1 = 2 * L - m2;
				a = [
					hue2rgb(m1, m2, H + 1 / 3) * 256,
					hue2rgb(m1, m2, H) * 256,
					hue2rgb(m1, m2, H - 1 / 3) * 256,
					1
				];
				if(l == 4){ a[3] = c[3]; }
				return dojo.colorFromArray(a, obj);	// dojo.Color
			}
		}
		return null;	// dojo.Color
	};
	
	var confine = function(c, low, high){
		// summary:
		//		sanitize a color component by making sure it is a number,
		//		and clamping it to valid values
		c = Number(c);
		return isNaN(c) ? high : c < low ? low : c > high ? high : c;	// Number
	};
	
	dojo.Color.prototype.sanitize = function(){
		// summary: makes sure that the object has correct attributes
		var t = this;
		t.r = Math.round(confine(t.r, 0, 255));
		t.g = Math.round(confine(t.g, 0, 255));
		t.b = Math.round(confine(t.b, 0, 255));
		t.a = confine(t.a, 0, 1);
		return this;	// dojo.Color
	};
})();


dojo.colors.makeGrey = function(/*Number*/ g, /*Number?*/ a){
	// summary: creates a greyscale color with an optional alpha
	return dojo.colorFromArray([g, g, g, a]);
};

// mixin all CSS3 named colors not already in _base, along with SVG 1.0 variant spellings
dojo.mixin(dojo.Color.named, {
	aliceblue:	[240,248,255],
	antiquewhite:	[250,235,215],
	aquamarine:	[127,255,212],
	azure:	[240,255,255],
	beige:	[245,245,220],
	bisque:	[255,228,196],
	blanchedalmond:	[255,235,205],
	blueviolet:	[138,43,226],
	brown:	[165,42,42],
	burlywood:	[222,184,135],
	cadetblue:	[95,158,160],
	chartreuse:	[127,255,0],
	chocolate:	[210,105,30],
	coral:	[255,127,80],
	cornflowerblue:	[100,149,237],
	cornsilk:	[255,248,220],
	crimson:	[220,20,60],
	cyan:	[0,255,255],
	darkblue:	[0,0,139],
	darkcyan:	[0,139,139],
	darkgoldenrod:	[184,134,11],
	darkgray:	[169,169,169],
	darkgreen:	[0,100,0],
	darkgrey:	[169,169,169],
	darkkhaki:	[189,183,107],
	darkmagenta:	[139,0,139],
	darkolivegreen:	[85,107,47],
	darkorange:	[255,140,0],
	darkorchid:	[153,50,204],
	darkred:	[139,0,0],
	darksalmon:	[233,150,122],
	darkseagreen:	[143,188,143],
	darkslateblue:	[72,61,139],
	darkslategray:	[47,79,79],
	darkslategrey:	[47,79,79],
	darkturquoise:	[0,206,209],
	darkviolet:	[148,0,211],
	deeppink:	[255,20,147],
	deepskyblue:	[0,191,255],
	dimgray:	[105,105,105],
	dimgrey:	[105,105,105],
	dodgerblue:	[30,144,255],
	firebrick:	[178,34,34],
	floralwhite:	[255,250,240],
	forestgreen:	[34,139,34],
	gainsboro:	[220,220,220],
	ghostwhite:	[248,248,255],
	gold:	[255,215,0],
	goldenrod:	[218,165,32],
	greenyellow:	[173,255,47],
	grey:	[128,128,128],
	honeydew:	[240,255,240],
	hotpink:	[255,105,180],
	indianred:	[205,92,92],
	indigo:	[75,0,130],
	ivory:	[255,255,240],
	khaki:	[240,230,140],
	lavender:	[230,230,250],
	lavenderblush:	[255,240,245],
	lawngreen:	[124,252,0],
	lemonchiffon:	[255,250,205],
	lightblue:	[173,216,230],
	lightcoral:	[240,128,128],
	lightcyan:	[224,255,255],
	lightgoldenrodyellow:	[250,250,210],
	lightgray:	[211,211,211],
	lightgreen:	[144,238,144],
	lightgrey:	[211,211,211],
	lightpink:	[255,182,193],
	lightsalmon:	[255,160,122],
	lightseagreen:	[32,178,170],
	lightskyblue:	[135,206,250],
	lightslategray:	[119,136,153],
	lightslategrey:	[119,136,153],
	lightsteelblue:	[176,196,222],
	lightyellow:	[255,255,224],
	limegreen:	[50,205,50],
	linen:	[250,240,230],
	magenta:	[255,0,255],
	mediumaquamarine:	[102,205,170],
	mediumblue:	[0,0,205],
	mediumorchid:	[186,85,211],
	mediumpurple:	[147,112,219],
	mediumseagreen:	[60,179,113],
	mediumslateblue:	[123,104,238],
	mediumspringgreen:	[0,250,154],
	mediumturquoise:	[72,209,204],
	mediumvioletred:	[199,21,133],
	midnightblue:	[25,25,112],
	mintcream:	[245,255,250],
	mistyrose:	[255,228,225],
	moccasin:	[255,228,181],
	navajowhite:	[255,222,173],
	oldlace:	[253,245,230],
	olivedrab:	[107,142,35],
	orange:	[255,165,0],
	orangered:	[255,69,0],
	orchid:	[218,112,214],
	palegoldenrod:	[238,232,170],
	palegreen:	[152,251,152],
	paleturquoise:	[175,238,238],
	palevioletred:	[219,112,147],
	papayawhip:	[255,239,213],
	peachpuff:	[255,218,185],
	peru:	[205,133,63],
	pink:	[255,192,203],
	plum:	[221,160,221],
	powderblue:	[176,224,230],
	rosybrown:	[188,143,143],
	royalblue:	[65,105,225],
	saddlebrown:	[139,69,19],
	salmon:	[250,128,114],
	sandybrown:	[244,164,96],
	seagreen:	[46,139,87],
	seashell:	[255,245,238],
	sienna:	[160,82,45],
	skyblue:	[135,206,235],
	slateblue:	[106,90,205],
	slategray:	[112,128,144],
	slategrey:	[112,128,144],
	snow:	[255,250,250],
	springgreen:	[0,255,127],
	steelblue:	[70,130,180],
	tan:	[210,180,140],
	thistle:	[216,191,216],
	tomato:	[255,99,71],
	transparent: [0, 0, 0, 0],
	turquoise:	[64,224,208],
	violet:	[238,130,238],
	wheat:	[245,222,179],
	whitesmoke:	[245,245,245],
	yellowgreen:	[154,205,50]
});

}

if(!dojo._hasResource["dojox.charting.axis2d.Default"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.axis2d.Default"] = true;
dojo.provide("dojox.charting.axis2d.Default");












/*=====
	dojox.charting.axis2d.__AxisCtorArgs = function(
		vertical, fixUpper, fixLower, natural, leftBottom,
		includeZero, fixed, majorLabels, minorTicks, minorLabels, microTicks, htmlLabels,
		min, max, from, to, majorTickStep, minorTickStep, microTickStep,
		labels, labelFunc, maxLabelSize,
		stroke, majorTick, minorTick, microTick, tick,
		font, fontColor
	){
	//	summary:
	//		Optional arguments used in the definition of an axis.
	//
	//	vertical: Boolean?
	//		A flag that says whether an axis is vertical (i.e. y axis) or horizontal. Default is false (horizontal).
	//	fixUpper: String?
	//		Align the greatest value on the axis with the specified tick level. Options are "major", "minor", "micro", or "none".  Defaults to "none".
	//	fixLower: String?
	//		Align the smallest value on the axis with the specified tick level. Options are "major", "minor", "micro", or "none".  Defaults to "none".
	//	natural: Boolean?
	//		Ensure tick marks are made on "natural" numbers. Defaults to false.
	//	leftBottom: Boolean?
	//		The position of a vertical axis; if true, will be placed against the left-bottom corner of the chart.  Defaults to true.
	//	includeZero: Boolean?
	//		Include 0 on the axis rendering.  Default is false.
	//	fixed: Boolean?
	//		Force all axis labels to be fixed numbers.  Default is true.
	//	majorLabels: Boolean?
	//		Flag to draw all labels at major ticks. Default is true.
	//	minorTicks: Boolean?
	//		Flag to draw minor ticks on an axis.  Default is true.
	//	minorLabels: Boolean?
	//		Flag to draw labels on minor ticks. Default is true.
	//	microTicks: Boolean?
	//		Flag to draw micro ticks on an axis. Default is false.
	//	htmlLabels: Boolean?
	//		Flag to use HTML (as opposed to the native vector graphics engine) to draw labels. Default is true.
	//	min: Number?
	//		The smallest value on an axis. Default is 0.
	//	max: Number?
	//		The largest value on an axis. Default is 1.
	//	from: Number?
	//		Force the chart to render data visible from this value. Default is 0.
	//	to: Number?
	//		Force the chart to render data visible to this value. Default is 1.
	//	majorTickStep: Number?
	//		The amount to skip before a major tick is drawn.  Default is 4.
	//	minorTickStep: Number?
	//		The amount to skip before a minor tick is drawn. Default is 2.
	//	microTickStep: Number?
	//		The amount to skip before a micro tick is drawn. Default is 1.
	//	labels: Object[]?
	//		An array of labels for major ticks, with corresponding numeric values, ordered by value.
	//	labelFunc: Function?
	//		An optional function used to compute label values.
	//	maxLabelSize: Number?
	//		The maximum size, in pixels, for a label.  To be used with the optional label function.
	//	stroke: dojox.gfx.Stroke?
	//		An optional stroke to be used for drawing an axis.
	//	majorTick: Object?
	//		An object containing a dojox.gfx.Stroke, and a length (number) for a major tick.
	//	minorTick: Object?
	//		An object containing a dojox.gfx.Stroke, and a length (number) for a minor tick.
	//	microTick: Object?
	//		An object containing a dojox.gfx.Stroke, and a length (number) for a micro tick.
	//	tick: Object?
	//		An object containing a dojox.gfx.Stroke, and a length (number) for a tick.
	//	font: String?
	//		An optional font definition (as used in the CSS font property) for labels.
	//	fontColor: String|dojo.Color?
	//		An optional color to be used in drawing labels.

	this.vertical = vertical;
	this.fixUpper = fixUpper;
	this.fixLower = fixLower;
	this.natural = natural;
	this.leftBottom = leftBottom;
	this.includeZero = includeZero;
	this.fixed = fixed;
	this.majorLabels = majorLabels;
	this.minorTicks = minorTicks;
	this.minorLabels = minorLabels;
	this.microTicks = microTicks;
	this.htmlLabels = htmlLabels;
	this.min = min;
	this.max = max;
	this.from = from;
	this.to = to;
	this.majorTickStep = majorTickStep;
	this.minorTickStep = minorTickStep;
	this.microTickStep = microTickStep;
	this.labels = labels;
	this.labelFunc = labelFunc;
	this.maxLabelSize = maxLabelSize;
	this.stroke = stroke;
	this.majorTick = majorTick;
	this.minorTick = minorTick;
	this.microTick = microTick;
	this.tick = tick;
	this.font = font;
	this.fontColor = fontColor;
}
=====*/
(function(){
	var dc = dojox.charting,
		du = dojox.lang.utils,
		g = dojox.gfx,
		lin = dc.scaler.linear,
		labelGap = 4,			// in pixels
		centerAnchorLimit = 45;	// in degrees

	dojo.declare("dojox.charting.axis2d.Default", dojox.charting.axis2d.Invisible, {
		//	summary:
		//		The default axis object used in dojox.charting.  See dojox.charting.Chart.addAxis for details.
		//
		//	defaultParams: Object
		//		The default parameters used to define any axis.
		//	optionalParams: Object
		//		Any optional parameters needed to define an axis.

		/*
		//	TODO: the documentation tools need these to be pre-defined in order to pick them up
		//	correctly, but the code here is partially predicated on whether or not the properties
		//	actually exist.  For now, we will leave these undocumented but in the code for later. -- TRT

		//	opt: Object
		//		The actual options used to define this axis, created at initialization.
		//	scalar: Object
		//		The calculated helper object to tell charts how to draw an axis and any data.
		//	ticks: Object
		//		The calculated tick object that helps a chart draw the scaling on an axis.
		//	dirty: Boolean
		//		The state of the axis (whether it needs to be redrawn or not)
		//	scale: Number
		//		The current scale of the axis.
		//	offset: Number
		//		The current offset of the axis.

		opt: null,
		scalar: null,
		ticks: null,
		dirty: true,
		scale: 1,
		offset: 0,
		*/
		defaultParams: {
			vertical:    false,		// true for vertical axis
			fixUpper:    "none",	// align the upper on ticks: "major", "minor", "micro", "none"
			fixLower:    "none",	// align the lower on ticks: "major", "minor", "micro", "none"
			natural:     false,		// all tick marks should be made on natural numbers
			leftBottom:  true,		// position of the axis, used with "vertical"
			includeZero: false,		// 0 should be included
			fixed:       true,		// all labels are fixed numbers
			majorLabels: true,		// draw major labels
			minorTicks:  true,		// draw minor ticks
			minorLabels: true,		// draw minor labels
			microTicks:  false,		// draw micro ticks
			rotation:    0,			// label rotation angle in degrees
			htmlLabels:  true		// use HTML to draw labels
		},
		optionalParams: {
			min:			0,	// minimal value on this axis
			max:			1,	// maximal value on this axis
			from:			0,	// visible from this value
			to:				1,	// visible to this value
			majorTickStep:	4,	// major tick step
			minorTickStep:	2,	// minor tick step
			microTickStep:	1,	// micro tick step
			labels:			[],	// array of labels for major ticks
								// with corresponding numeric values
								// ordered by values
			labelFunc:		null, // function to compute label values
			maxLabelSize:	0,	// size in px. For use with labelFunc
			maxLabelCharCount:	0,	// size in word count.
			trailingSymbol:	null,

			// TODO: add support for minRange!
			// minRange:		1,	// smallest distance from min allowed on the axis

			// theme components
			stroke:			{},	// stroke for an axis
			majorTick:		{},	// stroke + length for a tick
			minorTick:		{},	// stroke + length for a tick
			microTick:		{},	// stroke + length for a tick
			tick:           {},	// stroke + length for a tick
			font:			"",	// font for labels
			fontColor:		"",	// color for labels as a string
			title:		 		"",	// axis title
			titleGap:	 		0,		// gap between axis title and axis label
			titleFont:	 		"",		// axis title font
			titleFontColor:	 	"",		// axis title font color
			titleOrientation: 	""		// "axis" means the title facing the axis, "away" means facing away
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for an axis.
			//	chart: dojox.charting.Chart2D
			//		The chart the axis belongs to.
			//	kwArgs: dojox.charting.axis2d.__AxisCtorArgs?
			//		Any optional keyword arguments to be used to define this axis.
			this.opt = dojo.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
		},
		getOffsets: function(){
			//	summary:
			//		Get the physical offset values for this axis (used in drawing data series).
			//	returns: Object
			//		The calculated offsets in the form of { l, r, t, b } (left, right, top, bottom).
			var s = this.scaler, offsets = { l: 0, r: 0, t: 0, b: 0 };
			if(!s){
				return offsets;
			}
			var o = this.opt, labelWidth = 0, a, b, c, d,
				gl = dc.scaler.common.getNumericLabel,
				offset = 0, ma = s.major, mi = s.minor,
				ta = this.chart.theme.axis,
				// TODO: we use one font --- of major tick, we need to use major and minor fonts
				taFont = o.font || (ta.majorTick && ta.majorTick.font) || (ta.tick && ta.tick.font),
				taTitleFont = o.titleFont || (ta.tick && ta.tick.titleFont),
				taTitleGap = (o.titleGap==0) ? 0 : o.titleGap || (ta.tick && ta.tick.titleGap) || 15,
				taMajorTick = this.chart.theme.getTick("major", o),
				taMinorTick = this.chart.theme.getTick("minor", o),
				size = taFont ? g.normalizedLength(g.splitFontString(taFont).size) : 0,
				tsize = taTitleFont ? g.normalizedLength(g.splitFontString(taTitleFont).size) : 0,
				rotation = o.rotation % 360, leftBottom = o.leftBottom,
				cosr = Math.abs(Math.cos(rotation * Math.PI / 180)),
				sinr = Math.abs(Math.sin(rotation * Math.PI / 180));
			this.trailingSymbol = (o.trailingSymbol === undefined || o.trailingSymbol === null) ? this.trailingSymbol : o.trailingSymbol;
			if(rotation < 0){
				rotation += 360;
			}

			if(size){
				// we need width of all labels
				if(this.labels){
					labelWidth = this._groupLabelWidth(this.labels, taFont, o.maxLabelCharCount);
				}else{
					labelWidth = this._groupLabelWidth([
						gl(ma.start, ma.prec, o),
						gl(ma.start + ma.count * ma.tick, ma.prec, o),
						gl(mi.start, mi.prec, o),
						gl(mi.start + mi.count * mi.tick, mi.prec, o)
					], taFont, o.maxLabelCharCount);
				}
				labelWidth = o.maxLabelSize ? Math.min(o.maxLabelSize, labelWidth) : labelWidth;
				if(this.vertical){
					var side = leftBottom ? "l" : "r";
					switch(rotation){
						case 0:
						case 180:
							offsets[side] = labelWidth;
							offsets.t = offsets.b = size / 2;
							break;
						case 90:
						case 270:
							offsets[side] = size;
							offsets.t = offsets.b = labelWidth / 2;
							break;
						default:
							if(rotation <= centerAnchorLimit || (180 < rotation && rotation <= (180 + centerAnchorLimit))){
								offsets[side] = size * sinr / 2 + labelWidth * cosr;
								offsets[leftBottom ? "t" : "b"] = size * cosr / 2 + labelWidth * sinr;
								offsets[leftBottom ? "b" : "t"] = size * cosr / 2;
							}else if(rotation > (360 - centerAnchorLimit) || (180 > rotation && rotation > (180 - centerAnchorLimit))){
								offsets[side] = size * sinr / 2 + labelWidth * cosr;
								offsets[leftBottom ? "b" : "t"] = size * cosr / 2 + labelWidth * sinr;
								offsets[leftBottom ? "t" : "b"] = size * cosr / 2;
							}else if(rotation < 90 || (180 < rotation && rotation < 270)){
								offsets[side] = size * sinr + labelWidth * cosr;
								offsets[leftBottom ? "t" : "b"] = size * cosr + labelWidth * sinr;
							}else{
								offsets[side] = size * sinr + labelWidth * cosr;
								offsets[leftBottom ? "b" : "t"] = size * cosr + labelWidth * sinr;
							}
							break;
					}
					offsets[side] += labelGap + Math.max(taMajorTick.length, taMinorTick.length) + (o.title ? (tsize + taTitleGap) : 0);
				}else{
					var side = leftBottom ? "b" : "t";
					switch(rotation){
						case 0:
						case 180:
							offsets[side] = size;
							offsets.l = offsets.r = labelWidth / 2;
							break;
						case 90:
						case 270:
							offsets[side] = labelWidth;
							offsets.l = offsets.r = size / 2;
							break;
						default:
							if((90 - centerAnchorLimit) <= rotation && rotation <= 90 || (270 - centerAnchorLimit) <= rotation && rotation <= 270){
								offsets[side] = size * sinr / 2 + labelWidth * cosr;
								offsets[leftBottom ? "r" : "l"] = size * cosr / 2 + labelWidth * sinr;
								offsets[leftBottom ? "l" : "r"] = size * cosr / 2;
							}else if(90 <= rotation && rotation <= (90 + centerAnchorLimit) || 270 <= rotation && rotation <= (270 + centerAnchorLimit)){
								offsets[side] = size * sinr / 2 + labelWidth * cosr;
								offsets[leftBottom ? "l" : "r"] = size * cosr / 2 + labelWidth * sinr;
								offsets[leftBottom ? "r" : "l"] = size * cosr / 2;
							}else if(rotation < centerAnchorLimit || (180 < rotation && rotation < (180 - centerAnchorLimit))){
								offsets[side] = size * sinr + labelWidth * cosr;
								offsets[leftBottom ? "r" : "l"] = size * cosr + labelWidth * sinr;
							}else{
								offsets[side] = size * sinr + labelWidth * cosr;
								offsets[leftBottom ? "l" : "r"] = size * cosr + labelWidth * sinr;
							}
							break;
					}
					offsets[side] += labelGap + Math.max(taMajorTick.length, taMinorTick.length) + (o.title ? (tsize + taTitleGap) : 0);
				}
			}
			if(labelWidth){
				this._cachedLabelWidth = labelWidth;
			}
			return offsets;	//	Object
		},
		render: function(dim, offsets){
			//	summary:
			//		Render/draw the axis.
			//	dim: Object
			//		An object of the form { width, height}.
			//	offsets: Object
			//		An object of the form { l, r, t, b }.
			//	returns: dojox.charting.axis2d.Default
			//		The reference to the axis for functional chaining.
			if(!this.dirty){
				return this;	//	dojox.charting.axis2d.Default
			}
			// prepare variable
			var o = this.opt, ta = this.chart.theme.axis, leftBottom = o.leftBottom, rotation = o.rotation % 360,
				start, stop, titlePos, titleRotation=0, titleOffset, axisVector, tickVector, anchorOffset, labelOffset, labelAlign,

				// TODO: we use one font --- of major tick, we need to use major and minor fonts
				taFont = o.font || (ta.majorTick && ta.majorTick.font) || (ta.tick && ta.tick.font),
				taTitleFont = o.titleFont || (ta.tick && ta.tick.titleFont),
				// TODO: we use one font color --- we need to use different colors
				taFontColor = o.fontColor || (ta.majorTick && ta.majorTick.fontColor) || (ta.tick && ta.tick.fontColor) || "black",
				taTitleFontColor = o.titleFontColor || (ta.tick && ta.tick.titleFontColor) || "black",
				taTitleGap = (o.titleGap==0) ? 0 : o.titleGap || (ta.tick && ta.tick.titleGap) || 15,
				taTitleOrientation = o.titleOrientation || (ta.tick && ta.tick.titleOrientation) || "axis",
				taMajorTick = this.chart.theme.getTick("major", o),
				taMinorTick = this.chart.theme.getTick("minor", o),
				taMicroTick = this.chart.theme.getTick("micro", o),

				tickSize = Math.max(taMajorTick.length, taMinorTick.length, taMicroTick.length),
				taStroke = "stroke" in o ? o.stroke : ta.stroke,
				size = taFont ? g.normalizedLength(g.splitFontString(taFont).size) : 0,
				cosr = Math.abs(Math.cos(rotation * Math.PI / 180)),
				sinr = Math.abs(Math.sin(rotation * Math.PI / 180)),
				tsize = taTitleFont ? g.normalizedLength(g.splitFontString(taTitleFont).size) : 0;
			if(rotation < 0){
				rotation += 360;
			}
			if(this.vertical){
				start = {y: dim.height - offsets.b};
				stop  = {y: offsets.t};
				titlePos = {y: (dim.height - offsets.b + offsets.t)/2};
				titleOffset = size * sinr + (this._cachedLabelWidth || 0) * cosr + labelGap + Math.max(taMajorTick.length, taMinorTick.length) + tsize + taTitleGap;
				axisVector = {x: 0, y: -1};
				labelOffset = {x: 0, y: 0};
				tickVector = {x: 1, y: 0};
				anchorOffset = {x: labelGap, y: 0};
				switch(rotation){
					case 0:
						labelAlign = "end";
						labelOffset.y = size * 0.4;
						break;
					case 90:
						labelAlign = "middle";
						labelOffset.x = -size;
						break;
					case 180:
						labelAlign = "start";
						labelOffset.y = -size * 0.4;
						break;
					case 270:
						labelAlign = "middle";
						break;
					default:
						if(rotation < centerAnchorLimit){
							labelAlign = "end";
							labelOffset.y = size * 0.4;
						}else if(rotation < 90){
							labelAlign = "end";
							labelOffset.y = size * 0.4;
						}else if(rotation < (180 - centerAnchorLimit)){
							labelAlign = "start";
						}else if(rotation < (180 + centerAnchorLimit)){
							labelAlign = "start";
							labelOffset.y = -size * 0.4;
						}else if(rotation < 270){
							labelAlign = "start";
							labelOffset.x = leftBottom ? 0 : size * 0.4;
						}else if(rotation < (360 - centerAnchorLimit)){
							labelAlign = "end";
							labelOffset.x = leftBottom ? 0 : size * 0.4;
						}else{
							labelAlign = "end";
							labelOffset.y = size * 0.4;
						}
				}
				if(leftBottom){
					start.x = stop.x = offsets.l;
					titleRotation = (taTitleOrientation && taTitleOrientation == "away") ? 90 : 270;
					titlePos.x = offsets.l - titleOffset + (titleRotation == 270 ? tsize : 0);
					tickVector.x = -1;
					anchorOffset.x = -anchorOffset.x;
				}else{
					start.x = stop.x = dim.width - offsets.r;
					titleRotation = (taTitleOrientation && taTitleOrientation == "axis") ? 90 : 270;
					titlePos.x = dim.width - offsets.r + titleOffset - (titleRotation == 270 ? 0 : tsize);
					switch(labelAlign){
						case "start":
							labelAlign = "end";
							break;
						case "end":
							labelAlign = "start";
							break;
						case "middle":
							labelOffset.x += size;
							break;
					}
				}
			}else{
				start = {x: offsets.l};
				stop  = {x: dim.width - offsets.r};
				titlePos = {x: (dim.width - offsets.r + offsets.l)/2};
				titleOffset = size * cosr + (this._cachedLabelWidth || 0) * sinr + labelGap + Math.max(taMajorTick.length, taMinorTick.length) + tsize + taTitleGap;
				axisVector = {x: 1, y: 0};
				labelOffset = {x: 0, y: 0};
				tickVector = {x: 0, y: 1};
				anchorOffset = {x: 0, y: labelGap};
				switch(rotation){
					case 0:
						labelAlign = "middle";
						labelOffset.y = size;
						break;
					case 90:
						labelAlign = "start";
						labelOffset.x = -size * 0.4;
						break;
					case 180:
						labelAlign = "middle";
						break;
					case 270:
						labelAlign = "end";
						labelOffset.x = size * 0.4;
						break;
					default:
						if(rotation < (90 - centerAnchorLimit)){
							labelAlign = "start";
							labelOffset.y = leftBottom ? size : 0;
						}else if(rotation < (90 + centerAnchorLimit)){
							labelAlign = "start";
							labelOffset.x = -size * 0.4;
						}else if(rotation < 180){
							labelAlign = "start";
							labelOffset.y = leftBottom ? 0 : -size;
						}else if(rotation < (270 - centerAnchorLimit)){
							labelAlign = "end";
							labelOffset.y = leftBottom ? 0 : -size;
						}else if(rotation < (270 + centerAnchorLimit)){
							labelAlign = "end";
							labelOffset.y = leftBottom ? size * 0.4 : 0;
						}else{
							labelAlign = "end";
							labelOffset.y = leftBottom ? size : 0;
						}
				}
				if(leftBottom){
					start.y = stop.y = dim.height - offsets.b;
					titleRotation = (taTitleOrientation && taTitleOrientation == "axis") ? 180 : 0;
					titlePos.y = dim.height - offsets.b + titleOffset - (titleRotation ? tsize : 0);
				}else{
					start.y = stop.y = offsets.t;
					titleRotation = (taTitleOrientation && taTitleOrientation == "away") ? 180 : 0;
					titlePos.y = offsets.t - titleOffset + (titleRotation ? 0 : tsize);
					tickVector.y = -1;
					anchorOffset.y = -anchorOffset.y;
					switch(labelAlign){
						case "start":
							labelAlign = "end";
							break;
						case "end":
							labelAlign = "start";
							break;
						case "middle":
							labelOffset.y -= size;
							break;
					}
				}
			}

			// render shapes

			this.cleanGroup();

			try{
				var s = this.group,
					c = this.scaler,
					t = this.ticks,
					canLabel,
					f = lin.getTransformerFromModel(this.scaler),
					// GFX Canvas now supports labels, so let's _not_ fallback to HTML anymore on canvas, just use
					// HTML labels if explicitly asked + no rotation + no IE + no Opera
					labelType = !titleRotation && !rotation && this.opt.htmlLabels && !dojo.isIE && !dojo.isOpera ? "html" : "gfx",
					dx = tickVector.x * taMajorTick.length,
					dy = tickVector.y * taMajorTick.length;

				s.createLine({
					x1: start.x,
					y1: start.y,
					x2: stop.x,
					y2: stop.y
				}).setStroke(taStroke);
				
				//create axis title
				if(o.title){
					var axisTitle = dc.axis2d.common.createText[labelType](
						this.chart,
						s,
						titlePos.x,
						titlePos.y,
						"middle",
						o.title,
						taTitleFont,
						taTitleFontColor
					);
					if(labelType == "html"){
						this.htmlElements.push(axisTitle);
					}else{
						//as soon as rotation is provided, labelType won't be "html"
						//rotate gfx labels
						axisTitle.setTransform(g.matrix.rotategAt(titleRotation, titlePos.x, titlePos.y));
					}
				}

				dojo.forEach(t.major, function(tick){
					var offset = f(tick.value), elem,
						x = start.x + axisVector.x * offset,
						y = start.y + axisVector.y * offset;
						s.createLine({
							x1: x, y1: y,
							x2: x + dx,
							y2: y + dy
						}).setStroke(taMajorTick);
						if(tick.label){
							var label = o.maxLabelCharCount ? this.getTextWithLimitCharCount(tick.label, taFont, o.maxLabelCharCount) : {
								text: tick.label,
								truncated: false
							};
							label = o.maxLabelSize ? this.getTextWithLimitLength(label.text, taFont, o.maxLabelSize, label.truncated) : label;
							elem = dc.axis2d.common.createText[labelType](
								this.chart,
								s,
								x + dx + anchorOffset.x + (rotation ? 0 : labelOffset.x),
								y + dy + anchorOffset.y + (rotation ? 0 : labelOffset.y),
								labelAlign,
								label.text,
								taFont,
								taFontColor
								//this._cachedLabelWidth
							);
							label.truncated && this.labelTooltip(elem, this.chart, tick.label, label.text, taFont, labelType);
							if(labelType == "html"){
								this.htmlElements.push(elem);
							}else if(rotation){
								elem.setTransform([
									{dx: labelOffset.x, dy: labelOffset.y},
									g.matrix.rotategAt(
										rotation,
										x + dx + anchorOffset.x,
										y + dy + anchorOffset.y
									)
								]);
							}
						}
				}, this);

				dx = tickVector.x * taMinorTick.length;
				dy = tickVector.y * taMinorTick.length;
				canLabel = c.minMinorStep <= c.minor.tick * c.bounds.scale;
				dojo.forEach(t.minor, function(tick){
					var offset = f(tick.value), elem,
						x = start.x + axisVector.x * offset,
						y = start.y + axisVector.y * offset;
						s.createLine({
							x1: x, y1: y,
							x2: x + dx,
							y2: y + dy
						}).setStroke(taMinorTick);
						if(canLabel && tick.label){
							var label = o.maxLabelCharCount ? this.getTextWithLimitCharCount(tick.label, taFont, o.maxLabelCharCount) : {
								text: tick.label,
								truncated: false
							};
							label = o.maxLabelSize ? this.getTextWithLimitLength(label.text, taFont, o.maxLabelSize, label.truncated) : label;
							elem = dc.axis2d.common.createText[labelType](
								this.chart,
								s,
								x + dx + anchorOffset.x + (rotation ? 0 : labelOffset.x),
								y + dy + anchorOffset.y + (rotation ? 0 : labelOffset.y),
								labelAlign,
								label.text,
								taFont,
								taFontColor
								//this._cachedLabelWidth
							);
							label.truncated && this.labelTooltip(elem, this.chart, tick.label, label.text, taFont, labelType);
							if(labelType == "html"){
								this.htmlElements.push(elem);
							}else if(rotation){
								elem.setTransform([
									{dx: labelOffset.x, dy: labelOffset.y},
									g.matrix.rotategAt(
										rotation,
										x + dx + anchorOffset.x,
										y + dy + anchorOffset.y
									)
								]);
							}
						}
				}, this);

				dx = tickVector.x * taMicroTick.length;
				dy = tickVector.y * taMicroTick.length;
				dojo.forEach(t.micro, function(tick){
					var offset = f(tick.value), elem,
						x = start.x + axisVector.x * offset,
						y = start.y + axisVector.y * offset;
						s.createLine({
							x1: x, y1: y,
							x2: x + dx,
							y2: y + dy
						}).setStroke(taMicroTick);
				}, this);
			}catch(e){
				// squelch
			}

			this.dirty = false;
			return this;	//	dojox.charting.axis2d.Default
		},
		labelTooltip: function(elem, chart, label, truncatedLabel, font, elemType){
			// to avoid requiring dijit module for that feature, let's test that
			// dynamically and return if we can't do it
			if(!dijit || !dijit.Tooltip){
				return;
			}
			var aroundRect = {type: "rect"}, position = ["above", "below"],
				fontWidth = dojox.gfx._base._getTextBox(truncatedLabel, {font: font}).w || 0;
				fontHeight = font ? g.normalizedLength(g.splitFontString(font).size) : 0;
			if(elemType == "html"){
				dojo.mixin(aroundRect, dojo.coords(elem.firstChild, true));
				aroundRect.width = Math.ceil(fontWidth);
				aroundRect.height = Math.ceil(fontHeight);
				this._events.push({
					shape:  dojo,
					handle: dojo.connect(elem.firstChild, "onmouseover", this, function(e){
						dijit.showTooltip(label, aroundRect, position);
					})
				});
				this._events.push({
					shape:  dojo,
					handle: dojo.connect(elem.firstChild, "onmouseout", this, function(e){
						dijit.hideTooltip(aroundRect);
					})
				});
			}else{
				var shp = elem.getShape(),
					lt = dojo.coords(chart.node, true);
				aroundRect = dojo.mixin(aroundRect, {
					x: shp.x - fontWidth / 2,
					y: shp.y
				});
				aroundRect.x += lt.x;
				aroundRect.y += lt.y;
				aroundRect.x = Math.round(aroundRect.x);
				aroundRect.y = Math.round(aroundRect.y);
				aroundRect.width = Math.ceil(fontWidth);
				aroundRect.height = Math.ceil(fontHeight);
				this._events.push({
					shape:  elem,
					handle: elem.connect("onmouseenter", this, function(e){
						dijit.showTooltip(label, aroundRect, position);
					})
				});
				this._events.push({
					shape:  elem,
					handle: elem.connect("onmouseleave", this, function(e){
						dijit.hideTooltip(aroundRect);
					})
				});
			}
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.common"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.common"] = true;
dojo.provide("dojox.charting.plot2d.common");





(function(){
	var df = dojox.lang.functional, dc = dojox.charting.plot2d.common;

	dojo.mixin(dojox.charting.plot2d.common, {
		makeStroke: function(stroke){
			if(!stroke){ return stroke; }
			if(typeof stroke == "string" || stroke instanceof dojo.Color){
				stroke = {color: stroke};
			}
			return dojox.gfx.makeParameters(dojox.gfx.defaultStroke, stroke);
		},
		augmentColor: function(target, color){
			var t = new dojo.Color(target),
				c = new dojo.Color(color);
			c.a = t.a;
			return c;
		},
		augmentStroke: function(stroke, color){
			var s = dc.makeStroke(stroke);
			if(s){
				s.color = dc.augmentColor(s.color, color);
			}
			return s;
		},
		augmentFill: function(fill, color){
			var fc, c = new dojo.Color(color);
			if(typeof fill == "string" || fill instanceof dojo.Color){
				return dc.augmentColor(fill, color);
			}
			return fill;
		},

		defaultStats: {
			vmin: Number.POSITIVE_INFINITY, vmax: Number.NEGATIVE_INFINITY,
			hmin: Number.POSITIVE_INFINITY, hmax: Number.NEGATIVE_INFINITY
		},

		collectSimpleStats: function(series){
			var stats = dojo.delegate(dc.defaultStats);
			for(var i = 0; i < series.length; ++i){
				var run = series[i];
				for(var j = 0; j < run.data.length; j++){
					if(run.data[j] !== null){
						if(typeof run.data[j] == "number"){
							// 1D case
							var old_vmin = stats.vmin, old_vmax = stats.vmax;
							if(!("ymin" in run) || !("ymax" in run)){
								dojo.forEach(run.data, function(val, i){
									if(val !== null){
										var x = i + 1, y = val;
										if(isNaN(y)){ y = 0; }
										stats.hmin = Math.min(stats.hmin, x);
										stats.hmax = Math.max(stats.hmax, x);
										stats.vmin = Math.min(stats.vmin, y);
										stats.vmax = Math.max(stats.vmax, y);
									}
								});
							}
							if("ymin" in run){ stats.vmin = Math.min(old_vmin, run.ymin); }
							if("ymax" in run){ stats.vmax = Math.max(old_vmax, run.ymax); }
						}else{
							// 2D case
							var old_hmin = stats.hmin, old_hmax = stats.hmax,
								old_vmin = stats.vmin, old_vmax = stats.vmax;
							if(!("xmin" in run) || !("xmax" in run) || !("ymin" in run) || !("ymax" in run)){
								dojo.forEach(run.data, function(val, i){
									if(val !== null){
										var x = "x" in val ? val.x : i + 1, y = val.y;
										if(isNaN(x)){ x = 0; }
										if(isNaN(y)){ y = 0; }
										stats.hmin = Math.min(stats.hmin, x);
										stats.hmax = Math.max(stats.hmax, x);
										stats.vmin = Math.min(stats.vmin, y);
										stats.vmax = Math.max(stats.vmax, y);
									}
								});
							}
							if("xmin" in run){ stats.hmin = Math.min(old_hmin, run.xmin); }
							if("xmax" in run){ stats.hmax = Math.max(old_hmax, run.xmax); }
							if("ymin" in run){ stats.vmin = Math.min(old_vmin, run.ymin); }
							if("ymax" in run){ stats.vmax = Math.max(old_vmax, run.ymax); }
						}

						break;
					}
				}
			}
			return stats;
		},

		calculateBarSize: function(/* Number */ availableSize, /* Object */ opt, /* Number? */ clusterSize){
			if(!clusterSize){
				clusterSize = 1;
			}
			var gap = opt.gap, size = (availableSize - 2 * gap) / clusterSize;
			if("minBarSize" in opt){
				size = Math.max(size, opt.minBarSize);
			}
			if("maxBarSize" in opt){
				size = Math.min(size, opt.maxBarSize);
			}
			size = Math.max(size, 1);
			gap = (availableSize - size * clusterSize) / 2;
			return {size: size, gap: gap};	// Object
		},

		collectStackedStats: function(series){
			// collect statistics
			var stats = dojo.clone(dc.defaultStats);
			if(series.length){
				// 1st pass: find the maximal length of runs
				stats.hmin = Math.min(stats.hmin, 1);
				stats.hmax = df.foldl(series, "seed, run -> Math.max(seed, run.data.length)", stats.hmax);
				// 2nd pass: stack values
				for(var i = 0; i < stats.hmax; ++i){
					var v = series[0].data[i];
                    v = v && (typeof v == "number" ? v : v.y);
					if(isNaN(v)){ v = 0; }
					stats.vmin = Math.min(stats.vmin, v);
					for(var j = 1; j < series.length; ++j){
						var t = series[j].data[i];
                        t = t && (typeof t == "number" ? t : t.y);
						if(isNaN(t)){ t = 0; }
						v += t;
					}
					stats.vmax = Math.max(stats.vmax, v);
				}
			}
			return stats;
		},

		curve: function(/* Number[] */a, /* Number|String */tension){
			//	FIX for #7235, submitted by Enzo Michelangeli.
			//	Emulates the smoothing algorithms used in a famous, unnamed spreadsheet
			//		program ;)
			var arr = a.slice(0);
			if(tension == "x") {
				arr[arr.length] = arr[0];   // add a last element equal to the first, closing the loop
			}
			var p=dojo.map(arr, function(item, i){
				if(i==0){ return "M" + item.x + "," + item.y; }
				if(!isNaN(tension)) { // use standard Dojo smoothing in tension is numeric
					var dx=item.x-arr[i-1].x, dy=arr[i-1].y;
					return "C"+(item.x-(tension-1)*(dx/tension))+","+dy+" "+(item.x-(dx/tension))+","+item.y+" "+item.x+","+item.y;
				} else if(tension == "X" || tension == "x" || tension == "S") {
					// use Excel "line smoothing" algorithm (http://xlrotor.com/resources/files.shtml)
					var p0, p1 = arr[i-1], p2 = arr[i], p3;
					var bz1x, bz1y, bz2x, bz2y;
					var f = 1/6;
					if(i==1) {
						if(tension == "x") {
							p0 = arr[arr.length-2];
						} else { // "tension == X || tension == "S"
							p0 = p1;
						}
						f = 1/3;
					} else {
						p0 = arr[i-2];
					}
					if(i==(arr.length-1)) {
						if(tension == "x") {
							p3 = arr[1];
						} else { // "tension == X || tension == "S"
							p3 = p2;
						}
						f = 1/3;
					} else {
						p3 = arr[i+1];
					}
					var p1p2 = Math.sqrt((p2.x-p1.x)*(p2.x-p1.x)+(p2.y-p1.y)*(p2.y-p1.y));
					var p0p2 = Math.sqrt((p2.x-p0.x)*(p2.x-p0.x)+(p2.y-p0.y)*(p2.y-p0.y));
					var p1p3 = Math.sqrt((p3.x-p1.x)*(p3.x-p1.x)+(p3.y-p1.y)*(p3.y-p1.y));

					var p0p2f = p0p2 * f;
					var p1p3f = p1p3 * f;

					if(p0p2f > p1p2/2 && p1p3f > p1p2/2) {
						p0p2f = p1p2/2;
						p1p3f = p1p2/2;
					} else if(p0p2f > p1p2/2) {
						p0p2f = p1p2/2;
						p1p3f = p1p2/2 * p1p3/p0p2;
					} else if(p1p3f > p1p2/2) {
						p1p3f = p1p2/2;
						p0p2f = p1p2/2 * p0p2/p1p3;
					}

					if(tension == "S") {
						if(p0 == p1) { p0p2f = 0; }
						if(p2 == p3) { p1p3f = 0; }
					}

					bz1x = p1.x + p0p2f*(p2.x - p0.x)/p0p2;
					bz1y = p1.y + p0p2f*(p2.y - p0.y)/p0p2;
					bz2x = p2.x - p1p3f*(p3.x - p1.x)/p1p3;
					bz2y = p2.y - p1p3f*(p3.y - p1.y)/p1p3;
				}
				return "C"+(bz1x+","+bz1y+" "+bz2x+","+bz2y+" "+p2.x+","+p2.y);
			});
			return p.join(" ");
		},
		
		getLabel: function(/*Number*/number, /*Boolean*/fixed, /*Number*/precision){
			if(dojo.number){
				return (fixed ? dojo.number.format(number, {places : precision}) :
					dojo.number.format(number)) || "";
			}
			return fixed ? number.toFixed(precision) : number.toString();
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.scaler.primitive"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.scaler.primitive"] = true;
dojo.provide("dojox.charting.scaler.primitive");

dojox.charting.scaler.primitive = {
	buildScaler: function(/*Number*/ min, /*Number*/ max, /*Number*/ span, /*Object*/ kwArgs){
		if(min == max){
			// artificially extend bounds
			min -= 0.5;
			max += 0.5;
			// now the line will be centered
		}
		return {
			bounds: {
				lower: min,
				upper: max,
				from:  min,
				to:    max,
				scale: span / (max - min),
				span:  span
			},
			scaler: dojox.charting.scaler.primitive
		};
	},
	buildTicks: function(/*Object*/ scaler, /*Object*/ kwArgs){
		return {major: [], minor: [], micro: []};	// Object
	},
	getTransformerFromModel: function(/*Object*/ scaler){
		var offset = scaler.bounds.from, scale = scaler.bounds.scale;
		return function(x){ return (x - offset) * scale; };	// Function
	},
	getTransformerFromPlot: function(/*Object*/ scaler){
		var offset = scaler.bounds.from, scale = scaler.bounds.scale;
		return function(x){ return x / scale + offset; };	// Function
	}
};

}

if(!dojo._hasResource["dojox.charting.plot2d._PlotEvents"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d._PlotEvents"] = true;
dojo.provide("dojox.charting.plot2d._PlotEvents");

dojo.declare("dojox.charting.plot2d._PlotEvents", null, {
	constructor: function(){
		this._shapeEvents = [];
		this._eventSeries = {};
	},
	destroy: function(){
		//	summary:
		//		Destroy any internal elements and event handlers.
		this.resetEvents();
		this.inherited(arguments);
	},
	plotEvent: function(o){
		//	summary:
		//		Stub function for use by specific plots.
		//	o: Object
		//		An object intended to represent event parameters.
	},
	raiseEvent: function(o){
		//	summary:
		//		Raises events in predefined order
		//	o: Object
		//		An object intended to represent event parameters.
		this.plotEvent(o);
		var t = dojo.delegate(o);
		t.originalEvent = o.type;
		t.originalPlot  = o.plot;
		t.type = "onindirect";
		dojo.forEach(this.chart.stack, function(plot){
			if(plot !== this && plot.plotEvent){
				t.plot = plot;
				plot.plotEvent(t);
			}
		}, this);
	},
	connect: function(object, method){
		//	summary:
		//		Helper function to connect any object's method to our plotEvent.
		//	object: Object
		//		The object to connect to.
		//	method: String|Function
		//		The method to fire when our plotEvent is fired.
		//	returns: Array
		//		The handle as returned from dojo.connect (see dojo.connect).
		this.dirty = true;
		return dojo.connect(this, "plotEvent", object, method);	//	Array
	},
	events: function(){
		//	summary:
		//		Find out if any event handlers have been connected to our plotEvent.
		//	returns: Boolean
		//		A flag indicating that there are handlers attached.
		var ls = this.plotEvent._listeners;
		if(!ls || !ls.length){ return false; }
		for(var i in ls){
			if(!(i in Array.prototype)){
				return true;
			}
		}
		return false;
	},
	resetEvents: function(){
		//	summary:
		//		Reset all events attached to our plotEvent (i.e. disconnect).
		if(this._shapeEvents.length){
			dojo.forEach(this._shapeEvents, function(item){
				item.shape.disconnect(item.handle);
			});
			this._shapeEvents = [];
		}
		this.raiseEvent({type: "onplotreset", plot: this});
	},
	_connectSingleEvent: function(o, eventName){
		this._shapeEvents.push({
			shape:  o.eventMask,
			handle: o.eventMask.connect(eventName, this, function(e){
				o.type  = eventName;
				o.event = e;
				this.raiseEvent(o);
				o.event = null;
			})
		});
	},
	_connectEvents: function(o){
        if(o){
            o.chart = this.chart;
            o.plot  = this;
            o.hAxis = this.hAxis || null;
            o.vAxis = this.vAxis || null;
            o.eventMask = o.eventMask || o.shape;
            this._connectSingleEvent(o, "onmouseover");
            this._connectSingleEvent(o, "onmouseout");
            this._connectSingleEvent(o, "onclick");
        }
	},
	_reconnectEvents: function(seriesName){
		var a = this._eventSeries[seriesName];
		if(a){
			dojo.forEach(a, this._connectEvents, this);
		}
	},
	fireEvent: function(seriesName, eventName, index, eventObject){
		//	summary:
		//		Emulates firing an event for a given data value (specified by
		//		an index) of a given series.
		//	seriesName: String:
		//		Series name.
		//	eventName: String:
		//		Event name to emulate.
		//	index:	Number:
		//		Valid data value index used to raise an event.
		//	eventObject: Object?:
		//		Optional event object. Especially useful for synthetic events.
		//		Default: null.
		var s = this._eventSeries[seriesName];
		if(s && s.length && index < s.length){
			var o = s[index];
			o.type  = eventName;
			o.event = eventObject || null;
			this.raiseEvent(o);
			o.event = null;
		}
	}
});

}

if(!dojo._hasResource["dojox.charting.plot2d.Base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Base"] = true;
dojo.provide("dojox.charting.plot2d.Base");






/*=====
dojox.charting.plot2d.__PlotCtorArgs = function(){
	//	summary:
	//		The base keyword arguments object for plot constructors.
	//		Note that the parameters for this may change based on the
	//		specific plot type (see the corresponding plot type for
	//		details).
}
=====*/
dojo.declare("dojox.charting.plot2d.Base", [dojox.charting.Element, dojox.charting.plot2d._PlotEvents], {
	constructor: function(chart, kwArgs){
		//	summary:
		//		Create a base plot for charting.
		//	chart: dojox.chart.Chart2D
		//		The chart this plot belongs to.
		//	kwArgs: dojox.charting.plot2d.__PlotCtorArgs?
		//		An optional arguments object to help define the plot.
		this.zoom = null,
		this.zoomQueue = [];	// zooming action task queue
		this.lastWindow = {vscale: 1, hscale: 1, xoffset: 0, yoffset: 0};
	},
	clear: function(){
		//	summary:
		//		Clear out all of the information tied to this plot.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		this.series = [];
		this._hAxis = null;
		this._vAxis = null;
		this.dirty = true;
		return this;	//	dojox.charting.plot2d.Base
	},
	setAxis: function(axis){
		//	summary:
		//		Set an axis for this plot.
		//	axis: dojox.charting.axis2d.Base
		//		The axis to set.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		if(axis){
			this[axis.vertical ? "_vAxis" : "_hAxis"] = axis;
		}
		return this;	//	dojox.charting.plot2d.Base
	},
	addSeries: function(run){
		//	summary:
		//		Add a data series to this plot.
		//	run: dojox.charting.Series
		//		The series to be added.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		this.series.push(run);
		return this;	//	dojox.charting.plot2d.Base
	},
	getSeriesStats: function(){
		//	summary:
		//		Calculate the min/max on all attached series in both directions.
		//	returns: Object
		//		{hmin, hmax, vmin, vmax} min/max in both directions.
		return dojox.charting.plot2d.common.collectSimpleStats(this.series);
	},
	calculateAxes: function(dim){
		//	summary:
		//		Stub function for running the axis calculations (depricated).
		//	dim: Object
		//		An object of the form { width, height }
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		this.initializeScalers(dim, this.getSeriesStats());
		return this;	//	dojox.charting.plot2d.Base
	},
	isDirty: function(){
		//	summary:
		//		Returns whether or not this plot needs to be rendered.
		//	returns: Boolean
		//		The state of the plot.
		return this.dirty || this._hAxis && this._hAxis.dirty || this._vAxis && this._vAxis.dirty;	//	Boolean
	},
	isDataDirty: function(){
		//	summary:
		//		Returns whether or not any of this plot's data series need to be rendered.
		//	returns: Boolean
		//		Flag indicating if any of this plot's series are invalid and need rendering.
		return dojo.some(this.series, function(item){ return item.dirty; });	//	Boolean
	},
	performZoom: function(dim, offsets){
		//	summary:
		//		Create/alter any zooming windows on this plot.
		//	dim: Object
		//		An object of the form { width, height }.
		//	offsets: Object
		//		An object of the form { l, r, t, b }.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.

		// get current zooming various
		var vs = this._vAxis.scale || 1,
			hs = this._hAxis.scale || 1,
			vOffset = dim.height - offsets.b,
			hBounds = this._hScaler.bounds,
			xOffset = (hBounds.from - hBounds.lower) * hBounds.scale,
			vBounds = this._vScaler.bounds,
			yOffset = (vBounds.from - vBounds.lower) * vBounds.scale;
			// get incremental zooming various
			rVScale = vs / this.lastWindow.vscale,
			rHScale = hs / this.lastWindow.hscale,
			rXOffset = (this.lastWindow.xoffset - xOffset)/
				((this.lastWindow.hscale == 1)? hs : this.lastWindow.hscale),
			rYOffset = (yOffset - this.lastWindow.yoffset)/
				((this.lastWindow.vscale == 1)? vs : this.lastWindow.vscale),

			shape = this.group,
			anim = dojox.gfx.fx.animateTransform(dojo.delegate({
				shape: shape,
				duration: 1200,
				transform:[
					{name:"translate", start:[0, 0], end: [offsets.l * (1 - rHScale), vOffset * (1 - rVScale)]},
					{name:"scale", start:[1, 1], end: [rHScale, rVScale]},
					{name:"original"},
					{name:"translate", start: [0, 0], end: [rXOffset, rYOffset]}
				]}, this.zoom));

		dojo.mixin(this.lastWindow, {vscale: vs, hscale: hs, xoffset: xOffset, yoffset: yOffset});
		//add anim to zooming action queue,
		//in order to avoid several zooming action happened at the same time
		this.zoomQueue.push(anim);
		//perform each anim one by one in zoomQueue
		dojo.connect(anim, "onEnd", this, function(){
			this.zoom = null;
			this.zoomQueue.shift();
			if(this.zoomQueue.length > 0){
				this.zoomQueue[0].play();
			}
		});
		if(this.zoomQueue.length == 1){
			this.zoomQueue[0].play();
		}
		return this;	//	dojox.charting.plot2d.Base
	},
	render: function(dim, offsets){
		//	summary:
		//		Render the plot on the chart.
		//	dim: Object
		//		An object of the form { width, height }.
		//	offsets: Object
		//		An object of the form { l, r, t, b }.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		return this;	//	dojox.charting.plot2d.Base
	},
	getRequiredColors: function(){
		//	summary:
		//		Get how many data series we have, so we know how many colors to use.
		//	returns: Number
		//		The number of colors needed.
		return this.series.length;	//	Number
	},
	initializeScalers: function(dim, stats){
		//	summary:
		//		Initializes scalers using attached axes.
		//	dim: Object:
		//		Size of a plot area in pixels as {width, height}.
		//	stats: Object:
		//		Min/max of data in both directions as {hmin, hmax, vmin, vmax}.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		if(this._hAxis){
			if(!this._hAxis.initialized()){
				this._hAxis.calculate(stats.hmin, stats.hmax, dim.width);
			}
			this._hScaler = this._hAxis.getScaler();
		}else{
			this._hScaler = dojox.charting.scaler.primitive.buildScaler(stats.hmin, stats.hmax, dim.width);
		}
		if(this._vAxis){
			if(!this._vAxis.initialized()){
				this._vAxis.calculate(stats.vmin, stats.vmax, dim.height);
			}
			this._vScaler = this._vAxis.getScaler();
		}else{
			this._vScaler = dojox.charting.scaler.primitive.buildScaler(stats.vmin, stats.vmax, dim.height);
		}
		return this;	//	dojox.charting.plot2d.Base
	}
});

}

if(!dojo._hasResource["dojox.lang.functional.reversed"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.functional.reversed"] = true;
dojo.provide("dojox.lang.functional.reversed");



// This module adds high-level functions and related constructs:
//	- reversed versions of array-processing functions similar to standard JS functions

// Notes:
//	- this module provides reversed versions of standard array-processing functions:
//		forEachRev, mapRev, filterRev

// Defined methods:
//	- take any valid lambda argument as the functional argument
//	- operate on dense arrays
//	- take a string as the array argument

(function(){
	var d = dojo, df = dojox.lang.functional;

	d.mixin(df, {
		// JS 1.6 standard array functions, which can take a lambda as a parameter.
		// Consider using dojo._base.array functions, if you don't need the lambda support.
		filterRev: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: creates a new array with all elements that pass the test
			//	implemented by the provided function.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var t = [], v, i = a.length - 1;
			for(; i >= 0; --i){
				v = a[i];
				if(f.call(o, v, i, a)){ t.push(v); }
			}
			return t;	// Array
		},
		forEachRev: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: executes a provided function once per array element.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			for(var i = a.length - 1; i >= 0; f.call(o, a[i], i, a), --i);
		},
		mapRev: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: creates a new array with the results of calling
			//	a provided function on every element in this array.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var n = a.length, t = new Array(n), i = n - 1, j = 0;
			for(; i >= 0; t[j++] = f.call(o, a[i], i, a), --i);
			return t;	// Array
		},
		everyRev: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: tests whether all elements in the array pass the test
			//	implemented by the provided function.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			for(var i = a.length - 1; i >= 0; --i){
				if(!f.call(o, a[i], i, a)){
					return false;	// Boolean
				}
			}
			return true;	// Boolean
		},
		someRev: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: tests whether some element in the array passes the test
			//	implemented by the provided function.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			for(var i = a.length - 1; i >= 0; --i){
				if(f.call(o, a[i], i, a)){
					return true;	// Boolean
				}
			}
			return false;	// Boolean
		}
	});
})();

}

if(!dojo._hasResource["dojox.gfx.fx"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.gfx.fx"] = true;
dojo.provide("dojox.gfx.fx");



(function(){
	var d = dojo, g = dojox.gfx, m = g.matrix;

	// Generic interpolators. Should they be moved to dojox.fx?

	function InterpolNumber(start, end){
		this.start = start, this.end = end;
	}
	InterpolNumber.prototype.getValue = function(r){
		return (this.end - this.start) * r + this.start;
	};

	function InterpolUnit(start, end, units){
		this.start = start, this.end = end;
		this.units = units;
	}
	InterpolUnit.prototype.getValue = function(r){
		return (this.end - this.start) * r + this.start + this.units;
	};

	function InterpolColor(start, end){
		this.start = start, this.end = end;
		this.temp = new dojo.Color();
	}
	InterpolColor.prototype.getValue = function(r){
		return d.blendColors(this.start, this.end, r, this.temp);
	};

	function InterpolValues(values){
		this.values = values;
		this.length = values.length;
	}
	InterpolValues.prototype.getValue = function(r){
		return this.values[Math.min(Math.floor(r * this.length), this.length - 1)];
	};

	function InterpolObject(values, def){
		this.values = values;
		this.def = def ? def : {};
	}
	InterpolObject.prototype.getValue = function(r){
		var ret = dojo.clone(this.def);
		for(var i in this.values){
			ret[i] = this.values[i].getValue(r);
		}
		return ret;
	};

	function InterpolTransform(stack, original){
		this.stack = stack;
		this.original = original;
	}
	InterpolTransform.prototype.getValue = function(r){
		var ret = [];
		dojo.forEach(this.stack, function(t){
			if(t instanceof m.Matrix2D){
				ret.push(t);
				return;
			}
			if(t.name == "original" && this.original){
				ret.push(this.original);
				return;
			}
			if(!(t.name in m)){ return; }
			var f = m[t.name];
			if(typeof f != "function"){
				// constant
				ret.push(f);
				return;
			}
			var val = dojo.map(t.start, function(v, i){
							return (t.end[i] - v) * r + v;
						}),
				matrix = f.apply(m, val);
			if(matrix instanceof m.Matrix2D){
				ret.push(matrix);
			}
		}, this);
		return ret;
	};

	var transparent = new d.Color(0, 0, 0, 0);

	function getColorInterpol(prop, obj, name, def){
		if(prop.values){
			return new InterpolValues(prop.values);
		}
		var value, start, end;
		if(prop.start){
			start = g.normalizeColor(prop.start);
		}else{
			start = value = obj ? (name ? obj[name] : obj) : def;
		}
		if(prop.end){
			end = g.normalizeColor(prop.end);
		}else{
			if(!value){
				value = obj ? (name ? obj[name] : obj) : def;
			}
			end = value;
		}
		return new InterpolColor(start, end);
	}

	function getNumberInterpol(prop, obj, name, def){
		if(prop.values){
			return new InterpolValues(prop.values);
		}
		var value, start, end;
		if(prop.start){
			start = prop.start;
		}else{
			start = value = obj ? obj[name] : def;
		}
		if(prop.end){
			end = prop.end;
		}else{
			if(typeof value != "number"){
				value = obj ? obj[name] : def;
			}
			end = value;
		}
		return new InterpolNumber(start, end);
	}

	g.fx.animateStroke = function(/*Object*/ args){
		// summary:
		//	Returns an animation which will change stroke properties over time
		// example:
		//	|	dojox.gfx.fx.animateStroke{{
		//	|		shape: shape,
		//	|		duration: 500,
		//	|		color: {start: "red", end: "green"},
		//	|		width: {end: 15},
		//	|		join:  {values: ["miter", "bevel", "round"]}
		//	|	}).play();
		if(!args.easing){ args.easing = d._defaultEasing; }
		var anim = new d.Animation(args), shape = args.shape, stroke;
		d.connect(anim, "beforeBegin", anim, function(){
			stroke = shape.getStroke();
			var prop = args.color, values = {}, value, start, end;
			if(prop){
				values.color = getColorInterpol(prop, stroke, "color", transparent);
			}
			prop = args.style;
			if(prop && prop.values){
				values.style = new InterpolValues(prop.values);
			}
			prop = args.width;
			if(prop){
				values.width = getNumberInterpol(prop, stroke, "width", 1);
			}
			prop = args.cap;
			if(prop && prop.values){
				values.cap = new InterpolValues(prop.values);
			}
			prop = args.join;
			if(prop){
				if(prop.values){
					values.join = new InterpolValues(prop.values);
				}else{
					start = prop.start ? prop.start : (stroke && stroke.join || 0);
					end = prop.end ? prop.end : (stroke && stroke.join || 0);
					if(typeof start == "number" && typeof end == "number"){
						values.join = new InterpolNumber(start, end);
					}
				}
			}
			this.curve = new InterpolObject(values, stroke);
		});
		d.connect(anim, "onAnimate", shape, "setStroke");
		return anim; // dojo.Animation
	};

	g.fx.animateFill = function(/*Object*/ args){
		// summary:
		//	Returns an animation which will change fill color over time.
		//	Only solid fill color is supported at the moment
		// example:
		//	|	dojox.gfx.fx.animateFill{{
		//	|		shape: shape,
		//	|		duration: 500,
		//	|		color: {start: "red", end: "green"}
		//	|	}).play();
		if(!args.easing){ args.easing = d._defaultEasing; }
		var anim = new d.Animation(args), shape = args.shape, fill;
		d.connect(anim, "beforeBegin", anim, function(){
			fill = shape.getFill();
			var prop = args.color, values = {};
			if(prop){
				this.curve = getColorInterpol(prop, fill, "", transparent);
			}
		});
		d.connect(anim, "onAnimate", shape, "setFill");
		return anim; // dojo.Animation
	};

	g.fx.animateFont = function(/*Object*/ args){
		// summary:
		//	Returns an animation which will change font properties over time
		// example:
		//	|	dojox.gfx.fx.animateFont{{
		//	|		shape: shape,
		//	|		duration: 500,
		//	|		variant: {values: ["normal", "small-caps"]},
		//	|		size:  {end: 10, units: "pt"}
		//	|	}).play();
		if(!args.easing){ args.easing = d._defaultEasing; }
		var anim = new d.Animation(args), shape = args.shape, font;
		d.connect(anim, "beforeBegin", anim, function(){
			font = shape.getFont();
			var prop = args.style, values = {}, value, start, end;
			if(prop && prop.values){
				values.style = new InterpolValues(prop.values);
			}
			prop = args.variant;
			if(prop && prop.values){
				values.variant = new InterpolValues(prop.values);
			}
			prop = args.weight;
			if(prop && prop.values){
				values.weight = new InterpolValues(prop.values);
			}
			prop = args.family;
			if(prop && prop.values){
				values.family = new InterpolValues(prop.values);
			}
			prop = args.size;
			if(prop && prop.units){
				start = parseFloat(prop.start ? prop.start : (shape.font && shape.font.size || "0"));
				end = parseFloat(prop.end ? prop.end : (shape.font && shape.font.size || "0"));
				values.size = new InterpolUnit(start, end, prop.units);
			}
			this.curve = new InterpolObject(values, font);
		});
		d.connect(anim, "onAnimate", shape, "setFont");
		return anim; // dojo.Animation
	};

	g.fx.animateTransform = function(/*Object*/ args){
		// summary:
		//	Returns an animation which will change transformation over time
		// example:
		//	|	dojox.gfx.fx.animateTransform{{
		//	|		shape: shape,
		//	|		duration: 500,
		//	|		transform: [
		//	|			{name: "translate", start: [0, 0], end: [200, 200]},
		//	|			{name: "original"}
		//	|		]
		//	|	}).play();
		if(!args.easing){ args.easing = d._defaultEasing; }
		var anim = new d.Animation(args), shape = args.shape, original;
		d.connect(anim, "beforeBegin", anim, function(){
			original = shape.getTransform();
			this.curve = new InterpolTransform(args.transform, original);
		});
		d.connect(anim, "onAnimate", shape, "setTransform");
		return anim; // dojo.Animation
	};
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.Default"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Default"] = true;
dojo.provide("dojox.charting.plot2d.Default");









/*=====
dojo.declare("dojox.charting.plot2d.__DefaultCtorArgs", dojox.charting.plot2d.__PlotCtorArgs, {
	//	summary:
	//		The arguments used for any/most plots.

	//	hAxis: String?
	//		The horizontal axis name.
	hAxis: "x",

	//	vAxis: String?
	//		The vertical axis name
	vAxis: "y",

	//	lines: Boolean?
	//		Whether or not to draw lines on this plot.  Defaults to true.
	lines:   true,

	//	areas: Boolean?
	//		Whether or not to draw areas on this plot. Defaults to false.
	areas:   false,

	//	markers: Boolean?
	//		Whether or not to draw markers at data points on this plot. Default is false.
	markers: false,

	//	tension: Number|String?
	//		Whether or not to apply 'tensioning' to the lines on this chart.
	//		Options include a number, "X", "x", or "S"; if a number is used, the
	//		simpler bezier curve calculations are used to draw the lines.  If X, x or S
	//		is used, the more accurate smoothing algorithm is used.
	tension: "",

	//	animate: Boolean?
	//		Whether or not to animate the chart to place.
	animate: false,

	//	stroke: dojox.gfx.Stroke?
	//		An optional stroke to use for any series on the plot.
	stroke:		{},

	//	outline: dojox.gfx.Stroke?
	//		An optional stroke used to outline any series on the plot.
	outline:	{},

	//	shadow: dojox.gfx.Stroke?
	//		An optional stroke to use to draw any shadows for a series on a plot.
	shadow:		{},

	//	fill: dojox.gfx.Fill?
	//		Any fill to be used for elements on the plot (such as areas).
	fill:		{},

	//	font: String?
	//		A font definition to be used for labels and other text-based elements on the plot.
	font:		"",

	//	fontColor: String|dojo.Color?
	//		The color to be used for any text-based elements on the plot.
	fontColor:	"",

	//	markerStroke: dojo.gfx.Stroke?
	//		An optional stroke to use for any markers on the plot.
	markerStroke:		{},

	//	markerOutline: dojo.gfx.Stroke?
	//		An optional outline to use for any markers on the plot.
	markerOutline:		{},

	//	markerShadow: dojo.gfx.Stroke?
	//		An optional shadow to use for any markers on the plot.
	markerShadow:		{},

	//	markerFill: dojo.gfx.Fill?
	//		An optional fill to use for any markers on the plot.
	markerFill:			{},

	//	markerFont: String?
	//		An optional font definition to use for any markers on the plot.
	markerFont:			"",

	//	markerFontColor: String|dojo.Color?
	//		An optional color to use for any marker text on the plot.
	markerFontColor:	""
});
=====*/
(function(){
	var df = dojox.lang.functional, du = dojox.lang.utils,
		dc = dojox.charting.plot2d.common,
		purgeGroup = df.lambda("item.purgeGroup()");

	var DEFAULT_ANIMATION_LENGTH = 1200;	// in ms

	dojo.declare("dojox.charting.plot2d.Default", dojox.charting.plot2d.Base, {
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			lines:   true,	// draw lines
			areas:   false,	// draw areas
			markers: false,	// draw markers
			tension: "",	// draw curved lines (tension is "X", "x", or "S")
			animate: false	// animate chart to place
		},
		optionalParams: {
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	"",
			markerStroke:		{},
			markerOutline:		{},
			markerShadow:		{},
			markerFill:			{},
			markerFont:			"",
			markerFontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		Return a new plot.
			//	chart: dojox.charting.Chart2D
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__DefaultCtorArgs?
			//		An optional arguments object to help define this plot.
			this.opt = dojo.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
            du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;

			// animation properties
			this.animate = this.opt.animate;
		},

		render: function(dim, offsets){
			//	summary:
			//		Render/draw everything on this plot.
			//	dim: Object
			//		An object of the form { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b }
			//	returns: dojox.charting.plot2d.Default
			//		A reference to this plot for functional chaining.

			// make sure all the series is not modified
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}

			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				dojo.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				this.group.setTransform(null);
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, stroke, outline, marker, events = this.events();

			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				if(!run.data.length){
					run.dirty = false;
					t.skip();
					continue;
				}

				var theme = t.next(this.opt.areas ? "area" : "line", [this.opt, run], true),
					s = run.group, rsegments = [], startindexes = [], rseg = null, lpoly,
					ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
					vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
					eventSeries = this._eventSeries[run.name] = new Array(run.data.length);

                // split the run data into dense segments (each containing no nulls)
                for(var j = 0; j < run.data.length; j++){
                    if(run.data[j] != null){
                        if(!rseg){
                            rseg = [];
                            startindexes.push(j);
                            rsegments.push(rseg)
                        }
                        rseg.push(run.data[j]);
                    }else{
                        rseg = null;
                    }
                }

                for(var seg = 0; seg < rsegments.length; seg++){
					if(typeof rsegments[seg][0] == "number"){
						lpoly = dojo.map(rsegments[seg], function(v, i){
							return {
								x: ht(i + startindexes[seg] + 1) + offsets.l,
								y: dim.height - offsets.b - vt(v)
							};
						}, this);
					}else{
						lpoly = dojo.map(rsegments[seg], function(v, i){
							return {
								x: ht(v.x) + offsets.l,
								y: dim.height - offsets.b - vt(v.y)
							};
						}, this);
					}

					var lpath = this.opt.tension ? dc.curve(lpoly, this.opt.tension) : "";

					if(this.opt.areas && lpoly.length > 1){
						var fill = theme.series.fill;
						var apoly = dojo.clone(lpoly);
						if(this.opt.tension){
							var apath = "L" + apoly[apoly.length-1].x + "," + (dim.height - offsets.b) +
								" L" + apoly[0].x + "," + (dim.height - offsets.b) +
								" L" + apoly[0].x + "," + apoly[0].y;
							run.dyn.fill = s.createPath(lpath + " " + apath).setFill(fill).getFill();
						} else {
							apoly.push({x: lpoly[lpoly.length - 1].x, y: dim.height - offsets.b});
							apoly.push({x: lpoly[0].x, y: dim.height - offsets.b});
							apoly.push(lpoly[0]);
							run.dyn.fill = s.createPolyline(apoly).setFill(fill).getFill();
						}
					}
					if(this.opt.lines || this.opt.markers){
						// need a stroke
						stroke = theme.series.stroke;
						if(theme.series.outline){
							outline = run.dyn.outline = dc.makeStroke(theme.series.outline);
							outline.width = 2 * outline.width + stroke.width;
						}
					}
					if(this.opt.markers){
						run.dyn.marker = theme.symbol;
					}
					var frontMarkers = null, outlineMarkers = null, shadowMarkers = null;
					if(stroke && theme.series.shadow && lpoly.length > 1){
						var shadow = theme.series.shadow,
							spoly = dojo.map(lpoly, function(c){
								return {x: c.x + shadow.dx, y: c.y + shadow.dy};
							});
						if(this.opt.lines){
							if(this.opt.tension){
								run.dyn.shadow = s.createPath(dc.curve(spoly, this.opt.tension)).setStroke(shadow).getStroke();
							} else {
								run.dyn.shadow = s.createPolyline(spoly).setStroke(shadow).getStroke();
							}
						}
						if(this.opt.markers && theme.marker.shadow){
							shadow = theme.marker.shadow;
							shadowMarkers = dojo.map(spoly, function(c){
								return s.createPath("M" + c.x + " " + c.y + " " + theme.symbol).
									setStroke(shadow).setFill(shadow.color);
							}, this);
						}
					}
					if(this.opt.lines && lpoly.length > 1){
						if(outline){
							if(this.opt.tension){
								run.dyn.outline = s.createPath(lpath).setStroke(outline).getStroke();
							} else {
								run.dyn.outline = s.createPolyline(lpoly).setStroke(outline).getStroke();
							}
						}
						if(this.opt.tension){
							run.dyn.stroke = s.createPath(lpath).setStroke(stroke).getStroke();
						} else {
							run.dyn.stroke = s.createPolyline(lpoly).setStroke(stroke).getStroke();
						}
					}
					if(this.opt.markers){
						frontMarkers = new Array(lpoly.length);
						outlineMarkers = new Array(lpoly.length);
						outline = null;
						if(theme.marker.outline){
							outline = dc.makeStroke(theme.marker.outline);
							outline.width = 2 * outline.width + (theme.marker.stroke ? theme.marker.stroke.width : 0);
						}
						dojo.forEach(lpoly, function(c, i){
							var path = "M" + c.x + " " + c.y + " " + theme.symbol;
							if(outline){
								outlineMarkers[i] = s.createPath(path).setStroke(outline);
							}
							frontMarkers[i] = s.createPath(path).setStroke(theme.marker.stroke).setFill(theme.marker.fill);
						}, this);
						run.dyn.markerFill = theme.marker.fill;
						run.dyn.markerStroke = theme.marker.stroke;
						if(events){
							dojo.forEach(frontMarkers, function(s, i){
								var o = {
									element: "marker",
									index:   i + startindexes[seg],
									run:     run,
									shape:   s,
									outline: outlineMarkers[i] || null,
									shadow:  shadowMarkers && shadowMarkers[i] || null,
									cx:      lpoly[i].x,
									cy:      lpoly[i].y
								};
								if(typeof rsegments[seg][0] == "number"){
									o.x = i + startindexes[seg] + 1;
									o.y = rsegments[seg][i];
								}else{
									o.x = rsegments[seg][i].x;
									o.y = rsegments[seg][i].y;
								}
								this._connectEvents(o);
								eventSeries[i + startindexes[seg]] = o;
							}, this);
						}else{
							delete this._eventSeries[run.name];
						}
					}
                }
				run.dirty = false;
			}
			if(this.animate){
				// grow from the bottom
				var plotGroup = this.group;
				dojox.gfx.fx.animateTransform(dojo.delegate({
					shape: plotGroup,
					duration: DEFAULT_ANIMATION_LENGTH,
					transform:[
						{name:"translate", start: [0, dim.height - offsets.b], end: [0, 0]},
						{name:"scale", start: [1, 0], end:[1, 1]},
						{name:"original"}
					]
				}, this.animate)).play();
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Default
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.Lines"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Lines"] = true;
dojo.provide("dojox.charting.plot2d.Lines");



dojo.declare("dojox.charting.plot2d.Lines", dojox.charting.plot2d.Default, {
	//	summary:
	//		A convenience constructor to create a typical line chart.
	constructor: function(){
		//	summary:
		//		Preset our default plot to be line-based.
		this.opt.lines = true;
	}
});

}

if(!dojo._hasResource["dojox.charting.plot2d.Areas"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Areas"] = true;
dojo.provide("dojox.charting.plot2d.Areas");



dojo.declare("dojox.charting.plot2d.Areas", dojox.charting.plot2d.Default, {
	//	summary:
	//		Represents an area chart.  See dojox.charting.plot2d.Default for details.
	constructor: function(){
		this.opt.lines = true;
		this.opt.areas = true;
	}
});

}

if(!dojo._hasResource["dojox.charting.plot2d.Markers"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Markers"] = true;
dojo.provide("dojox.charting.plot2d.Markers");



dojo.declare("dojox.charting.plot2d.Markers", dojox.charting.plot2d.Default, {
	//	summary:
	//		A convenience plot to draw a line chart with markers.
	constructor: function(){
		//	summary:
		//		Set up the plot for lines and markers.
		this.opt.markers = true;
	}
});

}

if(!dojo._hasResource["dojox.charting.plot2d.MarkersOnly"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.MarkersOnly"] = true;
dojo.provide("dojox.charting.plot2d.MarkersOnly");



dojo.declare("dojox.charting.plot2d.MarkersOnly", dojox.charting.plot2d.Default, {
	//	summary:
	//		A convenience object to draw only markers (like a scatter but not quite).
	constructor: function(){
		//	summary:
		//		Set up our default plot to only have markers and no lines.
		this.opt.lines   = false;
		this.opt.markers = true;
	}
});

}

if(!dojo._hasResource["dojox.gfx.gradutils"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.gfx.gradutils"] = true;
dojo.provide("dojox.gfx.gradutils");



// Various generic utilities to deal with a linear gradient

(function(){
	var d = dojo, m = dojox.gfx.matrix, C = d.Color;
	
	function findColor(o, c){
		if(o <= 0){
			return c[0].color;
		}
		var len = c.length;
		if(o >= 1){
			return c[len - 1].color;
		}
		//TODO: use binary search
		for(var i = 0; i < len; ++i){
			var stop = c[i];
			if(stop.offset >= o){
				if(i){
					var prev = c[i - 1];
					return d.blendColors(new C(prev.color), new C(stop.color),
						(o - prev.offset) / (stop.offset - prev.offset));
				}
				return stop.color;
			}
		}
		return c[len - 1].color;
	}

	dojox.gfx.gradutils.getColor = function(fill, pt){
		// summary:
		//		sample a color from a gradient using a point
		// fill: Object:
		//		fill object
		// pt: dojox.gfx.Point:
		//		point where to sample a color
		var o;
		if(fill){
			switch(fill.type){
				case "linear":
					var angle = Math.atan2(fill.y2 - fill.y1, fill.x2 - fill.x1),
						rotation = m.rotate(-angle),
						projection = m.project(fill.x2 - fill.x1, fill.y2 - fill.y1),
						p = m.multiplyPoint(projection, pt),
						pf1 = m.multiplyPoint(projection, fill.x1, fill.y1),
						pf2 = m.multiplyPoint(projection, fill.x2, fill.y2),
						scale = m.multiplyPoint(rotation, pf2.x - pf1.x, pf2.y - pf1.y).x,
						o = m.multiplyPoint(rotation, p.x - pf1.x, p.y - pf1.y).x / scale;
					break;
				case "radial":
					var dx = pt.x - fill.cx, dy = pt.y - fill.cy,
						o = Math.sqrt(dx * dx + dy * dy) / fill.r;
					break;
			}
			return findColor(o, fill.colors);	// dojo.Color
		}
		// simple color
		return new C(fill || [0, 0, 0, 0]);	// dojo.Color
	};

	dojox.gfx.gradutils.reverse = function(fill){
		// summary:
		//		reverses a gradient
		// fill: Object:
		//		fill object
		if(fill){
			switch(fill.type){
				case "linear":
				case "radial":
					fill = dojo.delegate(fill);
					if(fill.colors){
						var c = fill.colors, l = c.length, i = 0, stop,
							n = fill.colors = new Array(c.length);
						for(; i < l; ++i){
							stop = c[i];
							n[i] = {
								offset: 1 - stop.offset,
								color:  stop.color
							};
						}
						n.sort(function(a, b){ return a.offset - b.offset; });
					}
					break;
			}
		}
		return fill;	// Object
	};
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.Scatter"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Scatter"] = true;
dojo.provide("dojox.charting.plot2d.Scatter");











(function(){
	var df = dojox.lang.functional, du = dojox.lang.utils,
		dc = dojox.charting.plot2d.common,
		purgeGroup = df.lambda("item.purgeGroup()");

	dojo.declare("dojox.charting.plot2d.Scatter", dojox.charting.plot2d.Base, {
		//	summary:
		//		A plot object representing a typical scatter chart.
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			shadows: null,	// draw shadows
			animate: null	// animate chart to place
		},
		optionalParams: {
			// theme component
			markerStroke:		{},
			markerOutline:		{},
			markerShadow:		{},
			markerFill:			{},
			markerFont:			"",
			markerFontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		Create the scatter plot.
			//	chart: dojox.charting.Chart2D
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__DefaultCtorArgs?
			//		An optional keyword arguments object to help define this plot's parameters.
			this.opt = dojo.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
            du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.Scatter
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				dojo.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, events = this.events();
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				if(!run.data.length){
					run.dirty = false;
					t.skip();
					continue;
				}

				var theme = t.next("marker", [this.opt, run]), s = run.group, lpoly,
					ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
					vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler);
				if(typeof run.data[0] == "number"){
					lpoly = dojo.map(run.data, function(v, i){
						return {
							x: ht(i + 1) + offsets.l,
							y: dim.height - offsets.b - vt(v)
						};
					}, this);
				}else{
					lpoly = dojo.map(run.data, function(v, i){
						return {
							x: ht(v.x) + offsets.l,
							y: dim.height - offsets.b - vt(v.y)
						};
					}, this);
				}

				var shadowMarkers  = new Array(lpoly.length),
					frontMarkers   = new Array(lpoly.length),
					outlineMarkers = new Array(lpoly.length);

				dojo.forEach(lpoly, function(c, i){
					var finalTheme = typeof run.data[i] == "number" ?
							t.post(theme, "marker") :
							t.addMixin(theme, "marker", run.data[i], true),
						path = "M" + c.x + " " + c.y + " " + finalTheme.symbol;
					if(finalTheme.marker.shadow){
						shadowMarkers[i] = s.createPath("M" + (c.x + finalTheme.marker.shadow.dx) + " " +
							(c.y + finalTheme.marker.shadow.dy) + " " + finalTheme.symbol).
							setStroke(finalTheme.marker.shadow).setFill(finalTheme.marker.shadow.color);
						if(this.animate){
							this._animateScatter(shadowMarkers[i], dim.height - offsets.b);
						}
					}
					if(finalTheme.marker.outline){
						var outline = dc.makeStroke(finalTheme.marker.outline);
						outline.width = 2 * outline.width + finalTheme.marker.stroke.width;
						outlineMarkers[i] = s.createPath(path).setStroke(outline);
						if(this.animate){
							this._animateScatter(outlineMarkers[i], dim.height - offsets.b);
						}
					}
					var stroke = dc.makeStroke(finalTheme.marker.stroke),
						fill = this._plotFill(finalTheme.marker.fill, dim, offsets);
					if(fill && (fill.type === "linear" || fill.type == "radial")){
						var color = dojox.gfx.gradutils.getColor(fill, {x: c.x, y: c.y});
						if(stroke){
							stroke.color = color;
						}
						frontMarkers[i] = s.createPath(path).setStroke(stroke).setFill(color);
					}else{
						frontMarkers[i] = s.createPath(path).setStroke(stroke).setFill(fill);
					}
					if(this.animate){
						this._animateScatter(frontMarkers[i], dim.height - offsets.b);
					}
				}, this);
				if(frontMarkers.length){
					run.dyn.stroke = frontMarkers[frontMarkers.length - 1].getStroke();
					run.dyn.fill   = frontMarkers[frontMarkers.length - 1].getFill();
				}

				if(events){
					var eventSeries = new Array(frontMarkers.length);
					dojo.forEach(frontMarkers, function(s, i){
						var o = {
							element: "marker",
							index:   i,
							run:     run,
							shape:   s,
							outline: outlineMarkers && outlineMarkers[i] || null,
							shadow:  shadowMarkers && shadowMarkers[i] || null,
							cx:      lpoly[i].x,
							cy:      lpoly[i].y
						};
						if(typeof run.data[0] == "number"){
							o.x = i + 1;
							o.y = run.data[i];
						}else{
							o.x = run.data[i].x;
							o.y = run.data[i].y;
						}
						this._connectEvents(o);
						eventSeries[i] = o;
					}, this);
					this._eventSeries[run.name] = eventSeries;
				}else{
					delete this._eventSeries[run.name];
				}
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Scatter
		},
		_animateScatter: function(shape, offset){
			dojox.gfx.fx.animateTransform(dojo.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [0, offset], end: [0, 0]},
					{name: "scale", start: [0, 0], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
})();

}

if(!dojo._hasResource["dojox.lang.functional.sequence"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.functional.sequence"] = true;
dojo.provide("dojox.lang.functional.sequence");



// This module adds high-level functions and related constructs:
//	- sequence generators

// If you want more general sequence builders check out listcomp.js and
// unfold() (in fold.js).

// Defined methods:
//	- take any valid lambda argument as the functional argument

(function(){
	var d = dojo, df = dojox.lang.functional;

	d.mixin(df, {
		// sequence generators
		repeat: function(/*Number*/ n, /*Function|String|Array*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: builds an array by repeatedly applying a unary function N times
			//	with a seed value Z. N should be greater than 0.
			o = o || d.global; f = df.lambda(f);
			var t = new Array(n), i = 1;
			t[0] = z;
			for(; i < n; t[i] = z = f.call(o, z), ++i);
			return t;	// Array
		},
		until: function(/*Function|String|Array*/ pr, /*Function|String|Array*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: builds an array by repeatedly applying a unary function with
			//	a seed value Z until the predicate is satisfied.
			o = o || d.global; f = df.lambda(f); pr = df.lambda(pr);
			var t = [];
			for(; !pr.call(o, z); t.push(z), z = f.call(o, z));
			return t;	// Array
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.Stacked"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Stacked"] = true;
dojo.provide("dojox.charting.plot2d.Stacked");








(function(){
	var df = dojox.lang.functional, dc = dojox.charting.plot2d.common,
		purgeGroup = df.lambda("item.purgeGroup()");

	dojo.declare("dojox.charting.plot2d.Stacked", dojox.charting.plot2d.Default, {
		//	summary:
		//		Like the default plot, Stacked sets up lines, areas and markers
		//		in a stacked fashion (values on the y axis added to each other)
		//		as opposed to a direct one.
		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectStackedStats(this.series);
			this._maxRunLength = stats.hmax;
			return stats;
		},
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.Stacked
			//		A reference to this plot for functional chaining.
			if(this._maxRunLength <= 0){
				return this;
			}

			// stack all values
			var acc = df.repeat(this._maxRunLength, "-> 0", 0);
			for(var i = 0; i < this.series.length; ++i){
				var run = this.series[i];
				for(var j = 0; j < run.data.length; ++j){
					var v = run.data[j];
					if(v !== null){
						if(isNaN(v)){ v = 0; }
						acc[j] += v;
					}
				}
			}
			// draw runs in backwards
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				dojo.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}

			var t = this.chart.theme, events = this.events(),
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler);

			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next(this.opt.areas ? "area" : "line", [this.opt, run], true),
					s = run.group, outline,
					lpoly = dojo.map(acc, function(v, i){
						return {
							x: ht(i + 1) + offsets.l,
							y: dim.height - offsets.b - vt(v)
						};
					}, this);

				var lpath = this.opt.tension ? dc.curve(lpoly, this.opt.tension) : "";

				if(this.opt.areas){
					var apoly = dojo.clone(lpoly);
					if(this.opt.tension){
						var p=dc.curve(apoly, this.opt.tension);
						p += " L" + lpoly[lpoly.length - 1].x + "," + (dim.height - offsets.b) +
							" L" + lpoly[0].x + "," + (dim.height - offsets.b) +
							" L" + lpoly[0].x + "," + lpoly[0].y;
						run.dyn.fill = s.createPath(p).setFill(theme.series.fill).getFill();
					} else {
						apoly.push({x: lpoly[lpoly.length - 1].x, y: dim.height - offsets.b});
						apoly.push({x: lpoly[0].x, y: dim.height - offsets.b});
						apoly.push(lpoly[0]);
						run.dyn.fill = s.createPolyline(apoly).setFill(theme.series.fill).getFill();
					}
				}
				if(this.opt.lines || this.opt.markers){
					if(theme.series.outline){
						outline = dc.makeStroke(theme.series.outline);
						outline.width = 2 * outline.width + theme.series.stroke.width;
					}
				}
				if(this.opt.markers){
					run.dyn.marker = theme.symbol;
				}
				var frontMarkers, outlineMarkers, shadowMarkers;
				if(theme.series.shadow && theme.series.stroke){
					var shadow = theme.series.shadow,
						spoly = dojo.map(lpoly, function(c){
							return {x: c.x + shadow.dx, y: c.y + shadow.dy};
						});
					if(this.opt.lines){
						if(this.opt.tension){
							run.dyn.shadow = s.createPath(dc.curve(spoly, this.opt.tension)).setStroke(shadow).getStroke();
						} else {
							run.dyn.shadow = s.createPolyline(spoly).setStroke(shadow).getStroke();
						}
					}
					if(this.opt.markers){
						shadow = theme.marker.shadow;
						shadowMarkers = dojo.map(spoly, function(c){
							return s.createPath("M" + c.x + " " + c.y + " " + theme.symbol).
								setStroke(shadow).setFill(shadow.color);
						}, this);
					}
				}
				if(this.opt.lines){
					if(outline){
						if(this.opt.tension){
							run.dyn.outline = s.createPath(lpath).setStroke(outline).getStroke();
						} else {
							run.dyn.outline = s.createPolyline(lpoly).setStroke(outline).getStroke();
						}
					}
					if(this.opt.tension){
						run.dyn.stroke = s.createPath(lpath).setStroke(theme.series.stroke).getStroke();
					} else {
						run.dyn.stroke = s.createPolyline(lpoly).setStroke(theme.series.stroke).getStroke();
					}
				}
				if(this.opt.markers){
					frontMarkers = new Array(lpoly.length);
					outlineMarkers = new Array(lpoly.length);
					outline = null;
					if(theme.marker.outline){
						outline = dc.makeStroke(theme.marker.outline);
						outline.width = 2 * outline.width + (theme.marker.stroke ? theme.marker.stroke.width : 0);
					}
					dojo.forEach(lpoly, function(c, i){
						var path = "M" + c.x + " " + c.y + " " + theme.symbol;
						if(outline){
							outlineMarkers[i] = s.createPath(path).setStroke(outline);
						}
						frontMarkers[i] = s.createPath(path).setStroke(theme.marker.stroke).setFill(theme.marker.fill);
					}, this);
					if(events){
						var eventSeries = new Array(frontMarkers.length);
						dojo.forEach(frontMarkers, function(s, i){
							var o = {
								element: "marker",
								index:   i,
								run:     run,
								shape:   s,
								outline: outlineMarkers[i] || null,
								shadow:  shadowMarkers && shadowMarkers[i] || null,
								cx:      lpoly[i].x,
								cy:      lpoly[i].y,
								x:       i + 1,
								y:       run.data[i]
							};
							this._connectEvents(o);
							eventSeries[i] = o;
						}, this);
						this._eventSeries[run.name] = eventSeries;
					}else{
						delete this._eventSeries[run.name];
					}
				}
				run.dirty = false;
				// update the accumulator
				for(var j = 0; j < run.data.length; ++j){
					var v = run.data[j];
					if(v !== null){
						if(isNaN(v)){ v = 0; }
						acc[j] -= v;
					}
				}
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Stacked
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.StackedLines"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.StackedLines"] = true;
dojo.provide("dojox.charting.plot2d.StackedLines");



dojo.declare("dojox.charting.plot2d.StackedLines", dojox.charting.plot2d.Stacked, {
	//	summary:
	//		A convenience object to create a stacked line chart.
	constructor: function(){
		//	summary:
		//		Force our Stacked base to be lines only.
		this.opt.lines = true;
	}
});

}

if(!dojo._hasResource["dojox.charting.plot2d.StackedAreas"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.StackedAreas"] = true;
dojo.provide("dojox.charting.plot2d.StackedAreas");



dojo.declare("dojox.charting.plot2d.StackedAreas", dojox.charting.plot2d.Stacked, {
	//	summary:
	//		A convenience object to set up a stacked area plot.
	constructor: function(){
		//	summary:
		//		Force our Stacked plotter to include both lines and areas.
		this.opt.lines = true;
		this.opt.areas = true;
	}
});

}

if(!dojo._hasResource["dojox.charting.plot2d.Columns"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Columns"] = true;
dojo.provide("dojox.charting.plot2d.Columns");









(function(){
	var df = dojox.lang.functional, du = dojox.lang.utils,
		dc = dojox.charting.plot2d.common,
		purgeGroup = df.lambda("item.purgeGroup()");

	dojo.declare("dojox.charting.plot2d.Columns", dojox.charting.plot2d.Base, {
		//	summary:
		//		The plot object representing a column chart (vertical bars).
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			gap:	0,		// gap between columns in pixels
			animate: null   // animate bars into place
		},
		optionalParams: {
			minBarSize:	1,	// minimal column width in pixels
			maxBarSize:	1,	// maximal column width in pixels
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for a columns chart.
			//	chart: dojox.charting.Chart2D
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__BarCtorArgs?
			//		An optional keyword arguments object to help define the plot.
			this.opt = dojo.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectSimpleStats(this.series);
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			return stats;
		},

		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.Columns
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				dojo.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, width,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._vScaler.bounds.lower),
				baselineHeight = vt(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt);
			gap = f.gap;
			width = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("column", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y,
							vv = vt(v),
							height = vv - baselineHeight,
							h = Math.abs(height),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "column", value, true) :
								t.post(theme, "column");
						if(width >= 1 && h >= 1){
							var rect = {
								x: offsets.l + ht(j + 0.5) + gap,
								y: dim.height - offsets.b - (v > baseline ? vv : baselineHeight),
								width: width, height: h
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = s.createRect(rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "column",
									index:   j,
									run:     run,
									shape:   shape,
									x:       j + 0.5,
									y:       v
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateColumn(shape, dim.height - offsets.b - baselineHeight, h);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Columns
		},
		_animateColumn: function(shape, voffset, vsize){
			dojox.gfx.fx.animateTransform(dojo.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [0, voffset - (voffset/vsize)], end: [0, 0]},
					{name: "scale", start: [1, 1/vsize], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.StackedColumns"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.StackedColumns"] = true;
dojo.provide("dojox.charting.plot2d.StackedColumns");








(function(){
	var df = dojox.lang.functional, dc = dojox.charting.plot2d.common,
		purgeGroup = df.lambda("item.purgeGroup()");

	dojo.declare("dojox.charting.plot2d.StackedColumns", dojox.charting.plot2d.Columns, {
		//	summary:
		//		The plot object representing a stacked column chart (vertical bars).
		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectStackedStats(this.series);
			this._maxRunLength = stats.hmax;
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			return stats;
		},
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.StackedColumns
			//		A reference to this plot for functional chaining.
			if(this._maxRunLength <= 0){
				return this;
			}

			// stack all values
			var acc = df.repeat(this._maxRunLength, "-> 0", 0);
			for(var i = 0; i < this.series.length; ++i){
				var run = this.series[i];
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y;
						if(isNaN(v)){ v = 0; }
						acc[j] += v;
					}
				}
			}
			// draw runs in backwards
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				dojo.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, width,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				events = this.events();
			f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt);
			gap = f.gap;
			width = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("column", [this.opt, run]), s = run.group,
					eventSeries = new Array(acc.length);
				for(var j = 0; j < acc.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = acc[j],
							height = vt(v),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "column", value, true) :
								t.post(theme, "column");
						if(width >= 1 && height >= 1){
							var rect = {
								x: offsets.l + ht(j + 0.5) + gap,
								y: dim.height - offsets.b - vt(v),
								width: width, height: height
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = s.createRect(rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "column",
									index:   j,
									run:     run,
									shape:   shape,
									x:       j + 0.5,
									y:       v
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateColumn(shape, dim.height - offsets.b, height);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
				// update the accumulator
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y;
						if(isNaN(v)){ v = 0; }
						acc[j] -= v;
					}
				}
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.StackedColumns
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.ClusteredColumns"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.ClusteredColumns"] = true;
dojo.provide("dojox.charting.plot2d.ClusteredColumns");







(function(){
	var df = dojox.lang.functional, dc = dojox.charting.plot2d.common,
		purgeGroup = df.lambda("item.purgeGroup()");

	dojo.declare("dojox.charting.plot2d.ClusteredColumns", dojox.charting.plot2d.Columns, {
		//	summary:
		//		A plot representing grouped or clustered columns (vertical bars).
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.ClusteredColumns
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				dojo.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, width, thickness,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._vScaler.bounds.lower),
				baselineHeight = vt(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt, this.series.length);
			gap = f.gap;
			width = thickness = f.size;
			for(var i = 0; i < this.series.length; ++i){
				var run = this.series[i], shift = thickness * i;
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("column", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y,
							vv = vt(v),
							height = vv - baselineHeight,
							h = Math.abs(height),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "column", value, true) :
								t.post(theme, "column");
						if(width >= 1 && h >= 1){
							var rect = {
								x: offsets.l + ht(j + 0.5) + gap + shift,
								y: dim.height - offsets.b - (v > baseline ? vv : baselineHeight),
								width: width, height: h
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = s.createRect(rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "column",
									index:   j,
									run:     run,
									shape:   shape,
									x:       j + 0.5,
									y:       v
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateColumn(shape, dim.height - offsets.b - baselineHeight, h);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.ClusteredColumns
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.Bars"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Bars"] = true;
dojo.provide("dojox.charting.plot2d.Bars");








/*=====
dojo.declare("dojox.charting.plot2d.__BarCtorArgs", dojox.charting.plot2d.__DefaultCtorArgs, {
	//	summary:
	//		Additional keyword arguments for bar charts.

	//	minBarSize: Number?
	//		The minimum size for a bar in pixels.  Default is 1.
	minBarSize: 1,

	//	maxBarSize: Number?
	//		The maximum size for a bar in pixels.  Default is 1.
	maxBarSize: 1
});
=====*/
(function(){
	var df = dojox.lang.functional, du = dojox.lang.utils,
		dc = dojox.charting.plot2d.common,
		purgeGroup = df.lambda("item.purgeGroup()");

	dojo.declare("dojox.charting.plot2d.Bars", dojox.charting.plot2d.Base, {
		//	summary:
		//		The plot object representing a bar chart (horizontal bars).
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			gap:	0,		// gap between columns in pixels
			animate: null   // animate bars into place
		},
		optionalParams: {
			minBarSize:	1,	// minimal bar width in pixels
			maxBarSize:	1,	// maximal bar width in pixels
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for a bar chart.
			//	chart: dojox.charting.Chart2D
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__BarCtorArgs?
			//		An optional keyword arguments object to help define the plot.
			this.opt = dojo.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectSimpleStats(this.series), t;
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			t = stats.hmin, stats.hmin = stats.vmin, stats.vmin = t;
			t = stats.hmax, stats.hmax = stats.vmax, stats.vmax = t;
			return stats;
		},

		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.Bars
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.dirty = this.isDirty();
			this.resetEvents();
			if(this.dirty){
				dojo.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, height,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._hScaler.bounds.lower),
				baselineWidth = ht(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._vScaler.bounds.scale, this.opt);
			gap = f.gap;
			height = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("bar", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y,
							hv = ht(v),
							width = hv - baselineWidth,
							w = Math.abs(width),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "bar", value, true) :
								t.post(theme, "bar");
						if(w >= 1 && height >= 1){
							var rect = {
								x: offsets.l + (v < baseline ? hv : baselineWidth),
								y: dim.height - offsets.b - vt(j + 1.5) + gap,
								width: w, height: height
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = s.createRect(rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "bar",
									index:   j,
									run:     run,
									shape:   shape,
									x:       v,
									y:       j + 1.5
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateBar(shape, offsets.l + baselineWidth, -w);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Bars
		},
		_animateBar: function(shape, hoffset, hsize){
			dojox.gfx.fx.animateTransform(dojo.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [hoffset - (hoffset/hsize), 0], end: [0, 0]},
					{name: "scale", start: [1/hsize, 1], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.StackedBars"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.StackedBars"] = true;
dojo.provide("dojox.charting.plot2d.StackedBars");








(function(){
	var df = dojox.lang.functional, dc = dojox.charting.plot2d.common,
		purgeGroup = df.lambda("item.purgeGroup()");

	dojo.declare("dojox.charting.plot2d.StackedBars", dojox.charting.plot2d.Bars, {
		//	summary:
		//		The plot object representing a stacked bar chart (horizontal bars).
		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectStackedStats(this.series), t;
			this._maxRunLength = stats.hmax;
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			t = stats.hmin, stats.hmin = stats.vmin, stats.vmin = t;
			t = stats.hmax, stats.hmax = stats.vmax, stats.vmax = t;
			return stats;
		},
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.StackedBars
			//		A reference to this plot for functional chaining.
			if(this._maxRunLength <= 0){
				return this;
			}

			// stack all values
			var acc = df.repeat(this._maxRunLength, "-> 0", 0);
			for(var i = 0; i < this.series.length; ++i){
				var run = this.series[i];
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y;
						if(isNaN(v)){ v = 0; }
						acc[j] += v;
					}
				}
			}
			// draw runs in backwards
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				dojo.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, height,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				events = this.events();
			f = dc.calculateBarSize(this._vScaler.bounds.scale, this.opt);
			gap = f.gap;
			height = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("bar", [this.opt, run]), s = run.group,
					eventSeries = new Array(acc.length);
				for(var j = 0; j < acc.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = acc[j],
							width = ht(v),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "bar", value, true) :
								t.post(theme, "bar");
						if(width >= 1 && height >= 1){
							var rect = {
								x: offsets.l,
								y: dim.height - offsets.b - vt(j + 1.5) + gap,
								width: width, height: height
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = s.createRect(rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "bar",
									index:   j,
									run:     run,
									shape:   shape,
									x:       v,
									y:       j + 1.5
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateBar(shape, offsets.l, -width);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
				// update the accumulator
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y;
						if(isNaN(v)){ v = 0; }
						acc[j] -= v;
					}
				}
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.StackedBars
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.ClusteredBars"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.ClusteredBars"] = true;
dojo.provide("dojox.charting.plot2d.ClusteredBars");







(function(){
	var df = dojox.lang.functional, dc = dojox.charting.plot2d.common,
		purgeGroup = df.lambda("item.purgeGroup()");

	dojo.declare("dojox.charting.plot2d.ClusteredBars", dojox.charting.plot2d.Bars, {
		//	summary:
		//		A plot representing grouped or clustered bars (horizontal bars)
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.ClusteredBars
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				dojo.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, height, thickness,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._hScaler.bounds.lower),
				baselineWidth = ht(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._vScaler.bounds.scale, this.opt, this.series.length);
			gap = f.gap;
			height = thickness = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i], shift = thickness * (this.series.length - i - 1);
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("bar", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y,
							hv = ht(v),
							width = hv - baselineWidth,
							w = Math.abs(width),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "bar", value, true) :
								t.post(theme, "bar");
						if(w >= 1 && height >= 1){
							var rect = {
								x: offsets.l + (v < baseline ? hv : baselineWidth),
								y: dim.height - offsets.b - vt(j + 1.5) + gap + shift,
								width: w, height: height
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = s.createRect(rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "bar",
									index:   j,
									run:     run,
									shape:   shape,
									x:       v,
									y:       j + 1.5
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateBar(shape, offsets.l + baselineWidth, -width);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.ClusteredBars
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.Grid"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Grid"] = true;
dojo.provide("dojox.charting.plot2d.Grid");






/*=====
dojo.declare("dojox.charting.plot2d.__GridCtorArgs", dojox.charting.plot2d.__DefaultCtorArgs, {
	//	summary:
	//		A special keyword arguments object that is specific to a grid "plot".

	//	hMajorLines: Boolean?
	//		Whether to show lines at the major ticks along the horizontal axis. Default is true.
	hMajorLines: true,

	//	hMinorLines: Boolean?
	//		Whether to show lines at the minor ticks along the horizontal axis. Default is false.
	hMinorLines: false,

	//	vMajorLines: Boolean?
	//		Whether to show lines at the major ticks along the vertical axis. Default is true.
	vMajorLines: true,

	//	vMinorLines: Boolean?
	//		Whether to show lines at the major ticks along the vertical axis. Default is false.
	vMinorLines: false,

	//	hStripes: String?
	//		Whether or not to show stripes (alternating fills) along the horizontal axis. Default is "none".
	hStripes: "none",

	//	vStripes: String?
	//		Whether or not to show stripes (alternating fills) along the vertical axis. Default is "none".
	vStripes: "none"
});
=====*/
(function(){
	var du = dojox.lang.utils, dc = dojox.charting.plot2d.common;

	dojo.declare("dojox.charting.plot2d.Grid", dojox.charting.Element, {
		//	summary:
		//		A "faux" plot that can be placed behind other plots to represent
		//		a grid against which other plots can be easily measured.
		defaultParams: {
			hAxis: "x",			// use a horizontal axis named "x"
			vAxis: "y",			// use a vertical axis named "y"
			hMajorLines: true,	// draw horizontal major lines
			hMinorLines: false,	// draw horizontal minor lines
			vMajorLines: true,	// draw vertical major lines
			vMinorLines: false,	// draw vertical minor lines
			hStripes: "none",	// TBD
			vStripes: "none",	// TBD
			animate: null   // animate bars into place
		},
		optionalParams: {},	// no optional parameters

		constructor: function(chart, kwArgs){
			//	summary:
			//		Create the faux Grid plot.
			//	chart: dojox.charting.Chart2D
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__GridCtorArgs?
			//		An optional keyword arguments object to help define the parameters of the underlying grid.
			this.opt = dojo.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.dirty = true;
			this.animate = this.opt.animate;
			this.zoom = null,
			this.zoomQueue = [];	// zooming action task queue
			this.lastWindow = {vscale: 1, hscale: 1, xoffset: 0, yoffset: 0};
		},
		clear: function(){
			//	summary:
			//		Clear out any parameters set on this plot.
			//	returns: dojox.charting.plot2d.Grid
			//		The reference to this plot for functional chaining.
			this._hAxis = null;
			this._vAxis = null;
			this.dirty = true;
			return this;	//	dojox.charting.plot2d.Grid
		},
		setAxis: function(axis){
			//	summary:
			//		Set an axis for this plot.
			//	returns: dojox.charting.plot2d.Grid
			//		The reference to this plot for functional chaining.
			if(axis){
				this[axis.vertical ? "_vAxis" : "_hAxis"] = axis;
			}
			return this;	//	dojox.charting.plot2d.Grid
		},
		addSeries: function(run){
			//	summary:
			//		Ignored but included as a dummy method.
			//	returns: dojox.charting.plot2d.Grid
			//		The reference to this plot for functional chaining.
			return this;	//	dojox.charting.plot2d.Grid
		},
		getSeriesStats: function(){
			//	summary:
			//		Returns default stats (irrelevant for this type of plot).
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			return dojo.delegate(dc.defaultStats);
		},
		initializeScalers: function(){
			//	summary:
			//		Does nothing (irrelevant for this type of plot).
			return this;
		},
		isDirty: function(){
			//	summary:
			//		Return whether or not this plot needs to be redrawn.
			//	returns: Boolean
			//		If this plot needs to be rendered, this will return true.
			return this.dirty || this._hAxis && this._hAxis.dirty || this._vAxis && this._vAxis.dirty;	//	Boolean
		},
		performZoom: function(dim, offsets){
			//	summary:
			//		Create/alter any zooming windows on this plot.
			//	dim: Object
			//		An object of the form { width, height }.
			//	offsets: Object
			//		An object of the form { l, r, t, b }.
			//	returns: dojox.charting.plot2d.Grid
			//		A reference to this plot for functional chaining.

			// get current zooming various
			var vs = this._vAxis.scale || 1,
				hs = this._hAxis.scale || 1,
				vOffset = dim.height - offsets.b,
				hBounds = this._hAxis.getScaler().bounds,
				xOffset = (hBounds.from - hBounds.lower) * hBounds.scale,
				vBounds = this._vAxis.getScaler().bounds,
				yOffset = (vBounds.from - vBounds.lower) * vBounds.scale;
				// get incremental zooming various
				rVScale = vs / this.lastWindow.vscale,
				rHScale = hs / this.lastWindow.hscale,
				rXOffset = (this.lastWindow.xoffset - xOffset)/
					((this.lastWindow.hscale == 1)? hs : this.lastWindow.hscale),
				rYOffset = (yOffset - this.lastWindow.yoffset)/
					((this.lastWindow.vscale == 1)? vs : this.lastWindow.vscale),

				shape = this.group,
				anim = dojox.gfx.fx.animateTransform(dojo.delegate({
					shape: shape,
					duration: 1200,
					transform:[
						{name:"translate", start:[0, 0], end: [offsets.l * (1 - rHScale), vOffset * (1 - rVScale)]},
						{name:"scale", start:[1, 1], end: [rHScale, rVScale]},
						{name:"original"},
						{name:"translate", start: [0, 0], end: [rXOffset, rYOffset]}
					]}, this.zoom));

			dojo.mixin(this.lastWindow, {vscale: vs, hscale: hs, xoffset: xOffset, yoffset: yOffset});
			//add anim to zooming action queue,
			//in order to avoid several zooming action happened at the same time
			this.zoomQueue.push(anim);
			//perform each anim one by one in zoomQueue
			dojo.connect(anim, "onEnd", this, function(){
				this.zoom = null;
				this.zoomQueue.shift();
				if(this.zoomQueue.length > 0){
					this.zoomQueue[0].play();
				}
			});
			if(this.zoomQueue.length == 1){
				this.zoomQueue[0].play();
			}
			return this;	//	dojox.charting.plot2d.Grid
		},
		getRequiredColors: function(){
			//	summary:
			//		Ignored but included as a dummy method.
			//	returns: Number
			//		Returns 0, since there are no series associated with this plot type.
			return 0;	//	Number
		},
		render: function(dim, offsets){
			//	summary:
			//		Render the plot on the chart.
			//	dim: Object
			//		An object of the form { width, height }.
			//	offsets: Object
			//		An object of the form { l, r, t, b }.
			//	returns: dojox.charting.plot2d.Grid
			//		A reference to this plot for functional chaining.
			if(this.zoom){
				return this.performZoom(dim, offsets);
			}
			this.dirty = this.isDirty();
			if(!this.dirty){ return this; }
			this.cleanGroup();
			var s = this.group, ta = this.chart.theme.axis;
			// draw horizontal stripes and lines
			try{
				var vScaler = this._vAxis.getScaler(),
					vt = vScaler.scaler.getTransformerFromModel(vScaler),
					ticks = this._vAxis.getTicks();
				if(this.opt.hMinorLines){
					dojo.forEach(ticks.minor, function(tick){
						var y = dim.height - offsets.b - vt(tick.value);
						var hMinorLine = s.createLine({
							x1: offsets.l,
							y1: y,
							x2: dim.width - offsets.r,
							y2: y
						}).setStroke(ta.minorTick);
						if(this.animate){
							this._animateGrid(hMinorLine, "h", offsets.l, offsets.r + offsets.l - dim.width);
						}
					}, this);
				}
				if(this.opt.hMajorLines){
					dojo.forEach(ticks.major, function(tick){
						var y = dim.height - offsets.b - vt(tick.value);
						var hMajorLine = s.createLine({
							x1: offsets.l,
							y1: y,
							x2: dim.width - offsets.r,
							y2: y
						}).setStroke(ta.majorTick);
						if(this.animate){
							this._animateGrid(hMajorLine, "h", offsets.l, offsets.r + offsets.l - dim.width);
						}
					}, this);
				}
			}catch(e){
				// squelch
			}
			// draw vertical stripes and lines
			try{
				var hScaler = this._hAxis.getScaler(),
					ht = hScaler.scaler.getTransformerFromModel(hScaler),
					ticks = this._hAxis.getTicks();
				if(ticks && this.opt.vMinorLines){
					dojo.forEach(ticks.minor, function(tick){
						var x = offsets.l + ht(tick.value);
						var vMinorLine = s.createLine({
							x1: x,
							y1: offsets.t,
							x2: x,
							y2: dim.height - offsets.b
						}).setStroke(ta.minorTick);
						if(this.animate){
							this._animateGrid(vMinorLine, "v", dim.height - offsets.b, dim.height - offsets.b - offsets.t);
						}
					}, this);
				}
				if(ticks && this.opt.vMajorLines){
					dojo.forEach(ticks.major, function(tick){
						var x = offsets.l + ht(tick.value);
						var vMajorLine = s.createLine({
							x1: x,
							y1: offsets.t,
							x2: x,
							y2: dim.height - offsets.b
						}).setStroke(ta.majorTick);
						if(this.animate){
							this._animateGrid(vMajorLine, "v", dim.height - offsets.b, dim.height - offsets.b - offsets.t);
						}
					}, this);
				}
			}catch(e){
				// squelch
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Grid
		},
		_animateGrid: function(shape, type, offset, size){
			var transStart = type == "h" ? [offset, 0] : [0, offset];
			var scaleStart = type == "h" ? [1/size, 1] : [1, 1/size];
			dojox.gfx.fx.animateTransform(dojo.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: transStart, end: [0, 0]},
					{name: "scale", start: scaleStart, end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.Pie"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Pie"] = true;
dojo.provide("dojox.charting.plot2d.Pie");










/*=====
dojo.declare("dojox.charting.plot2d.__PieCtorArgs", dojox.charting.plot2d.__DefaultCtorArgs, {
	//	summary:
	//		Specialized keyword arguments object for use in defining parameters on a Pie chart.

	//	labels: Boolean?
	//		Whether or not to draw labels within each pie slice.  Default is true.
	labels:			true,

	//	ticks: Boolean?
	//		Whether or not to draw ticks to labels within each slice. Default is false.
	ticks:			false,

	//	fixed: Boolean?
	//		TODO
	fixed:			true,

	//	precision: Number?
	//		The precision at which to sum/add data values. Default is 1.
	precision:		1,

	//	labelOffset: Number?
	//		The amount in pixels by which to offset labels.  Default is 20.
	labelOffset:	20,

	//	labelStyle: String?
	//		Options as to where to draw labels.  Values include "default", "rows", and "auto". Default is "default".
	labelStyle:		"default",	// default/rows/auto

	//	htmlLabels: Boolean?
	//		Whether or not to use HTML to render slice labels. Default is true.
	htmlLabels:		true,

	//	radGrad: String?
	//		The type of radial gradient to use in rendering.  Default is "native".
	radGrad:        "native",

	//	fanSize: Number?
	//		The amount for a radial gradient.  Default is 5.
	fanSize:		5,

	//	startAngle: Number?
	//		Where to being rendering gradients in slices, in degrees.  Default is 0.
	startAngle:     0,

	//	radius: Number?
	//		The size of the radial gradient.  Default is 0.
	radius:		0
});
=====*/
(function(){
	var df = dojox.lang.functional, du = dojox.lang.utils,
		dc = dojox.charting.plot2d.common,
		da = dojox.charting.axis2d.common,
		g = dojox.gfx, m = g.matrix,
		FUDGE_FACTOR = 0.2; // use to overlap fans

	dojo.declare("dojox.charting.plot2d.Pie", [dojox.charting.Element, dojox.charting.plot2d._PlotEvents], {
		//	summary:
		//		The plot that represents a typical pie chart.
		defaultParams: {
			labels:			true,
			ticks:			false,
			fixed:			true,
			precision:		1,
			labelOffset:	20,
			labelStyle:		"default",	// default/rows/auto/columns
			htmlLabels:		true,		// use HTML to draw labels
			radGrad:        "native",	// or "linear", or "fan"
			fanSize:		5,			// maximum fan size in degrees
			startAngle:     0			// start angle for slices in degrees
		},
		optionalParams: {
			radius:		0,
			// theme components
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	"",
			labelWiring: {}
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		Create a pie plot.
			this.opt = dojo.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.run = null;
			this.dyn = [];
		},
		clear: function(){
			//	summary:
			//		Clear out all of the information tied to this plot.
			//	returns: dojox.charting.plot2d.Pie
			//		A reference to this plot for functional chaining.
			this.dirty = true;
			this.dyn = [];
			this.run = null;
			return this;	//	dojox.charting.plot2d.Pie
		},
		setAxis: function(axis){
			//	summary:
			//		Dummy method, since axes are irrelevant with a Pie chart.
			//	returns: dojox.charting.plot2d.Pie
			//		The reference to this plot for functional chaining.
			return this;	//	dojox.charting.plot2d.Pie
		},
		addSeries: function(run){
			//	summary:
			//		Add a series of data to this plot.
			//	returns: dojox.charting.plot2d.Pie
			//		The reference to this plot for functional chaining.
			this.run = run;
			return this;	//	dojox.charting.plot2d.Pie
		},
		getSeriesStats: function(){
			//	summary:
			//		Returns default stats (irrelevant for this type of plot).
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			return dojo.delegate(dc.defaultStats);
		},
		initializeScalers: function(){
			//	summary:
			//		Does nothing (irrelevant for this type of plot).
			return this;
		},
		getRequiredColors: function(){
			//	summary:
			//		Return the number of colors needed to draw this plot.
			return this.run ? this.run.data.length : 0;
		},

		render: function(dim, offsets){
			//	summary:
			//		Render the plot on the chart.
			//	dim: Object
			//		An object of the form { width, height }.
			//	offsets: Object
			//		An object of the form { l, r, t, b }.
			//	returns: dojox.charting.plot2d.Pie
			//		A reference to this plot for functional chaining.
			if(!this.dirty){ return this; }
			this.resetEvents();
			this.dirty = false;
			this._eventSeries = {};
			this.cleanGroup();
			var s = this.group, t = this.chart.theme;

			if(!this.run || !this.run.data.length){
				return this;
			}

			// calculate the geometry
			var rx = (dim.width  - offsets.l - offsets.r) / 2,
				ry = (dim.height - offsets.t - offsets.b) / 2,
				r  = Math.min(rx, ry),
				taFont = "font" in this.opt ? this.opt.font : t.axis.font,
				size = taFont ? g.normalizedLength(g.splitFontString(taFont).size) : 0,
				taFontColor = "fontColor" in this.opt ? this.opt.fontColor : t.axis.fontColor,
				startAngle = m._degToRad(this.opt.startAngle),
				start = startAngle, step, filteredRun, slices, labels, shift, labelR,
				run = this.run.data,
				events = this.events();
			if(typeof run[0] == "number"){
				filteredRun = df.map(run, "x ? Math.max(x, 0) : 0");
				if(df.every(filteredRun, "<= 0")){
					return this;
				}
				slices = df.map(filteredRun, "/this", df.foldl(filteredRun, "+", 0));
				if(this.opt.labels){
					labels = dojo.map(slices, function(x){
						return x > 0 ? this._getLabel(x * 100) + "%" : "";
					}, this);
				}
			}else{
				filteredRun = df.map(run, "x ? Math.max(x.y, 0) : 0");
				if(df.every(filteredRun, "<= 0")){
					return this;
				}
				slices = df.map(filteredRun, "/this", df.foldl(filteredRun, "+", 0));
				if(this.opt.labels){
					labels = dojo.map(slices, function(x, i){
						if(x <= 0){ return ""; }
						var v = run[i];
						return "text" in v ? v.text : this._getLabel(x * 100) + "%";
					}, this);
				}
			}
			var themes = df.map(run, function(v, i){
				if(v === null || typeof v == "number"){
					return t.next("slice", [this.opt, this.run], true);
				}
				return t.next("slice", [this.opt, this.run, v], true);
			}, this);
			if(this.opt.labels){
				shift = df.foldl1(df.map(labels, function(label, i){
					var font = themes[i].series.font;
					return dojox.gfx._base._getTextBox(label, {font: font}).w;
				}, this), "Math.max(a, b)") / 2;
				if(this.opt.labelOffset < 0){
					r = Math.min(rx - 2 * shift, ry - size) + this.opt.labelOffset;
				}
				labelR = r - this.opt.labelOffset;
			}
			if("radius" in this.opt){
				r = this.opt.radius;
				labelR = r - this.opt.labelOffset;
			}
			var	circle = {
					cx: offsets.l + rx,
					cy: offsets.t + ry,
					r:  r
				};

			this.dyn = [];
			// draw slices
			var eventSeries = new Array(slices.length);
			dojo.some(slices, function(slice, i){
				if(slice <= 0){
					// degenerated slice
					return false;	// continue
				}
				var v = run[i], theme = themes[i], specialFill;
				if(slice >= 1){
					// whole pie
					specialFill = this._plotFill(theme.series.fill, dim, offsets);
					specialFill = this._shapeFill(specialFill,
						{
							x: circle.cx - circle.r, y: circle.cy - circle.r,
							width: 2 * circle.r, height: 2 * circle.r
						});
					specialFill = this._pseudoRadialFill(specialFill, {x: circle.cx, y: circle.cy}, circle.r);
					var shape = s.createCircle(circle).setFill(specialFill).setStroke(theme.series.stroke);
					this.dyn.push({fill: specialFill, stroke: theme.series.stroke});

					if(events){
						var o = {
							element: "slice",
							index:   i,
							run:     this.run,
							shape:   shape,
							x:       i,
							y:       typeof v == "number" ? v : v.y,
							cx:      circle.cx,
							cy:      circle.cy,
							cr:      r
						};
						this._connectEvents(o);
						eventSeries[i] = o;
					}

					return true;	// stop iteration
				}
				// calculate the geometry of the slice
				var end = start + slice * 2 * Math.PI;
				if(i + 1 == slices.length){
					end = startAngle + 2 * Math.PI;
				}
				var	step = end - start,
					x1 = circle.cx + r * Math.cos(start),
					y1 = circle.cy + r * Math.sin(start),
					x2 = circle.cx + r * Math.cos(end),
					y2 = circle.cy + r * Math.sin(end);
				// draw the slice
				var fanSize = m._degToRad(this.opt.fanSize);
				if(theme.series.fill && theme.series.fill.type === "radial" && this.opt.radGrad === "fan" && step > fanSize){
					var group = s.createGroup(), nfans = Math.ceil(step / fanSize), delta = step / nfans;
					specialFill = this._shapeFill(theme.series.fill,
						{x: circle.cx - circle.r, y: circle.cy - circle.r, width: 2 * circle.r, height: 2 * circle.r});
					for(var j = 0; j < nfans; ++j){
						var fansx = j == 0 ? x1 : circle.cx + r * Math.cos(start + (j - FUDGE_FACTOR) * delta),
							fansy = j == 0 ? y1 : circle.cy + r * Math.sin(start + (j - FUDGE_FACTOR) * delta),
							fanex = j == nfans - 1 ? x2 : circle.cx + r * Math.cos(start + (j + 1 + FUDGE_FACTOR) * delta),
							faney = j == nfans - 1 ? y2 : circle.cy + r * Math.sin(start + (j + 1 + FUDGE_FACTOR) * delta),
							fan = group.createPath({}).
								moveTo(circle.cx, circle.cy).
								lineTo(fansx, fansy).
								arcTo(r, r, 0, delta > Math.PI, true, fanex, faney).
								lineTo(circle.cx, circle.cy).
								closePath().
								setFill(this._pseudoRadialFill(specialFill, {x: circle.cx, y: circle.cy}, r, start + (j + 0.5) * delta, start + (j + 0.5) * delta));
					}
					group.createPath({}).
						moveTo(circle.cx, circle.cy).
						lineTo(x1, y1).
						arcTo(r, r, 0, step > Math.PI, true, x2, y2).
						lineTo(circle.cx, circle.cy).
						closePath().
						setStroke(theme.series.stroke);
					shape = group;
				}else{
					shape = s.createPath({}).
						moveTo(circle.cx, circle.cy).
						lineTo(x1, y1).
						arcTo(r, r, 0, step > Math.PI, true, x2, y2).
						lineTo(circle.cx, circle.cy).
						closePath().
						setStroke(theme.series.stroke);
					var specialFill = theme.series.fill;
					if(specialFill && specialFill.type === "radial"){
						specialFill = this._shapeFill(specialFill, {x: circle.cx - circle.r, y: circle.cy - circle.r, width: 2 * circle.r, height: 2 * circle.r});
						if(this.opt.radGrad === "linear"){
							specialFill = this._pseudoRadialFill(specialFill, {x: circle.cx, y: circle.cy}, r, start, end);
						}
					}else if(specialFill && specialFill.type === "linear"){
						specialFill = this._plotFill(specialFill, dim, offsets);
						specialFill = this._shapeFill(specialFill, shape.getBoundingBox());
					}
					shape.setFill(specialFill);
				}
				this.dyn.push({fill: specialFill, stroke: theme.series.stroke});

				if(events){
					var o = {
						element: "slice",
						index:   i,
						run:     this.run,
						shape:   shape,
						x:       i,
						y:       typeof v == "number" ? v : v.y,
						cx:      circle.cx,
						cy:      circle.cy,
						cr:      r
					};
					this._connectEvents(o);
					eventSeries[i] = o;
				}

				start = end;

				return false;	// continue
			}, this);
			// draw labels
			if(this.opt.labels){
				if(this.opt.labelStyle == "default"){
					start = startAngle;
					dojo.some(slices, function(slice, i){
						if(slice <= 0){
							// degenerated slice
							return false;	// continue
						}
						var theme = themes[i];
						if(slice >= 1){
							// whole pie
							var v = run[i], elem = da.createText[this.opt.htmlLabels && dojox.gfx.renderer != "vml" ? "html" : "gfx"](
									this.chart, s, circle.cx, circle.cy + size / 2, "middle", labels[i],
									theme.series.font, theme.series.fontColor);
							if(this.opt.htmlLabels){
								this.htmlElements.push(elem);
							}
							return true;	// stop iteration
						}
						// calculate the geometry of the slice
						var end = start + slice * 2 * Math.PI, v = run[i];
						if(i + 1 == slices.length){
							end = startAngle + 2 * Math.PI;
						}
						var	labelAngle = (start + end) / 2,
							x = circle.cx + labelR * Math.cos(labelAngle),
							y = circle.cy + labelR * Math.sin(labelAngle) + size / 2;
						// draw the label
						var elem = da.createText[this.opt.htmlLabels && dojox.gfx.renderer != "vml" ? "html" : "gfx"]
								(this.chart, s, x, y, "middle", labels[i], theme.series.font, theme.series.fontColor);
						if(this.opt.htmlLabels){
							this.htmlElements.push(elem);
						}
						start = end;
						return false;	// continue
					}, this);
				}else if(this.opt.labelStyle == "columns"){
					start = startAngle;
					//calculate label angles
					var labeledSlices = [];
					dojo.forEach(slices, function(slice, i){
						var end = start + slice * 2 * Math.PI;
						if(i + 1 == slices.length){
							end = startAngle + 2 * Math.PI;
						}
						var labelAngle = (start + end) / 2;
						labeledSlices.push({
							angle: labelAngle,
							left: Math.cos(labelAngle) < 0,
							theme: themes[i],
							index: i,
							omit: end - start < 0.001
						});
						start = end;
					});
					//calculate label radius to each slice
					var labelHeight = dojox.gfx._base._getTextBox("a",{font:taFont}).h;
					this._getProperLabelRadius(labeledSlices, labelHeight, circle.r * 1.1);
					//draw label and wiring
					dojo.forEach(labeledSlices, function(slice, i){
						if (!slice.omit) {
							var leftColumn = circle.cx - circle.r * 2,
								rightColumn = circle.cx + circle.r * 2,
								labelWidth = dojox.gfx._base._getTextBox(labels[i], {font: taFont}).w,
								x = circle.cx + slice.labelR * Math.cos(slice.angle),
								y = circle.cy + slice.labelR * Math.sin(slice.angle),
								jointX = (slice.left) ? (leftColumn + labelWidth) : (rightColumn - labelWidth),
								labelX = (slice.left) ? leftColumn : jointX;
							var wiring = s.createPath().moveTo(circle.cx + circle.r * Math.cos(slice.angle), circle.cy + circle.r * Math.sin(slice.angle))
							if (Math.abs(slice.labelR * Math.cos(slice.angle)) < circle.r * 2 - labelWidth) {
								wiring.lineTo(x, y);
							}
							wiring.lineTo(jointX, y).setStroke(slice.theme.series.labelWiring);
							var elem = da.createText[this.opt.htmlLabels && dojox.gfx.renderer != "vml" ? "html" : "gfx"](
								this.chart, s, labelX, y, "left", labels[i], slice.theme.series.font, slice.theme.series.fontColor);
							if (this.opt.htmlLabels) {
								this.htmlElements.push(elem);
							}
						}
					},this);
				}
			}
			// post-process events to restore the original indexing
			var esi = 0;
			this._eventSeries[this.run.name] = df.map(run, function(v){
				return v <= 0 ? null : eventSeries[esi++];
			});
			return this;	//	dojox.charting.plot2d.Pie
		},
		
		_getProperLabelRadius: function(slices, labelHeight, minRidius){
			var leftCenterSlice = {},rightCenterSlice = {},leftMinSIN = 1, rightMinSIN = 1;
			if (slices.length == 1) {
				slices[0].labelR = minRidius;
				return;
			}
			for(var i = 0;i<slices.length;i++){
				var tempSIN = Math.abs(Math.sin(slices[i].angle));
				if(slices[i].left){
					if(leftMinSIN > tempSIN){
						leftMinSIN = tempSIN;
						leftCenterSlice = slices[i];
					}
				}else{
					if(rightMinSIN > tempSIN){
						rightMinSIN = tempSIN;
						rightCenterSlice = slices[i];
					}
				}
			}
			leftCenterSlice.labelR = rightCenterSlice.labelR = minRidius;
			this._caculateLabelR(leftCenterSlice,slices,labelHeight);
			this._caculateLabelR(rightCenterSlice,slices,labelHeight);
		},
		_caculateLabelR: function(firstSlice,slices,labelHeight){
			var i = firstSlice.index,length = slices.length,
				currentLabelR = firstSlice.labelR;
			while(!(slices[i%length].left ^ slices[(i+1)%length].left)){
				if (!slices[(i + 1) % length].omit) {
					var nextLabelR = (Math.sin(slices[i % length].angle) * currentLabelR + ((slices[i % length].left) ? (-labelHeight) : labelHeight)) /
					Math.sin(slices[(i + 1) % length].angle);
					currentLabelR = (nextLabelR < firstSlice.labelR) ? firstSlice.labelR : nextLabelR;
					slices[(i + 1) % length].labelR = currentLabelR;
				}
				i++;
			}
			i = firstSlice.index,j = (i == 0)?length-1 : i - 1;
			while(!(slices[i].left ^ slices[j].left)){
				if (!slices[j].omit) {
					var nextLabelR = (Math.sin(slices[i].angle) * currentLabelR + ((slices[i].left) ? labelHeight : (-labelHeight))) /
					Math.sin(slices[j].angle);
					currentLabelR = (nextLabelR < firstSlice.labelR) ? firstSlice.labelR : nextLabelR;
					slices[j].labelR = currentLabelR;
				}
				i--;j--;
				i = (i < 0)?i+slices.length:i;
				j = (j < 0)?j+slices.length:j;
			}
		},
		// utilities
		_getLabel: function(number){
			return dc.getLabel(number, this.opt.fixed, this.opt.precision);
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.Bubble"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Bubble"] = true;
dojo.provide("dojox.charting.plot2d.Bubble");




(function(){
	var df = dojox.lang.functional, du = dojox.lang.utils,
		dc = dojox.charting.plot2d.common,
		purgeGroup = df.lambda("item.purgeGroup()");

	dojo.declare("dojox.charting.plot2d.Bubble", dojox.charting.plot2d.Base, {
		//	summary:
		//		A plot representing bubbles.  Note that data for Bubbles requires 3 parameters,
		//		in the form of:  { x, y, size }, where size determines the size of the bubble.
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			animate: null   // animate bars into place
		},
		optionalParams: {
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		Create a plot of bubbles.
			//	chart: dojox.charting.Chart2D
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__DefaultCtorArgs?
			//		Optional keyword arguments object to help define plot parameters.
			this.opt = dojo.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
            du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
            this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		//	override the render so that we are plotting only circles.
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.Bubble
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				dojo.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}

			var t = this.chart.theme,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				events = this.events();

			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				if(!run.data.length){
					run.dirty = false;
					t.skip();
					continue;
				}

				if(typeof run.data[0] == "number"){
					console.warn("dojox.charting.plot2d.Bubble: the data in the following series cannot be rendered as a bubble chart; ", run);
					continue;
				}

				var theme = t.next("circle", [this.opt, run]), s = run.group,
					points = dojo.map(run.data, function(v, i){
						return v ? {
							x: ht(v.x) + offsets.l,
							y: dim.height - offsets.b - vt(v.y),
							radius: this._vScaler.bounds.scale * (v.size / 2)
						} : null;
					}, this);

				var frontCircles = null, outlineCircles = null, shadowCircles = null;

				// make shadows if needed
				if(theme.series.shadow){
					shadowCircles = dojo.map(points, function(item){
						if(item !== null){
							var finalTheme = t.addMixin(theme, "circle", item, true),
								shadow = finalTheme.series.shadow;
							var shape = s.createCircle({
								cx: item.x + shadow.dx, cy: item.y + shadow.dy, r: item.radius
							}).setStroke(shadow).setFill(shadow.color);
							if(this.animate){
								this._animateBubble(shape, dim.height - offsets.b, item.radius);
							}
							return shape;
						}
						return null;
					}, this);
					if(shadowCircles.length){
						run.dyn.shadow = shadowCircles[shadowCircles.length - 1].getStroke();
					}
				}

				// make outlines if needed
				if(theme.series.outline){
					outlineCircles = dojo.map(points, function(item){
						if(item !== null){
							var finalTheme = t.addMixin(theme, "circle", item, true),
								outline = dc.makeStroke(finalTheme.series.outline);
							outline.width = 2 * outline.width + theme.series.stroke.width;
							var shape = s.createCircle({
								cx: item.x, cy: item.y, r: item.radius
							}).setStroke(outline);
							if(this.animate){
								this._animateBubble(shape, dim.height - offsets.b, item.radius);
							}
							return shape;
						}
						return null;
					}, this);
					if(outlineCircles.length){
						run.dyn.outline = outlineCircles[outlineCircles.length - 1].getStroke();
					}
				}

				//	run through the data and add the circles.
				frontCircles = dojo.map(points, function(item){
					if(item !== null){
						var finalTheme = t.addMixin(theme, "circle", item, true),
							rect = {
								x: item.x - item.radius,
								y: item.y - item.radius,
								width:  2 * item.radius,
								height: 2 * item.radius
							};
						var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
						specialFill = this._shapeFill(specialFill, rect);
						var shape = s.createCircle({
							cx: item.x, cy: item.y, r: item.radius
						}).setFill(specialFill).setStroke(finalTheme.series.stroke);
						if(this.animate){
							this._animateBubble(shape, dim.height - offsets.b, item.radius);
						}
						return shape;
					}
					return null;
				}, this);
				if(frontCircles.length){
					run.dyn.fill   = frontCircles[frontCircles.length - 1].getFill();
					run.dyn.stroke = frontCircles[frontCircles.length - 1].getStroke();
				}

				if(events){
					var eventSeries = new Array(frontCircles.length);
					dojo.forEach(frontCircles, function(s, i){
						if(s !== null){
							var o = {
								element: "circle",
								index:   i,
								run:     run,
								shape:   s,
								outline: outlineCircles && outlineCircles[i] || null,
								shadow:  shadowCircles && shadowCircles[i] || null,
								x:       run.data[i].x,
								y:       run.data[i].y,
								r:       run.data[i].size / 2,
								cx:      points[i].x,
								cy:      points[i].y,
								cr:      points[i].radius
							};
							this._connectEvents(o);
							eventSeries[i] = o;
						}
					}, this);
					this._eventSeries[run.name] = eventSeries;
				}else{
					delete this._eventSeries[run.name];
				}

				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Bubble
		},
		_animateBubble: function(shape, offset, size){
			dojox.gfx.fx.animateTransform(dojo.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [0, offset], end: [0, 0]},
					{name: "scale", start: [0, 1/size], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.Candlesticks"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Candlesticks"] = true;
dojo.provide("dojox.charting.plot2d.Candlesticks");








(function(){
	var df = dojox.lang.functional, du = dojox.lang.utils,
		dc = dojox.charting.plot2d.common,
		purgeGroup = df.lambda("item.purgeGroup()");

	//	Candlesticks are based on the Bars plot type; we expect the following passed
	//	as values in a series:
	//	{ x?, open, close, high, low, mid? }
	//	if x is not provided, the array index is used.
	//	failing to provide the OHLC values will throw an error.
	dojo.declare("dojox.charting.plot2d.Candlesticks", dojox.charting.plot2d.Base, {
		//	summary:
		//		A plot that represents typical candlesticks (financial reporting, primarily).
		//		Unlike most charts, the Candlestick expects data points to be represented by
		//		an object of the form { x?, open, close, high, low, mid? }, where both
		//		x and mid are optional parameters.  If x is not provided, the index of the
		//		data array is used.
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			gap:	2,		// gap between columns in pixels
			animate: null   // animate bars into place
		},
		optionalParams: {
			minBarSize:	1,	// minimal candle width in pixels
			maxBarSize:	1,	// maximal candle width in pixels
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for a candlestick chart.
			//	chart: dojox.charting.Chart2D
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__BarCtorArgs?
			//		An optional keyword arguments object to help define the plot.
			this.opt = dojo.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		collectStats: function(series){
			//	summary:
			//		Collect all statistics for drawing this chart.  Since the common
			//		functionality only assumes x and y, Candlesticks must create it's own
			//		stats (since data has no y value, but open/close/high/low instead).
			//	series: dojox.charting.Series[]
			//		The data series array to be drawn on this plot.
			//	returns: Object
			//		Returns an object in the form of { hmin, hmax, vmin, vmax }.

			//	we have to roll our own, since we need to use all four passed
			//	values to figure out our stats, and common only assumes x and y.
			var stats = dojo.delegate(dc.defaultStats);
			for(var i=0; i<series.length; i++){
				var run = series[i];
				if(!run.data.length){ continue; }
				var old_vmin = stats.vmin, old_vmax = stats.vmax;
				if(!("ymin" in run) || !("ymax" in run)){
					dojo.forEach(run.data, function(val, idx){
						if(val !== null){
							var x = val.x || idx + 1;
							stats.hmin = Math.min(stats.hmin, x);
							stats.hmax = Math.max(stats.hmax, x);
							stats.vmin = Math.min(stats.vmin, val.open, val.close, val.high, val.low);
							stats.vmax = Math.max(stats.vmax, val.open, val.close, val.high, val.low);
						}
					});
				}
				if("ymin" in run){ stats.vmin = Math.min(old_vmin, run.ymin); }
				if("ymax" in run){ stats.vmax = Math.max(old_vmax, run.ymax); }
			}
			return stats;	//	Object
		},

		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = this.collectStats(this.series);
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			return stats;
		},

		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.Candlesticks
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				dojo.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, width,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._vScaler.bounds.lower),
				baselineHeight = vt(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt);
			gap = f.gap;
			width = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("candlestick", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var v = run.data[j];
					if(v !== null){
						var finalTheme = t.addMixin(theme, "candlestick", v, true);

						//	calculate the points we need for OHLC
						var x = ht(v.x || (j+0.5)) + offsets.l + gap,
							y = dim.height - offsets.b,
							open = vt(v.open),
							close = vt(v.close),
							high = vt(v.high),
							low = vt(v.low);
						if("mid" in v){
							var mid = vt(v.mid);
						}
						if(low > high){
							var tmp = high;
							high = low;
							low = tmp;
						}

						if(width >= 1){
							//	draw the line and rect, set up as a group and pass that to the events.
							var doFill = open > close;
							var line = { x1: width/2, x2: width/2, y1: y - high, y2: y - low },
								rect = {
									x: 0, y: y-Math.max(open, close),
									width: width, height: Math.max(doFill ? open-close : close-open, 1)
								};
							shape = s.createGroup();
							shape.setTransform({dx: x, dy: 0 });
							var inner = shape.createGroup();
							inner.createLine(line).setStroke(finalTheme.series.stroke);
							inner.createRect(rect).setStroke(finalTheme.series.stroke).
								setFill(doFill ? finalTheme.series.fill : "white");
							if("mid" in v){
								//	add the mid line.
								inner.createLine({
									x1: (finalTheme.series.stroke.width||1), x2: width - (finalTheme.series.stroke.width || 1),
									y1: y - mid, y2: y - mid
								}).setStroke(doFill ? "white" : finalTheme.series.stroke);
							}

							//	TODO: double check this.
							run.dyn.fill   = finalTheme.series.fill;
							run.dyn.stroke = finalTheme.series.stroke;
							if(events){
								var o = {
									element: "candlestick",
									index:   j,
									run:     run,
									shape:   inner,
									x:       x,
									y:       y-Math.max(open, close),
									cx:		 width/2,
									cy:		 (y-Math.max(open, close)) + (Math.max(doFill ? open-close : close-open, 1)/2),
									width:	 width,
									height:  Math.max(doFill ? open-close : close-open, 1),
									data:	 v
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
						}
						if(this.animate){
							this._animateCandlesticks(shape, y - low, high - low);
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Candlesticks
		},
		_animateCandlesticks: function(shape, voffset, vsize){
			dojox.gfx.fx.animateTransform(dojo.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [0, voffset - (voffset/vsize)], end: [0, 0]},
					{name: "scale", start: [1, 1/vsize], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.plot2d.OHLC"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.OHLC"] = true;
dojo.provide("dojox.charting.plot2d.OHLC");








(function(){
	var df = dojox.lang.functional, du = dojox.lang.utils,
		dc = dojox.charting.plot2d.common,
		purgeGroup = df.lambda("item.purgeGroup()");

	//	Candlesticks are based on the Bars plot type; we expect the following passed
	//	as values in a series:
	//	{ x?, open, close, high, low }
	//	if x is not provided, the array index is used.
	//	failing to provide the OHLC values will throw an error.
	dojo.declare("dojox.charting.plot2d.OHLC", dojox.charting.plot2d.Base, {
		//	summary:
		//		A plot that represents typical open/high/low/close (financial reporting, primarily).
		//		Unlike most charts, the Candlestick expects data points to be represented by
		//		an object of the form { x?, open, close, high, low, mid? }, where both
		//		x and mid are optional parameters.  If x is not provided, the index of the
		//		data array is used.
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			gap:	2,		// gap between columns in pixels
			animate: null	// animate chart to place
		},
		optionalParams: {
			minBarSize: 1,	// minimal bar size in pixels
			maxBarSize: 1,	// maximal bar size in pixels
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for a candlestick chart.
			//	chart: dojox.charting.Chart2D
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__BarCtorArgs?
			//		An optional keyword arguments object to help define the plot.
			this.opt = dojo.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		collectStats: function(series){
			//	summary:
			//		Collect all statistics for drawing this chart.  Since the common
			//		functionality only assumes x and y, OHLC must create it's own
			//		stats (since data has no y value, but open/close/high/low instead).
			//	series: dojox.charting.Series[]
			//		The data series array to be drawn on this plot.
			//	returns: Object
			//		Returns an object in the form of { hmin, hmax, vmin, vmax }.

			//	we have to roll our own, since we need to use all four passed
			//	values to figure out our stats, and common only assumes x and y.
			var stats = dojo.delegate(dc.defaultStats);
			for(var i=0; i<series.length; i++){
				var run = series[i];
				if(!run.data.length){ continue; }
				var old_vmin = stats.vmin, old_vmax = stats.vmax;
				if(!("ymin" in run) || !("ymax" in run)){
					dojo.forEach(run.data, function(val, idx){
						if(val !== null){
							var x = val.x || idx + 1;
							stats.hmin = Math.min(stats.hmin, x);
							stats.hmax = Math.max(stats.hmax, x);
							stats.vmin = Math.min(stats.vmin, val.open, val.close, val.high, val.low);
							stats.vmax = Math.max(stats.vmax, val.open, val.close, val.high, val.low);
						}
					});
				}
				if("ymin" in run){ stats.vmin = Math.min(old_vmin, run.ymin); }
				if("ymax" in run){ stats.vmax = Math.max(old_vmax, run.ymax); }
			}
			return stats;
		},

		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = this.collectStats(this.series);
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			return stats;
		},

		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.OHLC
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				dojo.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, width,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._vScaler.bounds.lower),
				baselineHeight = vt(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt);
			gap = f.gap;
			width = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("candlestick", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var v = run.data[j];
					if(v !== null){
						var finalTheme = t.addMixin(theme, "candlestick", v, true);

						//	calculate the points we need for OHLC
						var x = ht(v.x || (j+0.5)) + offsets.l + gap,
							y = dim.height - offsets.b,
							open = vt(v.open),
							close = vt(v.close),
							high = vt(v.high),
							low = vt(v.low);
						if(low > high){
							var tmp = high;
							high = low;
							low = tmp;
						}

						if(width >= 1){
							var hl = {x1: width/2, x2: width/2, y1: y - high, y2: y - low},
								op = {x1: 0, x2: ((width/2) + ((finalTheme.series.stroke.width||1)/2)), y1: y-open, y2: y-open},
								cl = {x1: ((width/2) - ((finalTheme.series.stroke.width||1)/2)), x2: width, y1: y-close, y2: y-close};
							shape = s.createGroup();
							shape.setTransform({dx: x, dy: 0});
							var inner = shape.createGroup();
							inner.createLine(hl).setStroke(finalTheme.series.stroke);
							inner.createLine(op).setStroke(finalTheme.series.stroke);
							inner.createLine(cl).setStroke(finalTheme.series.stroke);

							//	TODO: double check this.
							run.dyn.stroke = finalTheme.series.stroke;
							if(events){
								var o = {
									element: "candlestick",
									index:   j,
									run:     run,
									shape:	 inner,
									x:       x,
									y:       y-Math.max(open, close),
									cx:		 width/2,
									cy:		 (y-Math.max(open, close)) + (Math.max(open > close ? open-close : close-open, 1)/2),
									width:	 width,
									height:  Math.max(open > close ? open-close : close-open, 1),
									data:	 v
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
						}
						if(this.animate){
							this._animateOHLC(shape, y - low, high - low);
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.OHLC
		},
		_animateOHLC: function(shape, voffset, vsize){
			dojox.gfx.fx.animateTransform(dojo.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [0, voffset - (voffset/vsize)], end: [0, 0]},
					{name: "scale", start: [1, 1/vsize], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
})();

}

if(!dojo._hasResource["dojo.fx.easing"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.fx.easing"] = true;
dojo.provide("dojo.fx.easing");

dojo.getObject("fx.easing", true, dojo);

dojo.fx.easing = {
	// summary:
	//		Collection of easing functions to use beyond the default
	//		`dojo._defaultEasing` function.
	//
	// description:
	//
	//		Easing functions are used to manipulate the iteration through
	//		an `dojo.Animation`s _Line. _Line being the properties of an Animation,
	//		and the easing function progresses through that Line determing
	//		how quickly (or slowly) it should go. Or more accurately: modify
	//		the value of the _Line based on the percentage of animation completed.
	//
	//		All functions follow a simple naming convention of "ease type" + "when".
	//		If the name of the function ends in Out, the easing described appears
	//		towards the end of the animation. "In" means during the beginning,
	//		and InOut means both ranges of the Animation will applied, both
	//		beginning and end.
	//
	//		One does not call the easing function directly, it must be passed to
	//		the `easing` property of an animation.
	//
	//	example:
	//	|	
	//	|	var anim = dojo.fadeOut({
	//	|		node: 'node',
	//	|		duration: 2000,
	//	|		//	note there is no ()
	//	|		easing: dojo.fx.easing.quadIn
	//	|	}).play();
	//
	
	linear: function(/* Decimal? */n){
		// summary: A linear easing function
		return n;
	},

	quadIn: function(/* Decimal? */n){
		return Math.pow(n, 2);
	},

	quadOut: function(/* Decimal? */n){
		return n * (n - 2) * -1;
	},

	quadInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return Math.pow(n, 2) / 2; }
		return -1 * ((--n) * (n - 2) - 1) / 2;
	},

	cubicIn: function(/* Decimal? */n){
		return Math.pow(n, 3);
	},

	cubicOut: function(/* Decimal? */n){
		return Math.pow(n - 1, 3) + 1;
	},

	cubicInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return Math.pow(n, 3) / 2; }
		n -= 2;
		return (Math.pow(n, 3) + 2) / 2;
	},

	quartIn: function(/* Decimal? */n){
		return Math.pow(n, 4);
	},

	quartOut: function(/* Decimal? */n){
		return -1 * (Math.pow(n - 1, 4) - 1);
	},

	quartInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return Math.pow(n, 4) / 2; }
		n -= 2;
		return -1 / 2 * (Math.pow(n, 4) - 2);
	},

	quintIn: function(/* Decimal? */n){
		return Math.pow(n, 5);
	},

	quintOut: function(/* Decimal? */n){
		return Math.pow(n - 1, 5) + 1;
	},

	quintInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return Math.pow(n, 5) / 2; };
		n -= 2;
		return (Math.pow(n, 5) + 2) / 2;
	},

	sineIn: function(/* Decimal? */n){
		return -1 * Math.cos(n * (Math.PI / 2)) + 1;
	},

	sineOut: function(/* Decimal? */n){
		return Math.sin(n * (Math.PI / 2));
	},

	sineInOut: function(/* Decimal? */n){
		return -1 * (Math.cos(Math.PI * n) - 1) / 2;
	},

	expoIn: function(/* Decimal? */n){
		return (n == 0) ? 0 : Math.pow(2, 10 * (n - 1));
	},

	expoOut: function(/* Decimal? */n){
		return (n == 1) ? 1 : (-1 * Math.pow(2, -10 * n) + 1);
	},

	expoInOut: function(/* Decimal? */n){
		if(n == 0){ return 0; }
		if(n == 1){ return 1; }
		n = n * 2;
		if(n < 1){ return Math.pow(2, 10 * (n - 1)) / 2; }
		--n;
		return (-1 * Math.pow(2, -10 * n) + 2) / 2;
	},

	circIn: function(/* Decimal? */n){
		return -1 * (Math.sqrt(1 - Math.pow(n, 2)) - 1);
	},

	circOut: function(/* Decimal? */n){
		n = n - 1;
		return Math.sqrt(1 - Math.pow(n, 2));
	},

	circInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return -1 / 2 * (Math.sqrt(1 - Math.pow(n, 2)) - 1); }
		n -= 2;
		return 1 / 2 * (Math.sqrt(1 - Math.pow(n, 2)) + 1);
	},

	backIn: function(/* Decimal? */n){
		// summary:
		//		An easing function that starts away from the target,
		//		and quickly accelerates towards the end value.
		//
		//		Use caution when the easing will cause values to become
		//		negative as some properties cannot be set to negative values.
		var s = 1.70158;
		return Math.pow(n, 2) * ((s + 1) * n - s);
	},

	backOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that pops past the range briefly, and slowly comes back.
		//
		// description:
		//		An easing function that pops past the range briefly, and slowly comes back.
		//
		//		Use caution when the easing will cause values to become negative as some
		//		properties cannot be set to negative values.
		
		n = n - 1;
		var s = 1.70158;
		return Math.pow(n, 2) * ((s + 1) * n + s) + 1;
	},

	backInOut: function(/* Decimal? */n){
		// summary:
		//		An easing function combining the effects of `backIn` and `backOut`
		//
		// description:
		//		An easing function combining the effects of `backIn` and `backOut`.
		//		Use caution when the easing will cause values to become negative
		//		as some properties cannot be set to negative values.
		var s = 1.70158 * 1.525;
		n = n * 2;
		if(n < 1){ return (Math.pow(n, 2) * ((s + 1) * n - s)) / 2; }
		n-=2;
		return (Math.pow(n, 2) * ((s + 1) * n + s) + 2) / 2;
	},

	elasticIn: function(/* Decimal? */n){
		// summary:
		//		An easing function the elastically snaps from the start value
		//
		// description:
		//		An easing function the elastically snaps from the start value
		//
		//		Use caution when the elasticity will cause values to become negative
		//		as some properties cannot be set to negative values.
		if(n == 0 || n == 1){ return n; }
		var p = .3;
		var s = p / 4;
		n = n - 1;
		return -1 * Math.pow(2, 10 * n) * Math.sin((n - s) * (2 * Math.PI) / p);
	},

	elasticOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that elasticly snaps around the target value,
		//		near the end of the Animation
		//
		// description:
		//		An easing function that elasticly snaps around the target value,
		//		near the end of the Animation
		//
		//		Use caution when the elasticity will cause values to become
		//		negative as some properties cannot be set to negative values.
		if(n==0 || n == 1){ return n; }
		var p = .3;
		var s = p / 4;
		return Math.pow(2, -10 * n) * Math.sin((n - s) * (2 * Math.PI) / p) + 1;
	},

	elasticInOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that elasticly snaps around the value, near
		//		the beginning and end of the Animation.
		//
		// description:
		//		An easing function that elasticly snaps around the value, near
		//		the beginning and end of the Animation.
		//
		//		Use caution when the elasticity will cause values to become
		//		negative as some properties cannot be set to negative values.
		if(n == 0) return 0;
		n = n * 2;
		if(n == 2) return 1;
		var p = .3 * 1.5;
		var s = p / 4;
		if(n < 1){
			n -= 1;
			return -.5 * (Math.pow(2, 10 * n) * Math.sin((n - s) * (2 * Math.PI) / p));
		}
		n -= 1;
		return .5 * (Math.pow(2, -10 * n) * Math.sin((n - s) * (2 * Math.PI) / p)) + 1;
	},

	bounceIn: function(/* Decimal? */n){
		// summary:
		//		An easing function that 'bounces' near the beginning of an Animation
		return (1 - dojo.fx.easing.bounceOut(1 - n)); // Decimal
	},

	bounceOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that 'bounces' near the end of an Animation
		var s = 7.5625;
		var p = 2.75;
		var l;
		if(n < (1 / p)){
			l = s * Math.pow(n, 2);
		}else if(n < (2 / p)){
			n -= (1.5 / p);
			l = s * Math.pow(n, 2) + .75;
		}else if(n < (2.5 / p)){
			n -= (2.25 / p);
			l = s * Math.pow(n, 2) + .9375;
		}else{
			n -= (2.625 / p);
			l = s * Math.pow(n, 2) + .984375;
		}
		return l;
	},

	bounceInOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that 'bounces' at the beginning and end of the Animation
		if(n < 0.5){ return dojo.fx.easing.bounceIn(n * 2) / 2; }
		return (dojo.fx.easing.bounceOut(n * 2 - 1) / 2) + 0.5; // Decimal
	}
};

}

if(!dojo._hasResource["dojox.charting.plot2d.Spider"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.plot2d.Spider"] = true;
dojo.provide("dojox.charting.plot2d.Spider");

dojo.experimental("dojox.charting.plot2d.Spider");














(function(){
	var df = dojox.lang.functional, du = dojox.lang.utils,
		dc = dojox.charting.plot2d.common,
		da = dojox.charting.axis2d.common,
		g = dojox.gfx, m = g.matrix,
		FUDGE_FACTOR = 0.2; // use to overlap fans

	dojo.declare("dojox.charting.plot2d.Spider", [dojox.charting.Element, dojox.charting.plot2d._PlotEvents], {
		//	summary:
		//		The plot that represents a typical Spider chart.
		defaultParams: {
			labels:			true,
			ticks:			false,
			fixed:			true,
			precision:		1,
			labelOffset:	-10,
			labelStyle:		"default",	// default/rows/auto
			htmlLabels:		true,		// use HTML to draw labels
			startAngle:		-90,		// start angle for slices in degrees
			divisions:		 3,			// radius tick count
			axisColor:		 "",		// spider axis color
			axisWidth:		 0,			// spider axis stroke width
			spiderColor:	 "",		// spider web color
			spiderWidth:	 0,			// spider web stroke width
			seriesWidth:	 0,			// plot border with
			seriesFillAlpha: 0.2,		// plot fill alpha
			spiderOrigin:	 0.16,
			markerSize:		 3,			// radius of plot vertex (px)
			spiderType:		 "polygon", //"circle"
			animationType:	 dojo.fx.easing.backOut,
			axisTickFont:		"",
			axisTickFontColor:	"",
			axisFont:			"",
			axisFontColor:		""
		},
		optionalParams: {
			radius:		0,
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		Create a Spider plot.
			this.opt = dojo.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.dyn = [];
			this.datas = {};
			this.labelKey = [];
			this.oldSeriePoints = {};
			this.animations = {};
		},
		clear: function(){
			//	summary:
			//		Clear out all of the information tied to this plot.
			//	returns: dojox.charting.plot2d.Spider
			//		A reference to this plot for functional chaining.
			this.dirty = true;
			this.dyn = [];
			this.series = [];
			this.datas = {};
			this.labelKey = [];
			this.oldSeriePoints = {};
			this.animations = {};
			return this;	//	dojox.charting.plot2d.Spider
		},
		setAxis: function(axis){
			//	summary:
			//		Dummy method, since axes are irrelevant with a Spider chart.
			//	returns: dojox.charting.plot2d.Spider
			//		The reference to this plot for functional chaining.
			return this;	//	dojox.charting.plot2d.Spider
		},
		addSeries: function(run){
			//	summary:
			//		Add a data series to this plot.
			//	run: dojox.charting.Series
			//		The series to be added.
			//	returns: dojox.charting.plot2d.Base
			//		A reference to this plot for functional chaining.
			var matched = false;
			this.series.push(run);
			for(var key in run.data){
				var val = run.data[key],
					data = this.datas[key];
				if(data){
					data.vlist.push(val);
					data.min = Math.min(data.min, val);
					data.max = Math.max(data.max, val);
				}else{
					this.datas[key] = {min: val, max: val, vlist: [val]};
				}
			}
			if (this.labelKey.length <= 0) {
				for (var key in run.data) {
					this.labelKey.push(key);
				}
			}
			return this;	//	dojox.charting.plot2d.Base
		},
		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			return dojox.charting.plot2d.common.collectSimpleStats(this.series);
		},
		calculateAxes: function(dim){
			//	summary:
			//		Stub function for running the axis calculations (depricated).
			//	dim: Object
			//		An object of the form { width, height }
			//	returns: dojox.charting.plot2d.Base
			//		A reference to this plot for functional chaining.
			this.initializeScalers(dim, this.getSeriesStats());
			return this;	//	dojox.charting.plot2d.Base
		},
		getRequiredColors: function(){
			//	summary:
			//		Get how many data series we have, so we know how many colors to use.
			//	returns: Number
			//		The number of colors needed.
			return this.series.length;	//	Number
		},
		initializeScalers: function(dim, stats){
			//	summary:
			//		Initializes scalers using attached axes.
			//	dim: Object:
			//		Size of a plot area in pixels as {width, height}.
			//	stats: Object:
			//		Min/max of data in both directions as {hmin, hmax, vmin, vmax}.
			//	returns: dojox.charting.plot2d.Base
			//		A reference to this plot for functional chaining.
			if(this._hAxis){
				if(!this._hAxis.initialized()){
					this._hAxis.calculate(stats.hmin, stats.hmax, dim.width);
				}
				this._hScaler = this._hAxis.getScaler();
			}else{
				this._hScaler = dojox.charting.scaler.primitive.buildScaler(stats.hmin, stats.hmax, dim.width);
			}
			if(this._vAxis){
				if(!this._vAxis.initialized()){
					this._vAxis.calculate(stats.vmin, stats.vmax, dim.height);
				}
				this._vScaler = this._vAxis.getScaler();
			}else{
				this._vScaler = dojox.charting.scaler.primitive.buildScaler(stats.vmin, stats.vmax, dim.height);
			}
			return this;	//	dojox.charting.plot2d.Base
		},
		render: function(dim, offsets){
			//	summary:
			//		Render the plot on the chart.
			//	dim: Object
			//		An object of the form { width, height }.
			//	offsets: Object
			//		An object of the form { l, r, t, b }.
			//	returns: dojox.charting.plot2d.Spider
			//		A reference to this plot for functional chaining.
			if(!this.dirty){ return this; }
			this.dirty = false;
			this.cleanGroup();
			var s = this.group, t = this.chart.theme;
			this.resetEvents();

			if(!this.series || !this.series.length){
				return this;
			}

			// calculate the geometry
			var o = this.opt, ta = t.axis,
				rx = (dim.width	 - offsets.l - offsets.r) / 2,
				ry = (dim.height - offsets.t - offsets.b) / 2,
				r  = Math.min(rx, ry),
				axisTickFont = o.font || (ta.majorTick && ta.majorTick.font) || (ta.tick && ta.tick.font) || "normal normal normal 7pt Tahoma",
				axisFont = o.axisFont || (ta.tick && ta.tick.titleFont) || "normal normal normal 11pt Tahoma",
				axisTickFontColor = o.axisTickFontColor || (ta.majorTick && ta.majorTick.fontColor) || (ta.tick && ta.tick.fontColor) || "silver",
				axisFontColor = o.axisFontColor || (ta.tick && ta.tick.titleFontColor) || "black",
				axisColor = o.axisColor || (ta.tick && ta.tick.axisColor) || "silver",
				spiderColor = o.spiderColor || (ta.tick && ta.tick.spiderColor) || "silver",
				axisWidth = o.axisWidth || (ta.stroke && ta.stroke.width) || 2,
				spiderWidth = o.spiderWidth || (ta.stroke && ta.stroke.width) || 2,
				seriesWidth = o.seriesWidth || (ta.stroke && ta.stroke.width) || 2,
				asize = g.normalizedLength(g.splitFontString(axisFont).size),
				startAngle = m._degToRad(o.startAngle),
				start = startAngle, step, filteredRun, slices, labels, shift, labelR,
				outerPoints, innerPoints, divisionPoints, divisionRadius, labelPoints,
				ro = o.spiderOrigin, dv = o.divisions >= 3 ? o.divisions : 3, ms = o.markerSize,
				spt = o.spiderType, at = o.animationType, lboffset = o.labelOffset < -10 ? o.labelOffset : -10,
				axisExtra = 0.2;
			
			if(o.labels){
				labels = dojo.map(this.series, function(s){
					return s.name;
				}, this);
				shift = df.foldl1(df.map(labels, function(label, i){
					var font = t.series.font;
					return dojox.gfx._base._getTextBox(label, {
						font: font
					}).w;
				}, this), "Math.max(a, b)") / 2;
				r = Math.min(rx - 2 * shift, ry - asize) + lboffset;
				labelR = r - lboffset;
			}
			if ("radius" in o) {
				r = o.radius;
				labelR = r - lboffset;
			}
			r /= (1+axisExtra);
			var circle = {
				cx: offsets.l + rx,
				cy: offsets.t + ry,
				r: r
			};
			
			for (var i = this.series.length - 1; i >= 0; i--) {
				var serieEntry = this.series[i];
				if (!this.dirty && !serieEntry.dirty) {
					t.skip();
					continue;
				}
				serieEntry.cleanGroup();
				var run = serieEntry.data;
				if (run !== null) {
					var len = this._getObjectLength(run);
					//construct connect points
					if (!outerPoints || outerPoints.length <= 0) {
						outerPoints = [], innerPoints = [], labelPoints = [];
						this._buildPoints(outerPoints, len, circle, r, start, true);
						this._buildPoints(innerPoints, len, circle, r*ro, start, true);
						this._buildPoints(labelPoints, len, circle, labelR, start);
						if(dv > 2){
							divisionPoints = [], divisionRadius = [];
							for (var j = 0; j < dv - 2; j++) {
								divisionPoints[j] = [];
								this._buildPoints(divisionPoints[j], len, circle, r*(ro + (1-ro)*(j+1)/(dv-1)), start, true);
								divisionRadius[j] = r*(ro + (1-ro)*(j+1)/(dv-1));
							}
						}
					}
				}
			}
			
			//draw Spider
			//axis
			var axisGroup = s.createGroup(), axisStroke = {color: axisColor, width: axisWidth},
				spiderStroke = {color: spiderColor, width: spiderWidth};
			for (var j = outerPoints.length - 1; j >= 0; --j) {
				var point = outerPoints[j],
					st = {
						x: point.x + (point.x - circle.cx) * axisExtra,
						y: point.y + (point.y - circle.cy) * axisExtra
					},
					nd = {
						x: point.x + (point.x - circle.cx) * axisExtra / 2,
						y: point.y + (point.y - circle.cy) * axisExtra / 2
					};
				axisGroup.createLine({
					x1: circle.cx,
					y1: circle.cy,
					x2: st.x,
					y2: st.y
				}).setStroke(axisStroke);
				//arrow
				this._drawArrow(axisGroup, st, nd, axisStroke);
			}
			
			// draw the label
			var labelGroup = s.createGroup();
			for (var j = labelPoints.length - 1; j >= 0; --j) {
				var point = labelPoints[j],
					fontWidth = dojox.gfx._base._getTextBox(this.labelKey[j], {font: axisFont}).w || 0,
					render = this.opt.htmlLabels && dojox.gfx.renderer != "vml" ? "html" : "gfx";
					elem = da.createText[render](this.chart, labelGroup, (!dojo._isBodyLtr() && render == "html") ? (point.x + fontWidth - dim.width) : point.x, point.y,
							"middle", this.labelKey[j], axisFont, axisFontColor);
				if (this.opt.htmlLabels) {
					this.htmlElements.push(elem);
				}
			}
			
			//spider web: polygon or circle
			var spiderGroup = s.createGroup();
			if(spt == "polygon"){
				spiderGroup.createPolyline(outerPoints).setStroke(spiderStroke);
				spiderGroup.createPolyline(innerPoints).setStroke(spiderStroke);
				if (divisionPoints.length > 0) {
					for (var j = divisionPoints.length - 1; j >= 0; --j) {
						spiderGroup.createPolyline(divisionPoints[j]).setStroke(spiderStroke);
					}
				}
			}else{//circle
				var ccount = this._getObjectLength(this.datas);
				spiderGroup.createCircle({cx: circle.cx, cy: circle.cy, r: r}).setStroke(spiderStroke);
				spiderGroup.createCircle({cx: circle.cx, cy: circle.cy, r: r*ro}).setStroke(spiderStroke);
				if (divisionRadius.length > 0) {
					for (var j = divisionRadius.length - 1; j >= 0; --j) {
						spiderGroup.createCircle({cx: circle.cx, cy: circle.cy, r: divisionRadius[j]}).setStroke(spiderStroke);
					}
				}
			}
			//text
			var textGroup = s.createGroup(), len = this._getObjectLength(this.datas), k = 0;
			for(var key in this.datas){
				var data = this.datas[key], min = data.min, max = data.max, distance = max - min,
					end = start + 2 * Math.PI * k / len;
				for (var i = 0; i < dv; i++) {
					var text = min + distance*i/(dv-1), point = this._getCoordinate(circle, r*(ro + (1-ro)*i/(dv-1)), end);
					text = this._getLabel(text);
					var fontWidth = dojox.gfx._base._getTextBox(text, {font: axisTickFont}).w || 0,
						render = this.opt.htmlLabels && dojox.gfx.renderer != "vml" ? "html" : "gfx";
					if (this.opt.htmlLabels) {
						this.htmlElements.push(da.createText[render]
							(this.chart, textGroup, (!dojo._isBodyLtr() && render == "html") ? (point.x + fontWidth - dim.width) : point.x, point.y,
								"start", text, axisTickFont, axisTickFontColor));
					}
				}
				k++;
			}
			
			//draw series (animation)
			this.chart.seriesShapes = {};
			var animationConnections = [];
			for (var i = this.series.length - 1; i >= 0; i--) {
				var serieEntry = this.series[i], run = serieEntry.data;
				if (run !== null) {
					//series polygon
					var seriePoints = [], k = 0, tipData = [];
					for(var key in run){
						var data = this.datas[key], min = data.min, max = data.max, distance = max - min,
							entry = run[key], end = start + 2 * Math.PI * k / len,
							point = this._getCoordinate(circle, r*(ro + (1-ro)*(entry-min)/distance), end);
						seriePoints.push(point);
						tipData.push({sname: serieEntry.name, key: key, data: entry});
						k++;
					}
					seriePoints[seriePoints.length] = seriePoints[0];
					tipData[tipData.length] = tipData[0];
					var polygonBoundRect = this._getBoundary(seriePoints),
						theme = t.next("spider", [o, serieEntry]), ts = serieEntry.group,
						f = g.normalizeColor(theme.series.fill), sk = {color: theme.series.fill, width: seriesWidth};
					f.a = o.seriesFillAlpha;
					serieEntry.dyn = {fill: f, stroke: sk};
					
					var osps = this.oldSeriePoints[serieEntry.name];
					var cs = this._createSeriesEntry(ts, (osps || innerPoints), seriePoints, f, sk, r, ro, ms, at);
					this.chart.seriesShapes[serieEntry.name] = cs;
					this.oldSeriePoints[serieEntry.name] = seriePoints;
					
					var po = {
						element: "spider_poly",
						index:	 i,
						id:		 "spider_poly_"+serieEntry.name,
						run:	 serieEntry,
						plot:	 this,
						shape:	 cs.poly,
						parent:	 ts,
						brect:	 polygonBoundRect,
						cx:		 circle.cx,
						cy:		 circle.cy,
						cr:		 r,
						f:		 f,
						s:		 s
					};
					this._connectEvents(po);
					
					var so = {
						element: "spider_plot",
						index:	 i,
						id:		 "spider_plot_"+serieEntry.name,
						run:	 serieEntry,
						plot:	 this,
						shape:	 serieEntry.group
					};
					this._connectEvents(so);
					
					dojo.forEach(cs.circles, function(c, i){
						var shape = c.getShape(),
							co = {
								element: "spider_circle",
								index:	 i,
								id:		 "spider_circle_"+serieEntry.name+i,
								run:	 serieEntry,
								plot:	 this,
								shape:	 c,
								parent:	 ts,
								tdata:	 tipData[i],
								cx:		 seriePoints[i].x,
								cy:		 seriePoints[i].y,
								f:		 f,
								s:		 s
							};
						this._connectEvents(co);
					}, this);
				}
			}
			return this;	//	dojox.charting.plot2d.Spider
		},
		_createSeriesEntry: function(ts, osps, sps, f, sk, r, ro, ms, at){
			//polygon
			var spoly = ts.createPolyline(osps).setFill(f).setStroke(sk), scircle = [];
			for (var j = 0; j < osps.length; j++) {
				var point = osps[j], cr = ms;
				var circle = ts.createCircle({cx: point.x, cy: point.y, r: cr}).setFill(f).setStroke(sk);
				scircle.push(circle);
			}
			
			var anims = dojo.map(sps, function(np, j){
				// create animation
				var sp = osps[j],
					anim = new dojo._Animation({
					duration: 1000,
					easing:	  at,
					curve:	  [sp.y, np.y]
				});
				var spl = spoly, sc = scircle[j];
				dojo.connect(anim, "onAnimate", function(y){
					//apply poly
					var pshape = spl.getShape();
					pshape.points[j].y = y;
					spl.setShape(pshape);
					//apply circle
					var cshape = sc.getShape();
					cshape.cy = y;
					sc.setShape(cshape);
				});
				return anim;
			});
			
			var anims1 = dojo.map(sps, function(np, j){
				// create animation
				var sp = osps[j],
					anim = new dojo._Animation({
					duration: 1000,
					easing:	  at,
					curve:	  [sp.x, np.x]
				});
				var spl = spoly, sc = scircle[j];
				dojo.connect(anim, "onAnimate", function(x){
					//apply poly
					var pshape = spl.getShape();
					pshape.points[j].x = x;
					spl.setShape(pshape);
					//apply circle
					var cshape = sc.getShape();
					cshape.cx = x;
					sc.setShape(cshape);
				});
				return anim;
			});
			var masterAnimation = dojo.fx.combine(anims.concat(anims1)); //dojo.fx.chain(anims);
			masterAnimation.play();
			return {group :ts, poly: spoly, circles: scircle};
		},
		plotEvent: function(o){
			//	summary:
			//		Stub function for use by specific plots.
			//	o: Object
			//		An object intended to represent event parameters.
			var runName = o.id ? o.id : "default", a;
			if (runName in this.animations) {
				a = this.animations[runName];
				a.anim && a.anim.stop(true);
			} else {
				a = this.animations[runName] = {};
			}
			if(o.element == "spider_poly"){
				if(!a.color){
					var color = o.shape.getFill();
					if(!color || !(color instanceof dojo.Color)){
						return;
					}
					a.color = {
						start: color,
						end:   transColor(color)
					};
				}
				var start = a.color.start, end = a.color.end;
				if(o.type == "onmouseout"){
					// swap colors
					var t = start; start = end; end = t;
				}
				a.anim = dojox.gfx.fx.animateFill({
					shape:	  o.shape,
					duration: 800,
					easing:	  dojo.fx.easing.backOut,
					color:	  {start: start, end: end}
				});
				a.anim.play();
			}else if(o.element == "spider_circle"){
				var init, scale, defaultScale = 1.5;
				if(o.type == "onmouseover"){
					init  = dojox.gfx.matrix.identity;
					scale = defaultScale;
					//show tooltip
					var aroundRect = {type: "rect"};
					aroundRect.x = o.cx;
					aroundRect.y = o.cy;
					aroundRect.width = aroundRect.height = 1;
					var lt = dojo.coords(this.chart.node, true);
					aroundRect.x += lt.x;
					aroundRect.y += lt.y;
					aroundRect.x = Math.round(aroundRect.x);
					aroundRect.y = Math.round(aroundRect.y);
					aroundRect.width = Math.ceil(aroundRect.width);
					aroundRect.height = Math.ceil(aroundRect.height);
					this.aroundRect = aroundRect;
					var position = ["after", "before"];
					if(dijit && dijit.Tooltip){
						dijit.showTooltip(o.tdata.sname + "<br/>" + o.tdata.key + "<br/>" + o.tdata.data, this.aroundRect, position);
					}
				}else{
					init  = dojox.gfx.matrix.scaleAt(defaultScale, o.cx, o.cy);
					scale = 1/defaultScale;
					if(dijit && dijit.Tooltip){
						this.aroundRect && dijit.hideTooltip(this.aroundRect);
					}
				}
				var cs = o.shape.getShape(),
					init = m.scaleAt(defaultScale, cs.cx, cs.cy),
					kwArgs = {
						shape: o.shape,
						duration: 200,
						easing:	  dojo.fx.easing.backOut,
						transform: [
							{name: "scaleAt", start: [1, cs.cx, cs.cy], end: [scale, cs.cx, cs.cy]},
							init
						]
					};
				a.anim = dojox.gfx.fx.animateTransform(kwArgs);
				a.anim.play();
			}else if(o.element == "spider_plot"){
				//dojo gfx function "moveToFront" not work in IE
				if (o.type == "onmouseover" && !dojo.isIE) {
					o.shape.moveToFront();
				}
			}
		},
		_getBoundary: function(points){
			var xmax = points[0].x,
				xmin = points[0].x,
				ymax = points[0].y,
				ymin = points[0].y;
			for(var i = 0; i < points.length; i++){
				var point = points[i];
				xmax = Math.max(point.x, xmax);
				ymax = Math.max(point.y, ymax);
				xmin = Math.min(point.x, xmin);
				ymin = Math.min(point.y, ymin);
			}
			return {
				x: xmin,
				y: ymin,
				width: xmax - xmin,
				height: ymax - ymin
			};
		},
		
		_drawArrow: function(s, start, end, stroke){
			var len = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)),
				sin = (end.y - start.y)/len, cos = (end.x - start.x)/len,
				point2 = {x: end.x + (len/3)*(-sin), y: end.y + (len/3)*cos},
				point3 = {x: end.x + (len/3)*sin, y: end.y + (len/3)*(-cos)};
			s.createPolyline([start, point2, point3]).setFill(stroke.color).setStroke(stroke);
		},
		
		_buildPoints: function(points, count, circle, radius, angle, recursive){
			for (var i = 0; i < count; i++) {
				var end = angle + 2 * Math.PI * i / count;
				points.push(this._getCoordinate(circle, radius, end));
			}
			if(recursive){
				points.push(this._getCoordinate(circle, radius, angle + 2 * Math.PI));
			}
		},
		
		_getCoordinate: function(circle, radius, angle){
			return {
				x: circle.cx + radius * Math.cos(angle),
				y: circle.cy + radius * Math.sin(angle)
			}
		},
		
		_getObjectLength: function(obj){
			var count = 0;
			if(dojo.isObject(obj)){
				for(var key in obj){
					count++;
				}
			}
			return count;
		},

		// utilities
		_getLabel: function(number){
			return dc.getLabel(number, this.opt.fixed, this.opt.precision);
		}
	});
	
	function transColor(color){
		var a = new dojox.color.Color(color),
			x = a.toHsl();
		if(x.s == 0){
			x.l = x.l < 50 ? 100 : 0;
		}else{
			x.s = 100;
			if(x.l < 50){
				x.l = 75;
			}else if(x.l > 75){
				x.l = 50;
			}else{
				x.l = x.l - 50 > 75 - x.l ?
					50 : 75;
			}
		}
		var color = dojox.color.fromHsl(x);
		color.a = 0.7;
		return color;
	}
	
})();

}

if(!dojo._hasResource["dojox.lang.functional.fold"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.functional.fold"] = true;
dojo.provide("dojox.lang.functional.fold");



// This module adds high-level functions and related constructs:
//	- "fold" family of functions

// Notes:
//	- missing high-level functions are provided with the compatible API:
//		foldl, foldl1, foldr, foldr1
//	- missing JS standard functions are provided with the compatible API:
//		reduce, reduceRight
//	- the fold's counterpart: unfold

// Defined methods:
//	- take any valid lambda argument as the functional argument
//	- operate on dense arrays
//	- take a string as the array argument
//	- take an iterator objects as the array argument (only foldl, foldl1, and reduce)

(function(){
	var d = dojo, df = dojox.lang.functional, empty = {};

	d.mixin(df, {
		// classic reduce-class functions
		foldl: function(/*Array|String|Object*/ a, /*Function*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from left
			//	to right using a seed value as a starting point; returns the final
			//	value.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var i, n;
			if(d.isArray(a)){
				// array
				for(i = 0, n = a.length; i < n; z = f.call(o, z, a[i], i, a), ++i);
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				for(i = 0; a.hasNext(); z = f.call(o, z, a.next(), i++, a));
			}else{
				// object/dictionary
				for(i in a){
					if(!(i in empty)){
						z = f.call(o, z, a[i], i, a);
					}
				}
			}
			return z;	// Object
		},
		foldl1: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from left
			//	to right; returns the final value.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var z, i, n;
			if(d.isArray(a)){
				// array
				z = a[0];
				for(i = 1, n = a.length; i < n; z = f.call(o, z, a[i], i, a), ++i);
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				if(a.hasNext()){
					z = a.next();
					for(i = 1; a.hasNext(); z = f.call(o, z, a.next(), i++, a));
				}
			}else{
				// object/dictionary
				var first = true;
				for(i in a){
					if(!(i in empty)){
						if(first){
							z = a[i];
							first = false;
						}else{
							z = f.call(o, z, a[i], i, a);
						}
					}
				}
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
			var n = a.length, z = a[n - 1], i = n - 1;
			for(; i > 0; --i, z = f.call(o, z, a[i], i, a));
			return z;	// Object
		},
		// JS 1.8 standard array functions, which can take a lambda as a parameter.
		reduce: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ z){
			// summary: apply a function simultaneously against two values of the array
			//	(from left-to-right) as to reduce it to a single value.
			return arguments.length < 3 ? df.foldl1(a, f) : df.foldl(a, f, z);	// Object
		},
		reduceRight: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ z){
			// summary: apply a function simultaneously against two values of the array
			//	(from right-to-left) as to reduce it to a single value.
			return arguments.length < 3 ? df.foldr1(a, f) : df.foldr(a, f, z);	// Object
		},
		// the fold's counterpart: unfold
		unfold: function(/*Function|String|Array*/ pr, /*Function|String|Array*/ f,
						/*Function|String|Array*/ g, /*Object*/ z, /*Object?*/ o){
			// summary: builds an array by unfolding a value
			o = o || d.global; f = df.lambda(f); g = df.lambda(g); pr = df.lambda(pr);
			var t = [];
			for(; !pr.call(o, z); t.push(f.call(o, z)), z = g.call(o, z));
			return t;	// Array
		}
	});
})();

}

if(!dojo._hasResource["dojox.color._base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.color._base"] = true;
dojo.provide("dojox.color._base");


//	alias all the dojo.Color mechanisms
dojox.color.Color=dojo.Color;
dojox.color.blend=dojo.blendColors;
dojox.color.fromRgb=dojo.colorFromRgb;
dojox.color.fromHex=dojo.colorFromHex;
dojox.color.fromArray=dojo.colorFromArray;
dojox.color.fromString=dojo.colorFromString;

//	alias the dojo.colors mechanisms
dojox.color.greyscale=dojo.colors.makeGrey;

//	static methods
dojo.mixin(dojox.color, {
	fromCmy: function(/* Object|Array|int */cyan, /*int*/magenta, /*int*/yellow){
		//	summary
		//	Create a dojox.color.Color from a CMY defined color.
		//	All colors should be expressed as 0-100 (percentage)

		if(dojo.isArray(cyan)){
			magenta=cyan[1], yellow=cyan[2], cyan=cyan[0];
		} else if(dojo.isObject(cyan)){
			magenta=cyan.m, yellow=cyan.y, cyan=cyan.c;
		}
		cyan/=100, magenta/=100, yellow/=100;

		var r=1-cyan, g=1-magenta, b=1-yellow;
		return new dojox.color.Color({ r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255) });	//	dojox.color.Color
	},

	fromCmyk: function(/* Object|Array|int */cyan, /*int*/magenta, /*int*/yellow, /*int*/black){
		//	summary
		//	Create a dojox.color.Color from a CMYK defined color.
		//	All colors should be expressed as 0-100 (percentage)

		if(dojo.isArray(cyan)){
			magenta=cyan[1], yellow=cyan[2], black=cyan[3], cyan=cyan[0];
		} else if(dojo.isObject(cyan)){
			magenta=cyan.m, yellow=cyan.y, black=cyan.b, cyan=cyan.c;
		}
		cyan/=100, magenta/=100, yellow/=100, black/=100;
		var r,g,b;
		r = 1-Math.min(1, cyan*(1-black)+black);
		g = 1-Math.min(1, magenta*(1-black)+black);
		b = 1-Math.min(1, yellow*(1-black)+black);
		return new dojox.color.Color({ r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255) });	//	dojox.color.Color
	},
	
	fromHsl: function(/* Object|Array|int */hue, /* int */saturation, /* int */luminosity){
		//	summary
		//	Create a dojox.color.Color from an HSL defined color.
		//	hue from 0-359 (degrees), saturation and luminosity 0-100.

		if(dojo.isArray(hue)){
			saturation=hue[1], luminosity=hue[2], hue=hue[0];
		} else if(dojo.isObject(hue)){
			saturation=hue.s, luminosity=hue.l, hue=hue.h;
		}
		saturation/=100;
		luminosity/=100;

		while(hue<0){ hue+=360; }
		while(hue>=360){ hue-=360; }
		
		var r, g, b;
		if(hue<120){
			r=(120-hue)/60, g=hue/60, b=0;
		} else if (hue<240){
			r=0, g=(240-hue)/60, b=(hue-120)/60;
		} else {
			r=(hue-240)/60, g=0, b=(360-hue)/60;
		}
		
		r=2*saturation*Math.min(r, 1)+(1-saturation);
		g=2*saturation*Math.min(g, 1)+(1-saturation);
		b=2*saturation*Math.min(b, 1)+(1-saturation);
		if(luminosity<0.5){
			r*=luminosity, g*=luminosity, b*=luminosity;
		}else{
			r=(1-luminosity)*r+2*luminosity-1;
			g=(1-luminosity)*g+2*luminosity-1;
			b=(1-luminosity)*b+2*luminosity-1;
		}
		return new dojox.color.Color({ r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255) });	//	dojox.color.Color
	},
	
	fromHsv: function(/* Object|Array|int */hue, /* int */saturation, /* int */value){
		//	summary
		//	Create a dojox.color.Color from an HSV defined color.
		//	hue from 0-359 (degrees), saturation and value 0-100.

		if(dojo.isArray(hue)){
			saturation=hue[1], value=hue[2], hue=hue[0];
		} else if (dojo.isObject(hue)){
			saturation=hue.s, value=hue.v, hue=hue.h;
		}
		
		if(hue==360){ hue=0; }
		saturation/=100;
		value/=100;
		
		var r, g, b;
		if(saturation==0){
			r=value, b=value, g=value;
		}else{
			var hTemp=hue/60, i=Math.floor(hTemp), f=hTemp-i;
			var p=value*(1-saturation);
			var q=value*(1-(saturation*f));
			var t=value*(1-(saturation*(1-f)));
			switch(i){
				case 0:{ r=value, g=t, b=p; break; }
				case 1:{ r=q, g=value, b=p; break; }
				case 2:{ r=p, g=value, b=t; break; }
				case 3:{ r=p, g=q, b=value; break; }
				case 4:{ r=t, g=p, b=value; break; }
				case 5:{ r=value, g=p, b=q; break; }
			}
		}
		return new dojox.color.Color({ r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255) });	//	dojox.color.Color
	}
});

//	Conversions directly on dojox.color.Color
dojo.extend(dojox.color.Color, {
	toCmy: function(){
		//	summary
		//	Convert this Color to a CMY definition.
		var cyan=1-(this.r/255), magenta=1-(this.g/255), yellow=1-(this.b/255);
		return { c:Math.round(cyan*100), m:Math.round(magenta*100), y:Math.round(yellow*100) };		//	Object
	},
	
	toCmyk: function(){
		//	summary
		//	Convert this Color to a CMYK definition.
		var cyan, magenta, yellow, black;
		var r=this.r/255, g=this.g/255, b=this.b/255;
		black = Math.min(1-r, 1-g, 1-b);
		cyan = (1-r-black)/(1-black);
		magenta = (1-g-black)/(1-black);
		yellow = (1-b-black)/(1-black);
		return { c:Math.round(cyan*100), m:Math.round(magenta*100), y:Math.round(yellow*100), b:Math.round(black*100) };	//	Object
	},
	
	toHsl: function(){
		//	summary
		//	Convert this Color to an HSL definition.
		var r=this.r/255, g=this.g/255, b=this.b/255;
		var min = Math.min(r, b, g), max = Math.max(r, g, b);
		var delta = max-min;
		var h=0, s=0, l=(min+max)/2;
		if(l>0 && l<1){
			s = delta/((l<0.5)?(2*l):(2-2*l));
		}
		if(delta>0){
			if(max==r && max!=g){
				h+=(g-b)/delta;
			}
			if(max==g && max!=b){
				h+=(2+(b-r)/delta);
			}
			if(max==b && max!=r){
				h+=(4+(r-g)/delta);
			}
			h*=60;
		}
		return { h:h, s:Math.round(s*100), l:Math.round(l*100) };	//	Object
	},

	toHsv: function(){
		//	summary
		//	Convert this Color to an HSV definition.
		var r=this.r/255, g=this.g/255, b=this.b/255;
		var min = Math.min(r, b, g), max = Math.max(r, g, b);
		var delta = max-min;
		var h = null, s = (max==0)?0:(delta/max);
		if(s==0){
			h = 0;
		}else{
			if(r==max){
				h = 60*(g-b)/delta;
			}else if(g==max){
				h = 120 + 60*(b-r)/delta;
			}else{
				h = 240 + 60*(r-g)/delta;
			}

			if(h<0){ h+=360; }
		}
		return { h:h, s:Math.round(s*100), v:Math.round(max*100) };	//	Object
	}
});

}

if(!dojo._hasResource["dojox.color"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.color"] = true;
dojo.provide("dojox.color");


}

if(!dojo._hasResource["dojox.color.Palette"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.color.Palette"] = true;
dojo.provide("dojox.color.Palette");


(function(){
	var dxc = dojox.color;
	/***************************************************************
	*	dojox.color.Palette
	*
	*	The Palette object is loosely based on the color palettes
	*	at Kuler (http://kuler.adobe.com).  They are 5 color palettes
	*	with the base color considered to be the third color in the
	*	palette (for generation purposes).
	*
	*	Palettes can be generated from well-known algorithms or they
	* 	can be manually created by passing an array to the constructor.
	*
	*	Palettes can be transformed, using a set of specific params
	*	similar to the way shapes can be transformed with dojox.gfx.
	*	However, unlike with transformations in dojox.gfx, transforming
	* 	a palette will return you a new Palette object, in effect
	* 	a clone of the original.
	***************************************************************/

	//	ctor ----------------------------------------------------------------------------
	dxc.Palette = function(/* String|Array|dojox.color.Color|dojox.color.Palette */base){
		//	summary:
		//		An object that represents a palette of colors.
		//	description:
		//		A Palette is a representation of a set of colors.  While the standard
		//		number of colors contained in a palette is 5, it can really handle any
		//		number of colors.
		//
		//		A palette is useful for the ability to transform all the colors in it
		//		using a simple object-based approach.  In addition, you can generate
		//		palettes using dojox.color.Palette.generate; these generated palettes
		//		are based on the palette generators at http://kuler.adobe.com.
		//
		//	colors: dojox.color.Color[]
		//		The actual color references in this palette.
		this.colors = [];
		if(base instanceof dojox.color.Palette){
			this.colors = base.colors.slice(0);
		}
		else if(base instanceof dojox.color.Color){
			this.colors = [ null, null, base, null, null ];
		}
		else if(dojo.isArray(base)){
			this.colors = dojo.map(base.slice(0), function(item){
				if(dojo.isString(item)){ return new dojox.color.Color(item); }
				return item;
			});
		}
		else if (dojo.isString(base)){
			this.colors = [ null, null, new dojox.color.Color(base), null, null ];
		}
	}

	//	private functions ---------------------------------------------------------------

	//	transformations
	function tRGBA(p, param, val){
		var ret = new dojox.color.Palette();
		ret.colors = [];
		dojo.forEach(p.colors, function(item){
			var r=(param=="dr")?item.r+val:item.r,
				g=(param=="dg")?item.g+val:item.g,
				b=(param=="db")?item.b+val:item.b,
				a=(param=="da")?item.a+val:item.a
			ret.colors.push(new dojox.color.Color({
				r: Math.min(255, Math.max(0, r)),
				g: Math.min(255, Math.max(0, g)),
				b: Math.min(255, Math.max(0, b)),
				a: Math.min(1, Math.max(0, a))
			}));
		});
		return ret;
	}

	function tCMY(p, param, val){
		var ret = new dojox.color.Palette();
		ret.colors = [];
		dojo.forEach(p.colors, function(item){
			var o=item.toCmy(),
				c=(param=="dc")?o.c+val:o.c,
				m=(param=="dm")?o.m+val:o.m,
				y=(param=="dy")?o.y+val:o.y;
			ret.colors.push(dojox.color.fromCmy(
				Math.min(100, Math.max(0, c)),
				Math.min(100, Math.max(0, m)),
				Math.min(100, Math.max(0, y))
			));
		});
		return ret;
	}

	function tCMYK(p, param, val){
		var ret = new dojox.color.Palette();
		ret.colors = [];
		dojo.forEach(p.colors, function(item){
			var o=item.toCmyk(),
				c=(param=="dc")?o.c+val:o.c,
				m=(param=="dm")?o.m+val:o.m,
				y=(param=="dy")?o.y+val:o.y,
				k=(param=="dk")?o.b+val:o.b;
			ret.colors.push(dojox.color.fromCmyk(
				Math.min(100, Math.max(0, c)),
				Math.min(100, Math.max(0, m)),
				Math.min(100, Math.max(0, y)),
				Math.min(100, Math.max(0, k))
			));
		});
		return ret;
	}

	function tHSL(p, param, val){
		var ret = new dojox.color.Palette();
		ret.colors = [];
		dojo.forEach(p.colors, function(item){
			var o=item.toHsl(),
				h=(param=="dh")?o.h+val:o.h,
				s=(param=="ds")?o.s+val:o.s,
				l=(param=="dl")?o.l+val:o.l;
			ret.colors.push(dojox.color.fromHsl(h%360, Math.min(100, Math.max(0, s)), Math.min(100, Math.max(0, l))));
		});
		return ret;
	}

	function tHSV(p, param, val){
		var ret = new dojox.color.Palette();
		ret.colors = [];
		dojo.forEach(p.colors, function(item){
			var o=item.toHsv(),
				h=(param=="dh")?o.h+val:o.h,
				s=(param=="ds")?o.s+val:o.s,
				v=(param=="dv")?o.v+val:o.v;
			ret.colors.push(dojox.color.fromHsv(h%360, Math.min(100, Math.max(0, s)), Math.min(100, Math.max(0, v))));
		});
		return ret;
	}

	//	helper functions
	function rangeDiff(val, low, high){
		//	given the value in a range from 0 to high, find the equiv
		//		using the range low to high.
		return high-((high-val)*((high-low)/high));
	}

	//	object methods ---------------------------------------------------------------
	dojo.extend(dxc.Palette, {
		transform: function(/* dojox.color.Palette.__transformArgs */kwArgs){
			//	summary:
			//		Transform the palette using a specific transformation function
			//		and a set of transformation parameters.
			//	description:
			//		{palette}.transform is a simple way to uniformly transform
			//		all of the colors in a palette using any of 5 formulae:
			//		RGBA, HSL, HSV, CMYK or CMY.
			//
			//		Once the forumula to be used is determined, you can pass any
			//		number of parameters based on the formula "d"[param]; for instance,
			//		{ use: "rgba", dr: 20, dg: -50 } will take all of the colors in
			//		palette, add 20 to the R value and subtract 50 from the G value.
			//
			//		Unlike other types of transformations, transform does *not* alter
			//		the original palette but will instead return a new one.
			var fn=tRGBA;	//	the default transform function.
			if(kwArgs.use){
				//	we are being specific about the algo we want to use.
				var use=kwArgs.use.toLowerCase();
				if(use.indexOf("hs")==0){
					if(use.charAt(2)=="l"){ fn=tHSL; }
					else { fn=tHSV; }
				}
				else if(use.indexOf("cmy")==0){
					if(use.charAt(3)=="k"){ fn=tCMYK; }
					else { fn=tCMY; }
				}
			}
			//	try to guess the best choice.
			else if("dc" in kwArgs || "dm" in kwArgs || "dy" in kwArgs){
				if("dk" in kwArgs){ fn = tCMYK; }
				else { fn = tCMY; }
			}
			else if("dh" in kwArgs || "ds" in kwArgs){
				if("dv" in kwArgs){ fn = tHSV; }
				else { fn = tHSL; }
			}

			var palette = this;
			for(var p in kwArgs){
				//	ignore use
				if(p=="use"){ continue; }
				palette = fn(palette, p, kwArgs[p]);
			}
			return palette;		//	dojox.color.Palette
		},
		clone: function(){
			//	summary:
			//		Clones the current palette.
			return new dxc.Palette(this);	//	dojox.color.Palette
		}
	});

/*=====
dojox.color.Palette.__transformArgs = function(use, dr, dg, db, da, dc, dm, dy, dk, dh, ds, dv, dl){
	//	summary:
	//		The keywords argument to be passed to the dojox.color.Palette.transform function.  Note that
	//		while all arguments are optional, *some* arguments must be passed.  The basic concept is that
	//		you pass a delta value for a specific aspect of a color model (or multiple aspects of the same
	//		color model); for instance, if you wish to transform a palette based on the HSV color model,
	//		you would pass one of "dh", "ds", or "dv" as a value.
	//
	//	use: String?
	//		Specify the color model to use for the transformation.  Can be "rgb", "rgba", "hsv", "hsl", "cmy", "cmyk".
	//	dr: Number?
	//		The delta to be applied to the red aspect of the RGB/RGBA color model.
	//	dg: Number?
	//		The delta to be applied to the green aspect of the RGB/RGBA color model.
	//	db: Number?
	//		The delta to be applied to the blue aspect of the RGB/RGBA color model.
	//	da: Number?
	//		The delta to be applied to the alpha aspect of the RGBA color model.
	//	dc: Number?
	//		The delta to be applied to the cyan aspect of the CMY/CMYK color model.
	//	dm: Number?
	//		The delta to be applied to the magenta aspect of the CMY/CMYK color model.
	//	dy: Number?
	//		The delta to be applied to the yellow aspect of the CMY/CMYK color model.
	//	dk: Number?
	//		The delta to be applied to the black aspect of the CMYK color model.
	//	dh: Number?
	//		The delta to be applied to the hue aspect of the HSL/HSV color model.
	//	ds: Number?
	//		The delta to be applied to the saturation aspect of the HSL/HSV color model.
	//	dl: Number?
	//		The delta to be applied to the luminosity aspect of the HSL color model.
	//	dv: Number?
	//		The delta to be applied to the value aspect of the HSV color model.
	this.use = use;
	this.dr = dr;
	this.dg = dg;
	this.db = db;
	this.da = da;
	this.dc = dc;
	this.dm = dm;
	this.dy = dy;
	this.dk = dk;
	this.dh = dh;
	this.ds = ds;
	this.dl = dl;
	this.dv = dv;
}
dojox.color.Palette.__generatorArgs = function(base){
	//	summary:
	//		The keyword arguments object used to create a palette based on a base color.
	//
	//	base: dojo.Color
	//		The base color to be used to generate the palette.
	this.base = base;
}
dojox.color.Palette.__analogousArgs = function(base, high, low){
	//	summary:
	//		The keyword arguments object that is used to create a 5 color palette based on the
	//		analogous rules as implemented at http://kuler.adobe.com, using the HSV color model.
	//
	//	base: dojo.Color
	//		The base color to be used to generate the palette.
	//	high: Number?
	//		The difference between the hue of the base color and the highest hue.  In degrees, default is 60.
	//	low: Number?
	//		The difference between the hue of the base color and the lowest hue.  In degrees, default is 18.
	this.base = base;
	this.high = high;
	this.low = low;
}
dojox.color.Palette.__splitComplementaryArgs = function(base, da){
	//	summary:
	//		The keyword arguments object used to create a palette based on the split complementary rules
	//		as implemented at http://kuler.adobe.com.
	//
	//	base: dojo.Color
	//		The base color to be used to generate the palette.
	//	da: Number?
	//		The delta angle to be used to determine where the split for the complementary rules happen.
	//		In degrees, the default is 30.
	this.base = base;
	this.da = da;
}
=====*/
	dojo.mixin(dxc.Palette, {
		generators: {
			analogous:function(/* dojox.color.Palette.__analogousArgs */args){
				//	summary:
				//		Create a 5 color palette based on the analogous rules as implemented at
				//		http://kuler.adobe.com.
				var high=args.high||60, 	//	delta between base hue and highest hue (subtracted from base)
					low=args.low||18,		//	delta between base hue and lowest hue (added to base)
					base = dojo.isString(args.base)?new dojox.color.Color(args.base):args.base,
					hsv=base.toHsv();

				//	generate our hue angle differences
				var h=[
					(hsv.h+low+360)%360,
					(hsv.h+Math.round(low/2)+360)%360,
					hsv.h,
					(hsv.h-Math.round(high/2)+360)%360,
					(hsv.h-high+360)%360
				];

				var s1=Math.max(10, (hsv.s<=95)?hsv.s+5:(100-(hsv.s-95))),
					s2=(hsv.s>1)?hsv.s-1:21-hsv.s,
					v1=(hsv.v>=92)?hsv.v-9:Math.max(hsv.v+9, 20),
					v2=(hsv.v<=90)?Math.max(hsv.v+5, 20):(95+Math.ceil((hsv.v-90)/2)),
					s=[ s1, s2, hsv.s, s1, s1 ],
					v=[ v1, v2, hsv.v, v1, v2 ]

				return new dxc.Palette(dojo.map(h, function(hue, i){
					return dojox.color.fromHsv(hue, s[i], v[i]);
				}));		//	dojox.color.Palette
			},

			monochromatic: function(/* dojox.color.Palette.__generatorArgs */args){
				//	summary:
				//		Create a 5 color palette based on the monochromatic rules as implemented at
				//		http://kuler.adobe.com.
				var base = dojo.isString(args.base)?new dojox.color.Color(args.base):args.base,
					hsv = base.toHsv();
				
				//	figure out the saturation and value
				var s1 = (hsv.s-30>9)?hsv.s-30:hsv.s+30,
					s2 = hsv.s,
					v1 = rangeDiff(hsv.v, 20, 100),
					v2 = (hsv.v-20>20)?hsv.v-20:hsv.v+60,
					v3 = (hsv.v-50>20)?hsv.v-50:hsv.v+30;

				return new dxc.Palette([
					dojox.color.fromHsv(hsv.h, s1, v1),
					dojox.color.fromHsv(hsv.h, s2, v3),
					base,
					dojox.color.fromHsv(hsv.h, s1, v3),
					dojox.color.fromHsv(hsv.h, s2, v2)
				]);		//	dojox.color.Palette
			},

			triadic: function(/* dojox.color.Palette.__generatorArgs */args){
				//	summary:
				//		Create a 5 color palette based on the triadic rules as implemented at
				//		http://kuler.adobe.com.
				var base = dojo.isString(args.base)?new dojox.color.Color(args.base):args.base,
					hsv = base.toHsv();

				var h1 = (hsv.h+57+360)%360,
					h2 = (hsv.h-157+360)%360,
					s1 = (hsv.s>20)?hsv.s-10:hsv.s+10,
					s2 = (hsv.s>90)?hsv.s-10:hsv.s+10,
					s3 = (hsv.s>95)?hsv.s-5:hsv.s+5,
					v1 = (hsv.v-20>20)?hsv.v-20:hsv.v+20,
					v2 = (hsv.v-30>20)?hsv.v-30:hsv.v+30,
					v3 = (hsv.v-30>70)?hsv.v-30:hsv.v+30;

				return new dxc.Palette([
					dojox.color.fromHsv(h1, s1, hsv.v),
					dojox.color.fromHsv(hsv.h, s2, v2),
					base,
					dojox.color.fromHsv(h2, s2, v1),
					dojox.color.fromHsv(h2, s3, v3)
				]);		//	dojox.color.Palette
			},

			complementary: function(/* dojox.color.Palette.__generatorArgs */args){
				//	summary:
				//		Create a 5 color palette based on the complementary rules as implemented at
				//		http://kuler.adobe.com.
				var base = dojo.isString(args.base)?new dojox.color.Color(args.base):args.base,
					hsv = base.toHsv();

				var h1 = ((hsv.h*2)+137<360)?(hsv.h*2)+137:Math.floor(hsv.h/2)-137,
					s1 = Math.max(hsv.s-10, 0),
					s2 = rangeDiff(hsv.s, 10, 100),
					s3 = Math.min(100, hsv.s+20),
					v1 = Math.min(100, hsv.v+30),
					v2 = (hsv.v>20)?hsv.v-30:hsv.v+30;

				return new dxc.Palette([
					dojox.color.fromHsv(hsv.h, s1, v1),
					dojox.color.fromHsv(hsv.h, s2, v2),
					base,
					dojox.color.fromHsv(h1, s3, v2),
					dojox.color.fromHsv(h1, hsv.s, hsv.v)
				]);		//	dojox.color.Palette
			},

			splitComplementary: function(/* dojox.color.Palette.__splitComplementaryArgs */args){
				//	summary:
				//		Create a 5 color palette based on the split complementary rules as implemented at
				//		http://kuler.adobe.com.
				var base = dojo.isString(args.base)?new dojox.color.Color(args.base):args.base,
					dangle = args.da || 30,
					hsv = base.toHsv();

				var baseh = ((hsv.h*2)+137<360)?(hsv.h*2)+137:Math.floor(hsv.h/2)-137,
					h1 = (baseh-dangle+360)%360,
					h2 = (baseh+dangle)%360,
					s1 = Math.max(hsv.s-10, 0),
					s2 = rangeDiff(hsv.s, 10, 100),
					s3 = Math.min(100, hsv.s+20),
					v1 = Math.min(100, hsv.v+30),
					v2 = (hsv.v>20)?hsv.v-30:hsv.v+30;

				return new dxc.Palette([
					dojox.color.fromHsv(h1, s1, v1),
					dojox.color.fromHsv(h1, s2, v2),
					base,
					dojox.color.fromHsv(h2, s3, v2),
					dojox.color.fromHsv(h2, hsv.s, hsv.v)
				]);		//	dojox.color.Palette
			},

			compound: function(/* dojox.color.Palette.__generatorArgs */args){
				//	summary:
				//		Create a 5 color palette based on the compound rules as implemented at
				//		http://kuler.adobe.com.
				var base = dojo.isString(args.base)?new dojox.color.Color(args.base):args.base,
					hsv = base.toHsv();

				var h1 = ((hsv.h*2)+18<360)?(hsv.h*2)+18:Math.floor(hsv.h/2)-18,
					h2 = ((hsv.h*2)+120<360)?(hsv.h*2)+120:Math.floor(hsv.h/2)-120,
					h3 = ((hsv.h*2)+99<360)?(hsv.h*2)+99:Math.floor(hsv.h/2)-99,
					s1 = (hsv.s-40>10)?hsv.s-40:hsv.s+40,
					s2 = (hsv.s-10>80)?hsv.s-10:hsv.s+10,
					s3 = (hsv.s-25>10)?hsv.s-25:hsv.s+25,
					v1 = (hsv.v-40>10)?hsv.v-40:hsv.v+40,
					v2 = (hsv.v-20>80)?hsv.v-20:hsv.v+20,
					v3 = Math.max(hsv.v, 20);

				return new dxc.Palette([
					dojox.color.fromHsv(h1, s1, v1),
					dojox.color.fromHsv(h1, s2, v2),
					base,
					dojox.color.fromHsv(h2, s3, v3),
					dojox.color.fromHsv(h3, s2, v2)
				]);		//	dojox.color.Palette
			},

			shades: function(/* dojox.color.Palette.__generatorArgs */args){
				//	summary:
				//		Create a 5 color palette based on the shades rules as implemented at
				//		http://kuler.adobe.com.
				var base = dojo.isString(args.base)?new dojox.color.Color(args.base):args.base,
					hsv = base.toHsv();

				var s  = (hsv.s==100 && hsv.v==0)?0:hsv.s,
					v1 = (hsv.v-50>20)?hsv.v-50:hsv.v+30,
					v2 = (hsv.v-25>=20)?hsv.v-25:hsv.v+55,
					v3 = (hsv.v-75>=20)?hsv.v-75:hsv.v+5,
					v4 = Math.max(hsv.v-10, 20);

				return new dxc.Palette([
					new dojox.color.fromHsv(hsv.h, s, v1),
					new dojox.color.fromHsv(hsv.h, s, v2),
					base,
					new dojox.color.fromHsv(hsv.h, s, v3),
					new dojox.color.fromHsv(hsv.h, s, v4)
				]);		//	dojox.color.Palette
			}
		},
		generate: function(/* String|dojox.color.Color */base, /* Function|String */type){
			//	summary:
			//		Generate a new Palette using any of the named functions in
			//		dojox.color.Palette.generators or an optional function definition.  Current
			//		generators include "analogous", "monochromatic", "triadic", "complementary",
			//		"splitComplementary", and "shades".
			if(dojo.isFunction(type)){
				return type({ base: base });	//	dojox.color.Palette
			}
			else if(dxc.Palette.generators[type]){
				return dxc.Palette.generators[type]({ base: base });	//	dojox.color.Palette
			}
			throw new Error("dojox.color.Palette.generate: the specified generator ('" + type + "') does not exist.");
		}
	});
})();

}

if(!dojo._hasResource["dojox.charting.Theme"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.Theme"] = true;
dojo.provide("dojox.charting.Theme");






dojo.declare("dojox.charting.Theme", null, {
	//	summary:
	//		A Theme is a pre-defined object, primarily JSON-based, that makes up the definitions to
	//		style a chart.
	//
	//	description:
	//		While you can set up style definitions on a chart directly (usually through the various add methods
	//		on a dojox.charting.Chart2D object), a Theme simplifies this manual setup by allowing you to
	//		pre-define all of the various visual parameters of each element in a chart.
	//
	//		Most of the properties of a Theme are straight-forward; if something is line-based (such as
	//		an axis or the ticks on an axis), they will be defined using basic stroke parameters.  Likewise,
	//		if an element is primarily block-based (such as the background of a chart), it will be primarily
	//		fill-based.
	//
	//		In addition (for convenience), a Theme definition does not have to contain the entire JSON-based
	//		structure.  Each theme is built on top of a default theme (which serves as the basis for the theme
	//		"GreySkies"), and is mixed into the default theme object.  This allows you to create a theme based,
	//		say, solely on colors for data series.
	//
	//		Defining a new theme is relatively easy; see any of the themes in dojox.charting.themes for examples
	//		on how to define your own.
	//
	//		When you set a theme on a chart, the theme itself is deep-cloned.  This means that you cannot alter
	//		the theme itself after setting the theme value on a chart, and expect it to change your chart.  If you
	//		are looking to make alterations to a theme for a chart, the suggestion would be to create your own
	//		theme, based on the one you want to use, that makes those alterations before it is applied to a chart.
	//
	//		Finally, a Theme contains a number of functions to facilitate rendering operations on a chart--the main
	//		helper of which is the ~next~ method, in which a chart asks for the information for the next data series
	//		to be rendered.
	//
	//		A note on colors:
	//		The Theme constructor was on the use of dojox.color.Palette (in general) for creating a visually distinct
	//		set of colors for usage in a chart.  A palette is usually comprised of 5 different color definitions, and
	//		no more.  If you have a need to render a chart with more than 5 data elements, you can simply "push"
	//		new color definitions into the theme's .color array.  Make sure that you do that with the actual
	//		theme object from a Chart, and not in the theme itself (i.e. either do that before using .setTheme
	//		on a chart).
	//
	//		example:
	//			The default theme (and structure) looks like so:
	//	|	// all objects are structs used directly in dojox.gfx
	//	|	chart:{
	//	|		stroke: null,
	//	|		fill: "white",
	//	|		pageStyle: null // suggested page style as an object suitable for dojo.style()
	//	|	},
	//	|	plotarea:{
	//	|		stroke: null,
	//	|		fill: "white"
	//	|	},
	//	|	axis:{
	//	|		stroke:	{ // the axis itself
	//	|			color: "#333",
	//	|			width: 1
	//	|		},
	//	|		tick: {	// used as a foundation for all ticks
	//	|			color:     "#666",
	//	|			position:  "center",
	//	|			font:      "normal normal normal 7pt Tahoma",	// labels on axis
	//	|			fontColor: "#333"								// color of labels
	//	|		},
	//	|		majorTick:	{ // major ticks on axis, and used for major gridlines
	//	|			width:  1,
	//	|			length: 6
	//	|		},
	//	|		minorTick:	{ // minor ticks on axis, and used for minor gridlines
	//	|			width:  0.8,
	//	|			length: 3
	//	|		},
	//	|		microTick:	{ // minor ticks on axis, and used for minor gridlines
	//	|			width:  0.5,
	//	|			length: 1
	//	|		}
	//	|	},
	//	|	series: {
	//	|		stroke:  {width: 1.5, color: "#333"},		// line
	//	|		outline: {width: 0.1, color: "#ccc"},		// outline
	//	|		//shadow:  {dx: 1, dy: 1, width: 2, color: [0, 0, 0, 0.3]},
	//	|		shadow: null,								// no shadow
	//	|		fill:    "#ccc",							// fill, if appropriate
	//	|		font:    "normal normal normal 8pt Tahoma",	// if there's a label
	//	|		fontColor: "#000"							// color of labels
	//	|		labelWiring: {width: 1, color: "#ccc"},		// connect marker and target data item(slice, column, bar...)
	//	|	},
	//	|	marker: {	// any markers on a series
	//	|		symbol:  "m-3,3 l3,-6 3,6 z",				// symbol
	//	|		stroke:  {width: 1.5, color: "#333"},		// stroke
	//	|		outline: {width: 0.1, color: "#ccc"},		// outline
	//	|		shadow: null,								// no shadow
	//	|		fill:    "#ccc",							// fill if needed
	//	|		font:    "normal normal normal 8pt Tahoma",	// label
	//	|		fontColor: "#000"
	//	|	}
	//
	//	example:
	//		Defining a new theme is pretty simple:
	//	|	dojox.charting.themes.Grasslands = new dojox.charting.Theme({
	//	|		colors: [ "#70803a", "#dde574", "#788062", "#b1cc5d", "#eff2c2" ]
	//	|	});
	//	|
	//	|	myChart.setTheme(dojox.charting.themes.Grasslands);

	shapeSpaces: {shape: 1, shapeX: 1, shapeY: 1},

	constructor: function(kwArgs){
		//	summary:
		//		Initialize a theme using the keyword arguments.  Note that the arguments
		//		look like the example (above), and may include a few more parameters.
		kwArgs = kwArgs || {};

		// populate theme with defaults updating them if needed
		var def = dojox.charting.Theme.defaultTheme;
		dojo.forEach(["chart", "plotarea", "axis", "series", "marker"], function(name){
			this[name] = dojo.delegate(def[name], kwArgs[name]);
		}, this);

		// personalize theme
		if(kwArgs.seriesThemes && kwArgs.seriesThemes.length){
			this.colors  = null;
			this.seriesThemes = kwArgs.seriesThemes.slice(0);
		}else{
			this.seriesThemes = null;
			this.colors = (kwArgs.colors || dojox.charting.Theme.defaultColors).slice(0);
		}
		this.markerThemes = null;
		if(kwArgs.markerThemes && kwArgs.markerThemes.length){
			this.markerThemes = kwArgs.markerThemes.slice(0);
		}
		this.markers = kwArgs.markers ? dojo.clone(kwArgs.markers) : dojo.delegate(dojox.charting.Theme.defaultMarkers);

		// set flags
		this.noGradConv = kwArgs.noGradConv;
		this.noRadialConv = kwArgs.noRadialConv;
		if(kwArgs.reverseFills){
			this.reverseFills();
		}

		//	private housekeeping
		this._current = 0;
		this._buildMarkerArray();
	},

	clone: function(){
		//	summary:
		//		Clone the current theme.
		//	returns: dojox.charting.Theme
		//		The cloned theme; any alterations made will not affect the original.
		var theme = new dojox.charting.Theme({
			// theme components
			chart: this.chart,
			plotarea: this.plotarea,
			axis: this.axis,
			series: this.series,
			marker: this.marker,
			// individual arrays
			colors: this.colors,
			markers: this.markers,
			seriesThemes: this.seriesThemes,
			markerThemes: this.markerThemes,
			// flags
			noGradConv: this.noGradConv,
			noRadialConv: this.noRadialConv
		});
		// copy custom methods
		dojo.forEach(
			["clone", "clear", "next", "skip", "addMixin", "post", "getTick"],
			function(name){
				if(this.hasOwnProperty(name)){
					theme[name] = this[name];
				}
			},
			this
		);
		return theme;	//	dojox.charting.Theme
	},

	clear: function(){
		//	summary:
		//		Clear and reset the internal pointer to start fresh.
		this._current = 0;
	},

	next: function(elementType, mixin, doPost){
		//	summary:
		//		Get the next color or series theme.
		//	elementType: String?
		//		An optional element type (for use with series themes)
		//	mixin: Object?
		//		An optional object to mix into the theme.
		//	doPost: Boolean?
		//		A flag to post-process the results.
		//	returns: Object
		//		An object of the structure { series, marker, symbol }
		var merge = dojox.lang.utils.merge, series, marker;
		if(this.colors){
			series = dojo.delegate(this.series);
			marker = dojo.delegate(this.marker);
			var color = new dojo.Color(this.colors[this._current % this.colors.length]), old;
			// modify the stroke
			if(series.stroke && series.stroke.color){
				series.stroke = dojo.delegate(series.stroke);
				old = new dojo.Color(series.stroke.color);
				series.stroke.color = new dojo.Color(color);
				series.stroke.color.a = old.a;
			}else{
				series.stroke = {color: color};
			}
			if(marker.stroke && marker.stroke.color){
				marker.stroke = dojo.delegate(marker.stroke);
				old = new dojo.Color(marker.stroke.color);
				marker.stroke.color = new dojo.Color(color);
				marker.stroke.color.a = old.a;
			}else{
				marker.stroke = {color: color};
			}
			// modify the fill
			if(!series.fill || series.fill.type){
				series.fill = color;
			}else{
				old = new dojo.Color(series.fill);
				series.fill = new dojo.Color(color);
				series.fill.a = old.a;
			}
			if(!marker.fill || marker.fill.type){
				marker.fill = color;
			}else{
				old = new dojo.Color(marker.fill);
				marker.fill = new dojo.Color(color);
				marker.fill.a = old.a;
			}
		}else{
			series = this.seriesThemes ?
				merge(this.series, this.seriesThemes[this._current % this.seriesThemes.length]) :
				this.series;
			marker = this.markerThemes ?
				merge(this.marker, this.markerThemes[this._current % this.markerThemes.length]) :
				series;
		}

		var symbol = marker && marker.symbol || this._markers[this._current % this._markers.length];

		var theme = {series: series, marker: marker, symbol: symbol};
		
		// advance the counter
		++this._current;

		if(mixin){
			theme = this.addMixin(theme, elementType, mixin);
		}
		if(doPost){
			theme = this.post(theme, elementType);
		}

		return theme;	//	Object
	},

	skip: function(){
		//	summary:
		//		Skip the next internal color.
		++this._current;
	},

	addMixin: function(theme, elementType, mixin, doPost){
		//	summary:
		//		Add a mixin object to the passed theme and process.
		//	theme: dojox.charting.Theme
		//		The theme to mixin to.
		//	elementType: String
		//		The type of element in question. Can be "line", "bar" or "circle"
		//	mixin: Object|Array
		//		The object or objects to mix into the theme.
		//	doPost: Boolean
		//		If true, run the new theme through the post-processor.
		//	returns: dojox.charting.Theme
		//		The new theme.
		if(dojo.isArray(mixin)){
			dojo.forEach(mixin, function(m){
				theme = this.addMixin(theme, elementType, m);
			}, this);
		}else{
			var t = {};
			if("color" in mixin){
				if(elementType == "line" || elementType == "area"){
					dojo.setObject("series.stroke.color", mixin.color, t);
					dojo.setObject("marker.stroke.color", mixin.color, t);
				}else{
					dojo.setObject("series.fill", mixin.color, t);
				}
			}
			dojo.forEach(["stroke", "outline", "shadow", "fill", "font", "fontColor", "labelWiring"], function(name){
				var markerName = "marker" + name.charAt(0).toUpperCase() + name.substr(1),
					b = markerName in mixin;
				if(name in mixin){
					dojo.setObject("series." + name, mixin[name], t);
					if(!b){
						dojo.setObject("marker." + name, mixin[name], t);
					}
				}
				if(b){
					dojo.setObject("marker." + name, mixin[markerName], t);
				}
			});
			if("marker" in mixin){
				t.symbol = mixin.marker;
			}
			theme = dojox.lang.utils.merge(theme, t);
		}
		if(doPost){
			theme = this.post(theme, elementType);
		}
		return theme;	//	dojox.charting.Theme
	},

	post: function(theme, elementType){
		//	summary:
		//		Process any post-shape fills.
		//	theme: dojox.charting.Theme
		//		The theme to post process with.
		//	elementType: String
		//		The type of element being filled.  Can be "bar" or "circle".
		//	returns: dojox.charting.Theme
		//		The post-processed theme.
		var fill = theme.series.fill, t;
		if(!this.noGradConv && this.shapeSpaces[fill.space] && fill.type == "linear"){
			if(elementType == "bar"){
				// transpose start and end points
				t = {
					x1: fill.y1,
					y1: fill.x1,
					x2: fill.y2,
					y2: fill.x2
				};
			}else if(!this.noRadialConv && fill.space == "shape" && (elementType == "slice" || elementType == "circle")){
				// switch to radial
				t = {
					type: "radial",
					cx: 0,
					cy: 0,
					r:  100
				};
			}
			if(t){
				return dojox.lang.utils.merge(theme, {series: {fill: t}});
			}
		}
		return theme;	//	dojox.charting.Theme
	},

	getTick: function(name, mixin){
		//	summary:
		//		Calculates and merges tick parameters.
		//	name: String
		//		Tick name, can be "major", "minor", or "micro".
		//	mixin: Object?
		//		Optional object to mix in to the tick.
		var tick = this.axis.tick, tickName = name + "Tick";
			merge = dojox.lang.utils.merge;
		if(tick){
			if(this.axis[tickName]){
				tick = merge(tick, this.axis[tickName]);
			}
		}else{
			tick = this.axis[tickName];
		}
		if(mixin){
			if(tick){
				if(mixin[tickName]){
					tick = merge(tick, mixin[tickName]);
				}
			}else{
				tick = mixin[tickName];
			}
		}
		return tick;	//	Object
	},

	inspectObjects: function(f){
		dojo.forEach(["chart", "plotarea", "axis", "series", "marker"], function(name){
			f(this[name]);
		}, this);
		if(this.seriesThemes){
			dojo.forEach(this.seriesThemes, f);
		}
		if(this.markerThemes){
			dojo.forEach(this.markerThemes, f);
		}
	},

	reverseFills: function(){
		this.inspectObjects(function(o){
			if(o && o.fill){
				o.fill = dojox.gfx.gradutils.reverse(o.fill);
			}
		});
	},

	addMarker:function(/*String*/ name, /*String*/ segment){
		//	summary:
		//		Add a custom marker to this theme.
		//	example:
		//	|	myTheme.addMarker("Ellipse", foo);
		this.markers[name] = segment;
		this._buildMarkerArray();
	},

	setMarkers:function(/*Object*/ obj){
		//	summary:
		//		Set all the markers of this theme at once.  obj should be a
		//		dictionary of keys and path segments.
		//
		//	example:
		//	|	myTheme.setMarkers({ "CIRCLE": foo });
		this.markers = obj;
		this._buildMarkerArray();
	},

	_buildMarkerArray: function(){
		this._markers = [];
		for(var p in this.markers){
			this._markers.push(this.markers[p]);
		}
	}
});

/*=====
dojox.charting.Theme.__DefineColorArgs = function(num, colors, hue, saturation, low, high, base, generator){
	//	summary:
	//		The arguments object that can be passed to define colors for a theme.
	//	num: Number?
	//		The number of colors to generate.  Defaults to 5.
	//	colors: String[]|dojo.Color[]?
	//		A pre-defined set of colors; this is passed through to the Theme directly.
	//	hue: Number?
	//		A hue to base the generated colors from (a number from 0 - 359).
	//	saturation: Number?
	//		If a hue is passed, this is used for the saturation value (0 - 100).
	//	low: Number?
	//		An optional value to determine the lowest value used to generate a color (HSV model)
	//	high: Number?
	//		An optional value to determine the highest value used to generate a color (HSV model)
	//	base: String|dojo.Color?
	//		A base color to use if we are defining colors using dojox.color.Palette
	//	generator: String?
	//		The generator function name from dojox.color.Palette.
	this.num = num;
	this.colors = colors;
	this.hue = hue;
	this.saturation = saturation;
	this.low = low;
	this.high = high;
	this.base = base;
	this.generator = generator;
}
=====*/
dojo.mixin(dojox.charting.Theme, {
	defaultMarkers: {
		CIRCLE:   "m-3,0 c0,-4 6,-4 6,0 m-6,0 c0,4 6,4 6,0",
		SQUARE:   "m-3,-3 l0,6 6,0 0,-6 z",
		DIAMOND:  "m0,-3 l3,3 -3,3 -3,-3 z",
		CROSS:    "m0,-3 l0,6 m-3,-3 l6,0",
		X:        "m-3,-3 l6,6 m0,-6 l-6,6",
		TRIANGLE: "m-3,3 l3,-6 3,6 z",
		TRIANGLE_INVERTED: "m-3,-3 l3,6 3,-6 z"
	},

	defaultColors:[
		// gray skies
		"#54544c", "#858e94", "#6e767a", "#948585", "#474747"
	],

	defaultTheme: {
		// all objects are structs used directly in dojox.gfx
		chart:{
			stroke: null,
			fill: "white",
			pageStyle: null,
			titleGap:		20,
			titlePos:		"top",
			titleFont:      "normal normal bold 14pt Tahoma",	// labels on axis
			titleFontColor: "#333"
		},
		plotarea:{
			stroke: null,
			fill: "white"
		},
		// TODO: label rotation on axis
		axis:{
			stroke:	{ // the axis itself
				color: "#333",
				width: 1
			},
			tick: {	// used as a foundation for all ticks
				color:     "#666",
				position:  "center",
				font:      "normal normal normal 7pt Tahoma",	// labels on axis
				fontColor: "#333",								// color of labels
				titleGap:  15,
				titleFont: "normal normal normal 11pt Tahoma",	// labels on axis
				titleFontColor: "#333",							// color of labels
				titleOrientation: "axis"						// "axis": facing the axis, "away": facing away
			},
			majorTick:	{ // major ticks on axis, and used for major gridlines
				width:  1,
				length: 6
			},
			minorTick:	{ // minor ticks on axis, and used for minor gridlines
				width:  0.8,
				length: 3
			},
			microTick:	{ // minor ticks on axis, and used for minor gridlines
				width:  0.5,
				length: 1
			}
		},
		series: {
			// used as a "main" theme for series, sThemes augment it
			stroke:  {width: 1.5, color: "#333"},		// line
			outline: {width: 0.1, color: "#ccc"},		// outline
			//shadow:  {dx: 1, dy: 1, width: 2, color: [0, 0, 0, 0.3]},
			shadow: null,								// no shadow
			fill:    "#ccc",							// fill, if appropriate
			font:    "normal normal normal 8pt Tahoma",	// if there's a label
			fontColor: "#000",							// color of labels
			labelWiring: {width: 1, color: "#ccc"}		// connect marker and target data item(slice, column, bar...)
		},
		marker: {	// any markers on a series
			stroke:  {width: 1.5, color: "#333"},		// stroke
			outline: {width: 0.1, color: "#ccc"},		// outline
			//shadow:  {dx: 1, dy: 1, width: 2, color: [0, 0, 0, 0.3]},
			shadow: null,								// no shadow
			fill:    "#ccc",							// fill if needed
			font:    "normal normal normal 8pt Tahoma",	// label
			fontColor: "#000"
		}
	},

	defineColors: function(kwArgs){
		//	summary:
		//		Generate a set of colors for the theme based on keyword
		//		arguments.
		//	kwArgs: dojox.charting.Theme.__DefineColorArgs
		//		The arguments object used to define colors.
		//	returns: dojo.Color[]
		//		An array of colors for use in a theme.
		//
		//	example:
		//	|	var colors = dojox.charting.Theme.defineColors({
		//	|		base: "#369",
		//	|		generator: "compound"
		//	|	});
		//
		//	example:
		//	|	var colors = dojox.charting.Theme.defineColors({
		//	|		hue: 60,
		//	|		saturation: 90,
		//	|		low: 30,
		//	|		high: 80
		//	|	});
		kwArgs = kwArgs || {};
		var c = [], n = kwArgs.num || 5;	// the number of colors to generate
		if(kwArgs.colors){
			// we have an array of colors predefined, so fix for the number of series.
			var l = kwArgs.colors.length;
			for(var i = 0; i < n; i++){
				c.push(kwArgs.colors[i % l]);
			}
			return c;	//	dojo.Color[]
		}
		if(kwArgs.hue){
			// single hue, generate a set based on brightness
			var s = kwArgs.saturation || 100;	// saturation
			var st = kwArgs.low || 30;
			var end = kwArgs.high || 90;
			// we'd like it to be a little on the darker side.
			var l = (end + st) / 2;
			// alternately, use "shades"
			return dojox.color.Palette.generate(
				dojox.color.fromHsv(kwArgs.hue, s, l), "monochromatic"
			).colors;
		}
		if(kwArgs.generator){
			//	pass a base color and the name of a generator
			return dojox.color.Palette.generate(kwArgs.base, kwArgs.generator).colors;
		}
		return c;	//	dojo.Color[]
	},
	
	generateGradient: function(fillPattern, colorFrom, colorTo){
		var fill = dojo.delegate(fillPattern);
		fill.colors = [
			{offset: 0, color: colorFrom},
			{offset: 1, color: colorTo}
		];
		return fill;
	},
	
	generateHslColor: function(color, luminance){
		color = new dojox.color.Color(color);
		var hsl    = color.toHsl(),
			result = dojox.color.fromHsl(hsl.h, hsl.s, luminance);
		result.a = color.a;	// add missing opacity
		return result;
	},

	generateHslGradient: function(color, fillPattern, lumFrom, lumTo){
		color = new dojox.color.Color(color);
		var hsl       = color.toHsl(),
			colorFrom = dojox.color.fromHsl(hsl.h, hsl.s, lumFrom),
			colorTo   = dojox.color.fromHsl(hsl.h, hsl.s, lumTo);
		colorFrom.a = colorTo.a = color.a;	// add missing opacity
		return dojox.charting.Theme.generateGradient(fillPattern, colorFrom, colorTo);	// Object
	}
});

}

if(!dojo._hasResource["dojox.charting.Series"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.Series"] = true;
dojo.provide("dojox.charting.Series");


/*=====
dojox.charting.__SeriesCtorArgs = function(plot){
	//	summary:
	//		An optional arguments object that can be used in the Series constructor.
	//	plot: String?
	//		The plot (by name) that this series belongs to.
	this.plot = plot;
}
=====*/
dojo.declare("dojox.charting.Series", dojox.charting.Element, {
	//	summary:
	//		An object representing a series of data for plotting on a chart.
	constructor: function(chart, data, kwArgs){
		//	summary:
		//		Create a new data series object for use within charting.
		//	chart: dojox.charting.Chart2D
		//		The chart that this series belongs to.
		//	data: Array|Object:
		//		The array of data points (either numbers or objects) that
		//		represents the data to be drawn. Or it can be an object. In
		//		the latter case, it should have a property "data" (an array),
		//		destroy(), and setSeriesObject().
		//	kwArgs: dojox.charting.__SeriesCtorArgs?
		//		An optional keyword arguments object to set details for this series.
		dojo.mixin(this, kwArgs);
		if(typeof this.plot != "string"){ this.plot = "default"; }
		this.update(data);
	},

	clear: function(){
		//	summary:
		//		Clear the calculated additional parameters set on this series.
		this.dyn = {};
	},
	
	update: function(data){
		//	summary:
		//		Set data and make this object dirty, so it can be redrawn.
		//	data: Array|Object:
		//		The array of data points (either numbers or objects) that
		//		represents the data to be drawn. Or it can be an object. In
		//		the latter case, it should have a property "data" (an array),
		//		destroy(), and setSeriesObject().
		if(dojo.isArray(data)){
			this.data = data;
		}else{
			this.source = data;
			this.data = this.source.data;
			if(this.source.setSeriesObject){
				this.source.setSeriesObject(this);
			}
		}
		this.dirty = true;
		this.clear();
	}
});

}

if(!dojo._hasResource["dojox.charting.Chart"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.Chart"] = true;
dojo.provide("dojox.charting.Chart");











/*=====
dojox.charting.__ChartCtorArgs = function(margins, stroke, fill, delayInMs){
	//	summary:
	//		The keyword arguments that can be passed in a Chart constructor.
	//
	//	margins: Object?
	//		Optional margins for the chart, in the form of { l, t, r, b}.
	//	stroke: dojox.gfx.Stroke?
	//		An optional outline/stroke for the chart.
	//	fill: dojox.gfx.Fill?
	//		An optional fill for the chart.
	//	delayInMs: Number
	//		Delay in ms for delayedRender(). Default: 200.
	this.margins = margins;
	this.stroke = stroke;
	this.fill = fill;
	this.delayInMs = delayInMs;
}
 =====*/
(function(){
	var df = dojox.lang.functional, dc = dojox.charting, g = dojox.gfx,
		clear = df.lambda("item.clear()"),
		purge = df.lambda("item.purgeGroup()"),
		destroy = df.lambda("item.destroy()"),
		makeClean = df.lambda("item.dirty = false"),
		makeDirty = df.lambda("item.dirty = true"),
		getName = df.lambda("item.name");

	dojo.declare("dojox.charting.Chart", null, {
		//	summary:
		//		The main chart object in dojox.charting.  This will create a two dimensional
		//		chart based on dojox.gfx.
		//
		//	description:
		//		dojox.charting.Chart is the primary object used for any kind of charts.  It
		//		is simple to create--just pass it a node reference, which is used as the
		//		container for the chart--and a set of optional keyword arguments and go.
		//
		//		Note that like most of dojox.gfx, most of dojox.charting.Chart's methods are
		//		designed to return a reference to the chart itself, to allow for functional
		//		chaining.  This makes defining everything on a Chart very easy to do.
		//
		//	example:
		//		Create an area chart, with smoothing.
		//	|	new dojox.charting.Chart(node))
		//	|		.addPlot("default", { type: "Areas", tension: "X" })
		//	|		.setTheme(dojox.charting.themes.Shrooms)
		//	|		.addSeries("Series A", [1, 2, 0.5, 1.5, 1, 2.8, 0.4])
		//	|		.addSeries("Series B", [2.6, 1.8, 2, 1, 1.4, 0.7, 2])
		//	|		.addSeries("Series C", [6.3, 1.8, 3, 0.5, 4.4, 2.7, 2])
		//	|		.render();
		//
		//	example:
		//		The form of data in a data series can take a number of forms: a simple array,
		//		an array of objects {x,y}, or something custom (as determined by the plot).
		//		Here's an example of a Candlestick chart, which expects an object of
		//		{ open, high, low, close }.
		//	|	new dojox.charting.Chart(node))
		//	|		.addPlot("default", {type: "Candlesticks", gap: 1})
		//	|		.addAxis("x", {fixLower: "major", fixUpper: "major", includeZero: true})
		//	|		.addAxis("y", {vertical: true, fixLower: "major", fixUpper: "major", natural: true})
		//	|		.addSeries("Series A", [
		//	|				{ open: 20, close: 16, high: 22, low: 8 },
		//	|				{ open: 16, close: 22, high: 26, low: 6, mid: 18 },
		//	|				{ open: 22, close: 18, high: 22, low: 11, mid: 21 },
		//	|				{ open: 18, close: 29, high: 32, low: 14, mid: 27 },
		//	|				{ open: 29, close: 24, high: 29, low: 13, mid: 27 },
		//	|				{ open: 24, close: 8, high: 24, low: 5 },
		//	|				{ open: 8, close: 16, high: 22, low: 2 },
		//	|				{ open: 16, close: 12, high: 19, low: 7 },
		//	|				{ open: 12, close: 20, high: 22, low: 8 },
		//	|				{ open: 20, close: 16, high: 22, low: 8 },
		//	|				{ open: 16, close: 22, high: 26, low: 6, mid: 18 },
		//	|				{ open: 22, close: 18, high: 22, low: 11, mid: 21 },
		//	|				{ open: 18, close: 29, high: 32, low: 14, mid: 27 },
		//	|				{ open: 29, close: 24, high: 29, low: 13, mid: 27 },
		//	|				{ open: 24, close: 8, high: 24, low: 5 },
		//	|				{ open: 8, close: 16, high: 22, low: 2 },
		//	|				{ open: 16, close: 12, high: 19, low: 7 },
		//	|				{ open: 12, close: 20, high: 22, low: 8 },
		//	|				{ open: 20, close: 16, high: 22, low: 8 },
		//	|				{ open: 16, close: 22, high: 26, low: 6 },
		//	|				{ open: 22, close: 18, high: 22, low: 11 },
		//	|				{ open: 18, close: 29, high: 32, low: 14 },
		//	|				{ open: 29, close: 24, high: 29, low: 13 },
		//	|				{ open: 24, close: 8, high: 24, low: 5 },
		//	|				{ open: 8, close: 16, high: 22, low: 2 },
		//	|				{ open: 16, close: 12, high: 19, low: 7 },
		//	|				{ open: 12, close: 20, high: 22, low: 8 },
		//	|				{ open: 20, close: 16, high: 22, low: 8 }
		//	|			],
		//	|			{ stroke: { color: "green" }, fill: "lightgreen" }
		//	|		)
		//	|		.render();
		//
		//	theme: dojox.charting.Theme?
		//		An optional theme to use for styling the chart.
		//	axes: dojox.charting.Axis{}?
		//		A map of axes for use in plotting a chart.
		//	stack: dojox.charting.plot2d.Base[]
		//		A stack of plotters.
		//	plots: dojox.charting.plot2d.Base{}
		//		A map of plotter indices
		//	series: dojox.charting.Series[]
		//		The stack of data runs used to create plots.
		//	runs: dojox.charting.Series{}
		//		A map of series indices
		//	margins: Object?
		//		The margins around the chart. Default is { l:10, t:10, r:10, b:10 }.
		//	stroke: dojox.gfx.Stroke?
		//		The outline of the chart (stroke in vector graphics terms).
		//	fill: dojox.gfx.Fill?
		//		The color for the chart.
		//	node: DOMNode
		//		The container node passed to the constructor.
		//	surface: dojox.gfx.Surface
		//		The main graphics surface upon which a chart is drawn.
		//	dirty: Boolean
		//		A boolean flag indicating whether or not the chart needs to be updated/re-rendered.
		//	coords: Object
		//		The coordinates on a page of the containing node, as returned from dojo.coords.

		constructor: function(/* DOMNode */node, /* dojox.charting.__ChartCtorArgs? */kwArgs){
			//	summary:
			//		The constructor for a new Chart.  Initializes all parameters used for a chart.
			//	returns: dojox.charting.Chart
			//		The newly created chart.

			// initialize parameters
			if(!kwArgs){ kwArgs = {}; }
			this.margins   = kwArgs.margins ? kwArgs.margins : {l: 10, t: 10, r: 10, b: 10};
			this.stroke    = kwArgs.stroke;
			this.fill      = kwArgs.fill;
			this.delayInMs = kwArgs.delayInMs || 200;
			this.title     = kwArgs.title;
			this.titleGap  = kwArgs.titleGap;
			this.titlePos  = kwArgs.titlePos;
			this.titleFont = kwArgs.titleFont;
			this.titleFontColor = kwArgs.titleFontColor;
			this.chartTitle = null;

			// default initialization
			this.theme = null;
			this.axes = {};		// map of axes
			this.stack = [];	// stack of plotters
			this.plots = {};	// map of plotter indices
			this.series = [];	// stack of data runs
			this.runs = {};		// map of data run indices
			this.dirty = true;
			this.coords = null;

			// create a surface
			this.node = dojo.byId(node);
			var box = dojo.marginBox(node);
			this.surface = g.createSurface(this.node, box.w || 400, box.h || 300);
		},
		destroy: function(){
			//	summary:
			//		Cleanup when a chart is to be destroyed.
			//	returns: void
			dojo.forEach(this.series, destroy);
			dojo.forEach(this.stack,  destroy);
			df.forIn(this.axes, destroy);
            if(this.chartTitle && this.chartTitle.tagName){
                // destroy title if it is a DOM node
			    dojo.destroy(this.chartTitle);
            }
			this.surface.destroy();
		},
		getCoords: function(){
			//	summary:
			//		Get the coordinates and dimensions of the containing DOMNode, as
			//		returned by dojo.coords.
			//	returns: Object
			//		The resulting coordinates of the chart.  See dojo.coords for details.
			if(!this.coords){
				this.coords = dojo.coords(this.node, true);
			}
			return this.coords;	//	Object
		},
		setTheme: function(theme){
			//	summary:
			//		Set a theme of the chart.
			//	theme: dojox.charting.Theme
			//		The theme to be used for visual rendering.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			this.theme = theme.clone();
			this.dirty = true;
			return this;	//	dojox.charting.Chart
		},
		addAxis: function(name, kwArgs){
			//	summary:
			//		Add an axis to the chart, for rendering.
			//	name: String
			//		The name of the axis.
			//	kwArgs: dojox.charting.axis2d.__AxisCtorArgs?
			//		An optional keyword arguments object for use in defining details of an axis.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
            var axis, axisType = kwArgs && kwArgs.type || "Default";
            if(typeof axisType == "string"){
                if(!dc.axis2d || !dc.axis2d[axisType]){
                    throw Error("Can't find axis: " + axisType + " - didn't you forget to dojo" + ".require() it?");
                }
                axis = new dc.axis2d[axisType](this, kwArgs);
            }else{
                axis = new axisType(this, kwArgs);
            }
			axis.name = name;
			axis.dirty = true;
			if(name in this.axes){
				this.axes[name].destroy();
			}
			this.axes[name] = axis;
			this.dirty = true;
			return this;	//	dojox.charting.Chart
		},
		getAxis: function(name){
			//	summary:
			//		Get the given axis, by name.
			//	name: String
			//		The name the axis was defined by.
			//	returns: dojox.charting.axis2d.Default
			//		The axis as stored in the chart's axis map.
			return this.axes[name];	//	dojox.charting.axis2d.Default
		},
		removeAxis: function(name){
			//	summary:
			//		Remove the axis that was defined using name.
			//	name: String
			//		The axis name, as defined in addAxis.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.axes){
				// destroy the axis
				this.axes[name].destroy();
				delete this.axes[name];
				// mark the chart as dirty
				this.dirty = true;
			}
			return this;	//	dojox.charting.Chart
		},
		addPlot: function(name, kwArgs){
			//	summary:
			//		Add a new plot to the chart, defined by name and using the optional keyword arguments object.
			//		Note that dojox.charting assumes the main plot to be called "default"; if you do not have
			//		a plot called "default" and attempt to add data series to the chart without specifying the
			//		plot to be rendered on, you WILL get errors.
			//	name: String
			//		The name of the plot to be added to the chart.  If you only plan on using one plot, call it "default".
			//	kwArgs: dojox.charting.plot2d.__PlotCtorArgs
			//		An object with optional parameters for the plot in question.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			var plot, plotType = kwArgs && kwArgs.type || "Default";
            if(typeof plotType == "string"){
                if(!dc.plot2d || !dc.plot2d[plotType]){
                    throw Error("Can't find plot: " + plotType + " - didn't you forget to dojo" + ".require() it?");
                }
                plot = new dc.plot2d[plotType](this, kwArgs);
            }else{
                plot = new plotType(this, kwArgs);
            }
			plot.name = name;
			plot.dirty = true;
			if(name in this.plots){
				this.stack[this.plots[name]].destroy();
				this.stack[this.plots[name]] = plot;
			}else{
				this.plots[name] = this.stack.length;
				this.stack.push(plot);
			}
			this.dirty = true;
			return this;	//	dojox.charting.Chart
		},
		removePlot: function(name){
			//	summary:
			//		Remove the plot defined using name from the chart's plot stack.
			//	name: String
			//		The name of the plot as defined using addPlot.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.plots){
				// get the index and remove the name
				var index = this.plots[name];
				delete this.plots[name];
				// destroy the plot
				this.stack[index].destroy();
				// remove the plot from the stack
				this.stack.splice(index, 1);
				// update indices to reflect the shift
				df.forIn(this.plots, function(idx, name, plots){
					if(idx > index){
						plots[name] = idx - 1;
					}
				});
                // remove all related series
                var ns = dojo.filter(this.series, function(run){ return run.plot != name; });
                if(ns.length < this.series.length){
                    // kill all removed series
                    dojo.forEach(this.series, function(run){
                        if(run.plot == name){
                            run.destroy();
                        }
                    });
                    // rebuild all necessary data structures
                    this.runs = {};
                    dojo.forEach(ns, function(run, index){
                        this.runs[run.plot] = index;
                    }, this);
                    this.series = ns;
                }
				// mark the chart as dirty
				this.dirty = true;
			}
			return this;	//	dojox.charting.Chart
		},
		getPlotOrder: function(){
			//	summary:
			//		Returns an array of plot names in the current order
			//		(the top-most plot is the first).
			//	returns: Array
			return df.map(this.stack, getName); // Array
		},
		setPlotOrder: function(newOrder){
			//	summary:
			//		Sets new order of plots. newOrder cannot add or remove
			//		plots. Wrong names, or dups are ignored.
			//	newOrder: Array:
			//		Array of plot names compatible with getPlotOrder().
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			var names = {},
				order = df.filter(newOrder, function(name){
					if(!(name in this.plots) || (name in names)){
						return false;
					}
					names[name] = 1;
					return true;
				}, this);
			if(order.length < this.stack.length){
				df.forEach(this.stack, function(plot){
					var name = plot.name;
					if(!(name in names)){
						order.push(name);
					}
				});
			}
			var newStack = df.map(order, function(name){
					return this.stack[this.plots[name]];
				}, this);
			df.forEach(newStack, function(plot, i){
				this.plots[plot.name] = i;
			}, this);
			this.stack = newStack;
			this.dirty = true;
			return this;	//	dojox.charting.Chart
		},
		movePlotToFront: function(name){
			//	summary:
			//		Moves a given plot to front.
			//	name: String:
			//		Plot's name to move.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.plots){
				var index = this.plots[name];
				if(index){
					var newOrder = this.getPlotOrder();
					newOrder.splice(index, 1);
					newOrder.unshift(name);
					return this.setPlotOrder(newOrder);	//	dojox.charting.Chart
				}
			}
			return this;	//	dojox.charting.Chart
		},
		movePlotToBack: function(name){
			//	summary:
			//		Moves a given plot to back.
			//	name: String:
			//		Plot's name to move.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.plots){
				var index = this.plots[name];
				if(index < this.stack.length - 1){
					var newOrder = this.getPlotOrder();
					newOrder.splice(index, 1);
					newOrder.push(name);
					return this.setPlotOrder(newOrder);	//	dojox.charting.Chart
				}
			}
			return this;	//	dojox.charting.Chart
		},
		addSeries: function(name, data, kwArgs){
			//	summary:
			//		Add a data series to the chart for rendering.
			//	name: String:
			//		The name of the data series to be plotted.
			//	data: Array|Object:
			//		The array of data points (either numbers or objects) that
			//		represents the data to be drawn. Or it can be an object. In
			//		the latter case, it should have a property "data" (an array),
			//		destroy(), and setSeriesObject().
			//	kwArgs: dojox.charting.__SeriesCtorArgs?:
			//		An optional keyword arguments object that will be mixed into
			//		the resultant series object.
			//	returns: dojox.charting.Chart:
			//		A reference to the current chart for functional chaining.
			var run = new dc.Series(this, data, kwArgs);
			run.name = name;
			if(name in this.runs){
				this.series[this.runs[name]].destroy();
				this.series[this.runs[name]] = run;
			}else{
				this.runs[name] = this.series.length;
				this.series.push(run);
			}
			this.dirty = true;
			// fix min/max
			if(!("ymin" in run) && "min" in run){ run.ymin = run.min; }
			if(!("ymax" in run) && "max" in run){ run.ymax = run.max; }
			return this;	//	dojox.charting.Chart
		},
		removeSeries: function(name){
			//	summary:
			//		Remove the series defined by name from the chart.
			//	name: String
			//		The name of the series as defined by addSeries.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.runs){
				// get the index and remove the name
				var index = this.runs[name];
				delete this.runs[name];
				// destroy the run
				this.series[index].destroy();
				// remove the run from the stack of series
				this.series.splice(index, 1);
				// update indices to reflect the shift
				df.forIn(this.runs, function(idx, name, runs){
					if(idx > index){
						runs[name] = idx - 1;
					}
				});
				this.dirty = true;
			}
			return this;	//	dojox.charting.Chart
		},
		updateSeries: function(name, data){
			//	summary:
			//		Update the given series with a new set of data points.
			//	name: String
			//		The name of the series as defined in addSeries.
			//	data: Array|Object:
			//		The array of data points (either numbers or objects) that
			//		represents the data to be drawn. Or it can be an object. In
			//		the latter case, it should have a property "data" (an array),
			//		destroy(), and setSeriesObject().
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.runs){
				var run = this.series[this.runs[name]];
				run.update(data);
				this._invalidateDependentPlots(run.plot, false);
				this._invalidateDependentPlots(run.plot, true);
			}
			return this;	//	dojox.charting.Chart
		},
		getSeriesOrder: function(plotName){
			//	summary:
			//		Returns an array of series names in the current order
			//		(the top-most series is the first) within a plot.
			//	plotName: String:
			//		Plot's name.
			//	returns: Array
			return df.map(df.filter(this.series, function(run){
					return run.plot == plotName;
				}), getName);
		},
		setSeriesOrder: function(newOrder){
			//	summary:
			//		Sets new order of series within a plot. newOrder cannot add
			//		or remove series. Wrong names, or dups are ignored.
			//	newOrder: Array:
			//		Array of series names compatible with getPlotOrder(). All
			//		series should belong to the same plot.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			var plotName, names = {},
				order = df.filter(newOrder, function(name){
					if(!(name in this.runs) || (name in names)){
						return false;
					}
					var run = this.series[this.runs[name]];
					if(plotName){
						if(run.plot != plotName){
							return false;
						}
					}else{
						plotName = run.plot;
					}
					names[name] = 1;
					return true;
				}, this);
			df.forEach(this.series, function(run){
				var name = run.name;
				if(!(name in names) && run.plot == plotName){
					order.push(name);
				}
			});
			var newSeries = df.map(order, function(name){
					return this.series[this.runs[name]];
				}, this);
			this.series = newSeries.concat(df.filter(this.series, function(run){
				return run.plot != plotName;
			}));
			df.forEach(this.series, function(run, i){
				this.runs[run.name] = i;
			}, this);
			this.dirty = true;
			return this;	//	dojox.charting.Chart
		},
		moveSeriesToFront: function(name){
			//	summary:
			//		Moves a given series to front of a plot.
			//	name: String:
			//		Series' name to move.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.runs){
				var index = this.runs[name],
					newOrder = this.getSeriesOrder(this.series[index].plot);
				if(name != newOrder[0]){
					newOrder.splice(index, 1);
					newOrder.unshift(name);
					return this.setSeriesOrder(newOrder);	//	dojox.charting.Chart
				}
			}
			return this;	//	dojox.charting.Chart
		},
		moveSeriesToBack: function(name){
			//	summary:
			//		Moves a given series to back of a plot.
			//	name: String:
			//		Series' name to move.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.runs){
				var index = this.runs[name],
					newOrder = this.getSeriesOrder(this.series[index].plot);
				if(name != newOrder[newOrder.length - 1]){
					newOrder.splice(index, 1);
					newOrder.push(name);
					return this.setSeriesOrder(newOrder);	//	dojox.charting.Chart
				}
			}
			return this;	//	dojox.charting.Chart
		},
		resize: function(width, height){
			//	summary:
			//		Resize the chart to the dimensions of width and height.
			//	description:
			//		Resize the chart and its surface to the width and height dimensions.
			//		If no width/height or box is provided, resize the surface to the marginBox of the chart.
			//	width: Number
			//		The new width of the chart.
			//	height: Number
			//		The new height of the chart.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			var box;
			switch(arguments.length){
				// case 0, do not resize the div, just the surface
				case 1:
					// argument, override node box
					box = dojo.mixin({}, width);
					dojo.marginBox(this.node, box);
					break;
				case 2:
					box = {w: width, h: height};
					// argument, override node box
					dojo.marginBox(this.node, box);
					break;
			}
			// in all cases take back the computed box
			box = dojo.marginBox(this.node);
			// and set it on the surface
			this.surface.setDimensions(box.w, box.h);
			this.dirty = true;
			this.coords = null;
			return this.render();	//	dojox.charting.Chart
		},
		getGeometry: function(){
			//	summary:
			//		Returns a map of information about all axes in a chart and what they represent
			//		in terms of scaling (see dojox.charting.axis2d.Default.getScaler).
			//	returns: Object
			//		An map of geometry objects, a one-to-one mapping of axes.
			var ret = {};
			df.forIn(this.axes, function(axis){
				if(axis.initialized()){
					ret[axis.name] = {
						name:		axis.name,
						vertical:	axis.vertical,
						scaler:		axis.scaler,
						ticks:		axis.ticks
					};
				}
			});
			return ret;	//	Object
		},
		setAxisWindow: function(name, scale, offset, zoom){
			//	summary:
			//		Zooms an axis and all dependent plots. Can be used to zoom in 1D.
			//	name: String
			//		The name of the axis as defined by addAxis.
			//	scale: Number
			//		The scale on the target axis.
			//	offset: Number
			//		Any offest, as measured by axis tick
			//	zoom: Boolean|Object?
			//		The chart zooming animation trigger.  This is null by default,
			//		e.g. {duration: 1200}, or just set true.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			var axis = this.axes[name];
			if(axis){
				axis.setWindow(scale, offset);
				dojo.forEach(this.stack,function(plot){
					if(plot.hAxis == name || plot.vAxis == name){
						plot.zoom = zoom;
					}
				})
			}
			return this;	//	dojox.charting.Chart
		},
		setWindow: function(sx, sy, dx, dy, zoom){
			//	summary:
			//		Zooms in or out any plots in two dimensions.
			//	sx: Number
			//		The scale for the x axis.
			//	sy: Number
			//		The scale for the y axis.
			//	dx: Number
			//		The pixel offset on the x axis.
			//	dy: Number
			//		The pixel offset on the y axis.
			//	zoom: Boolean|Object?
			//		The chart zooming animation trigger.  This is null by default,
			//		e.g. {duration: 1200}, or just set true.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(!("plotArea" in this)){
				this.calculateGeometry();
			}
			df.forIn(this.axes, function(axis){
				var scale, offset, bounds = axis.getScaler().bounds,
					s = bounds.span / (bounds.upper - bounds.lower);
				if(axis.vertical){
					scale  = sy;
					offset = dy / s / scale;
				}else{
					scale  = sx;
					offset = dx / s / scale;
				}
				axis.setWindow(scale, offset);
			});
			dojo.forEach(this.stack, function(plot){ plot.zoom = zoom; });
			return this;	//	dojox.charting.Chart
		},
		zoomIn:	function(name, range){
			//	summary:
			//		Zoom the chart to a specific range on one axis.  This calls render()
			//		directly as a convenience method.
			//	name: String
			//		The name of the axis as defined by addAxis.
			//	range: Array
			//		The end points of the zoom range, measured in axis ticks.
			var axis = this.axes[name];
			if(axis){
				var scale, offset, bounds = axis.getScaler().bounds;
				var lower = Math.min(range[0],range[1]);
				var upper = Math.max(range[0],range[1]);
				lower = range[0] < bounds.lower ? bounds.lower : lower;
				upper = range[1] > bounds.upper ? bounds.upper : upper;
				scale = (bounds.upper - bounds.lower) / (upper - lower);
				offset = lower - bounds.lower;
				this.setAxisWindow(name, scale, offset);
				this.render();
			}
		},
		calculateGeometry: function(){
			//	summary:
			//		Calculate the geometry of the chart based on the defined axes of
			//		a chart.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(this.dirty){
				return this.fullGeometry();
			}

			// calculate geometry
			var dirty = dojo.filter(this.stack, function(plot){
					return plot.dirty ||
						(plot.hAxis && this.axes[plot.hAxis].dirty) ||
						(plot.vAxis && this.axes[plot.vAxis].dirty);
				}, this);
			calculateAxes(dirty, this.plotArea);

			return this;	//	dojox.charting.Chart
		},
		fullGeometry: function(){
			//	summary:
			//		Calculate the full geometry of the chart.  This includes passing
			//		over all major elements of a chart (plots, axes, series, container)
			//		in order to ensure proper rendering.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			this._makeDirty();

			// clear old values
			dojo.forEach(this.stack, clear);

			// rebuild new connections, and add defaults

			// set up a theme
			if(!this.theme){
				this.setTheme(new dojox.charting.Theme(dojox.charting._def));
			}

			// assign series
			dojo.forEach(this.series, function(run){
				if(!(run.plot in this.plots)){
                    if(!dc.plot2d || !dc.plot2d.Default){
                        throw Error("Can't find plot: Default - didn't you forget to dojo" + ".require() it?");
                    }
					var plot = new dc.plot2d.Default(this, {});
					plot.name = run.plot;
					this.plots[run.plot] = this.stack.length;
					this.stack.push(plot);
				}
				this.stack[this.plots[run.plot]].addSeries(run);
			}, this);
			// assign axes
			dojo.forEach(this.stack, function(plot){
				if(plot.hAxis){
					plot.setAxis(this.axes[plot.hAxis]);
				}
				if(plot.vAxis){
					plot.setAxis(this.axes[plot.vAxis]);
				}
			}, this);

			// calculate geometry

			// 1st pass
			var dim = this.dim = this.surface.getDimensions();
			dim.width  = g.normalizedLength(dim.width);
			dim.height = g.normalizedLength(dim.height);
			df.forIn(this.axes, clear);
			calculateAxes(this.stack, dim);

			// assumption: we don't have stacked axes yet
			var offsets = this.offsets = { l: 0, r: 0, t: 0, b: 0 };
			df.forIn(this.axes, function(axis){
				df.forIn(axis.getOffsets(), function(o, i){ offsets[i] += o; });
			});
			// add title area
			if(this.title){
				this.titleGap = (this.titleGap==0) ? 0 : this.titleGap || this.theme.chart.titleGap || 20;
				this.titlePos = this.titlePos || this.theme.chart.titlePos || "top";
				this.titleFont = this.titleFont || this.theme.chart.titleFont;
				this.titleFontColor = this.titleFontColor || this.theme.chart.titleFontColor || "black";
				var tsize = g.normalizedLength(g.splitFontString(this.titleFont).size);
				offsets[this.titlePos=="top" ? "t":"b"] += (tsize + this.titleGap);
			}
			// add margins
			df.forIn(this.margins, function(o, i){ offsets[i] += o; });

			// 2nd pass with realistic dimensions
			this.plotArea = {
				width: dim.width - offsets.l - offsets.r,
				height: dim.height - offsets.t - offsets.b
			};
			df.forIn(this.axes, clear);
			calculateAxes(this.stack, this.plotArea);

			return this;	//	dojox.charting.Chart
		},
		render: function(){
			//	summary:
			//		Render the chart according to the current information defined.  This should
			//		be the last call made when defining/creating a chart, or if data within the
			//		chart has been changed.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(this.theme){
				this.theme.clear();
			}

			if(this.dirty){
				return this.fullRender();
			}

			this.calculateGeometry();

			// go over the stack backwards
			df.forEachRev(this.stack, function(plot){ plot.render(this.dim, this.offsets); }, this);

			// go over axes
			df.forIn(this.axes, function(axis){ axis.render(this.dim, this.offsets); }, this);

			this._makeClean();

			// BEGIN FOR HTML CANVAS
			if(this.surface.render){ this.surface.render(); };
			// END FOR HTML CANVAS

			return this;	//	dojox.charting.Chart
		},
		fullRender: function(){
			//	summary:
			//		Force a full rendering of the chart, including full resets on the chart itself.
			//		You should not call this method directly unless absolutely necessary.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.

			// calculate geometry
			this.fullGeometry();
			var offsets = this.offsets, dim = this.dim, rect;

			// get required colors
			//var requiredColors = df.foldl(this.stack, "z + plot.getRequiredColors()", 0);
			//this.theme.defineColors({num: requiredColors, cache: false});

			// clear old shapes
			dojo.forEach(this.series, purge);
			df.forIn(this.axes, purge);
			dojo.forEach(this.stack,  purge);
            if(this.chartTitle && this.chartTitle.tagName){
                // destroy title if it is a DOM node
			    dojo.destroy(this.chartTitle);
            }
			this.surface.clear();
            this.chartTitle = null;

			// generate shapes

			// draw a plot background
			var t = this.theme,
				fill   = t.plotarea && t.plotarea.fill,
				stroke = t.plotarea && t.plotarea.stroke,
				rect = {
					x: offsets.l - 1, y: offsets.t - 1,
					width:  dim.width  - offsets.l - offsets.r + 2,
					height: dim.height - offsets.t - offsets.b + 2
				};
			if(fill){
				fill = dc.Element.prototype._shapeFill(dc.Element.prototype._plotFill(fill, dim, offsets), rect);
				this.surface.createRect(rect).setFill(fill);
			}
			if(stroke){
				this.surface.createRect({
					x: offsets.l, y: offsets.t,
					width:  dim.width  - offsets.l - offsets.r + 1,
					height: dim.height - offsets.t - offsets.b + 1
				}).setStroke(stroke);
			}

			// go over the stack backwards
			df.foldr(this.stack, function(z, plot){ return plot.render(dim, offsets), 0; }, 0);

			// pseudo-clipping: matting
			fill   = this.fill   !== undefined ? this.fill   : (t.chart && t.chart.fill);
			stroke = this.stroke !== undefined ? this.stroke : (t.chart && t.chart.stroke);

			//	TRT: support for "inherit" as a named value in a theme.
			if(fill == "inherit"){
				//	find the background color of the nearest ancestor node, and use that explicitly.
				var node = this.node, fill = new dojo.Color(dojo.style(node, "backgroundColor"));
				while(fill.a==0 && node!=document.documentElement){
					fill = new dojo.Color(dojo.style(node, "backgroundColor"));
					node = node.parentNode;
				}
			}

			if(fill){
				fill = dc.Element.prototype._plotFill(fill, dim, offsets);
				if(offsets.l){	// left
					rect = {
						width:  offsets.l,
						height: dim.height + 1
					};
					this.surface.createRect(rect).setFill(dc.Element.prototype._shapeFill(fill, rect));
				}
				if(offsets.r){	// right
					rect = {
						x: dim.width - offsets.r,
						width:  offsets.r + 1,
						height: dim.height + 2
					};
					this.surface.createRect(rect).setFill(dc.Element.prototype._shapeFill(fill, rect));
				}
				if(offsets.t){	// top
					rect = {
						width:  dim.width + 1,
						height: offsets.t
					};
					this.surface.createRect(rect).setFill(dc.Element.prototype._shapeFill(fill, rect));
				}
				if(offsets.b){	// bottom
					rect = {
						y: dim.height - offsets.b,
						width:  dim.width + 1,
						height: offsets.b + 2
					};
					this.surface.createRect(rect).setFill(dc.Element.prototype._shapeFill(fill, rect));
				}
			}
			if(stroke){
				this.surface.createRect({
					width:  dim.width - 1,
					height: dim.height - 1
				}).setStroke(stroke);
			}

			//create title: Whether to make chart title as a widget which extends dojox.charting.Element?
			if(this.title){
				var forceHtmlLabels = (g.renderer == "canvas"),
					labelType = forceHtmlLabels || !dojo.isIE && !dojo.isOpera ? "html" : "gfx",
					tsize = g.normalizedLength(g.splitFontString(this.titleFont).size);
				this.chartTitle = dc.axis2d.common.createText[labelType](
					this,
					this.surface,
					dim.width/2,
					this.titlePos=="top" ? tsize + this.margins.t : dim.height - this.margins.b,
					"middle",
					this.title,
					this.titleFont,
					this.titleFontColor
				);
			}

			// go over axes
			df.forIn(this.axes, function(axis){ axis.render(dim, offsets); });

			this._makeClean();

			// BEGIN FOR HTML CANVAS
			if(this.surface.render){ this.surface.render(); };
			// END FOR HTML CANVAS

			return this;	//	dojox.charting.Chart
		},
		delayedRender: function(){
			//	summary:
			//		Delayed render, which is used to collect multiple updates
			//		within a delayInMs time window.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.

			if(!this._delayedRenderHandle){
				this._delayedRenderHandle = setTimeout(
					dojo.hitch(this, function(){
						clearTimeout(this._delayedRenderHandle);
						this._delayedRenderHandle = null;
						this.render();
					}),
					this.delayInMs
				);
			}

			return this;	//	dojox.charting.Chart
		},
		connectToPlot: function(name, object, method){
			//	summary:
			//		A convenience method to connect a function to a plot.
			//	name: String
			//		The name of the plot as defined by addPlot.
			//	object: Object
			//		The object to be connected.
			//	method: Function
			//		The function to be executed.
			//	returns: Array
			//		A handle to the connection, as defined by dojo.connect (see dojo.connect).
			return name in this.plots ? this.stack[this.plots[name]].connect(object, method) : null;	//	Array
		},
		fireEvent: function(seriesName, eventName, index){
			//	summary:
			//		Fires a synthetic event for a series item.
			//	seriesName: String:
			//		Series name.
			//	eventName: String:
			//		Event name to simulate: onmouseover, onmouseout, onclick.
			//	index: Number:
			//		Valid data value index for the event.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(seriesName in this.runs){
				var plotName = this.series[this.runs[seriesName]].plot;
				if(plotName in this.plots){
					var plot = this.stack[this.plots[plotName]];
					if(plot){
						plot.fireEvent(seriesName, eventName, index);
					}
				}
			}
			return this;	//	dojox.charting.Chart
		},
		_makeClean: function(){
			// reset dirty flags
			dojo.forEach(this.axes,   makeClean);
			dojo.forEach(this.stack,  makeClean);
			dojo.forEach(this.series, makeClean);
			this.dirty = false;
		},
		_makeDirty: function(){
			// reset dirty flags
			dojo.forEach(this.axes,   makeDirty);
			dojo.forEach(this.stack,  makeDirty);
			dojo.forEach(this.series, makeDirty);
			this.dirty = true;
		},
		_invalidateDependentPlots: function(plotName, /* Boolean */ verticalAxis){
			if(plotName in this.plots){
				var plot = this.stack[this.plots[plotName]], axis,
					axisName = verticalAxis ? "vAxis" : "hAxis";
				if(plot[axisName]){
					axis = this.axes[plot[axisName]];
					if(axis && axis.dependOnData()){
						axis.dirty = true;
						// find all plots and mark them dirty
						dojo.forEach(this.stack, function(p){
							if(p[axisName] && p[axisName] == plot[axisName]){
								p.dirty = true;
							}
						});
					}
				}else{
					plot.dirty = true;
				}
			}
		}
	});

	function hSection(stats){
		return {min: stats.hmin, max: stats.hmax};
	}

	function vSection(stats){
		return {min: stats.vmin, max: stats.vmax};
	}

	function hReplace(stats, h){
		stats.hmin = h.min;
		stats.hmax = h.max;
	}

	function vReplace(stats, v){
		stats.vmin = v.min;
		stats.vmax = v.max;
	}

	function combineStats(target, source){
		if(target && source){
			target.min = Math.min(target.min, source.min);
			target.max = Math.max(target.max, source.max);
		}
		return target || source;
	}

	function calculateAxes(stack, plotArea){
		var plots = {}, axes = {};
		dojo.forEach(stack, function(plot){
			var stats = plots[plot.name] = plot.getSeriesStats();
			if(plot.hAxis){
				axes[plot.hAxis] = combineStats(axes[plot.hAxis], hSection(stats));
			}
			if(plot.vAxis){
				axes[plot.vAxis] = combineStats(axes[plot.vAxis], vSection(stats));
			}
		});
		dojo.forEach(stack, function(plot){
			var stats = plots[plot.name];
			if(plot.hAxis){
				hReplace(stats, axes[plot.hAxis]);
			}
			if(plot.vAxis){
				vReplace(stats, axes[plot.vAxis]);
			}
			plot.initializeScalers(plotArea, stats);
		});
	}
})();

}

if(!dojo._hasResource["dojox.charting.Chart2D"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.charting.Chart2D"] = true;
dojo.provide("dojox.charting.Chart2D");

dojo.deprecated("dojox.charting.Chart2D", "Use dojo.charting.Chart instead and require all other components explicitly", "2.0");

// require all axes to support references by name



// require all plots to support references by name






















// require the main file


dojox.charting.Chart2D = dojox.charting.Chart;

}


dojo.i18n._preloadLocalizations("dojo.nls.jbrowse_dojo", ["ROOT","ar","ca","cs","da","de","de-de","el","en","en-gb","en-us","es","es-es","fi","fi-fi","fr","fr-fr","he","he-il","hu","it","it-it","ja","ja-jp","ko","ko-kr","nb","nl","nl-nl","pl","pt","pt-br","pt-pt","ru","sk","sl","sv","th","tr","xx","zh","zh-cn","zh-tw"]);
