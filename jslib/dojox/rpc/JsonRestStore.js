if(!dojo._hasResource["dojox.data.JsonRestStore"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.data.JsonRestStore"] = true;
dojo.provide("dojox.data.JsonRestStore");
dojo.require("dojox.rpc.Rest"); 
dojo.require("dojox.rpc.JsonReferencing"); // TODO: Make it work without this dependency

// A JsonRestStore takes a REST service and uses it the remote communication for a 
// read/write dojo.data implementation. To use a JsonRestStore you should create a 
// service with a REST transport. This can be configured with an SMD:
//{
//    services: {
//        jsonRestStore: {
//			transport: "REST",
//			envelope: "URL",
//                    target: "store.php",
//					contentType:"application/json",
//                    parameters: [
//                            {name: "location", type: "string", optional: true}
//                    ]
//            }
//    }
//}
// The SMD can then be used to create service, and the service can be passed to a JsonRestStore. For example:
// var myServices = new dojox.rpc.Service(dojo.moduleUrl("dojox.rpc.tests.resources", "test.smd"));
// var jsonStore = new dojox.data.JsonRestStore({service:myServices.jsonRestStore});
// 
// The JsonRestStore will then cause all saved modifications to be server using Rest commands (PUT, POST, or DELETE).
// The JsonRestStore also supports lazy loading. References can be made to objects that have not been loaded.
//  For example if a service returned:
// {"name":"Example","lazyLoadedObject":{"$ref":"obj2"}}
//
// And this object has accessed using the dojo.data API:
// var obj = jsonStore.getValue(myObject,"lazyLoadedObject");
// The object would automatically be requested from the server (with an object id of "obj2").
//
// When using a Rest store on a public network, it is important to implement proper security measures to 
// control access to resources

dojox.data.ASYNC_MODE = 0;
dojox.data.SYNC_MODE = 1;
dojo.declare("dojox.data.JsonRestStore",
	null,
	{
		mode: dojox.data.ASYNC_MODE,
		constructor: function(options){
			//summary:
			//	JsonRestStore constructor, instantiate a new JsonRestStore 
			// A JsonRestStore can be configured from a JSON Schema. Queries are just 
			// passed through as URLs for XHR requests, 
			// so there is nothing to configure, just plug n play.
			// Of course there are some options to fiddle with if you want:
			//  
			// jsonSchema: /* object */
			// 
			// service: /* function */
			// This is the service object that is used to retrieve lazy data and save results 
			// The function should be directly callable with a single parameter of an object id to be loaded
			// The function should also have the following methods:
			// put(id,value) - puts the value at the given id
			// post(id,value) - posts (appends) the value at the given id
			// delete(id) - deletes the value corresponding to the given id		
			// 
			//	idAttribute: /* string */
			//		Defaults to 'id'. The name of the attribute that holds an objects id.
			//		This can be a preexisting id provided by the server.  
			//		If an ID isn't already provided when an object
			//		is fetched or added to the store, the autoIdentity system
			//		will generate an id for it and add it to the index. 

			//	mode: dojox.data.ASYNC_MODE || dojox.data.SYNC_MODE
			//		Defaults to ASYNC_MODE.  This option sets the default mode for this store.
			//		Sync calls return their data immediately from the calling function
			//		instead of calling the callback functions.  Functions such as 
			//		fetchItemByIdentity() and fetch() both accept a string parameter in addtion
			//		to the normal keywordArgs parameter.  When passed this option, SYNC_MODE will
			//		automatically be used even when the default mode of the system is ASYNC_MODE.
			//		A normal request to fetch or fetchItemByIdentity (with kwArgs object) can also 
			//		include a mode property to override this setting for that one request.

			//setup a byId alias to the api call	
			this.byId=this.fetchItemByIdentity;
			// if the advanced json parser is enabled, we can pass through object updates as onSet events
			dojo.connect(dojox.rpc,"onUpdate",this,function(obj,attrName,oldValue,newValue){
				var prefix = this.service.serviceName + '/';
				if (!obj._id){
					console.log("no id on updated object ", obj);
				}
				else if (obj._id.substring(0,prefix.length) == prefix)
					this.onSet(obj,attrName,oldValue,newValue);
				});
			if (options){
				dojo.mixin(this,options);
			}
			if (!this.service)
				throw Error("A service is required for JsonRestStore");
			if (!(this.service.contentType + '').match(/application\/json/))
				throw Error("A service must use a contentType of 'application/json' in order to be used in a JsonRestStore");
			this.idAttribute = (this.service._schema && this.service._schema._idAttr) || 'id';
			var arrayModifyingMethodNames = ["splice","push","pop","unshift","shift","reverse","sort"];
			this._arrayModifyingMethods = {};
			var array = [];
			var _this = this;
			// setup array augmentation, for catching mods and setting arrays as dirty
			for (var i = 0; i < arrayModifyingMethodNames.length; i++){
				(function(key){ // closure for the method to be bound correctly
					var method = array[key];
					_this._arrayModifyingMethods[key] = function(){
						_this._setDirty(this); // set the array as dirty before the native modifying operation
						return method.apply(this,arguments);
					}
					_this._arrayModifyingMethods[key]._augmented = 1;
				})(arrayModifyingMethodNames[i]);
			}
			this._deletedItems=[];
			this._dirtyItems=[];
			//given a url, load json data from as the store
		},

		_loadById: function(id,callback){
			var slashIndex = id.indexOf('/');
			var serviceName = id.substring(0,slashIndex);
			var id = id.substring(slashIndex + 1);
			(this.service.serviceName == serviceName ? 
					this.service : // use the current service if it is the right one 
					dojox.rpc.services[serviceName])(id) // otherwise call by looking up the service 
					.addCallback(callback);
		},
		getValue: function(item, property,lazyCallback){
			// summary:
			//	Gets the value of an item's 'property'
			//
			//	item: /* object */
			//	property: /* string */
			//		property to look up value for	
			// lazyCallback: /* function*/ 
			// 		not part of the API, but if you are using lazy loading properties, you may provide a callback to resume, in order to have asynchronous loading
			var value = item[property]; 
			if (value && value.$ref){
				dojox.rpc._sync = !lazyCallback; // tell the service to operate synchronously (I have some concerns about the "thread" safety with FF3, as I think it does event stacking on sync calls) 
				this._loadById((value && value._id) || (item._id + '.' + property),lazyCallback);
				delete dojox.rpc._sync; // revert to normal async behavior
			} else if (lazyCallback){lazyCallback(value);}
			return value;
		},

		getValues: function(item, property){
			// summary:
			//	Gets the value of an item's 'property' and returns
			//	it.  If this value is an array it is just returned,
			//	if not, the value is added to an array and that is returned.
			//
			//	item: /* object */
			//	property: /* string */
			//		property to look up value for	
	
			var val = this.getValue(item,property);
			return dojo.isArray(val) ? val : [val];
		},

		getAttributes: function(item){
			// summary:
			//	Gets the available attributes of an item's 'property' and returns
			//	it as an array. 
			//
			//	item: /* object */

			var res = [];
			for (var i in item){
				res.push(i);
			}
			return res;
		},

		hasAttribute: function(item,attribute){
			// summary:
			//	Checks to see if item has attribute
			//
			//	item: /* object */
			//	attribute: /* string */
			return attribute in item;		
		},

		containsValue: function(item, attribute, value){
			// summary:
			//	Checks to see if 'item' has 'value' at 'attribute'
			//
			//	item: /* object */
			//	attribute: /* string */
			//	value: /* anything */
			return getValue(item,attribute)==value;
		},


		isItem: function(item){
			// summary:
			//	Checks to see if a passed 'item'
			//	is really a JsonRestStore item.  
			//
			//	item: /* object */
			//	attribute: /* string */
		
			return !!(dojo.isObject(item) && item._id); 
		},

		isItemLoaded: function(item){
			// summary:
			//	returns isItem() :)
			//
			//	item: /* object */

			return !item.$ref;
		},

		loadItem: function(item){
			// summary:
			// Loads an item that has not been loaded yet. Lazy loading should happen through getValue, and if used properly, this should never need to be called
			//	returns true. Note this does not work with lazy loaded primitives!
			if (item.$ref){
				dojox.rpc._sync = true; // tell the service to operate synchronously 
				this._loadById(item._id)
				delete dojox.rpc._sync; // revert to normal async behavior
			}
			 
			return true;
		},

		_walk : function(value,forEach){
			// walk the graph, avoiding duplication
				var walked=[];
				function walk(value){
					if (value && typeof value == 'object' && !value.__walked){
						value.__walked = true;
						walked.push(value);
						for (var i in value){
							if (walk(value[i])){
								forEach(value,i,value[i]);
							}
						}
						return true;
					}
				}
				walk(value);
				forEach({},null,value);
				for (var i = 0; i < walked.length;i++)
					delete walked[i].__walked;
		},
		fetch: function(args){
			//console.log("fetch() ", args);
			// summary
			//	
			//	fetch takes either a string argument or a keywordArgs
			//	object containing the parameters for the search.
			//	If passed a string, fetch will interpret this string
			//	as the query to be performed and will do so in 
			//	SYNC_MODE returning the results immediately.
			//	If an object is supplied as 'args', its options will be 
			// 	parsed and then contained query executed. 
			//
			//	query: /* string or object */
			//		Defaults to "". This is basically passed to the XHR request as the URL to get the data
			//
			//	start: /* int */
			//		Starting item in result set
			//
			//	count: /* int */
			//		Maximum number of items to return
			//
			// cache: /* boolean */
			//
			//	sort: /* function */
			//		Not Implemented yet
			//
			//	The following only apply to ASYNC requests (the default)
			//
			//	onBegin: /* function */
			//		called before any results are returned. Parameters
			//		will be the count and the original fetch request
			//	
			//	onItem: /*function*/
			//		called for each returned item.  Parameters will be
			//		the item and the fetch request
			//
			//	onComplete: /* function */
			//		called on completion of the request.  Parameters will	
			//		be the complete result set and the request
			//
			//	onError: /* function */
			//		colled in the event of an error

			if(dojo.isString(args)){
					query = args;
					args={query: query, mode: dojox.data.SYNC_MODE};
					
			}

			var query;
			if (!args || !args.query){
				if (!args){
					var args={};	
				}

				if (!args.query){
					args.query="";
					query=args.query;
				}

			}

			if (dojo.isObject(args.query)){
				if (args.query.query){
					query = args.query.query;
				}else{
					query = args.query = "";
				}
				if (args.query.queryOptions){
					args.queryOptions=args.query.queryOptions
				}
			}else{
				query=args.query;
			}
			if (args.start || args.count){
				query += '[' + (args.start ? args.start : '') + ':' + (args.count ? ((args.start || 0) + args.count) : '') + ']';  
			}
			var results = dojox.rpc._index[this.service.serviceName + '/' + query];
			if (!args.mode){args.mode = this.mode;}
			var _this = this;
			var defResult;
			dojox.rpc._sync = this.mode;
			dojox._newId = query;
			if (results && !("cache" in args && !args.cache)){ // TODO: Add TTL maybe?
				defResult = new dojo.Deferred;
				defResult.callback(results); 
			}
			else {
				defResult = this.service(query);
			}
			defResult.addCallback(function(results){
				delete dojox._newId; // cleanup				
				if (args.onBegin){	
					args["onBegin"].call(_this, results.length, args);
				}
				_this._walk(results,function(obj,i,value){
					if (value instanceof Array){
						for (var i in _this._arrayModifyingMethods){
							if (!value[i]._augmented){
								value[i] = _this._arrayModifyingMethods[i];
							}
						}
						
					}
				});
				if (args.onItem){
					for (var i=0; i<results.length;i++){	
						args["onItem"].call(_this, results[i], args);
					}
				}					
				if (args.onComplete){
					args["onComplete"].call(_this, results, args);
				}
				return results;
			});
			defResult.addErrback(args.onError);
			return args;
		},
		

		getFeatures: function(){
			// summary:
			// 	return the store feature set

			return { 
				"dojo.data.api.Read": true,
				"dojo.data.api.Identity": true,
				"dojo.data.api.Write": true,
				"dojo.data.api.Notification": true
			}
		},

		getLabel: function(item){
			// summary
			//	returns the label for an item. Just gets the "label" attribute.
			//	
			return this.getValue(item,"label");
		},

		getLabelAttributes: function(item){
			// summary:
			//	returns an array of attributes that are used to create the label of an item
			return ["label"];
		},

		sort: function(a,b){
			console.log("TODO::implement default sort algo");
		},

		//Identity API Support

		getIdentity: function(item){
			// summary
			//	returns the identity of an item or throws
			//	a not found error.
			var prefix = this.service.serviceName + '/';
			if (!item._id){// generate a good random id
				item._id = prefix + Math.random().toString(16).substring(2,14)+Math.random().toString(16).substring(2,14);
			}
			if (item._id.substring(0,prefix.length) != prefix){
				throw Error("Identity attribute not found");
			}
			return item._id.substring(prefix.length);
		},

		getIdentityAttributes: function(item){
			// summary:
			//	returns the attributes which are used to make up the 
			//	identity of an item.  Basically returns this.idAttribute

			return [this.idAttribute];
		},

		fetchItemByIdentity: function(args){
			// summary: 
			//	fetch an item by its identity. fetch and fetchItemByIdentity work exactly the same
			return this.fetch(args); 
		},

		//Write API Support
		newItem: function(data, parentInfo){
			// summary:
			//	adds a new item to the store at the specified point.
			//	Takes two parameters, data, and options. 
			//
			//	data: /* object */
			//		The data to be added in as an item.
			//	parentInfo:
			//		An optional javascript object defining what item is the parent of this item (in a hierarchical store.  Not all stores do hierarchical items), 
			//		and what attribute of that parent to assign the new item to.  If this is present, and the attribute specified
			//		is a multi-valued attribute, it will append this item into the array of values for that attribute.  The structure
			//		of the object is as follows:
			//		{
			//			parent: someItem,
			//		}
			//  or
			//		{
			//			parentId: someItemId,
			//		}
			
			if (this.service._schema && this.service._schema.clazz && data.constructor != this.service._schema.clazz) 
				data = dojo.mixin(new this.service._schema.clazz,data);
			this.getIdentity(data);
			this._getParent(parentInfo).push(data); // essentially what newItem really means
			this.onNew(data);
			return data;
		},
		_getParent : function(parentInfo){
			
			var parentId = (parentInfo && parentInfo.parentId) || this.parentId || '';
			var parent = (parentInfo && parentInfo.parent) || dojox.rpc._index[this.service.serviceName + '/' + parentId] || [];
			if (!parent._id){
				parent._id = this.service.serviceName + '/' + parentId;
				this._setDirty(parent); // set it dirty so it will be post
			}
			return parent;
		},
		deleteItem: function(item,/*array*/parentInfo){	
			// summary
			//	deletes item any references to that item from the store.
			//
			//	item: 
			//  item to delete
			//
			//	removeFrom: This an item or items from which to remove references to this object. This store does not record references,
			// so if this parameter the entire object graph from load items will be searched for references. Providing this parameter
			// is vastly faster. An empty object or truthy primitive can be passed if no references need to be removed 
			
			//	If the desire is to delete only one reference, unsetAttribute or
			//	setValue is the way to go.
			if (this.isItem(item))
				this._deletedItems.push(item);
			var _this = this;
			this._walk(((parentInfo || this.parentId) && this._getParent(parentInfo)) || dojox.rpc._index,function(obj,i,val){
				if (obj[i] === item){ // find a reference to this object
					if (_this.isItem(obj)){
						if (isNaN(i) || !obj.splice){ // remove a property
							_this.unsetAttribute(obj,i);
							delete obj[i];
						}
						else {// remove an array entry
							obj.splice(i,1);
						}
					}
				}
			});
			this.onDelete(item);
		},

		_setDirty: function(item){
			// summary:
			//	adds an item to the list of dirty items.  This item
			//	contains a reference to the item itself as well as a
			//	cloned and trimmed version of old item for use with
			//	revert.
			var i;
			if (!item._id) 
				return;
			//if an item is already in the list of dirty items, don't add it again
			//or it will overwrite the premodification data set.
			for (i=0; i<this._dirtyItems.length; i++){
				if (item==this._dirtyItems[i].item){
					return; 
				}	
			}
			var old = item instanceof Array ? [] : {};
			for (i in item) 
				if (item.hasOwnProperty(i))
					old[i] = item[i];			
			this._dirtyItems.push({item: item, old: old});
		},

		setValue: function(item, attribute, value){
			// summary:
			//	sets 'attribute' on 'item' to 'value'

			var old = item[attribute];
			if (old != value){
				this._setDirty(item);
				item[attribute]=value;
				this.onSet(item,attribute,old,value);
			}
		},

		setValues: function(item, attribute, values){
			// summary:
			//	sets 'attribute' on 'item' to 'value' value
			//	must be an array.


			if (!dojo.isArray(values)){throw new Error("setValues expects to be passed an Array object as its value");}
			this._setDirty(item);
			var old = item[attribute];
			item[attribute]=values;
			this.onSet(item,attribute,old,values);
		},

		unsetAttribute: function(item, attribute){
			// summary:
			//	unsets 'attribute' on 'item'

			this._setDirty(item);
			var old = item[attribute];
			delete item[attribute];
			this.onSet(item,attribute,old,undefined);
		},
		_commitAppend: function(listId,item){
			return this.service.post(listId,item);
		},
		save: function(kwArgs){
			// summary:
			//	Saves the dirty data using REST Ajax methods

			var data = [];
			
			var left = 0; // this is how many changes are remaining to be received from the server
			var _this = this;
			function finishOne(){
				if (!(--left))
					_this.onSave(data);
			}
			while (this._dirtyItems.length > 0){
				var dirty = this._dirtyItems.pop();
				var item = dirty.item;
				var append = false;
				left++;
				var deferred;
				if (item instanceof Array && dirty.old instanceof Array){
					// see if we can just append the item with a post
					append = true;
					for (var i = 0, l = dirty.old.length; i < l; i++){
						if (item[i] != dirty.old[i]){
							append = false;
						}
					}
					if (append){ // if we can, we will do posts to add from here
						for (;i<item.length;i++){
							deferred = this._commitAppend(this.getIdentity(item),item[i]);
							deferred.addCallback(finishOne);
						}
					}
				}
				if (!append){
					deferred = this.service.put(this.getIdentity(item),item);
					deferred.addCallback(finishOne);
				}
				
				data.push(item);
			}
			while (this._deletedItems.length > 0){
				left++;				
				this.service['delete'](this.getIdentity(this._deletedItems.pop())).addCallback(finishOne);
			}
		},


		revert: function(){
			// summary
			//	returns any modified data to its original state prior to a save();

			while (this._dirtyItems.length>0){
				var i;
				var d = this._dirtyItems.pop();
				for (i in d.old){
					d.item[i] = d.old[i];
				}
				for (i in d.item){
					if (!d.old.hasOwnProperty(i))
						delete d.item[i]
				}
			}
			this.onRevert();
		},


		isDirty: function(item){
			// summary
			//	returns true if the item is marked as dirty.
			for (var i=0, l=this._dirtyItems.length; i<l; i++){
				if (this._dirtyItems[i]==item){return true};
			}
		},


		//Notifcation Support

		onSet: function(){
		},

		onNew: function(){

		},

		onDelete: function(){

		},	
	
		onSave: function(items){
			// summary:
			//	notification of the save event..not part of the notification api, 
			//	but probably should be.
			//console.log("onSave() ", items);
		},

		onRevert: function(){
			// summary:
			//	notification of the revert event..not part of the notification api, 
			//	but probably should be.

		}
	}
);


}
