/*======================================================================
 *  Collection
 *======================================================================
 */
Exhibit.Collection = function(id, database) {
    this._id = id;
    this._database = database;
    
    this._listeners = new SimileAjax.ListenerQueue();
    this._facets = [];
    this._updating = false;
    
    this._items = null;
    this._restrictedItems = null;
};

Exhibit.Collection.createAllItemsCollection = function(id, database) {
    var collection = new Exhibit.Collection(id, database);
    collection._update = Exhibit.Collection._allItemsCollection_update;
    
    Exhibit.Collection._initializeBasicCollection(collection, database);
    
    return collection;
};

Exhibit.Collection.createSubmissionsCollection = function(id, database) {
    var collection = new Exhibit.Collection(id, database);
    collection._update = Exhibit.Collection._submissionCollection_update;
    
    Exhibit.Collection._initializeBasicCollection(collection, database);
    
    return collection;
}

Exhibit.Collection.create = function(id, configuration, database) {
    var collection = new Exhibit.Collection(id, database);
    
    if ("itemTypes" in configuration) {
        collection._itemTypes = configuration.itemTypes;
        collection._update = Exhibit.Collection._typeBasedCollection_update;
    } else {
        collection._update = Exhibit.Collection._allItemsCollection_update;
    }
    
    Exhibit.Collection._initializeBasicCollection(collection, database);
    
    return collection;
};

Exhibit.Collection.createFromDOM = function(id, elmt, database) {
    var collection = new Exhibit.Collection(id, database);
    
    var itemTypes = Exhibit.getAttribute(elmt, "itemTypes", ",");
    if (itemTypes != null && itemTypes.length > 0) {
        collection._itemTypes = itemTypes;
        collection._update = Exhibit.Collection._typeBasedCollection_update;
    } else {
        collection._update = Exhibit.Collection._allItemsCollection_update;
    }
    
    Exhibit.Collection._initializeBasicCollection(collection, database);
    
    return collection;
};

Exhibit.Collection.create2 = function(id, configuration, uiContext) {
    var database = uiContext.getDatabase();
    
    if ("expression" in configuration) {
        var collection = new Exhibit.Collection(id, database);
        
        collection._expression = Exhibit.ExpressionParser.parse(configuration.expression);
        collection._baseCollection = ("baseCollectionID" in configuration) ? 
            uiContext.getExhibit().getCollection(configuration.baseCollectionID) : 
            uiContext.getCollection();
            
        collection._restrictBaseCollection = ("restrictBaseCollection" in configuration) ? 
            configuration.restrictBaseCollection : false;
            
        if (collection._restrictBaseCollection) {
            Exhibit.Collection._initializeRestrictingBasedCollection(collection);
        } else {
            Exhibit.Collection._initializeBasedCollection(collection);
        }
        
        return collection;
    } else {
        return Exhibit.Collection.create(id, configuration, database);
    }
};

Exhibit.Collection.createFromDOM2 = function(id, elmt, uiContext) {
    var database = uiContext.getDatabase();
    var collection;

    if (Exhibit.getAttribute(elmt, 'submissionsCollection')) {
        return Exhibit.Collection.createSubmissionsCollection(id, database);
    }
    
    var expressionString = Exhibit.getAttribute(elmt, "expression");
    if (expressionString != null && expressionString.length > 0) {
        collection = new Exhibit.Collection(id, database);
    
        collection._expression = Exhibit.ExpressionParser.parse(expressionString);
        
        var baseCollectionID = Exhibit.getAttribute(elmt, "baseCollectionID");
        collection._baseCollection = (baseCollectionID != null && baseCollectionID.length > 0) ? 
            uiContext.getExhibit().getCollection(baseCollectionID) : 
            uiContext.getCollection();
            
        collection._restrictBaseCollection = Exhibit.getAttribute(elmt, "restrictBaseCollection") == "true";
        if (collection._restrictBaseCollection) {
            Exhibit.Collection._initializeRestrictingBasedCollection(collection, database);
        } else {
            Exhibit.Collection._initializeBasedCollection(collection);
        }
    } else {
        collection = Exhibit.Collection.createFromDOM(id, elmt, database);
    }
    return collection;
};

