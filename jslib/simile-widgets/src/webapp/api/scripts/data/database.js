/*======================================================================
 *  Exhibit.Database
 *  http://simile.mit.edu/wiki/Exhibit/API/Database
 *======================================================================
 */

Exhibit.Database = new Object();

Exhibit.Database.create = function() {
    Exhibit.Database.handleAuthentication();
    return new Exhibit.Database._Impl();
};

Exhibit.Database.handleAuthentication = function() {
    if (window.Exhibit.params.authenticated) {
        var links = document.getElementsByTagName('head')[0].childNodes;
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if (link.rel == 'exhibit/output' && link.getAttribute('ex:authenticated')) {
                
            }
        }
    }
};

Exhibit.Database.makeISO8601DateString = function(date) {
    date = date || new Date();
    var pad = function(i) { return i > 9 ? i.toString() : '0'+i };
    var s = date.getFullYear() + '-' + pad(date.getMonth() +1) + '-' + pad(date.getDate());
    return s;
}

Exhibit.Database.TimestampPropertyName = "addedOn";

/*==================================================
 *  Exhibit.Database._Impl
 *==================================================
 */
Exhibit.Database._Impl = function() {
    this._types = {};
    this._properties = {};
    this._propertyArray = {};
    
    this._submissionRegistry = {}; // stores unmodified copies of submissions
    
    this._originalValues = {};
    this._newItems = {};
    
    this._listeners = new SimileAjax.ListenerQueue();
    
    this._spo = {};
    this._ops = {};
    this._items = new Exhibit.Set();
    
    /*
     *  Predefined types and properties
     */
     
    var l10n = Exhibit.Database.l10n;
    
    var itemType = new Exhibit.Database._Type("Item");
    itemType._custom = Exhibit.Database.l10n.itemType;
    this._types["Item"] = itemType;

    var labelProperty = new Exhibit.Database._Property("label", this);
    labelProperty._uri                  = "http://www.w3.org/2000/01/rdf-schema#label";
    labelProperty._valueType            = "text";
    labelProperty._label                = l10n.labelProperty.label;
    labelProperty._pluralLabel          = l10n.labelProperty.pluralLabel;
    labelProperty._reverseLabel         = l10n.labelProperty.reverseLabel;
    labelProperty._reversePluralLabel   = l10n.labelProperty.reversePluralLabel;
    labelProperty._groupingLabel        = l10n.labelProperty.groupingLabel;
    labelProperty._reverseGroupingLabel = l10n.labelProperty.reverseGroupingLabel;
    this._properties["label"]           = labelProperty;
    
    var typeProperty = new Exhibit.Database._Property("type");
    typeProperty._uri                   = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    typeProperty._valueType             = "text";
    typeProperty._label                 = "type";
    typeProperty._pluralLabel           = l10n.typeProperty.label;
    typeProperty._reverseLabel          = l10n.typeProperty.reverseLabel;
    typeProperty._reversePluralLabel    = l10n.typeProperty.reversePluralLabel;
    typeProperty._groupingLabel         = l10n.typeProperty.groupingLabel;
    typeProperty._reverseGroupingLabel  = l10n.typeProperty.reverseGroupingLabel;
    this._properties["type"]            = typeProperty;
    
    var uriProperty = new Exhibit.Database._Property("uri");
    uriProperty._uri                    = "http://simile.mit.edu/2006/11/exhibit#uri";
    uriProperty._valueType              = "url";
    uriProperty._label                  = "URI";
    uriProperty._pluralLabel            = "URIs";
    uriProperty._reverseLabel           = "URI of";
    uriProperty._reversePluralLabel     = "URIs of";
    uriProperty._groupingLabel          = "URIs";
    uriProperty._reverseGroupingLabel   = "things named by these URIs";
    this._properties["uri"]             = uriProperty;
    
    var changeProperty = new Exhibit.Database._Property("change", this);
    changeProperty._uri                    = "http://simile.mit.edu/2006/11/exhibit#change";
    changeProperty._valueType              = "text";
    changeProperty._label                  = "change type";
    changeProperty._pluralLabel            = "change types";
    changeProperty._reverseLabel           = "change type of";
    changeProperty._reversePluralLabel     = "change types of";
    changeProperty._groupingLabel          = "change types";
    changeProperty._reverseGroupingLabel   = "changes of this type";
    this._properties["change"]             = changeProperty;
    
    var changedItemProperty = new Exhibit.Database._Property("changedItem", this);
   changedItemProperty._uri                    = "http://simile.mit.edu/2006/11/exhibit#changedItem";
    changedItemProperty._valueType              = "text";
    changedItemProperty._label                  = "changed item";
    changedItemProperty._pluralLabel            = "changed item";
    changedItemProperty._groupingLabel          = "changed items";
    this._properties["changedItem"]             = changedItemProperty;
    
    var modifiedProperty = new Exhibit.Database._Property(Exhibit.Database.ModifiedPropertyName, this);
    modifiedProperty._uri                       = "http://simile.mit.edu/2006/11/exhibit#modified";
    modifiedProperty._valueType                 = "text";
    modifiedProperty._label                     = "modified";
    modifiedProperty._pluralLabel               = "modified";
    modifiedProperty._groupingLabel             = "was modified";
    this._properties["modified"]                = modifiedProperty;
};

Exhibit.Database._Impl.prototype.createDatabase = function() {
    return Exhibit.Database.create();
};

Exhibit.Database._Impl.prototype.addListener = function(listener) {
    this._listeners.add(listener);
};

Exhibit.Database._Impl.prototype.removeListener = function(listener) {
    this._listeners.remove(listener);
};

