if(!dojo._hasResource["dojox.data.CouchDBRestStore"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.data.CouchDBRestStore"] = true;
dojo.provide("dojox.data.CouchDBRestStore");
dojo.require("dojox.data.JsonRestStore");
dojo.require("dojox.json.ref"); // TODO: Make it work without this dependency

// A CouchDBRestStore is an extension of JsonRestStore to handle CouchDB's idiosyncrasies, special features,
// and deviations from standard HTTP Rest.
// NOTE: CouchDB is not designed to be run on a public facing network. There is no access control
// on database documents, and you should NOT rely on client side control to implement security. 


dojo.declare("dojox.data.CouchDBRestStore",
	dojox.data.JsonRestStore,
	{
		_commitAppend: function(listId,item) {
			var deferred = this.service.post(listId,item);
			var prefix = this.service.serviceName + '/';
			deferred.addCallback(function(result) {
				item._id = prefix + result.id; // update the object with the results of the post
				item._rev = result.rev;
				return result;
				//TODO: Need to go down the graph assigned _id based on path, so that sub items can be modified and properly reflected to the root item (being careful of circular references)
			});
			return deferred;
		},
		fetch: function(args) {
			// summary:
			// This only differs from JsonRestStore in that it, will put the query string the query part of the URL and it handles start and count
			if (typeof args == 'string') {
				args = {query: '_all_docs?' + args};
			}
			else if (typeof args.query == 'string') {
				args.query = '_all_docs?' + args.query;
			}
			else
				args.query =  '_all_docs?'; 
			if (args.start) {
				args.query = (args.query ? (args.query + '&') : '') + 'skip=' + args.start;
				delete args.start;
			}
			if (args.count) {
				args.query = (args.query ? (args.query + '&') : '') + 'count=' + args.count;
				delete args.count;   
			}
			var prefix = this.service.serviceName + '/';
			var oldOnComplete = args.onComplete;
			args.onComplete=function(results) {
				if (results.rows) {
					for (var i = 0; i < results.rows.length; i++) {
						var row = results.rows[i];  // make it into a reference
						row._id = prefix + (row.$ref = row.id); 
					}
				}
				if (oldOnComplete)
					oldOnComplete.apply(this,arguments);
			};
			return dojox.data.JsonRestStore.prototype.fetch.call(this,args);
		}
	}
);
 

dojox.data.CouchDBRestStore.generateSMD = function(couchServerUrl) {
	var couchSMD = {contentType:"application/json",
					transport:"REST",
					envelope:"PATH",
					services:{},
					target: couchServerUrl,
					};
	var def = dojo.xhrGet({
		url: couchServerUrl+"_all_dbs",
		handleAs: "json",
		sync: true
	});
	def.addCallback(function(dbs) {
		for (var i = 0; i < dbs.length; i++)
			couchSMD.services[dbs[i]] = {
							target:dbs[i],
							returns:{},
							parameters:[{type:"string"}]
						} 		
	});
	return couchSMD;
}

}
