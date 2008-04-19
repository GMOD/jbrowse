if(!dojo._hasResource["dojox.data.PersevereRestStore"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.data.PersevereRestStore"] = true;
dojo.provide("dojox.data.PersevereRestStore");
dojo.require("dojox.data.JsonRestStore");
dojo.require("dojox.json.ref"); // TODO: Make it work without this dependency

// PersevereRestStore is an extension of JsonRestStore to handle Persevere's special features


dojo.declare("dojox.data.PersevereRestStore",
	dojox.data.JsonRestStore,
	{
		getIdentity : function(item) {
			var prefix = this.service.serviceName + '/';
			if (!item._id) {
				item.id = '../' + (item._id = 'client/' + dojox.data.nextClientId++);
			}
			if (item._id.substring(0,prefix.length) != prefix) {
				return '../' + item._id; // use relative url path style referencing
			}
			return item._id.substring(prefix.length);
		}/*,
		_commitAppend: function(listId,item) {
			var deferred = this.service.post(listId,item);
			var prefix = this.service.serviceName + '/';
			deferred.addCallback(function(result) {
				item._id = prefix + result[this.idAttribute]; // update the object with the results of the post
				return result;
				//TODO: Need to go down the graph assigned _id based on path, so that sub items can be modified and properly reflected to the root item (being careful of circular references)
			});
			return deferred;
		}*/
	}
);
 
dojox.data.nextClientId = 0;


}