Exhibit.Database._Impl.prototype.loadDataLinks = function(fDone) {
    var links = SimileAjax.jQuery('link[rel="exhibit/data"]').add('a[rel="exhibit/data"]').get();
    var self=this;
    var fDone2 = function () {
	self.loadDataElements(self, fDone);
	if (fDone) fDone();
    }
    this._loadLinks(links, this, fDone2);
};

Exhibit.Database._Impl.prototype.loadLinks = function(links, fDone) {
    this._loadLinks(links, this, fDone);
};

Exhibit.Database._Impl.prototype.loadDataElements = function(database) {
//to load inline exhibit data
//unlike loadlinks, this is synchronous, so no fDone continuation.
    var findFunction = function (s) {
	//redundant with loadlinks, but I don't want to mess with that yet
	if (typeof (s)  == "string") {
	    if (s in Exhibit) {
		s = Exhibit[s];
            } else {
		try {
                    s = eval(s);
		} catch (e) {
                    s = null;
                    // silent
		}
	    }
	}
	return s;
    }

    var url=window.location.href;

    var loadElement = function(element) {
	var e=SimileAjax.jQuery(element);
	var content=e.html();
	if (content) {
	    if (!e.attr('href')) {e.attr('href',url)} //some parsers check this
            var type = Exhibit.getAttribute(element,"type");
            if (type == null || type.length == 0) {
		type = "application/json";
            }
            var importer = Exhibit.importers[type];

	    var parser=findFunction(Exhibit.getAttribute(element,'parser'))
		|| (importer && importer.parse);
	    if (parser) {
		var o=null;
		try {
		o=parser(content,element,url);
		} catch(e) {
			SimileAjax.Debug.exception(e, "Error parsing Exhibit data from " + url);
		}
		if (o != null) {
		    try {
			database.loadData(o, Exhibit.Persistence.getBaseURL(url));
			e.hide(); //if imported, don't want original
 		    } catch (e) {
			SimileAjax.Debug.exception(e, "Error loading Exhibit data from " + url);
		    }
		}
	    } else {
		SimileAjax.Debug.log("No parser for data of type " + type);
            }
	}
    }

    var safeLoadElement = function () {
	//so one bad data element won't prevent others loading.
	try {
	    loadElement(this);
	}
	catch (e) {
	}
    }

    var elements;
    try {
	elements=SimileAjax.jQuery('[ex\\:role="data"]');
    } catch (e) {
	//jquery in IE7 can't handle a namespaced attribute
	//so find data elements by brute force
	elements=$('*').filter(function(){
	    var attrs = this.attributes;
	    for (i=0; i<attrs.length; i++) {
		if ((attrs[i].nodeName=='ex:role') &&
		    (attrs[i].nodeValue=='data'))
		    return true;
	    }
	    return false;
	});
    }

    elements.each(safeLoadElement);
    
}

Exhibit.Database._Impl.prototype.loadSubmissionLinks = function(fDone) {
    var db = this;
    var dbProxy = {
        loadData: function(o, baseURI) {
            if ("types" in o) {
                db.loadTypes(o.types, baseURI);
            }
            if ("properties" in o) {
                db.loadProperties(o.properties, baseURI);
            }
            if ("items" in o) {
                db._listeners.fire("onBeforeLoadingItems", []);
                o.items.forEach(function(item) {
                    var oldID = item.id || item.label;
                    var newID = oldID + Math.floor(Math.random() * 1000000);
                    db._submissionRegistry[newID] = true;
                    
                    item.id = newID;
                    item.changedItem = oldID;
                    
                    if (db.containsItem(oldID)) {
                        item.change = 'modification';
                        
                        if (!item.type) {
                            item.type = db.getObject(oldID, 'type');
                        }
                    } else {
                        item.change = 'addition';
                    }
                });
                db.loadItems(o.items, baseURI);
                db._listeners.fire("onAfterLoadingItems", []);            
            }
        }
        
    };
    
    var links = SimileAjax.jQuery('head > link[rel=exhibit/submissions]').get()
    this._loadLinks(links, dbProxy, fDone);
};