Exhibit.Collection._initializeBasicCollection = function(collection, database) {
    var update = function() { collection._update(); };
    collection._listener = { 
        onAfterLoadingItems: update,
        onAfterRemovingAllStatements: update
    };
    database.addListener(collection._listener);
        
    collection._update();
};

Exhibit.Collection._initializeBasedCollection = function(collection) {
    collection._update = Exhibit.Collection._basedCollection_update;
    
    collection._listener = { onItemsChanged: function() { collection._update(); } };
    collection._baseCollection.addListener(collection._listener);
    
    collection._update();
};

Exhibit.Collection._initializeRestrictingBasedCollection = function(collection, database) {
    collection._cache = new Exhibit.FacetUtilities.Cache(
        database,
        collection._baseCollection,
        collection._expression
    );
    collection._isUpdatingBaseCollection = false;
    
    collection.onFacetUpdated = Exhibit.Collection._restrictingBasedCollection_onFacetUpdated;
    collection.restrict = Exhibit.Collection._restrictingBasedCollection_restrict;
    collection.update = Exhibit.Collection._restrictingBasedCollection_update;
    collection.hasRestrictions = Exhibit.Collection._restrictingBasedCollection_hasRestrictions;
    
    collection._baseCollection.addFacet(collection);
};

/*======================================================================
 *  Implementation
 *======================================================================
 */
Exhibit.Collection._allItemsCollection_update = function() {
    this.setItems(this._database.getAllItems());
    this._onRootItemsChanged();
};

Exhibit.Collection._submissionCollection_update = function() {
    this.setItems(this._database.getAllSubmissions());
    this._onRootItemsChanged();
};


Exhibit.Collection._typeBasedCollection_update = function() {
    var newItems = new Exhibit.Set();
    for (var i = 0; i < this._itemTypes.length; i++) {
        this._database.getSubjects(this._itemTypes[i], "type", newItems);
    }
    
    this.setItems(newItems);
    this._onRootItemsChanged();
};

Exhibit.Collection._basedCollection_update = function() {
    this.setItems(this._expression.evaluate(
        { "value" : this._baseCollection.getRestrictedItems() }, 
        { "value" : "item" }, 
        "value",
        this._database
    ).values);
    
    this._onRootItemsChanged();
};

Exhibit.Collection._restrictingBasedCollection_onFacetUpdated = function(facetChanged) {
    if (!this._updating) {
        /*
         *  This is called when one of our own facets is changed.
         */
        Exhibit.Collection.prototype.onFacetUpdated.call(this, facetChanged);
        
        /*
         *  We need to restrict the base collection.
         */
        this._isUpdatingBaseCollection = true;
        this._baseCollection.onFacetUpdated(this);
        this._isUpdatingBaseCollection = false;
    }
};

Exhibit.Collection._restrictingBasedCollection_restrict = function(items) {
    /*
     *  Restrict the base collection using our own restricted items
     *  (as filtered by our own facets).
     */
    if (this._restrictedItems.size() == this._items.size()) {
        return items;
    }
    
    return this._cache.getItemsFromValues(this._restrictedItems, items);
};

Exhibit.Collection._restrictingBasedCollection_update = function(items) {
    if (!this._isUpdatingBaseCollection) {
        /*
         *  This is called when the base collection is changed by
         *  one of its other facets. This causes our root items to
         *  change.
         */
        this.setItems(this._cache.getValuesFromItems(items));
        this._onRootItemsChanged();
    }
};

Exhibit.Collection._restrictingBasedCollection_hasRestrictions = function() {
    return (this._items != null) && (this._restrictedItems != null) && 
        (this._restrictedItems.size() != this._items.size());
};

/*======================================================================
 *  Common Implementation
 *======================================================================
 */
Exhibit.Collection.prototype.getID = function() {
    return this._id;
};

