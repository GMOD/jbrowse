/*==================================================
 *  Exhibit.CollectionSummaryWidget
 *==================================================
 */
Exhibit.CollectionSummaryWidget = function(containerElmt, uiContext) {
    this._exhibit = uiContext.getExhibit();
    this._collection = uiContext.getCollection();
    this._uiContext = uiContext;
    this._div = containerElmt;

    var widget = this;
    this._listener = { onItemsChanged: function() { widget._reconstruct(); } };
    this._collection.addListener(this._listener);
};

Exhibit.CollectionSummaryWidget.create = function(configuration, containerElmt, uiContext) {
    var widget = new Exhibit.CollectionSummaryWidget(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext)
    );
    widget._initializeUI();
    return widget;
};

Exhibit.CollectionSummaryWidget.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var widget = new Exhibit.CollectionSummaryWidget(
        containerElmt != null ? containerElmt : configElmt, 
        Exhibit.UIContext.createFromDOM(configElmt, uiContext)
    );
    widget._initializeUI();
    return widget;
};

Exhibit.CollectionSummaryWidget.prototype.dispose = function() {
    this._collection.removeListener(this._listener);
    this._div.innerHTML = "";
    
    this._noResultsDom = null;
    this._allResultsDom = null;
    this._filteredResultsDom = null;
    this._div = null;
    this._collection = null;
    this._exhibit = null;
};

Exhibit.CollectionSummaryWidget.prototype._initializeUI = function() {
    var self = this;
    
    var l10n = Exhibit.CollectionSummaryWidget.l10n;
    var onClearFilters = function(elmt, evt, target) {
        self._resetCollection();
        SimileAjax.DOM.cancelEvent(evt);
        return false;
    }

    this._allResultsDom = SimileAjax.DOM.createDOMFromString(
        "span", 
        String.substitute(
            l10n.allResultsTemplate,
            [ "exhibit-collectionSummaryWidget-results" ]
        )
    );
    this._filteredResultsDom = SimileAjax.DOM.createDOMFromString(
        "span", 
        String.substitute(
            l10n.filteredResultsTemplate,
            [ "exhibit-collectionSummaryWidget-results" ]
        ),
        {   resetActionLink: Exhibit.UI.makeActionLink(l10n.resetFiltersLabel, onClearFilters)
        }
    );
    this._noResultsDom = SimileAjax.DOM.createDOMFromString(
        "span", 
        String.substitute(
            l10n.noResultsTemplate,
            [ "exhibit-collectionSummaryWidget-results", "exhibit-collectionSummaryWidget-count" ]
        ),
        {   resetActionLink: Exhibit.UI.makeActionLink(l10n.resetFiltersLabel, onClearFilters)
        }
    );
    
    this._div.innerHTML = "";
    this._reconstruct();
};

Exhibit.CollectionSummaryWidget.prototype._reconstruct = function() {
    var originalSize = this._collection.countAllItems();
    var currentSize = this._collection.countRestrictedItems();
    var database = this._uiContext.getDatabase();
    var dom = this._dom;

    while (this._div.childNodes.length > 0) {
        this._div.removeChild(this._div.firstChild);
    }
    
    if (originalSize > 0) {
        if (currentSize == 0) {
            this._div.appendChild(this._noResultsDom.elmt);
        } else {
            var typeIDs = database.getTypeIDs(this._collection.getRestrictedItems()).toArray();
            var typeID = typeIDs.length == 1 ? typeIDs[0] : "Item";
            
            var description = 
                Exhibit.Database.l10n.labelItemsOfType(currentSize, typeID, database, "exhibit-collectionSummaryWidget-count");
            
            if (currentSize == originalSize) {
                this._div.appendChild(this._allResultsDom.elmt);
                this._allResultsDom.resultDescription.innerHTML = "";
                this._allResultsDom.resultDescription.appendChild(description);
            } else {
                this._div.appendChild(this._filteredResultsDom.elmt);
                this._filteredResultsDom.resultDescription.innerHTML = "";
                this._filteredResultsDom.resultDescription.appendChild(description);
                this._filteredResultsDom.originalCountSpan.innerHTML = originalSize;
            }
        }
    }
};

Exhibit.CollectionSummaryWidget.prototype._resetCollection = function() {
    var state = {};
    var collection = this._collection;
    
    SimileAjax.History.addLengthyAction(
        function() { state.restrictions = collection.clearAllRestrictions(); },
        function() { collection.applyRestrictions(state.restrictions); },
        Exhibit.CollectionSummaryWidget.l10n.resetActionTitle
    );
};