Exhibit.Database._Impl.defaultGetter = function(link, database, parser, cont) {
    var url = typeof link == "string" ? link : link.href;
    url = Exhibit.Persistence.resolveURL(url);

    var fError = function() {
        Exhibit.UI.hideBusyIndicator();
        Exhibit.UI.showHelp(Exhibit.l10n.failedToLoadDataFileMessage(url));
        if (cont) cont();
    };

    var fDone = function(content) {
        Exhibit.UI.hideBusyIndicator();

	if (url.indexOf('#') >= 0) {
	    //the fragment is assumed to _contain_ the data
	    //so we return what is _inside_ the fragment tag
	    //which might not be html
	    //this simplifies parsing for non-html formats 
	    var fragment=url.match(/(#.*)/)[1];
	    content=SimileAjax.jQuery("<div>" + content + "</div>").find(fragment).html(); 
	}

	var o;
	try {
	    o=parser(content, link, url);
	} catch(e) {
	    SimileAjax.Debug.log(e, "Error parsing Exhibit data from " + url);
	    //absorb the error but continue
	}
	if (o != null) {
	    try {
		database.loadData(o, Exhibit.Persistence.getBaseURL(url));
 	    } catch (e) {
		SimileAjax.Debug.log(e, "Error loading Exhibit data from " + url);
		//absorb the rror but continue
	    }
	}
        if (cont) cont();
    };

    Exhibit.UI.showBusyIndicator();
//    SimileAjax.XmlHttp.get(url, fError, fDone);
    SimileAjax.jQuery.ajax({url: url, dataType: "text",
			    success: fDone, error: fError});
};

Exhibit.Database._Impl.prototype.findLoader =function(elt) {
    var findFunction = function (s) {
	if (typeof (s)  == "string") {
	    if (s in Exhibit) {
		s = Exhibit[s];
            } else {
		try {
                    s = eval(s);
		} catch (e) {
                    s = null;
                    // silent
		}
	    }
	}
	return s;
    }
    var type = Exhibit.getAttribute(link,'type');
    if (type == null || type.length == 0) {
        type = "application/json";
    }

    var importer = Exhibit.importers[type];
    var parser=findFunction(Exhibit.getAttribute(link,'parser'))
	|| (importer && importer.parse);
    var getter=findFunction(Exhibit.getAttribute(link,'getter'))
	|| (importer && importer.getter)
	|| Exhibit.Database._Impl.defaultGetter;
    if (parser) {
	return function(link, database, fNext) {
	    (getter)(link, database, parser, fNext);
	}
    }
    else if (importer) {
	return importer.load;
    }
    else {
	return null
    }
}

Exhibit.Database._Impl.prototype._loadLinks = function(links, database, fDone) {
    var findFunction = function (s) {
	if (typeof (s)  == "string") {
	    if (s in Exhibit) {
		s = Exhibit[s];
            } else {
		try {
                    s = eval(s);
		} catch (e) {
                    s = null;
                    // silent
		}
	    }
	}
	return s;
    }

    links = [].concat(links);
    var fNext = function() {
        while (links.length > 0) {
            var link = links.shift();
            var type = link.type;
            if (type == null || type.length == 0) {
                type = "application/json";
            }

            var importer = Exhibit.importers[type];
	    var parser=findFunction(Exhibit.getAttribute(link,'parser'))
		|| (importer && importer.parse);
	    var getter=findFunction(Exhibit.getAttribute(link,'getter'))
		|| (importer && importer.getter)
		|| Exhibit.Database._Impl.defaultGetter;
            if (parser) {
		(getter)(link, database, parser, fNext);
		return;
	    }
	    else if (importer) {
		importer.load(link, database, fNext);
		return;
            } else {
                SimileAjax.Debug.log("No importer for data of type " + type);
            }
        }

        if (fDone != null) {
            fDone();
        }
    };
    fNext();
};

Exhibit.Database._Impl.prototype.loadData = function(o, baseURI) {
    if (typeof baseURI == "undefined") {
        baseURI = location.href;
    }
    if ("types" in o) {
        this.loadTypes(o.types, baseURI);
    }
    if ("properties" in o) {
        this.loadProperties(o.properties, baseURI);
    }
    if ("items" in o) {
        this.loadItems(o.items, baseURI);
    }
};

Exhibit.Database._Impl.prototype.loadTypes = function(typeEntries, baseURI) {
    this._listeners.fire("onBeforeLoadingTypes", []);
    try {
        var lastChar = baseURI.substr(baseURI.length - 1)
        if (lastChar == "#") {
            baseURI = baseURI.substr(0, baseURI.length - 1) + "/";
        } else if (lastChar != "/" && lastChar != ":") {
            baseURI += "/";
        }
    
        for (var typeID in typeEntries) {
            if (typeof typeID != "string") {
                continue;
            }
            
            var typeEntry = typeEntries[typeID];
            if (typeof typeEntry != "object") {
                continue;
            }
            
            var type;
            if (typeID in this._types) {
                type = this._types[typeID];
            } else {
                type = new Exhibit.Database._Type(typeID);
                this._types[typeID] = type;
            };
            
            for (var p in typeEntry) {
                type._custom[p] = typeEntry[p];
            }
            
            if (!("uri" in type._custom)) {
                type._custom["uri"] = baseURI + "type#" + encodeURIComponent(typeID);
            }
            if (!("label" in type._custom)) {
                type._custom["label"] = typeID;
            }
        }
        
        this._listeners.fire("onAfterLoadingTypes", []);
    } catch(e) {
        SimileAjax.Debug.exception(e, "Database.loadTypes failed");
    }
};

Exhibit.Database._Impl.prototype.loadProperties = function(propertyEntries, baseURI) {
    this._listeners.fire("onBeforeLoadingProperties", []);
    try {
        var lastChar = baseURI.substr(baseURI.length - 1)
        if (lastChar == "#") {
            baseURI = baseURI.substr(0, baseURI.length - 1) + "/";
        } else if (lastChar != "/" && lastChar != ":") {
            baseURI += "/";
        }
    
        for (var propertyID in propertyEntries) {
            if (typeof propertyID != "string") {
                continue;
            }
            
            var propertyEntry = propertyEntries[propertyID];
            if (typeof propertyEntry != "object") {
                continue;
            }
            
            var property;
            if (propertyID in this._properties) {
                property = this._properties[propertyID];
            } else {
                property = new Exhibit.Database._Property(propertyID, this);
                this._properties[propertyID] = property;
            };
            
            property._uri = ("uri" in propertyEntry) ? propertyEntry.uri : (baseURI + "property#" + encodeURIComponent(propertyID));
            property._valueType = ("valueType" in propertyEntry) ? propertyEntry.valueType : "text";
                // text, html, number, date, boolean, item, url
            
            property._label = ("label" in propertyEntry) ? propertyEntry.label : propertyID;
            property._pluralLabel = ("pluralLabel" in propertyEntry) ? propertyEntry.pluralLabel : property._label;
            
            property._reverseLabel = ("reverseLabel" in propertyEntry) ? propertyEntry.reverseLabel : ("!" + property._label);
            property._reversePluralLabel = ("reversePluralLabel" in propertyEntry) ? propertyEntry.reversePluralLabel : ("!" + property._pluralLabel);
            
            property._groupingLabel = ("groupingLabel" in propertyEntry) ? propertyEntry.groupingLabel : property._label;
            property._reverseGroupingLabel = ("reverseGroupingLabel" in propertyEntry) ? propertyEntry.reverseGroupingLabel : property._reverseLabel;
            
            if ("origin" in propertyEntry) {
                property._origin = propertyEntry.origin;
            }
        }
        this._propertyArray = null;
        
        this._listeners.fire("onAfterLoadingProperties", []);
    } catch(e) {
        SimileAjax.Debug.exception(e, "Database.loadProperties failed");
    }
};

Exhibit.Database._Impl.prototype.loadItems = function(itemEntries, baseURI) {
    this._listeners.fire("onBeforeLoadingItems", []);
    try {
        var lastChar = baseURI.substr(baseURI.length - 1);
        if (lastChar == "#") {
            baseURI = baseURI.substr(0, baseURI.length - 1) + "/";
        } else if (lastChar != "/" && lastChar != ":") {
            baseURI += "/";
        }
        
        var spo = this._spo;
        var ops = this._ops;
        var indexPut = Exhibit.Database._indexPut;
        var indexTriple = function(s, p, o) {
            indexPut(spo, s, p, o);
            indexPut(ops, o, p, s);
        };
        
        for (var i = 0; i < itemEntries.length; i++) {
            var entry = itemEntries[i];
            if (typeof entry == "object") {
                this._loadItem(entry, indexTriple, baseURI);
            }
        }
        
        this._propertyArray = null;
        
        this._listeners.fire("onAfterLoadingItems", []);
    } catch(e) {
        SimileAjax.Debug.exception(e, "Database.loadItems failed");
    }
};

Exhibit.Database._Impl.prototype.getType = function(typeID) {
    return this._types[typeID];
};

Exhibit.Database._Impl.prototype.getProperty = function(propertyID) {
    return propertyID in this._properties ? this._properties[propertyID] : null;
};

/**
 * Get an array of all property names known to this database.
 */
Exhibit.Database._Impl.prototype.getAllProperties = function() {
    if (this._propertyArray == null) {
        this._propertyArray = [];
        for (var propertyID in this._properties) {
            this._propertyArray.push(propertyID);
        }
    }
    
    return [].concat(this._propertyArray);
};

Exhibit.Database._Impl.prototype.isSubmission = function(id) {
    return id in this._submissionRegistry;
}

Exhibit.Database._Impl.prototype.getAllItems = function() {
    var ret = new Exhibit.Set();
    var self = this;
    
    this._items.visit(function(item) {
        if (!self.isSubmission(item)) {
            ret.add(item);
        }
    });

    return ret;
};

Exhibit.Database._Impl.prototype.getAllSubmissions = function() {
    var ret = new Exhibit.Set();
    var itemList = this._items.toArray();

    for (var i in itemList) {
        var item = itemList[i];
        if (this.isSubmission(item)) {
            ret.add(item);
        }
    }

    return ret;
}

Exhibit.Database._Impl.prototype.getAllItemsCount = function() {
    return this._items.size();
};

Exhibit.Database._Impl.prototype.containsItem = function(itemID) {
    return this._items.contains(itemID);
};

Exhibit.Database._Impl.prototype.getNamespaces = function(idToQualifiedName, prefixToBase) {
    var bases = {};
    for (var propertyID in this._properties) {
        var property = this._properties[propertyID];
        var uri = property.getURI();
        
        var hash = uri.indexOf("#");
        if (hash > 0) {
            var base = uri.substr(0, hash + 1);
            bases[base] = true;
            
            idToQualifiedName[propertyID] = {
                base:       base,
                localName:  uri.substr(hash + 1)
            };
            continue;
        }
        
        var slash = uri.lastIndexOf("/");
        if (slash > 0) {
            var base = uri.substr(0, slash + 1);
            bases[base] = true;
            
            idToQualifiedName[propertyID] = {
                base:       base,
                localName:  uri.substr(slash + 1)
            };
            continue;
        }
    }
    
    var baseToPrefix = {};
    var letters = "abcdefghijklmnopqrstuvwxyz";
    var i = 0;
    
    for (var base in bases) {
        var prefix = letters.substr(i++,1);
        prefixToBase[prefix] = base;
        baseToPrefix[base] = prefix;
    }
    
    for (var propertyID in idToQualifiedName) {
        var qname = idToQualifiedName[propertyID];
        qname.prefix = baseToPrefix[qname.base];
    }
};

Exhibit.Database._Impl.prototype._loadItem = function(itemEntry, indexFunction, baseURI) {
    if (!("label" in itemEntry) && !("id" in itemEntry)) {
        SimileAjax.Debug.warn("Item entry has no label and no id: " +
                              SimileAjax.JSON.toJSONString( itemEntry ));
//        return;
	itemEntry.label="item" + Math.ceil(Math.random()*1000000);
    }
    
    var id;
    if (!("label" in itemEntry)) {
        id = itemEntry.id;
        if (!this._items.contains(id)) {
            SimileAjax.Debug.warn("Cannot add new item containing no label: " +
                                  SimileAjax.JSON.toJSONString( itemEntry ));
        }
    } else {
        var label = itemEntry.label;
        var id = ("id" in itemEntry) ? itemEntry.id : label;
        var uri = ("uri" in itemEntry) ? itemEntry.uri : (baseURI + "item#" + encodeURIComponent(id));
        var type = ("type" in itemEntry) ? itemEntry.type : "Item";
        
        
        var isArray = function(obj) {
            if (!obj || (obj.constructor.toString().indexOf("Array") == -1))
              return false;
           else
              return true;
        }
        if(isArray(label))
            label = label[0];
        if(isArray(id))
            id = id[0];
        if(isArray(uri))
            uri = uri[0];
        if(isArray(type))
            type = type[0];
        
        this._items.add(id);
        
        indexFunction(id, "uri", uri);
        indexFunction(id, "label", label);
        indexFunction(id, "type", type);
        
        this._ensureTypeExists(type, baseURI);
    }
    
    // items default to not being modified
    itemEntry.modified = itemEntry.modified || "no";
    
    for (var p in itemEntry) {
        if (typeof p != "string") {
            continue;
        }
        
        if (p != "uri" && p != "label" && p != "id" && p != "type") {
            this._ensurePropertyExists(p, baseURI)._onNewData();
                                    
            var v = itemEntry[p];
            if (v instanceof Array) {
                for (var j = 0; j < v.length; j++) {
                    indexFunction(id, p, v[j]);
                }
            } else if (v != undefined && v != null) {
                indexFunction(id, p, v);
            }
        }
    }
};

Exhibit.Database._Impl.prototype._ensureTypeExists = function(typeID, baseURI) {
    if (!(typeID in this._types)) {
        var type = new Exhibit.Database._Type(typeID);
        
        type._custom["uri"] = baseURI + "type#" + encodeURIComponent(typeID);
        type._custom["label"] = typeID;
        
        this._types[typeID] = type;
    }
};

Exhibit.Database._Impl.prototype._ensurePropertyExists = function(propertyID, baseURI) {
    if (!(propertyID in this._properties)) {
        var property = new Exhibit.Database._Property(propertyID, this);
        
        property._uri = baseURI + "property#" + encodeURIComponent(propertyID);
        property._valueType = "text";
        
        property._label = propertyID;
        property._pluralLabel = property._label;
        
        property._reverseLabel = "reverse of " + property._label;
        property._reversePluralLabel = "reverse of " + property._pluralLabel;
        
        property._groupingLabel = property._label;
        property._reverseGroupingLabel = property._reverseLabel;
        
        this._properties[propertyID] = property;
        
        this._propertyArray = null;
        return property;
    } else {
        return this._properties[propertyID];
    }
};

Exhibit.Database._indexPut = function(index, x, y, z) {
    var hash = index[x];
    if (!hash) {
        hash = {};
        index[x] = hash;
    }
    
    var array = hash[y];
    if (!array) {
        array = new Array();
        hash[y] = array;
    } else {
        for (var i = 0; i < array.length; i++) {
            if (z == array[i]) {
                return;
            }
        }
    }
    array.push(z);
};

Exhibit.Database._indexPutList = function(index, x, y, list) {
    var hash = index[x];
    if (!hash) {
        hash = {};
        index[x] = hash;
    }
    
    var array = hash[y];
    if (!array) {
        hash[y] = list;
    } else {
        hash[y] = hash[y].concat(list);
    }
};

Exhibit.Database._indexRemove = function(index, x, y, z) {
    function isEmpty(obj) {
        for (p in obj) { return false; } 
        return true;
    }
    
    var hash = index[x];
    if (!hash) {
        return false;
    }
    
    var array = hash[y];
    if (!array) {
        return false;
    }
    
    for (var i = 0; i < array.length; i++) {
        if (z == array[i]) {
            array.splice(i, 1);
            
            // prevent accumulation of empty arrays/hashes in indices
            if (array.length == 0) {
                delete hash[y];

                if (isEmpty(hash)) { 
                    delete index[x];
                }
            }
            return true;
        }
    }
};

Exhibit.Database._indexRemoveList = function(index, x, y) {
    var hash = index[x];
    if (!hash) {
        return null;
    }
    
    var array = hash[y];
    if (!array) {
        return null;
    }
    
    delete hash[y];
    return array;
};

Exhibit.Database._Impl.prototype._indexFillSet = function(index, x, y, set, filter) {
    var hash = index[x];
    if (hash) {
        var array = hash[y];
        if (array) {
            if (filter) {
                for (var i = 0; i < array.length; i++) {
                    var z = array[i];
                    if (filter.contains(z)) {
                        set.add(z);
                    }
                }
            } else {
                for (var i = 0; i < array.length; i++) {
                    set.add(array[i]);
                }
            }
        }
    }
};

Exhibit.Database._Impl.prototype._indexCountDistinct = function(index, x, y, filter) {
    var count = 0;
    var hash = index[x];
    if (hash) {
        var array = hash[y];
        if (array) {
            if (filter) {
                for (var i = 0; i < array.length; i++) {
                    if (filter.contains(array[i])) {
                        count++;
                    }
                }
            } else {
                count = array.length;
            }
        }
    }
    return count;
};

Exhibit.Database._Impl.prototype._get = function(index, x, y, set, filter) {
    if (!set) {
        set = new Exhibit.Set();
    }
    this._indexFillSet(index, x, y, set, filter);
    return set;
};

Exhibit.Database._Impl.prototype._getUnion = function(index, xSet, y, set, filter) {
    if (!set) {
        set = new Exhibit.Set();
    }
    
    var database = this;
    xSet.visit(function(x) {
        database._indexFillSet(index, x, y, set, filter);
    });
    return set;
};

Exhibit.Database._Impl.prototype._countDistinctUnion = function(index, xSet, y, filter) {
    var count = 0;
    var database = this;
    xSet.visit(function(x) {
        count += database._indexCountDistinct(index, x, y, filter);
    });
    return count;
};

Exhibit.Database._Impl.prototype._countDistinct = function(index, x, y, filter) {
    return this._indexCountDistinct(index, x, y, filter);
};

Exhibit.Database._Impl.prototype._getProperties = function(index, x) {
    var hash = index[x];
    var properties = []
    if (hash) {
        for (var p in hash) {
            properties.push(p);
        }
    }
    return properties;
};

Exhibit.Database._Impl.prototype.getObjects = function(s, p, set, filter) {
    return this._get(this._spo, s, p, set, filter);
};

Exhibit.Database._Impl.prototype.countDistinctObjects = function(s, p, filter) {
    return this._countDistinct(this._spo, s, p, filter);
};

Exhibit.Database._Impl.prototype.getObjectsUnion = function(subjects, p, set, filter) {
    return this._getUnion(this._spo, subjects, p, set, filter);
};

Exhibit.Database._Impl.prototype.countDistinctObjectsUnion = function(subjects, p, filter) {
    return this._countDistinctUnion(this._spo, subjects, p, filter);
};

Exhibit.Database._Impl.prototype.getSubjects = function(o, p, set, filter) {
    return this._get(this._ops, o, p, set, filter);
};

Exhibit.Database._Impl.prototype.countDistinctSubjects = function(o, p, filter) {
    return this._countDistinct(this._ops, o, p, filter);
};

Exhibit.Database._Impl.prototype.getSubjectsUnion = function(objects, p, set, filter) {
    return this._getUnion(this._ops, objects, p, set, filter);
};

Exhibit.Database._Impl.prototype.countDistinctSubjectsUnion = function(objects, p, filter) {
    return this._countDistinctUnion(this._ops, objects, p, filter);
};

Exhibit.Database._Impl.prototype.getObject = function(s, p) {
    var hash = this._spo[s];
    if (hash) {
        var array = hash[p];
        if (array) {
            return array[0];
        }
    }
    return null;
};

Exhibit.Database._Impl.prototype.getSubject = function(o, p) {
    var hash = this._ops[o];
    if (hash) {
        var array = hash[p];
        if (array) {
            return array[0];
        }
    }
    return null;
};

Exhibit.Database._Impl.prototype.getForwardProperties = function(s) {
    return this._getProperties(this._spo, s);
};

Exhibit.Database._Impl.prototype.getBackwardProperties = function(o) {
    return this._getProperties(this._ops, o);
};

Exhibit.Database._Impl.prototype.getSubjectsInRange = function(p, min, max, inclusive, set, filter) {
    var property = this.getProperty(p);
    if (property != null) {
        var rangeIndex = property.getRangeIndex();
        if (rangeIndex != null) {
            return rangeIndex.getSubjectsInRange(min, max, inclusive, set, filter);
        }
    }
    return (!set) ? new Exhibit.Set() : set;
};

Exhibit.Database._Impl.prototype.getTypeIDs = function(set) {
    return this.getObjectsUnion(set, "type", null, null);
};

Exhibit.Database._Impl.prototype.addStatement = function(s, p, o) {
    var indexPut = Exhibit.Database._indexPut;
    indexPut(this._spo, s, p, o);
    indexPut(this._ops, o, p, s);
};

Exhibit.Database._Impl.prototype.removeStatement = function(s, p, o) {
    var indexRemove = Exhibit.Database._indexRemove;
    var removedObject = indexRemove(this._spo, s, p, o);
    var removedSubject = indexRemove(this._ops, o, p, s);
    return removedObject || removedSubject;
};

Exhibit.Database._Impl.prototype.removeObjects = function(s, p) {
    var indexRemove = Exhibit.Database._indexRemove;
    var indexRemoveList = Exhibit.Database._indexRemoveList;
    var objects = indexRemoveList(this._spo, s, p);
    if (objects == null) {
        return false;
    } else {
        for (var i = 0; i < objects.length; i++) {
            indexRemove(this._ops, objects[i], p, s);
        }
        return true;
    }
};

Exhibit.Database._Impl.prototype.removeSubjects = function(o, p) {
    var indexRemove = Exhibit.Database._indexRemove;
    var indexRemoveList = Exhibit.Database._indexRemoveList;
    var subjects = indexRemoveList(this._ops, o, p);
    if (subjects == null) {
        return false;
    } else {
        for (var i = 0; i < subjects.length; i++) {
            indexRemove(this._spo, subjects[i], p, o);
        }
        return true;
    }
};

Exhibit.Database._Impl.prototype.removeAllStatements = function() {
    this._listeners.fire("onBeforeRemovingAllStatements", []);
    try {
        this._spo = {};
        this._ops = {};
        this._items = new Exhibit.Set();
    
        for (var propertyID in this._properties) {
            this._properties[propertyID]._onNewData();
        }
        this._propertyArray = null;
        
        this._listeners.fire("onAfterRemovingAllStatements", []);
    } catch(e) {
        SimileAjax.Debug.exception(e, "Database.removeAllStatements failed");
    }
};

/*==================================================
 *  Exhibit.Database._Type
 *==================================================
 */
Exhibit.Database._Type = function(id) {
    this._id = id;
    this._custom = {};
};

Exhibit.Database._Type.prototype = {
    getID:          function()  { return this._id; },
    getURI:         function()  { return this._custom["uri"]; },
    getLabel:       function()  { return this._custom["label"]; },
    getOrigin:      function()  { return this._custom["origin"]; },
    getProperty:    function(p) { return this._custom[p]; }
};

/*==================================================
 *  Exhibit.Database._Property
 *==================================================
 */
Exhibit.Database._Property = function(id, database) {
    this._id = id;
    this._database = database;
    this._rangeIndex = null;
};

Exhibit.Database._Property.prototype = {
    getID:          function() { return this._id; },
    getURI:         function() { return this._uri; },
    getValueType:   function() { return this._valueType; },
    
    getLabel:               function() { return this._label; },
    getPluralLabel:         function() { return this._pluralLabel; },
    getReverseLabel:        function() { return this._reverseLabel; },
    getReversePluralLabel:  function() { return this._reversePluralLabel; },
    getGroupingLabel:       function() { return this._groupingLabel; },
    getGroupingPluralLabel: function() { return this._groupingPluralLabel; },
    getOrigin:              function() { return this._origin; }
};

Exhibit.Database._Property.prototype._onNewData = function() {
    this._rangeIndex = null;
};

Exhibit.Database._Property.prototype.getRangeIndex = function() {
    if (this._rangeIndex == null) {
        this._buildRangeIndex();
    }
    return this._rangeIndex;
};

Exhibit.Database._Property.prototype._buildRangeIndex = function() {
    var getter;
    var database = this._database;
    var p = this._id;
    
    switch (this.getValueType()) {
    case "date":
        getter = function(item, f) {
            database.getObjects(item, p, null, null).visit(function(value) {
                if (value != null && !(value instanceof Date)) {
                    value = SimileAjax.DateTime.parseIso8601DateTime(value);
                }
                if (value instanceof Date) {
                    f(value.getTime());
                }
            });
        };
        break;
    default:
        getter = function(item, f) {
            database.getObjects(item, p, null, null).visit(function(value) {
                if (typeof value != "number") {
                    value = parseFloat(value);
                }
                if (!isNaN(value)) {
                    f(value);
                }
            });
        };
        break;
    }
    
    this._rangeIndex = new Exhibit.Database._RangeIndex(
        this._database.getAllItems(),
        getter
    );
};

/*==================================================
 *  Exhibit.Database._RangeIndex
 *==================================================
 */
Exhibit.Database._RangeIndex = function(items, getter) {
    pairs = [];
    items.visit(function(item) {
        getter(item, function(value) {
            pairs.push({ item: item, value: value });
        });
    });
    
    pairs.sort(function(p1, p2) {
        var c = p1.value - p2.value;
        return (isNaN(c) === false) ? c : p1.value.localeCompare(p2.value);
    });
    
    this._pairs = pairs;
};

Exhibit.Database._RangeIndex.prototype.getCount = function() {
    return this._pairs.length;
};

Exhibit.Database._RangeIndex.prototype.getMin = function() {
    return this._pairs.length > 0 ? 
        this._pairs[0].value : 
        Number.POSITIVE_INFINITY;
};

Exhibit.Database._RangeIndex.prototype.getMax = function() {
    return this._pairs.length > 0 ? 
        this._pairs[this._pairs.length - 1].value : 
        Number.NEGATIVE_INFINITY;
};

Exhibit.Database._RangeIndex.prototype.getRange = function(visitor, min, max, inclusive) {
    var startIndex = this._indexOf(min);
    var pairs = this._pairs;
    var l = pairs.length;
    
    inclusive = (inclusive);
    while (startIndex < l) {
        var pair = pairs[startIndex++];
        var value = pair.value;
        if (value < max || (value == max && inclusive)) {
            visitor(pair.item);
        } else {
            break;
        }
    }
};

Exhibit.Database._RangeIndex.prototype.getSubjectsInRange = function(min, max, inclusive, set, filter) {
    if (!set) {
        set = new Exhibit.Set();
    }
    
    var f = (filter != null) ?
        function(item) {
            if (filter.contains(item)) {
                set.add(item);
            }
        } :
        function(item) {
            set.add(item);
        };
        
    this.getRange(f, min, max, inclusive);
    
    return set;
};

Exhibit.Database._RangeIndex.prototype.countRange = function(min, max, inclusive) {
    var startIndex = this._indexOf(min);
    var endIndex = this._indexOf(max);
    
    if (inclusive) {
        var pairs = this._pairs;
        var l = pairs.length;
        while (endIndex < l) {
            if (pairs[endIndex].value == max) {
                endIndex++;
            } else {
                break;
            }
        }
    }
    return endIndex - startIndex;
};

Exhibit.Database._RangeIndex.prototype._indexOf = function(v) {
    var pairs = this._pairs;
    if (pairs.length == 0 || pairs[0].value >= v) {
        return 0;
    }
    
    var from = 0;
    var to = pairs.length;
    while (from + 1 < to) {
        var middle = (from + to) >> 1;
        var v2 = pairs[middle].value;
        if (v2 >= v) {
            to = middle;
        } else {
            from = middle;
        }
    }
    
    return to;
};


//=============================================================================
// Editable Database Support
//=============================================================================

Exhibit.Database._Impl.prototype.isNewItem = function(id) {
    return id in this._newItems;
}

Exhibit.Database._Impl.prototype.getItem = function(id) {
    var item = { id: id };
    var properties = this.getAllProperties();
    for (var i in properties) {
        var prop = properties[i];
        var val = this.getObject(id, prop);
        if (val) { item[prop] = val };
    }
    return item;
}

Exhibit.Database._Impl.prototype.addItem = function(item) {
    if (!item.id) { item.id = item.label };

    if (!item.modified) {
        item.modified = "yes";
    }
    
    this._ensurePropertyExists(Exhibit.Database.TimestampPropertyName);
    item[Exhibit.Database.TimestampPropertyName] = Exhibit.Database.makeISO8601DateString();
    
    this.loadItems([item], '');

    this._newItems[item.id] = true;
    
    this._listeners.fire('onAfterLoadingItems', []);
}

// TODO: cleanup item editing logic
Exhibit.Database._Impl.prototype.editItem = function(id, prop, value) {
    if (prop.toLowerCase() == 'id') {
        Exhibit.UI.showHelp("We apologize, but changing the IDs of items in the Exhibit isn't supported at the moment.");
        return;
    }
    
    var prevValue = this.getObject(id, prop);
    
    this._originalValues[id] = this._originalValues[id] || {};
    this._originalValues[id][prop] = this._originalValues[id][prop] || prevValue;
    
    var origVal = this._originalValues[id][prop];
    
    if (origVal == value) {
        this.removeObjects(id, "modified");
        this.addStatement(id, "modified", 'no');
        delete this._originalValues[id][prop];
    } else if (this.getObject(id, "modified") != "yes") {
        this.removeObjects(id, "modified");
        this.addStatement(id, "modified", "yes");
    }
    
    this.removeObjects(id, prop);
    this.addStatement(id, prop, value);
    
    var propertyObject = this._ensurePropertyExists(prop);
    propertyObject._onNewData();

    this._listeners.fire('onAfterLoadingItems', []);
}

Exhibit.Database._Impl.prototype.removeItem = function(id) {
    if (!this.containsItem(id)) {
        throw "Removing non-existent item " + id;
    }

    this._items.remove(id);
    delete this._spo[id];
        
    if (this._newItems[id]) {
        delete this._newItems[id];
    }
    
    if (this._originalValues[id]) {
        delete this._originalValues[id];
    }

    var properties = this.getAllProperties();
    for (var i in properties) {
        var prop = properties[i];
        this.removeObjects(id, prop);
    }

    this._listeners.fire('onAfterLoadingItems', []);
};

Exhibit.Database.defaultIgnoredProperties = ['uri', 'modified'];

// this makes all changes become "permanent"
// i.e. after change set is committed to server
Exhibit.Database._Impl.prototype.fixAllChanges = function() {
    this._originalValues = {};
    this._newItems = {};
    
    var items = this._items.toArray();
    for (var i in items) {
        var id = items[i];
        this.removeObjects(id, "modified");
        this.addStatement(id, "modified", "no");
    }
};

Exhibit.Database._Impl.prototype.fixChangesForItem = function(id) {
    delete this._originalValues[id];
    delete this._newItems[id];
    
    this.removeObjects(id, "modified");
    this.addStatement(id, "modified", "no");
};

Exhibit.Database._Impl.prototype.collectChangesForItem = function(id, ignoredProperties) {
    ignoredProperties = ignoredProperties || Exhibit.Database.defaultIgnoredProperties;
    
    var type = this.getObject(id, 'type');
    var label = this.getObject(id, 'label') || id;
    var item = { id: id, label: label, type: type, vals: {} };
    
    if (id in this._newItems) {
        item.changeType = 'added';

        var properties = this.getAllProperties();
        
        for (var i in properties) {
            var prop = properties[i];
            if (ignoredProperties.indexOf(prop) != -1) { continue; }
            
            var val = this.getObject(id, prop);
            if (val) { 
                item.vals[prop] = { newVal: val }
            };
        }
    } else if (id in this._originalValues && !this.isSubmission(id)) {
        item.changeType = 'modified';
        var vals = this._originalValues[id];
        var hasModification = false;
        
        for (var prop in vals) {
            if (ignoredProperties.indexOf(prop) != -1) { continue; }
            
            hasModification = true;
            var oldVal = this._originalValues[id][prop];
            var newVal = this.getObject(id, prop);
            
            if (!newVal) {
                SimileAjax.Debug.warn('empty value for ' + id + ', ' + prop)
            } else {
                item.vals[prop] = { oldVal: oldVal, newVal: newVal };   
            }
        }
        
        if (!hasModification) return null;
    } else {
        return null;
    }
    
    if (!item[Exhibit.Database.TimestampPropertyName]) {
        item[Exhibit.Database.TimestampPropertyName] = Exhibit.Database.makeISO8601DateString();
    }
    
    return item;
}

Exhibit.Database._Impl.prototype.collectAllChanges = function(ignoredProperties) {
    var ret = [];
    var items = this._items.toArray();
    
    for (var i in items) {
        var id = items[i];
        var item = this.collectChangesForItem(id, ignoredProperties);
        if (item) {
            ret.push(item);
        }
    }
    
    return ret;
}

//=============================================================================
// Submissions Support
//=============================================================================

Exhibit.Database._Impl.prototype.mergeSubmissionIntoItem = function(submissionID) {
    var db = this;
    
    if (!this.isSubmission(submissionID)){
        throw submissionID + " is not a submission!";
    }
    
    var change = this.getObject(submissionID, 'change');
    if (change == 'modification') {
        var itemID = this.getObject(submissionID, 'changedItem');
        var vals = this._spo[submissionID];
        
        SimileAjax.jQuery.each(vals, function(attr, val) {
            if (Exhibit.Database.defaultIgnoredSubmissionProperties.indexOf(attr) != -1) {
                return;
            }
            
            if (val.length == 1) {
                db.editItem(itemID, attr, val[0]);
            } else {
                SimileAjax.Debug.warn("Exhibit.Database._Impl.prototype.commitChangeToItem cannot handle " + 
                "multiple values for attribute " + attr + ": " + val);
            };
        });
        delete this._submissionRegistry[submissionID];
        
    } else if (change == 'addition') {
        delete this._submissionRegistry[submissionID];
        this._newItems[submissionID] = true;
    } else {
        throw "unknown change type " + change;
    }
    this._listeners.fire('onAfterLoadingItems', []);
}