Exhibit.Collection.prototype.dispose = function() {
    if ("_baseCollection" in this) {
        this._baseCollection.removeListener(this._listener);
        this._baseCollection = null;
        this._expression = null;
    } else {
        this._database.removeListener(this._listener);
    }
    this._database = null;
    this._listener = null;
    
    this._listeners = null;
    this._items = null;
    this._restrictedItems = null;
};

Exhibit.Collection.prototype.addListener = function(listener) {
    this._listeners.add(listener);
};

Exhibit.Collection.prototype.removeListener = function(listener) {
    this._listeners.remove(listener);
};

Exhibit.Collection.prototype.addFacet = function(facet) {
    this._facets.push(facet);
    
    if (facet.hasRestrictions()) {
        this._computeRestrictedItems();
        this._updateFacets(null);
        this._listeners.fire("onItemsChanged", []);
    } else {
        facet.update(this.getRestrictedItems());
    }
};

Exhibit.Collection.prototype.removeFacet = function(facet) {
    for (var i = 0; i < this._facets.length; i++) {
        if (facet == this._facets[i]) {
            this._facets.splice(i, 1);
            if (facet.hasRestrictions()) {
                this._computeRestrictedItems();
                this._updateFacets(null);
                this._listeners.fire("onItemsChanged", []);
            }
            break;
        }
    }
};

Exhibit.Collection.prototype.clearAllRestrictions = function() {
    var restrictions = [];
    
    this._updating = true;
    for (var i = 0; i < this._facets.length; i++) {
        restrictions.push(this._facets[i].clearAllRestrictions());
    }
    this._updating = false;
    
    this.onFacetUpdated(null);
    
    return restrictions;
};

Exhibit.Collection.prototype.applyRestrictions = function(restrictions) {
    this._updating = true;
    for (var i = 0; i < this._facets.length; i++) {
        this._facets[i].applyRestrictions(restrictions[i]);
    }
    this._updating = false;
    
    this.onFacetUpdated(null);
};

Exhibit.Collection.prototype.getAllItems = function() {
    return new Exhibit.Set(this._items);
};

Exhibit.Collection.prototype.countAllItems = function() {
    return this._items.size();
};

Exhibit.Collection.prototype.getRestrictedItems = function() {
    return new Exhibit.Set(this._restrictedItems);
};

Exhibit.Collection.prototype.countRestrictedItems = function() {
    return this._restrictedItems.size();
};

Exhibit.Collection.prototype.onFacetUpdated = function(facetChanged) {
    if (!this._updating) {
        this._computeRestrictedItems();
        this._updateFacets(facetChanged);
        this._listeners.fire("onItemsChanged", []);
    }
}

Exhibit.Collection.prototype._onRootItemsChanged = function() {
    this._listeners.fire("onRootItemsChanged", []);
    
    this._computeRestrictedItems();
    this._updateFacets(null);
    
    this._listeners.fire("onItemsChanged", []);
};

Exhibit.Collection.prototype._updateFacets = function(facetChanged) {
    var restrictedFacetCount = 0;
    for (var i = 0; i < this._facets.length; i++) {
        if (this._facets[i].hasRestrictions()) {
            restrictedFacetCount++;
        }
    }
    
    for (var i = 0; i < this._facets.length; i++) {
        var facet = this._facets[i];
        if (facet.hasRestrictions()) {
            if (restrictedFacetCount <= 1) {
                facet.update(this.getAllItems());
            } else {
                var items = this.getAllItems();
                for (var j = 0; j < this._facets.length; j++) {
                    if (i != j) {
                        items = this._facets[j].restrict(items);
                    }
                }
                facet.update(items);
            }
        } else {
            facet.update(this.getRestrictedItems());
        }
    }
};

Exhibit.Collection.prototype._computeRestrictedItems = function() {
    this._restrictedItems = this._items;
    for (var i = 0; i < this._facets.length; i++) {
        var facet = this._facets[i];
        if (facet.hasRestrictions()) {
            this._restrictedItems = facet.restrict(this._restrictedItems);
        }
    }
};

Exhibit.Collection.prototype.setItems = function(items) {
    this._items = items;
}